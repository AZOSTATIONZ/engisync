"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type OnboardingStep = {
  label: string;
  href: string;
  done: boolean;
};

const DISMISS_KEY = "engisync-onboarding-dismissed";

/**
 * Getting-started checklist shown on the dashboard until the user finishes
 * the core setup steps (or dismisses it). State comes from the server;
 * dismissal is remembered locally.
 */
export function OnboardingCard({ steps }: { steps: OnboardingStep[] }) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash
  const allDone = steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Get set up</p>
              <p className="text-sm text-muted-foreground">
                {doneCount} of {steps.length} steps done — finish these to unlock the full workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ul className="space-y-1">
          {steps.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                  s.done && "text-muted-foreground",
                )}
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className={cn(s.done && "line-through")}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
