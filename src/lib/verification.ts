import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/qr";
import {
  sendEmail,
  emailLayout,
  isEmailConfigured,
} from "@/lib/email";

export type VerificationSendResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "send-failed"; error?: string };

/**
 * Create an email-verification token and email a verification link.
 * Returns a structured result so callers can surface the real outcome instead
 * of silently pretending an email was sent.
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
): Promise<VerificationSendResult> {
  if (!isEmailConfigured()) {
    console.warn(
      "[verification] Email provider not configured — no verification email sent. " +
        "Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.",
    );
    return { ok: false, reason: "not-configured" };
  }

  // Invalidate any outstanding tokens so only the newest link works.
  await prisma.emailVerificationToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const url = `${await getBaseUrl()}/verify/${token}`;
  const res = await sendEmail({
    to: email,
    subject: "Verify your EngiSync email",
    html: emailLayout(
      "Confirm your email",
      `<p>Welcome to EngiSync! Please confirm your email address.</p>
       <p><a href="${url}">Verify my email</a> — this link expires in 24 hours.</p>
       <p style="color:#64748b;font-size:12px">If the link doesn't work, paste this into your browser:<br/>${url}</p>`,
    ),
  });

  if (!res.sent) {
    console.error(`[verification] send failed for ${email}: ${res.error ?? "unknown"}`);
    return { ok: false, reason: "send-failed", error: res.error };
  }
  return { ok: true };
}

/** Validate a verification token and mark the user's email verified. */
/**
 * Gate for actions that should only be available to a REAL, reachable account.
 *
 * Returns an error string to show the user, or null when they may proceed.
 *
 * Two deliberate escape hatches:
 *
 *   1. If no email provider is configured, this always passes. Gating on a
 *      verification email that can never be sent would lock every user out of
 *      the product permanently — a self-inflicted outage, not a security
 *      control.
 *   2. OAuth accounts (Google, Microsoft) are treated as verified. The
 *      provider already proved ownership of the mailbox; asking again is
 *      friction with no security gain.
 *
 * Applied to actions with real-world consequences — joining a department,
 * creating a group — rather than to login. Blocking login strands people who
 * never received the mail, with no way to ask for another one.
 */
export async function verifiedAccountGate(
  userId: string,
): Promise<string | null> {
  if (!isEmailConfigured()) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, accounts: { select: { id: true }, take: 1 } },
  });
  if (!user) return "Account not found.";
  if (user.emailVerified) return null;
  if (user.accounts.length > 0) return null;

  return "Verify your email address first — check your inbox for the link, or resend it from the banner at the top of the page.";
}

export async function verifyEmailToken(
  token: string,
): Promise<"ok" | "invalid" | "expired"> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!record || record.used) return "invalid";
  if (record.expiresAt < new Date()) return "expired";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { token },
      data: { used: true },
    }),
  ]);
  return "ok";
}
