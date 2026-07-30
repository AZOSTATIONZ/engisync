"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard error boundary.
 *
 * WHY THIS EXISTS
 * Next.js's default production error page shows only a digest ("Digest:
 * 2127190876"), which is untraceable without server log access — that turned
 * one real bug into several rounds of guesswork.
 *
 * This boundary shows the actual message and stack in development, and in
 * production shows the message plus the digest so a report is actionable.
 * It never dumps a stack to end users in production.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always reaches the server/browser console, wherever this runs.
    console.error("[dashboard error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="page-title">Something went wrong on this page</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The rest of EngiSync is still working — you can go back and continue.
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left">
        <p className="break-words font-mono text-xs text-destructive">
          {error.message || "Unknown error"}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
            Digest: {error.digest}
          </p>
        )}
        {isDev && error.stack && (
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[0.7rem] text-muted-foreground">
            {error.stack}
          </pre>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
