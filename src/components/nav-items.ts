import {
  LayoutDashboard,
  Building2,
  Users,
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
  type LucideIcon,
} from "lucide-react";

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

const OVERVIEW: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  description: "Your overview: open tasks, workspaces, and activity.",
};

const SUPERVISOR: NavItem = {
  href: "/dashboard/supervisor",
  label: "Supervisor",
  icon: GraduationCap,
  description: "Read-only view of every project in the departments you supervise.",
};

/**
 * Grouped navigation. Sections keep the sidebar scannable as the app grows.
 * The Supervisor section only appears for users who supervise a department.
 */
export function getNavSections(isSupervisor = false): NavSection[] {
  // Four top-level areas instead of seven. Sections that held a single item
  // were pure visual noise; related destinations are now grouped by the job
  // the user is trying to do, not by the module that implements them.
  const sections: NavSection[] = [
    { title: "Home", items: [OVERVIEW] },
    {
      title: "My work",
      items: [
        { href: "/dashboard/workspaces", label: "Groups", icon: Users, description: "Your project teams — create one or join with a code/invite." },
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, description: "Project objectives, scope, milestones, and deliverables." },
        { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, description: "Assign work with priorities, deadlines, and time tracking." },
        { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, description: "Deadlines, meetings, and countdowns in one view." },
        { href: "/dashboard/meetings", label: "Meetings", icon: Video, description: "Schedule sessions, share join links, and track attendance." },
      ],
    },
    {
      title: "Learning",
      items: [
        { href: "/dashboard/departments", label: "Departments", icon: Building2, description: "Your department, announcements, and the AI-curated Resource Hub." },
        { href: "/dashboard/resources", label: "Files", icon: FolderArchive, description: "Share engineering files with secure, expiring links." },
        { href: "/dashboard/collaboration", label: "Collaboration", icon: MessagesSquare, description: "Discussions, announcements, and cross-department work." },
        { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles, description: "Summaries, task generation, and engineering guidance." },
      ],
    },
    {
      title: "Insights",
      items: [
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, description: "Project health, workload, burndown, and AI insights." },
        { href: "/dashboard/budget", label: "Budget", icon: Wallet, description: "Track contributions (EcoCash and more) and expenses." },
        ...(isSupervisor ? [SUPERVISOR] : []),
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Account, notifications, and two-factor security." },
      ],
    },
  ];

  return sections;
}

/** Flat list of every destination — used by the command palette. */
export function getAllNavItems(isSupervisor = false): NavItem[] {
  return getNavSections(isSupervisor).flatMap((s) => s.items);
}

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}
