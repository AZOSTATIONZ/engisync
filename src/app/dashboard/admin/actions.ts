"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plan, SystemRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setSetting } from "@/lib/app-settings";

export type AdminState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.systemRole !== SystemRole.ADMIN) {
    return null;
  }
  return session.user;
}

// ── Metrics ──────────────────────────────────────────────────────────

export async function getAdminMetrics() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    departments,
    activeProjects,
    eligibleSupervisors,
    unsupervisedProjects,
    pendingJoinRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.groupBy({ by: ["userId"], where: { expires: { gte: thirtyDaysAgo } } }).then((r) => r.length),
    prisma.department.count(),
    prisma.workspace.count(),
    prisma.departmentMember.count({ where: { role: "SUPERVISOR" } }),
    prisma.workspace.count({
      where: { grants: { none: { revokedAt: null } } },
    }),
    prisma.joinRequest.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    departments,
    activeProjects,
    eligibleSupervisors,
    unsupervisedProjects,
    pendingJoinRequests,
  };
}

// ── User management ──────────────────────────────────────────────────

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  systemRole: SystemRole;
  plan: Plan;
  createdAt: Date;
  department: string | null;
};

export async function listUsers(
  search: string,
  page: number,
  perPage = 20,
): Promise<{ users: UserRow[]; total: number }> {
  const admin = await requireAdmin();
  if (!admin) return { users: [], total: 0 };

  const where = search.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        plan: true,
        createdAt: true,
        deptMemberships: {
          take: 1,
          select: { department: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: page * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      systemRole: u.systemRole,
      plan: u.plan,
      createdAt: u.createdAt,
      department: u.deptMemberships[0]?.department.name ?? null,
    })),
    total,
  };
}

export async function setUserSystemRole(
  userId: string,
  role: string,
): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  if (!["GUEST", "INDIVIDUAL", "ADMIN"].includes(role)) {
    return { error: "Invalid role." };
  }
  if (userId === admin.id && role !== "ADMIN") {
    return { error: "You cannot remove your own admin role." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  await prisma.user.update({
    where: { id: userId },
    data: { systemRole: role as SystemRole },
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "USER_ROLE_SET",
      target: userId,
      metadata: { from: target.systemRole, to: role },
    },
  });

  revalidatePath("/dashboard/admin");
  return { success: `${target.email} is now ${role}.` };
}

// ── Audit logs ───────────────────────────────────────────────────────

export type AuditRow = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  target: string | null;
  createdAt: Date;
};

export async function listAuditLogs(
  page: number,
  actionFilter?: string,
  perPage = 30,
): Promise<{ logs: AuditRow[]; total: number }> {
  const admin = await requireAdmin();
  if (!admin) return { logs: [], total: 0 };

  const where = actionFilter ? { action: actionFilter } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        action: true,
        target: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: page * perPage,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = new Map(users.map((u) => [u.id, u.name]));

  return {
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.userId ? nameMap.get(l.userId) ?? null : null,
      action: l.action,
      target: l.target,
      createdAt: l.createdAt,
    })),
    total,
  };
}

export async function setAiEnabled(enabled: boolean): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };
  await setSetting("ai_enabled", enabled ? "true" : "false");
  await prisma.auditLog.create({
    data: { userId: admin.id, action: enabled ? "AI_ENABLED_ADMIN" : "AI_DISABLED_ADMIN" },
  });
  revalidatePath("/dashboard/admin");
  return { success: enabled ? "AI enabled." : "AI disabled." };
}

export async function setUserPlan(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "") as Plan;
  if (!["FREE", "STUDENT_PREMIUM", "UNIVERSITY"].includes(plan)) {
    return { error: "Pick a valid plan." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: `No user found with email ${email}.` };

  await prisma.user.update({ where: { id: user.id }, data: { plan } });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: "USER_PLAN_SET", target: user.id, metadata: { plan } },
  });
  revalidatePath("/dashboard/admin");
  return { success: `${email} is now on the ${plan.replace("_", " ")} plan.` };
}
