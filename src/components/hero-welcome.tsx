import Link from "next/link";
import { AlertTriangle, CalendarClock, FolderKanban, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/animated-counter";
import { routes } from "@/lib/routes";

/**
 * The welcome surface at the top of Home.
 *
 * WHY IT LOOKS LIKE THIS
 * The page opened with a plain `<h1>` on a flat background. Correct, and
 * completely forgettable — nothing signalled that this was a place worth
 * being. A product students are asked to live in for a semester has to feel
 * like somewhere, and the first screen is where that is decided.
 *
 * Depth comes from four stacked treatments rather than one loud one: a
 * gradient-tinted panel, a drafting grid at 5% opacity, a light-catching top
 * edge, and a soft shadow. Each is nearly invisible alone; together they read
 * as a physical surface.
 *
 * EVERY NUMBER HERE IS REAL. There is no streak counter and no "12/18 tasks"
 * because this app does not measure those things — inventing a metric to fill
 * a tile is how dashboards start lying to the people who depend on them. The
 * four shown are computed from the same query the page already ran, so the
 * hero costs nothing extra to render.
 *
 * Every tile is also a LINK. A statistic you cannot act on is decoration; the
 * count of overdue work should take you to the overdue work.
 */
export type HeroStat = {
  label: string;
  value: number;
  suffix?: string;
  href: string;
  icon: typeof Target;
  chip: string;
  /** Draws attention when something is genuinely wrong. */
  alert?: boolean;
};

export function HeroWelcome({
  greeting,
  firstName,
  department,
  subtitle,
  stats,
}: {
  greeting: string;
  firstName: string;
  department?: string | null;
  subtitle: string;
  stats: HeroStat[];
}) {
  return (
    <section className="surface-premium edge-brand relative overflow-hidden rounded-2xl">
      {/* Drafting grid — engineering identity, faint enough to sit under text. */}
      <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 opacity-60" />
      {/* A single soft brand bloom in the corner, giving the panel a light source. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-[0.13] blur-3xl"
        style={{ background: "var(--grad-brand)" }}
      />

      <div className="relative p-5 sm:p-7">
        <p className="text-sm font-medium text-muted-foreground">
          {department ? department : "EngiSync"}
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
          {greeting}, <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-muted-foreground">{subtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={cn(
                "group glow-hover sheen rounded-xl border bg-background/50 p-3 backdrop-blur-sm",
                s.alert && "border-destructive/40",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("chip h-9 w-9", s.chip)}>
                  <s.icon className="icon-nudge h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="stat-value leading-none">
                    <AnimatedCounter value={s.value} suffix={s.suffix ?? ""} />
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The four figures Home can honestly show, derived from data already loaded. */
export function buildHeroStats(focus: {
  overdue: unknown[];
  dueToday: unknown[];
  meetingsToday: unknown[];
  projects: { completionPct: number }[];
}): HeroStat[] {
  const needsMe = focus.overdue.length + focus.dueToday.length;
  const avg = focus.projects.length
    ? Math.round(
        focus.projects.reduce((n, p) => n + p.completionPct, 0) /
          focus.projects.length,
      )
    : 0;

  return [
    {
      label: "Active projects",
      value: focus.projects.length,
      href: routes.projects,
      icon: FolderKanban,
      chip: "chip-brand",
    },
    {
      label: needsMe === 1 ? "Task needs you" : "Tasks need you",
      value: needsMe,
      href: routes.tasks,
      icon: AlertTriangle,
      chip: focus.overdue.length ? "chip-danger" : "chip-warning",
      alert: focus.overdue.length > 0,
    },
    {
      label: "Average progress",
      value: avg,
      suffix: "%",
      href: routes.projects,
      icon: Target,
      chip: "chip-success",
    },
    {
      label: "Meetings today",
      value: focus.meetingsToday.length,
      href: routes.calendar,
      icon: CalendarClock,
      chip: "chip-ai",
    },
  ];
}
