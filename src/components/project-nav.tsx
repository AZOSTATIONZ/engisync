"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  FileText,
  LayoutGrid,
  MessageSquare,
  Route,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  projectAnalytics,
  projectBudget,
  projectDiscussions,
  projectDocs,
  projectHome,
  projectPlan,
  projectTasks,
} from "@/lib/routes";

/**
 * Navigation WITHIN a project.
 *
 * WHY THIS EXISTS
 * A project's tools were spread across two route trees with no link between
 * them. The Projects list opened `/dashboard/projects/[id]` — objectives and
 * milestones — while tasks, documents, team, budget and discussions all lived
 * under `/dashboard/workspaces/[id]/…`, a tree with no entry point anywhere in
 * the product. A student opened their project and found a plan, with no way to
 * reach the actual work.
 *
 * This bar is the missing connection: every destination inside a project,
 * present on every page inside that project. It is a UI-level fix for a
 * structural problem — the two trees are still separate underneath, and
 * merging them remains the real repair — but it means the split is no longer
 * something a student has to discover and work around.
 *
 * Ordered by how often a project member needs each one, not by how the data
 * happens to be modelled. Overview first because it answers "what is this and
 * who is in it"; Analytics last because it is a leader's view.
 */
export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const items = [
    { href: projectHome(projectId), label: "Overview", icon: LayoutGrid, exact: true },
    { href: projectPlan(projectId), label: "Plan", icon: Route, exact: true },
    { href: projectTasks(projectId), label: "Tasks", icon: CheckSquare },
    { href: projectDocs(projectId), label: "Documents", icon: FileText },
    { href: projectDiscussions(projectId), label: "Discussions", icon: MessageSquare },
    { href: projectBudget(projectId), label: "Budget", icon: Wallet },
    { href: projectAnalytics(projectId), label: "Analytics", icon: BarChart3 },
  ];

  function isActive(href: string, exact?: boolean) {
    // Strip any query string — `projectTasks()` carries `?workspace=` and would
    // never match a pathname comparison otherwise.
    const path = href.split("?")[0];
    return exact ? pathname === path : pathname.startsWith(path);
  }

  return (
    <nav
      aria-label="Project sections"
      /* Scrolls horizontally on a phone rather than wrapping to three rows,
         which would push the actual page content below the fold. */
      className="-mx-1 flex gap-1 overflow-x-auto pb-1"
    >
      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "nav-underline inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]",
              active
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Members and access sit slightly apart — they are about people, not work. */
export function ProjectTeamLink({ projectId }: { projectId: string }) {
  return (
    <Link
      href={projectHome(projectId)}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <Users className="h-4 w-4" /> Team &amp; invites
    </Link>
  );
}
