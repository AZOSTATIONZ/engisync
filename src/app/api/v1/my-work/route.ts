import { getFocus } from "@/lib/focus";
import { ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/my-work
 *
 * Everything assigned to the caller: overdue, due today, upcoming, today's
 * meetings and a per-project rollup. The mobile home screen is one call.
 *
 * NOTE THE SHAPE OF THIS FILE — it is the pattern every route should follow.
 * There is no query here, no permission rule and no business logic. It calls
 * `getFocus`, the exact function the web dashboard calls, and serialises the
 * result. That is the whole point: mobile and web cannot drift, because there
 * is only one implementation to drift from.
 *
 * Dates are converted to ISO strings explicitly rather than left to
 * JSON.stringify. The automatic conversion produces the same text today, but
 * it is incidental rather than contractual — making it explicit means the
 * contract is visible in the code and a future change to a Date field cannot
 * silently alter the wire format.
 */
export async function GET() {
  return withUser({ limitKey: "my-work", limit: 60 }, async (userId) => {
    const focus = await getFocus(userId);

    const task = (t: (typeof focus.overdue)[number]) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      overdue: t.overdue,
      projectId: t.projectId,
      projectName: t.projectName,
    });

    const meeting = (m: (typeof focus.meetingsToday)[number]) => ({
      id: m.id,
      title: m.title,
      startAt: m.startAt.toISOString(),
      projectId: m.projectId,
      projectName: m.projectName,
      meetingUrl: m.meetingUrl,
    });

    return ok({
      overdue: focus.overdue.map(task),
      dueToday: focus.dueToday.map(task),
      upcoming: focus.upcoming.map(task),
      meetingsToday: focus.meetingsToday.map(meeting),
      nextMeeting: focus.nextMeeting ? meeting(focus.nextMeeting) : null,
      projects: focus.projects.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        stage: p.stage,
        completionPct: p.completionPct,
        // The denominator travels with the ratio, for the same reason it does
        // in the web UI: "100% done" off one task is true and misleading.
        totalTasks: p.totalTasks,
        doneTasks: p.doneTasks,
        openTasks: p.openTasks,
        needsMe: p.needsMe,
        nextDue: p.nextDue ? p.nextDue.toISOString() : null,
      })),
      // Lets a client show "as of 14:32" and decide whether to refetch,
      // instead of guessing how stale its copy is.
      generatedAt: new Date().toISOString(),
    });
  });
}
