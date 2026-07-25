import { DepartmentRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Department IDs the user belongs to. */
export async function userDepartmentIds(userId: string): Promise<string[]> {
  const rows = await prisma.departmentMember.findMany({
    where: { userId },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}

/** All departments, with counts and the user's membership state. */
export async function listDepartments(userId: string) {
  const [departments, myMemberships] = await Promise.all([
    prisma.department.findMany({
      include: {
        _count: { select: { members: true, workspaces: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.departmentMember.findMany({
      where: { userId },
      select: { departmentId: true, role: true },
    }),
  ]);

  const mine = new Map(myMemberships.map((m) => [m.departmentId, m.role]));
  return departments.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    memberCount: d._count.members,
    groupCount: d._count.workspaces,
    myRole: mine.get(d.id) ?? null,
  }));
}

/**
 * Department detail. Enforces group isolation: a normal member only sees the
 * groups within the department that they belong to; a department admin sees all.
 */
export async function getDepartment(departmentId: string, userId: string) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      announcements: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!department) return null;

  const myMembership = department.members.find((m) => m.userId === userId);
  const isAdmin = myMembership?.role === DepartmentRole.ADMIN;

  // Isolation: admins see every group; members see only their own groups here.
  const groups = await prisma.workspace.findMany({
    where: {
      departmentId,
      ...(isAdmin ? {} : { members: { some: { userId } } }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    isMember: !!myMembership,
    isAdmin,
    members: department.members.map((m) => ({
      id: m.userId,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      role: m.role,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      memberCount: g._count.members,
    })),
    announcements: department.announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      authorName: a.author.name ?? a.author.email,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function isDeptAdmin(departmentId: string, userId: string) {
  const m = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId } },
  });
  return m?.role === DepartmentRole.ADMIN;
}
