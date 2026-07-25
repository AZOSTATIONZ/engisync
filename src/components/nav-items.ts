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

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/departments", label: "Departments", icon: Building2 },
  { href: "/dashboard/workspaces", label: "Groups", icon: Users },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/meetings", label: "Meetings", icon: Video },
  { href: "/dashboard/collaboration", label: "Collaboration", icon: MessagesSquare },
  { href: "/dashboard/resources", label: "Resources", icon: FolderArchive },
  { href: "/dashboard/budget", label: "Budget", icon: Wallet },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}
