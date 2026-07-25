"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, RefreshCw, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  regenerateJoinCode,
  removeMember,
  leaveWorkspace,
  deleteWorkspace,
} from "../actions";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function RegenerateCodeButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await regenerateJoinCode(workspaceId);
            if (res?.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        <RefreshCw className="h-4 w-4" />
        {pending ? "Regenerating…" : "New code"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function RemoveMemberButton({
  workspaceId,
  memberUserId,
  memberName,
}: {
  workspaceId: string;
  memberUserId: string;
  memberName: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${memberName} from this workspace?`)) return;
        start(async () => {
          await removeMember(workspaceId, memberUserId);
          router.refresh();
        });
      }}
    >
      <UserX className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function LeaveWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Leave this workspace?")) return;
          start(async () => {
            const res = await leaveWorkspace(workspaceId);
            if (res?.error) setError(res.error);
          });
        }}
      >
        <LogOut className="h-4 w-4" />
        Leave
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this workspace? This cannot be undone.")) return;
          start(async () => {
            const res = await deleteWorkspace(workspaceId);
            if (res?.error) setError(res.error);
          });
        }}
      >
        <Trash2 className="h-4 w-4" />
        {pending ? "Deleting…" : "Delete workspace"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
