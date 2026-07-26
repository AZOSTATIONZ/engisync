import { prisma } from "@/lib/prisma";

/** Departments where the user is a SUPERVISOR. */
export async function supervisedDepartmentIds(userId: string): Promise<string[]> {
  const rows = await prisma.departmentMember.findMany({
    where: { userId, role: "SUPERVISOR" },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}

export async function isSupervisor(userId: string): Promise<boolean> {
  const n = await prisma.departmentMember.count({
    where: { userId, role: "SUPERVISOR" },
  });
  return n > 0;
}

/** True if the user supervises the department this workspace belongs to. */
export async function canSuperviseWorkspace(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { departmentId: true },
  });
  if (!ws?.departmentId) return false;
  const m = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId: ws.departmentId, userId } },
  });
  return m?.role === "SUPERVISOR";
}

/** All projects in the supervisor's departments, with progress. */
export async function listSupervisedProjects(userId: string) {
  const deptIds = await supervisedDepartmentIds(userId);
  if (deptIds.length === 0) return [];

  const groups = await prisma.workspace.findMany({
    where: { departmentId: { in: deptIds } },
    select: {
      id: true,
      name: true,
      department: { select: { name: true } },
      _count: { select: { members: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((g) => {
    const total = g.tasks.length;
    const done = g.tasks.filter((t) => t.status === "DONE").length;
    const overdue = 0;
    return {
      id: g.id,
      name: g.name,
      department: g.department?.name ?? null,
      memberCount: g._count.members,
      total,
      completionPct: total ? Math.round((done / total) * 100) : 0,
      overdue,
    };
  });
}

/** Read-only project detail for a supervisor (no membership required). */
export async function getSupervisedProject(workspaceId: string, userId: string) {
  if (!(await canSuperviseWorkspace(workspaceId, userId))) return null;

  const now = new Date();
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      objectives: true,
      scope: true,
      department: { select: { name: true } },
      members: {
        select: { role: true, user: { select: { name: true, email: true } } },
      },
      tasks: { select: { status: true, dueDate: true } },
      milestones: { orderBy: [{ done: "asc" }] },
      risks: true,
      deliverables: true,
      feedback: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!ws) return null;

  const total = ws.tasks.length;
  const done = ws.tasks.filter((t) => t.status === "DONE").length;
  const overdue = ws.tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < now,
  ).length;

  return {
    id: ws.id,
    name: ws.name,
    department: ws.department?.name ?? null,
    objectives: ws.objectives,
    scope: ws.scope,
    completionPct: total ? Math.round((done / total) * 100) : 0,
    total,
    done,
    overdue,
    members: ws.members.map((m) => ({
      name: m.user.name ?? m.user.email,
      role: m.role as string,
    })),
    milestones: ws.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      done: m.done,
      approved: m.approved,
    })),
    risks: ws.risks.map((r) => ({ title: r.title, severity: r.severity })),
    deliverables: ws.deliverables.map((d) => ({ title: d.title, done: d.done })),
    feedback: ws.feedback.map((f) => ({
      id: f.id,
      authorName: f.authorName,
      body: f.body,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}
