import Link from "next/link";
import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";
import { AuthBrandPanel } from "@/components/auth-brand-panel";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <div className="w-full max-w-[920px]">
      <div className="flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <AuthBrandPanel variant="forgot" />

        <main className="flex-1 p-6 sm:p-8 md:p-10">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">
            Forgot your password?
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <ForgotForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:underline"
            >
              Back to log in
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
