"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "./session-actions";

/**
 * Two-step, because this logs the user out of the device they are holding.
 *
 * A single click would be a trap: the label promises something about OTHER
 * devices, and the immediate consequence is losing the session in front of
 * you. Naming that outcome before it happens is the difference between a
 * security control and a surprise.
 */
export function SignOutEverywhere() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        <LogOut className="h-4 w-4" /> Sign out everywhere
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Sign out on all devices, including this one?</span>
      <Button
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOutEverywhere();
        }}
      >
        {busy ? "Signing out…" : "Yes, sign out"}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
