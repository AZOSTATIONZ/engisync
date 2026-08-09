"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { generateQrDataUrl } from "@/lib/qr";
import { clearBackupCodes, issueBackupCodes } from "@/lib/two-factor";
import { recordSecurityEvent } from "@/lib/security-events";
import { clientIp } from "@/lib/rate-limit";

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

/**
 * Confirm setup by validating a code, then enable 2FA AND issue recovery
 * codes.
 *
 * The codes are returned here, in the same step that turns 2FA on, because
 * this is the only moment they exist in readable form — they are stored as
 * hashes and can never be shown again. Enabling 2FA without handing back a
 * recovery path is precisely the defect this replaces: it made the most
 * security-conscious users the only ones who could permanently lock
 * themselves out of their own account.
 */
export async function confirmTwoFactor(
  code: string,
): Promise<TwoFactorState & { backupCodes?: string[] }> {
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
  const backupCodes = await issueBackupCodes(user.id);
  // Through recordSecurityEvent so the activity list carries the address and
  // device for this change too — see the note in forgot/actions.ts.
  {
    const h = await headers();
    await recordSecurityEvent({
      userId: user.id,
      action: "2FA_ENABLED",
      ip: clientIp(h),
      userAgent: h.get("user-agent"),
    });
  }

  revalidatePath("/dashboard/settings");
  return {
    success: "Two-factor authentication is on.",
    backupCodes,
  };
}

/**
 * Issue a fresh set, invalidating the old one.
 *
 * Requires a current TOTP code: whoever regenerates recovery codes can use
 * them to enter the account later, so this is as sensitive as logging in and
 * is gated the same way. Deliberately does NOT accept a backup code as proof
 * — someone holding a single stolen code could otherwise mint ten more and
 * lock the real owner out.
 */
export async function regenerateBackupCodes(
  code: string,
): Promise<TwoFactorState & { backupCodes?: string[] }> {
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

  const backupCodes = await issueBackupCodes(user.id);
  // Through recordSecurityEvent so the activity list carries the address and
  // device for this change too — see the note in forgot/actions.ts.
  {
    const h = await headers();
    await recordSecurityEvent({
      userId: user.id,
      action: "2FA_BACKUP_CODES_REGENERATED",
      ip: clientIp(h),
      userAgent: h.get("user-agent"),
    });
  }

  revalidatePath("/dashboard/settings");
  return { success: "New recovery codes generated.", backupCodes };
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
  // Recovery codes are meaningless once 2FA is off, and leaving them behind
  // would silently resurrect them if 2FA were re-enabled later — the user
  // would be shown a fresh set while an old printout still worked.
  await clearBackupCodes(user.id);
  // Through recordSecurityEvent so the activity list carries the address and
  // device for this change too — see the note in forgot/actions.ts.
  {
    const h = await headers();
    await recordSecurityEvent({
      userId: user.id,
      action: "2FA_DISABLED",
      ip: clientIp(h),
      userAgent: h.get("user-agent"),
    });
  }

  revalidatePath("/dashboard/settings");
  return { success: "Two-factor authentication is off." };
}
