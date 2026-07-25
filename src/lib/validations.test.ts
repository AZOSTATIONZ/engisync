import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  joinWorkspaceSchema,
  taskSchema,
  logTimeSchema,
  eventSchema,
  contributionSchema,
  expenseSchema,
  meetingSchema,
} from "./validations";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const r = registerSchema.safeParse({
      name: "Kuda M",
      email: "kuda@example.com",
      password: "Password1",
      confirmPassword: "Password1",
    });
    expect(r.success).toBe(true);
  });

  it("rejects weak passwords", () => {
    const r = registerSchema.safeParse({
      name: "Kuda",
      email: "kuda@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(r.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const r = registerSchema.safeParse({
      name: "Kuda",
      email: "kuda@example.com",
      password: "Password1",
      confirmPassword: "Password2",
    });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("joinWorkspaceSchema", () => {
  it("trims and uppercases the join code", () => {
    const r = joinWorkspaceSchema.safeParse({ joinCode: " engi2026 ", pin: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.joinCode).toBe("ENGI2026");
  });
});

describe("taskSchema", () => {
  it("applies defaults and treats null description as undefined", () => {
    const r = taskSchema.safeParse({
      title: "Design PCB",
      description: null,
      dueDate: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.priority).toBe("MEDIUM");
      expect(r.data.status).toBe("TODO");
      expect(r.data.description).toBeUndefined();
    }
  });

  it("rejects a too-short title", () => {
    expect(taskSchema.safeParse({ title: "x" }).success).toBe(false);
  });
});

describe("logTimeSchema", () => {
  it("coerces minutes and allows a null note", () => {
    const r = logTimeSchema.safeParse({ taskId: "t1", minutes: "30", note: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.minutes).toBe(30);
  });

  it("rejects zero minutes", () => {
    expect(logTimeSchema.safeParse({ taskId: "t1", minutes: "0" }).success).toBe(false);
  });
});

describe("eventSchema", () => {
  it("requires a valid date format", () => {
    expect(eventSchema.safeParse({ title: "Lab", date: "2026/01/01" }).success).toBe(false);
    expect(eventSchema.safeParse({ title: "Lab", date: "2026-01-01" }).success).toBe(true);
  });
});

describe("contributionSchema", () => {
  it("requires a positive amount and defaults to EcoCash", () => {
    const r = contributionSchema.safeParse({ workspaceId: "w1", amount: "25.50" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBeCloseTo(25.5);
      expect(r.data.method).toBe("ECOCASH");
    }
    expect(contributionSchema.safeParse({ workspaceId: "w1", amount: "0" }).success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("requires a description", () => {
    expect(expenseSchema.safeParse({ workspaceId: "w1", amount: "10", description: "x" }).success).toBe(false);
    expect(expenseSchema.safeParse({ workspaceId: "w1", amount: "10", description: "ESP32 board" }).success).toBe(true);
  });
});

describe("meetingSchema", () => {
  it("requires workspace, date and start time", () => {
    expect(
      meetingSchema.safeParse({ title: "Sync", date: "2026-01-01", startTime: "10:00", workspaceId: "w1" }).success,
    ).toBe(true);
    expect(
      meetingSchema.safeParse({ title: "Sync", date: "2026-01-01", startTime: "10:00", workspaceId: "" }).success,
    ).toBe(false);
  });
});
