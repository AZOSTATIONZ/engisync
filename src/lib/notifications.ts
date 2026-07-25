import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { isEmailConfigured, sendEmail, emailLayout } from "@/lib/email";
import { sendPush } from "@/lib/push";

type CreateArgs = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
};

/** Best-effort opt-in email delivery for a newly created notification. */
async function maybeEmail(args: CreateArgs) {
  if (!isEmailConfigured()) return;
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { email: true, emailNotifications: true },
  });
  if (!user?.emailNotifications || !user.email) return;

  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  const url = args.link ? `${base}${args.link}` : base;
  await sendEmail({
    to: user.email,
    subject: args.title,
    html: emailLayout(
      args.title,
      `<p>${args.body ?? ""}</p>${url ? `<p><a href="${url}">Open in EngiSync</a></p>` : ""}`,
    ),
  });
}

/**
 * Create a notification; if a dedupeKey is given, avoid duplicates.
 * Emails are sent only for genuinely new notifications (so recurring
 * reminders don't re-send on every page load).
 */
export async function createNotification(args: CreateArgs) {
  const { userId, type, title, body, link, dedupeKey } = args;

  if (dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: { userId_dedupeKey: { userId, dedupeKey } },
    });
    if (existing) return existing;
    const created = await prisma.notification.create({
      data: { userId, type, title, body, link, dedupeKey },
    });
    await maybeEmail(args);
    await sendPush(userId, { title, body, url: link ?? "/dashboard" });
    return created;
  }

  const created = await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
  await maybeEmail(args);
  await sendPush(userId, { title, body, url: link ?? "/dashboard" });
  return created;
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
    await createNotification({
      userId,
      type: NotificationType.TASK_DUE,
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
