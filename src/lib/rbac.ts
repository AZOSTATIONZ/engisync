import { SystemRole, WorkspaceRole } from "@prisma/client";

/**
 * Role-Based Access Control helpers.
 * Keep authorization logic centralized (SOLID: single responsibility).
 */

const systemRank: Record<SystemRole, number> = {
  GUEST: 0,
  INDIVIDUAL: 1,
  ADMIN: 2,
};

/** Returns true if `role` meets or exceeds `required`. */
export function hasSystemRole(role: SystemRole, required: SystemRole): boolean {
  return systemRank[role] >= systemRank[required];
}

export function isAdmin(role: SystemRole | undefined | null): boolean {
  return role === SystemRole.ADMIN;
}

/** Workspace-level permission checks. */
export function canManageWorkspace(role: WorkspaceRole | undefined | null): boolean {
  return role === WorkspaceRole.LEADER;
}

export function canAccessWorkspace(role: WorkspaceRole | undefined | null): boolean {
  return role === WorkspaceRole.LEADER || role === WorkspaceRole.MEMBER;
}
