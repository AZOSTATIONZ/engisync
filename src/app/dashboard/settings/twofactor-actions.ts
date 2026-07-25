"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { generateQrDataUrl } from "@/lib/qr";

export type TwoFactorState = { error?: string; success?: string } | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

/** Generate a fresh secret + QR to begin 2FA setup (not enabled yet). */
export async function startTwoFactorSetup(): Promise<
  { error?: string; secret?: string; otpauthUrl?: string; qr?: string } | null
> {
  const user = await requireUser();
  const secret = generateTotpSecret();

  // Store the pending secret; twoFactorEnabled stays false until confirmed.
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const url = otpauthUrl(secret, user.email ?? "EngiSync");
  const qr = await generateQrDataUrl(url);
  return { secret, otpauthUrl: url, qr };
}

/** Confirm setup by validating a code, then enable 2FA. */
export async function confirmTwoFactor(code: string): Promise<TwoFactorState> {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorSecret: true },
  });
  if (!record?.twoFactorSecret) {
    return { error: "Start setup first." };
  }
  if (!verifyTotp(record.twoFactorSecret, code)) {
    return { error: "That code isn't valid. Try again." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "2FA_ENABLED" },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Two-factor authentication is on." };
}

/** Disable 2FA (requires a current valid code). */
export async function disableTwoFactor(code: string): Promise<TwoFactorState> {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!record?.twoFactorEnabled || !record.twoFactorSecret) {
    return { error: "2FA isn't enabled." };
  }
  if (!verifyTotp(record.twoFactorSecret, code)) {
    return { error: "That code isn't valid." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "2FA_DISABLED" },
  });

  revalidatePath("/dashboard/settings");
  return { success: "Two-factor authentication is off." };
}
