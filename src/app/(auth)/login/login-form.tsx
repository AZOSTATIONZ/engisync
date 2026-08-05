"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { preLogin } from "./actions";

/** Inline brand SVGs — no icon dependency, no network request. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="h-5 w-5" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

/** Input with a floating label that lifts on focus / when filled. */
function FloatField({
  id,
  label,
  error,
  trailing,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "peer h-14 w-full rounded-xl border border-input bg-background/60 px-3.5 pb-2 pt-6 text-[0.95rem] text-foreground shadow-sm outline-none transition-colors",
            "placeholder:text-transparent",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
            trailing && "pr-24",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-3.5 top-4 text-[0.95rem] text-muted-foreground transition-all duration-150",
            "peer-focus:top-2 peer-focus:text-[0.7rem] peer-focus:font-medium peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[0.7rem] peer-[:not(:placeholder-shown)]:font-medium",
            error && "peer-focus:text-destructive",
          )}
        >
          {label}
        </label>
        {trailing}
      </div>
      {/* aria-live so screen readers announce validation without moving focus */}
      <p id={`${id}-error`} aria-live="polite" className="min-h-0 text-xs text-destructive empty:hidden">
        {error ?? ""}
      </p>
    </div>
  );
}

export function LoginForm({
  social = { google: false, microsoft: false },
}: {
  social?: { google: boolean; microsoft: boolean };
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string>();
  const [passwordError, setPasswordError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
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

    if (!needCode) {
      // Client-side validation — server still re-validates.
      let ok = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError("Enter a valid email address.");
        ok = false;
      } else setEmailError(undefined);
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters.");
        ok = false;
      } else setPasswordError(undefined);
      if (!ok) return;
    }

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

  const anySocial = social.google || social.microsoft;

  return (
    <div className="space-y-5">
      {anySocial && (
        <>
          <div className="grid gap-2.5">
            {social.google && (
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background/60 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent active:translate-y-0 active:scale-[.99]"
              >
                <GoogleIcon /> Continue with Google
              </button>
            )}
            {social.microsoft && (
              <button
                type="button"
                onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background/60 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent active:translate-y-0 active:scale-[.99]"
              >
                <MicrosoftIcon /> Continue with Microsoft
              </button>
            )}
          </div>

          {/* Gradient pill divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
            <span className="rounded-full border bg-muted/50 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Or sign in with email
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <FloatField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          disabled={needCode}
          value={email}
          error={emailError}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FloatField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          autoComplete="current-password"
          required
          disabled={needCode}
          value={password}
          error={passwordError}
          onChange={(e) => setPassword(e.target.value)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link
            href="/forgot"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {needCode && (
          <FloatField
            id="code"
            name="code"
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}

        <p aria-live="assertive" className="text-sm text-destructive empty:hidden">
          {error ?? ""}
        </p>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-lg shadow-primary/20 transition-all",
            "bg-gradient-to-br from-[#6C5CE7] to-[#2EA6FF]",
            "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25",
            "active:translate-y-0 active:scale-[.99]",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0",
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in…" : needCode ? "Verify & log in" : "Log in"}
        </button>
      </form>
    </div>
  );
}
