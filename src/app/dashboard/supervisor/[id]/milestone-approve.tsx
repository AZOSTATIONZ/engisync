"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { approveMilestone } from "@/app/dashboard/workspaces/[id]/documentation/actions";

export function MilestoneApproveButton({
  milestoneId,
  approved,
}: {
  milestoneId: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (approved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await approveMilestone(milestoneId);
        setBusy(false);
        if (res?.error) toast.error(res.error);
        else if (res?.success) toast.success(res.success);
        router.refresh();
      }}
      className="rounded-md border px-2 py-0.5 text-xs hover:bg-accent disabled:opacity-50"
    >
      {busy ? "…" : "Approve"}
    </button>
  );
}
