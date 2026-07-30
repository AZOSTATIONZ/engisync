"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createWorkspace,
  joinWorkspace,
  type ActionState,
  type CreateWorkspaceState,
} from "./access-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_TEMPLATES } from "@/lib/templates";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function CreateWorkspaceForm({
  departments = [],
  supervisorsByDepartment = {},
  seedName,
  seedDescription,
}: {
  departments?: { id: string; label: string }[];
  /** Staff invitable per department, so the picker follows the chosen one. */
  supervisorsByDepartment?: Record<string, { id: string; name: string }[]>;
  /** Pre-filled when arriving from a Project Hub brief. Still editable. */
  seedName?: string;
  seedDescription?: string;
}) {
  const [state, action] = useActionState<CreateWorkspaceState, FormData>(
    createWorkspace,
    null,
  );
  const hasDuplicates = !!state?.duplicates?.length;

  // The supervisor list depends on which department is chosen, so it is tracked
  // in state rather than read off the form at submit time.
  const [departmentId, setDepartmentId] = useState(
    departments.length === 1 ? departments[0].id : "",
  );
  const supervisors = supervisorsByDepartment[departmentId] ?? [];

  if (departments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Join a department first — groups are created inside a department. Head to{" "}
        <Link href="/dashboard/departments" className="font-medium text-primary hover:underline">
          Departments
        </Link>{" "}
        to join one.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Final Year Robotics Project"
          defaultValue={seedName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="departmentId">Department</Label>
        <select
          id="departmentId"
          name="departmentId"
          required
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Choose a department…
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="supervisorId">Supervisor (optional)</Label>
        <select
          id="supervisorId"
          name="supervisorId"
          defaultValue=""
          disabled={!departmentId || supervisors.length === 0}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <option value="">No supervisor yet</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {!departmentId
            ? "Choose a department first."
            : supervisors.length === 0
              ? "No supervisors listed in this department yet — you can invite one later from the Team tab."
              : "Your project is private to its members. The supervisor you pick gets read-only access, and you can change this at any time."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Starter template (optional)</Label>
        <select
          id="template"
          name="template"
          defaultValue="blank"
          className={selectClass}
        >
          {PROJECT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.description}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Seeds milestones and deliverables you can edit later.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Short summary of the project…"
          defaultValue={seedDescription}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pin">Join PIN (optional)</Label>
        <Input
          id="pin"
          name="pin"
          inputMode="numeric"
          placeholder="4–6 digits"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Members must enter this PIN alongside the join code.
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      {hasDuplicates && (
        <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium">
            You are already participating in the following project(s):
          </p>
          <ul className="space-y-2">
            {state!.duplicates!.map((g) => (
              <li key={g.id} className="rounded-md border bg-background p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{g.name}</span>
                  <Link
                    href={`/dashboard/projects/${g.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Open / leave
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  {g.department ?? "No department"} · {g.role} · joined{" "}
                  {new Date(g.joinedAt).toLocaleDateString("en-GB")} · {g.status}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            You can still create another group if your university allows it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="intent" value="continue" size="sm">
              Continue with new group
            </Button>
            <Button
              type="submit"
              name="intent"
              value="notify"
              size="sm"
              variant="outline"
            >
              Notify my supervisor
            </Button>
          </div>
        </div>
      )}

      {!hasDuplicates && <SubmitButton label="Create group" />}
    </form>
  );
}

export function JoinWorkspaceForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    joinWorkspace,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="joinCode">Join code</Label>
        <Input
          id="joinCode"
          name="joinCode"
          placeholder="e.g. ENGI2026"
          defaultValue={defaultCode}
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="join-pin">PIN (if required)</Label>
        <Input
          id="join-pin"
          name="pin"
          inputMode="numeric"
          placeholder="4–6 digits"
          autoComplete="off"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton label="Join project" />
    </form>
  );
}
