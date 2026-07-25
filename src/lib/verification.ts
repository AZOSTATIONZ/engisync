import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/qr";
import {
  sendEmail,
  emailLayout,
  isEmailConfigured,
} from "@/lib/email";

/**
 * Create an email-verification token and email a verification link.
 * No-ops gracefully when email isn't configured.
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
): Promise<void> {
  if (!isEmailConfigured()) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const url = `${await getBaseUrl()}/verify/${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your EngiSync email",
    html: emailLayout(
      "Confirm your email",
      `<p>Welcome to EngiSync! Please confirm your email address.</p>
       <p><a href="${url}">Verify my email</a> — this link expires in 24 hours.</p>`,
    ),
  });
}

/** Validate a verification token and mark the user's email verified. */
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
