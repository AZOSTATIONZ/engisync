"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import {
  createDepartment,
  joinDepartment,
  leaveDepartment,
  postAnnouncement,
  deleteAnnouncement,
  setMemberRole,
  removeMember,
  assignSupervisorToProject,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const selectClass =
  "flex h-8 w-28 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function JoinLeaveButton({
  departmentId,
  isMember,
  isAdmin,
}: {
  departmentId: string;
  isMember: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAdmin) {
    return (
      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
        Department admin
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={isMember ? "outline" : "default"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = isMember
            ? await leaveDepartment(departmentId)
            : await joinDepartment(departmentId);
          setBusy(false);
          if (res?.error) setError(res.error);
          else router.refresh();
        }}
      >
        {busy ? "…" : isMember ? "Leave" : "Join"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create department"}
    </Button>
  );
}

export function CreateDepartmentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await createDepartment(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1);
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
        <Plus className="h-4 w-4" /> New department
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form key={key} action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Electrical Engineering" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required placeholder="EE" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
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

export function AnnouncementForm({ departmentId }: { departmentId: string }) {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await postAnnouncement(prev, fd);
      if (res?.success) {
        setKey((k) => k + 1);
        router.refresh();
      }
      return res;
    },
    null,
  );

  return (
    <form key={key} action={action} className="space-y-3">
      <input type="hidden" name="departmentId" value={departmentId} />
      <div className="space-y-2">
        <Label htmlFor="a-title">Title</Label>
        <Input id="a-title" name="title" required placeholder="e.g. Semester project briefing" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="a-body">Message</Label>
        <Textarea id="a-body" name="body" required rows={3} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm">
        <Megaphone className="h-4 w-4" /> Post announcement
      </Button>
    </form>
  );
}

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this announcement?")) return;
        setBusy(true);
        await deleteAnnouncement(id);
        router.refresh();
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function MemberAdminControls({
  departmentId,
  userId,
  role,
}: {
  departmentId: string;
  userId: string;
  role: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ error?: string; success?: string } | null>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <select
        className={selectClass}
        value={role}
        disabled={busy}
        onChange={(e) => run(() => setMemberRole(departmentId, userId, e.target.value))}
      >
        <option value="MEMBER">Member</option>
        <option value="SUPERVISOR">Supervisor</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => {
          if (!confirm("Remove this member from the department?")) return;
          run(() => removeMember(departmentId, userId));
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// ── Supervisor assignment (chairperson) ─────────────────────────────

export function SupervisorAssignmentCard({
  departmentId,
  projects,
  supervisors,
}: {
  departmentId: string;
  projects: { id: string; name: string; memberCount: number }[];
  supervisors: { id: string; name: string; projects: { id: string; name: string }[] }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});

  async function assign(projectId: string) {
    const supervisorId = selected[projectId];
    if (!supervisorId) return;
    setBusy(true);
    const res = await assignSupervisorToProject(departmentId, projectId, supervisorId);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All projects in this department have a supervisor assigned.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.memberCount} members</p>
          </div>
          <select
            className={selectClass + " w-40"}
            value={selected[p.id] ?? ""}
            onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.value }))}
            disabled={busy}
          >
            <option value="">Select supervisor…</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.projects.length} projects)
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={busy || !selected[p.id]}
            onClick={() => assign(p.id)}
          >
            Assign
          </Button>
        </div>
      ))}
    </div>
  );
}
