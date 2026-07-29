"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

export async function markNotificationRead(id: string) {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  revalidatePath("/dashboard");
}

/**
 * Dismiss a notification the user has dealt with.
 *
 * "Read" and "handled" are different states. Opening the panel marks things
 * read, which is why a list of items you have already acted on keeps sitting
 * there looking like outstanding work. Dismissing removes it.
 *
 * The `userId` in the WHERE clause is the security boundary: `updateMany` and
 * `deleteMany` scoped by owner mean a crafted id belonging to someone else
 * matches zero rows instead of deleting their notification. Never look the
 * record up by id alone and then check ownership afterwards.
 *
 * NOTE ON REGENERATION: due-soon reminders are recreated by
 * `generateDueSoonNotifications`, which dedupes on `dedupeKey` — a key that
 * includes the day. Dismissing today's "task due tomorrow" will not make it
 * reappear today, but the reminder does return tomorrow if the task is still
 * outstanding. That is deliberate: dismissing a reminder should silence it,
 * not cancel the deadline.
 */
export async function dismissNotification(id: string) {
  const userId = await requireUserId();
  await prisma.notification.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
}

/** Clear everything already read, leaving anything still unseen in place. */
export async function dismissReadNotifications() {
  const userId = await requireUserId();
  await prisma.notification.deleteMany({ where: { userId, read: true } });
  revalidatePath("/dashboard");
}
