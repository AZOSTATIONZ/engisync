"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Clock, Play, Plus, Square, Trash2 } from "lucide-react";
import {
  createTask,
  changeTaskStatus,
  logTime,
  deleteTask,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  estimatedMinutes: number | null;
  loggedMinutes: number;
  workspaceName: string | null;
  assigneeName: string | null;
  dependsOn: { id: string; title: string; status: string }[];
};

export type Option = { id: string; label: string };

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  HIGH: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  URGENT: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtMinutes(m: number) {
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h}h ${min}m` : `${min}m`;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(d));
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function NewTaskForm({
  workspaces,
  assignees,
  tasks,
}: {
  workspaces: Option[];
  assignees: Option[];
  tasks: Option[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await createTask(prev, fd);
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
        <Plus className="h-4 w-4" /> New task
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Design PCB schematic" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" className={selectClass} defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClass} defaultValue="TODO">
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence">Repeat</Label>
              <select id="recurrence" name="recurrence" className={selectClass} defaultValue="NONE">
                <option value="NONE">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Estimate (minutes)</Label>
              <Input id="estimatedMinutes" name="estimatedMinutes" type="number" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace</Label>
              <select id="workspaceId" name="workspaceId" className={selectClass} defaultValue="">
                <option value="">Personal (no workspace)</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigneeId">Assign to</Label>
              <select id="assigneeId" name="assigneeId" className={selectClass} defaultValue="">
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Depends on (optional)</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {tasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="dependsOn" value={t.id} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <SubmitButton label="Create task" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LogTime({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await logTime(prev, fd);
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Clock className="h-4 w-4" /> Log time
      </Button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <Input
        name="minutes"
        type="number"
        min="1"
        placeholder="min"
        className="h-8 w-20"
        required
      />
      <Button type="submit" size="sm">Save</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        ✕
      </Button>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

function TaskTimer({ taskId }: { taskId: string }) {
  const router = useRouter();
  const storageKey = `engisync-timer-${taskId}`;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  // Resume a running timer after refresh.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setStartedAt(parseInt(saved, 10));
  }, [storageKey]);

  // Tick while running.
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  function start() {
    const ts = Date.now();
    localStorage.setItem(storageKey, String(ts));
    setNow(ts);
    setStartedAt(ts);
  }

  async function stop() {
    if (startedAt === null) return;
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = Math.max(1, Math.round(elapsedSec / 60));
    localStorage.removeItem(storageKey);
    setStartedAt(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("minutes", String(minutes));
    await logTime(null, fd);
    setSaving(false);
    router.refresh();
  }

  if (startedAt === null) {
    return (
      <Button variant="ghost" size="sm" onClick={start} disabled={saving}>
        <Play className="h-4 w-4" /> {saving ? "Saving…" : "Start timer"}
      </Button>
    );
  }

  const elapsed = Math.floor((now - startedAt) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums text-primary">
        {h > 0 && `${h}:`}
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      <Button variant="destructive" size="sm" onClick={stop}>
        <Square className="h-3.5 w-3.5" /> Stop
      </Button>
    </div>
  );
}

export function TaskItem({ task }: { task: TaskDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const blocked = task.dependsOn.some((d) => d.status !== "DONE");

  return (
    <Card className={task.status === "DONE" ? "opacity-60" : ""}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>
              <p className={`font-medium ${task.status === "DONE" ? "line-through" : ""}`}>
                {task.title}
              </p>
            </div>
            {task.description && (
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {task.workspaceName && <span>📁 {task.workspaceName}</span>}
              {task.assigneeName && <span>👤 {task.assigneeName}</span>}
              {task.dueDate && <span>📅 {fmtDate(task.dueDate)}</span>}
              {task.recurrence !== "NONE" && <span>🔁 {task.recurrence.toLowerCase()}</span>}
              <span>
                ⏱ {fmtMinutes(task.loggedMinutes)}
                {task.estimatedMinutes ? ` / ${fmtMinutes(task.estimatedMinutes)}` : ""}
              </span>
            </div>
            {blocked && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Blocked by: {task.dependsOn.filter((d) => d.status !== "DONE").map((d) => d.title).join(", ")}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this task?")) return;
              start(async () => {
                await deleteTask(task.id);
                router.refresh();
              });
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className={`${selectClass} h-8 w-auto`}
            value={task.status}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                await changeTaskStatus(task.id, e.target.value);
                router.refresh();
              })
            }
          >
            {Object.entries(STATUS_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <LogTime taskId={task.id} />
          <TaskTimer taskId={task.id} />
        </div>
      </CardContent>
    </Card>
  );
}
