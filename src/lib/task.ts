import { Recurrence } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Task data-access helpers. Centralizes access rules:
 * a user may see a task if they created it, are assigned it,
 * or belong to the task's workspace.
 */

/** Workspace IDs the user is a member of. */
export async function userWorkspaceIds(userId: string): Promise<string[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  return memberships.map((m) => m.workspaceId);
}

/** Tasks visible to the user, optionally filtered. */
export async function listTasksForUser(
  userId: string,
  filters: { workspaceId?: string; status?: string; scope?: "personal" } = {},
) {
  const wsIds = await userWorkspaceIds(userId);

  const where: Record<string, unknown> = {};
  const or: Record<string, unknown>[] = [
    { creatorId: userId },
    { assigneeId: userId },
    { workspaceId: { in: wsIds } },
  ];
  where.OR = or;

  if (filters.scope === "personal") {
    where.OR = [{ creatorId: userId }, { assigneeId: userId }];
    where.workspaceId = null;
  }
  if (filters.workspaceId) where.workspaceId = filters.workspaceId;
  if (filters.status) where.status = filters.status;

  return prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      workspace: { select: { id: true, name: true } },
      dependsOn: { select: { id: true, title: true, status: true } },
      _count: { select: { timeLogs: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
}

/** True if the user can view/edit a task. */
export async function canAccessTask(taskId: string, userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { creatorId: userId },
        { assigneeId: userId },
        { workspaceId: { in: wsIds } },
      ],
    },
  });
  return task;
}

/** Compute the next due date for a recurring task. */
export function nextDueDate(from: Date, recurrence: Recurrence): Date | null {
  const d = new Date(from);
  switch (recurrence) {
    case Recurrence.DAILY:
      d.setDate(d.getDate() + 1);
      return d;
    case Recurrence.WEEKLY:
      d.setDate(d.getDate() + 7);
      return d;
    case Recurrence.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      return d;
    default:
      return null;
  }
}
