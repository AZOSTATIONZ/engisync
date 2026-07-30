import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";

/** Departments where the user is a SUPERVISOR. */
export async function supervisedDepartmentIds(userId: string): Promise<string[]> {
  const rows = await prisma.departmentMember.findMany({
    where: { userId, role: "SUPERVISOR" },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}

/**
 * Does this person supervise anything? Drives whether the Supervisor area is
 * offered in navigation.
 *
 * Keyed to active GRANTS, not the department role. Keying it to the role would
 * be wrong in both directions now: a newly appointed departmental supervisor
 * with no invitations would be shown a Supervisor area containing nothing,
 * while someone invited to supervise a project without holding the department
 * role would not be shown the area that holds it.
 */
export async function isSupervisor(userId: string): Promise<boolean> {
  const n = await prisma.projectGrant.count({
    where: { userId, revokedAt: null },
  });
  return n > 0;
}

/**
 * People a leader may invite to supervise a project.
 *
 * The department SUPERVISOR role still matters — but as the pool of who is
 * *invitable*, never as access in itself. This is the seam where the role and
 * the grant meet, and keeping them separate is the whole point: being a
 * supervisor in a department is a job title; seeing a specific project is a
 * decision the team makes.
 */
export async function listEligibleSupervisors(
  departmentId: string | null,
  workspaceId: string,
) {
  if (!departmentId) return [];

  const [staff, grants] = await Promise.all([
    prisma.departmentMember.findMany({
      where: { departmentId, role: { in: ["SUPERVISOR", "ADMIN"] } },
      select: {
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.projectGrant.findMany({
      where: { workspaceId, revokedAt: null },
      select: { userId: true },
    }),
  ]);

  const alreadyGranted = new Set(grants.map((g) => g.userId));
  return staff
    .filter((s) => !alreadyGranted.has(s.user.id))
    .map((s) => ({
      id: s.user.id,
      name: displayName(s.user),
      isDepartmentAdmin: s.role === "ADMIN",
    }));
}

/** Active and revoked grants on a project, for the team to see who can look. */
export async function listProjectGrants(workspaceId: string) {
  const grants = await prisma.projectGrant.findMany({
    where: { workspaceId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      role: true,
      revokedAt: true,
      grantedByName: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return grants.map((g) => ({
    id: g.id,
    userId: g.user.id,
    name: displayName(g.user),
    role: g.role as string,
    active: g.revokedAt === null,
    grantedByName: g.grantedByName,
    createdAt: g.createdAt.toISOString(),
    revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
  }));
}

/**
 * True if the user holds an active grant on this project.
 *
 * There were previously TWO definitions of "supervisor" that disagreed:
 * `policy.ts` counted department ADMINs, this file did not. The same person
 * could be authorised by one code path and refused by the other depending on
 * which happened to be called. Both now resolve the same way — through a
 * grant — so the word means one thing.
 */
export const canSuperviseWorkspace = cache(async function canSuperviseWorkspace(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const grant = await prisma.projectGrant.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { revokedAt: true },
  });
  return Boolean(grant && grant.revokedAt === null);
});

/**
 * Projects this user has been invited to supervise.
 *
 * Was: every project in every department where the user held SUPERVISOR —
 * which is how a supervisor came to see the work of teams that had never
 * heard of them. Now: exactly the projects that invited them.
 */
export async function listSupervisedProjects(userId: string) {
  const grants = await prisma.projectGrant.findMany({
    where: { userId, revokedAt: null },
    select: { workspaceId: true },
  });
  if (grants.length === 0) return [];

  const groups = await prisma.workspace.findMany({
    where: { id: { in: grants.map((g) => g.workspaceId) } },
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
      name: displayName(m.user),
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
