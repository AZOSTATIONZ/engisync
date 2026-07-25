"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CalendarPlus, LogIn, Trash2 } from "lucide-react";
import {
  createMeeting,
  deleteMeeting,
  checkIn,
  setAttendance,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export type Option = { id: string; label: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_OPTIONS = ["PRESENT", "LATE", "EXCUSED", "ABSENT"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Scheduling…" : "Schedule meeting"}
    </Button>
  );
}

export function CreateMeetingForm({ workspaces }: { workspaces: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(
    createMeeting,
    null,
  );

  if (workspaces.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Join or create a workspace first to schedule meetings.
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Schedule meeting
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Weekly project sync" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace</Label>
              <select id="workspaceId" name="workspaceId" className={selectClass} required defaultValue="">
                <option value="" disabled>Choose…</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Platform</Label>
              <select id="provider" name="provider" className={selectClass} defaultValue="GOOGLE_MEET">
                <option value="GOOGLE_MEET">Google Meet</option>
                <option value="ZOOM">Zoom</option>
                <option value="MS_TEAMS">Microsoft Teams</option>
                <option value="GOOGLE_CLASSROOM">Google Classroom</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time (optional)</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting link</Label>
              <Input id="meetingUrl" name="meetingUrl" placeholder="https://meet.google.com/…" />
              <p className="text-xs text-muted-foreground">
                No link yet? Open a provider to create the room, then paste the
                link here:
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  Start Google Meet
                </a>
                <a
                  href="https://zoom.us/start/videomeeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  Start Zoom
                </a>
                <a
                  href="https://teams.microsoft.com/l/meeting/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  Start Teams
                </a>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Agenda / notes (optional)</Label>
            <Textarea id="description" name="description" />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <SubmitButton />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteMeetingButton({ meetingId }: { meetingId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Delete this meeting?")) return;
        setPending(true);
        await deleteMeeting(meetingId);
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function CheckInButton({
  meetingId,
  checkedIn,
}: {
  meetingId: string;
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={checkedIn ? "outline" : "default"}
      disabled={pending || checkedIn}
      onClick={async () => {
        setPending(true);
        await checkIn(meetingId);
        router.refresh();
      }}
    >
      <LogIn className="h-4 w-4" />
      {checkedIn ? "Checked in" : "Check in"}
    </Button>
  );
}

export function AttendanceSelect({
  meetingId,
  memberUserId,
  current,
}: {
  meetingId: string;
  memberUserId: string;
  current: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <select
      className={`${selectClass} h-8 w-32`}
      value={current}
      disabled={pending}
      onChange={async (e) => {
        setPending(true);
        await setAttendance(meetingId, memberUserId, e.target.value);
        router.refresh();
      }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0) + s.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}
