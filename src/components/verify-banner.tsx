"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { resendVerification } from "@/app/dashboard/verify-actions";
import { Button } from "@/components/ui/button";

export function VerifyBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10">
      <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span className="flex items-center gap-2">
          <MailWarning className="h-4 w-4 text-amber-600" />
          Please verify your email address.
          {msg && <span className="text-muted-foreground">· {msg}</span>}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await resendVerification();
              setMsg(res?.success ?? res?.error ?? null);
              setBusy(false);
            }}
          >
            {busy ? "Sending…" : "Resend email"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
