"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { revokeAllSessions } from "@/lib/two-factor";

/**
 * End every session for this user, on every device.
 *
 * Bumping `sessionVersion` strands every JWT minted before now, including the
 * one belonging to the person clicking — which is why the UI says so plainly
 * rather than implying other devices are the only casualty.
 *
 * The redirect goes through `/logout` instead of straight to `/login` so the
 * dead cookie is actually cleared. A server action can set cookies, but
 * routing this through the same path the automatic revocation check uses
 * means one code path to keep correct instead of two.
 */
export async function signOutEverywhere(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await revokeAllSessions(session.user.id);
  redirect("/logout?reason=revoked");
}
