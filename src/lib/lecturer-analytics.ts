import { prisma } from "@/lib/prisma";
import { canSuperviseWorkspace } from "@/lib/supervisor";

export type ReportRange = "daily" | "weekly" | "monthly" | "semester" | "final";

export const RANGE_LABELS: Record<ReportRange, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
  semester: "This semester",
  final: "Final project summary",
};

/** Convert a range preset into a "since" date (null = all time). */
function rangeSince(range: ReportRange): Date | null {
  const now = Date.now();
  const day = 86400000;
  switch (range) {
    case "daily":
      return new Date(now - day);
    case "weekly":
      return new Date(now - 7 * day);
    case "monthly":
      return new Date(now - 30 * day);
    case "semester":
      return new Date(now - 120 * day);
    case "final":
      return null;
  }
}

function healthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "At risk";
  return "Critical";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type IndividualStat = {
  userId: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  attendancePct: number;
  productivityScore: number;
  filesUploaded: number;
  commentsMade: number;
  meetingsAttended: number;
  avgCompletionDays: number | null;
  contributionPct: number;
};

export type ProjectReport = {
  workspaceId: string;
  workspaceName: string;
  department: string | null;
  range: ReportRange;
  rangeLabel: string;
  generatedAt: string;
  overall: {
    overallScore: number;
    progressPct: number;
    completionPct: number;
    projectHealth: string;
    riskLevel: string;
    budgetHealth: string;
    documentationScore: number;
    engineeringQuality: number;
    innovationScore: number;
  };
  team: {
    memberCount: number;
    attendancePct: number;
    participationPct: number;
    tasksCompleted: number;
    missedDeadlines: number;
    lateTasks: number;
    productivityPct: number;
    timeSpentHours: number;
    meetingAttendancePct: number;
    workload: { name: string; tasks: number }[];
    ranking: { name: string; score: number }[];
  };
  individuals: IndividualStat[];
};

/** Compute a full lecturer report for a project. Supervisor-guarded. */
export async function generateProjectReport(
  workspaceId: string,
  userId: string,
  range: ReportRange,
): Promise<ProjectReport | null> {
  if (!(await canSuperviseWorkspace(workspaceId, userId))) return null;

  const since = rangeSince(range);
  const now = new Date();

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      budgetTarget: true,
      department: { select: { name: true } },
      members: {
        select: { userId: true, user: { select: { name: true, email: true } } },
      },
      tasks: {
        select: {
          assigneeId: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          loggedMinutes: true,
        },
      },
      milestones: { select: { done: true } },
      risks: { select: { severity: true } },
      meetings: { select: { id: true, startAt: true } },
      document: { select: { sections: { select: { status: true } } } },
    },
  });
  if (!ws) return null;

  const memberIds = ws.members.map((m) => m.userId);
  const nameOf = new Map(
    ws.members.map((m) => [m.userId, m.user.name ?? m.user.email]),
  );

  // Parallel supporting queries.
  const meetingIds = ws.meetings.map((m) => m.id);
  const [attendance, files, contributions, expenses, comments, timeLogs] =
    await Promise.all([
      meetingIds.length
        ? prisma.attendance.findMany({
            where: { meetingId: { in: meetingIds } },
            select: { userId: true, status: true },
          })
        : Promise.resolve([]),
      prisma.fileResource.findMany({
        where: { workspaceId },
        select: { uploaderId: true },
      }),
      prisma.contribution.findMany({
        where: { workspaceId },
        select: { userId: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { workspaceId },
        select: { amount: true },
      }),
      prisma.sectionComment.findMany({
        where: { section: { document: { workspaceId } } },
        select: { authorId: true },
      }),
      prisma.timeLog.findMany({
        where: { task: { workspaceId }, ...(since ? { createdAt: { gte: since } } : {}) },
        select: { userId: true, minutes: true },
      }),
    ]);

  // ── Cumulative project metrics ──
  const totalTasks = ws.tasks.length;
  const doneTasks = ws.tasks.filter((t) => t.status === "DONE").length;
  const progressPct = totalTasks ? clamp((doneTasks / totalTasks) * 100) : 0;
  const totalMilestones = ws.milestones.length;
  const doneMilestones = ws.milestones.filter((m) => m.done).length;
  const completionPct = totalMilestones
    ? clamp((doneMilestones / totalMilestones) * 100)
    : progressPct;

  const sections = ws.document?.sections ?? [];
  const approvedSections = sections.filter((s) => s.status === "APPROVED").length;
  const documentationScore = sections.length
    ? clamp((approvedSections / sections.length) * 100)
    : 0;

  const overdue = ws.tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < now,
  ).length;
  const lateTasks = ws.tasks.filter(
    (t) => t.completedAt && t.dueDate && t.completedAt > t.dueDate,
  ).length;
  const onTimeRate = doneTasks ? (doneTasks - lateTasks) / doneTasks : 1;

  const highRisks = ws.risks.filter((r) => r.severity === "HIGH").length;
  const riskLevel =
    highRisks >= 2 || overdue >= 5 ? "High" : highRisks >= 1 || overdue >= 2 ? "Medium" : "Low";

  const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const target = ws.budgetTarget ? Number(ws.budgetTarget) : 0;
  const budgetHealth =
    totalExpense > totalContrib + 0.001
      ? "Over budget"
      : target && totalContrib < target * 0.5
        ? "Underfunded"
        : "Healthy";

  const engineeringQuality = clamp(
    completionPct * 0.4 + documentationScore * 0.3 + onTimeRate * 100 * 0.3,
  );
  const innovationScore = clamp(
    documentationScore * 0.5 + (sections.length ? 20 : 0) + doneMilestones * 5,
  );
  const overallScore = clamp(
    progressPct * 0.3 +
      documentationScore * 0.25 +
      onTimeRate * 100 * 0.2 +
      (budgetHealth === "Healthy" ? 15 : budgetHealth === "Underfunded" ? 8 : 0) +
      (riskLevel === "Low" ? 10 : riskLevel === "Medium" ? 5 : 0),
  );

  // ── Per-member aggregation ──
  const presentByUser = new Map<string, number>();
  for (const a of attendance) {
    if (a.status === "PRESENT" || a.status === "LATE") {
      presentByUser.set(a.userId, (presentByUser.get(a.userId) ?? 0) + 1);
    }
  }
  const filesByUser = new Map<string, number>();
  for (const f of files) filesByUser.set(f.uploaderId, (filesByUser.get(f.uploaderId) ?? 0) + 1);
  const commentsByUser = new Map<string, number>();
  for (const c of comments) commentsByUser.set(c.authorId, (commentsByUser.get(c.authorId) ?? 0) + 1);
  const minutesByUser = new Map<string, number>();
  for (const l of timeLogs) minutesByUser.set(l.userId, (minutesByUser.get(l.userId) ?? 0) + l.minutes);

  const totalMeetings = ws.meetings.length;

  const individuals: IndividualStat[] = memberIds.map((uid) => {
    const mine = ws.tasks.filter((t) => t.assigneeId === uid);
    const inRange = mine.filter(
      (t) => t.status === "DONE" && t.completedAt && (!since || t.completedAt >= since),
    );
    const completed = mine.filter((t) => t.status === "DONE");
    const attended = presentByUser.get(uid) ?? 0;
    const attendancePct = totalMeetings ? clamp((attended / totalMeetings) * 100) : 0;
    const onTime = completed.filter((t) => !(t.completedAt && t.dueDate && t.completedAt > t.dueDate)).length;
    const memberOnTimeRate = completed.length ? onTime / completed.length : 1;
    const completionTimes = completed
      .filter((t) => t.completedAt)
      .map((t) => (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000);
    const avgCompletionDays = completionTimes.length
      ? Math.round((completionTimes.reduce((s, d) => s + d, 0) / completionTimes.length) * 10) / 10
      : null;
    const productivityScore = clamp(
      Math.min(completed.length, 10) * 4 + memberOnTimeRate * 30 + attendancePct * 0.3,
    );
    return {
      userId: uid,
      name: nameOf.get(uid) ?? "Member",
      tasksAssigned: mine.length,
      tasksCompleted: inRange.length,
      attendancePct,
      productivityScore,
      filesUploaded: filesByUser.get(uid) ?? 0,
      commentsMade: commentsByUser.get(uid) ?? 0,
      meetingsAttended: attended,
      avgCompletionDays,
      contributionPct: 0, // filled below
    };
  });

  // Contribution % = share of a composite effort weight.
  const weightOf = (s: IndividualStat) =>
    s.tasksCompleted * 3 +
    (minutesByUser.get(s.userId) ?? 0) / 60 +
    s.filesUploaded * 2 +
    s.meetingsAttended +
    s.commentsMade;
  const totalWeight = individuals.reduce((sum, s) => sum + weightOf(s), 0) || 1;
  for (const s of individuals) {
    s.contributionPct = Math.round((weightOf(s) / totalWeight) * 100);
  }

  // ── Team rollups ──
  const tasksCompletedInRange = ws.tasks.filter(
    (t) => t.status === "DONE" && t.completedAt && (!since || t.completedAt >= since),
  ).length;
  const timeSpentHours =
    Math.round((timeLogs.reduce((s, l) => s + l.minutes, 0) / 60) * 10) / 10;
  const activeMembers = individuals.filter(
    (s) => s.tasksCompleted > 0 || s.meetingsAttended > 0 || s.filesUploaded > 0,
  ).length;
  const participationPct = memberIds.length
    ? clamp((activeMembers / memberIds.length) * 100)
    : 0;
  const attendancePctTeam =
    totalMeetings && memberIds.length
      ? clamp((attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length /
          (totalMeetings * memberIds.length)) * 100)
      : 0;

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    department: ws.department?.name ?? null,
    range,
    rangeLabel: RANGE_LABELS[range],
    generatedAt: new Date().toISOString(),
    overall: {
      overallScore,
      progressPct,
      completionPct,
      projectHealth: healthLabel(overallScore),
      riskLevel,
      budgetHealth,
      documentationScore,
      engineeringQuality,
      innovationScore,
    },
    team: {
      memberCount: memberIds.length,
      attendancePct: attendancePctTeam,
      participationPct,
      tasksCompleted: tasksCompletedInRange,
      missedDeadlines: overdue,
      lateTasks,
      productivityPct: clamp(
        individuals.reduce((s, x) => s + x.productivityScore, 0) /
          (individuals.length || 1),
      ),
      timeSpentHours,
      meetingAttendancePct: attendancePctTeam,
      workload: individuals.map((s) => ({ name: s.name, tasks: s.tasksAssigned })),
      ranking: [...individuals]
        .sort((a, b) => b.contributionPct - a.contributionPct)
        .map((s) => ({ name: s.name, score: s.contributionPct })),
    },
    individuals,
  };
}
