import {
  Archive,
  LayoutDashboard,
  Building2,
  CheckSquare,
  FolderKanban,
  Calendar,
  Video,
  MessagesSquare,
  FolderArchive,
  Wallet,
  BarChart3,
  Sparkles,
  Settings,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/lib/routes";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * PRIMARY navigation — the five destinations that are always visible.
 *
 * The app previously exposed 16 top-level items, eight of which were
 * cross-project aggregate views of features that ALSO live inside a project.
 * That "axis collision" (organised by feature at the top level, by container
 * underneath) is why users could not form a mental model of where anything
 * lived.
 *
 * We now commit to one axis — project-first, the GitHub model — with a single
 * explicitly-labelled personal lens on top:
 *
 *   Home        what needs me right now
 *   My Work     MY tasks/meetings/deadlines pulled from every project
 *   Projects    the projects themselves; everything else lives inside one
 *   Library     department learning material
 *   Files       shared engineering files
 *
 * "My Work" is a lens, "Projects" is a place. Keeping exactly one lens is what
 * stops it feeling like a duplicate of a project's own task list.
 *
 * A SIXTH item — Project Hub — was added deliberately, not by drift. It answers
 * "what should I build?", which is a different question from every other
 * destination here and the one students arrive with at the start of a
 * semester. It sits beside Repository on purpose: Repository is what previous
 * cohorts finished, Project Hub is what you could start. Anything further
 * belongs under "More"; six is the ceiling.
 */
export function getPrimaryNav(): NavItem[] {
  return [
    {
      href: routes.home,
      label: "Home",
      icon: LayoutDashboard,
      description: "What needs your attention right now.",
    },
    {
      href: routes.myWork,
      label: "My Work",
      icon: ListChecks,
      description: "Your tasks, meetings and deadlines across every project.",
    },
    {
      href: routes.projects,
      label: "Projects",
      icon: FolderKanban,
      description: "Your project teams, plans, tasks, documents and budget.",
    },
    {
      href: routes.projectHub,
      label: "Project Hub",
      icon: Lightbulb,
      description:
        "Projects you can build, with parts lists, budgets and prerequisites.",
    },
    {
      href: routes.repository,
      label: "Repository",
      icon: Archive,
      description: "Published projects from past cohorts — search before you build.",
    },
    {
      href: routes.library,
      label: "Library",
      icon: Building2,
      description: "Department resources, announcements and curated material.",
    },
  ];
}

/**
 * SECONDARY navigation — reachable from the sidebar's "More" group, the mobile
 * More sheet, and the ⌘K palette, but never competing for primary attention.
 *
 * Nothing here is removed; these are either cross-project rollups that most
 * users reach from inside a project, or role-specific tools.
 */
export function getSecondaryNav(
  opts: { isSupervisor?: boolean; isAdmin?: boolean } = {},
): NavItem[] {
  const items: NavItem[] = [
    {
      href: routes.files,
      label: "Files",
      icon: FolderArchive,
      description: "Engineering files shared with secure, expiring links.",
    },
    {
      href: routes.tasks,
      label: "All tasks",
      icon: CheckSquare,
      description: "Every task across your projects, with filters.",
    },
    {
      href: routes.calendar,
      label: "Calendar",
      icon: Calendar,
      description: "Deadlines, meetings and countdowns in one view.",
    },
    {
      href: routes.meetings,
      label: "Meetings",
      icon: Video,
      description: "Schedule sessions, share links, track attendance.",
    },
    {
      href: routes.analytics,
      label: "Analytics",
      icon: BarChart3,
      description: "Project health, workload and burndown across projects.",
    },
    {
      href: routes.budget,
      label: "Budget",
      icon: Wallet,
      description: "Contributions (EcoCash and more) and expenses.",
    },
    {
      href: routes.collaboration,
      label: "Collaboration",
      icon: MessagesSquare,
      description: "Discussions and cross-department work.",
    },
    {
      href: routes.assistant,
      label: "AI Assistant",
      icon: Sparkles,
      description: "Summaries, task generation and engineering guidance.",
    },
  ];

  if (opts.isSupervisor) {
    items.push({
      href: routes.supervisor,
      label: "Supervisor",
      icon: GraduationCap,
      description: "Every project in the departments you supervise.",
    });
  }

  if (opts.isAdmin) {
    items.push({
      href: routes.admin,
      label: "Admin",
      icon: Shield,
      description: "Platform settings and user administration.",
    });
  }

  items.push({
    href: routes.settings,
    label: "Settings",
    icon: Settings,
    description: "Account, notifications and two-factor security.",
  });

  return items;
}

/**
 * Sidebar structure: five primary destinations, then everything else grouped
 * under "More" so it is present but visually subordinate.
 */
export function getNavSections(isSupervisor = false, isAdmin = false): NavSection[] {
  return [
    { title: "", items: getPrimaryNav() },
    { title: "More", items: getSecondaryNav({ isSupervisor, isAdmin }) },
  ];
}

/** Flat list of every destination — used by the command palette. */
export function getAllNavItems(isSupervisor = false, isAdmin = false): NavItem[] {
  return [...getPrimaryNav(), ...getSecondaryNav({ isSupervisor, isAdmin })];
}

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === routes.home) return pathname === href;
  // Strip query strings before comparing (e.g. tasks?workspace=…).
  const base = href.split("?")[0];
  return pathname.startsWith(base);
}
