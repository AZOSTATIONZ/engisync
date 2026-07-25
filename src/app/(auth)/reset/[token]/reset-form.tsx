"use client";

import * as React from "react";
import Link from "next/link";
import { resetPassword, type ResetState } from "../../forgot/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordStrength,
  evaluatePassword,
  meetsRequirements,
} from "@/components/password-strength";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [state, setState] = React.useState<ResetState>(null);
  const [loading, setLoading] = React.useState(false);

  const reqsMet = meetsRequirements(evaluatePassword(password));
  const matches = confirm.length > 0 && password === confirm;
  const canSubmit = reqsMet && matches && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("password", password);
    fd.set("confirmPassword", confirm);
    const res = await resetPassword(null, fd);
    setState(res);
    setLoading(false);
  }

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-green-600">{state.success}</p>
        <Button asChild className="w-full">
          <Link href="/login">Go to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength value={password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput
          id="confirm"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {confirm.length > 0 && !matches && (
          <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {loading ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
