"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  FileText,
  LayoutGrid,
  Route,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreMenu, type MoreItem } from "@/components/more-menu";
import {
  projectAnalytics,
  projectBudget,
  projectDiscussions,
  projectDocs,
  projectDocsHistory,
  projectEvaluation,
  projectHome,
  projectPlan,
  projectQuizzes,
  projectTasks,
  projectTeam,
} from "@/lib/routes";

/**
 * Navigation WITHIN a project — the project's own tab bar.
 *
 * Seven tabs, ordered by how often a member needs them rather than by how the
 * data happens to be modelled. Overview first because it answers "what is this
 * and what needs doing"; Insights and Team last because they are consulted, not
 * worked in.
 *
 * The ceiling is seven. Anything else belongs in the More menu, which is why
 * discussions, quizzes, evaluation and document history live there — they are
 * real features, but a student does not need them in their line of sight to
 * understand where their work lives.
 */
const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid, href: projectHome },
  { key: "plan", label: "Plan", icon: Route, href: projectPlan },
  { key: "tasks", label: "Tasks", icon: CheckSquare, href: projectTasks },
  { key: "document", label: "Document", icon: FileText, href: projectDocs },
  { key: "money", label: "Money", icon: Wallet, href: projectBudget },
  { key: "insights", label: "Insights", icon: BarChart3, href: projectAnalytics },
  { key: "team", label: "Team", icon: Users, href: projectTeam },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const home = projectHome(projectId);

  const moreItems: MoreItem[] = [
    {
      href: projectDiscussions(projectId),
      label: "Discussions",
      icon: "discussions",
      description: "Threads and decisions for this project.",
    },
    {
      href: projectDocsHistory(projectId),
      label: "Document history",
      icon: "history",
      description: "Submitted versions and what changed.",
    },
    {
      href: projectEvaluation(projectId),
      label: "AI evaluation",
      icon: "evaluation",
      description: "Automated review of the project's current state.",
    },
    {
      href: projectQuizzes(projectId),
      label: "Quizzes",
      icon: "quizzes",
      description: "Knowledge checks for the team.",
    },
  ];

  function isActive(href: string): boolean {
    const path = href.split("?")[0];
    // Overview is the project root, so it must match exactly — otherwise every
    // tab underneath would light it up too.
    if (path === home) return pathname === home;
    return pathname.startsWith(path);
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b">
      <nav
        aria-label="Project sections"
        /* Scrolls horizontally on a phone rather than wrapping to three rows,
           which would push the page content below the fold. */
        className="-mx-1 flex gap-1 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const href = tab.href(projectId);
          const active = isActive(href);
          return (
            <Link
              key={tab.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Visible at every width. Hiding this on phones would make discussions,
          quizzes and the AI evaluation unreachable on mobile, which is where
          most students actually open the app. */}
      <div className="shrink-0 pb-1">
        <MoreMenu items={moreItems} />
      </div>
    </div>
  );
}
