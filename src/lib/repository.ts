import { prisma } from "@/lib/prisma";

/**
 * The engineering repository — the department's permanent knowledge base.
 *
 * WHY THIS EXISTS
 * ---------------
 * "Repeated projects because previous work is unavailable" is the most
 * expensive problem in engineering education: every cohort re-solves what the
 * last one already solved, badly, from scratch. The repository turns each
 * completed project into searchable, citable knowledge for the next cohort —
 * it is the one feature whose value COMPOUNDS over time.
 *
 * DESIGN DECISIONS (see also prisma/schema.prisma):
 *  - Publication gate = artifact checklist + supervisor signature. No numeric
 *    score threshold: formulas get gamed and block legitimate work; humans
 *    publish, scores advise.
 *  - Separation of duties: the leader who submits can never be the one who
 *    approves (enforced in policy.ts, not just UI).
 *  - Records are snapshots. Nothing in the archive joins to mutable rows.
 *  - Search is Postgres ILIKE + array facets. At departmental scale (hundreds
 *    of projects) this is instant; tsvector is the upgrade path at tens of
 *    thousands, not a day-one need.
 */

/* ── Permanent identifiers ─────────────────────────────────────────── */

/**
 * "ES-2026-0042" — year + zero-padded sequence within that year.
 * Sequence is derived from a count, so a concurrent publish could collide;
 * the unique constraint on slug catches that and the caller retries.
 */
export async function nextSlug(year: number): Promise<string> {
  const count = await prisma.publishedProject.count({
    where: { year, status: { in: ["PUBLISHED", "PENDING_APPROVAL", "DRAFT", "REJECTED"] } },
  });
  return `ES-${year}-${String(count + 1).padStart(4, "0")}`;
}

/* ── Citation ──────────────────────────────────────────────────────── */

export function formatCitation(p: {
  authors: string[];
  year: number;
  title: string;
  departmentName: string;
  slug: string;
}): string {
  const authors =
    p.authors.length === 0
      ? "Unknown authors"
      : p.authors.length <= 2
        ? p.authors.join(" & ")
        : `${p.authors[0]} et al.`;
  return `${authors} (${p.year}). ${p.title}. ${p.departmentName}, EngiSync Repository, ${p.slug}.`;
}

/* ── Facet parsing ─────────────────────────────────────────────────── */

/** "ESP32, L298N ,, pid" → ["ESP32", "L298N", "pid"] (deduped, trimmed). */
export function parseTags(input: string, max = 15): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,\n;]/)) {
    const t = raw.trim().slice(0, 40);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/* ── The publication checklist ─────────────────────────────────────── */

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  /** Required for every project, or only flagged as recommended? */
  required: boolean;
};

/**
 * What a submission must contain before the supervisor sees it.
 *
 * Universal requirements are few and non-negotiable: report, abstract,
 * keywords, license. Everything else (code, CAD, BOM, simulation) depends on
 * the kind of project, so those are recommendations the supervisor weighs —
 * a pure-software project has no BOM, and demanding one would be checklist
 * theatre.
 */
export function buildChecklist(input: {
  abstract: string;
  keywords: string[];
  license: string;
  fileKinds: string[];
}): ChecklistItem[] {
  const kinds = new Set(input.fileKinds);
  return [
    {
      key: "abstract",
      label: "Abstract (at least 200 characters)",
      done: input.abstract.trim().length >= 200,
      required: true,
    },
    {
      key: "keywords",
      label: "At least 3 keywords",
      done: input.keywords.length >= 3,
      required: true,
    },
    {
      key: "license",
      label: "License chosen",
      done: input.license.trim().length > 0,
      required: true,
    },
    {
      key: "report",
      label: "Final report attached",
      done: kinds.has("REPORT"),
      required: true,
    },
    {
      key: "presentation",
      label: "Presentation attached",
      done: kinds.has("PRESENTATION"),
      required: false,
    },
    {
      key: "source",
      label: "Source code (software projects)",
      done: kinds.has("SOURCE_CODE"),
      required: false,
    },
    {
      key: "cad",
      label: "CAD files (mechanical/civil projects)",
      done: kinds.has("CAD"),
      required: false,
    },
    {
      key: "bom",
      label: "Bill of materials (hardware projects)",
      done: kinds.has("BOM"),
      required: false,
    },
  ];
}

export function checklistPasses(items: ChecklistItem[]): boolean {
  return items.filter((i) => i.required).every((i) => i.done);
}

/* ── Search ────────────────────────────────────────────────────────── */

export type RepositorySearch = {
  query?: string;
  year?: number;
  discipline?: string;
};

export type RepositoryEntry = {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  year: number;
  authors: string[];
  departmentName: string;
  supervisorName: string | null;
  keywords: string[];
  components: string[];
  languages: string[];
  disciplines: string[];
  downloads: number;
  publishedAt: string | null;
};

const ENTRY_SELECT = {
  id: true,
  slug: true,
  title: true,
  abstract: true,
  year: true,
  authors: true,
  departmentName: true,
  supervisorName: true,
  keywords: true,
  components: true,
  languages: true,
  disciplines: true,
  downloads: true,
  publishedAt: true,
} as const;

/**
 * Search the published archive.
 *
 * Matches the query against title, abstract, and every facet array, so a
 * student typing "ESP32" finds projects whether it appears in the abstract or
 * only as a component tag.
 */
export async function searchRepository(
  params: RepositorySearch,
  limit = 30,
): Promise<RepositoryEntry[]> {
  const q = params.query?.trim();

  const rows = await prisma.publishedProject.findMany({
    where: {
      status: "PUBLISHED",
      ...(params.year ? { year: params.year } : {}),
      ...(params.discipline
        ? { disciplines: { has: params.discipline } }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { abstract: { contains: q, mode: "insensitive" } },
              { keywords: { hasSome: [q] } },
              { components: { hasSome: [q] } },
              { languages: { hasSome: [q] } },
              { authors: { hasSome: [q] } },
            ],
          }
        : {}),
    },
    select: ENTRY_SELECT,
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
  });

  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));
}

/**
 * "Related projects" — deterministic tag overlap, honestly labelled.
 * Two shared facets beat one shared keyword; no AI, no cost, no latency.
 */
export async function relatedProjects(
  id: string,
  limit = 5,
): Promise<RepositoryEntry[]> {
  const source = await prisma.publishedProject.findUnique({
    where: { id },
    select: { keywords: true, components: true, languages: true, disciplines: true },
  });
  if (!source) return [];

  const tags = [
    ...source.keywords,
    ...source.components,
    ...source.languages,
    ...source.disciplines,
  ];
  if (tags.length === 0) return [];

  const candidates = await prisma.publishedProject.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: id },
      OR: [
        { keywords: { hasSome: tags } },
        { components: { hasSome: tags } },
        { languages: { hasSome: tags } },
        { disciplines: { hasSome: tags } },
      ],
    },
    select: ENTRY_SELECT,
    take: 25,
  });

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const overlap = (r: (typeof candidates)[number]) =>
    [...r.keywords, ...r.components, ...r.languages, ...r.disciplines].filter(
      (t) => tagSet.has(t.toLowerCase()),
    ).length;

  return candidates
    .sort((a, b) => overlap(b) - overlap(a))
    .slice(0, limit)
    .map((r) => ({
      ...r,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    }));
}
