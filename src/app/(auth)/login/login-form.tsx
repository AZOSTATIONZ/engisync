"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { preLogin } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [needCode, setNeedCode] = React.useState(false);
  const [code, setCode] = React.useState("");

  async function finishSignIn() {
    const res = await signIn("credentials", {
      email,
      password,
      code,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(needCode ? "Invalid 2FA code." : "Invalid email or password.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (needCode) {
      await finishSignIn();
      return;
    }

    const pre = await preLogin(email, password);
    if (!pre.ok) {
      setLoading(false);
      setError(pre.error ?? "Invalid email or password.");
      return;
    }
    if (pre.twoFactorRequired) {
      setLoading(false);
      setNeedCode(true);
      return;
    }
    await finishSignIn();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() =>
            signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })
          }
        >
          Continue with Microsoft
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or with email
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={needCode}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={needCode}
          />
        </div>
        {needCode && (
          <div className="space-y-2">
            <Label htmlFor="code">Authenticator code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the code from your authenticator app.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : needCode ? "Verify & log in" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
