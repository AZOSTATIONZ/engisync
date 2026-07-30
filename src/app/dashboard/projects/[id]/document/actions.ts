"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { canSuperviseWorkspace } from "@/lib/supervisor";
import { createNotification } from "@/lib/notifications";
import { NotificationType } from "@prisma/client";

export type DocActionState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, name: session.user.name ?? "Someone" };
}

/** Resolve the workspace a section belongs to. */
async function sectionContext(sectionId: string) {
  const section = await prisma.documentSection.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      status: true,
      locked: true,
      title: true,
      document: { select: { locked: true, workspaceId: true } },
    },
  });
  return section;
}

/** Member/leader: save a section's content. */
export async function saveSection(
  workspaceId: string,
  sectionId: string,
  content: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await getMembership(workspaceId, user.id))) {
    return { error: "You are not a member of this group." };
  }
  const section = await sectionContext(sectionId);
  if (!section || section.document.workspaceId !== workspaceId) {
    return { error: "Section not found." };
  }
  if (section.document.locked || section.locked) {
    return { error: "This document is locked by the supervisor and can't be edited." };
  }

  await prisma.documentSection.update({
    where: { id: sectionId },
    data: {
      content: content.slice(0, 20000),
      // Editing an approved/changes-requested section returns it to draft.
      status: section.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    },
  });
  revalidatePath(`/dashboard/projects/${workspaceId}/document`);
  return { success: "Saved." };
}

/** Member/leader: mark a section ready for supervisor review. */
export async function submitSection(
  workspaceId: string,
  sectionId: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await getMembership(workspaceId, user.id))) {
    return { error: "You are not a member of this group." };
  }
  const section = await sectionContext(sectionId);
  if (!section || section.document.workspaceId !== workspaceId) {
    return { error: "Section not found." };
  }
  if (section.document.locked || section.locked) {
    return { error: "This document is locked." };
  }
  await prisma.documentSection.update({
    where: { id: sectionId },
    data: { status: "SUBMITTED" },
  });
  revalidatePath(`/dashboard/projects/${workspaceId}/document`);
  return { success: "Submitted for review." };
}

/** Member or supervisor: add a comment to a section thread. */
export async function addSectionComment(
  sectionId: string,
  body: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  const section = await sectionContext(sectionId);
  if (!section) return { error: "Section not found." };
  const wsId = section.document.workspaceId;

  const isMember = !!(await getMembership(wsId, user.id));
  const isSupervisor = await canSuperviseWorkspace(wsId, user.id);
  if (!isMember && !isSupervisor) {
    return { error: "You don't have access to this project." };
  }
  const clean = body.trim();
  if (!clean) return { error: "Write a comment first." };

  await prisma.sectionComment.create({
    data: {
      sectionId,
      authorId: user.id,
      authorName: isSupervisor ? `${user.name} (supervisor)` : user.name,
      body: clean.slice(0, 4000),
    },
  });
  revalidatePath(`/dashboard/projects/${wsId}/document`);
  revalidatePath(`/dashboard/supervisor/${wsId}/documentation`);
  return { success: "Comment added." };
}

/** Member/leader: snapshot the current document as a new submitted report version. */
export async function submitReport(
  workspaceId: string,
  note: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await getMembership(workspaceId, user.id))) {
    return { error: "You are not a member of this group." };
  }
  const doc = await prisma.projectDocument.findUnique({
    where: { workspaceId },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!doc) return { error: "No document to submit yet." };

  const last = await prisma.reportVersion.findFirst({
    where: { documentId: doc.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  const snapshot = JSON.stringify(
    doc.sections.map((s) => ({ key: s.key, title: s.title, content: s.content })),
  );

  await prisma.reportVersion.create({
    data: {
      documentId: doc.id,
      versionNumber,
      submittedById: user.id,
      submittedByName: user.name,
      note: note.trim().slice(0, 2000) || null,
      snapshot,
    },
  });

  const supervisors = await prisma.workspace
    .findUnique({ where: { id: workspaceId }, select: { departmentId: true } })
    .then((w) =>
      w?.departmentId
        ? prisma.departmentMember.findMany({
            where: { departmentId: w.departmentId, role: "SUPERVISOR" },
            select: { userId: true },
          })
        : [],
    );
  await Promise.all(
    supervisors.map((s) =>
      createNotification({
        userId: s.userId,
        type: NotificationType.WORKSPACE,
        title: `Report v${versionNumber} submitted`,
        body: note.trim() || "A new report version is ready for review.",
        link: `/dashboard/supervisor/${workspaceId}/documentation`,
      }),
    ),
  );

  revalidatePath(`/dashboard/projects/${workspaceId}/document`);
  return { success: `Report v${versionNumber} submitted.` };
}

/** Supervisor: approve the final report. */
export async function approveReport(
  workspaceId: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await canSuperviseWorkspace(workspaceId, user.id))) {
    return { error: "Only the supervisor can approve the report." };
  }
  await prisma.projectDocument.update({
    where: { workspaceId },
    data: { approved: true, approvedAt: new Date() },
  });
  await notifyLeaders(workspaceId, "Final report approved", "Your supervisor approved the final report.");
  revalidatePath(`/dashboard/supervisor/${workspaceId}/documentation`);
  revalidatePath(`/dashboard/projects/${workspaceId}/document`);
  return { success: "Final report approved." };
}

/** Supervisor: approve overall project completion. */
export async function approveCompletion(
  workspaceId: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await canSuperviseWorkspace(workspaceId, user.id))) {
    return { error: "Only the supervisor can approve completion." };
  }
  await prisma.projectDocument.update({
    where: { workspaceId },
    data: { completionApproved: true, completionApprovedAt: new Date() },
  });
  await notifyLeaders(workspaceId, "Project completion approved", "Your supervisor signed off project completion. Congratulations!");
  revalidatePath(`/dashboard/supervisor/${workspaceId}/documentation`);
  return { success: "Project completion approved." };
}

/** Supervisor: approve a milestone. */
export async function approveMilestone(
  milestoneId: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  const m = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { workspaceId: true },
  });
  if (!m) return { error: "Milestone not found." };
  if (!(await canSuperviseWorkspace(m.workspaceId, user.id))) {
    return { error: "Only the supervisor can approve milestones." };
  }
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { approved: true, done: true },
  });
  revalidatePath(`/dashboard/supervisor/${m.workspaceId}`);
  return { success: "Milestone approved." };
}

async function notifyLeaders(workspaceId: string, title: string, body: string) {
  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: "LEADER" },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title,
        body,
        link: `/dashboard/projects/${workspaceId}/document`,
      }),
    ),
  );
}

/** Supervisor: lock or unlock the whole document for editing. */
export async function setDocumentLock(
  workspaceId: string,
  locked: boolean,
): Promise<DocActionState> {
  const user = await requireUserId();
  if (!(await canSuperviseWorkspace(workspaceId, user.id))) {
    return { error: "Only the supervisor can lock this document." };
  }
  await prisma.projectDocument.update({
    where: { workspaceId },
    data: { locked },
  });
  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: "LEADER" },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title: locked ? "Documentation locked" : "Documentation unlocked",
        body: locked
          ? "The supervisor locked your project document for editing."
          : "The supervisor unlocked your project document — you can edit again.",
        link: `/dashboard/projects/${workspaceId}/document`,
      }),
    ),
  );
  revalidatePath(`/dashboard/projects/${workspaceId}/document`);
  revalidatePath(`/dashboard/supervisor/${workspaceId}/documentation`);
  return { success: locked ? "Document locked." : "Document unlocked." };
}

/** Supervisor: approve a section or request corrections. */
export async function reviewSection(
  sectionId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED",
  note: string,
): Promise<DocActionState> {
  const user = await requireUserId();
  const section = await sectionContext(sectionId);
  if (!section) return { error: "Section not found." };
  const wsId = section.document.workspaceId;

  if (!(await canSuperviseWorkspace(wsId, user.id))) {
    return { error: "Only the supervisor can review sections." };
  }

  await prisma.documentSection.update({
    where: { id: sectionId },
    data: { status: decision },
  });

  const trimmed = note.trim();
  if (trimmed) {
    await prisma.sectionComment.create({
      data: {
        sectionId,
        authorId: user.id,
        authorName: `${user.name} (supervisor)`,
        body: trimmed.slice(0, 4000),
        isCorrection: decision === "CHANGES_REQUESTED",
      },
    });
  }

  // Notify the group leaders.
  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId: wsId, role: "LEADER" },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title:
          decision === "APPROVED"
            ? `Section approved: ${section.title}`
            : `Corrections requested: ${section.title}`,
        body: trimmed || "Open your project documentation to see details.",
        link: `/dashboard/projects/${wsId}/document`,
      }),
    ),
  );

  revalidatePath(`/dashboard/projects/${wsId}/document`);
  revalidatePath(`/dashboard/supervisor/${wsId}/documentation`);
  return {
    success: decision === "APPROVED" ? "Section approved." : "Corrections requested.",
  };
}
