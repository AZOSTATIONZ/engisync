"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AvatarPresentation } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AvatarState = { error?: string; success?: string } | null;

/**
 * Set which figure appears in this user's dashboard scene.
 *
 * Validated against the enum rather than trusted, because a server action is a
 * public endpoint and the UI only constrains people, not requests. An invalid
 * value would otherwise reach Prisma and surface as a 500 on a settings page.
 *
 * Deliberately NOT audited. `recordSecurityEvent` exists for things worth
 * investigating later; a student changing a cartoon is not one of them, and
 * padding the account-activity list with it would bury the sign-in events it
 * exists to surface.
 */
export async function setAvatarPresentation(
  value: AvatarPresentation,
): Promise<AvatarState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!Object.values(AvatarPresentation).includes(value)) {
    return { error: "That isn't an option." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPresentation: value },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: "Saved." };
}
