"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceLeader } from "@/lib/workspace";
import {
  PROJECT_STAGES,
  STAGE_META,
  type ProjectStage,
} from "@/lib/lifecycle";

export type ProjectState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function requireLeader(workspaceId: string): Promise<string | null> {
  const userId = await requireUserId();
  if (!(await isWorkspaceLeader(workspaceId, userId))) return null;
  return userId;
}

function rev(workspaceId: string) {
  revalidatePath(`/dashboard/projects/${workspaceId}`);
}

/**
 * Move the project to a stage.
 *
 * Any stage is reachable in either direction — teams genuinely do go back to
 * Design after Testing fails, and forcing a linear march would make the
 * feature lie about what happened. `stageEnteredAt` resets on every change so
 * "days in this stage" stays honest.
 */
export async function setProjectStage(
  workspaceId: string,
  stage: string,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  if (!(PROJECT_STAGES as readonly string[]).includes(stage)) {
    return { error: "Unknown stage." };
  }

  const current = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stage: true },
  });
  if (!current) return { error: "Project not found." };
  if (current.stage === stage) return null;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      stage: stage as ProjectStage,
      stageEnteredAt: new Date(),
    },
  });

  rev(workspaceId);
  revalidatePath(`/dashboard/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
  return { success: `Moved to ${STAGE_META[stage as ProjectStage].label}.` };
}

/** Target end date drives the "are we behind?" arithmetic. */
export async function setTargetDate(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  const raw = String(formData.get("targetEndDate") ?? "").trim();

  if (!raw) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { targetEndDate: null },
    });
    rev(workspaceId);
    return { success: "Target date cleared." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: "Use a valid date." };

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { targetEndDate: new Date(raw) },
  });
  rev(workspaceId);
  revalidatePath("/dashboard");
  return { success: "Target date saved." };
}

export async function setProjectInfo(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      objectives: (formData.get("objectives") as string)?.trim() || null,
      scope: (formData.get("scope") as string)?.trim() || null,
    },
  });
  rev(workspaceId);
  return { success: "Project details saved." };
}

export async function addMilestone(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Add a milestone title." };
  const dueRaw = String(formData.get("dueDate") ?? "");
  await prisma.milestone.create({
    data: {
      workspaceId,
      title,
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? new Date(dueRaw) : null,
    },
  });
  rev(workspaceId);
  return { success: "Milestone added." };
}

export async function toggleMilestone(id: string): Promise<ProjectState> {
  const userId = await requireUserId();
  const m = await prisma.milestone.findUnique({ where: { id } });
  if (!m) return { error: "Not found." };
  if (!(await isWorkspaceLeader(m.workspaceId, userId))) return { error: "Leaders only." };
  await prisma.milestone.update({ where: { id }, data: { done: !m.done } });
  rev(m.workspaceId);
  return null;
}

export async function deleteMilestone(id: string): Promise<ProjectState> {
  const userId = await requireUserId();
  const m = await prisma.milestone.findUnique({ where: { id } });
  if (!m) return { error: "Not found." };
  if (!(await isWorkspaceLeader(m.workspaceId, userId))) return { error: "Leaders only." };
  await prisma.milestone.delete({ where: { id } });
  rev(m.workspaceId);
  return null;
}

export async function addRisk(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Describe the risk." };
  const severity = String(formData.get("severity") ?? "MEDIUM");
  await prisma.projectRisk.create({
    data: {
      workspaceId,
      title,
      severity: ["LOW", "MEDIUM", "HIGH"].includes(severity) ? severity : "MEDIUM",
      mitigation: (formData.get("mitigation") as string)?.trim() || null,
    },
  });
  rev(workspaceId);
  return { success: "Risk added." };
}

export async function deleteRisk(id: string): Promise<ProjectState> {
  const userId = await requireUserId();
  const r = await prisma.projectRisk.findUnique({ where: { id } });
  if (!r) return { error: "Not found." };
  if (!(await isWorkspaceLeader(r.workspaceId, userId))) return { error: "Leaders only." };
  await prisma.projectRisk.delete({ where: { id } });
  rev(r.workspaceId);
  return null;
}

export async function addDeliverable(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  if (!(await requireLeader(workspaceId))) return { error: "Leaders only." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Add a deliverable." };
  await prisma.deliverable.create({ data: { workspaceId, title } });
  rev(workspaceId);
  return { success: "Deliverable added." };
}

export async function toggleDeliverable(id: string): Promise<ProjectState> {
  const userId = await requireUserId();
  const d = await prisma.deliverable.findUnique({ where: { id } });
  if (!d) return { error: "Not found." };
  if (!(await isWorkspaceLeader(d.workspaceId, userId))) return { error: "Leaders only." };
  await prisma.deliverable.update({ where: { id }, data: { done: !d.done } });
  rev(d.workspaceId);
  return null;
}

export async function deleteDeliverable(id: string): Promise<ProjectState> {
  const userId = await requireUserId();
  const d = await prisma.deliverable.findUnique({ where: { id } });
  if (!d) return { error: "Not found." };
  if (!(await isWorkspaceLeader(d.workspaceId, userId))) return { error: "Leaders only." };
  await prisma.deliverable.delete({ where: { id } });
  rev(d.workspaceId);
  return null;
}
