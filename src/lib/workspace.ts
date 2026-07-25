import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Data-access helpers for workspaces.
 * Keeps membership/permission queries in one place (SOLID: single responsibility).
 */

/** Return the user's membership for a workspace, or null. */
export async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

/** True if the user is the leader of the workspace. */
export async function isWorkspaceLeader(workspaceId: string, userId: string) {
  const m = await getMembership(workspaceId, userId);
  return m?.role === WorkspaceRole.LEADER;
}

/** Load a workspace the user belongs to, with members. Returns null if no access. */
export async function getWorkspaceForUser(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "PENDING" },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      invites: {
        where: { revoked: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return workspace;
}

/**
 * Summary of every group the user already belongs to — used for the
 * "you're already in a project" duplicate-membership check.
 */
export async function getExistingGroupsInfo(userId: string) {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          department: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.workspace.id,
    name: r.workspace.name,
    department: r.workspace.department?.name ?? null,
    role: r.role as string,
    joinedAt: r.joinedAt.toISOString(),
    status: r.workspace._count.tasks > 0 ? "Active" : "New",
  }));
}

/** All workspaces the user is a member of. */
export async function listWorkspacesForUser(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}
