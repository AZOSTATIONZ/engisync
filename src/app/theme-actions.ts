"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isThemeKey } from "@/lib/themes";

/**
 * Save the chosen theme to the user's account.
 *
 * WHY THIS IS FIRE-AND-FORGET. The theme has already been applied to the
 * document and written to localStorage by the time this runs; the account
 * copy is what makes the choice follow someone to another device. If the
 * network is down — and a good share of these students are on intermittent
 * mobile data — the right outcome is a theme that works everywhere on THIS
 * device and syncs later, not an error toast about a colour scheme.
 *
 * Returns quietly for guests rather than redirecting. The provider sits in
 * the root layout and therefore runs on the sign-in page too; a theme change
 * there must not bounce someone out of the form they are filling in.
 *
 * Validated against the registry because a server action is a public
 * endpoint: the UI only offers real themes, which constrains people and not
 * crafted requests.
 */
export async function saveThemePreference(key: string): Promise<void> {
  if (!isThemeKey(key)) return;

  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { themeKey: key },
    });
  } catch {
    // The device-local preference already holds. Nothing here is worth
    // interrupting a student for.
  }
}
