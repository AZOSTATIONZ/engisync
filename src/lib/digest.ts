import { NotificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { CATEGORY_LABELS } from "@/lib/notify";

/**
 * The daily digest: one email containing everything that was not worth
 * interrupting someone for.
 *
 * WHY A DIGEST AT ALL. Routine activity is genuinely useful in aggregate and
 * genuinely annoying one message at a time. "Six things happened on your
 * project yesterday" is worth reading; six separate emails saying a teammate
 * ticked off a task is how a student sets up a filter and stops seeing
 * EngiSync mail altogether — including the mail that mattered.
 *
 * WHAT IT PICKS UP. Anything with neither `emailedAt` nor `digestedAt` set:
 * LOW-priority notifications that never earned their own email, NORMAL ones
 * that arrived during quiet hours, and — importantly — anything whose
 * immediate send failed. That last case means a bounced email degrades to a
 * delayed one instead of disappearing.
 *
 * ONE RUN PER DAY. Vercel's Hobby plan allows exactly one cron execution per
 * day, so this rides along with the existing 04:00 UTC reminder sweep (06:00
 * in Zimbabwe). That is also the right cadence for a digest — see the note in
 * api/cron/reminders/route.ts.
 */

/** Cap per email. Beyond this, a digest stops being readable. */
const MAX_ITEMS = 40;

type DigestResult = { users: number; sent: number; items: number };

export async function sendDailyDigests(now: Date = new Date()): Promise<DigestResult> {
  if (!isEmailConfigured()) return { users: 0, sent: 0, items: 0 };

  // Everything undelivered, grouped by user in one query rather than a query
  // per user. At 41 users either works; at scale this is the difference
  // between one round trip and tens of thousands.
  const pending = await prisma.notification.findMany({
    where: { emailedAt: null, digestedAt: null },
    select: {
      id: true,
      userId: true,
      title: true,
      body: true,
      category: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });

  if (pending.length === 0) return { users: 0, sent: 0, items: 0 };

  const byUser = new Map<string, typeof pending>();
  for (const n of pending) {
    const list = byUser.get(n.userId) ?? [];
    list.push(n);
    byUser.set(n.userId, list);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, email: true, name: true, essentialEmails: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  let sent = 0;
  let items = 0;

  for (const [userId, list] of byUser) {
    const user = userById.get(userId);

    // No address, or they turned off essential mail. Mark the items handled
    // anyway: leaving them pending would mean re-examining the same rows on
    // every run forever, and the answer would never change.
    if (!user?.email || !user.essentialEmails) {
      await markDigested(list.map((n) => n.id), now);
      continue;
    }

    const shown = list.slice(0, MAX_ITEMS);
    const overflow = list.length - shown.length;

    try {
      await sendEmail({
        to: user.email,
        subject:
          list.length === 1
            ? list[0].title
            : `${list.length} updates from your projects`,
        html: emailLayout("Your EngiSync digest", renderBody(shown, overflow, base)),
      });
      // Only mark on success — a failure leaves them for tomorrow rather than
      // consuming them into an email that never arrived.
      await markDigested(list.map((n) => n.id), now);
      sent++;
      items += list.length;
    } catch (err) {
      console.error("[digest] send failed for user", userId, err);
    }
  }

  return { users: byUser.size, sent, items };
}

function markDigested(ids: string[], now: Date) {
  return prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { digestedAt: now },
  });
}

function renderBody(
  list: { title: string; body: string | null; category: NotificationCategory }[],
  overflow: number,
  base: string,
): string {
  // Grouped by category so the email has a shape, rather than being a flat
  // list in which a supervisor's feedback sits between two task updates.
  const groups = new Map<NotificationCategory, typeof list>();
  for (const n of list) {
    const g = groups.get(n.category) ?? [];
    g.push(n);
    groups.set(n.category, g);
  }

  const sections = [...groups.entries()]
    .map(([category, entries]) => {
      const rows = entries
        .map(
          (e) =>
            `<li style="margin-bottom:6px"><strong>${escapeHtml(e.title)}</strong>` +
            (e.body ? `<br/><span style="color:#555">${escapeHtml(e.body)}</span>` : "") +
            `</li>`,
        )
        .join("");
      return `<h3 style="margin:18px 0 6px">${CATEGORY_LABELS[category]}</h3><ul style="padding-left:18px;margin:0">${rows}</ul>`;
    })
    .join("");

  const more =
    overflow > 0
      ? `<p style="color:#555">…and ${overflow} more.</p>`
      : "";

  return (
    `<p>Here's what happened while you were away.</p>` +
    sections +
    more +
    (base ? `<p style="margin-top:20px"><a href="${base}/dashboard">Open EngiSync</a></p>` : "") +
    `<p style="color:#777;font-size:12px;margin-top:24px">You can choose which
      of these reach your inbox in Settings → Notifications.</p>`
  );
}

