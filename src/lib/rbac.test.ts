import { describe, it, expect } from "vitest";
import { SystemRole, WorkspaceRole } from "@prisma/client";
import {
  hasSystemRole,
  isAdmin,
  canManageWorkspace,
  canAccessWorkspace,
} from "./rbac";

describe("RBAC system roles", () => {
  it("admin outranks individual and guest", () => {
    expect(hasSystemRole(SystemRole.ADMIN, SystemRole.INDIVIDUAL)).toBe(true);
    expect(hasSystemRole(SystemRole.INDIVIDUAL, SystemRole.ADMIN)).toBe(false);
    expect(hasSystemRole(SystemRole.GUEST, SystemRole.INDIVIDUAL)).toBe(false);
  });

  it("detects admins", () => {
    expect(isAdmin(SystemRole.ADMIN)).toBe(true);
    expect(isAdmin(SystemRole.INDIVIDUAL)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("RBAC workspace roles", () => {
  it("only leaders can manage", () => {
    expect(canManageWorkspace(WorkspaceRole.LEADER)).toBe(true);
    expect(canManageWorkspace(WorkspaceRole.MEMBER)).toBe(false);
  });

  it("leaders and members can access", () => {
    expect(canAccessWorkspace(WorkspaceRole.LEADER)).toBe(true);
    expect(canAccessWorkspace(WorkspaceRole.MEMBER)).toBe(true);
    expect(canAccessWorkspace(null)).toBe(false);
  });
});
