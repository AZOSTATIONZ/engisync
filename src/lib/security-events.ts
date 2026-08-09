import { prisma } from "@/lib/prisma";
import { describeDevice, deviceFingerprint } from "@/lib/device";
import { emailLayout, isEmailConfigured, sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { NotificationCategory } from "@prisma/client";

/**
 * The account's own security record.
 *
 * WHY THIS EXISTS
 * `AuditLog` already recorded 31 product actions — evidence uploaded, grants
 * changed, AI runs — and almost nothing about authentication. There was
 * `PASSWORD_RESET` and `USER_REGISTERED` and that was all. A student could
 * not answer "has anyone else been in my account?", and neither could the
 * operator. Failed sign-ins were counted for throttling and then thrown away,
 * so a slow credential-stuffing campaign left no trace anywhere.
 *
 * Worse, nothing READ the audit log at all. It was write-only: a trail
 * nobody could see, which is indistinguishable from no trail at the moment
 * you need one.
 *
 * Every function here is deliberately failure-tolerant. Recording that a
 * login happened must never be able to PREVENT a login — an audit trail that
 * takes the front door down with it when the database hiccups has made
 * security worse, not better.
 */

export const SECURITY_ACTIONS = [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "LOGIN_BLOCKED_RATE_LIMIT",
  "LOGIN_NEW_DEVICE",
  "LOGIN_BACKUP_CODE_USED",
  "PASSWORD_RESET",
  "2FA_ENABLED",
  "2FA_DISABLED",
  "2FA_BACKUP_CODES_REGENERATED",
] as const;

export type SecurityAction = (typeof SECURITY_ACTIONS)[number];

/** Plain-language labels. The activity list is read by students, not admins. */
const LABELS: Record<SecurityAction, string> = {
  LOGIN_SUCCEEDED: "Signed in",
  LOGIN_FAILED: "Failed sign-in attempt",
  LOGIN_BLOCKED_RATE_LIMIT: "Sign-in blocked after too many attempts",
  LOGIN_NEW_DEVICE: "Signed in from a new device",
  LOGIN_BACKUP_CODE_USED: "Signed in with a recovery code",
  PASSWORD_RESET: "Password reset",
  "2FA_ENABLED": "Two-factor authentication turned on",
  "2FA_DISABLED": "Two-factor authentication turned off",
  "2FA_BACKUP_CODES_REGENERATED": "New recovery codes generated",
};

export function describeSecurityAction(action: string): string {
  return LABELS[action as SecurityAction] ?? action;
}

/**
 * Write one security event.
 *
 * Swallows its own errors ON PURPOSE. See the note at the top of this file:
 * every caller sits directly on the authentication path, and a logging
 * failure must degrade to "we lost a log line", never to "nobody can sign
 * in".
 */
export async function recordSecurityEvent(input: {
  userId: string | null;
  action: SecurityAction;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ? (input.metadata as object) : undefined,
      },
    });
  } catch (err) {
    console.error("[security-events] could not record", input.action, err);
  }
}

/** Has this account signed in from something like this before? */
export async function isKnownDevice(
  userId: string,
  userAgent: string | null | undefined,
): Promise<boolean> {
  try {
    const found = await prisma.knownDevice.findUnique({
      where: {
        userId_fingerprint: { userId, fingerprint: deviceFingerprint(userAgent) },
      },
      select: { id: true },
    });
    return Boolean(found);
  } catch {
    // Cannot tell. Answer "known" so an outage of this table cannot lock a
    // legitimate user out via the account rate limit — this signal only ever
    // RELAXES a restriction, so failing open here is the safe direction.
    return true;
  }
}

/**
 * Record that a sign-in happened from this device, and say whether it was new.
 *
 * The upsert is what makes this cheap and race-free: a returning device just
 * refreshes `lastSeenAt`, and two simultaneous sign-ins cannot create
 * duplicate rows because `[userId, fingerprint]` is unique.
 */
export async function noteDeviceSignIn(
  userId: string,
  ip: string | null,
  userAgent: string | null | undefined,
): Promise<{ isNew: boolean; label: string }> {
  const fingerprint = deviceFingerprint(userAgent);
  const label = describeDevice(userAgent);

  try {
    const existing = await prisma.knownDevice.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
      select: { id: true },
    });

    await prisma.knownDevice.upsert({
      where: { userId_fingerprint: { userId, fingerprint } },
      create: { userId, fingerprint, label, lastIp: ip },
      update: { lastSeenAt: new Date(), lastIp: ip },
    });

    return { isNew: !existing, label };
  } catch (err) {
    console.error("[security-events] device note failed", err);
    // Claim "not new" so a failure here cannot spam alerts.
    return { isNew: false, label };
  }
}

/**
 * Tell the user, in the app and by email, that their account was used from
 * somewhere new.
 *
 * IN-APP FIRST, EMAIL IF POSSIBLE. Production email is currently
 * unconfigured, so an email-only alert would reach nobody at all. The
 * in-app notification works today and the email upgrades it the moment SMTP
 * is set — which is why the ordering is not an accident.
 *
 * This ignores `emailNotifications`. That preference governs product noise
 * (someone completed a task); "your account was accessed from a device you
 * have not used before" is not product noise, and a user who muted digests
 * has not asked to be kept ignorant of a possible break-in. It respects
 * `essentialEmails`, which is the switch that does mean that.
 */
export async function alertNewDevice(
  userId: string,
  label: string,
  ip: string | null,
  when: Date = new Date(),
): Promise<void> {
  const stamp = when.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  /* Routed through the dispatcher rather than writing the row directly.
     SECURITY is the one category `notify()` refuses to let a user mute, and
     it is marked URGENT so it ignores quiet hours — being woken by a genuine
     break-in alert is the correct outcome, and the alternative is learning
     about it in tomorrow morning's digest. */
  await notify({
    userId,
    category: NotificationCategory.SECURITY,
    priority: "URGENT",
    title: "New sign-in to your account",
    body: `${label}${ip ? ` · ${ip}` : ""} · ${stamp}. If this wasn't you, change your password now.`,
    link: "/dashboard/settings",
    // One alert per device per day. Without this, a student whose phone drops
    // its session repeatedly would get an identical warning every reconnect.
    dedupeKey: `new-device:${label}:${when.toISOString().slice(0, 10)}`,
    // The purpose-written email below replaces the generic one; without this
    // a single sign-in would produce two emails saying the same thing.
    emailHandledByCaller: true,
  });

  /* The dedicated email below stays, and is deliberately NOT the one
     `notify()` sends: it spells out the device, address and time in a form
     someone can act on, which a generic notification email cannot. */
  if (!isEmailConfigured()) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, essentialEmails: true },
    });
    if (!user?.email || !user.essentialEmails) return;

    await sendEmail({
      to: user.email,
      subject: "New sign-in to your EngiSync account",
      html: emailLayout(
        "New sign-in",
        `<p>Your EngiSync account was just signed in to from a device you
          haven't used before.</p>
         <p><strong>${label}</strong><br/>
            ${ip ? `IP address: ${ip}<br/>` : ""}
            ${stamp}</p>
         <p>If this was you, no action is needed.</p>
         <p>If it wasn't, <strong>reset your password immediately</strong> —
            that will also sign out every other device.</p>`,
      ),
    });
  } catch (err) {
    console.error("[security-events] new-device email failed", err);
  }
}

/** The account activity list, newest first. */
export function recentSecurityEvents(userId: string, take = 20) {
  return prisma.auditLog.findMany({
    where: { userId, action: { in: [...SECURITY_ACTIONS] } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
    },
  });
}
