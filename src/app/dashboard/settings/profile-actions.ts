"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  LIMITS,
  clampText,
  isAccentKey,
  isAvatarStyle,
  normaliseHandle,
  parseSkills,
} from "@/lib/personalization";

export type ProfileState = { error?: string; success?: string } | null;

/**
 * Save the profile.
 *
 * Every field is validated against a FIXED SET or a length limit before it
 * reaches the database. `accentColor` and `avatarStyle` in particular are
 * checked against their palettes rather than stored as given: the accent is
 * interpolated into a `<style>` element in the dashboard layout, so an
 * unvalidated value there would be a stylesheet injection. Validating at the
 * write boundary means the render side can trust the column.
 */
export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const limited = rateLimit(`profile:${userId}`, 20, 10 * 60_000);
  if (!limited.ok) {
    return { error: "Too many changes. Try again in a few minutes." };
  }

  const name = clampText(String(formData.get("name") ?? ""), 60);
  if (!name) return { error: "Your name can't be empty." };

  const accentRaw = String(formData.get("accentColor") ?? "");
  const styleRaw = String(formData.get("avatarStyle") ?? "");

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      headline: clampText(String(formData.get("headline") ?? ""), LIMITS.headline) || null,
      bio: clampText(String(formData.get("bio") ?? ""), LIMITS.bio) || null,
      skills: parseSkills(String(formData.get("skills") ?? "")),
      // Unrecognised values are dropped rather than stored, so a stale palette
      // key can never persist and re-break the interface later.
      accentColor: isAccentKey(accentRaw) ? accentRaw : null,
      avatarStyle: isAvatarStyle(styleRaw) ? styleRaw : null,
    },
  });

  // The accent is applied in the dashboard layout, so the whole shell needs
  // revalidating — not just this page.
  revalidatePath("/dashboard", "layout");
  return { success: "Profile saved." };
}

/**
 * Publish or unpublish the public portfolio at /p/<handle>.
 *
 * Publishing is an explicit, reversible act with a clear description of what
 * becomes visible. It is never turned on as a side effect of anything else,
 * and never defaults to on — a student's work going onto the open internet is
 * their decision alone.
 *
 * Unpublishing does NOT clear the handle: someone toggling off to think about
 * it should not lose their name to whoever claims it next.
 */
export async function updatePublicProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const wantsPublic = formData.get("publicProfile") === "on";

  if (!wantsPublic) {
    await prisma.user.update({
      where: { id: userId },
      data: { publicProfile: false },
    });
    revalidatePath("/dashboard/settings");
    return { success: "Your profile is private again." };
  }

  const parsed = normaliseHandle(String(formData.get("handle") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  const taken = await prisma.user.findFirst({
    where: { handle: parsed.handle, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) return { error: "That name is already taken. Try another." };

  await prisma.user.update({
    where: { id: userId },
    data: { handle: parsed.handle, publicProfile: true },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath(`/p/${parsed.handle}`);
  return { success: `Published at /p/${parsed.handle}` };
}
