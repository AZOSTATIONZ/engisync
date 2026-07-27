import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

/**
 * "What should I do right now?" — the data behind Home and My Work.
 *
 * The old dashboard answered "how many things exist?" with four counters.
 * Counters are not decisions. This module returns the specific, dated,
 * actionable items a person needs next, ordered by urgency.
 */

export type FocusTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  overdue: boolean;
};

export type FocusMeeting = {
  id: string;
  title: string;
  startAt: Date;
  projectId: string;
  projectName: string;
  meetingUrl: string | null;
};

export type ProjectSummary = {
  id: string;
  name: string;
  role: string;
  completionPct: number;
  openTasks: number;
  needsMe: number;
  nextDue: Date | null;
};

export type FocusData = {
  overdue: FocusTask[];
  dueToday: FocusTask[];
  upcoming: FocusTask[];
  meetingsToday: FocusMeeting[];
  nextMeeting: FocusMeeting | null;
  projects: ProjectSummary[];
};

function endOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Assigned-to-me tasks, split into overdue / today / upcoming, plus today's
 * meetings and a per-project rollup.
 */
export async function getFocus(userId: string, now: Date = new Date()): Promise<FocusData> {
  const wsIds = await userWorkspaceIds(userId);
  const todayEnd = endOfToday(now);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [myTasks, meetings, memberships, taskCounts] = await Promise.all([
    // Only tasks that are actually MINE. A dashboard that shows the whole
    // team's backlog cannot answer "what should I do".
    prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        assigneeId: userId,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        status: true,
        workspaceId: true,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 60,
    }),

    // `in: []` simply matches nothing, so there is no need to branch on
    // whether the user has projects — branching here would only produce a
    // union type for every consumer to unpick.
    prisma.meeting.findMany({
      where: { workspaceId: { in: wsIds }, startAt: { gte: now } },
      select: {
        id: true,
        title: true,
        startAt: true,
        meetingUrl: true,
        workspaceId: true,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { startAt: "asc" },
      take: 10,
    }),

    prisma.workspaceMember.findMany({
      where: { userId },
      select: {
        role: true,
        workspace: { select: { id: true, name: true } },
      },
    }),

    prisma.task.groupBy({
      by: ["workspaceId", "status"],
      where: { workspaceId: { in: wsIds } },
      _count: true,
    }),
  ]);

  const toFocusTask = (t: (typeof myTasks)[number]): FocusTask => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority as string,
    status: t.status as string,
    projectId: t.workspace?.id ?? null,
    projectName: t.workspace?.name ?? null,
    overdue: !!t.dueDate && t.dueDate < now,
  });

  const overdue: FocusTask[] = [];
  const dueToday: FocusTask[] = [];
  const upcoming: FocusTask[] = [];

  for (const t of myTasks) {
    const f = toFocusTask(t);
    if (!t.dueDate) {
      upcoming.push(f);
    } else if (t.dueDate < now) {
      overdue.push(f);
    } else if (t.dueDate <= todayEnd) {
      dueToday.push(f);
    } else if (t.dueDate <= weekAhead) {
      upcoming.push(f);
    }
  }

  const allMeetings: FocusMeeting[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    startAt: m.startAt,
    projectId: m.workspace.id,
    projectName: m.workspace.name,
    meetingUrl: m.meetingUrl,
  }));

  const meetingsToday = allMeetings.filter((m) => m.startAt <= todayEnd);

  // Per-project rollup.
  const openByProject = new Map<string, number>();
  const totalByProject = new Map<string, number>();
  for (const row of taskCounts) {
    if (!row.workspaceId) continue;
    totalByProject.set(
      row.workspaceId,
      (totalByProject.get(row.workspaceId) ?? 0) + row._count,
    );
    if (row.status !== "DONE") {
      openByProject.set(
        row.workspaceId,
        (openByProject.get(row.workspaceId) ?? 0) + row._count,
      );
    }
  }

  const myTasksByProject = new Map<string, FocusTask[]>();
  for (const t of myTasks) {
    if (!t.workspace?.id) continue;
    const list = myTasksByProject.get(t.workspace.id) ?? [];
    list.push(toFocusTask(t));
    myTasksByProject.set(t.workspace.id, list);
  }

  const projects: ProjectSummary[] = memberships.map((m) => {
    const id = m.workspace.id;
    const total = totalByProject.get(id) ?? 0;
    const open = openByProject.get(id) ?? 0;
    const mine = myTasksByProject.get(id) ?? [];
    const dated = mine
      .filter((t) => t.dueDate)
      .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());

    return {
      id,
      name: m.workspace.name,
      role: m.role as string,
      completionPct: total ? Math.round(((total - open) / total) * 100) : 0,
      openTasks: open,
      needsMe: mine.length,
      nextDue: dated[0]?.dueDate ?? null,
    };
  });

  // Projects that need me most come first.
  projects.sort((a, b) => b.needsMe - a.needsMe || a.name.localeCompare(b.name));

  return {
    overdue,
    dueToday,
    upcoming,
    meetingsToday,
    nextMeeting: allMeetings[0] ?? null,
    projects,
  };
}

/** "in 2 hours", "in 25 minutes", "tomorrow 09:00". */
export function untilLabel(date: Date, now: Date = new Date()): string {
  const mins = Math.round((date.getTime() - now.getTime()) / 60000);
  if (mins < 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Time-of-day greeting. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
