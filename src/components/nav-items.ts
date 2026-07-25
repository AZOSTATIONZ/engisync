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
  const sections: NavSection[] = [
    { title: "Overview", items: [OVERVIEW] },
    {
      title: "Workspace",
      items: [
        { href: "/dashboard/departments", label: "Departments", icon: Building2, description: "Join your engineering department to access its project groups." },
        { href: "/dashboard/workspaces", label: "Groups", icon: Users, description: "Your project teams — create one or join with a code/invite." },
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, description: "Project objectives, scope, milestones, and deliverables." },
        { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, description: "Assign work with priorities, deadlines, and time tracking." },
      ],
    },
    {
      title: "Schedule",
      items: [
        { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, description: "Deadlines, meetings, and countdowns in one view." },
        { href: "/dashboard/meetings", label: "Meetings", icon: Video, description: "Schedule sessions, share join links, and track attendance." },
      ],
    },
    {
      title: "Collaborate",
      items: [
        { href: "/dashboard/collaboration", label: "Collaboration", icon: MessagesSquare, description: "Discussions, announcements, and cross-department work." },
        { href: "/dashboard/resources", label: "Resources", icon: FolderArchive, description: "Share engineering files with secure, expiring links." },
      ],
    },
    {
      title: "Insights",
      items: [
        { href: "/dashboard/budget", label: "Budget", icon: Wallet, description: "Track contributions (EcoCash and more) and expenses." },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, description: "Project health, workload, burndown, and AI insights." },
        { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles, description: "Summaries, task generation, and engineering guidance." },
      ],
    },
  ];

  if (isSupervisor) {
    sections.push({ title: "Teaching", items: [SUPERVISOR] });
  }

  sections.push({
    title: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Account, notifications, and two-factor security." },
    ],
  });

  return sections;
}

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}
