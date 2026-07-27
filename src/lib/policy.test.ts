import { describe, expect, it } from "vitest";
import {
  can,
  denialReason,
  permissions,
  NO_CAPABILITIES,
  type Action,
  type Capabilities,
  type PolicyContext,
  type WorkspaceRole,
} from "./policy";

const ALL_ACTIONS: Action[] = [
  "project.view",
  "project.activity.view",
  "analytics.view",
  "project.edit",
  "project.stage.set",
  "project.delete",
  "project.milestone.manage",
  "project.risk.manage",
  "project.deliverable.manage",
  "member.invite",
  "member.remove",
  "member.role.set",
  "member.capability.set",
  "joinRequest.decide",
  "task.create",
  "task.assign",
  "task.update",
  "task.delete",
  "document.edit",
  "document.approve",
  "discussion.post",
  "discussion.moderate",
  "meeting.create",
  "file.upload",
  "quiz.manage",
  "collaboration.manage",
  "budget.view",
  "budget.manage",
  "project.publish",
  "publication.approve",
];

function ctx(
  role: WorkspaceRole | null,
  caps: Partial<Capabilities> = {},
  extra: Partial<PolicyContext> = {},
): PolicyContext {
  return {
    userId: "u1",
    role,
    capabilities: { ...NO_CAPABILITIES, ...caps },
    isSystemAdmin: false,
    isSupervisor: false,
    ...extra,
  };
}

describe("non-members", () => {
  it("can do nothing at all", () => {
    const c = ctx(null);
    for (const a of ALL_ACTIONS) {
      expect(can(c, a), `expected non-member to be denied ${a}`).toBe(false);
    }
  });

  it("gets a clear reason", () => {
    expect(denialReason(ctx(null), "task.create")).toContain("not a member");
  });
});

describe("leaders", () => {
  it("can do everything in their own project except approve their own publication", () => {
    const c = ctx("LEADER");
    for (const a of ALL_ACTIONS) {
      const expected = a !== "publication.approve";
      expect(can(c, a), `leader / ${a}`).toBe(expected);
    }
  });

  it("can submit for publication", () => {
    expect(can(ctx("LEADER"), "project.publish")).toBe(true);
    expect(can(ctx("MEMBER"), "project.publish")).toBe(false);
  });
});

describe("publication approval — separation of duties", () => {
  it("only supervisors and admins can approve", () => {
    expect(can(ctx(null, {}, { isSupervisor: true }), "publication.approve")).toBe(true);
    expect(can(ctx(null, {}, { isSystemAdmin: true }), "publication.approve")).toBe(true);
    expect(can(ctx("LEADER"), "publication.approve")).toBe(false);
    expect(can(ctx("MEMBER", { canApprove: true }), "publication.approve")).toBe(false);
    expect(can(ctx("VIEWER"), "publication.approve")).toBe(false);
    expect(can(ctx(null), "publication.approve")).toBe(false);
  });
});

describe("viewers", () => {
  const c = ctx("VIEWER");

  it("can read", () => {
    expect(can(c, "project.view")).toBe(true);
    expect(can(c, "analytics.view")).toBe(true);
    expect(can(c, "budget.view")).toBe(true);
    expect(can(c, "project.activity.view")).toBe(true);
  });

  it("cannot write anything", () => {
    const writes: Action[] = [
      "task.create",
      "task.update",
      "document.edit",
      "discussion.post",
      "meeting.create",
      "file.upload",
      "project.edit",
      "project.stage.set",
      "budget.manage",
      "member.invite",
    ];
    for (const a of writes) {
      expect(can(c, a), `viewer should not be able to ${a}`).toBe(false);
    }
  });

  it("is not upgraded by holding capabilities", () => {
    // Defence in depth: a stale capability row must not grant a viewer write
    // access if their role is later downgraded.
    const upgraded = ctx("VIEWER", {
      canApprove: true,
      canManageBudget: true,
      canInvite: true,
    });
    expect(can(upgraded, "document.approve")).toBe(false);
    expect(can(upgraded, "budget.manage")).toBe(false);
    expect(can(upgraded, "member.invite")).toBe(false);
  });
});

describe("members", () => {
  const c = ctx("MEMBER");

  it("can do the day-to-day work", () => {
    const work: Action[] = [
      "task.create",
      "task.assign",
      "task.update",
      "document.edit",
      "discussion.post",
      "meeting.create",
      "file.upload",
    ];
    for (const a of work) expect(can(c, a), `member should be able to ${a}`).toBe(true);
  });

  it("cannot reshape the project or manage people", () => {
    const restricted: Action[] = [
      "project.edit",
      "project.stage.set",
      "project.delete",
      "project.milestone.manage",
      "member.remove",
      "member.role.set",
      "member.capability.set",
      "task.delete",
      "quiz.manage",
    ];
    for (const a of restricted) {
      expect(can(c, a), `member should NOT be able to ${a}`).toBe(false);
    }
  });

  it("cannot approve, invite or manage budget without a grant", () => {
    expect(can(c, "document.approve")).toBe(false);
    expect(can(c, "joinRequest.decide")).toBe(false);
    expect(can(c, "member.invite")).toBe(false);
    expect(can(c, "budget.manage")).toBe(false);
  });
});

describe("capability grants (the 'assistant leader' case)", () => {
  it("canApprove unlocks approvals and join requests only", () => {
    const c = ctx("MEMBER", { canApprove: true });
    expect(can(c, "document.approve")).toBe(true);
    expect(can(c, "joinRequest.decide")).toBe(true);
    // and nothing else
    expect(can(c, "budget.manage")).toBe(false);
    expect(can(c, "member.invite")).toBe(false);
    expect(can(c, "project.delete")).toBe(false);
    expect(can(c, "member.role.set")).toBe(false);
  });

  it("canManageBudget unlocks budget only", () => {
    const c = ctx("MEMBER", { canManageBudget: true });
    expect(can(c, "budget.manage")).toBe(true);
    expect(can(c, "document.approve")).toBe(false);
    expect(can(c, "member.invite")).toBe(false);
  });

  it("canInvite unlocks invites only", () => {
    const c = ctx("MEMBER", { canInvite: true });
    expect(can(c, "member.invite")).toBe(true);
    expect(can(c, "member.remove")).toBe(false);
    expect(can(c, "member.role.set")).toBe(false);
    expect(can(c, "document.approve")).toBe(false);
  });

  it("all three grants still fall short of leader", () => {
    const c = ctx("MEMBER", {
      canApprove: true,
      canManageBudget: true,
      canInvite: true,
    });
    expect(can(c, "project.delete")).toBe(false);
    expect(can(c, "project.stage.set")).toBe(false);
    expect(can(c, "member.role.set")).toBe(false);
    expect(can(c, "member.capability.set")).toBe(false);
  });
});

describe("supervisors", () => {
  const c = ctx(null, {}, { isSupervisor: true });

  it("can read projects in their department without being a member", () => {
    expect(can(c, "project.view")).toBe(true);
    expect(can(c, "analytics.view")).toBe(true);
    expect(can(c, "project.activity.view")).toBe(true);
    expect(can(c, "budget.view")).toBe(true);
  });

  it("can never write — observing must not become doing the work", () => {
    const writes: Action[] = [
      "task.create",
      "task.update",
      "document.edit",
      "document.approve",
      "project.edit",
      "project.stage.set",
      "project.delete",
      "budget.manage",
      "member.remove",
    ];
    for (const a of writes) {
      expect(can(c, a), `supervisor should NOT be able to ${a}`).toBe(false);
    }
  });

  it("keeps leader powers when they also lead the project", () => {
    const leading = ctx("LEADER", {}, { isSupervisor: true });
    expect(can(leading, "project.stage.set")).toBe(true);
  });
});

describe("system admins", () => {
  it("bypass workspace roles entirely", () => {
    const c = ctx(null, {}, { isSystemAdmin: true });
    for (const a of ALL_ACTIONS) {
      expect(can(c, a), `admin should be allowed ${a}`).toBe(true);
    }
  });
});

describe("supervisors can approve publications but still cannot write anything else", () => {
  it("approval is the single supervisor write", () => {
    const c = ctx(null, {}, { isSupervisor: true });
    expect(can(c, "publication.approve")).toBe(true);
    expect(can(c, "project.publish")).toBe(false);
    expect(can(c, "document.approve")).toBe(false);
    expect(can(c, "project.edit")).toBe(false);
  });
});

describe("permissions() helper", () => {
  it("maps a list of actions to booleans", () => {
    const p = permissions(ctx("MEMBER", { canApprove: true }), [
      "task.create",
      "document.approve",
      "project.delete",
    ] as const);
    expect(p).toEqual({
      "task.create": true,
      "document.approve": true,
      "project.delete": false,
    });
  });
});

describe("privilege escalation guards", () => {
  it("no role below LEADER can change roles or capabilities", () => {
    const roles: (WorkspaceRole | null)[] = ["MEMBER", "VIEWER", null];
    const allCaps: Capabilities = {
      canApprove: true,
      canManageBudget: true,
      canInvite: true,
    };
    for (const r of roles) {
      const c = ctx(r, allCaps);
      expect(can(c, "member.role.set"), `${r} must not set roles`).toBe(false);
      expect(
        can(c, "member.capability.set"),
        `${r} must not grant capabilities`,
      ).toBe(false);
    }
  });

  it("no role below LEADER can delete the project", () => {
    for (const r of ["MEMBER", "VIEWER", null] as (WorkspaceRole | null)[]) {
      expect(can(ctx(r, { canApprove: true }), "project.delete")).toBe(false);
    }
  });
});
