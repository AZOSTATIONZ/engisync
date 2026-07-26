import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAIConfigured, AI_DISABLED, AI_OUT_OF_SERVICE } from "@/lib/ai";
import { isAiEnabledByAdmin } from "@/lib/app-settings";
import { rateLimit } from "@/lib/rate-limit";

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  STUDENT_PREMIUM: "Student Premium",
  UNIVERSITY: "University",
};

const FREE_DAILY_AI = 8;

/**
 * Central AI gate: admin switch → provider configured → plan/usage limits.
 * Returns a reason string when blocked (shown to the user).
 */
export async function canUseAI(
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  // Master kill switch takes precedence over every other check.
  if (AI_DISABLED) {
    return { ok: false, reason: AI_OUT_OF_SERVICE };
  }
  if (!(await isAiEnabledByAdmin())) {
    return { ok: false, reason: "AI is currently switched off by the administrator." };
  }
  if (!isAIConfigured()) {
    return { ok: false, reason: "AI isn't configured yet. Add an AI API key." };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) return { ok: false, reason: "Account not found." };

  if (user.plan === Plan.FREE) {
    const day = new Date().toISOString().slice(0, 10);
    const r = rateLimit(`ai-free:${userId}:${day}`, FREE_DAILY_AI, 24 * 60 * 60 * 1000);
    if (!r.ok) {
      return {
        ok: false,
        reason: `Free plan reached today's AI limit (${FREE_DAILY_AI}/day). Upgrade to Student Premium for unlimited AI.`,
      };
    }
  }
  return { ok: true };
}
