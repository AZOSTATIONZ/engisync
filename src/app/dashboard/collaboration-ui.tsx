"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Handshake, X } from "lucide-react";
import {
  requestCollaboration,
  approveCollaboration,
  rejectCollaboration,
  removeCollaboration,
  type CollabState,
} from "./collaboration-actions";
import { Button } from "@/components/ui/button";

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RequestCollaborationForm({
  workspaceId,
  departments,
}: {
  workspaceId: string;
  departments: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [dept, setDept] = useState("");
  const [pending, start] = useTransition();
  const [state, setState] = useState<CollabState>(null);

  if (departments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No other departments available to invite.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={dept}
        onChange={(e) => setDept(e.target.value)}
      >
        <option value="">Choose a department…</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.label}</option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!dept || pending}
        onClick={() =>
          start(async () => {
            const res = await requestCollaboration(workspaceId, dept);
            setState(res);
            if (res?.success) {
              setDept("");
              router.refresh();
            }
          })
        }
      >
        <Handshake className="h-4 w-4" /> Request
      </Button>
      {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-green-600">{state.success}</p>}
    </div>
  );
}

export function CollaborationRequestRow({
  collabId,
  workspaceName,
  fromDepartment,
}: {
  collabId: string;
  workspaceName: string;
  fromDepartment: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function act(fn: () => Promise<CollabState>) {
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else if (res?.success) toast.success(res.success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{workspaceName}</p>
        {fromDepartment && (
          <p className="text-xs text-muted-foreground">from {fromDepartment}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => act(() => approveCollaboration(collabId))}
        >
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={pending}
          onClick={() => act(() => rejectCollaboration(collabId))}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function RemoveCollaborationButton({ collabId }: { collabId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this collaboration?")) return;
        start(async () => {
          await removeCollaboration(collabId);
          router.refresh();
        });
      }}
    >
      <X className="h-4 w-4 text-destructive" />
    </Button>
  );
}
