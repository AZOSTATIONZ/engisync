"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { chatComplete, extractJson } from "@/lib/ai";
import { canUseAI } from "@/lib/plan";

export type AIState = { error?: string; result?: string } | null;
export type TaskGenState = {
  error?: string;
  created?: { title: string; priority: string }[];
} | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function guard(userId: string): Promise<string | null> {
  const gate = await canUseAI(userId);
  return gate.ok ? null : (gate.reason ?? "AI is unavailable.");
}

export async function summarizeContent(
  _prev: AIState,
  formData: FormData,
): Promise<AIState> {
  const userId = await requireUserId();
  const err = await guard(userId);
  if (err) return { error: err };

  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length < 20) {
    return { error: "Paste some content to summarize (at least a couple of sentences)." };
  }

  try {
    const result = await chatComplete({
      system:
        "You are an assistant for engineering students. Summarize the provided content (meeting notes, a document, or a discussion) into a concise summary with key points and any action items. Use short bullet points. Be factual and do not invent details.",
      prompt: content.slice(0, 12000),
      maxTokens: 800,
    });
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

export async function detectRisks(
  _prev: AIState,
  formData: FormData,
): Promise<AIState> {
  const userId = await requireUserId();
  const err = await guard(userId);
  if (err) return { error: err };

  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length < 20) {
    return { error: "Describe the project or its current status first." };
  }

  try {
    const result = await chatComplete({
      system:
        "You are a project-risk analyst for university engineering group projects. Given a project description or status update, identify the top risks (technical, schedule, resource, team, budget). For each risk give: a short title, why it matters, and a concrete mitigation. Keep it practical and concise.",
      prompt: content.slice(0, 12000),
      maxTokens: 900,
    });
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

export async function askAssistant(
  _prev: AIState,
  formData: FormData,
): Promise<AIState> {
  const userId = await requireUserId();
  const err = await guard(userId);
  if (err) return { error: err };

  const question = (formData.get("question") as string)?.trim();
  if (!question) return { error: "Ask a question first." };

  try {
    const result = await chatComplete({
      system:
        "You are a helpful engineering study and project assistant for university students. Give clear, accurate, practical guidance across engineering topics (electronics, Arduino/ESP32, MATLAB, CAD, programming, project management). If a question is ambiguous, state your assumptions. Be concise.",
      prompt: question.slice(0, 8000),
      maxTokens: 1000,
    });
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

/** Generate tasks from notes and create them (personal or workspace). */
export async function generateTasks(
  _prev: TaskGenState,
  formData: FormData,
): Promise<TaskGenState> {
  const userId = await requireUserId();
  const err = await guard(userId);
  if (err) return { error: err };

  const notes = (formData.get("notes") as string)?.trim();
  if (!notes || notes.length < 15) {
    return { error: "Paste the notes or brief to turn into tasks." };
  }

  const rawWs = formData.get("workspaceId");
  const workspaceId = typeof rawWs === "string" && rawWs ? rawWs : null;
  if (workspaceId) {
    const wsIds = await userWorkspaceIds(userId);
    if (!wsIds.includes(workspaceId)) {
      return { error: "You are not a member of that workspace." };
    }
  }

  let parsed: { title: string; priority?: string }[] | null;
  try {
    const raw = await chatComplete({
      system:
        'You convert notes/briefs into actionable tasks for an engineering project. Respond with ONLY a JSON array (no prose) of up to 10 objects: {"title": string, "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT"}. Titles must be short and actionable.',
      prompt: notes.slice(0, 10000),
      maxTokens: 800,
    });
    parsed = extractJson<{ title: string; priority?: string }[]>(raw);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }

  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Couldn't parse tasks from the AI response. Try rephrasing the notes." };
  }

  const valid = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const toCreate = parsed
    .filter((t) => t && typeof t.title === "string" && t.title.trim())
    .slice(0, 10)
    .map((t) => ({
      title: t.title.trim().slice(0, 160),
      priority: valid.includes((t.priority ?? "").toUpperCase())
        ? (t.priority as string).toUpperCase()
        : "MEDIUM",
    }));

  if (toCreate.length === 0) {
    return { error: "No valid tasks were generated." };
  }

  await prisma.task.createMany({
    data: toCreate.map((t) => ({
      title: t.title,
      priority: t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      workspaceId,
      creatorId: userId,
    })),
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_TASKS_GENERATED",
      target: workspaceId ?? "personal",
      metadata: { count: toCreate.length },
    },
  });

  revalidatePath("/dashboard/tasks");
  return { created: toCreate };
}
