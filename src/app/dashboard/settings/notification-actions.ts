"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationCategory } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type NotifyPrefState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * Set one channel of one category.
 *
 * Upsert, because a row only exists once somebody has changed something — see
 * the note on `NotificationPreference`. The first time a user touches a toggle
 * we materialise the row with the OTHER channel at its category default, so
 * the stored row means what the screen showed rather than silently resetting
 * the channel they did not touch.
 */
export async function setNotificationPreference(
  category: NotificationCategory,
  channel: "email" | "push",
  enabled: boolean,
  otherChannelDefault: boolean,
): Promise<NotifyPrefState> {
  const userId = await requireUserId();

  // SECURITY is not mutable. Enforced HERE as well as in the UI, because a
  // server action is a public endpoint: hiding a toggle stops a person, not a
  // crafted request, and being unable to mute break-in alerts is the point.
  if (category === NotificationCategory.SECURITY) {
    return { error: "Security alerts can't be turned off." };
  }

  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: {
      userId,
      category,
      email: channel === "email" ? enabled : otherChannelDefault,
      push: channel === "push" ? enabled : otherChannelDefault,
    },
    update: { [channel]: enabled },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Saved." };
}

/**
 * Set (or clear) the quiet-hours window.
 *
 * Both null clears it. Anything else must be two whole hours in range — a
 * half-set window is the state that would silently swallow email with nothing
 * on screen to explain it.
 */
export async function setQuietHours(
  start: number | null,
  end: number | null,
): Promise<NotifyPrefState> {
  const userId = await requireUserId();

  if (start === null || end === null) {
    await prisma.user.update({
      where: { id: userId },
      data: { quietHoursStart: null, quietHoursEnd: null },
    });
    revalidatePath("/dashboard/settings");
    return { success: "Quiet hours turned off." };
  }

  const valid = (h: number) => Number.isInteger(h) && h >= 0 && h <= 23;
  if (!valid(start) || !valid(end)) {
    return { error: "Choose a start and end hour." };
  }
  if (start === end) {
    // Rejected rather than silently accepted: `inQuietHours` treats this as a
    // zero-length window, so accepting it would leave a user believing they
    // had set quiet hours that do nothing.
    return { error: "Start and end can't be the same hour." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { quietHoursStart: start, quietHoursEnd: end },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Quiet hours saved." };
}
