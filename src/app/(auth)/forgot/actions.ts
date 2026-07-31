"use server";

import { headers } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations";
import {
  sendEmail,
  emailLayout,
  isEmailConfigured,
} from "@/lib/email";
import { rateLimitShared, clientIp } from "@/lib/rate-limit";

export type ResetState = { error?: string; success?: string } | null;

async function baseUrl(): Promise<string> {
  const fromEnv = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const h = await headers();
  const limit = await rateLimitShared(`forgot:${clientIp(h)}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };
  const { email } = parsed.data;

  // Generic response either way (avoids leaking which emails are registered).
  const generic = {
    success: "If an account exists for that email, we've sent a reset link.",
  };

  if (!isEmailConfigured()) {
    return {
      error:
        "Email isn't configured on this server, so reset links can't be sent yet.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return generic;

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const url = `${await baseUrl()}/reset/${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your EngiSync password",
    html: emailLayout(
      "Password reset",
      `<p>We received a request to reset your password.</p>
       <p><a href="${url}">Reset your password</a> — this link expires in 1 hour.</p>
       <p>If you didn't request this, you can safely ignore this email.</p>`,
    ),
  });

  return generic;
}

export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    }),
    // Invalidate any other outstanding reset tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false },
      data: { used: true },
    }),
  ]);
  await prisma.auditLog.create({
    data: { userId: record.userId, action: "PASSWORD_RESET" },
  });

  return { success: "Your password has been reset. You can now log in." };
}
