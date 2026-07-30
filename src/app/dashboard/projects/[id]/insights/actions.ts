"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspaceAnalytics } from "@/lib/analytics";
import { chatComplete, isAIConfigured } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export type InsightState = { error?: string; result?: string } | null;

export async function generateAnalyticsInsights(
  workspaceId: string,
): Promise<InsightState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (!isAIConfigured()) {
    return {
      error:
        "AI is not configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env, then restart.",
    };
  }
  const limit = rateLimit(`ai:${userId}`, 20, 5 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Too many requests. Try again in ${limit.retryAfterSec}s.` };
  }

  const a = await getWorkspaceAnalytics(workspaceId, userId);
  if (!a) return { error: "You don't have access to this group's analytics." };

  const summary = [
    `Project: ${a.workspace.name}`,
    `Tasks: ${a.totals.total} total, ${a.totals.done} done (${a.totals.completionPct}%), ${a.totals.pending} pending, ${a.totals.overdue} overdue.`,
    `Members: ${a.totals.memberCount}. Hours logged: ${a.totals.hoursLogged}. Attendance rate: ${a.totals.attendanceRate}%.`,
    `Health score: ${a.health}/100 (risk: ${a.risk}).`,
    `Workload per member: ${a.memberStats.map((m) => `${m.name}=${m.openTasks} open/${m.completed} done/${m.hours}h`).join("; ")}.`,
    a.inactive.length ? `Inactive members: ${a.inactive.join(", ")}.` : "No inactive members.",
    a.overloaded.length ? `Most loaded: ${a.overloaded[0].name} (${a.overloaded[0].openTasks} open).` : "",
    `Upcoming deadlines: ${a.upcoming.map((u) => u.title).join(", ") || "none"}.`,
  ].join("\n");

  try {
    const result = await chatComplete({
      system:
        "You are a project analyst for university engineering group projects. Given the metrics, produce a concise briefing: (1) overall health assessment, (2) top 3 risks, (3) 3 concrete recommendations including workload balancing and any members to check on, (4) a short note on likely deadline risk. Use short bullet points.",
      prompt: summary,
      maxTokens: 700,
    });
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}
