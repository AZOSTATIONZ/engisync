import { prisma } from "@/lib/prisma";
import { chatComplete, extractJson, isAIConfigured } from "@/lib/ai";
import { canUseAI } from "@/lib/plan";
import {
  ResourceType,
  ResourceStatus,
  ResourceDifficulty,
  InteractionType,
} from "@prisma/client";

// ── Access helpers ──

export async function getDeptMembership(departmentId: string, userId: string) {
  return prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId } },
  });
}

export async function isDeptAdmin(departmentId: string, userId: string) {
  const m = await getDeptMembership(departmentId, userId);
  return m?.role === "ADMIN";
}

/** Normalise a URL for duplicate detection (protocol/www/trailing slash/case). */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/[?#].*$/, "");
}

// ── AI moderation ──

type Verdict = {
  approved: boolean;
  reason: string;
  description?: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  category?: string;
  suggestedCategory?: string;
  whyUseful?: string;
  tags?: string[];
  topics?: string[];
};

const DIFFICULTIES = new Set(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

function coerceDifficulty(v?: string): ResourceDifficulty | null {
  if (!v) return null;
  const up = v.toUpperCase();
  return DIFFICULTIES.has(up) ? (up as ResourceDifficulty) : null;
}

/** Ask the AI to validate + enrich a resource. Returns a structured verdict. */
async function aiModerate(input: {
  departmentName: string;
  type: string;
  title: string;
  url: string | null;
  note: string | null;
  existingTitles: string[];
}): Promise<Verdict> {
  const system =
    "You are a strict but fair curator for a university engineering department's shared resource library. " +
    "Evaluate a submitted learning resource and decide if it should be published to other students. " +
    "Judge: legitimacy, relevance to the department, educational value, safety, accessibility, whether it duplicates an existing resource, and correct categorisation. " +
    "Respond with ONLY a JSON object, no prose.";

  const prompt = `Department: ${input.departmentName}
Resource type: ${input.type}
Title: ${input.title}
URL: ${input.url ?? "(none / file upload)"}
Submitter note: ${input.note ?? "(none)"}

Existing approved resource titles in this department (avoid duplicates):
${input.existingTitles.slice(0, 40).map((t) => `- ${t}`).join("\n") || "(none yet)"}

Return JSON:
{
  "approved": boolean,
  "reason": "one or two sentences explaining the decision",
  "description": "concise 1-2 sentence description (if approved)",
  "difficulty": "BEGINNER | INTERMEDIATE | ADVANCED",
  "category": "short category label",
  "suggestedCategory": "a better category if rejected/miscategorised",
  "whyUseful": "one sentence on why it helps students (if approved)",
  "tags": ["3-6 short tags"],
  "topics": ["2-4 topics covered"]
}`;

  const raw = await chatComplete({ system, prompt, maxTokens: 700 });
  const parsed = extractJson<Verdict>(raw);
  if (!parsed || typeof parsed.approved !== "boolean") {
    throw new Error("AI returned an unreadable moderation result.");
  }
  return parsed;
}

/** Run the moderation pipeline for a resource (duplicate check → AI → persist). */
export async function moderateResource(resourceId: string, submitterId: string) {
  const resource = await prisma.departmentResource.findUnique({
    where: { id: resourceId },
    include: { department: { select: { name: true } } },
  });
  if (!resource) return;

  // Exact-duplicate short-circuit (no AI needed).
  if (resource.url) {
    const norm = normalizeUrl(resource.url);
    const others = await prisma.departmentResource.findMany({
      where: {
        departmentId: resource.departmentId,
        status: ResourceStatus.APPROVED,
        NOT: { id: resource.id },
        url: { not: null },
      },
      select: { url: true, title: true },
    });
    const dup = others.find((o) => o.url && normalizeUrl(o.url) === norm);
    if (dup) {
      await prisma.departmentResource.update({
        where: { id: resource.id },
        data: {
          status: ResourceStatus.REJECTED,
          moderationReason: `This link is already in the hub as "${dup.title}".`,
          moderatedByAI: true,
          moderatedAt: new Date(),
        },
      });
      return;
    }
  }

  // AI gate — if unavailable, leave PENDING for manual admin review.
  const gate = await canUseAI(submitterId);
  if (!gate.ok || !isAIConfigured()) return;

  const existing = await prisma.departmentResource.findMany({
    where: { departmentId: resource.departmentId, status: ResourceStatus.APPROVED },
    select: { title: true },
  });

  try {
    const v = await aiModerate({
      departmentName: resource.department.name,
      type: resource.type,
      title: resource.title,
      url: resource.url,
      note: resource.studentNote,
      existingTitles: existing.map((e) => e.title),
    });

    await prisma.departmentResource.update({
      where: { id: resource.id },
      data: {
        status: v.approved ? ResourceStatus.APPROVED : ResourceStatus.REJECTED,
        moderationReason: v.reason,
        suggestedCategory: v.approved ? null : v.suggestedCategory ?? null,
        description: v.approved ? v.description ?? null : null,
        difficulty: v.approved ? coerceDifficulty(v.difficulty) : null,
        category: v.approved ? v.category ?? null : null,
        whyUseful: v.approved ? v.whyUseful ?? null : null,
        tags: v.approved ? (v.tags ?? []).slice(0, 8) : [],
        topics: v.approved ? (v.topics ?? []).slice(0, 6) : [],
        moderatedByAI: true,
        moderatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[resource-hub] AI moderation failed:", (e as Error).message);
    // Leave PENDING for manual review on AI error.
  }
}

// ── Queries ──

export type ResourceCard = {
  id: string;
  type: ResourceType;
  title: string;
  url: string | null;
  description: string | null;
  difficulty: ResourceDifficulty | null;
  category: string | null;
  whyUseful: string | null;
  tags: string[];
  topics: string[];
  submittedByName: string;
  status: ResourceStatus;
  moderationReason: string | null;
  suggestedCategory: string | null;
  moderatedByAI: boolean;
  saves: number;
  helpful: number;
  createdAt: string;
};

function toCard(r: {
  id: string; type: ResourceType; title: string; url: string | null;
  description: string | null; difficulty: ResourceDifficulty | null; category: string | null;
  whyUseful: string | null; tags: string[]; topics: string[]; submittedByName: string;
  status: ResourceStatus; moderationReason: string | null; suggestedCategory: string | null;
  moderatedByAI: boolean; createdAt: Date;
  interactions?: { type: InteractionType }[];
}): ResourceCard {
  const saves = r.interactions?.filter((i) => i.type === "SAVE").length ?? 0;
  const helpful = r.interactions?.filter((i) => i.type === "HELPFUL").length ?? 0;
  return {
    id: r.id, type: r.type, title: r.title, url: r.url,
    description: r.description, difficulty: r.difficulty, category: r.category,
    whyUseful: r.whyUseful, tags: r.tags, topics: r.topics,
    submittedByName: r.submittedByName, status: r.status,
    moderationReason: r.moderationReason, suggestedCategory: r.suggestedCategory,
    moderatedByAI: r.moderatedByAI, saves, helpful,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Approved resources for a department (member-only), with optional search/filter. */
export async function listApprovedResources(
  departmentId: string,
  userId: string,
  opts: { q?: string; type?: string; difficulty?: string } = {},
): Promise<ResourceCard[] | null> {
  if (!(await getDeptMembership(departmentId, userId))) return null;

  const rows = await prisma.departmentResource.findMany({
    where: {
      departmentId,
      status: ResourceStatus.APPROVED,
      ...(opts.type && opts.type !== "ALL"
        ? { type: opts.type as ResourceType }
        : {}),
      ...(opts.difficulty && opts.difficulty !== "ALL"
        ? { difficulty: opts.difficulty as ResourceDifficulty }
        : {}),
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q, mode: "insensitive" } },
              { description: { contains: opts.q, mode: "insensitive" } },
              { tags: { has: opts.q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: { interactions: { select: { type: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCard);
}

/** A member's own submissions (so they can see pending/rejected verdicts). */
export async function listMySubmissions(
  departmentId: string,
  userId: string,
): Promise<ResourceCard[]> {
  const rows = await prisma.departmentResource.findMany({
    where: { departmentId, submittedById: userId },
    include: { interactions: { select: { type: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCard);
}

/** Pending queue for department admins. */
export async function listPendingResources(
  departmentId: string,
  userId: string,
): Promise<ResourceCard[] | null> {
  if (!(await isDeptAdmin(departmentId, userId))) return null;
  const rows = await prisma.departmentResource.findMany({
    where: { departmentId, status: ResourceStatus.PENDING },
    include: { interactions: { select: { type: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toCard);
}
