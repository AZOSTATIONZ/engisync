import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { AuthBrandPanel } from "@/components/auth-brand-panel";
import { socialProviders } from "@/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ revoked?: string }>;
}) {
  // Set by /logout when a session was invalidated server-side (password
  // reset, 2FA change, sign-out-everywhere). Without a word of explanation,
  // being bounced to the login screen mid-session reads as a bug — and a user
  // who thinks the app is broken does not think "my password was just reset,
  // possibly not by me."
  const revoked = (await searchParams).revoked === "1";

  return (
    <div className="w-full max-w-[920px]">
      {/* Elevated card: animated brand panel + form. Stacks on mobile. */}
      <div className="flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <AuthBrandPanel />

        <main className="flex-1 p-6 sm:p-8 md:p-10">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">
            Welcome back
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Log in to your EngiSync account
          </p>

          {revoked && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              <p className="font-medium">You were signed out on this device</p>
              <p className="mt-1 text-muted-foreground">
                This happens after a password reset or a change to two-factor
                authentication. If that wasn&apos;t you, reset your password
                straight away.
              </p>
            </div>
          )}

          <LoginForm social={socialProviders} />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary transition-colors hover:underline"
            >
              Sign up
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
