import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDueSoonNotifications } from "@/lib/notifications";

/**
 * Scheduled reminders.
 *
 * WHY THIS EXISTS
 * Due-soon reminders previously ran only when someone opened their dashboard —
 * which means the person who never opens the app (exactly the person who needs
 * reminding) never got one. This endpoint runs on a schedule instead, so a
 * deadline alert reaches the phone whether or not EngiSync is open.
 *
 * Triggered by Vercel Cron (see vercel.json). Vercel signs cron requests with
 * CRON_SECRET; the check below means a stranger cannot hit this URL and spam
 * every user with notifications.
 *
 * SCHEDULE: 04:00 UTC daily = 06:00 in Zimbabwe (CAT, UTC+2), so the morning
 * digest lands before lectures. Daily rather than hourly because Vercel's
 * Hobby plan permits exactly one cron run per day — an hourly expression makes
 * the whole DEPLOYMENT fail validation, not just the cron. The 24-hour lookahead
 * below is matched to this cadence: one run catches everything due that day.
 *
 * If sub-daily reminders are needed later, either upgrade to Pro or point a
 * free external scheduler (e.g. cron-job.org) at this URL with the
 * `Authorization: Bearer $CRON_SECRET` header — the endpoint is agnostic
 * about who calls it.
 *
 * Deliberately bounded: only users with an upcoming or overdue task are
 * processed, and `createNotification` dedupes per task per day, so extra runs
 * cannot produce duplicate alerts.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Only people who actually have something due — no point waking everyone.
  const rows = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      assigneeId: { not: null },
      dueDate: { not: null, lte: horizon },
    },
    select: { assigneeId: true },
    distinct: ["assigneeId"],
    take: 500,
  });

  const userIds = rows
    .map((r) => r.assigneeId)
    .filter((id): id is string => Boolean(id));

  let processed = 0;
  for (const userId of userIds) {
    try {
      await generateDueSoonNotifications(userId);
      processed++;
    } catch (err) {
      // One user's failure must not stop the rest of the run.
      console.error("[cron/reminders] failed for user", userId, err);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: userIds.length,
    processed,
    at: now.toISOString(),
  });
}
