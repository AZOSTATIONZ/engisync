import Link from "next/link";
import { Cpu } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  countUnread,
  listNotifications,
  generateDueSoonNotifications,
} from "@/lib/notifications";

export async function Navbar({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const session = await auth();

  let unread = 0;
  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  if (session?.user?.id) {
    await generateDueSoonNotifications(session.user.id);
    [unread, notifications] = await Promise.all([
      countUnread(session.user.id),
      listNotifications(session.user.id),
    ]);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-1">
          {session?.user && <MobileNav isSupervisor={isSupervisor} />}
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Cpu className="h-6 w-6 text-primary" />
            <span>EngiSync</span>
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          {session?.user && <CommandPalette isSupervisor={isSupervisor} />}
          <ThemeToggle />
          {session?.user ? (
            <>
              <NotificationBell
                count={unread}
                items={notifications.map((n) => ({
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  link: n.link,
                  read: n.read,
                  createdAt: n.createdAt.toISOString(),
                }))}
              />
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
