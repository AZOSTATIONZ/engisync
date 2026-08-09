import type { NextRequest } from "next/server";
import { signOut } from "@/auth";

/**
 * Clear the session cookie and land on the login page.
 *
 * WHY A ROUTE AND NOT JUST A REDIRECT
 * A revoked session is detected while RENDERING (see dashboard/layout.tsx),
 * and a React Server Component cannot set cookies mid-render. Redirecting
 * straight to `/login` would therefore leave the dead JWT in the browser:
 * harmless today, because every protected surface revalidates, but it means
 * the browser still presents a token that looks valid to anything that only
 * checks for presence. Cleaning it up here removes that trap for whoever adds
 * the next middleware check.
 *
 * `reason` is presentational only — never trusted, never used to decide
 * anything, and matched against a fixed set so an attacker cannot craft a
 * link that puts arbitrary text on the login page.
 */
export async function GET(req: NextRequest) {
  const reason = req.nextUrl.searchParams.get("reason");
  const suffix = reason === "revoked" ? "?revoked=1" : "";
  await signOut({ redirectTo: `/login${suffix}` });
}
