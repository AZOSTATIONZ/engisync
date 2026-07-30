/**
 * Canonical route builders.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A project is ONE record with ONE home: `/dashboard/projects/[id]`. Everything
 * that belongs to a project — its plan, tasks, document, money, insights and
 * team — is a tab underneath that home.
 *
 * This replaces an earlier split where the same record was surfaced through two
 * unrelated route trees — a "workspaces" tree for people and access, and a
 * "projects" tree for objectives and milestones. Students opened a project,
 * found a plan, and had no way to reach the actual work; files uploaded in one
 * tree were invisible from the other. That split, not the styling, was why the
 * product was hard to learn.
 *
 * RULE: no code should contain a hardcoded "/dashboard/projects/…" path. Use
 * these helpers, so the next structural change is an edit to this file rather
 * than a hunt through ~40 page files. The previous version of this module
 * carried the same rule and it was violated in 20+ files, which is what made
 * this migration expensive — worth enforcing in review.
 */

/** Top-level destinations. Three, plus role-gated surfaces. */
export const routes = {
  home: "/dashboard",
  projects: "/dashboard/projects",
  newProject: "/dashboard/projects/new",

  /**
   * Knowledge: what past cohorts built, what you could build, how to learn it.
   *
   * The three surfaces below keep their original paths for now. Grouping them
   * under one destination is a navigation change; physically merging the route
   * trees is a separate migration and does not need to happen first.
   */
  knowledge: "/dashboard/knowledge",
  repository: "/dashboard/repository",
  projectHub: "/dashboard/project-hub",
  library: "/dashboard/departments",

  /** Role-gated. */
  supervisor: "/dashboard/supervisor",
  admin: "/dashboard/admin",

  /** Account-menu destinations, not primary navigation. */
  settings: "/dashboard/settings",
  profile: "/dashboard/profile",

  /**
   * Personal cross-project lenses. These are surfaced FROM Home, not as
   * top-level destinations — "my tasks across every project" is a view of the
   * person, while a project's task list belongs to the project.
   */
  myWork: "/dashboard/my-work",
  tasks: "/dashboard/my-work",
  calendar: "/dashboard/calendar",
  meetings: "/dashboard/meetings",

  /** Departments keep their own path until the Knowledge trees are merged. */
  departments: "/dashboard/departments",
} as const;

/* ── A project's seven tabs ────────────────────────────────────────── */

/** Overview — what is this, where is it, what needs doing next. */
export function projectHome(id: string): string {
  return `/dashboard/projects/${id}`;
}

/** Lifecycle stage, milestones, risks, deliverables, schedule. */
export function projectPlan(id: string): string {
  return `/dashboard/projects/${id}/plan`;
}

/** This project's tasks. */
export function projectTasks(id: string): string {
  return `/dashboard/projects/${id}/tasks`;
}

/** The engineering document and its evidence. */
export function projectDocs(id: string): string {
  return `/dashboard/projects/${id}/document`;
}

/** Contributions, expenses and the bill of materials. */
export function projectBudget(id: string): string {
  return `/dashboard/projects/${id}/money`;
}

/** Health, participation and readiness for review. */
export function projectAnalytics(id: string): string {
  return `/dashboard/projects/${id}/insights`;
}

/** Members, roles, invites and invited supervisors. */
export function projectTeam(id: string): string {
  return `/dashboard/projects/${id}/team`;
}

/* ── Secondary project surfaces (reached from the project More menu) ── */

export function projectDocsHistory(id: string): string {
  return `/dashboard/projects/${id}/document/history`;
}

export function projectDiscussions(id: string): string {
  return `/dashboard/projects/${id}/discussions`;
}

export function projectQuizzes(id: string): string {
  return `/dashboard/projects/${id}/quizzes`;
}

export function projectEvaluation(id: string): string {
  return `/dashboard/projects/${id}/evaluation`;
}

/** Join a project by code (invite/QR landing). */
export function projectJoin(joinCode: string): string {
  return `${routes.projects}?join=${encodeURIComponent(joinCode)}`;
}

/* ── Knowledge ─────────────────────────────────────────────────────── */

export function hubProject(slug: string): string {
  return `${routes.projectHub}/${slug}`;
}

export function repositoryEntry(slug: string): string {
  return `${routes.repository}/${slug}`;
}

export function departmentHome(id: string): string {
  return `${routes.library}/${id}`;
}

export function departmentLibrary(id: string): string {
  return `${routes.library}/${id}/resources`;
}

/* ── Other ─────────────────────────────────────────────────────────── */

export function meetingHome(id: string): string {
  return `/dashboard/meetings/${id}`;
}
