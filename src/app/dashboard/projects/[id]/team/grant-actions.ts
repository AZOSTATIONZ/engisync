"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { displayName } from "@/lib/identity";
import { createNotification } from "@/lib/notifications";
import { recordActivity } from "@/lib/activity-log";
import { projectTeam } from "@/lib/routes";

export type GrantState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * Invite a supervisor or lecturer to see this project.
 *
 * Authorised by `member.invite` — inviting someone to observe the project is
 * the same kind of decision as inviting someone to join it, so it reuses the
 * existing action rather than adding a new one to the permission matrix. That
 * keeps the matrix small enough to test exhaustively, which is the stated
 * reason there are three roles instead of six.
 */
export async function grantProjectAccess(
  workspaceId: string,
  _prev: GrantState,
  formData: FormData,
): Promise<GrantState> {
  const userId = await requireUserId();

  const authz = await authorize(workspaceId, userId, "member.invite");
  if (!authz.ok) return { error: authz.error };

  const granteeId = String(formData.get("userId") ?? "");
  const rawRole = String(formData.get("role") ?? "SUPERVISOR");
  const role = rawRole === "LECTURER" ? "LECTURER" : "SUPERVISOR";
  if (!granteeId) return { error: "Choose someone to invite." };

  const project = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, departmentId: true },
  });
  if (!project) return { error: "Project not found." };

  // The invitee must be staff in this project's department. Without this check
  // the form could be used to hand a private project to any account id.
  if (!project.departmentId) {
    return {
      error:
        "This project isn't in a department yet, so there's nobody to invite. Set a department first.",
    };
  }
  const eligible = await prisma.departmentMember.findFirst({
    where: {
      departmentId: project.departmentId,
      userId: granteeId,
      role: { in: ["SUPERVISOR", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!eligible) {
    return { error: "That person isn't a supervisor or lecturer in this department." };
  }

  // A member already sees everything; a grant on top would be noise.
  const isMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: granteeId } },
    select: { id: true },
  });
  if (isMember) return { error: "They're already a member of this project." };

  const granter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const granterName = displayName(granter);

  // Re-inviting someone previously revoked reactivates their row rather than
  // creating a second one, so "who can see this?" always has one answer per
  // person — and the original grant date survives in the record.
  await prisma.projectGrant.upsert({
    where: { workspaceId_userId: { workspaceId, userId: granteeId } },
    create: {
      workspaceId,
      userId: granteeId,
      role,
      grantedById: userId,
      grantedByName: granterName,
    },
    update: {
      role,
      revokedAt: null,
      revokedById: null,
      grantedById: userId,
      grantedByName: granterName,
    },
  });

  const grantee = await prisma.user.findUnique({
    where: { id: granteeId },
    select: { name: true, email: true },
  });

  await createNotification({
    userId: granteeId,
    type: NotificationType.WORKSPACE,
    title: "You've been invited to supervise a project",
    body: project.name,
    link: `/dashboard/supervisor/${workspaceId}`,
  });

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "MEMBER",
    action: role === "LECTURER" ? "invited a lecturer" : "invited a supervisor",
    subject: displayName(grantee),
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "PROJECT_ACCESS_GRANTED",
      target: workspaceId,
      metadata: { granteeId, role },
    },
  });

  revalidatePath(projectTeam(workspaceId));
  return { success: `${displayName(grantee)} can now see this project.` };
}

/**
 * Withdraw a grant.
 *
 * Soft: `revokedAt` is stamped and the row stays. Who could see the work, and
 * when, is exactly the kind of record that must not be erasable by the people
 * it holds accountable — the same reasoning as the payment ledger.
 */
export async function revokeProjectAccess(
  workspaceId: string,
  grantId: string,
): Promise<GrantState> {
  const userId = await requireUserId();

  const authz = await authorize(workspaceId, userId, "member.invite");
  if (!authz.ok) return { error: authz.error };

  const grant = await prisma.projectGrant.findFirst({
    where: { id: grantId, workspaceId },
    select: { id: true, revokedAt: true, user: { select: { name: true, email: true } } },
  });
  if (!grant) return { error: "Grant not found on this project." };
  if (grant.revokedAt) return { error: "That access was already withdrawn." };

  await prisma.projectGrant.update({
    where: { id: grant.id },
    data: { revokedAt: new Date(), revokedById: userId },
  });

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "MEMBER",
    action: "withdrew project access from",
    subject: displayName(grant.user),
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "PROJECT_ACCESS_REVOKED",
      target: workspaceId,
      metadata: { grantId },
    },
  });

  revalidatePath(projectTeam(workspaceId));
  return { success: `${displayName(grant.user)} can no longer see this project.` };
}
