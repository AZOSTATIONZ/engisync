import Link from "next/link";
import { Cpu, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { prisma } from "@/lib/prisma";
import {
  countUnread,
  listNotifications,
  generateDueSoonNotifications,
} from "@/lib/notifications";

export async function Navbar({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const session = await auth();

  let unread = 0;
  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  let profile: {
    name: string | null;
    image: string | null;
    accentColor: string | null;
    avatarStyle: string | null;
    headline: string | null;
    deptMemberships: { department: { name: string } }[];
  } | null = null;

  if (session?.user?.id) {
    await generateDueSoonNotifications(session.user.id);
    [unread, notifications, profile] = await Promise.all([
      countUnread(session.user.id),
      listNotifications(session.user.id),
      // One extra query on a component that renders everywhere — kept
      // deliberately narrow. Badge counts are NOT loaded here: computing them
      // needs task, publication and contribution aggregates, which is far too
      // much work to repeat on every page render for a number in a menu.
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          image: true,
          accentColor: true,
          avatarStyle: true,
          headline: true,
          deptMemberships: {
            take: 1,
            select: { department: { select: { name: true } } },
          },
        },
      }),
    ]);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* MOBILE WIDTH BUDGET
          At 360px the container leaves ~328px. Previously this row needed
          ~404px (hamburger 44 + wordmark 117 + search 41 + theme 40 + bell 40
          + "Sign out" 94 + gaps), which pushed the whole document wider than
          the screen and cut content off on every page — not just here.
          The wordmark and the "Sign out" label are therefore hidden below sm:,
          and `overflow-hidden` stops any future addition from doing the same. */}
      <div className="container flex h-16 items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1">
          {session?.user && <MobileNav isSupervisor={isSupervisor} />}
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Cpu className="h-6 w-6 shrink-0 text-primary" />
            {/* Signed in, the row also carries search/theme/bell/sign-out, so
                the wordmark yields on phones. Signed out there is room for it,
                and the landing page needs the branding. */}
            <span className={session?.user ? "hidden sm:inline" : "inline"}>
              EngiSync
            </span>
            {session?.user && <span className="sr-only sm:hidden">EngiSync</span>}
          </Link>
        </div>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
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
              {/* Sign-out moved INSIDE the account menu. It was previously the
                  only thing offered in the top-right corner, which meant the
                  sole action available on your own account was leaving it. */}
              <UserMenu
                userId={session.user.id}
                name={profile?.name ?? session.user.name ?? null}
                image={profile?.image}
                accentColor={profile?.accentColor}
                avatarStyle={profile?.avatarStyle}
                headline={profile?.headline}
                department={profile?.deptMemberships[0]?.department.name ?? null}
              >
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </form>
              </UserMenu>
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
