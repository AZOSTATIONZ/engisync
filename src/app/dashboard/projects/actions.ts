"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWorkspaceLeader } from "@/lib/workspace";

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
