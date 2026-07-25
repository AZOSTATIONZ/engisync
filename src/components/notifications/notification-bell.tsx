"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
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
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Fire browser notifications for unread items (if the user opted in).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const key = "engisync-notified";
    const notified: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
    for (const n of items) {
      if (!n.read && !notified.includes(n.id)) {
        new Notification("EngiSync", { body: n.title });
        notified.push(n.id);
      }
    }
    sessionStorage.setItem(key, JSON.stringify(notified));
  }, [items]);

  async function enableDesktop() {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        {count > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <span className="font-semibold">Notifications</span>
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
                      "border-b px-3 py-2 last:border-0",
                      !n.read && "bg-accent/50",
                    )}
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
        </div>
      )}
    </div>
  );
}
