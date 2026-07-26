"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/components/nav-items";

/**
 * Mobile bottom navigation — thumb-reachable access to the four highest-traffic
 * destinations. Everything else lives in the drawer (hamburger). Hidden from
 * md: upward, where the sidebar takes over.
 *
 * Uses env(safe-area-inset-bottom) so it clears the iOS home indicator.
 */
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/workspaces", label: "Groups", icon: Users },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // 56px min touch target — comfortably above the 44px guideline.
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.68rem] font-medium transition-colors active:scale-95",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {item.label}
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
