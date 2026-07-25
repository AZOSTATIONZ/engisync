"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { eventSchema } from "@/lib/validations";

export type ActionState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type") || "EVENT",
    workspaceId: formData.get("workspaceId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  if (data.workspaceId) {
    const wsIds = await userWorkspaceIds(userId);
    if (!wsIds.includes(data.workspaceId)) {
      return { error: "You are not a member of that workspace." };
    }
  }

  const allDay = !data.startTime;
  const startAt = new Date(`${data.date}T${data.startTime || "00:00"}:00`);
  const endAt = data.endTime
    ? new Date(`${data.date}T${data.endTime}:00`)
    : null;

  if (endAt && endAt < startAt) {
    return { error: "End time cannot be before start time." };
  }

  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      startAt,
      endAt,
      allDay,
      type: data.type,
      workspaceId: data.workspaceId ?? null,
      creatorId: userId,
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "EVENT_CREATED", target: data.title },
  });

  revalidatePath("/dashboard/calendar");
  return { success: "Event added." };
}

export async function deleteEvent(eventId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { creatorId: true, workspaceId: true },
  });
  if (!event) return { error: "Event not found." };

  let allowed = event.creatorId === userId;
  if (!allowed && event.workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: event.workspaceId, userId } },
    });
    allowed = membership?.role === "LEADER";
  }
  if (!allowed) return { error: "You can't delete this event." };

  await prisma.calendarEvent.delete({ where: { id: eventId } });
  revalidatePath("/dashboard/calendar");
  return { success: "Event deleted." };
}
