import { cache } from "react";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Data-access helpers for workspaces.
 * Keeps membership/permission queries in one place (SOLID: single responsibility).
 */

/**
 * Return the user's membership for a workspace, or null.
 *
 * WRAPPED IN `cache()` BECAUSE DISTANCE IS EXPENSIVE.
 *
 * A project page renders the project layout and the page itself in one
 * request, and both must establish that the caller is a member before showing
 * anything — so this ran twice per navigation. Against a database in another
 * hemisphere that duplicate is not free: measured round-trip latency to the
 * Neon instance is ~271ms, so every avoidable query is a quarter-second of a
 * student staring at a blank tab.
 *
 * `cache()` memoises for the lifetime of a single request, which is exactly
 * the window in which the answer cannot change. It is not a TTL cache and it
 * does not persist across requests, so authorization stays as fresh as it was
 * before — a revoked membership still takes effect on the very next
 * navigation.
 */
export const getMembership = cache(async function getMembership(
  workspaceId: string,
  userId: string,
) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
});

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
