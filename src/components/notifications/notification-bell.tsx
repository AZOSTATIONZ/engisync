"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dismissNotification,
  dismissReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

export type NotificationDTO = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({
  count,
  items,
}: {
  count: number;
  items: NotificationDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; width: number | null }>({
    top: 0,
    right: 0,
    width: null,
  });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  /**
   * Anchor the panel to the bell in VIEWPORT coordinates.
   *
   * The panel is portalled to <body>, so it cannot inherit the bell's position
   * the way an absolutely-positioned child would. Measuring is the price of
   * escaping the header — see the portal note below for why that is necessary.
   */
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const narrow = window.innerWidth < 640;
    setPos({
      top: r.bottom + 8,
      // On a phone the panel spans the viewport with equal 8px insets; a fixed
      // 320px panel anchored near the right edge would hang off the left.
      right: narrow ? 8 : Math.max(8, window.innerWidth - r.right),
      width: narrow ? window.innerWidth - 16 : 320,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    // `true` captures scrolls in any container, not just the document, so the
    // panel tracks the bell rather than detaching from it.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Close on outside click. Both the trigger and the portalled panel count as
  // "inside" — the panel is no longer a DOM descendant of the trigger.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* Fire browser notifications for unread items (if the user opted in).
     ------------------------------------------------------------------
     THIS CRASHED THE WHOLE APP ON ANDROID.
     The old code guarded with `"Notification" in window` and then called
     `new Notification(...)`. On Chrome for Android that guard passes — the
     object exists and `.permission` reads fine — but the CONSTRUCTOR is
     forbidden and throws `TypeError: Illegal constructor`. Android requires
     notifications to go through the service worker registration instead.

     Because this ran in an effect with no handling, the TypeError propagated
     to the nearest error boundary and took down every authenticated page:
     the bell lives in the dashboard shell, so there was no route around it.
     It presented as "a client-side exception has occurred" on a real phone
     while desktop and logged-out browsing were perfectly fine.

     Two lessons are encoded below. Feature-detect the CAPABILITY, not the
     NAME — `"Notification" in window` answers a question nobody asked. And a
     nice-to-have must never be able to break the page around it, so the
     whole body is wrapped: if notifying fails, the bell still renders and
     the app still works. */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;

    (async () => {
      const key = "engisync-notified";

      let notified: string[] = [];
      try {
        const raw = sessionStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) notified = parsed;
      } catch {
        // Unreadable or corrupt. Start fresh rather than throw.
      }

      // Prefer the service worker: it is the only path Android permits, and
      // on desktop it behaves identically.
      let reg: ServiceWorkerRegistration | undefined;
      try {
        reg = await navigator.serviceWorker?.getRegistration();
      } catch {
        // No worker available; fall back below.
      }
      if (cancelled) return;

      for (const n of items) {
        if (n.read || notified.includes(n.id)) continue;
        try {
          if (reg) {
            await reg.showNotification("EngiSync", { body: n.title });
          } else {
            new Notification("EngiSync", { body: n.title });
          }
          notified.push(n.id);
        } catch {
          // Platform refused this notification. Never surface it as a crash;
          // stop trying rather than loop through every remaining item.
          break;
        }
      }

      try {
        sessionStorage.setItem(key, JSON.stringify(notified));
      } catch {
        // Storage full or blocked. We simply may re-notify later.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  async function enableDesktop() {
    if (!("Notification" in window)) return;
    try {
      await Notification.requestPermission();
    } catch {
      // Some browsers reject this outside a user gesture, or block it
      // entirely. The button simply does nothing rather than crashing.
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Swings once when unread items exist — arrival is information;
            a bell that swings on hover would just be a toy. */}
        {count > 0 ? (
          <BellRing className="animate-bell h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open &&
        mounted &&
        /* PORTAL — do not move this back inside the header.
           The header carries `backdrop-blur-xl`, and a filtered element becomes
           the containing block for `position: fixed` descendants. It also has
           `overflow-hidden` guarding the mobile width budget. Together those
           clipped this panel to the 64px header, so opening the bell showed a
           sliver of a card and nothing else. Rendering into <body> escapes both.
           The command palette portals for the same reason. */
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            style={{
              top: pos.top,
              right: pos.right,
              width: pos.width ?? undefined,
            }}
            className="elev-4 fixed z-[100] rounded-xl border bg-popover"
          >
          <div className="flex items-center justify-between gap-2 border-b p-3">
            <span className="font-semibold">Notifications</span>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    router.refresh();
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              {/* Clearing is offered only when there is something already read
                  to clear — otherwise it looks like a way to delete things you
                  have not looked at yet. */}
              {items.some((n) => n.read) && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await dismissReadNotifications();
                    router.refresh();
                  }}
                >
                  Clear read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.body && (
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                    )}
                  </div>
                );
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group flex items-start gap-2 border-b px-3 py-2 last:border-0",
                      !n.read && "bg-accent/50",
                    )}
                  >
                    <div
                      className="min-w-0 flex-1"
                      onClick={async () => {
                        if (!n.read) {
                          await markNotificationRead(n.id);
                          router.refresh();
                        }
                      }}
                    >
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                    </div>

                    {/* Always rendered, not revealed on hover: a phone has no
                        hover, and a control you cannot reach is not a feature.
                        It fades up on pointer devices instead. */}
                    <button
                      type="button"
                      aria-label={`Dismiss: ${n.title}`}
                      title="Dismiss"
                      className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await dismissNotification(n.id);
                        router.refresh();
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t p-2">
            <button
              className="w-full rounded px-2 py-1 text-center text-xs text-muted-foreground hover:bg-accent"
              onClick={enableDesktop}
            >
              Enable desktop reminders
            </button>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
