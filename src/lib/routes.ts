/**
 * Canonical route builders.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `Workspace`, `Group` and `Project` are currently the SAME database record
 * surfaced through two route trees (`/dashboard/workspaces/[id]` for people and
 * access, `/dashboard/projects/[id]` for objectives and milestones). That split
 * is the main reason the product is hard to learn, and it is scheduled to be
 * unified into a single `/dashboard/projects/[id]` space.
 *
 * Until that migration happens, every link in the app must be built through
 * this module rather than hardcoded. When the entities merge, the unification
 * becomes an edit to this one file instead of a hunt through ~40 page files.
 *
 * RULE: no new code should contain the literal strings "/dashboard/workspaces"
 * or "/dashboard/projects". Use these helpers.
 */

/** Top-level destinations. */
export const routes = {
  home: "/dashboard",
  myWork: "/dashboard/my-work",
  projects: "/dashboard/projects",
  library: "/dashboard/departments",
  files: "/dashboard/resources",
  departments: "/dashboard/departments",
  settings: "/dashboard/settings",
  supervisor: "/dashboard/supervisor",
  admin: "/dashboard/admin",
  assistant: "/dashboard/assistant",
  analytics: "/dashboard/analytics",
  budget: "/dashboard/budget",
  calendar: "/dashboard/calendar",
  meetings: "/dashboard/meetings",
  tasks: "/dashboard/tasks",
  collaboration: "/dashboard/collaboration",
  repository: "/dashboard/repository",
  projectHub: "/dashboard/project-hub",
} as const;

export function hubProject(slug: string): string {
  return `/dashboard/project-hub/${slug}`;
}

export function repositoryEntry(slug: string): string {
  return `/dashboard/repository/${slug}`;
}

/**
 * A project's main page.
 *
 * Today this resolves to the workspace route, because that view owns the
 * members/access half of the record and is the more useful landing page.
 * After unification this becomes `/dashboard/projects/${id}`.
 */
export function projectHome(id: string): string {
  return `/dashboard/workspaces/${id}`;
}

/** Objectives, scope, milestones, risks, deliverables. */
export function projectPlan(id: string): string {
  return `/dashboard/projects/${id}`;
}

/** Members, invites, join codes, access settings. */
export function projectTeam(id: string): string {
  return `/dashboard/workspaces/${id}`;
}

export function projectDocs(id: string): string {
  return `/dashboard/workspaces/${id}/documentation`;
}

export function projectDocsHistory(id: string): string {
  return `/dashboard/workspaces/${id}/documentation/history`;
}

export function projectDiscussions(id: string): string {
  return `/dashboard/workspaces/${id}/discussions`;
}

export function projectQuizzes(id: string): string {
  return `/dashboard/workspaces/${id}/quizzes`;
}

export function projectEvaluation(id: string): string {
  return `/dashboard/workspaces/${id}/evaluation`;
}

export function projectAnalytics(id: string): string {
  return `/dashboard/analytics/${id}`;
}

export function projectBudget(id: string): string {
  return `/dashboard/budget/${id}`;
}

/** Tasks filtered to a single project. */
export function projectTasks(id: string): string {
  return `/dashboard/tasks?workspace=${id}`;
}

export function departmentHome(id: string): string {
  return `/dashboard/departments/${id}`;
}

export function departmentLibrary(id: string): string {
  return `/dashboard/departments/${id}/resources`;
}

export function meetingHome(id: string): string {
  return `/dashboard/meetings/${id}`;
}
