import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  Inbox,
  Video,
} from "lucide-react";
import { auth } from "@/auth";
import { getFocus, untilLabel, type FocusTask } from "@/lib/focus";
import { projectHome, routes } from "@/lib/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Work" };

/**
 * MY WORK — the single personal lens across every project.
 *
 * This page is what makes it safe to drop Tasks, Calendar and Meetings from
 * the primary navigation. Those were cross-project rollups competing with the
 * same features inside each project; consolidating them into one explicitly
 * personal view ("yours, from everywhere") removes the ambiguity about which
 * view is authoritative without losing any capability.
 */

function TaskRow({ t }: { t: FocusTask }) {
  const due = t.dueDate;
  return (
    <Link
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
        {due
          ? due.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "No date"}
      </span>
    </Link>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "danger";
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

export default async function MyWorkPage() {
  const session = await auth();
  const now = new Date();
  const focus = await getFocus(session!.user.id, now);

  const total =
    focus.overdue.length + focus.dueToday.length + focus.upcoming.length;
  const meetings = focus.meetingsToday.length
    ? focus.meetingsToday
    : focus.nextMeeting
      ? [focus.nextMeeting]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Work</h1>
        <p className="text-muted-foreground">
          Everything assigned to you, pulled from every project.
        </p>
      </div>

      {total === 0 && meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Inbox className="h-9 w-9 text-primary" />
            <p className="font-medium">Nothing assigned to you</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              When a task is assigned to you in any project, it shows up here
              automatically.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={routes.projects}>Go to your projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {meetings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {focus.meetingsToday.length ? "Meetings today" : "Next meeting"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {meetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/meetings/${m.id}`}
                    className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 transition-colors hover:bg-primary/10"
                  >
                    <Video className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {m.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.projectName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {untilLabel(m.startAt, now)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Section title="Overdue" count={focus.overdue.length} tone="danger">
            {focus.overdue.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </Section>

          <Section title="Due today" count={focus.dueToday.length}>
            {focus.dueToday.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </Section>

          <Section title="Coming up" count={focus.upcoming.length}>
            {focus.upcoming.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </Section>
        </>
      )}

      {/* Per-project breakdown so "my work" and "the project" stay connected. */}
      {focus.projects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {focus.projects.map((p) => (
              <Link
                key={p.id}
                href={projectHome(p.id)}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.needsMe > 0
                      ? `${p.needsMe} assigned to you`
                      : "Nothing assigned to you"}
                    {" · "}
                    {p.openTasks} open in total
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-2 pb-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={routes.tasks}>
            <CheckSquare className="mr-2 h-4 w-4" />
            All tasks &amp; filters
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={routes.calendar}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={routes.meetings}>
            <Video className="mr-2 h-4 w-4" />
            All meetings
          </Link>
        </Button>
      </div>
    </div>
  );
}
