"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPrimaryNav, isNavActive } from "@/components/nav-items";

/**
 * Mobile bottom navigation — thumb-reachable access to the primary
 * destinations. Hidden from md: upward, where the sidebar takes over.
 *
 * It renders the primary nav directly rather than keeping its own list, so the
 * phone and desktop can never drift apart. Three items also means each one gets
 * a genuinely large tap target instead of four cramped ones.
 *
 * Uses env(safe-area-inset-bottom) so it clears the iOS home indicator.
 */
const ITEMS: { href: string; label: string; icon: LucideIcon }[] =
  getPrimaryNav().map((i) => ({ href: i.href, label: i.label, icon: i.icon }));

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
                  "group flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.68rem] font-medium transition-colors active:scale-95",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className={cn("icon-nudge h-5 w-5", active && "stroke-[2.5]")} />
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
