"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import {
  supervisorConfirmWithdrawal,
  type WithdrawalState,
} from "../../workspaces/[id]/withdrawal-actions";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  memberName: string;
  reason: string;
  leaderNote: string | null;
  createdAt: string;
};

/**
 * The supervisor's final say on a withdrawal. By the time a request reaches
 * here the leader has already agreed and the open-task check has passed —
 * the supervisor is confirming the academic side (does this affect grading,
 * group viability, assessment records).
 */
export function WithdrawalConfirm({ items }: { items: Item[] }) {
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

  if (items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-sm font-medium">
        Withdrawals awaiting your confirmation
      </p>
      {items.map((w) => (
        <div key={w.id} className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">{w.memberName} wants to leave</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Member&apos;s reason: &ldquo;{w.reason}&rdquo;
          </p>
          {w.leaderNote && (
            <p className="text-xs text-muted-foreground">
              Leader&apos;s note: {w.leaderNote}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={busy === w.id}
              onClick={() =>
                run(w.id, () => supervisorConfirmWithdrawal(w.id, true, ""))
              }
            >
              <Check className="mr-1 h-4 w-4" /> Confirm removal
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === w.id}
              onClick={() => {
                const reason = prompt(
                  "Why should this member stay? Both the member and leader will see this.",
                  "",
                );
                if (!reason) return;
                run(w.id, () => supervisorConfirmWithdrawal(w.id, false, reason));
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
