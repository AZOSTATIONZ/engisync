import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";
import { AuthBrandPanel } from "@/components/auth-brand-panel";

export const metadata: Metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-[920px]">
      {/* Same elevated two-panel card as login — one visual system across
          every auth moment, so the product never looks half-finished. */}
      <div className="flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <AuthBrandPanel variant="register" />

        <main className="flex-1 p-6 sm:p-8 md:p-10">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">
            Create your account
          </h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Start managing your engineering projects
          </p>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:underline"
            >
              Log in
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
