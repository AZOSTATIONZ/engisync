import { NotificationCategory, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { notify } from "@/lib/notify";

type CreateArgs = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
  /**
   * Something the recipient needs to KNOW, not something they might enjoy
   * reading: a leader's announcement, a task assigned to them, a deadline.
   *
   * Essential mail is on by default; everything else stays opt-in. The old
   * behaviour gated ALL email behind a single preference that defaulted to
   * false, which meant a group leader could post "the meeting moved to
   * Tuesday" and reach nobody's inbox. Someone declining a weekly digest is
   * not declining to be told their project changed.
   *
   * Recipients can still switch essential mail off — it is a preference, not a
   * trap — but they have to make that choice rather than have it made for them
   * by a default.
   */
  essential?: boolean;
};

/**
 * BACKWARDS-COMPATIBLE SHIM over `notify()`.
 *
 * Kept so existing call sites do not all have to change at once, and so the
 * `essential` flag they already pass keeps meaning what it meant. It maps onto
 * the new model rather than duplicating it: essential mail becomes a DEADLINE
 * notification (the thing essential mail was invented for), and everything
 * else becomes routine ACTIVITY, which is digest-only by default.
 *
 * New code should call `notify()` directly and choose a real category. This
 * exists to make that migration incremental instead of a flag day.
 */
export async function createNotification(args: CreateArgs) {
  const category: NotificationCategory =
    args.type === NotificationType.TASK_DUE || args.essential
      ? NotificationCategory.DEADLINE
      : NotificationCategory.ACTIVITY;

  await notify({
    userId: args.userId,
    category,
    type: args.type,
    title: args.title,
    body: args.body,
    link: args.link,
    dedupeKey: args.dedupeKey,
  });
}

// Throttle reminder scans per user (they run on every navbar render otherwise).
const lastScan = new Map<string, number>();
const SCAN_INTERVAL_MS = 10 * 60 * 1000; // at most once per 10 minutes per user

/**
 * Scan for tasks due within the next 24h (or overdue and not done) and
 * create one-off reminders. Throttled so it doesn't run on every page load.
 */
export async function generateDueSoonNotifications(userId: string) {
  const now = new Date();
  const last = lastScan.get(userId) ?? 0;
  if (now.getTime() - last < SCAN_INTERVAL_MS) return;
  lastScan.set(userId, now.getTime());

  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const wsIds = await userWorkspaceIds(userId);

  const dueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lte: soon },
      status: { not: "DONE" },
      OR: [{ creatorId: userId }, { assigneeId: userId }, { workspaceId: { in: wsIds } }],
    },
    select: { id: true, title: true, dueDate: true },
    take: 50,
  });

  for (const t of dueTasks) {
    if (!t.dueDate) continue;
    const overdue = t.dueDate < now;
    await notify({
      userId,
      category: NotificationCategory.DEADLINE,
      type: NotificationType.TASK_DUE,
      // Already overdue is URGENT, so it goes out immediately even inside
      // quiet hours; merely due soon is NORMAL and will wait until morning if
      // the student is asleep. The distinction matters because "overdue"
      // cannot be acted on any later, while "due tomorrow" can.
      priority: overdue ? "URGENT" : "NORMAL",
      title: overdue ? `Overdue: ${t.title}` : `Due soon: ${t.title}`,
      body: `This task is due ${t.dueDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })}.`,
      link: "/dashboard/tasks",
      dedupeKey: `task-due:${t.id}`,
    });
  }
}

export async function listNotifications(userId: string, limit = 15) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
