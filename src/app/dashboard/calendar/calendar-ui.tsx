"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Trash2 } from "lucide-react";
import { createEvent, deleteEvent, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export type Option = { id: string; label: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Add event"}
    </Button>
  );
}

export function AddEventForm({
  workspaces,
  defaultDate,
}: {
  workspaces: Option[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await createEvent(prev, fd);
      if (res?.success) {
        setOpen(false);
        router.refresh();
      }
      return res;
    },
    null,
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Add event
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Lab session" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className={selectClass} defaultValue="EVENT">
                <option value="EVENT">Event</option>
                <option value="MEETING">Meeting</option>
                <option value="DEADLINE">Deadline</option>
                <option value="REMINDER">Reminder</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time (optional)</Label>
              <Input id="startTime" name="startTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time (optional)</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" name="location" placeholder="Room / link" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace</Label>
              <select id="workspaceId" name="workspaceId" className={selectClass} defaultValue="">
                <option value="">Personal</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
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

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Delete this event?")) return;
        setPending(true);
        await deleteEvent(eventId);
        router.refresh();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return <span className="font-mono text-xl">Now</span>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  return (
    <span className="font-mono text-xl tabular-nums">
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:
      {String(secs).padStart(2, "0")}
    </span>
  );
}
