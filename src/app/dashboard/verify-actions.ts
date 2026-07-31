"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/verification";
import { isEmailConfigured } from "@/lib/email";
import { rateLimitShared } from "@/lib/rate-limit";

export type ResendState = { error?: string; success?: string } | null;

/** Resend the verification email to the current user. */
export async function resendVerification(): Promise<ResendState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!isEmailConfigured()) {
    return { error: "Email isn't configured on this server." };
  }
  const limit = await rateLimitShared(`verify:${session.user.id}`, 3, 10 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Please wait a bit before requesting another email." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user) return { error: "Account not found." };
  if (user.emailVerified) return { success: "Your email is already verified." };

  const res = await sendVerificationEmail(session.user.id, user.email);
  if (!res.ok) {
    return {
      error:
        res.reason === "not-configured"
          ? "Email isn't configured on this server yet — ask the administrator to set it up."
          : `Couldn't send the email: ${res.error ?? "unknown error"}. Please try again.`,
    };
  }
  return { success: "Verification email sent — check your inbox (and spam)." };
}
