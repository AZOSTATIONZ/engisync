"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import {
  startTwoFactorSetup,
  confirmTwoFactor,
  disableTwoFactor,
} from "./twofactor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TwoFactor({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function begin() {
    setBusy(true);
    setErr(null);
    const res = await startTwoFactorSetup();
    setBusy(false);
    if (res?.qr && res.secret) setSetup({ qr: res.qr, secret: res.secret });
    else setErr(res?.error ?? "Could not start setup.");
  }

  async function confirm() {
    setBusy(true);
    setErr(null);
    const res = await confirmTwoFactor(code);
    setBusy(false);
    if (res?.success) {
      setOn(true);
      setSetup(null);
      setCode("");
      setMsg(res.success);
    } else setErr(res?.error ?? "Could not enable 2FA.");
  }

  async function turnOff() {
    setBusy(true);
    setErr(null);
    const res = await disableTwoFactor(code);
    setBusy(false);
    if (res?.success) {
      setOn(false);
      setCode("");
      setMsg(res.success);
    } else setErr(res?.error ?? "Could not disable 2FA.");
  }

  if (on) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-green-600">
          <ShieldCheck className="h-4 w-4" /> Two-factor authentication is on.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="off-code">Enter a code to disable</Label>
            <Input
              id="off-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              className="w-40"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button size="sm" variant="destructive" disabled={busy} onClick={turnOff}>
            Disable 2FA
          </Button>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </div>
    );
  }

  if (setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with an authenticator app (Google Authenticator,
          Authy, 1Password…), then enter the 6-digit code to confirm.
        </p>
        <div className="inline-block rounded-lg border bg-white p-2">
          <Image src={setup.qr} alt="2FA QR code" width={160} height={160} unoptimized />
        </div>
        <p className="text-xs text-muted-foreground">
          Can&apos;t scan? Enter this key manually:{" "}
          <code className="rounded bg-muted px-1 py-0.5">{setup.secret}</code>
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="on-code">Confirmation code</Label>
            <Input
              id="on-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              className="w-40"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button size="sm" disabled={busy} onClick={confirm}>
            Confirm & enable
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Add a second step at login using an authenticator app.
      </p>
      <Button size="sm" disabled={busy} onClick={begin}>
        {busy ? "…" : "Enable 2FA"}
      </Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  );
}
