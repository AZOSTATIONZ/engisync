import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  Settings,
  GraduationCap,
  Shield,
  User,
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
 * PRIMARY navigation — three destinations.
 *
 * WHY SO FEW
 * ----------
 * The app previously exposed 15 top-level destinations, and eight of them
 * (All tasks, Calendar, Meetings, Analytics, Budget, Collaboration, Files, AI
 * Assistant) were cross-project rollups of features that ALSO live inside a
 * project. That is two competing organising axes — by feature at the top, by
 * container underneath — so every object had two plausible homes and no
 * canonical one. It is why a member could upload a document and then be unable
 * to find it: the product never committed to where things belong.
 *
 * We now commit to a single axis. The PROJECT is the container; everything
 * about a project lives inside it. Exactly one personal lens sits on top:
 *
 *   Home        what needs me right now, across every project
 *   Projects    the projects themselves — plan, tasks, document, money, team
 *   Knowledge   what past cohorts built, what you could build, how to learn it
 *
 * Home is a lens; Projects is a place. Keeping exactly one lens is what stops
 * it reading as a duplicate of a project's own task list.
 *
 * Cross-project views were not deleted — Calendar, Meetings and personal tasks
 * are reachable from Home, and every project tool is reachable inside its
 * project. Nothing is more than two clicks away, and nothing appears twice at
 * the top level.
 */
export function getPrimaryNav(): NavItem[] {
  return [
    {
      href: routes.home,
      label: "Home",
      icon: LayoutDashboard,
      description: "What needs your attention right now, across every project.",
    },
    {
      href: routes.projects,
      label: "Projects",
      icon: FolderKanban,
      description: "Your projects — plan, tasks, documents, money and team.",
    },
    {
      href: routes.knowledge,
      label: "Knowledge",
      icon: BookOpen,
      description:
        "Past projects, buildable ideas and department learning material.",
    },
  ];
}

/**
 * ROLE-GATED destinations. These are places a person goes because of who they
 * are, not because of what they are working on, so they never compete with the
 * three primary items.
 */
export function getRoleNav(
  opts: { isSupervisor?: boolean; isAdmin?: boolean } = {},
): NavItem[] {
  const items: NavItem[] = [];

  if (opts.isSupervisor) {
    items.push({
      href: routes.supervisor,
      label: "Supervise",
      icon: GraduationCap,
      description: "Projects you have been invited to review.",
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

  return items;
}

/**
 * ACCOUNT destinations. Reachable from the account menu and the command
 * palette. Deliberately not part of the sidebar's main list — they are about
 * the person, not the work.
 */
export function getAccountNav(): NavItem[] {
  return [
    {
      href: routes.profile,
      label: "Profile",
      icon: User,
      description: "Your engineering profile, skills and badges.",
    },
    {
      href: routes.settings,
      label: "Settings",
      icon: Settings,
      description: "Account, notifications and two-factor security.",
    },
  ];
}

/**
 * Sidebar structure: three primary destinations, then any role-gated surfaces
 * under a quiet heading.
 */
export function getNavSections(isSupervisor = false, isAdmin = false): NavSection[] {
  const sections: NavSection[] = [{ title: "", items: getPrimaryNav() }];

  const roleItems = getRoleNav({ isSupervisor, isAdmin });
  if (roleItems.length > 0) {
    sections.push({ title: "Your roles", items: roleItems });
  }

  return sections;
}

/** Flat list of every destination — used by the command palette. */
export function getAllNavItems(isSupervisor = false, isAdmin = false): NavItem[] {
  return [
    ...getPrimaryNav(),
    ...getRoleNav({ isSupervisor, isAdmin }),
    ...getAccountNav(),
  ];
}

/** Active-state check shared by desktop + mobile nav. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === routes.home) return pathname === href;
  // Strip query strings before comparing.
  const base = href.split("?")[0];
  return pathname.startsWith(base);
}
