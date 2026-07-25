"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { generateEvaluation } from "./actions";
import { Button } from "@/components/ui/button";

export function GenerateEvaluationButton({
  workspaceId,
  label = "Run AI evaluation",
}: {
  workspaceId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await generateEvaluation(workspaceId);
        setBusy(false);
        if (res?.error) toast.error(res.error);
        else {
          toast.success(res?.success ?? "Done");
          router.refresh();
        }
      }}
    >
      <Sparkles className="h-4 w-4" />
      {busy ? "Analyzing project…" : label}
    </Button>
  );
}
