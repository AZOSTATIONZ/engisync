import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/verification";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmailToken(token);

  const ok = result === "ok";

  return (
    <div className="w-full max-w-md text-center">
      {ok ? (
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
      ) : (
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
      )}
      <h1 className="text-2xl font-bold">
        {ok ? "Email verified" : "Verification failed"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ok
          ? "Your email address has been confirmed. Thanks!"
          : result === "expired"
            ? "This verification link has expired. You can request a new one from your dashboard."
            : "This verification link is invalid or has already been used."}
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
