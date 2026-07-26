import { prisma } from "@/lib/prisma";
import { chatComplete, extractJson, isAIConfigured } from "@/lib/ai";
import { canUseAI } from "@/lib/plan";
import {
  catalogForDepartment,
  type CatalogEntry,
} from "@/lib/trusted-catalog";

export type Recommendation = {
  name: string;
  url: string;
  category: string;
  description: string;
  difficulty: string;
  why: string;
};

export type LearnerContext = {
  departmentName: string | null;
  departmentCode: string | null;
  projectBlurbs: string[];
  modules: string[];
  skills: string[];
  goals: string | null;
};

/** Gather everything we know about what a student is working on. */
export async function getLearnerContext(userId: string): Promise<LearnerContext> {
  const [deptMember, memberships, profile] = await Promise.all([
    prisma.departmentMember.findFirst({
      where: { userId },
      select: { department: { select: { name: true, code: true } } },
    }),
    prisma.workspaceMember.findMany({
      where: { userId },
      select: {
        workspace: { select: { name: true, objectives: true, scope: true } },
      },
      take: 5,
    }),
    prisma.learnerProfile.findUnique({ where: { userId } }),
  ]);

  const projectBlurbs = memberships
    .map((m) =>
      [m.workspace.name, m.workspace.objectives, m.workspace.scope]
        .filter(Boolean)
        .join(" — "),
    )
    .filter(Boolean);

  return {
    departmentName: deptMember?.department.name ?? null,
    departmentCode: deptMember?.department.code ?? null,
    projectBlurbs,
    modules: profile?.modules ?? [],
    skills: profile?.skills ?? [],
    goals: profile?.goals ?? null,
  };
}

/** Candidate pool = curated catalog (dept + general) + admin-approved catalog rows. */
async function candidatePool(departmentCode: string | null): Promise<CatalogEntry[]> {
  const seed = catalogForDepartment(departmentCode);
  const approved = await prisma.trustedResource.findMany({
    where: {
      status: "APPROVED",
      OR: [{ departmentCode: null }, ...(departmentCode ? [{ departmentCode }] : [])],
    },
  });
  const extra: CatalogEntry[] = approved.map((r) => ({
    name: r.name,
    url: r.url,
    category: r.category,
    description: r.description,
    difficulty: r.difficulty,
    tags: r.tags,
    topics: r.topics,
    departmentCode: r.departmentCode,
  }));
  // De-dupe by URL.
  const seen = new Set<string>();
  return [...seed, ...extra].filter((e) => {
    const k = e.url.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Heuristic ranking used when AI is unavailable. */
function heuristicRank(
  pool: CatalogEntry[],
  ctx: LearnerContext,
  boosts: Map<string, number>,
  limit: number,
): Recommendation[] {
  const hay = [
    ...ctx.projectBlurbs,
    ...ctx.modules,
    ...ctx.skills,
    ctx.goals ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const scored = pool.map((e) => {
    let score = 0;
    if (e.departmentCode === ctx.departmentCode) score += 3;
    for (const t of [...e.tags, ...e.topics]) {
      if (hay.includes(t.toLowerCase())) score += 2;
    }
    for (const cat of boosts.keys()) {
      if (e.category === cat) score += boosts.get(cat)!;
    }
    return { e, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ e }) => ({
      name: e.name,
      url: e.url,
      category: e.category,
      description: e.description,
      difficulty: e.difficulty,
      why:
        e.departmentCode === ctx.departmentCode
          ? `Relevant to ${ctx.departmentName ?? "your department"} and your current work.`
          : "A widely useful engineering resource.",
    }));
}

/** Interaction-based category boosts (what the student saves / finds helpful). */
async function interactionBoosts(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.resourceInteraction.findMany({
    where: { userId, type: { in: ["SAVE", "HELPFUL"] } },
    select: { resource: { select: { category: true } } },
  });
  const boosts = new Map<string, number>();
  for (const r of rows) {
    const c = r.resource.category;
    if (c) boosts.set(c, (boosts.get(c) ?? 0) + 1);
  }
  return boosts;
}

/**
 * Personalized recommendations. Ranks the trusted pool with AI when available
 * (adding a per-item "why"), otherwise falls back to a heuristic. When AI is on,
 * it may also propose brand-new sites, which are stored as PENDING catalog rows
 * for a department admin to vet — never shown to students unmoderated.
 */
export async function getRecommendations(
  userId: string,
  limit = 8,
  useAI = false,
): Promise<{ items: Recommendation[]; aiRanked: boolean; context: LearnerContext }> {
  const ctx = await getLearnerContext(userId);
  const pool = await candidatePool(ctx.departmentCode);
  const boosts = await interactionBoosts(userId);

  // Default: the free, instant heuristic. AI only runs when explicitly asked,
  // so browsing the hub never burns the Gemini free-tier quota.
  const gate = useAI ? await canUseAI(userId) : { ok: false };
  if (!useAI || !gate.ok || !isAIConfigured()) {
    return { items: heuristicRank(pool, ctx, boosts, limit), aiRanked: false, context: ctx };
  }

  try {
    const system =
      "You are a learning companion for a university engineering student. " +
      "From the provided list of trusted resources, choose and rank the most relevant to this student's department, project, modules, skills, and goals. " +
      "For each, give a specific one-sentence reason it helps THEM. You may also suggest up to 3 brand-new trusted sites not in the list. " +
      "Respond with ONLY JSON.";
    const prompt = `Student context:
Department: ${ctx.departmentName ?? "(unknown)"} (${ctx.departmentCode ?? "-"})
Projects: ${ctx.projectBlurbs.join(" | ") || "(none yet)"}
Modules: ${ctx.modules.join(", ") || "(none)"}
Skills: ${ctx.skills.join(", ") || "(none)"}
Goals: ${ctx.goals ?? "(none)"}

Trusted resource list (choose from these by name):
${pool.map((e) => `- ${e.name} [${e.category}] — ${e.description}`).join("\n")}

Return JSON:
{
  "picks": [ { "name": "exact name from the list", "why": "one specific sentence" } ],
  "newSuggestions": [ { "name": "", "url": "https://...", "category": "", "description": "", "why": "" } ]
}
Pick at most ${limit}.`;

    const raw = await chatComplete({ system, prompt, maxTokens: 900 });
    const parsed = extractJson<{
      picks?: { name: string; why: string }[];
      newSuggestions?: { name: string; url: string; category: string; description: string; why: string }[];
    }>(raw);

    const byName = new Map(pool.map((e) => [e.name.toLowerCase(), e]));
    const items: Recommendation[] = [];
    for (const p of parsed?.picks ?? []) {
      const e = byName.get(p.name.toLowerCase());
      if (e) {
        items.push({
          name: e.name, url: e.url, category: e.category,
          description: e.description, difficulty: e.difficulty,
          why: p.why || "Recommended for your current work.",
        });
      }
      if (items.length >= limit) break;
    }

    // Persist AI-suggested new sites as PENDING catalog rows for admin vetting.
    for (const s of (parsed?.newSuggestions ?? []).slice(0, 3)) {
      if (!s?.url || !/^https?:\/\/\S+\.\S+/.test(s.url)) continue;
      const exists = await prisma.trustedResource.findFirst({ where: { url: s.url } });
      if (exists) continue;
      await prisma.trustedResource.create({
        data: {
          departmentCode: ctx.departmentCode,
          name: s.name?.slice(0, 120) || s.url,
          url: s.url,
          category: s.category?.slice(0, 60) || "Suggested",
          description: (s.description || s.why || "").slice(0, 500),
          status: "PENDING",
          source: "ai-suggested",
        },
      });
    }

    if (items.length === 0) {
      return { items: heuristicRank(pool, ctx, boosts, limit), aiRanked: false, context: ctx };
    }
    return { items, aiRanked: true, context: ctx };
  } catch (e) {
    console.error("[recommendations] AI failed:", (e as Error).message);
    return { items: heuristicRank(pool, ctx, boosts, limit), aiRanked: false, context: ctx };
  }
}

// ── Learner profile ──

export async function getLearnerProfile(userId: string) {
  const p = await prisma.learnerProfile.findUnique({ where: { userId } });
  return {
    modules: p?.modules ?? [],
    skills: p?.skills ?? [],
    goals: p?.goals ?? "",
  };
}

export async function saveLearnerProfile(
  userId: string,
  data: { modules: string[]; skills: string[]; goals: string },
) {
  await prisma.learnerProfile.upsert({
    where: { userId },
    create: {
      userId,
      modules: data.modules.slice(0, 20),
      skills: data.skills.slice(0, 20),
      goals: data.goals.slice(0, 500) || null,
    },
    update: {
      modules: data.modules.slice(0, 20),
      skills: data.skills.slice(0, 20),
      goals: data.goals.slice(0, 500) || null,
    },
  });
}
