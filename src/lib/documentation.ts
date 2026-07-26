import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { canSuperviseWorkspace } from "@/lib/supervisor";

/**
 * Fixed engineering project-documentation template. Order matters — this is the
 * canonical structure every project document is seeded with. Sections stay
 * editable by the team and reviewable by the supervisor.
 */
export const DOC_SECTIONS: { key: string; title: string; hint: string }[] = [
  { key: "title", title: "Project Title", hint: "The full, formal title of the project." },
  { key: "abstract", title: "Abstract", hint: "A concise 150–300 word summary of the whole project." },
  { key: "problem", title: "Problem Statement", hint: "The engineering problem being solved and why it matters." },
  { key: "objectives", title: "Objectives", hint: "Specific, measurable aims of the project." },
  { key: "scope", title: "Scope", hint: "What is and isn't covered by the project." },
  { key: "literature", title: "Literature Review", hint: "Existing work, prior art, and references reviewed." },
  { key: "methodology", title: "Methodology", hint: "The approach, methods, and tools used." },
  { key: "system-design", title: "System Design", hint: "High-level architecture and system overview." },
  { key: "hardware-design", title: "Hardware Design", hint: "Components, wiring, and hardware architecture." },
  { key: "software-design", title: "Software Design", hint: "Software architecture, modules, and data flow." },
  { key: "circuit", title: "Circuit Diagrams", hint: "Schematics and circuit descriptions (link/attach images)." },
  { key: "flowcharts", title: "Flowcharts", hint: "Process and logic flowcharts." },
  { key: "gantt", title: "Gantt Chart", hint: "Project timeline and scheduling." },
  { key: "budget", title: "Budget", hint: "Costed bill of materials and expenses." },
  { key: "risk", title: "Risk Assessment", hint: "Identified risks, likelihood, impact, and mitigation." },
  { key: "testing", title: "Testing", hint: "Test plan, cases, and validation approach." },
  { key: "results", title: "Results", hint: "Findings and measured outcomes." },
  { key: "discussion", title: "Discussion", hint: "Interpretation of results and analysis." },
  { key: "conclusion", title: "Conclusion", hint: "Summary of what was achieved." },
  { key: "recommendations", title: "Recommendations", hint: "Suggestions for future work or improvement." },
  { key: "references", title: "References", hint: "Full citation list." },
  { key: "appendices", title: "Appendices", hint: "Supporting material, datasheets, code listings." },
];

export type SectionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "CHANGES_REQUESTED";

/**
 * Get the workspace's project document, creating it (and all 22 sections) on
 * first access. Idempotent and safe under concurrent first-opens.
 */
export async function getOrCreateDocument(workspaceId: string) {
  const existing = await prisma.projectDocument.findUnique({
    where: { workspaceId },
    select: { id: true },
  });

  if (!existing) {
    // Create the document + all sections in one shot; ignore races.
    try {
      await prisma.projectDocument.create({
        data: {
          workspaceId,
          sections: {
            create: DOC_SECTIONS.map((s, i) => ({
              key: s.key,
              title: s.title,
              order: i,
            })),
          },
        },
      });
    } catch {
      // Another request created it first — fine.
    }
  } else {
    // Backfill any sections added to the template after creation.
    const have = new Set(
      (
        await prisma.documentSection.findMany({
          where: { documentId: existing.id },
          select: { key: true },
        })
      ).map((r) => r.key),
    );
    const missing = DOC_SECTIONS.map((s, i) => ({ ...s, i })).filter(
      (s) => !have.has(s.key),
    );
    if (missing.length) {
      await prisma.documentSection.createMany({
        data: missing.map((s) => ({
          documentId: existing.id,
          key: s.key,
          title: s.title,
          order: s.i,
        })),
      });
    }
  }

  return prisma.projectDocument.findUnique({
    where: { workspaceId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
      versions: { orderBy: { versionNumber: "desc" }, select: { versionNumber: true } },
    },
  });
}

export type DocumentView = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  locked: boolean;
  approved: boolean;
  approvedAt: string | null;
  completionApproved: boolean;
  versionCount: number;
  latestVersion: number;
  canEdit: boolean;
  canReview: boolean;
  progress: { approved: number; total: number; pct: number };
  sections: {
    id: string;
    key: string;
    title: string;
    hint: string;
    content: string;
    status: SectionStatus;
    locked: boolean;
    comments: {
      id: string;
      authorName: string;
      body: string;
      isCorrection: boolean;
      createdAt: string;
    }[];
  }[];
};

function shape(
  doc: NonNullable<Awaited<ReturnType<typeof getOrCreateDocument>>>,
  workspaceName: string,
  canEdit: boolean,
  canReview: boolean,
): DocumentView {
  const hintByKey = new Map(DOC_SECTIONS.map((s) => [s.key, s.hint]));
  const approved = doc.sections.filter((s) => s.status === "APPROVED").length;
  const total = doc.sections.length;
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    workspaceName,
    locked: doc.locked,
    approved: doc.approved,
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    completionApproved: doc.completionApproved,
    versionCount: doc.versions.length,
    latestVersion: doc.versions[0]?.versionNumber ?? 0,
    canEdit,
    canReview,
    progress: { approved, total, pct: total ? Math.round((approved / total) * 100) : 0 },
    sections: doc.sections.map((s) => ({
      id: s.id,
      key: s.key,
      title: s.title,
      hint: hintByKey.get(s.key) ?? "",
      content: s.content,
      status: s.status as SectionStatus,
      locked: s.locked,
      comments: s.comments.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        body: c.body,
        isCorrection: c.isCorrection,
        createdAt: c.createdAt.toISOString(),
      })),
    })),
  };
}

/** Document view for a team member (can edit unless locked). */
export async function getDocumentForMember(
  workspaceId: string,
  userId: string,
): Promise<DocumentView | null> {
  const membership = await getMembership(workspaceId, userId);
  if (!membership) return null;
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const doc = await getOrCreateDocument(workspaceId);
  if (!doc || !ws) return null;
  return shape(doc, ws.name, !doc.locked, false);
}

/** Read-only + review document view for a supervisor. */
export async function getDocumentForSupervisor(
  workspaceId: string,
  userId: string,
): Promise<DocumentView | null> {
  if (!(await canSuperviseWorkspace(workspaceId, userId))) return null;
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const doc = await getOrCreateDocument(workspaceId);
  if (!doc || !ws) return null;
  return shape(doc, ws.name, false, true);
}

/** True if the user may view/download this project's documentation. */
export async function canAccessDocument(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  if (await getMembership(workspaceId, userId)) return true;
  return canSuperviseWorkspace(workspaceId, userId);
}

/** Build a self-contained HTML document of all sections (for download/print). */
export async function compileDocumentHtml(
  workspaceId: string,
): Promise<{ filename: string; html: string } | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const doc = await getOrCreateDocument(workspaceId);
  if (!doc || !ws) return null;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = doc.sections
    .map(
      (s, i) =>
        `<section><h2>${i + 1}. ${esc(s.title)}</h2><div>${
          s.content ? esc(s.content).replace(/\n/g, "<br/>") : "<em>Not written yet.</em>"
        }</div></section>`,
    )
    .join("\n");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(ws.name)} — Project Documentation</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
  h1{font-size:28px;border-bottom:3px solid #2563eb;padding-bottom:12px}
  h2{font-size:19px;margin-top:34px;color:#1e3a8a}
  section{page-break-inside:avoid}
  .meta{color:#666;font-size:13px;margin-bottom:32px}
  @media print{body{margin:0}}
</style></head>
<body>
  <h1>${esc(ws.name)}</h1>
  <p class="meta">Project Documentation · generated ${new Date().toLocaleDateString("en-GB")} · EngiSync</p>
  ${body}
</body></html>`;

  const safeName = ws.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return { filename: `${safeName || "project"}-documentation.html`, html };
}

export type ReportVersionSummary = {
  id: string;
  versionNumber: number;
  submittedByName: string;
  note: string | null;
  createdAt: string;
};

/** List submitted report versions (newest first). */
export async function listReportVersions(
  workspaceId: string,
  userId: string,
): Promise<ReportVersionSummary[]> {
  if (!(await canAccessDocument(workspaceId, userId))) return [];
  const doc = await prisma.projectDocument.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (!doc) return [];
  const versions = await prisma.reportVersion.findMany({
    where: { documentId: doc.id },
    orderBy: { versionNumber: "desc" },
  });
  return versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    submittedByName: v.submittedByName,
    note: v.note,
    createdAt: v.createdAt.toISOString(),
  }));
}

type Snapshot = { key: string; title: string; content: string }[];

/** Compare two report versions section-by-section (or a version vs current). */
export async function compareReportVersions(
  workspaceId: string,
  userId: string,
  fromVersion: number,
  toVersion: number | "current",
) {
  if (!(await canAccessDocument(workspaceId, userId))) return null;
  const doc = await getOrCreateDocument(workspaceId);
  if (!doc) return null;

  const load = async (v: number | "current"): Promise<Snapshot> => {
    if (v === "current") {
      return doc.sections.map((s) => ({ key: s.key, title: s.title, content: s.content }));
    }
    const row = await prisma.reportVersion.findUnique({
      where: { documentId_versionNumber: { documentId: doc.id, versionNumber: v } },
      select: { snapshot: true },
    });
    return row ? (JSON.parse(row.snapshot) as Snapshot) : [];
  };

  const [from, to] = await Promise.all([load(fromVersion), load(toVersion)]);
  const fromMap = new Map(from.map((s) => [s.key, s]));
  const toMap = new Map(to.map((s) => [s.key, s]));
  const keys = DOC_SECTIONS.map((s) => s.key);

  const sections = keys.map((key) => {
    const a = fromMap.get(key)?.content ?? "";
    const b = toMap.get(key)?.content ?? "";
    return {
      key,
      title: DOC_SECTIONS.find((s) => s.key === key)?.title ?? key,
      before: a,
      after: b,
      changed: a.trim() !== b.trim(),
    };
  });

  return {
    fromLabel: `v${fromVersion}`,
    toLabel: toVersion === "current" ? "Current draft" : `v${toVersion}`,
    changedCount: sections.filter((s) => s.changed).length,
    sections,
  };
}
