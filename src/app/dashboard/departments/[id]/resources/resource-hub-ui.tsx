"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  ExternalLink,
  Bookmark,
  ThumbsUp,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  submitResource,
  moderateManually,
  recordInteraction,
  saveProfile,
  type HubActionState,
} from "./actions";
import type { ResourceCard } from "@/lib/resource-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35";

const TYPES = [
  "LINK", "GITHUB", "YOUTUBE", "SOFTWARE", "TUTORIAL",
  "DOCUMENTATION", "PAPER", "DATASET", "TEMPLATE", "PDF", "OTHER",
];

const DIFF_STYLE: Record<string, string> = {
  BEGINNER: "bg-green-500/15 text-green-600",
  INTERMEDIATE: "bg-amber-500/15 text-amber-700",
  ADVANCED: "bg-rose-500/15 text-rose-600",
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Checking with AI…" : label}
    </Button>
  );
}

export function SubmitResourceForm({ departmentId }: { departmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<HubActionState, FormData>(
    async (prev, fd) => {
      const res = await submitResource(prev, fd);
      if (res?.status === "APPROVED") {
        setKey((k) => k + 1);
        router.refresh();
      }
      return res;
    },
    null,
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> Submit a resource
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form key={key} action={action} className="space-y-4">
          <input type="hidden" name="departmentId" value={departmentId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className={selectClass} defaultValue="LINK">
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Wokwi ESP32 simulator" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" name="url" placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Why is it useful? (optional)</Label>
            <Textarea id="note" name="note" rows={2} placeholder="Helps the AI evaluate it…" />
          </div>

          {state?.status === "APPROVED" && (
            <p className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> {state.success}
            </p>
          )}
          {state?.status === "PENDING" && (
            <p className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" /> {state.success}
            </p>
          )}
          {state?.status === "REJECTED" && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-rose-600">
                <XCircle className="h-4 w-4" /> Not accepted
              </p>
              <p className="mt-1 text-muted-foreground">{state.error}</p>
            </div>
          )}
          {state?.error && !state?.status && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex gap-2">
            <Submit label="Submit for AI review" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DifficultyBadge({ level }: { level: string | null }) {
  if (!level) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${DIFF_STYLE[level] ?? "bg-muted"}`}>
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  );
}

export function ResourceActions({ resource }: { resource: ResourceCard }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(type: "SAVE" | "HELPFUL") {
    setBusy(true);
    const res = await recordInteraction(resource.id, type);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => recordInteraction(resource.id, "VIEW")}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => act("SAVE")}
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
      >
        <Bookmark className="h-3.5 w-3.5" /> Save{resource.saves ? ` (${resource.saves})` : ""}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => act("HELPFUL")}
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
      >
        <ThumbsUp className="h-3.5 w-3.5" /> Helpful{resource.helpful ? ` (${resource.helpful})` : ""}
      </button>
    </div>
  );
}

export function ModerationRow({ resource }: { resource: ResourceCard }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    const res = await moderateManually(resource.id, decision, note);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{resource.title}</p>
          <p className="text-xs text-muted-foreground">
            {resource.type} · by {resource.submittedByName}
            {resource.url ? ` · ${resource.url}` : ""}
          </p>
          {resource.moderationReason && (
            <p className="mt-1 text-xs text-muted-foreground">AI note: {resource.moderationReason}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to the student…"
          className="h-9"
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => decide("APPROVED")}>
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("REJECTED")}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProfileForm({
  departmentId,
  profile,
}: {
  departmentId: string;
  profile: { modules: string[]; skills: string[]; goals: string };
}) {
  const router = useRouter();
  const [state, action] = useActionState<HubActionState, FormData>(
    async (prev, fd) => {
      const res = await saveProfile(departmentId, prev, fd);
      if (res?.success) router.refresh();
      return res;
    },
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="modules">Current modules (comma-separated)</Label>
        <Input id="modules" name="modules" defaultValue={profile.modules.join(", ")} placeholder="Embedded Systems, Signals" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skills">Skills you&apos;re learning</Label>
        <Input id="skills" name="skills" defaultValue={profile.skills.join(", ")} placeholder="PCB design, C, MATLAB" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goals">Project goals</Label>
        <Textarea id="goals" name="goals" rows={2} defaultValue={profile.goals} placeholder="Build an ESP32 weather station…" />
      </div>
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Submit label="Save & personalize" />
    </form>
  );
}
