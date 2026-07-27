import { prisma } from "@/lib/prisma";
import { getMembership, isWorkspaceLeader } from "@/lib/workspace";
import { listWorkspacesForUser } from "@/lib/workspace";
import { getPace, type ProjectStage } from "@/lib/lifecycle";

/** Projects (= groups) the user belongs to, with quick progress. */
export async function listProjects(userId: string) {
  const memberships = await listWorkspacesForUser(userId);
  const ids = memberships.map((m) => m.workspace.id);
  const [taskGroups, lifecycles] = await Promise.all([
    prisma.task.groupBy({
      by: ["workspaceId", "status"],
      where: { workspaceId: { in: ids } },
      _count: true,
    }),
    prisma.workspace.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        stage: true,
        stageEnteredAt: true,
        targetEndDate: true,
        createdAt: true,
      },
    }),
  ]);

  const byId = new Map(lifecycles.map((w) => [w.id, w]));
  const now = new Date();

  return memberships.map((m) => {
    const rows = taskGroups.filter((t) => t.workspaceId === m.workspace.id);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const done = rows.filter((r) => r.status === "DONE").reduce((s, r) => s + r._count, 0);
    const w = byId.get(m.workspace.id);

    return {
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role as string,
      completionPct: total ? Math.round((done / total) * 100) : 0,
      stage: (w?.stage ?? "IDEA") as ProjectStage,
      pace: w
        ? getPace(
            w.stage as ProjectStage,
            w.stageEnteredAt,
            w.targetEndDate,
            w.createdAt,
            now,
          )
        : null,
    };
  });
}

/** Full project detail — members only. */
export async function getProject(workspaceId: string, userId: string) {
  if (!(await getMembership(workspaceId, userId))) return null;

  const [workspace, isLeader] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        objectives: true,
        scope: true,
        stage: true,
        stageEnteredAt: true,
        targetEndDate: true,
        createdAt: true,
        department: { select: { name: true } },
        milestones: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
        risks: { orderBy: { createdAt: "desc" } },
        deliverables: { orderBy: { createdAt: "asc" } },
        feedback: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    isWorkspaceLeader(workspaceId, userId),
  ]);
  if (!workspace) return null;

  const pace = getPace(
    workspace.stage as ProjectStage,
    workspace.stageEnteredAt,
    workspace.targetEndDate,
    workspace.createdAt,
  );

  return {
    id: workspace.id,
    name: workspace.name,
    department: workspace.department?.name ?? null,
    objectives: workspace.objectives,
    scope: workspace.scope,
    stage: workspace.stage as ProjectStage,
    stageEnteredAt: workspace.stageEnteredAt.toISOString(),
    targetEndDate: workspace.targetEndDate
      ? workspace.targetEndDate.toISOString().slice(0, 10)
      : "",
    pace,
    isLeader,
    milestones: workspace.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      done: m.done,
    })),
    risks: workspace.risks.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      mitigation: r.mitigation,
    })),
    deliverables: workspace.deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      done: d.done,
    })),
    feedback: workspace.feedback.map((f) => ({
      id: f.id,
      authorName: f.authorName,
      body: f.body,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}
