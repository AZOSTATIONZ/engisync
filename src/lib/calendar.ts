import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

export type CalendarItem = {
  id: string;
  kind: "task" | "event";
  title: string;
  date: string; // ISO
  time: string | null; // HH:MM or null (all-day)
  type: string; // priority for tasks, EventType for events
  href: string;
};

/** Local YYYY-MM-DD key for a date (used to bucket items into day cells). */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Gather tasks (by due date) and events for a given month,
 * for everything the user can see.
 */
export async function getMonthItems(
  userId: string,
  year: number,
  month: number, // 0-indexed
): Promise<CalendarItem[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const wsIds = await userWorkspaceIds(userId);

  const [tasks, events, meetings] = await Promise.all([
    prisma.task.findMany({
      where: {
        dueDate: { gte: start, lt: end },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { workspaceId: { in: wsIds } },
        ],
      },
      select: { id: true, title: true, dueDate: true, priority: true, status: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startAt: { gte: start, lt: end },
        OR: [{ creatorId: userId }, { workspaceId: { in: wsIds } }],
      },
      select: { id: true, title: true, startAt: true, allDay: true, type: true },
    }),
    prisma.meeting.findMany({
      where: {
        startAt: { gte: start, lt: end },
        workspaceId: { in: wsIds },
      },
      select: { id: true, title: true, startAt: true },
    }),
  ]);

  const items: CalendarItem[] = [];

  for (const t of tasks) {
    if (!t.dueDate) continue;
    items.push({
      id: t.id,
      kind: "task",
      title: t.title,
      date: t.dueDate.toISOString(),
      time: null,
      type: t.priority,
      href: "/dashboard/tasks",
    });
  }

  for (const e of events) {
    items.push({
      id: e.id,
      kind: "event",
      title: e.title,
      date: e.startAt.toISOString(),
      time: e.allDay
        ? null
        : `${String(e.startAt.getHours()).padStart(2, "0")}:${String(
            e.startAt.getMinutes(),
          ).padStart(2, "0")}`,
      type: e.type,
      href: "/dashboard/calendar",
    });
  }

  for (const mt of meetings) {
    items.push({
      id: mt.id,
      kind: "event",
      title: mt.title,
      date: mt.startAt.toISOString(),
      time: `${String(mt.startAt.getHours()).padStart(2, "0")}:${String(
        mt.startAt.getMinutes(),
      ).padStart(2, "0")}`,
      type: "MEETING",
      href: `/dashboard/meetings/${mt.id}`,
    });
  }

  return items;
}

/** The user's next upcoming deadline (task or event) from now. */
export async function getNextDeadline(userId: string) {
  const now = new Date();
  const wsIds = await userWorkspaceIds(userId);

  const [task, event, meeting] = await Promise.all([
    prisma.task.findFirst({
      where: {
        dueDate: { gte: now },
        status: { not: "DONE" },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { workspaceId: { in: wsIds } },
        ],
      },
      orderBy: { dueDate: "asc" },
      select: { title: true, dueDate: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        startAt: { gte: now },
        OR: [{ creatorId: userId }, { workspaceId: { in: wsIds } }],
      },
      orderBy: { startAt: "asc" },
      select: { title: true, startAt: true },
    }),
    prisma.meeting.findFirst({
      where: { startAt: { gte: now }, workspaceId: { in: wsIds } },
      orderBy: { startAt: "asc" },
      select: { title: true, startAt: true },
    }),
  ]);

  const candidates: { title: string; at: Date }[] = [];
  if (task?.dueDate) candidates.push({ title: task.title, at: task.dueDate });
  if (event?.startAt) candidates.push({ title: event.title, at: event.startAt });
  if (meeting?.startAt) candidates.push({ title: meeting.title, at: meeting.startAt });
  candidates.sort((a, b) => a.at.getTime() - b.at.getTime());

  return candidates[0] ?? null;
}
