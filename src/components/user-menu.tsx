"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Award,
  Bell,
  ChevronDown,
  FolderKanban,
  Palette,
  Settings,
  User,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { routes } from "@/lib/routes";

/**
 * The account menu.
 *
 * WHY IT REPLACES A "SIGN OUT" BUTTON
 * The top-right corner was a sign-out button and nothing else — the only thing
 * the product offered you to do with your own account was leave it. Meanwhile
 * avatars, accent colours, earned badges, skills and discipline all existed and
 * had nowhere to appear.
 *
 * PORTALLED, deliberately. The header carries `backdrop-blur-xl`, and a
 * filtered element becomes the containing block for `position: fixed`
 * descendants; it also has `overflow-hidden` guarding the mobile width budget.
 * A panel rendered inside it gets clipped to the 64px header — which is exactly
 * what happened to the notification bell. Do not move this back inside.
 *
 * Sign-out arrives as `children` rather than as a prop, because it is a
 * <form> bound to a server action. Passing the element keeps the action on the
 * server where it belongs.
 */
export function UserMenu({
  userId,
  name,
  image,
  accentColor,
  avatarStyle,
  headline,
  department,
  badgeCount,
  children,
}: {
  userId: string;
  name: string | null;
  image?: string | null;
  accentColor?: string | null;
  avatarStyle?: string | null;
  headline?: string | null;
  department?: string | null;
  badgeCount?: number;
  /** The sign-out form, rendered on the server. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 8, width: 288 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const narrow = window.innerWidth < 640;
    setPos({
      top: r.bottom + 8,
      right: narrow ? 8 : Math.max(8, window.innerWidth - r.right),
      width: narrow ? window.innerWidth - 16 : 288,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
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

  const displayName = name?.trim() || "Your account";
  const subtitle = headline?.trim() || department || null;

  const links = [
    { href: routes.settings, label: "Profile & appearance", icon: User },
    { href: routes.projects, label: "My projects", icon: FolderKanban },
    { href: routes.settings, label: "Notifications", icon: Bell },
    { href: routes.settings, label: "Theme & accent", icon: Palette },
    { href: routes.settings, label: "Settings", icon: Settings },
  ];

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent"
      >
        <Avatar
          userId={userId}
          name={name}
          image={image}
          accentColor={accentColor}
          avatarStyle={avatarStyle}
          size="sm"
        />
        {/* The name is hidden on phones — the mobile width budget is already
            tight, and the avatar alone is a recognised affordance. */}
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">
          {displayName}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label="Account"
            style={{ top: pos.top, right: pos.right, width: pos.width }}
            className="elev-4 fixed z-[100] overflow-hidden rounded-xl border bg-popover"
          >
            <div className="flex items-start gap-3 border-b p-3">
              <Avatar
                userId={userId}
                name={name}
                image={image}
                accentColor={accentColor}
                avatarStyle={avatarStyle}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayName}</p>
                {subtitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
                {/* Badges are EARNED from real records (see personalization.ts),
                    so showing a count here is a claim the database can back. */}
                {badgeCount ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                    <Award className="h-3.5 w-3.5" />
                    {badgeCount} badge{badgeCount === 1 ? "" : "s"} earned
                  </p>
                ) : null}
              </div>
            </div>

            <div className="p-1.5">
              {links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {l.label}
                </Link>
              ))}
            </div>

            {children && <div className="border-t p-1.5">{children}</div>}
          </div>,
          document.body,
        )}
    </div>
  );
}
