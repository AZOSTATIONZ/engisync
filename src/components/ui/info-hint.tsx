"use client";

import { HelpCircle } from "lucide-react";

/**
 * A small "?" icon that reveals a short explanation on hover (desktop) or
 * tap-and-hold (mobile, via the native title). Purely presentational.
 */
export function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <HelpCircle
        className="h-3.5 w-3.5 cursor-help text-muted-foreground"
        aria-hidden="true"
      />
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-56 -translate-x-1/2 rounded-md border bg-card px-2 py-1.5 text-xs text-card-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
