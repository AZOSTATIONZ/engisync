import { prisma } from "@/lib/prisma";

/**
 * THE authorization layer.
 *
 * WHY THIS EXISTS
 * ---------------
 * Authorization was previously expressed as ~40 ad-hoc `isWorkspaceLeader()`
 * calls spread across 11 files, with an unused `rbac.ts` sitting beside them
 * (since deleted — it was dead code whose tests gave false confidence).
 * Every new feature meant another hand-written check, and every missed check
 * is a privilege-escalation bug. There was no single place to answer "who can
 * do what?", and no way to test it.
 *
 * Everything now funnels through `can(context, action)`:
 *
 *   - `can()` is PURE — no I/O — so the entire permission matrix is unit
 *     testable without a database.
 *   - `getContext()` does the single query that loads a user's standing.
 *   - `authorize()` is the one-liner server actions call.
 *
 * ROLE MODEL — three roles, plus delegated capabilities:
 *
 *   LEADER   full control of the project
 *   MEMBER   does the work; may hold extra capabilities
 *   VIEWER   read-only (supervisors observing, guests on shared links)
 *
 * "Assistant leader" is a MEMBER holding `canApprove`. Modelling delegation as
 * capabilities rather than extra role tiers keeps this matrix small enough to
 * reason about and to test exhaustively.
 */

export type WorkspaceRole = "LEADER" | "MEMBER" | "VIEWER";

export type Capabilities = {
  canApprove: boolean;
  canManageBudget: boolean;
  canInvite: boolean;
};

export const NO_CAPABILITIES: Capabilities = {
  canApprove: false,
  canManageBudget: false,
  canInvite: false,
};

/** Everything `can()` needs to decide. Deliberately plain data. */
export type PolicyContext = {
  userId: string;
  /** null = not a member of this workspace at all. */
  role: WorkspaceRole | null;
  capabilities: Capabilities;
  /** Platform administrator. */
  isSystemAdmin: boolean;
  /** Supervises the department this project belongs to. */
  isSupervisor: boolean;
};

/**
 * Every permission-checked operation in the app.
 * Adding a feature means adding a case here — which is the point.
 */
export type Action =
  // Reading
  | "project.view"
  | "project.activity.view"
  | "analytics.view"
  // Project shape
  | "project.edit"
  | "project.stage.set"
  | "project.delete"
  | "project.milestone.manage"
  | "project.risk.manage"
  | "project.deliverable.manage"
  // People
  | "member.invite"
  | "member.remove"
  | "member.role.set"
  | "member.capability.set"
  | "joinRequest.decide"
  // Work
  | "task.create"
  | "task.assign"
  | "task.update"
  | "task.delete"
  // Content
  | "document.edit"
  | "document.approve"
  | "discussion.post"
  | "discussion.moderate"
  | "meeting.create"
  | "file.upload"
  | "quiz.manage"
  | "collaboration.manage"
  // Money
  | "budget.view"
  | "budget.manage"
  // Repository
  | "project.publish"
  | "publication.approve";

/** Actions any member of the project — including read-only viewers — may do. */
const VIEWER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "project.view",
  "project.activity.view",
  "analytics.view",
  "budget.view",
]);

/** Actions a contributing MEMBER may do on top of viewer actions. */
const MEMBER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "task.create",
  "task.assign",
  "task.update",
  "document.edit",
  "discussion.post",
  "meeting.create",
  "file.upload",
]);

/** Actions unlocked by a specific delegated capability. */
const CAPABILITY_ACTIONS: Record<keyof Capabilities, readonly Action[]> = {
  canApprove: ["document.approve", "joinRequest.decide"],
  canManageBudget: ["budget.manage"],
  canInvite: ["member.invite"],
};

/**
 * Can this user perform this action?
 *
 * Pure function — no database, no session, no side effects. Everything it
 * needs arrives in `ctx`, which is what makes the whole matrix testable.
 */
export function can(ctx: PolicyContext, action: Action): boolean {
  // Publication approval is the ONE write a supervisor may perform, and the
  // one action a leader may NOT perform on their own project. It is checked
  // before every other rule precisely so that "leaders can do everything"
  // cannot leak self-approval — the person who assembled a submission must
  // not be the person who signs it off.
  if (action === "publication.approve") {
    return ctx.isSystemAdmin || ctx.isSupervisor;
  }

  // Platform admins bypass workspace roles. Kept as the first rule (after the
  // approval carve-out) so it is impossible to miss when reading this function.
  if (ctx.isSystemAdmin) return true;

  // Supervisors observe every project in their department, but never write.
  // This is a deliberate ceiling: a supervisor marking work as approved would
  // blur the line between observing and doing the students' work.
  if (ctx.isSupervisor && VIEWER_ACTIONS.has(action)) return true;

  if (ctx.role === null) return false;

  if (ctx.role === "LEADER") {
    // Leaders can do everything within their own project.
    return true;
  }

  if (VIEWER_ACTIONS.has(action)) return true;
  if (ctx.role === "VIEWER") return false;

  // MEMBER from here down.
  if (MEMBER_ACTIONS.has(action)) return true;

  for (const key of Object.keys(CAPABILITY_ACTIONS) as (keyof Capabilities)[]) {
    if (ctx.capabilities[key] && CAPABILITY_ACTIONS[key].includes(action)) {
      return true;
    }
  }

  return false;
}

/** Human-readable refusal, safe to show a user. */
export function denialReason(ctx: PolicyContext, action: Action): string {
  if (ctx.role === null && !ctx.isSupervisor && !ctx.isSystemAdmin) {
    return "You're not a member of this project.";
  }
  if (ctx.isSupervisor && ctx.role === null) {
    return "Supervisors have read-only access to projects.";
  }
  if (ctx.role === "VIEWER") return "You have read-only access to this project.";

  for (const key of Object.keys(CAPABILITY_ACTIONS) as (keyof Capabilities)[]) {
    if (CAPABILITY_ACTIONS[key].includes(action)) {
      return "The group leader needs to grant you this permission.";
    }
  }
  return "Only the group leader can do this.";
}

/**
 * Load a user's standing in one query.
 *
 * SUPERVISION IS GRANTED, NOT INHERITED.
 *
 * This used to resolve supervisor status from department membership: holding
 * SUPERVISOR — or even ADMIN — in a project's department granted read access
 * to every project in it, implicitly, permanently, and invisibly to the team.
 * A project could not be private from someone who never asked to see it and
 * whom the team could not remove.
 *
 * It now reads an explicit `ProjectGrant`. The consequences are deliberate:
 *
 *   - Department ADMIN no longer implies sight of any project's contents.
 *     Administering a department is not the same as reading students' work.
 *     Admins keep the project list; opening one needs a grant.
 *   - A supervisor of the department sees nothing until invited, which is what
 *     "invited supervisors" has to mean if it means anything.
 *   - Revoking a grant takes effect immediately, because nothing is cached.
 *
 * Existing access was preserved by the backfill in migration
 * 20260730160000_project_grants — no supervisor lost a project to this change.
 */
export async function getContext(
  workspaceId: string,
  userId: string,
): Promise<PolicyContext> {
  const [membership, user, grant] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: {
        role: true,
        canApprove: true,
        canManageBudget: true,
        canInvite: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    }),
    prisma.projectGrant.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { revokedAt: true },
    }),
  ]);

  // A revoked grant is a row that still exists, so absence of the row is not
  // the test — `revokedAt === null` is.
  const isSupervisor = Boolean(grant && grant.revokedAt === null);

  return {
    userId,
    role: (membership?.role as WorkspaceRole | undefined) ?? null,
    capabilities: membership
      ? {
          canApprove: membership.canApprove,
          canManageBudget: membership.canManageBudget,
          canInvite: membership.canInvite,
        }
      : NO_CAPABILITIES,
    isSystemAdmin: user?.systemRole === "ADMIN",
    isSupervisor,
  };
}

export type AuthzResult =
  | { ok: true; ctx: PolicyContext }
  | { ok: false; error: string };

/**
 * The one call server actions make.
 *
 *   const authz = await authorize(workspaceId, userId, "project.stage.set");
 *   if (!authz.ok) return { error: authz.error };
 */
export async function authorize(
  workspaceId: string,
  userId: string,
  action: Action,
): Promise<AuthzResult> {
  const ctx = await getContext(workspaceId, userId);
  if (!can(ctx, action)) return { ok: false, error: denialReason(ctx, action) };
  return { ok: true, ctx };
}

/** Convenience for UI: which of these actions is allowed? */
export function permissions<T extends readonly Action[]>(
  ctx: PolicyContext,
  actions: T,
): Record<T[number], boolean> {
  const out = {} as Record<T[number], boolean>;
  for (const a of actions) out[a as T[number]] = can(ctx, a);
  return out;
}
