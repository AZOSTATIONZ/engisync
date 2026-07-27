"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { WorkspaceRole, NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/utils";
import {
  getMembership,
  isWorkspaceLeader,
  getExistingGroupsInfo,
} from "@/lib/workspace";
import { createNotification } from "@/lib/notifications";
import { authorize } from "@/lib/policy";
import { recordActivity } from "@/lib/activity-log";
import { sendEmail, emailLayout, isEmailConfigured } from "@/lib/email";
import { getBaseUrl } from "@/lib/qr";
import { getTemplate } from "@/lib/templates";
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; success?: string } | null;

export type DuplicateGroup = {
  id: string;
  name: string;
  department: string | null;
  role: string;
  joinedAt: string;
  status: string;
};

export type CreateWorkspaceState =
  | { error?: string; success?: string; duplicates?: DuplicateGroup[] }
  | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/** Generate a join code guaranteed unique in the DB. */
async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode(8);
    const existing = await prisma.workspace.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  return generateJoinCode(10);
}

export async function createWorkspace(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const userId = await requireUserId();

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    pin: formData.get("pin"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, description, pin, departmentId } = parsed.data;
  const intent = String(formData.get("intent") ?? "");

  // The group must be created within a department the user belongs to.
  const membership = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId, userId } },
  });
  if (!membership) {
    return { error: "Join that department before creating a group in it." };
  }

  // Duplicate-membership handling.
  if (intent === "notify") {
    const admins = await prisma.departmentMember.findMany({
      where: { departmentId, role: "ADMIN" },
      select: { userId: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.userId,
          type: NotificationType.WORKSPACE,
          title: "Multiple-project notice",
          body: "A student is joining an additional project group and notified you.",
          link: `/dashboard/departments`,
        }),
      ),
    );
    return { success: "Your department supervisor has been notified." };
  }

  if (intent !== "continue") {
    // First submit: warn if the student is already in group(s).
    const existing = await getExistingGroupsInfo(userId);
    if (existing.length > 0) {
      return { duplicates: existing };
    }
  }

  const joinCode = await uniqueJoinCode();
  const pinHash = pin ? await bcrypt.hash(pin, 12) : null;

  // Optional starter template seeds objectives, scope, milestones, deliverables.
  const template = getTemplate(String(formData.get("template") ?? ""));

  const workspace = await prisma.workspace.create({
    data: {
      name,
      description: description || null,
      objectives: template?.objectives || null,
      scope: template?.scope || null,
      joinCode,
      pinHash,
      departmentId,
      leaderId: userId,
      members: { create: { userId, role: WorkspaceRole.LEADER } },
      ...(template && template.milestones.length
        ? {
            milestones: {
              create: template.milestones.map((m, i) => ({
                title: m.title,
                order: i,
                dueDate: new Date(Date.now() + m.offsetDays * 86400000),
              })),
            },
          }
        : {}),
      ...(template && template.deliverables.length
        ? {
            deliverables: {
              create: template.deliverables.map((title) => ({ title })),
            },
          }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_CREATED", target: workspace.id },
  });

  revalidatePath("/dashboard/workspaces");
  redirect(`/dashboard/workspaces/${workspace.id}`);
}

export async function joinWorkspace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = joinWorkspaceSchema.safeParse({
    joinCode: formData.get("joinCode"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { joinCode, pin } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { joinCode } });
  if (!workspace) {
    return { error: "No workspace found with that join code." };
  }

  const already = await getMembership(workspace.id, userId);
  if (already) {
    redirect(`/dashboard/workspaces/${workspace.id}`);
  }

  if (workspace.pinHash) {
    const ok = pin ? await bcrypt.compare(pin, workspace.pinHash) : false;
    if (!ok) return { error: "Incorrect or missing PIN for this workspace." };
  }

  // Enforce member cap.
  const count = await prisma.workspaceMember.count({
    where: { workspaceId: workspace.id },
  });
  if (workspace.maxMembers !== null && count >= workspace.maxMembers) {
    return { error: "This group has reached its member limit." };
  }

  // Approval mode: create a pending request instead of joining directly.
  if (workspace.requireApproval) {
    const existing = await prisma.joinRequest.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    if (existing?.status === "PENDING") {
      return { success: "Your join request is already pending approval." };
    }
    await prisma.joinRequest.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      create: { workspaceId: workspace.id, userId, status: "PENDING" },
      update: { status: "PENDING" },
    });
    await createNotification({
      userId: workspace.leaderId,
      type: NotificationType.WORKSPACE,
      title: "New join request",
      body: `Someone requested to join "${workspace.name}".`,
      link: `/dashboard/workspaces/${workspace.id}`,
    });
    return { success: "Request sent. The group leader will review it." };
  }

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId, role: WorkspaceRole.MEMBER },
  });
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_JOINED", target: workspace.id },
  });

  revalidatePath("/dashboard/workspaces");
  redirect(`/dashboard/workspaces/${workspace.id}`);
}

export async function regenerateJoinCode(
  workspaceId: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can regenerate the join code." };
  }

  const joinCode = await uniqueJoinCode();
  await prisma.workspace.update({ where: { id: workspaceId }, data: { joinCode } });
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_CODE_REGENERATED", target: workspaceId },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Join code regenerated." };
}

export async function removeMember(
  workspaceId: string,
  memberUserId: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can remove members." };
  }
  if (memberUserId === userId) {
    return { error: "The leader cannot remove themselves. Delete the workspace instead." };
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
  });
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_MEMBER_REMOVED", target: workspaceId, metadata: { memberUserId } },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Member removed." };
}

export async function leaveWorkspace(workspaceId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const membership = await getMembership(workspaceId, userId);
  if (!membership) return { error: "You are not a member of this workspace." };
  if (membership.role === WorkspaceRole.LEADER) {
    return { error: "The leader cannot leave. Delete the workspace instead." };
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_LEFT", target: workspaceId },
  });

  revalidatePath("/dashboard/workspaces");
  redirect("/dashboard/workspaces");
}

// ── Leader coordination tools ──

/** Set a member's responsibility label (e.g. "Design lead"). */
export async function setMemberTitle(
  workspaceId: string,
  memberUserId: string,
  title: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only a group leader can set member roles." };
  }
  const clean = title.trim().slice(0, 60);
  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    data: { title: clean || null },
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Role updated." };
}

/** Promote a member to co-leader. */
/**
 * Grant or revoke a delegated capability.
 *
 * This is the mechanism behind "assistant leader": rather than inventing a
 * role tier, a leader hands a member one specific power. Only a leader may do
 * this — otherwise a member holding `canInvite` could grant themselves
 * `canApprove`, which is privilege escalation.
 */
export async function setMemberCapability(
  workspaceId: string,
  memberUserId: string,
  capability: "canApprove" | "canManageBudget" | "canInvite",
  value: boolean,
): Promise<ActionState> {
  const userId = await requireUserId();

  const authz = await authorize(workspaceId, userId, "member.capability.set");
  if (!authz.ok) return { error: authz.error };

  const allowed = ["canApprove", "canManageBudget", "canInvite"] as const;
  if (!(allowed as readonly string[]).includes(capability)) {
    return { error: "Unknown permission." };
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    select: { role: true },
  });
  if (!target) return { error: "That person isn't in this group." };
  if (target.role === "LEADER") {
    return { error: "Leaders already have every permission." };
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    data: { [capability]: value },
  });

  const LABEL: Record<typeof capability, string> = {
    canApprove: "approve work",
    canManageBudget: "manage the budget",
    canInvite: "invite members",
  };

  await createNotification({
    userId: memberUserId,
    type: NotificationType.WORKSPACE,
    title: value ? "New permission granted" : "Permission removed",
    body: value
      ? `You can now ${LABEL[capability]} in this group.`
      : `You can no longer ${LABEL[capability]} in this group.`,
    link: `/dashboard/workspaces/${workspaceId}`,
  });

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "MEMBER",
    action: value ? "granted permission to" : "removed permission from",
    subject: LABEL[capability],
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: value ? "Permission granted." : "Permission removed." };
}

export async function promoteToLeader(
  workspaceId: string,
  memberUserId: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only a group leader can promote members." };
  }
  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    data: { role: WorkspaceRole.LEADER },
  });
  await createNotification({
    userId: memberUserId,
    type: NotificationType.WORKSPACE,
    title: "You're now a co-leader",
    body: "You can now help coordinate this group.",
    link: `/dashboard/workspaces/${workspaceId}`,
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Member promoted to co-leader." };
}

/** Demote a co-leader back to member (the original owner can't be demoted). */
export async function demoteToMember(
  workspaceId: string,
  memberUserId: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only a group leader can change roles." };
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { leaderId: true },
  });
  if (workspace?.leaderId === memberUserId) {
    return { error: "The group owner can't be demoted." };
  }
  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    data: { role: WorkspaceRole.MEMBER },
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Co-leader demoted to member." };
}

/** Send a member a reminder/nudge notification. */
export async function nudgeMember(
  workspaceId: string,
  memberUserId: string,
  message: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only a group leader can nudge members." };
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  await createNotification({
    userId: memberUserId,
    type: NotificationType.WORKSPACE,
    title: `Reminder from your group leader`,
    body: message.trim().slice(0, 200) || `Please check in on "${workspace?.name}".`,
    link: `/dashboard/workspaces/${workspaceId}`,
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Reminder sent." };
}

export async function deleteWorkspace(workspaceId: string): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can delete the workspace." };
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_DELETED", target: workspaceId },
  });

  revalidatePath("/dashboard/workspaces");
  redirect("/dashboard/workspaces");
}

// ── Secure access: settings, requests, invites ──

export async function updateGroupAccess(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can change access settings." };
  }

  const rawMax = String(formData.get("maxMembers") ?? "").trim();
  const requireApproval = formData.get("requireApproval") === "on";

  let maxMembers: number | null = null;
  if (rawMax) {
    const n = parseInt(rawMax, 10);
    if (Number.isNaN(n) || n < 1) return { error: "Max members must be a positive number." };
    const current = await prisma.workspaceMember.count({ where: { workspaceId } });
    if (n < current) return { error: `There are already ${current} members; set a higher cap.` };
    maxMembers = n;
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { maxMembers, requireApproval },
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Access settings updated." };
}

export async function approveJoinRequest(requestId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const req = await prisma.joinRequest.findUnique({
    where: { id: requestId },
    include: { workspace: true },
  });
  if (!req) return { error: "Request not found." };
  if (!(await isWorkspaceLeader(req.workspaceId, userId))) {
    return { error: "Only the group leader can approve requests." };
  }

  const count = await prisma.workspaceMember.count({ where: { workspaceId: req.workspaceId } });
  if (req.workspace.maxMembers !== null && count >= req.workspace.maxMembers) {
    return { error: "The group is full — raise the member cap first." };
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: req.workspaceId, userId: req.userId } },
      create: { workspaceId: req.workspaceId, userId: req.userId, role: WorkspaceRole.MEMBER },
      update: {},
    }),
    prisma.joinRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } }),
  ]);
  await createNotification({
    userId: req.userId,
    type: NotificationType.WORKSPACE,
    title: "Join request approved",
    body: `You're now a member of "${req.workspace.name}".`,
    link: `/dashboard/workspaces/${req.workspaceId}`,
  });

  revalidatePath(`/dashboard/workspaces/${req.workspaceId}`);
  return { success: "Member approved." };
}

export async function rejectJoinRequest(requestId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const req = await prisma.joinRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found." };
  if (!(await isWorkspaceLeader(req.workspaceId, userId))) {
    return { error: "Only the group leader can reject requests." };
  }

  await prisma.joinRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
  await createNotification({
    userId: req.userId,
    type: NotificationType.WORKSPACE,
    title: "Join request declined",
    body: "Your request to join a group was declined.",
    link: "/dashboard/workspaces",
  });

  revalidatePath(`/dashboard/workspaces/${req.workspaceId}`);
  return { success: "Request rejected." };
}

export async function createInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<(ActionState & { token?: string }) | null> {
  const userId = await requireUserId();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can create invites." };
  }

  const expiresInHours = parseInt(String(formData.get("expiresInHours") ?? "0"), 10);
  const rawMaxUses = String(formData.get("maxUses") ?? "").trim();
  const maxUses = rawMaxUses ? Math.max(1, parseInt(rawMaxUses, 10)) : null;

  const token = randomBytes(18).toString("base64url");
  const expiresAt =
    expiresInHours > 0 ? new Date(Date.now() + expiresInHours * 3600 * 1000) : null;

  await prisma.groupInvite.create({
    data: { workspaceId, token, expiresAt, maxUses, createdById: userId },
  });
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Invite created.", token };
}

/** Create an invite and email the link to someone. */
export async function inviteByEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can send invites." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!isEmailConfigured()) {
    return { error: "Email isn't configured on this server. Use a copy-link invite instead." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const token = randomBytes(18).toString("base64url");
  await prisma.groupInvite.create({
    data: {
      workspaceId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      maxUses: 1,
      createdById: userId,
    },
  });

  const url = `${await getBaseUrl()}/dashboard/workspaces/invite/${token}`;
  const res = await sendEmail({
    to: email,
    subject: `You're invited to join "${workspace?.name}" on EngiSync`,
    html: emailLayout(
      "Group invitation",
      `<p>You've been invited to join the group <strong>${workspace?.name}</strong>.</p>
       <p><a href="${url}">Accept the invitation</a> (link expires in 7 days, single use).</p>`,
    ),
  });
  if (!res.sent) return { error: res.error ?? "Could not send the email." };

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: `Invite emailed to ${email}.` };
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const invite = await prisma.groupInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { error: "Invite not found." };
  if (!(await isWorkspaceLeader(invite.workspaceId, userId))) {
    return { error: "Only the group leader can revoke invites." };
  }
  await prisma.groupInvite.update({ where: { id: inviteId }, data: { revoked: true } });
  revalidatePath(`/dashboard/workspaces/${invite.workspaceId}`);
  return { success: "Invite revoked." };
}

/** Join via a one-time / expiring invite token. Bypasses PIN (explicit invite). */
export async function joinViaInvite(token: string): Promise<ActionState> {
  const userId = await requireUserId();
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });
  if (!invite || invite.revoked) return { error: "This invite is no longer valid." };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { error: "This invite has expired." };
  }
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    return { error: "This invite has reached its use limit." };
  }

  const already = await getMembership(invite.workspaceId, userId);
  if (already) redirect(`/dashboard/workspaces/${invite.workspaceId}`);

  const count = await prisma.workspaceMember.count({ where: { workspaceId: invite.workspaceId } });
  if (invite.workspace.maxMembers !== null && count >= invite.workspace.maxMembers) {
    return { error: "This group is full." };
  }

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: { workspaceId: invite.workspaceId, userId, role: WorkspaceRole.MEMBER },
    }),
    prisma.groupInvite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    }),
  ]);
  await prisma.auditLog.create({
    data: { userId, action: "WORKSPACE_JOINED_VIA_INVITE", target: invite.workspaceId },
  });

  revalidatePath("/dashboard/workspaces");
  redirect(`/dashboard/workspaces/${invite.workspaceId}`);
}
