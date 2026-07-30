"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, CheckCircle2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  submitReport,
  approveReport,
  approveCompletion,
} from "./actions";

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (
    fn: () => Promise<{ error?: string; success?: string } | null>,
  ) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else if (res?.success) toast.success(res.success);
    router.refresh();
  };
  return { busy, run };
}

/** Leader/member: snapshot a new report version. */
export function SubmitReportButton({ workspaceId }: { workspaceId: string }) {
  const { busy, run } = useRun();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" /> Submit report version
      </Button>
    );
  }
  return (
    <div className="w-full max-w-md space-y-2 rounded-md border p-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What changed in this version? (optional)"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await submitReport(workspaceId, note);
              if (!r?.error) {
                setNote("");
                setOpen(false);
              }
              return r;
            })
          }
        >
          {busy ? "Submitting…" : "Submit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Supervisor: approve final report + project completion. */
export function ApprovalButtons({
  workspaceId,
  approved,
  completionApproved,
}: {
  workspaceId: string;
  approved: boolean;
  completionApproved: boolean;
}) {
  const { busy, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={approved ? "outline" : "default"}
        disabled={busy || approved}
        onClick={() => run(() => approveReport(workspaceId))}
      >
        <CheckCircle2 className="h-4 w-4" />
        {approved ? "Report approved" : "Approve final report"}
      </Button>
      <Button
        size="sm"
        variant={completionApproved ? "outline" : "default"}
        disabled={busy || completionApproved}
        onClick={() => run(() => approveCompletion(workspaceId))}
      >
        <Award className="h-4 w-4" />
        {completionApproved ? "Completion approved" : "Approve completion"}
      </Button>
    </div>
  );
}
