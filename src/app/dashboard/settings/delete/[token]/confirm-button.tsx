"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmAccountDeletion } from "../../account-actions";

export function ConfirmDeleteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="destructive"
      disabled={busy}
      className="w-full sm:w-auto"
      onClick={async () => {
        setBusy(true);
        const res = await confirmAccountDeletion(token);
        setBusy(false);
        // On success the action signs out and redirects, so we only land here
        // when something went wrong.
        if (res?.error) toast.error(res.error);
      }}
    >
      <Trash2 className="h-4 w-4" />
      {busy ? "Deleting…" : "Yes, delete permanently"}
    </Button>
  );
}
