"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateEmailNotifications(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotifications: enabled },
  });
  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Switch off announcements, task assignments and deadline reminders by email.
 *
 * Deliberately a separate control from `updateEmailNotifications`. Essential
 * mail defaults ON — a leader posting "the meeting moved" must reach people —
 * but it stays a genuine choice, not something the product forces. Anyone can
 * turn it off; the difference is that they decide, rather than a default
 * deciding for them and silently swallowing the message.
 */
export async function updateEssentialEmails(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { essentialEmails: enabled },
  });
  revalidatePath("/dashboard/settings");
  return { success: true };
}
