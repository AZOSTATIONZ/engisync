import { describe, it, expect } from "vitest";
import {
  ACCENTS,
  ACCENT_KEYS,
  DEFAULT_ACCENT,
  EMPTY_STATS,
  LIMITS,
  clampText,
  computeBadges,
  defaultAvatarStyle,
  hashString,
  initials,
  isAccentKey,
  isAvatarStyle,
  parseSkills,
  resolveAccent,
  resolveAvatarStyle,
  type ContributionStats,
} from "@/lib/personalization";

describe("accent colours", () => {
  it("falls back to the default for anything unrecognised", () => {
    for (const bad of [null, undefined, "", "octarine", "#ff0000", 42, {}]) {
      expect(resolveAccent(bad as string)).toBe(DEFAULT_ACCENT);
    }
  });

  it("accepts every key in the palette", () => {
    for (const k of ACCENT_KEYS) expect(resolveAccent(k)).toBe(k);
  });

  it("rejects a free-form hex value", () => {
    // The palette is fixed precisely so personalization cannot break contrast.
    expect(isAccentKey("#ffff00")).toBe(false);
  });

  it("defines both light and dark values for every accent", () => {
    for (const k of ACCENT_KEYS) {
      expect(ACCENTS[k].light).toMatch(/^\d+ \d+% \d+%$/);
      expect(ACCENTS[k].dark).toMatch(/^\d+ \d+% \d+%$/);
      expect(ACCENTS[k].swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("generated avatars", () => {
  it("is deterministic for the same id", () => {
    expect(defaultAvatarStyle("user_abc")).toBe(defaultAvatarStyle("user_abc"));
    expect(hashString("user_abc")).toBe(hashString("user_abc"));
  });

  it("gives different ids different hashes", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("always produces a valid style", () => {
    for (let i = 0; i < 200; i++) {
      expect(isAvatarStyle(defaultAvatarStyle(`user_${i}`))).toBe(true);
    }
  });

  it("spreads ids across the available styles", () => {
    const seen = new Set(
      Array.from({ length: 300 }, (_, i) => defaultAvatarStyle(`u${i}`)),
    );
    // A hash that collapsed everything onto one style would give every student
    // the same face, which defeats the point.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("honours a stored choice but repairs an invalid one", () => {
    expect(resolveAvatarStyle("gear", "u1")).toBe("gear");
    expect(resolveAvatarStyle("nonsense", "u1")).toBe(defaultAvatarStyle("u1"));
    expect(resolveAvatarStyle(null, "u1")).toBe(defaultAvatarStyle("u1"));
  });
});

describe("initials", () => {
  it("takes first and last for a full name", () => {
    expect(initials("Tafadzwa Musendo")).toBe("TM");
    expect(initials("Ada Byron Lovelace")).toBe("AL");
  });

  it("takes two letters from a single name", () => {
    expect(initials("Donkey")).toBe("DO");
  });

  it("returns empty for nothing usable", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
    expect(initials(null)).toBe("");
    expect(initials(undefined)).toBe("");
  });

  it("copes with extra whitespace", () => {
    expect(initials("  Tafadzwa   Musendo  ")).toBe("TM");
  });
});

describe("parseSkills", () => {
  it("splits, trims and drops blanks", () => {
    expect(parseSkills("MATLAB, KiCad ,, Python ")).toEqual([
      "MATLAB",
      "KiCad",
      "Python",
    ]);
  });

  it("deduplicates case-insensitively but keeps the original casing", () => {
    // "MATLAB" must not become "matlab" just to make comparison easier.
    expect(parseSkills("MATLAB, matlab, MatLab")).toEqual(["MATLAB"]);
    expect(parseSkills("SolidWorks, solidworks")).toEqual(["SolidWorks"]);
  });

  it("caps the number of skills", () => {
    const many = Array.from({ length: 40 }, (_, i) => `skill${i}`).join(",");
    expect(parseSkills(many)).toHaveLength(LIMITS.skills);
  });

  it("caps the length of a single skill", () => {
    const [only] = parseSkills("x".repeat(200));
    expect(only.length).toBe(LIMITS.skillLength);
  });

  it("collapses internal whitespace", () => {
    expect(parseSkills("Power    Electronics")).toEqual(["Power Electronics"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseSkills("")).toEqual([]);
    expect(parseSkills("   ,  , ")).toEqual([]);
  });
});

describe("clampText", () => {
  it("trims and truncates", () => {
    expect(clampText("  hello  ", 80)).toBe("hello");
    expect(clampText("abcdef", 3)).toBe("abc");
  });

  it("collapses newlines and repeated spaces", () => {
    expect(clampText("a\n\nb   c", 80)).toBe("a b c");
  });
});

describe("computeBadges", () => {
  const stats = (over: Partial<ContributionStats> = {}): ContributionStats => ({
    ...EMPTY_STATS,
    ...over,
  });

  it("gives a new account nothing", () => {
    // Badges are earned. A fresh profile showing awards would devalue all of them.
    expect(computeBadges(EMPTY_STATS)).toEqual([]);
  });

  it("awards only the highest task tier, never the ladder", () => {
    const ids = computeBadges(stats({ tasksCompleted: 250 })).map((b) => b.id);
    expect(ids).toContain("task-200");
    expect(ids).not.toContain("task-50");
    expect(ids).not.toContain("task-10");
    expect(ids).not.toContain("first-task");
  });

  it("moves through the task tiers at the right thresholds", () => {
    const at = (n: number) =>
      computeBadges(stats({ tasksCompleted: n })).map((b) => b.id);
    expect(at(0)).toEqual([]);
    expect(at(1)).toEqual(["first-task"]);
    expect(at(9)).toEqual(["first-task"]);
    expect(at(10)).toEqual(["task-10"]);
    expect(at(49)).toEqual(["task-10"]);
    expect(at(50)).toEqual(["task-50"]);
    expect(at(199)).toEqual(["task-50"]);
    expect(at(200)).toEqual(["task-200"]);
  });

  it("requires real downloads before claiming referenced work", () => {
    expect(
      computeBadges(stats({ repositoryDownloads: 9 })).map((b) => b.id),
    ).not.toContain("cited");
    expect(
      computeBadges(stats({ repositoryDownloads: 10 })).map((b) => b.id),
    ).toContain("cited");
  });

  it("leads with the strongest claim", () => {
    const ids = computeBadges(
      stats({
        supervises: 2,
        projectsPublished: 1,
        tasksCompleted: 12,
      }),
    ).map((b) => b.id);
    expect(ids[0]).toBe("supervisor");
    expect(ids.indexOf("published")).toBeLessThan(ids.indexOf("task-10"));
  });

  it("explains what every badge was earned for", () => {
    const badges = computeBadges(
      stats({
        supervises: 1,
        projectsPublished: 2,
        sectionsApproved: 3,
        projectsLed: 1,
        contributionsVerified: 4,
        repositoryDownloads: 25,
        tasksCompleted: 60,
      }),
    );
    for (const b of badges) {
      expect(b.earnedFor.length).toBeGreaterThan(0);
      // A badge nobody can explain is a sticker, not a credential.
      expect(b.label.length).toBeGreaterThan(0);
    }
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length);
  });

  it("uses singular and plural correctly", () => {
    const one = computeBadges(stats({ projectsPublished: 1 }))[0];
    expect(one.earnedFor).toContain("1 project ");
    const two = computeBadges(stats({ projectsPublished: 2 }))[0];
    expect(two.earnedFor).toContain("2 projects ");
  });

  it("never rewards mere activity", () => {
    // There is no input here for logins, sessions or time spent — by design.
    const keys = Object.keys(EMPTY_STATS);
    for (const forbidden of ["logins", "streak", "sessions", "timeSpent", "points"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
