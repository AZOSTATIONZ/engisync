"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Recurrence, TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTask, nextDueDate, userWorkspaceIds } from "@/lib/task";
import { taskSchema, logTimeSchema, taskStatusEnum } from "@/lib/validations";

export type ActionState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority") || "MEDIUM",
    status: formData.get("status") || "TODO",
    dueDate: formData.get("dueDate"),
    recurrence: formData.get("recurrence") || "NONE",
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
    workspaceId: formData.get("workspaceId"),
    assigneeId: formData.get("assigneeId"),
    dependsOn: formData.getAll("dependsOn").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  // If a workspace is chosen, the user must belong to it.
  if (data.workspaceId) {
    const wsIds = await userWorkspaceIds(userId);
    if (!wsIds.includes(data.workspaceId)) {
      return { error: "You are not a member of that workspace." };
    }
  }

  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      recurrence: data.recurrence,
      estimatedMinutes: data.estimatedMinutes ?? null,
      workspaceId: data.workspaceId ?? null,
      assigneeId: data.assigneeId ?? null,
      creatorId: userId,
      completedAt: data.status === "DONE" ? new Date() : null,
      dependsOn: data.dependsOn?.length
        ? { connect: data.dependsOn.map((id) => ({ id })) }
        : undefined,
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "TASK_CREATED", target: data.title },
  });

  revalidatePath("/dashboard/tasks");
  return { success: "Task created." };
}

export async function updateTask(
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await canAccessTask(taskId, userId))) {
    return { error: "You don't have access to this task." };
  }

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority") || "MEDIUM",
    status: formData.get("status") || "TODO",
    dueDate: formData.get("dueDate"),
    recurrence: formData.get("recurrence") || "NONE",
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
    workspaceId: formData.get("workspaceId"),
    assigneeId: formData.get("assigneeId"),
    dependsOn: formData.getAll("dependsOn").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      recurrence: data.recurrence,
      estimatedMinutes: data.estimatedMinutes ?? null,
      assigneeId: data.assigneeId ?? null,
      completedAt: data.status === "DONE" ? new Date() : null,
      dependsOn: { set: (data.dependsOn ?? []).map((id) => ({ id })) },
    },
  });

  revalidatePath("/dashboard/tasks");
  return { success: "Task updated." };
}

/** Quick status change; regenerates a recurring task when completed. */
export async function changeTaskStatus(
  taskId: string,
  status: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  const task = await canAccessTask(taskId, userId);
  if (!task) return { error: "You don't have access to this task." };

  const parsedStatus = taskStatusEnum.safeParse(status);
  if (!parsedStatus.success) return { error: "Invalid status." };
  const newStatus = parsedStatus.data;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      completedAt: newStatus === TaskStatus.DONE ? new Date() : null,
    },
  });

  // Recurring: on completion, spawn the next occurrence.
  if (newStatus === TaskStatus.DONE && task.recurrence !== Recurrence.NONE) {
    const base = task.dueDate ?? new Date();
    const due = nextDueDate(base, task.recurrence);
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: TaskStatus.TODO,
        dueDate: due,
        recurrence: task.recurrence,
        estimatedMinutes: task.estimatedMinutes,
        workspaceId: task.workspaceId,
        assigneeId: task.assigneeId,
        creatorId: task.creatorId,
      },
    });
  }

  revalidatePath("/dashboard/tasks");
  return { success: "Status updated." };
}

export async function logTime(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = logTimeSchema.safeParse({
    taskId: formData.get("taskId"),
    minutes: formData.get("minutes"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { taskId, minutes, note } = parsed.data;

  if (!(await canAccessTask(taskId, userId))) {
    return { error: "You don't have access to this task." };
  }

  await prisma.$transaction([
    prisma.timeLog.create({
      data: { taskId, userId, minutes, note: note ?? null },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { loggedMinutes: { increment: minutes } },
    }),
  ]);

  revalidatePath("/dashboard/tasks");
  return { success: `Logged ${minutes} min.` };
}

export async function deleteTask(taskId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const task = await canAccessTask(taskId, userId);
  if (!task) return { error: "You don't have access to this task." };

  // Only the creator, or a leader of the task's workspace, may delete.
  let allowed = task.creatorId === userId;
  if (!allowed && task.workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId } },
    });
    allowed = membership?.role === "LEADER";
  }
  if (!allowed) return { error: "Only the creator or group leader can delete this task." };

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/dashboard/tasks");
  return { success: "Task deleted." };
}
