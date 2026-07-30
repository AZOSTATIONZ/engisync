"use client";

import { useState } from "react";
import { joinViaInvite } from "@/app/dashboard/projects/access-actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await joinViaInvite(token);
          // On success the action redirects; only errors return here.
          if (res?.error) {
            setError(res.error);
            setBusy(false);
          }
        }}
      >
        {busy ? "Joining…" : "Accept invite & join"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
