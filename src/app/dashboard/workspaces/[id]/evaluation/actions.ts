"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { getMembership } from "@/lib/workspace";
import { canUseAI } from "@/lib/plan";
import { chatComplete } from "@/lib/ai";
import { runMentorCheck, type MentorAlert } from "@/lib/mentor";
import { gatherProjectFacts, runEvaluation } from "@/lib/ai-evaluation";

export type EvalState = { error?: string; success?: string } | null;
export type SupervisorState = { error?: string; answer?: string } | null;
export type MentorState = { error?: string; alerts?: MentorAlert[] } | null;

/** AI Supervisor: answer a project question with the project's context. */
export async function askSupervisor(
  workspaceId: string,
  question: string,
): Promise<SupervisorState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (!(await getMembership(workspaceId, userId))) {
    return { error: "You're not a member of this group." };
  }
  const gate = await canUseAI(userId);
  if (!gate.ok) return { error: gate.reason };
  if (!question.trim()) return { error: "Ask a question first." };

  const facts = await gatherProjectFacts(workspaceId, userId);
  if (!facts) return { error: "Couldn't load project data." };

  try {
    const answer = await chatComplete({
      system:
        "You are an experienced university engineering project supervisor. Answer the student's question with detailed, specific engineering guidance grounded in their project's data (provided as JSON). Reference relevant standards/methodology where useful. Be constructive and thorough, not a short chatbot reply.",
      prompt: `Project data: ${JSON.stringify(facts)}\n\nStudent question: ${question.slice(0, 2000)}`,
      maxTokens: 1200,
    });
    return { answer };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

/** Run the deterministic mentor checks (no AI key needed). */
export async function runMentor(workspaceId: string): Promise<MentorState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const alerts = await runMentorCheck(workspaceId, session.user.id);
  if (alerts === null) return { error: "You're not a member of this group." };
  return { alerts };
}

/** Generate (or refresh) the AI evaluation for a group. Leader-gated. */
export async function generateEvaluation(workspaceId: string): Promise<EvalState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const authz = await authorize(workspaceId, userId, "project.edit");
  if (!authz.ok) return { error: authz.error };
  const gate = await canUseAI(userId);
  if (!gate.ok) return { error: gate.reason };

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
