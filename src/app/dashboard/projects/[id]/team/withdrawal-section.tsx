"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, DoorOpen, X } from "lucide-react";
import {
  requestWithdrawal,
  cancelWithdrawal,
  leaderDecideWithdrawal,
  type WithdrawalState,
} from "./withdrawal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type WithdrawalInfo = {
  id: string;
  memberName: string;
  reason: string;
  status: "PENDING" | "LEADER_APPROVED";
  isMine: boolean;
  createdAt: string;
};

/**
 * Member side: replaces the instant "Leave group" button. Leaving is a
 * request, not an exit — the member stays (and stays responsible) until it's
 * approved.
 */
export function RequestWithdrawal({
  workspaceId,
  myRequest,
}: {
  workspaceId: string;
  myRequest: WithdrawalInfo | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<WithdrawalState>) {
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else if (res?.success) {
        toast.success(res.success);
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (myRequest) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
        <p className="font-medium">
          {myRequest.status === "PENDING"
            ? "Your withdrawal request is with the leader."
            : "Leader approved — waiting for supervisor confirmation."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You remain a member (and keep your responsibilities) until it&apos;s
          approved.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={pending}
          onClick={() => run(() => cancelWithdrawal(myRequest.id))}
        >
          Cancel request — I&apos;m staying
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <DoorOpen className="mr-1.5 h-4 w-4" />
        Request to leave group
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-lg border p-3"
      action={() => {
        const fd = new FormData();
        fd.set("reason", reason);
        run(() => requestWithdrawal(workspaceId, null, fd));
      }}
    >
      <p className="text-sm font-medium">Request to leave this group</p>
      <p className="text-xs text-muted-foreground">
        Your leader{" "}
        {"—"} and supervisor, if this group is in a department {"—"}{" "}
        must approve. You can&apos;t leave while tasks are still assigned to
        you.
      </p>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Why are you leaving? Your leader and supervisor will see this."
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Leader side: the pending queue. */
export function WithdrawalQueue({ requests }: { requests: WithdrawalInfo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<WithdrawalState>) {
    setBusy(id);
    const res = await fn();
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else if (res?.success) {
      toast.success(res.success);
      router.refresh();
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING" && !r.isMine);
  if (pending.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-sm font-medium">Withdrawal requests</p>
      {pending.map((r) => (
        <div key={r.id} className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">{r.memberName} wants to leave</p>
          <p className="mt-1 text-xs text-muted-foreground">
            &ldquo;{r.reason}&rdquo; ·{" "}
            {new Date(r.createdAt).toLocaleDateString()}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={busy === r.id}
              onClick={() => run(r.id, () => leaderDecideWithdrawal(r.id, true, ""))}
            >
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === r.id}
              onClick={() => {
                const reason = prompt("Why not? The member will see this.", "");
                if (!reason) return;
                run(r.id, () => leaderDecideWithdrawal(r.id, false, reason));
              }}
            >
              <X className="mr-1 h-4 w-4" /> Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
