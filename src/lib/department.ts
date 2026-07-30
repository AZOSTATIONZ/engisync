import { DepartmentRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";

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

  // Isolation: non-members see only basic info + a join prompt — never the
  // member list, announcements, or groups of a department they're not in.
  if (!myMembership) {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      isMember: false,
      isAdmin: false,
      members: [],
      groups: [],
      announcements: [],
    };
  }

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
    // No `email` field, and no `?? email` fallback. Both leaked every
    // classmate's and lecturer's address to every department member — the
    // CRITICAL finding in the security audit. `displayName()` is the only
    // sanctioned way to render a person, and it degrades to a masked handle
    // rather than an address. The field was never even displayed; it simply
    // rode along in the payload.
    members: department.members.map((m) => ({
      id: m.userId,
      name: displayName(m.user),
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
      authorName: displayName(a.author),
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/**
 * THE one-department rule. Every path that adds a department membership must
 * call this — it is the single place the rule is defined.
 *
 * Returns an error message to show the user, or null to proceed.
 *
 * WHY IT IS SCOPED TO STUDENTS
 * The rule is "one department per STUDENT", not per person. A university
 * administrator is deliberately the ADMIN of every department (the seed alone
 * puts admin@engisync.dev in eight), and department admins are staff who may
 * legitimately cover more than one. Applying the rule to everyone would strip
 * departments of their administrators.
 *
 * So it constrains MEMBER rows only: a student may hold exactly one MEMBER
 * membership. ADMIN rows are unconstrained.
 *
 * WHY IT IS NOT A DATABASE CONSTRAINT
 * A `@@unique([userId])` would be stronger, but it cannot express "only when
 * role = MEMBER". Postgres can, via a partial unique index — but Prisma cannot
 * represent one in `schema.prisma`, so it would show up as schema drift on
 * every subsequent `migrate dev` and eventually get "fixed" by someone
 * dropping it. A centralised helper that is easy to call correctly is the
 * honest trade here; the real failure before was that the rule lived inline in
 * ONE action and the second code path simply forgot it.
 */
export async function assertSingleDepartment(
  userId: string,
  targetDepartmentId: string,
): Promise<string | null> {
  const existing = await prisma.departmentMember.findFirst({
    where: {
      userId,
      role: DepartmentRole.MEMBER,
      NOT: { departmentId: targetDepartmentId },
    },
    include: { department: { select: { name: true } } },
  });
  if (!existing) return null;

  return `You're already in ${existing.department.name}. Leave it before joining another department — students belong to one department.`;
}

export async function isDeptAdmin(departmentId: string, userId: string) {
  const m = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId } },
  });
  return m?.role === DepartmentRole.ADMIN;
}
