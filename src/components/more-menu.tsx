"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  FileText,
  FolderArchive,
  GraduationCap,
  History,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Shield,
  Sparkles,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icons live HERE, keyed by name — not passed in as props.
 *
 * WHY: a Server Component cannot hand a function across the client boundary.
 * `icon: GraduationCap` compiles fine and then fails at RUNTIME with
 * "Functions cannot be passed directly to Client Components", which surfaces
 * as an opaque digest in production. Passing a string keeps every prop
 * serialisable, and `MoreIcon` makes an unknown name a compile error rather
 * than a blank space in the menu.
 */
const ICONS = {
  analytics: BarChart3,
  archive: FolderArchive,
  budget: Wallet,
  calendar: Calendar,
  discussions: MessageSquare,
  document: FileText,
  evaluation: Sparkles,
  history: History,
  meetings: Video,
  quizzes: GraduationCap,
  security: Shield,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type MoreIcon = keyof typeof ICONS;

export type MoreItem = {
  href: string;
  label: string;
  icon: MoreIcon;
  description?: string;
};

/**
 * "More" overflow menu — holds secondary/advanced actions so each surface can
 * lead with only its few primary actions (progressive disclosure).
 *
 * Deliberately dependency-free: closes on outside click, Escape, and route
 * change, and is keyboard reachable.
 */
export function MoreMenu({
  items,
  label = "More",
}: {
  items: MoreItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent",
          open && "bg-accent",
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          /* Width is capped to the viewport so this can never widen the page
             on a narrow phone (see notification-bell for the same fix). */
          className="absolute right-0 z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl"
        >
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
