"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllNavItems, type NavItem } from "@/components/nav-items";

/**
 * Global command palette (⌘K / Ctrl+K).
 *
 * Rationale: with ~14 destinations, menu-hunting is the main source of
 * navigation fatigue. A palette lets users jump straight to a page by typing
 * what they want, so the sidebar no longer has to expose every feature at once
 * — which is what makes progressive disclosure viable elsewhere.
 *
 * Rendered through a portal because the navbar uses backdrop-blur, which would
 * otherwise trap this fixed overlay inside the header.
 */
export function CommandPalette({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => getAllNavItems(isSupervisor), [isSupervisor]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => setMounted(true), []);

  // Global shortcut: ⌘K / Ctrl+K toggles, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset + focus whenever it opens; lock background scroll.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  function go(item: NavItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  return (
    <>
      {/* Trigger — reads as a search box, which is more discoverable than an icon. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search and navigate"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background/60 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-56 sm:justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search…</span>
        </span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] sm:inline">
          ⌘K
        </kbd>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Command palette">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-x-0 top-[10vh] mx-auto w-[92%] max-w-lg overflow-hidden rounded-2xl border bg-popover shadow-2xl">
              <div className="flex items-center gap-2 border-b px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onInputKey}
                  placeholder="What do you want to do?"
                  aria-label="Search pages"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <ul className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
                {results.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nothing matches “{query}”.
                  </li>
                )}
                {results.map((item, i) => (
                  <li key={item.href} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        i === active ? "bg-accent" : "hover:bg-accent/60",
                      )}
                    >
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                      {i === active && (
                        <CornerDownLeft className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 border-t px-4 py-2 text-[0.7rem] text-muted-foreground">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>esc close</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
