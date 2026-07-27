"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavSections, isNavActive } from "@/components/nav-items";

/**
 * Mobile slide-out navigation.
 * - Smooth open/close (the drawer is always mounted and animated via transform).
 * - Closes on route change, backdrop tap, Escape, or the close button.
 * - Locks background scroll while open.
 * - Rendered through a portal on <body>: the navbar uses backdrop-blur, which
 *   makes it a containing block for fixed children — without the portal the
 *   drawer would be trapped inside the header strip instead of covering the
 *   viewport.
 */
export function MobileNav({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sections = getNavSections(isSupervisor);

  // Portals need the DOM; only render after mount to keep SSR markup stable.
  useEffect(() => setMounted(true), []);

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
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-accent active:scale-95 sm:h-12 sm:w-12"
      >
        <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>

      {/* Overlay rendered on <body> so it escapes the blurred header. */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[100] md:hidden transition-[visibility] duration-300",
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
            "absolute left-0 top-0 flex h-full w-80 max-w-[86%] flex-col border-r bg-background shadow-xl transition-transform duration-300 ease-out will-change-transform sm:w-96",
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

          <nav className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
            {sections.map((section) => (
              <div key={section.title || "primary"} className="flex flex-col gap-1">
                {section.title && (
                  <p className="px-3 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section.title}
                  </p>
                )}
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-3 text-[0.95rem] font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0" />
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
              </div>
            ))}
          </nav>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
