"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, isNavActive } from "@/components/nav-items";

/**
 * Mobile slide-out navigation.
 * - Smooth open/close (the drawer is always mounted and animated via transform).
 * - Closes on route change, backdrop tap, Escape, or the close button.
 * - Locks background scroll while open.
 * - Sits above all other UI (z-[100]).
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close whenever the route changes (i.e. a menu item was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + allow Escape to close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent active:scale-95"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay (always mounted so it can animate). */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-[visibility] duration-300",
          open ? "visible" : "invisible",
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Drawer */}
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-r bg-background shadow-xl transition-transform duration-300 ease-out will-change-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b p-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 font-bold"
            >
              <Cpu className="h-5 w-5 text-primary" />
              EngiSync
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-4">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex flex-col">
                    {item.label}
                    <span
                      className={cn(
                        "text-xs font-normal",
                        active
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
