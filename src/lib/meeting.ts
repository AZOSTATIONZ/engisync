import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

export const PROVIDER_LABELS: Record<string, string> = {
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  MS_TEAMS: "Microsoft Teams",
  GOOGLE_CLASSROOM: "Google Classroom",
  OTHER: "Other",
};

/** Meetings in the user's workspaces, with attendance summary + the user's status. */
export async function listMeetingsForUser(userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  return prisma.meeting.findMany({
    where: { workspaceId: { in: wsIds } },
    include: {
      workspace: { select: { id: true, name: true } },
      attendances: { select: { userId: true, status: true } },
    },
    orderBy: { startAt: "desc" },
  });
}

/** A meeting the user can access (member of its workspace), with roster data. */
export async function getMeetingForUser(meetingId: string, userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, workspaceId: { in: wsIds } },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
      attendances: true,
    },
  });
  return meeting;
}

/** Is the user a leader of the meeting's workspace? */
export async function isMeetingLeader(meetingId: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { workspaceId: true },
  });
  if (!meeting) return false;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: meeting.workspaceId, userId } },
  });
  return membership?.role === "LEADER";
}
