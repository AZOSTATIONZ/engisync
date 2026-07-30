import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "./confirm-button";

export const metadata: Metadata = { title: "Confirm deletion" };

export default async function ConfirmDeletionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="border-destructive/40">
        <CardContent className="space-y-4 py-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
            <div>
              <h1 className="page-title">Permanently delete your account?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This is your last chance to stop. Once confirmed, your profile,
                personal projects, tasks, files and sessions are removed and you
                will be signed out immediately. <strong>This cannot be undone.</strong>
              </p>
            </div>
          </div>

          <ul className="space-y-1 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            <li>• Your email is reserved for 30 days to prevent impersonation.</li>
            <li>• Contributions to group records remain, shown as “Deleted user”.</li>
            <li>• All active sessions and sign-in methods are revoked.</li>
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row">
            <ConfirmDeleteButton token={token} />
            <Link
              href="/dashboard/settings"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent sm:w-auto"
            >
              Keep my account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
