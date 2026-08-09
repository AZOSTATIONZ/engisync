import { describe, it, expect } from "vitest";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";
import { DISCIPLINE_LABEL, SOURCES, TIER_META } from "@/lib/project-hub";

/**
 * Integrity of the project catalogue.
 *
 * Everything here fails SILENTLY in production if it is wrong. A duplicate
 * slug renders two entries at one URL and the second is unreachable. A source
 * key that does not exist renders an empty reference list, and a student
 * concludes the brief has no reading rather than that we made a typo. A
 * budget whose parts do not add up is worse than no budget, because somebody
 * plans a project around it and runs out of money mid-build.
 *
 * None of that throws. Hence these.
 */
describe("project catalogue integrity", () => {
  it("has no duplicate slugs", () => {
    // The slug is the URL. A duplicate makes one of the two entries
    // permanently unreachable and nothing anywhere complains.
    const seen = new Map<string, number>();
    for (const p of HUB_PROJECTS) seen.set(p.slug, (seen.get(p.slug) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([s]) => s);
    expect(dupes).toEqual([]);
  });

  it("cites only source keys that exist", () => {
    // The file's own editorial rule: a plausible-looking URL written from
    // memory is worse than no link, because a student trusts it.
    const valid = new Set(Object.keys(SOURCES));
    const bad: string[] = [];
    for (const p of HUB_PROJECTS) {
      for (const s of p.sources) if (!valid.has(s)) bad.push(`${p.slug} → ${s}`);
    }
    expect(bad).toEqual([]);
  });

  it("uses only real disciplines and tiers", () => {
    for (const p of HUB_PROJECTS) {
      expect(DISCIPLINE_LABEL[p.discipline], p.slug).toBeDefined();
      expect(TIER_META[p.tier], p.slug).toBeDefined();
    }
  });

  it("gives every COSTED project a bill of materials that supports its budget", () => {
    /* An empty parts list is correct for a project that costs nothing — a
       CLI tool and a LaTeX report genuinely need no components, and forcing a
       placeholder line ("None — existing computer") would be noise pretending
       to be rigour. The rule that matters is the other direction: a project
       claiming a budget must show what the money is for. My first version of
       this test demanded a BOM from everything and failed two perfectly good
       entries, which is the test being wrong rather than the data. */
    for (const p of HUB_PROJECTS) {
      expect(p.budgetUsd.min, p.slug).toBeLessThanOrEqual(p.budgetUsd.max);

      if (p.budgetUsd.max === 0) {
        expect(p.bom.length, `${p.slug} costs nothing but lists parts`).toBe(0);
        continue;
      }
      expect(p.bom.length, `${p.slug} claims a budget but lists no parts`).toBeGreaterThan(0);

      // NOTE: whether the budget covers the BOM is asserted in
      // project-hub.test.ts, exactly and without slack. An earlier version of
      // this file duplicated that check with a 0.6 fudge factor, which is how
      // a genuine $37-of-parts-on-a-$35-budget error would have passed here
      // while failing there. One rule per property.
    }
  });

  it("tells a student what they will get out of it and what will be hard", () => {
    /* Outcomes and challenges are required of everything: an entry without
       challenges reads as easy and is not, which is how a student picks a
       final-year project by accident.

       PREREQUISITES ARE ALLOWED TO BE EMPTY. Some projects genuinely need
       nothing beforehand — a technical report in LaTeX is deliberately open
       to anyone — and an empty list there is a welcoming statement rather
       than a missing field. */
    for (const p of HUB_PROJECTS) {
      expect(p.outcomes.length, `${p.slug} outcomes`).toBeGreaterThan(0);
      expect(p.challenges.length, `${p.slug} challenges`).toBeGreaterThan(0);
      expect(p.weeks, `${p.slug} weeks`).toBeGreaterThan(0);
    }
  });

  it("gives the biggest departments more than a handful of options", () => {
    // The reason the extra catalogue exists. Electronic Engineering holds 11
    // of 41 students and Civil holds 7; four ideas between eleven people
    // guarantees collisions in a project class. Pinned so a future tidy-up
    // cannot quietly rebalance back to symmetry.
    const count = (d: string) =>
      HUB_PROJECTS.filter((p) => p.discipline === d).length;

    expect(count("ELECTRONIC"), "Electronic").toBeGreaterThanOrEqual(8);
    expect(count("CIVIL"), "Civil").toBeGreaterThanOrEqual(8);
    expect(count("CHEMICAL"), "Chemical").toBeGreaterThanOrEqual(7);
  });

  it("offers a beginner entry point in every discipline with students", () => {
    // A discipline whose cheapest project is ADVANCED is closed to the first
    // and second years who most need somewhere to start.
    for (const d of ["ELECTRONIC", "CIVIL", "CHEMICAL", "ELECTRICAL", "MECHANICAL"]) {
      const beginners = HUB_PROJECTS.filter(
        (p) => p.discipline === d && p.tier === "BEGINNER",
      );
      expect(beginners.length, `${d} has no beginner project`).toBeGreaterThan(0);
    }
  });
});
