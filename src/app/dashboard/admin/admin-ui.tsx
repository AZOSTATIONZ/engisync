"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  setAiEnabled,
  setUserPlan,
  setUserSystemRole,
  listUsers,
  listAuditLogs,
  type AdminState,
  type UserRow,
  type AuditRow,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// ── AI toggle ────────────────────────────────────────────────────────

export function AiToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const next = !on;
        setOn(next);
        const res = await setAiEnabled(next);
        setBusy(false);
        if (res?.error) {
          toast.error(res.error);
          setOn(!next);
        } else {
          toast.success(res?.success ?? "Updated");
          router.refresh();
        }
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// ── Plan form ────────────────────────────────────────────────────────

function SubmitPlan() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Saving…" : "Set plan"}
    </Button>
  );
}

export function SetPlanForm() {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [state, action] = useActionState<AdminState, FormData>(
    async (prev, fd) => {
      const res = await setUserPlan(prev, fd);
      if (res?.success) {
        toast.success(res.success);
        setKey((k) => k + 1);
        router.refresh();
      } else if (res?.error) toast.error(res.error);
      return res;
    },
    null,
  );

  return (
    <form key={key} action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="email">User email</Label>
        <Input id="email" name="email" type="email" required placeholder="student@uni.edu" className="w-56" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="plan">Plan</Label>
        <select id="plan" name="plan" className={selectClass} defaultValue="STUDENT_PREMIUM">
          <option value="FREE">Free</option>
          <option value="STUDENT_PREMIUM">Student Premium</option>
          <option value="UNIVERSITY">University</option>
        </select>
      </div>
      <SubmitPlan />
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

// ── User management ──────────────────────────────────────────────────

export function UserManagement() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, startTransition] = useTransition();

  const perPage = 20;

  const load = useCallback(
    (s: string, p: number) => {
      startTransition(async () => {
        const res = await listUsers(s, p, perPage);
        setUsers(res.users);
        setTotal(res.total);
      });
    },
    [],
  );

  useEffect(() => {
    load(search, page);
  }, [load, search, page]);

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await setUserSystemRole(userId, role);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(res?.success ?? "Updated");
      load(search, page);
      router.refresh();
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Plan</th>
              <th className="px-3 py-2 text-left font-medium">Department</th>
              <th className="px-3 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.systemRole}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="rounded border bg-background px-2 py-1 text-xs"
                  >
                    <option value="GUEST">Guest</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {u.plan.replace("_", " ")}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{u.department ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} user{total !== 1 ? "s" : ""} total
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit log viewer ─────────────────────────────────────────────────

export function AuditLogViewer() {
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, startTransition] = useTransition();

  const perPage = 30;

  const load = useCallback(
    (p: number) => {
      startTransition(async () => {
        const res = await listAuditLogs(p, undefined, perPage);
        setLogs(res.logs);
        setTotal(res.total);
      });
    },
    [],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">User</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No audit events recorded yet.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{l.userName ?? l.userId ?? "system"}</td>
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.action}</code>
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                  {l.target ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} events</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
