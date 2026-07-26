import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { AuthBrandPanel } from "@/components/auth-brand-panel";
import { socialProviders } from "@/auth";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
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
