import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

/** Local YYYY-MM-DD key. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type WorkspaceAnalytics = Awaited<ReturnType<typeof getWorkspaceAnalytics>>;

/**
 * Compute a full analytics snapshot for one group. All values are plain
 * serializable data ready to hand to client chart components.
 */
export async function getWorkspaceAnalytics(workspaceId: string, userId: string) {
  // Access check: user must be a member.
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) return null;

  const [workspace, tasks, members, meetings, filesCount] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        loggedMinutes: true,
        estimatedMinutes: true,
        createdAt: true,
        completedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.meeting.findMany({
      where: { workspaceId },
      select: { id: true, startAt: true, attendances: { select: { userId: true, status: true } } },
    }),
    prisma.fileResource.count({ where: { workspaceId } }),
  ]);
  if (!workspace) return null;

  const now = new Date();
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const overdue = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < now,
  ).length;
  const pending = total - done;
  const completionPct = total ? Math.round((done / total) * 100) : 0;

  // Status & priority breakdowns.
  const statusOrder = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
  const statusCounts = statusOrder.map((s) => ({
    name: s,
    value: tasks.filter((t) => t.status === s).length,
  }));
  const priorityOrder = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
  const priorityCounts = priorityOrder.map((p) => ({
    name: p,
    value: tasks.filter((t) => t.priority === p).length,
  }));

  // Per-member workload (open tasks) and hours logged.
  const memberStats = members.map((m) => {
    const assigned = tasks.filter((t) => t.assigneeId === m.userId);
    const openTasks = assigned.filter((t) => t.status !== "DONE").length;
    const completed = assigned.filter((t) => t.status === "DONE").length;
    const minutes = assigned.reduce((s, t) => s + t.loggedMinutes, 0);
    return {
      id: m.userId,
      name: m.user.name ?? m.user.email,
      openTasks,
      completed,
      hours: Math.round((minutes / 60) * 10) / 10,
    };
  });

  // Burndown + activity for the last 14 days.
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }
  const burndown = days.map((day) => {
    const dayEnd = new Date(`${day}T23:59:59`);
    // Tasks that existed by this day and were not yet completed.
    const remaining = tasks.filter(
      (t) =>
        t.createdAt <= dayEnd &&
        (!t.completedAt || t.completedAt > dayEnd),
    ).length;
    return { day: day.slice(5), remaining };
  });
  const activity = days.map((day) => ({
    day: day.slice(5),
    created: tasks.filter((t) => dayKey(t.createdAt) === day).length,
    completed: tasks.filter((t) => t.completedAt && dayKey(t.completedAt) === day)
      .length,
  }));

  // Attendance.
  const pastMeetings = meetings.filter((m) => m.startAt < now);
  const meetingsHeld = pastMeetings.length;
  let presentTotal = 0;
  for (const m of pastMeetings) {
    presentTotal += m.attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length;
  }
  const attendanceRate =
    meetingsHeld && members.length
      ? Math.round((presentTotal / (meetingsHeld * members.length)) * 100)
      : 0;

  // Upcoming deadlines (next 7 days).
  const weekAhead = new Date(now.getTime() + 7 * 86400000);
  const upcoming = tasks
    .filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate >= now && t.dueDate <= weekAhead)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      title: t.title,
      due: t.dueDate!.toISOString(),
      priority: t.priority,
    }));

  // Inactive members (no hours, no completed tasks) & most overloaded.
  const inactive = memberStats
    .filter((m) => m.hours === 0 && m.completed === 0)
    .map((m) => m.name);
  const overloaded = [...memberStats]
    .filter((m) => m.openTasks > 0)
    .sort((a, b) => b.openTasks - a.openTasks)
    .slice(0, 1)
    .map((m) => ({ name: m.name, openTasks: m.openTasks }));

  // Health/risk score (0–100; higher = healthier).
  const overdueRatio = total ? overdue / total : 0;
  let health = 100;
  health -= overdueRatio * 60;
  health -= (100 - completionPct) * 0.2;
  health -= inactive.length * 5;
  health = Math.max(0, Math.min(100, Math.round(health)));
  const risk = health >= 70 ? "Low" : health >= 40 ? "Medium" : "High";

  return {
    workspace: { id: workspace.id, name: workspace.name, department: workspace.department?.name ?? null },
    totals: {
      total,
      done,
      pending,
      overdue,
      completionPct,
      memberCount: members.length,
      meetingsHeld,
      attendanceRate,
      filesShared: filesCount,
      hoursLogged:
        Math.round(
          (tasks.reduce((s, t) => s + t.loggedMinutes, 0) / 60) * 10,
        ) / 10,
    },
    statusCounts,
    priorityCounts,
    memberStats,
    burndown,
    activity,
    upcoming,
    inactive,
    overloaded,
    health,
    risk,
  };
}

/** Lightweight per-group summaries for the analytics landing page. */
export async function listGroupSummaries(userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  const groups = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: {
      id: true,
      name: true,
      department: { select: { name: true } },
      tasks: { select: { status: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return groups.map((g) => {
    const total = g.tasks.length;
    const done = g.tasks.filter((t) => t.status === "DONE").length;
    return {
      id: g.id,
      name: g.name,
      department: g.department?.name ?? null,
      memberCount: g._count.members,
      total,
      completionPct: total ? Math.round((done / total) * 100) : 0,
    };
  });
}
