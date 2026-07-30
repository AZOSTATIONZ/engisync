"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AttendanceStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";
import { userWorkspaceIds } from "@/lib/task";
import { getMeetingForUser, isMeetingLeader } from "@/lib/meeting";
import { meetingSchema, attendanceStatusEnum } from "@/lib/validations";
import { canUseAI } from "@/lib/plan";
import { chatComplete } from "@/lib/ai";

export type ActionState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/** AI Meeting Assistant: generate minutes + action items and store them. */
export async function generateMinutes(meetingId: string): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isMeetingLeader(meetingId, userId))) {
    return { error: "Only the organiser or a leader can generate minutes." };
  }
  const gate = await canUseAI(userId);
  if (!gate.ok) return { error: gate.reason };

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      workspace: { select: { name: true } },
      attendances: { include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!meeting) return { error: "Meeting not found." };

  const attendance = meeting.attendances
    .map((a) => `${displayName(a.user)}: ${a.status}`)
    .join(", ");

  try {
    const result = await chatComplete({
      system:
        "You are a meeting secretary for an engineering project team. From the meeting details, produce concise, well-structured minutes with these sections: Summary, Decisions Made, Action Items (with owner where possible), Follow-up Reminders, and Attendance Summary. Use short bullet points.",
      prompt: `Meeting: ${meeting.title}\nProject: ${meeting.workspace.name}\nWhen: ${meeting.startAt.toISOString()}\nAgenda/notes: ${meeting.description ?? "(none)"}\nAttendance: ${attendance || "(not recorded)"}`,
      maxTokens: 900,
    });
    await prisma.meeting.update({ where: { id: meetingId }, data: { minutes: result } });
    await prisma.auditLog.create({
      data: { userId, action: "MEETING_MINUTES_GENERATED", target: meetingId },
    });
    revalidatePath(`/dashboard/meetings/${meetingId}`);
    return { success: "Minutes generated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

export async function createMeeting(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = meetingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    provider: formData.get("provider") || "OTHER",
    meetingUrl: formData.get("meetingUrl"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    workspaceId: formData.get("workspaceId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const wsIds = await userWorkspaceIds(userId);
  if (!wsIds.includes(data.workspaceId)) {
    return { error: "You are not a member of that workspace." };
  }

  if (data.meetingUrl && !/^https?:\/\//i.test(data.meetingUrl)) {
    return { error: "Meeting link must start with http:// or https://" };
  }

  const startAt = new Date(`${data.date}T${data.startTime}:00`);
  const endAt = data.endTime ? new Date(`${data.date}T${data.endTime}:00`) : null;
  if (endAt && endAt < startAt) {
    return { error: "End time cannot be before start time." };
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      provider: data.provider,
      meetingUrl: data.meetingUrl ?? null,
      startAt,
      endAt,
      workspaceId: data.workspaceId,
      createdById: userId,
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "MEETING_CREATED", target: meeting.id },
  });

  revalidatePath("/dashboard/meetings");
  redirect(`/dashboard/meetings/${meeting.id}`);
}

export async function deleteMeeting(meetingId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { createdById: true },
  });
  if (!meeting) return { error: "Meeting not found." };

  const allowed =
    meeting.createdById === userId || (await isMeetingLeader(meetingId, userId));
  if (!allowed) return { error: "Only the organiser or a leader can delete this." };

  await prisma.meeting.delete({ where: { id: meetingId } });
  revalidatePath("/dashboard/meetings");
  redirect("/dashboard/meetings");
}

/** Self check-in: marks the current user PRESENT (or LATE if after start). */
export async function checkIn(meetingId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const meeting = await getMeetingForUser(meetingId, userId);
  if (!meeting) return { error: "You don't have access to this meeting." };

  const now = new Date();
  const status =
    now > new Date(meeting.startAt.getTime() + 5 * 60 * 1000)
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

  await prisma.attendance.upsert({
    where: { meetingId_userId: { meetingId, userId } },
    create: { meetingId, userId, status, checkedInAt: now },
    update: { status, checkedInAt: now },
  });

  revalidatePath(`/dashboard/meetings/${meetingId}`);
  return { success: "You're checked in." };
}

/** Leader sets a member's attendance status. */
export async function setAttendance(
  meetingId: string,
  memberUserId: string,
  status: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  if (!(await isMeetingLeader(meetingId, userId))) {
    return { error: "Only a group leader can set attendance." };
  }
  const parsed = attendanceStatusEnum.safeParse(status);
  if (!parsed.success) return { error: "Invalid status." };

  await prisma.attendance.upsert({
    where: { meetingId_userId: { meetingId, userId: memberUserId } },
    create: { meetingId, userId: memberUserId, status: parsed.data },
    update: { status: parsed.data },
  });

  revalidatePath(`/dashboard/meetings/${meetingId}`);
  return { success: "Attendance updated." };
}
