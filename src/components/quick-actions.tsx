import Link from "next/link";
import {
  CalendarPlus,
  FolderPlus,
  Lightbulb,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import { routes } from "@/lib/routes";

/**
 * Quick Actions — the things a student comes here to DO.
 *
 * WHY THIS EXISTS
 * An audit of the navigation found that creating a project — the primary
 * purpose of the product — was not reachable from any nav item. The create
 * form lives on /dashboard/workspaces, and that route appears in none of the
 * seventeen sidebar entries. The only path to it was an empty-state link that
 * disappears once you have a single project.
 *
 * Navigation answers "where is X". It does not answer "I want to start
 * something", which is a different question and the more common one at the
 * start of a session. These are verbs, deliberately, and "Create project"
 * leads because everything else in EngiSync depends on having one.
 */

const ACTIONS = [
  {
    href: `${routes.projects}/new`,
    label: "Create project",
    hint: "Start a new group",
    icon: FolderPlus,
    primary: true,
  },
  {
    href: `${routes.projects}/new#join`,
    label: "Join project",
    hint: "With a code",
    icon: UserPlus,
  },
  {
    href: routes.projectHub,
    label: "Find a project",
    hint: "Ideas you can build",
    icon: Lightbulb,
  },
  {
    href: routes.meetings,
    label: "Schedule meeting",
    hint: "Set a time",
    icon: CalendarPlus,
  },
  {
    href: routes.files,
    label: "Upload file",
    hint: "Share with your team",
    icon: Upload,
  },
  {
    href: routes.assistant,
    label: "Ask AI",
    hint: "Get unstuck",
    icon: Sparkles,
  },
];

export function QuickActions() {
  return (
    <section aria-label="Quick actions">
      {/* `stagger` fades these in in sequence, which reads as the page
          assembling rather than appearing. Cheap because it is pure CSS —
          no JavaScript, and the global reduced-motion rule already
          neutralises it for anyone who asked for less. */}
      <div className="stagger grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={
              a.primary
                ? "card-hover flex flex-col gap-1 rounded-xl border border-primary/40 bg-primary/10 p-3"
                : "card-hover flex flex-col gap-1 rounded-xl border bg-card p-3"
            }
          >
            <a.icon
              className={`h-5 w-5 ${a.primary ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="text-sm font-medium leading-tight">{a.label}</span>
            <span className="text-xs leading-tight text-muted-foreground">
              {a.hint}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
