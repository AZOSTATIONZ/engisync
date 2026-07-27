"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorize, getContext } from "@/lib/policy";
import { recordActivity } from "@/lib/activity-log";
import { createNotification } from "@/lib/notifications";
import { displayName } from "@/lib/identity";

/**
 * Professional withdrawal from a group.
 *
 * "Group members disappearing" is one of the most-reported problems in student
 * projects. The fix is not a bigger Leave button — it is making departure a
 * visible, accountable process:
 *
 *   request (with reason) → open-task check → leader decision
 *     → supervisor confirmation (when the group belongs to a department)
 *     → membership removed, record kept.
 *
 * The request record deliberately survives the departure. Who left, when, and
 * why is exactly what a supervisor needs when grading individual contribution.
 */

export type WithdrawalState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function actorName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return displayName(u);
}

function rev(workspaceId: string) {
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath(`/dashboard/supervisor/${workspaceId}`);
}

/**
 * What still ties this member to the group?
 * Checked at request time (friendly feedback) AND at every approval
 * (the actual guarantee — tasks may have been assigned in between).
 */
async function getBlockers(workspaceId: string, userId: string) {
  const [openTasks, membership, otherLeaders] = await Promise.all([
    prisma.task.count({
      where: { workspaceId, assigneeId: userId, status: { not: "DONE" } },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    }),
    prisma.workspaceMember.count({
      where: { workspaceId, role: "LEADER", NOT: { userId } },
    }),
  ]);

  const blockers: string[] = [];
  if (!membership) blockers.push("You are not a member of this group.");
  if (openTasks > 0) {
    blockers.push(
      `${openTasks} open task${openTasks === 1 ? "" : "s"} still assigned to you — complete them or ask the leader to reassign them first.`,
    );
  }
  if (membership?.role === "LEADER" && otherLeaders === 0) {
    blockers.push(
      "You are the only leader. Promote another member to leader before withdrawing.",
    );
  }
  return blockers;
}

export async function requestWithdrawal(
  workspaceId: string,
  _prev: WithdrawalState,
  formData: FormData,
): Promise<WithdrawalState> {
  const userId = await requireUserId();

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    return { error: "Explain why you're leaving (at least a sentence)." };
  }

  const existing = await prisma.withdrawalRequest.findFirst({
    where: {
      workspaceId,
      userId,
      status: { in: ["PENDING", "LEADER_APPROVED"] },
    },
    select: { id: true },
  });
  if (existing) return { error: "You already have a withdrawal request open." };

  const blockers = await getBlockers(workspaceId, userId);
  if (blockers.length > 0) return { error: blockers[0] };

  await prisma.withdrawalRequest.create({
    data: { workspaceId, userId, reason },
  });

  const name = await actorName(userId);
  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: "LEADER" },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title: "Withdrawal request",
        body: `${name} has asked to leave the group.`,
        link: `/dashboard/workspaces/${workspaceId}`,
      }),
    ),
  );

  rev(workspaceId);
  return {
    success: "Request submitted. Your leader will review it — you remain a member until it's approved.",
  };
}

export async function cancelWithdrawal(requestId: string): Promise<WithdrawalState> {
  const userId = await requireUserId();
  const req = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, workspaceId: true, status: true },
  });
  if (!req || req.userId !== userId) return { error: "Request not found." };
  if (req.status !== "PENDING" && req.status !== "LEADER_APPROVED") {
    return { error: "This request has already been decided." };
  }

  await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  rev(req.workspaceId);
  return { success: "Withdrawal cancelled — you're staying." };
}

/** Shared completion: remove membership, keep the record. */
async function completeWithdrawal(
  requestId: string,
  workspaceId: string,
  memberId: string,
  decidedById: string,
) {
  const name = await actorName(memberId);

  await prisma.$transaction([
    prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", decidedById, decidedAt: new Date() },
    }),
    prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: memberId },
    }),
  ]);

  await recordActivity({
    workspaceId,
    actorId: memberId,
    kind: "MEMBER",
    action: "withdrew from the group",
    subject: name,
  });
  await createNotification({
    userId: memberId,
    type: NotificationType.WORKSPACE,
    title: "Withdrawal approved",
    body: "You have been removed from the group.",
    link: "/dashboard/workspaces",
  });
}

/**
 * Leader decision. If the group belongs to a department with supervisors, an
 * approval moves the request to LEADER_APPROVED and waits for supervisor
 * confirmation; otherwise the leader's approval completes it.
 */
export async function leaderDecideWithdrawal(
  requestId: string,
  approve: boolean,
  note: string,
): Promise<WithdrawalState> {
  const userId = await requireUserId();

  const req = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      status: true,
      workspace: { select: { departmentId: true } },
    },
  });
  if (!req) return { error: "Request not found." };
  if (req.status !== "PENDING") return { error: "Already decided." };

  const authz = await authorize(req.workspaceId, userId, "joinRequest.decide");
  if (!authz.ok) return { error: authz.error };

  if (!approve) {
    const reason = note.trim();
    if (!reason) return { error: "Give a reason the member will see." };
    await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        leaderNote: reason,
        decidedById: userId,
        decidedAt: new Date(),
      },
    });
    await createNotification({
      userId: req.userId,
      type: NotificationType.WORKSPACE,
      title: "Withdrawal declined",
      body: reason,
      link: `/dashboard/workspaces/${req.workspaceId}`,
    });
    rev(req.workspaceId);
    return { success: "Request declined." };
  }

  // Re-check blockers at decision time — tasks may have been assigned since.
  const blockers = await getBlockers(req.workspaceId, req.userId);
  const realBlockers = blockers.filter((b) => !b.startsWith("You are not"));
  if (realBlockers.length > 0) {
    return { error: `Can't approve yet: ${realBlockers[0]}` };
  }

  // Does a supervisor need to confirm?
  const supervisors = req.workspace.departmentId
    ? await prisma.departmentMember.findMany({
        where: {
          departmentId: req.workspace.departmentId,
          role: { in: ["SUPERVISOR", "ADMIN"] },
        },
        select: { userId: true },
      })
    : [];

  if (supervisors.length === 0) {
    await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { leaderNote: note.trim() || null },
    });
    await completeWithdrawal(requestId, req.workspaceId, req.userId, userId);
    rev(req.workspaceId);
    return { success: "Approved — the member has been removed." };
  }

  await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: { status: "LEADER_APPROVED", leaderNote: note.trim() || null },
  });
  await Promise.all(
    supervisors.map((s) =>
      createNotification({
        userId: s.userId,
        type: NotificationType.WORKSPACE,
        title: "Withdrawal awaiting your confirmation",
        body: "A group member's withdrawal has been approved by their leader.",
        link: `/dashboard/supervisor/${req.workspaceId}`,
      }),
    ),
  );
  rev(req.workspaceId);
  return { success: "Approved — waiting for supervisor confirmation." };
}

/** Supervisor's final confirmation (or veto). */
export async function supervisorConfirmWithdrawal(
  requestId: string,
  approve: boolean,
  note: string,
): Promise<WithdrawalState> {
  const userId = await requireUserId();

  const req = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    select: { id: true, workspaceId: true, userId: true, status: true },
  });
  if (!req) return { error: "Request not found." };
  if (req.status !== "LEADER_APPROVED") {
    return { error: "This request isn't waiting for supervisor confirmation." };
  }

  // Supervisor standing is what authorises this — reusing the publication
  // carve-out keeps it in the policy layer rather than ad-hoc checks.
  const ctx = await getContext(req.workspaceId, userId);
  if (!ctx.isSupervisor && !ctx.isSystemAdmin) {
    return { error: "Only a supervisor of this department can confirm." };
  }

  if (!approve) {
    const reason = note.trim();
    if (!reason) return { error: "Give a reason." };
    await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        supervisorNote: reason,
        decidedById: userId,
        decidedAt: new Date(),
      },
    });
    await createNotification({
      userId: req.userId,
      type: NotificationType.WORKSPACE,
      title: "Withdrawal declined by supervisor",
      body: reason,
      link: `/dashboard/workspaces/${req.workspaceId}`,
    });
    rev(req.workspaceId);
    return { success: "Declined." };
  }

  await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: { supervisorNote: note.trim() || null },
  });
  await completeWithdrawal(requestId, req.workspaceId, req.userId, userId);
  rev(req.workspaceId);
  return { success: "Confirmed — the member has been removed." };
}
