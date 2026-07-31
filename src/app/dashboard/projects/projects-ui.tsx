"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  setProjectInfo,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
  addRisk,
  deleteRisk,
  addDeliverable,
  toggleDeliverable,
  deleteDeliverable,
  setTargetDate,
  type ProjectState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function useToastAction(fn: (p: ProjectState, fd: FormData) => Promise<ProjectState>) {
  const router = useRouter();
  return useActionState<ProjectState, FormData>(async (prev, fd) => {
    const res = await fn(prev, fd);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
    return res;
  }, null);
}

export function ProjectInfoForm({
  workspaceId,
  objectives,
  scope,
}: {
  workspaceId: string;
  objectives: string | null;
  scope: string | null;
}) {
  const [state, action] = useToastAction(setProjectInfo.bind(null, workspaceId));
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="objectives">Objectives</Label>
        <Textarea id="objectives" name="objectives" rows={2} defaultValue={objectives ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="scope">Scope</Label>
        <Textarea id="scope" name="scope" rows={2} defaultValue={scope ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SaveBtn label="Save" />
    </form>
  );
}

/**
 * Target end date — the input that turns "which stage are we at?" into
 * "are we behind?". Deliberately optional: a project without a date still
 * gets stall detection, just not schedule comparison.
 */
export function TargetDateForm({
  workspaceId,
  targetEndDate,
}: {
  workspaceId: string;
  targetEndDate: string;
}) {
  const [state, action] = useToastAction(setTargetDate.bind(null, workspaceId));
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="targetEndDate" className="text-xs">
          Target completion date
        </Label>
        <Input
          id="targetEndDate"
          name="targetEndDate"
          type="date"
          defaultValue={targetEndDate}
          className="h-9 w-44"
        />
      </div>
      <SaveBtn label="Save date" />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

function ToggleDelRow({
  label,
  done,
  extra,
  onToggle,
  onDelete,
}: {
  label: string;
  done: boolean;
  extra?: React.ReactNode;
  onToggle: () => Promise<ProjectState>;
  onDelete: () => Promise<ProjectState>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<ProjectState>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    router.refresh();
  }
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(onToggle)}
        className="flex min-w-0 items-center gap-2 text-left"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${done ? "border-green-500 bg-green-500 text-white" : "border-input"}`}
        >
          {done && <Check className="h-3 w-3" />}
        </span>
        <span className={`truncate text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
          {label}
        </span>
        {extra}
      </button>
      <Button variant="ghost" size="icon" disabled={busy} onClick={() => run(onDelete)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

export function MilestoneManager({
  workspaceId,
  isLeader,
  items,
}: {
  workspaceId: string;
  isLeader: boolean;
  items: { id: string; title: string; dueDate: string | null; done: boolean }[];
}) {
  const [state, action] = useToastAction(addMilestone.bind(null, workspaceId));
  return (
    <div className="space-y-3">
      {isLeader && (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <Input name="title" placeholder="Milestone" className="h-9 w-48" required />
          <Input name="dueDate" type="date" className="h-9 w-40" />
          <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Add</Button>
          {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet — these are the dates your supervisor checks progress against.</p>
      ) : (
        <ul className="divide-y">
          {items.map((m) =>
            isLeader ? (
              <ToggleDelRow
                key={m.id}
                label={m.title}
                done={m.done}
                extra={m.dueDate && <span className="text-xs text-muted-foreground">· {new Date(m.dueDate).toLocaleDateString("en-GB")}</span>}
                onToggle={() => toggleMilestone(m.id)}
                onDelete={() => deleteMilestone(m.id)}
              />
            ) : (
              <li key={m.id} className="flex items-center gap-2 py-2 text-sm">
                <span className={m.done ? "text-green-600" : "text-muted-foreground"}>{m.done ? "✓" : "○"}</span>
                <span className={m.done ? "line-through" : ""}>{m.title}</span>
                {m.dueDate && <span className="text-xs text-muted-foreground">· {new Date(m.dueDate).toLocaleDateString("en-GB")}</span>}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

export function DeliverableManager({
  workspaceId,
  isLeader,
  items,
}: {
  workspaceId: string;
  isLeader: boolean;
  items: { id: string; title: string; done: boolean }[];
}) {
  const [state, action] = useToastAction(addDeliverable.bind(null, workspaceId));
  return (
    <div className="space-y-3">
      {isLeader && (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <Input name="title" placeholder="Deliverable" className="h-9 w-56" required />
          <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Add</Button>
          {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliverables yet — the things you must hand in, listed so nothing is missed at submission.</p>
      ) : (
        <ul className="divide-y">
          {items.map((d) =>
            isLeader ? (
              <ToggleDelRow
                key={d.id}
                label={d.title}
                done={d.done}
                onToggle={() => toggleDeliverable(d.id)}
                onDelete={() => deleteDeliverable(d.id)}
              />
            ) : (
              <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                <span className={d.done ? "text-green-600" : "text-muted-foreground"}>{d.done ? "✓" : "○"}</span>
                <span className={d.done ? "line-through" : ""}>{d.title}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

export function RiskManager({
  workspaceId,
  isLeader,
  items,
}: {
  workspaceId: string;
  isLeader: boolean;
  items: { id: string; title: string; severity: string; mitigation: string | null }[];
}) {
  const router = useRouter();
  const [state, action] = useToastAction(addRisk.bind(null, workspaceId));
  const [busy, setBusy] = useState(false);
  const color: Record<string, string> = {
    LOW: "text-muted-foreground",
    MEDIUM: "text-amber-600",
    HIGH: "text-red-600",
  };
  return (
    <div className="space-y-3">
      {isLeader && (
        <form action={action} className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <Input name="title" placeholder="Risk" className="h-9 w-48" required />
            <select name="severity" className={selectClass} defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <Input name="mitigation" placeholder="Mitigation (optional)" className="h-9 w-56" />
            <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Add</Button>
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        </form>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No risks logged.</p>
      ) : (
        <ul className="divide-y">
          {items.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {r.title}{" "}
                  <span className={`text-xs ${color[r.severity]}`}>· {r.severity}</span>
                </p>
                {r.mitigation && (
                  <p className="text-xs text-muted-foreground">Mitigation: {r.mitigation}</p>
                )}
              </div>
              {isLeader && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await deleteRisk(r.id);
                    setBusy(false);
                    router.refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
