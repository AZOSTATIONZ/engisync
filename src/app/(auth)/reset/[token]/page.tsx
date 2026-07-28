import Link from "next/link";
import type { Metadata } from "next";
import { ResetForm } from "./reset-form";
import { AuthBrandPanel } from "@/components/auth-brand-panel";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="w-full max-w-[920px]">
      <div className="flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <AuthBrandPanel variant="forgot" />

        <main className="flex-1 p-6 sm:p-8 md:p-10">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">
            Set a new password
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>

          <ResetForm token={token} />

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
