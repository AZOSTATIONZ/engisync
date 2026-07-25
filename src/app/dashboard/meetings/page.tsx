import Link from "next/link";
import type { Metadata } from "next";
import { Video, ExternalLink, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listMeetingsForUser, PROVIDER_LABELS } from "@/lib/meeting";
import { userWorkspaceIds } from "@/lib/task";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateMeetingForm, type Option } from "./meetings-ui";

export const metadata: Metadata = { title: "Meetings" };

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function MeetingCard({
  m,
}: {
  m: Awaited<ReturnType<typeof listMeetingsForUser>>[number];
}) {
  const present = m.attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <Link
            href={`/dashboard/meetings/${m.id}`}
            className="font-medium hover:underline"
          >
            {m.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-1.5 py-0.5">
              {PROVIDER_LABELS[m.provider]}
            </span>
            <span>📁 {m.workspace.name}</span>
            <span>🕒 {fmt(m.startAt)}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {present} present
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {m.meetingUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={m.meetingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Join
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/meetings/${m.id}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MeetingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [meetings, wsIds] = await Promise.all([
    listMeetingsForUser(userId),
    userWorkspaceIds(userId),
  ]);

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: { id: true, name: true },
  });
  const workspaceOptions: Option[] = workspaces.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  const now = new Date();
  const upcoming = meetings
    .filter((m) => m.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = meetings.filter((m) => m.startAt < now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule sessions, share join links, and track attendance.
          </p>
        </div>
        <CreateMeetingForm workspaces={workspaceOptions} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((m) => (
              <MeetingCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Past</h2>
          <div className="grid gap-3">
            {past.map((m) => (
              <MeetingCard key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}

      {meetings.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-5 w-5 text-primary" /> No meetings yet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Schedule your first meeting to start tracking attendance.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
