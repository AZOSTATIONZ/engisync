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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your overview: open tasks, workspaces, and activity." },
  { href: "/dashboard/departments", label: "Departments", icon: Building2, description: "Join your engineering department to access its project groups." },
  { href: "/dashboard/workspaces", label: "Groups", icon: Users, description: "Your project teams — create one or join with a code/invite." },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, description: "Assign work with priorities, deadlines, and time tracking." },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, description: "Project objectives, scope, milestones, and deliverables." },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, description: "Deadlines, meetings, and countdowns in one view." },
  { href: "/dashboard/meetings", label: "Meetings", icon: Video, description: "Schedule sessions, share join links, and track attendance." },
  { href: "/dashboard/collaboration", label: "Collaboration", icon: MessagesSquare, description: "Discussions, announcements, and cross-department work." },
  { href: "/dashboard/resources", label: "Resources", icon: FolderArchive, description: "Share engineering files with secure, expiring links." },
  { href: "/dashboard/budget", label: "Budget", icon: Wallet, description: "Track contributions (EcoCash and more) and expenses." },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, description: "Project health, workload, burndown, and AI insights." },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles, description: "Summaries, task generation, and engineering guidance." },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, description: "Account, notifications, and two-factor security." },
];

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}
