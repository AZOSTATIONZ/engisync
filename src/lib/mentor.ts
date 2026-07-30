import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { getWorkspaceAnalytics } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";

export type MentorAlert = { severity: "info" | "warn"; message: string };

/**
 * Deterministic project-mentor checks (no AI key required). Returns the current
 * alerts and notifies the group's leaders about them.
 */
export async function runMentorCheck(
  workspaceId: string,
  userId: string,
): Promise<MentorAlert[] | null> {
  if (!(await getMembership(workspaceId, userId))) return null;

  const [analytics, files, meetings, workspace, leaders] = await Promise.all([
    getWorkspaceAnalytics(workspaceId, userId),
    prisma.fileResource.findMany({
      where: { workspaceId },
      select: { name: true },
    }),
    prisma.meeting.findMany({
      where: { workspaceId },
      select: { startAt: true },
      orderBy: { startAt: "desc" },
      take: 1,
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        budgetTarget: true,
        tasks: { select: { title: true, description: true } },
        members: { where: { role: "LEADER" }, select: { userId: true } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId, role: "LEADER" },
      select: { userId: true },
    }),
  ]);
  if (!analytics || !workspace) return null;

  const alerts: MentorAlert[] = [];
  const text = workspace.tasks
    .map((t) => `${t.title} ${t.description ?? ""}`)
    .join(" ")
    .toLowerCase();
  const fileText = files.map((f) => f.name).join(" ").toLowerCase();

  if (!/test|verif|validat/.test(text)) {
    alerts.push({ severity: "warn", message: "Testing phase hasn't started — no testing tasks found." });
  }
  if (files.length === 0) {
    alerts.push({ severity: "warn", message: "No documentation or files have been uploaded yet." });
  }
  if (!/risk/.test(text)) {
    alerts.push({ severity: "warn", message: "Risk analysis is missing — add a risk task or document." });
  }
  const lastMeeting = meetings[0]?.startAt;
  const daysSince = lastMeeting
    ? Math.floor((Date.now() - lastMeeting.getTime()) / 86400000)
    : null;
  if (daysSince === null) {
    alerts.push({ severity: "info", message: "No meetings scheduled yet." });
  } else if (daysSince > 14) {
    alerts.push({ severity: "warn", message: `No meeting held in ${daysSince} days.` });
  }
  if (analytics.totals.overdue > 0) {
    alerts.push({
      severity: "warn",
      message: `${analytics.totals.overdue} task(s) are overdue — the project may be behind schedule.`,
    });
  }
  if (analytics.inactive.length > 0) {
    alerts.push({
      severity: "warn",
      message: `Inactive member(s): ${analytics.inactive.join(", ")}.`,
    });
  }
  if (!/simulat|proteus|matlab|cad|schematic/.test(fileText + text)) {
    alerts.push({ severity: "info", message: "No simulation/design files (Proteus, MATLAB, CAD) uploaded yet." });
  }

  // Notify each leader once per distinct alert (deduped so it doesn't spam).
  for (const l of leaders) {
    for (const a of alerts.filter((x) => x.severity === "warn")) {
      await createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title: "Project mentor alert",
        body: a.message,
        link: `/dashboard/projects/${workspaceId}/evaluation`,
        dedupeKey: `mentor:${workspaceId}:${a.message.slice(0, 40)}`,
      });
    }
  }

  return alerts;
}
