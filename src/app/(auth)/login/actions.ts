"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { rateLimitShared, clientIp } from "@/lib/rate-limit";

export type PreLoginResult = {
  ok: boolean;
  twoFactorRequired?: boolean;
  error?: string;
};

/**
 * Pre-check credentials so the login form knows whether to ask for a 2FA code
 * before calling signIn. Password is re-verified in authorize as well.
 */
export async function preLogin(
  email: string,
  password: string,
): Promise<PreLoginResult> {
  const h = await headers();
  const limit = await rateLimitShared(`login:${clientIp(h)}`, 10, 5 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Try again soon." };

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return { ok: false, error: "Invalid email or password." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Invalid email or password." };

  return { ok: true, twoFactorRequired: user.twoFactorEnabled };
}
