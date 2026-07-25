"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceLeader } from "@/lib/workspace";
import { isAIConfigured } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { gatherProjectFacts, runEvaluation } from "@/lib/ai-evaluation";

export type EvalState = { error?: string; success?: string } | null;

/** Generate (or refresh) the AI evaluation for a group. Leader-gated. */
export async function generateEvaluation(workspaceId: string): Promise<EvalState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only a group leader can run the AI evaluation." };
  }
  if (!isAIConfigured()) {
    return {
      error:
        "AI isn't enabled yet. Add an API key (ANTHROPIC_API_KEY / OPENAI_API_KEY) to enable evaluations.",
    };
  }
  const limit = rateLimit(`ai-eval:${userId}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Please wait ${limit.retryAfterSec}s before running another evaluation.` };
  }

  const facts = await gatherProjectFacts(workspaceId, userId);
  if (!facts) return { error: "Couldn't gather project data." };

  let report;
  try {
    report = await runEvaluation(facts);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
  if (!report) {
    return { error: "The AI response couldn't be parsed. Try again." };
  }

  await prisma.aIEvaluation.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      data: report as unknown as object,
      model: process.env.AI_MODEL ?? null,
      createdById: userId,
    },
    update: { data: report as unknown as object, createdById: userId },
  });
  await prisma.auditLog.create({
    data: { userId, action: "AI_EVALUATION_RUN", target: workspaceId },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/evaluation`);
  return { success: "Evaluation updated." };
}
