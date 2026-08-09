import { describe, it, expect } from "vitest";
import { CATEGORY_HINTS, CATEGORY_LABELS, inQuietHours } from "@/lib/notify";
import { NotificationCategory } from "@prisma/client";

/**
 * Quiet hours is the classic silently-wrong feature: it runs while everyone is
 * asleep, so a broken window is not noticed by the person it failed, and the
 * symptom ("I get emails at 3am" or "I never get emails") is easy to blame on
 * anything else. Pinned properly.
 *
 * All times below are constructed in UTC and read in Africa/Harare (UTC+2), so
 * the assertions also prove the timezone conversion happens at all — a version
 * that ignored `timezone` entirely would pass a naive test that built dates in
 * local time.
 */
const HARARE = "Africa/Harare";

/** A UTC instant that is `hour` local time in Harare (UTC+2, no DST). */
function atHarare(hour: number): Date {
  return new Date(Date.UTC(2026, 7, 9, (hour - 2 + 24) % 24, 30));
}

describe("inQuietHours", () => {
  it("covers the whole night for a window that wraps midnight", () => {
    // THE CASE THAT BREAKS NAIVE IMPLEMENTATIONS. 22:00→07:00 means start >
    // end, and `start <= h && h < end` is false for every hour it should
    // cover — the feature would appear to do nothing at all.
    for (const hour of [22, 23, 0, 1, 3, 5, 6]) {
      expect(inQuietHours(atHarare(hour), HARARE, 22, 7)).toBe(true);
    }
  });

  it("leaves daytime alone for that same window", () => {
    for (const hour of [7, 8, 12, 17, 21]) {
      expect(inQuietHours(atHarare(hour), HARARE, 22, 7)).toBe(false);
    }
  });

  it("handles a same-day window without wrapping", () => {
    expect(inQuietHours(atHarare(14), HARARE, 13, 17)).toBe(true);
    expect(inQuietHours(atHarare(12), HARARE, 13, 17)).toBe(false);
    expect(inQuietHours(atHarare(17), HARARE, 13, 17)).toBe(false); // end exclusive
  });

  it("actually converts to the user's timezone", () => {
    // 23:30 UTC is 01:30 in Harare — inside a 22→07 window. A version that
    // read UTC hours would call this daytime and send the email anyway.
    const utcLateEvening = new Date(Date.UTC(2026, 7, 9, 23, 30));
    expect(inQuietHours(utcLateEvening, HARARE, 22, 7)).toBe(true);
    // The same instant is 18:30 in New York — outside the window.
    expect(inQuietHours(utcLateEvening, "America/New_York", 22, 7)).toBe(false);
  });

  it("treats an unset window as no quiet hours", () => {
    expect(inQuietHours(atHarare(3), HARARE, null, null)).toBe(false);
    expect(inQuietHours(atHarare(3), HARARE, 22, null)).toBe(false);
    expect(inQuietHours(atHarare(3), HARARE, undefined, 7)).toBe(false);
  });

  it("treats start === end as a zero-length window, not a silent 24 hours", () => {
    // The dangerous reading. If this returned true, a user who set both to the
    // same hour would silently stop receiving every non-urgent email forever
    // and there would be nothing on screen explaining why.
    expect(inQuietHours(atHarare(3), HARARE, 9, 9)).toBe(false);
    expect(inQuietHours(atHarare(9), HARARE, 9, 9)).toBe(false);
  });

  it("survives a nonsense timezone instead of throwing", () => {
    // This runs on the notification path. An invalid stored zone must not take
    // down the thing that was trying to tell a student their report is due.
    expect(() => inQuietHours(atHarare(3), "Not/AZone", 22, 7)).not.toThrow();
  });

  it("includes the exact start hour and excludes the exact end hour", () => {
    expect(inQuietHours(atHarare(22), HARARE, 22, 7)).toBe(true);
    expect(inQuietHours(atHarare(7), HARARE, 22, 7)).toBe(false);
  });
});

describe("category metadata", () => {
  it("labels and explains every category", () => {
    // A category with no label renders as blank in Settings; a user cannot
    // decide about a toggle whose name is missing.
    for (const category of Object.values(NotificationCategory)) {
      expect(CATEGORY_LABELS[category]?.length).toBeGreaterThan(0);
      expect(CATEGORY_HINTS[category]?.length).toBeGreaterThan(0);
    }
  });
});
