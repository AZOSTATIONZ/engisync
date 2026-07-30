import Link from "next/link";
import { displayName } from "@/lib/identity";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { WorkspaceRole } from "@prisma/client";

import { auth } from "@/auth";
import { getMeetingForUser, PROVIDER_LABELS } from "@/lib/meeting";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckInButton,
  DeleteMeetingButton,
  AttendanceSelect,
  GenerateMinutesButton,
} from "../meetings-ui";

export const metadata: Metadata = { title: "Meeting" };

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-green-500/15 text-green-600 dark:text-green-400",
  LATE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  EXCUSED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ABSENT: "bg-muted text-muted-foreground",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const meeting = await getMeetingForUser(id, userId);
  if (!meeting) notFound();

  const isLeader = meeting.workspace.members.some(
    (m) => m.userId === userId && m.role === WorkspaceRole.LEADER,
  );
  const canManage = isLeader || meeting.createdById === userId;

  const attendanceByUser = new Map(
    meeting.attendances.map((a) => [a.userId, a]),
  );
  const myAttendance = attendanceByUser.get(userId);

  const counts = { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0 };
  for (const m of meeting.workspace.members) {
    const status = attendanceByUser.get(m.userId)?.status ?? "ABSENT";
    counts[status as keyof typeof counts]++;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/meetings"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All meetings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{meeting.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-0.5">
                {PROVIDER_LABELS[meeting.provider]}
              </span>
              <span>📁 {meeting.workspace.name}</span>
              <span>
                🕒{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(meeting.startAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckInButton meetingId={meeting.id} checkedIn={!!myAttendance?.checkedInAt} />
            {meeting.meetingUrl && (
              <Button asChild variant="outline">
                <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Join
                </a>
              </Button>
            )}
            {canManage && (
              <GenerateMinutesButton
                meetingId={meeting.id}
                hasMinutes={!!meeting.minutes}
              />
            )}
            {canManage && <DeleteMeetingButton meetingId={meeting.id} />}
          </div>
        </div>
      </div>

      {meeting.minutes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meeting minutes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {meeting.minutes}
          </CardContent>
        </Card>
      )}

      {meeting.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agenda</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {meeting.description}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{counts[s]}</div>
              <div className="text-xs uppercase text-muted-foreground">
                {s.toLowerCase()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance ({meeting.workspace.members.length})</CardTitle>
          <CardDescription>
            Tap <strong>Check in</strong> at the top when you join the meeting —
            it marks you present (or late if it&apos;s already started). The
            project leader can adjust anyone&apos;s status here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {meeting.workspace.members.map((m) => {
              const att = attendanceByUser.get(m.userId);
              const status = att?.status ?? "ABSENT";
              return (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {displayName(m.user)}
                      {m.userId === userId && " (you)"}
                    </p>
                    {att?.checkedInAt && (
                      <p className="text-xs text-muted-foreground">
                        Checked in{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(att.checkedInAt)}
                      </p>
                    )}
                  </div>
                  {canManage ? (
                    <AttendanceSelect
                      meetingId={meeting.id}
                      memberUserId={m.userId}
                      current={status}
                    />
                  ) : (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
