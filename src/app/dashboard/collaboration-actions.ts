"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceLeader } from "@/lib/workspace";
import { isDeptAdmin } from "@/lib/department";
import { createNotification } from "@/lib/notifications";

export type CollabState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/** A group leader requests to collaborate with another department. */
export async function requestCollaboration(
  workspaceId: string,
  departmentId: string,
): Promise<CollabState> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) {
    return { error: "Only the group leader can request collaboration." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, departmentId: true },
  });
  if (!workspace) return { error: "Group not found." };
  if (workspace.departmentId === departmentId) {
    return { error: "That's already this group's home department." };
  }

  const existing = await prisma.workspaceCollaboration.findUnique({
    where: { workspaceId_departmentId: { workspaceId, departmentId } },
  });
  if (existing && existing.status !== "REJECTED") {
    return { error: "A collaboration with that department already exists." };
  }

  await prisma.workspaceCollaboration.upsert({
    where: { workspaceId_departmentId: { workspaceId, departmentId } },
    create: { workspaceId, departmentId, requestedById: userId, status: "PENDING" },
    update: { status: "PENDING", requestedById: userId },
  });

  // Notify the target department's admins.
  const admins = await prisma.departmentMember.findMany({
    where: { departmentId, role: "ADMIN" },
    select: { userId: true },
  });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.userId,
        type: NotificationType.WORKSPACE,
        title: "Collaboration request",
        body: `The group "${workspace.name}" wants to collaborate with your department.`,
        link: `/dashboard/departments/${departmentId}`,
      }),
    ),
  );

  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  return { success: "Collaboration request sent." };
}

async function resolve(
  collabId: string,
  userId: string,
  status: "APPROVED" | "REJECTED",
): Promise<CollabState> {
  const collab = await prisma.workspaceCollaboration.findUnique({
    where: { id: collabId },
    include: { workspace: { select: { id: true, name: true, leaderId: true } } },
  });
  if (!collab) return { error: "Request not found." };
  if (!(await isDeptAdmin(collab.departmentId, userId))) {
    return { error: "Only a department admin can decide this." };
  }

  await prisma.workspaceCollaboration.update({
    where: { id: collabId },
    data: { status },
  });
  await createNotification({
    userId: collab.workspace.leaderId,
    type: NotificationType.WORKSPACE,
    title: status === "APPROVED" ? "Collaboration approved" : "Collaboration declined",
    body: `Your request for "${collab.workspace.name}" was ${status.toLowerCase()}.`,
    link: `/dashboard/workspaces/${collab.workspace.id}`,
  });
  await prisma.auditLog.create({
    data: { userId, action: `COLLAB_${status}`, target: collab.workspaceId },
  });

  revalidatePath(`/dashboard/departments/${collab.departmentId}`);
  return { success: status === "APPROVED" ? "Collaboration approved." : "Request declined." };
}

export async function approveCollaboration(collabId: string): Promise<CollabState> {
  const userId = await requireUserId();
  return resolve(collabId, userId, "APPROVED");
}

export async function rejectCollaboration(collabId: string): Promise<CollabState> {
  const userId = await requireUserId();
  return resolve(collabId, userId, "REJECTED");
}

/** Remove a collaboration link (group leader or the department's admin). */
export async function removeCollaboration(collabId: string): Promise<CollabState> {
  const userId = await requireUserId();
  const collab = await prisma.workspaceCollaboration.findUnique({
    where: { id: collabId },
  });
  if (!collab) return { error: "Not found." };

  const allowed =
    (await isWorkspaceLeader(collab.workspaceId, userId)) ||
    (await isDeptAdmin(collab.departmentId, userId));
  if (!allowed) return { error: "You can't remove this collaboration." };

  await prisma.workspaceCollaboration.delete({ where: { id: collabId } });
  revalidatePath(`/dashboard/workspaces/${collab.workspaceId}`);
  revalidatePath(`/dashboard/departments/${collab.departmentId}`);
  return { success: "Collaboration removed." };
}
