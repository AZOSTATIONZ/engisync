"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PwChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function evaluatePassword(pw: string): PwChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

/** The register schema requires length + upper + lower + number. */
export function meetsRequirements(c: PwChecks): boolean {
  return c.length && c.upper && c.lower && c.number;
}

const REQS: { key: keyof PwChecks; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "upper", label: "An uppercase letter" },
  { key: "lower", label: "A lowercase letter" },
  { key: "number", label: "A number" },
  { key: "special", label: "A special character (recommended)" },
];

const LEVELS = [
  { label: "Very weak", color: "bg-red-500" },
  { label: "Weak", color: "bg-red-500" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-blue-500" },
  { label: "Strong", color: "bg-green-500" },
];

export function PasswordStrength({ value }: { value: string }) {
  const checks = evaluatePassword(value);
  const score = Object.values(checks).filter(Boolean).length; // 0–5
  const level = LEVELS[Math.max(0, score - 1)] ?? LEVELS[0];

  if (!value) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-full flex-1 rounded-full transition-colors",
                i < score ? level.color : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{level.label}</span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {REQS.map((r) => {
          const ok = checks[r.key];
          return (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
