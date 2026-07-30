"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setDocumentLock } from "@/app/dashboard/projects/[id]/document/actions";

export function DocumentLockToggle({
  workspaceId,
  locked,
}: {
  workspaceId: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant={locked ? "default" : "outline"}
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await setDocumentLock(workspaceId, !locked);
        setBusy(false);
        if (res?.error) toast.error(res.error);
        else if (res?.success) toast.success(res.success);
        router.refresh();
      }}
    >
      {locked ? (
        <>
          <Unlock className="h-4 w-4" /> Unlock editing
        </>
      ) : (
        <>
          <Lock className="h-4 w-4" /> Lock editing
        </>
      )}
    </Button>
  );
}
