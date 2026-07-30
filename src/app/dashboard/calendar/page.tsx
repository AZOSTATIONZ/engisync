import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMonthItems, getNextDeadline, dayKey } from "@/lib/calendar";
import { userWorkspaceIds } from "@/lib/task";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AddEventForm,
  DeleteEventButton,
  Countdown,
  type Option,
} from "./calendar-ui";

export const metadata: Metadata = { title: "Calendar" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-muted-foreground",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const sp = await searchParams;
  const today = new Date();
  const year = sp.y ? parseInt(sp.y, 10) : today.getFullYear();
  const month = sp.m !== undefined ? parseInt(sp.m, 10) : today.getMonth();

  const [items, next, wsIds] = await Promise.all([
    getMonthItems(userId, year, month),
    getNextDeadline(userId),
    userWorkspaceIds(userId),
  ]);

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: { id: true, name: true },
  });
  const workspaceOptions: Option[] = workspaces.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  // Bucket items by day.
  const byDay = new Map<string, typeof items>();
  for (const it of items) {
    const key = dayKey(new Date(it.date));
    const arr = byDay.get(key) ?? [];
    arr.push(it);
    byDay.set(key, arr);
  }

  // Build a 6-week grid starting on the Sunday of the first week.
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const todayKey = dayKey(today);
  const defaultDate = dayKey(new Date(year, month, Math.min(today.getDate(), 28)));

  const monthEvents = items
    .filter((i) => i.kind === "event")
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="text-muted-foreground">
            Deadlines, meetings, and countdowns in one place.
          </p>
        </div>
        <AddEventForm workspaces={workspaceOptions} defaultDate={defaultDate} />
      </div>

      {next && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Next deadline
              </p>
              <p className="font-medium">{next.title}</p>
            </div>
            <div className="text-right">
              <Countdown target={new Date(next.at).toISOString()} />
              <p className="text-xs text-muted-foreground">
                {new Date(next.at).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {MONTHS[month]} {year}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/calendar?y=${prevMonth.getFullYear()}&m=${prevMonth.getMonth()}`}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/calendar"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
            >
              Today
            </Link>
            <Link
              href={`/dashboard/calendar?y=${nextMonth.getFullYear()}&m=${nextMonth.getMonth()}`}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        {/* Mobile: day-by-day agenda instead of a cramped grid. */}
        <CardContent className="space-y-2 md:hidden">
          {cells
            .filter((d) => d.getMonth() === month)
            .map((date) => {
              const key = dayKey(date);
              const dayItems = byDay.get(key) ?? [];
              if (dayItems.length === 0) return null;
              return (
                <div key={key} className="rounded-md border p-2.5">
                  <p
                    className={cn(
                      "mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      key === todayKey && "text-primary",
                    )}
                  >
                    {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    {key === todayKey && " · Today"}
                  </p>
                  <div className="space-y-1.5">
                    {dayItems.map((it) => (
                      <div
                        key={`${it.kind}-${it.id}`}
                        className="flex items-center gap-2 rounded bg-accent/60 px-2 py-1.5 text-sm"
                      >
                        {it.kind === "task" ? (
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[it.type])} />
                        ) : (
                          <span className="shrink-0">{it.time ? "🕒" : "📌"}</span>
                        )}
                        <span className="truncate">{it.title}</span>
                        {it.time && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{it.time}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          {cells.filter((d) => d.getMonth() === month && (byDay.get(dayKey(d))?.length ?? 0) > 0).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled this month.
            </p>
          )}
        </CardContent>

        {/* Desktop/tablet: full month grid. */}
        <CardContent className="hidden overflow-x-auto md:block">
          <div className="grid min-w-[560px] grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {cells.map((date) => {
              const key = dayKey(date);
              const inMonth = date.getMonth() === month;
              const dayItems = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[92px] bg-background p-1.5 align-top",
                    !inMonth && "bg-muted/40 text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      key === todayKey && "bg-primary font-bold text-primary-foreground",
                    )}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((it) => (
                      <div
                        key={`${it.kind}-${it.id}`}
                        className="flex items-center gap-1 truncate rounded bg-accent px-1 py-0.5 text-[11px]"
                        title={it.title}
                      >
                        {it.kind === "task" ? (
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              PRIORITY_DOT[it.type],
                            )}
                          />
                        ) : (
                          <span className="shrink-0">{it.time ? "🕒" : "📌"}</span>
                        )}
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{dayItems.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events this month</CardTitle>
        </CardHeader>
        <CardContent>
          {monthEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events scheduled this month.
            </p>
          ) : (
            <ul className="divide-y">
              {monthEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(e.date).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {e.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {e.time}
                        </span>
                      )}
                      <span className="rounded bg-secondary px-1.5 py-0.5">
                        {e.type}
                      </span>
                    </div>
                  </div>
                  <DeleteEventButton eventId={e.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
