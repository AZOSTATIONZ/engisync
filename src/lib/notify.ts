import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { sendPush } from "@/lib/push";

/**
 * THE notification dispatcher.
 *
 * Everything that wants to tell a user something comes through here, so that
 * the rules about what interrupts a person live in one file instead of being
 * re-decided at each call site.
 *
 * THE PROBLEM THIS SOLVES IS RESTRAINT, NOT DELIVERY. Delivery already worked:
 * `createNotification` wrote a row, sent an email and sent a push. What it
 * could not do was decline. There were two global email switches for the whole
 * product, so a student who muted "everything else" to stop task-completion
 * chatter also muted budget decisions, and a student who left it on got both.
 * The only reachable states were "too much" and "nothing", and a notification
 * system that people switch off entirely has failed at its actual job.
 *
 * THREE THINGS DECIDE WHAT HAPPENS
 *
 *   category — what it is about, and therefore whether the user asked for it
 *   priority — how much of their attention it may take
 *   quiet hours — when they have said not to interrupt
 *
 * The in-app row is written UNCONDITIONALLY, always. None of the above can
 * suppress it. The bell is the record of what happened, and a system where a
 * supervisor's rejection can be made invisible — with nothing to indicate
 * something was hidden — is worse than a noisy one.
 */

export type NotifyInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  link?: string;
  /** Defaults per category; override only for a specific reason. */
  priority?: NotificationPriority;
  /** Suppresses duplicates. Same key + same user = written once, ever. */
  dedupeKey?: string;
  /** Legacy bell grouping. Derived from the category when omitted. */
  type?: NotificationType;
  /**
   * The caller is sending its own, better email for this event — do not send
   * the generic one.
   *
   * Exists for exactly one situation: an alert where a purpose-written message
   * genuinely beats the template. `alertNewDevice` spells out the device, the
   * address, the time, and what to do about it; the generic "here is a
   * notification, open the app" version would be strictly worse AND arrive
   * alongside it, so the user would get two emails about one sign-in.
   *
   * The in-app row, the push, the dedupe and the delivery stamps all still go
   * through here. Only the outbound email is the caller's.
   */
  emailHandledByCaller?: boolean;
};

/**
 * What each category costs the user by default when they have expressed no
 * preference. Chosen so the defaults are defensible without being timid:
 * things with a deadline attached are worth an email, routine chatter is not.
 */
const CATEGORY_DEFAULTS: Record<
  NotificationCategory,
  { email: boolean; push: boolean; priority: NotificationPriority }
> = {
  DEADLINE: { email: true, push: true, priority: "NORMAL" },
  SUPERVISION: { email: true, push: true, priority: "NORMAL" },
  TEAM: { email: true, push: true, priority: "NORMAL" },
  MONEY: { email: true, push: true, priority: "NORMAL" },
  // The one most worth muting, and the only one that defaults to digest-only.
  ACTIVITY: { email: false, push: false, priority: "LOW" },
  SECURITY: { email: true, push: true, priority: "URGENT" },
};

/** Legacy `type` values, kept so the existing bell grouping still works. */
const TYPE_FOR_CATEGORY: Record<NotificationCategory, NotificationType> = {
  DEADLINE: "TASK_DUE",
  SUPERVISION: "WORKSPACE",
  TEAM: "WORKSPACE",
  MONEY: "WORKSPACE",
  ACTIVITY: "SYSTEM",
  SECURITY: "SYSTEM",
};

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  DEADLINE: "Deadlines and reminders",
  SUPERVISION: "Supervisor feedback",
  TEAM: "Team and assignments",
  MONEY: "Money and budget",
  ACTIVITY: "General activity",
  SECURITY: "Security alerts",
};

export const CATEGORY_HINTS: Record<NotificationCategory, string> = {
  DEADLINE: "Tasks due, milestones, meetings starting.",
  SUPERVISION: "Feedback, approvals and review outcomes from your supervisor.",
  TEAM: "Invitations, joins, and work assigned to you.",
  MONEY: "Contributions, expenses and budget decisions.",
  ACTIVITY: "Routine updates from your team. Safe to mute.",
  SECURITY: "Sign-ins and account changes. Always sent.",
};

/**
 * Is `date` inside this user's quiet window?
 *
 * THE WRAP IS THE WHOLE POINT. Quiet hours are almost always overnight — 22:00
 * to 07:00 — which means start > end, and the obvious `start <= h && h < end`
 * returns false for every hour of the night it was meant to cover. Written as
 * two comparisons joined by OR so the wrapping case is the one that reads
 * naturally rather than the one that is quietly broken.
 *
 * Exported for testing: this is pure, and it is the kind of logic that is
 * wrong in production for months because nobody is awake to notice.
 */
export function inQuietHours(
  date: Date,
  timezone: string,
  start: number | null | undefined,
  end: number | null | undefined,
): boolean {
  if (start == null || end == null) return false;
  if (start === end) return false; // A zero-length window, not a 24-hour one.

  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        hour12: false,
        timeZone: timezone,
      }).format(date),
    );
  } catch {
    // An invalid zone must not mean "silently never quiet" OR a thrown error
    // on the notification path. Fall back to UTC and carry on.
    hour = date.getUTCHours();
  }
  if (!Number.isFinite(hour)) return false;
  // `24` appears for midnight in some locale/format combinations.
  if (hour === 24) hour = 0;

  return start < end
    ? hour >= start && hour < end // e.g. 13→17, an afternoon window
    : hour >= start || hour < end; // e.g. 22→7, wrapping over midnight
}

/** Resolved delivery decision for one notification. */
type Plan = { email: boolean; push: boolean; deferEmail: boolean };

async function planDelivery(
  userId: string,
  category: NotificationCategory,
  priority: NotificationPriority,
  now: Date,
): Promise<Plan> {
  const defaults = CATEGORY_DEFAULTS[category];

  // SECURITY is not negotiable. A user who could mute sign-in alerts could be
  // locked out of noticing the compromise that muted them.
  if (category === "SECURITY") {
    return { email: true, push: true, deferEmail: false };
  }

  const [pref, user] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
      select: { email: true, push: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        timezone: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        essentialEmails: true,
      },
    }),
  ]);

  // No row means the user has never expressed a preference — use the default
  // rather than writing six rows per user at registration.
  const wantsEmail = pref?.email ?? defaults.email;
  const wantsPush = pref?.push ?? defaults.push;

  // The pre-existing master switch still applies. Someone who turned off
  // essential mail entirely has made a broader choice than any category.
  const emailAllowed = wantsEmail && (user?.essentialEmails ?? true);

  const quiet = inQuietHours(
    now,
    user?.timezone ?? "Africa/Harare",
    user?.quietHoursStart,
    user?.quietHoursEnd,
  );

  // LOW never earns its own email; it waits for the digest. NORMAL waits too,
  // but only while the user is asleep. URGENT goes now regardless — quiet
  // hours are about convenience, and the things marked urgent are worse to
  // learn late than to be woken by.
  const deferEmail =
    emailAllowed && (priority === "LOW" || (priority === "NORMAL" && quiet));

  return {
    email: emailAllowed && !deferEmail,
    push: wantsPush && priority !== "LOW",
    deferEmail,
  };
}

/**
 * Record and deliver one notification.
 *
 * Never throws. A feature that failed to announce itself must not also fail to
 * do the thing it was announcing — a budget entry that saved successfully and
 * then blew up sending a notification would be reported to the user as a
 * failure it was not.
 */
export async function notify(input: NotifyInput) {
  const now = new Date();
  const priority = input.priority ?? CATEGORY_DEFAULTS[input.category].priority;
  const type = input.type ?? TYPE_FOR_CATEGORY[input.category];

  try {
    /* Dedupe by letting the UNIQUE INDEX decide, not by reading first.
       A read-then-write lets two concurrent callers with the same key both
       observe an absent row and both send an email — precisely the duplicate
       the key exists to prevent. `createMany` with `skipDuplicates` collapses
       that to one winner, and `count === 0` tells the loser to stay quiet. */
    let notificationId: string;

    if (input.dedupeKey) {
      const { count } = await prisma.notification.createMany({
        data: [
          {
            userId: input.userId,
            type,
            category: input.category,
            priority,
            title: input.title,
            body: input.body,
            link: input.link,
            dedupeKey: input.dedupeKey,
          },
        ],
        skipDuplicates: true,
      });
      if (count === 0) return null; // Already sent. Silence is correct.

      // `createMany` returns a count, not rows, so fetch the id we just won.
      // Needed because delivery is stamped BY ID — matching on title and a
      // time window, as an earlier draft did, would stamp the wrong row for
      // anyone with two similar notifications in the same minute.
      const row = await prisma.notification.findUnique({
        where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } },
        select: { id: true },
      });
      if (!row) return null;
      notificationId = row.id;
    } else {
      const row = await prisma.notification.create({
        data: {
          userId: input.userId,
          type,
          category: input.category,
          priority,
          title: input.title,
          body: input.body,
          link: input.link,
        },
        select: { id: true },
      });
      notificationId = row.id;
    }

    const plan = await planDelivery(input.userId, input.category, priority, now);

    if (plan.push) {
      await sendPush(input.userId, {
        title: input.title,
        body: input.body,
        url: input.link ?? "/dashboard",
      }).catch(() => {});
    }

    if (plan.email && !input.emailHandledByCaller && isEmailConfigured()) {
      await sendOne(input, notificationId).catch((err) =>
        console.error("[notify] email failed", err),
      );
    }

    if (input.emailHandledByCaller) {
      // Mark delivered anyway. Without this the row still looks undelivered
      // and tomorrow's digest would repeat an alert the user already received
      // in a better form.
      await prisma.notification
        .update({ where: { id: notificationId }, data: { emailedAt: new Date() } })
        .catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("[notify] failed", input.category, input.title, err);
    return null;
  }
}

async function sendOne(input: NotifyInput, notificationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user?.email) return;

  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  const url = input.link ? `${base}${input.link}` : base;

  await sendEmail({
    to: user.email,
    subject: input.title,
    html: emailLayout(
      escapeHtml(input.title),
      // Escaped: these strings came from a user and never pass through
      // React, which is exactly why this is easy to forget.
      `<p>${escapeHtml(input.body ?? "")}</p>` +
        (url ? `<p><a href="${url}">Open in EngiSync</a></p>` : ""),
    ),
  });

  // Stamped only AFTER the send returns. A failure therefore leaves the row
  // with both timestamps null, which is exactly the state the digest sweep
  // looks for — so a bounced immediate email degrades into "it turns up in
  // tomorrow's digest" rather than vanishing.
  await prisma.notification.update({
    where: { id: notificationId },
    data: { emailedAt: new Date() },
  });
}
