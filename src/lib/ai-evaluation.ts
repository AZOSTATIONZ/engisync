import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { getWorkspaceAnalytics } from "@/lib/analytics";
import { chatComplete, extractJson } from "@/lib/ai";

/** The structured report the AI returns (and we render). */
export type EvaluationReport = {
  scores: {
    health: number;
    productivity: number;
    documentation: number;
    research: number;
    design: number;
    testing: number;
    collaboration: number;
    participation: number;
    attendance: number;
    budgetHealth: number;
    timeline: number;
  };
  riskLevel: "Low" | "Medium" | "High";
  strengths: string[];
  weaknesses: string[];
  missingDocumentation: string[];
  missedDeadlines: string[];
  unevenParticipation: string;
  risks: string[];
  improvements: string[];
  nextActions: string[];
  predictions: {
    onTimeProbability: number;
    overBudgetProbability: number;
    estimatedCompletion: string;
    successLikelihood: number;
  };
  summary: string;
};

/**
 * Collect the deterministic project facts we feed the model. This is also shown
 * to users directly, so the page has value even when AI is disabled.
 */
export async function gatherProjectFacts(workspaceId: string, userId: string) {
  if (!(await getMembership(workspaceId, userId))) return null;

  const [workspace, analytics, budget, filesCount] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        description: true,
        budgetTarget: true,
        currency: true,
        createdAt: true,
        department: { select: { name: true } },
      },
    }),
    getWorkspaceAnalytics(workspaceId, userId),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        contributions: { select: { amount: true } },
        expenses: { select: { amount: true } },
      },
    }),
    prisma.fileResource.count({ where: { workspaceId } }),
  ]);
  if (!workspace || !analytics) return null;

  const num = (v: unknown) =>
    v && typeof v === "object" && "toNumber" in v
      ? (v as { toNumber(): number }).toNumber()
      : Number(v ?? 0);

  const contributed = (budget?.contributions ?? []).reduce((s, c) => s + num(c.amount), 0);
  const spent = (budget?.expenses ?? []).reduce((s, e) => s + num(e.amount), 0);

  return {
    name: workspace.name,
    department: workspace.department?.name ?? null,
    objectives: workspace.description ?? "(none provided)",
    ageDays: Math.floor((Date.now() - workspace.createdAt.getTime()) / 86400000),
    tasks: analytics.totals,
    members: analytics.memberStats,
    health: analytics.health,
    risk: analytics.risk,
    attendanceRate: analytics.totals.attendanceRate,
    meetingsHeld: analytics.totals.meetingsHeld,
    filesShared: filesCount,
    budget: {
      target: workspace.budgetTarget ? num(workspace.budgetTarget) : null,
      contributed,
      spent,
      currency: workspace.currency,
    },
    upcoming: analytics.upcoming,
    inactive: analytics.inactive,
    overloaded: analytics.overloaded,
  };
}

const SYSTEM_PROMPT = `You are an experienced university engineering project supervisor and evaluator.
Given a group project's data, produce a rigorous evaluation. Respond with ONLY a JSON object (no prose, no markdown) matching this exact shape:
{
  "scores": { "health": int0-100, "productivity": int, "documentation": int, "research": int, "design": int, "testing": int, "collaboration": int, "participation": int, "attendance": int, "budgetHealth": int, "timeline": int },
  "riskLevel": "Low" | "Medium" | "High",
  "strengths": string[], "weaknesses": string[], "missingDocumentation": string[], "missedDeadlines": string[],
  "unevenParticipation": string, "risks": string[], "improvements": string[], "nextActions": string[],
  "predictions": { "onTimeProbability": int0-100, "overBudgetProbability": int0-100, "estimatedCompletion": string, "successLikelihood": int0-100 },
  "summary": string
}
Base every judgement on the supplied data. Where data is missing (e.g. no testing reports, no documentation files), reflect that in the relevant score and list it under missingDocumentation or weaknesses. Be constructive and specific.`;

/** Run the evaluation via the configured AI provider. Returns a parsed report. */
export async function runEvaluation(
  facts: NonNullable<Awaited<ReturnType<typeof gatherProjectFacts>>>,
): Promise<EvaluationReport | null> {
  const raw = await chatComplete({
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(facts),
    maxTokens: 1500,
  });
  return extractJson<EvaluationReport>(raw);
}
