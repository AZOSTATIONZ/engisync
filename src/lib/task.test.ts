import { describe, it, expect } from "vitest";
import { Recurrence } from "@prisma/client";
import { nextDueDate } from "./task";

describe("nextDueDate", () => {
  const base = new Date("2026-01-10T09:00:00Z");

  it("returns null for non-recurring tasks", () => {
    expect(nextDueDate(base, Recurrence.NONE)).toBeNull();
  });

  it("advances by one day for DAILY", () => {
    const next = nextDueDate(base, Recurrence.DAILY);
    expect(next?.getUTCDate()).toBe(11);
  });

  it("advances by seven days for WEEKLY", () => {
    const next = nextDueDate(base, Recurrence.WEEKLY);
    expect(next?.getUTCDate()).toBe(17);
  });

  it("advances by one month for MONTHLY", () => {
    const next = nextDueDate(base, Recurrence.MONTHLY);
    expect(next?.getUTCMonth()).toBe(1); // February (0-indexed)
  });
});
