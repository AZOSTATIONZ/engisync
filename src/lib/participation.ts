import { prisma } from "@/lib/prisma";

export type MemberParticipation = {
  userId: string;
  tasksAssigned: number;
  tasksDone: number;
  loggedMinutes: number;
  lastActivityAt: string | null;
  /** True when the member shows no meaningful contribution yet. */
  inactive: boolean;
};

/** Grace period before a brand-new member can be flagged as inactive. */
const GRACE_DAYS = 7;
/** How long without activity counts as inactive. */
const STALE_DAYS = 14;

/**
 * Compute a simple participation signal for every member of a workspace,
 * derived from tasks + time logs (no extra tracking tables needed).
 * A member is "inactive" when: they joined more than GRACE_DAYS ago,
 * have completed no tasks, and have no task activity in the last STALE_DAYS.
 * Leaders are never flagged.
 */
export async function getWorkspaceParticipation(
  workspaceId: string,
): Promise<Record<string, MemberParticipation>> {
  const now = Date.now();
  const staleCutoff = new Date(now - STALE_DAYS * 86400000);

  const [members, tasks, timeLogs] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true, role: true, joinedAt: true },
    }),
    prisma.task.findMany({
      where: { workspaceId, assigneeId: { not: null } },
      select: { assigneeId: true, status: true, updatedAt: true },
    }),
    prisma.timeLog.findMany({
      where: { task: { workspaceId } },
      select: { userId: true, minutes: true, createdAt: true },
    }),
  ]);

  const result: Record<string, MemberParticipation> = {};

  for (const m of members) {
    const mine = tasks.filter((t) => t.assigneeId === m.userId);
    const done = mine.filter((t) => t.status === "DONE").length;
    const logs = timeLogs.filter((l) => l.userId === m.userId);
    const loggedMinutes = logs.reduce((s, l) => s + l.minutes, 0);

    const lastTask = mine.reduce<Date | null>(
      (max, t) => (!max || t.updatedAt > max ? t.updatedAt : max),
      null,
    );
    const lastLog = logs.reduce<Date | null>(
      (max, l) => (!max || l.createdAt > max ? l.createdAt : max),
      null,
    );
    const lastActivity =
      lastTask && lastLog
        ? lastTask > lastLog
          ? lastTask
          : lastLog
        : lastTask ?? lastLog;

    const joinedLongAgo =
      now - m.joinedAt.getTime() > GRACE_DAYS * 86400000;
    const isLeader = m.role === "LEADER";
    const noRecentActivity = !lastActivity || lastActivity < staleCutoff;

    const inactive =
      !isLeader && joinedLongAgo && done === 0 && noRecentActivity;

    result[m.userId] = {
      userId: m.userId,
      tasksAssigned: mine.length,
      tasksDone: done,
      loggedMinutes,
      lastActivityAt: lastActivity ? lastActivity.toISOString() : null,
      inactive,
    };
  }

  return result;
}

/** Participation for a single member (used for the self-nudge banner). */
export async function getMyParticipation(
  workspaceId: string,
  userId: string,
): Promise<MemberParticipation | null> {
  const all = await getWorkspaceParticipation(workspaceId);
  return all[userId] ?? null;
}
