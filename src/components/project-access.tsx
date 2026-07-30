"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, GraduationCap, ShieldCheck, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  grantProjectAccess,
  revokeProjectAccess,
} from "@/app/dashboard/projects/[id]/team/grant-actions";

export type GrantRow = {
  id: string;
  userId: string;
  name: string;
  role: string;
  active: boolean;
  grantedByName: string;
  createdAt: string;
  revokedAt: string | null;
};

export type EligiblePerson = {
  id: string;
  name: string;
  isDepartmentAdmin: boolean;
};

/**
 * Who outside the team can see this project.
 *
 * This panel exists because supervision used to be invisible. A supervisor —
 * or any department admin — could read a team's work with no record of it and
 * no way for the team to know, let alone object. Access is now something the
 * team can see and withdraw, which is what makes "private by default" a claim
 * the product can actually stand behind.
 */
export function ProjectAccess({
  workspaceId,
  grants,
  eligible,
  canInvite,
}: {
  workspaceId: string;
  grants: GrantRow[];
  eligible: EligiblePerson[];
  canInvite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState("");
  const [role, setRole] = useState("SUPERVISOR");

  const active = grants.filter((g) => g.active);
  const past = grants.filter((g) => !g.active);

  async function invite() {
    if (!picked) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("userId", picked);
    fd.set("role", role);
    const res = await grantProjectAccess(workspaceId, null, fd);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      setPicked("");
    }
    router.refresh();
  }

  async function revoke(grantId: string) {
    setBusy(true);
    const res = await revokeProjectAccess(workspaceId, grantId);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {active.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Nobody outside the team can see this project. It stays that way until
          you invite someone.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              {g.role === "SUPERVISOR" ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-semibold uppercase text-muted-foreground">
                {g.role === "SUPERVISOR" ? "Supervisor" : "Lecturer"}
              </span>
              <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                <Eye className="h-3 w-3" /> read-only
              </span>
              {canInvite && (
                <button
                  type="button"
                  disabled={busy}
                  title="Withdraw access"
                  onClick={() => revoke(g.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canInvite && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Everyone available in this department has already been invited.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                aria-label="Person to invite"
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Invite someone to observe…</option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isDepartmentAdmin ? " (dept admin)" : ""}
                  </option>
                ))}
              </select>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Access role"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="SUPERVISOR">Supervisor</option>
                <option value="LECTURER">Lecturer</option>
              </select>
              <Button size="sm" disabled={busy || !picked} onClick={invite}>
                <UserPlus className="h-4 w-4" /> Invite
              </Button>
            </div>
          )}
          <p className="text-[0.7rem] text-muted-foreground">
            Invited staff get read-only access. Only a supervisor can sign off
            your report and approve publication.
          </p>
        </div>
      )}

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Past access ({past.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {past.map((g) => (
              <li key={g.id} className="text-xs text-muted-foreground">
                {g.name} — withdrawn{" "}
                {g.revokedAt
                  ? new Date(g.revokedAt).toLocaleDateString("en-GB")
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
