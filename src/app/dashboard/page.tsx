import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  FileText,
  FileUp,
  FolderKanban,
  Info,
  MessageSquare,
  Route,
  Sparkles,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getFocus, greeting, untilLabel } from "@/lib/focus";
import { getActivityForUser, timeAgo, type ActivityKind } from "@/lib/activity";
import { projectHome, routes } from "@/lib/routes";
import { PaceBadge } from "@/components/pace-badge";
import { DisciplineHero } from "@/components/discipline-hero";
import { mediaFor } from "@/lib/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingCard } from "@/components/onboarding-card";
import { QuickActions } from "@/components/quick-actions";

export const metadata: Metadata = { title: "Home" };

const ACTIVITY_ICON: Record<ActivityKind, typeof CheckSquare> = {
  // Derived from existing rows
  task: CheckCircle2,
  file: FileUp,
  meeting: Video,
  message: MessageSquare,
  // Stored events (see lib/activity-log.ts)
  stage: Route,
  approval: BadgeCheck,
  member: Users,
  budget: Wallet,
  document: FileText,
  ai: Sparkles,
  system: Info,
};

function dueLabel(d: Date | null, now: Date): string {
  if (!d) return "No due date";
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const [focus, activity, myDept] = await Promise.all([
    getFocus(userId, now),
    getActivityForUser(userId, 8),
    // Department drives the imagery: a civil student should not see stock
    // photos of laptops.
    prisma.departmentMember.findFirst({
      where: { userId },
      select: { department: { select: { name: true, code: true } } },
    }),
  ]);
  const deptCount = myDept ? 1 : 0;
  const media = mediaFor(myDept?.department.name, myDept?.department.code);

  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const hasProjects = focus.projects.length > 0;

  // Onboarding stays visible only until the basics are done — it is a
  // checklist, not a permanent fixture.
  const totalMine =
    focus.overdue.length + focus.dueToday.length + focus.upcoming.length;
  const onboardingSteps = [
    { label: "Join your engineering department", href: routes.departments, done: deptCount > 0 },
    { label: "Create or join a project", href: routes.projects, done: hasProjects },
    { label: "Get your first task assigned", href: routes.tasks, done: totalMine > 0 },
  ];
  const onboardingDone = onboardingSteps.every((s) => s.done);

  const focusItems = [...focus.overdue, ...focus.dueToday].slice(0, 5);
  const hasFocus = focusItems.length > 0 || focus.meetingsToday.length > 0;

  return (
    <div className="stagger space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting(now)}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {myDept?.department.name ? `${myDept.department.name} · ` : ""}
          {hasFocus
            ? "Here's what needs you today."
            : hasProjects
              ? "Nothing is due today — you're clear."
              : "Let's get your workspace set up."}
        </p>
      </div>

      {/* WHY THE HERO IMAGE MOVED
          A student opening EngiSync between lectures needs to know what to do
          next, not look at a photograph. The imagery was the largest element
          on the most-visited page and carried no information.

          Quick Actions take its place: the verbs a session starts with, led by
          "Create project" — which the navigation audit found was not reachable
          from any nav item at all. The discipline imagery still exists and now
          runs at the BOTTOM of the page, where identity is welcome and
          attention is cheap. */}
      <QuickActions />

      {!onboardingDone && <OnboardingCard steps={onboardingSteps} />}

      {/* ── TODAY ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Today</CardTitle>
          {focus.overdue.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {focus.overdue.length} overdue
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {focus.meetingsToday.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/meetings/${m.id}`}
              className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
            >
              <Video className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.projectName}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">
                {untilLabel(m.startAt, now)}
              </span>
            </Link>
          ))}

          {focusItems.map((t) => (
            <Link
              key={t.id}
              href={routes.tasks}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  t.overdue
                    ? "bg-destructive"
                    : t.priority === "HIGH" || t.priority === "URGENT"
                      ? "bg-amber-500"
                      : "bg-primary"
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.projectName ?? "Personal"}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  t.overdue ? "font-medium text-destructive" : "text-muted-foreground"
                }`}
              >
                {t.overdue ? "Overdue" : dueLabel(t.dueDate, now)}
              </span>
            </Link>
          ))}

          {!hasFocus && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {hasProjects
                ? "No tasks or meetings due today."
                : "Join or create a project to start tracking work."}
            </p>
          )}

          {(focus.upcoming.length > 0 || totalMine > focusItems.length) && (
            <Button asChild variant="ghost" size="sm" className="w-full justify-between">
              <Link href={routes.myWork}>
                View all my work
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── PROJECTS ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Your projects</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.projects}>All projects</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {focus.projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FolderKanban className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                You&apos;re not in a project yet.
              </p>
              <Button asChild size="sm">
                <Link href={routes.projects}>Create or join a project</Link>
              </Button>
            </div>
          ) : (
            focus.projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={projectHome(p.id)}
                className="block rounded-lg border px-3 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.stageLabel}
                      {" · "}
                      {p.role === "LEADER" ? "You lead this" : "Member"}
                      {p.needsMe > 0 && ` · ${p.needsMe} task${p.needsMe === 1 ? "" : "s"} need you`}
                    </span>
                  </span>
                  <PaceBadge status={p.pace.status} showLabel={false} />
                </div>
                {p.pace.status === "behind" && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    {p.pace.message}
                  </p>
                )}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="animate-grow-x h-full rounded-full bg-primary"
                    style={{ width: `${p.completionPct}%` }}
                  />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── ACTIVITY ──────────────────────────────────────────────────── */}
      {activity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="break-words">{a.subject}</span>
                      {a.projectName && (
                        <span className="block text-xs text-muted-foreground">
                          {a.projectName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(a.at, now)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Discipline identity, demoted from the top of the page to the bottom.
          It is pleasant and it belongs — it just should not be the first and
          largest thing a student sees when they open the app to check what is
          due. */}
      <DisciplineHero images={media.images} height="h-24 sm:h-32" />

      {/* Quiet secondary link — the calendar is still one tap away. */}
      <div className="flex justify-center pb-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={routes.calendar}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Open calendar
          </Link>
        </Button>
      </div>
    </div>
  );
}
