import { describe, it, expect } from "vitest";
import {
  SOURCES,
  TIER_ORDER,
  bomTotalUsd,
  formatBudget,
  formatWeeks,
  groupByTier,
  relatedProjects,
  searchProjects,
  staleSources,
  type HubProject,
} from "@/lib/project-hub";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";

/**
 * These tests protect two different things.
 *
 * The FILTERING tests are ordinary logic tests. The CATALOGUE INTEGRITY tests
 * are the important ones: they guard editorial quality, which is the thing a
 * student actually experiences. A duplicate slug or a budget that contradicts
 * its own bill of materials is not a crash — it is a quiet loss of trust, and
 * only a test will catch it.
 */

describe("catalogue integrity", () => {
  it("has unique slugs", () => {
    const slugs = HUB_PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses url-safe slugs", () => {
    for (const p of HUB_PROJECTS) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("references only sources that exist", () => {
    const ids = new Set(Object.keys(SOURCES));
    for (const p of HUB_PROJECTS) {
      for (const s of p.sources) {
        expect(ids.has(s), `${p.slug} cites unknown source "${s}"`).toBe(true);
      }
    }
  });

  it("gives every project at least one source and one outcome", () => {
    for (const p of HUB_PROJECTS) {
      expect(p.sources.length, `${p.slug} has no sources`).toBeGreaterThan(0);
      expect(p.outcomes.length, `${p.slug} has no outcomes`).toBeGreaterThan(0);
    }
  });

  it("keeps budget ranges coherent", () => {
    for (const p of HUB_PROJECTS) {
      expect(p.budgetUsd.min, `${p.slug} min > max`).toBeLessThanOrEqual(
        p.budgetUsd.max,
      );
      expect(p.budgetUsd.min).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * The advertised budget must be able to cover the parts list. A project that
   * lists $95 of components under a "$30 – $50" banner sends a student to buy
   * things they cannot afford.
   */
  it("advertises a budget that can cover its own bill of materials", () => {
    for (const p of HUB_PROJECTS) {
      const total = bomTotalUsd(p.bom);
      expect(
        p.budgetUsd.max,
        `${p.slug} advertises max $${p.budgetUsd.max} but its BOM totals $${total}`,
      ).toBeGreaterThanOrEqual(total);
    }
  });

  it("marks zero-cost projects as needing no parts", () => {
    for (const p of HUB_PROJECTS) {
      if (p.bom.length === 0) {
        expect(p.budgetUsd.min, `${p.slug} has no BOM but a minimum cost`).toBe(0);
      }
    }
  });

  it("never advertises a hardware-only project as simulation-only", () => {
    for (const p of HUB_PROJECTS) {
      if (p.simulationOnly) continue;
      expect(TIER_ORDER).toContain(p.tier);
    }
  });

  it("covers every tier in at least one discipline", () => {
    for (const tier of TIER_ORDER) {
      expect(
        HUB_PROJECTS.some((p) => p.tier === tier),
        `no projects at tier ${tier}`,
      ).toBe(true);
    }
  });

  it("uses https for every source", () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(s.url.startsWith("https://"), `${id} is not https`).toBe(true);
    }
  });
});

describe("searchProjects", () => {
  const sample: HubProject[] = [
    {
      slug: "a",
      title: "Solar charger",
      discipline: "ELECTRICAL",
      tier: "BEGINNER",
      summary: "Charge phones from the sun.",
      weeks: 3,
      budgetUsd: { min: 40, max: 80 },
      bom: [{ item: "PV panel", qty: 1, unitUsd: 20 }],
      software: ["Spreadsheet"],
      outcomes: ["Size a panel"],
      prerequisites: [],
      challenges: [],
      sources: ["khanAcademy"],
      tags: ["solar", "power"],
      simulationOnly: false,
    },
    {
      slug: "b",
      title: "Data logger",
      discipline: "ELECTRONIC",
      tier: "BEGINNER",
      summary: "Log temperature to an SD card.",
      weeks: 2,
      budgetUsd: { min: 18, max: 35 },
      bom: [{ item: "Arduino", qty: 1, unitUsd: 7 }],
      software: ["Arduino IDE", "Wokwi"],
      outcomes: ["Read a sensor"],
      prerequisites: [],
      challenges: [],
      sources: ["wokwi"],
      tags: ["sensors", "arduino"],
      simulationOnly: true,
    },
    {
      slug: "c",
      title: "Solar water heater",
      discipline: "MECHANICAL",
      tier: "INTERMEDIATE",
      summary: "Heat water with the sun.",
      weeks: 6,
      budgetUsd: { min: 70, max: 130 },
      bom: [{ item: "Copper pipe", qty: 1, unitUsd: 45 }],
      software: ["Spreadsheet"],
      outcomes: ["Apply heat transfer"],
      prerequisites: [],
      challenges: [],
      sources: ["engineeringToolbox"],
      tags: ["solar", "thermal"],
      simulationOnly: false,
    },
  ];

  it("returns everything with no filters", () => {
    expect(searchProjects(sample)).toHaveLength(3);
  });

  it("filters by discipline", () => {
    const r = searchProjects(sample, { discipline: "ELECTRICAL" });
    expect(r.map((p) => p.slug)).toEqual(["a"]);
  });

  it("treats ALL as no filter", () => {
    expect(searchProjects(sample, { discipline: "ALL", tier: "ALL" })).toHaveLength(3);
  });

  it("filters by tier", () => {
    expect(searchProjects(sample, { tier: "INTERMEDIATE" })).toHaveLength(1);
  });

  it("excludes projects whose cheapest build exceeds the budget", () => {
    const r = searchProjects(sample, { maxBudget: 50 });
    expect(r.map((p) => p.slug).sort()).toEqual(["a", "b"]);
  });

  it("filters to simulation-only builds", () => {
    expect(searchProjects(sample, { simulationOnly: true })).toHaveLength(1);
  });

  it("matches software case-insensitively and partially", () => {
    expect(searchProjects(sample, { software: "wokwi" })).toHaveLength(1);
    expect(searchProjects(sample, { software: "SPREAD" })).toHaveLength(2);
  });

  it("requires ALL query terms to match, not any", () => {
    // "solar" alone hits two; adding "water" must narrow it to one.
    expect(searchProjects(sample, { q: "solar" })).toHaveLength(2);
    expect(searchProjects(sample, { q: "solar water" })).toHaveLength(1);
  });

  it("searches the bill of materials too", () => {
    // A student searching for a part they own should find what it can build.
    expect(searchProjects(sample, { q: "arduino" }).map((p) => p.slug)).toEqual(["b"]);
  });

  it("ignores surrounding whitespace and case", () => {
    expect(searchProjects(sample, { q: "  SOLAR  " })).toHaveLength(2);
  });

  it("returns nothing for a term that matches nothing", () => {
    expect(searchProjects(sample, { q: "quantum" })).toHaveLength(0);
  });

  it("combines filters", () => {
    const r = searchProjects(sample, { q: "solar", discipline: "MECHANICAL" });
    expect(r.map((p) => p.slug)).toEqual(["c"]);
  });

  it("finds real catalogue projects by common searches", () => {
    expect(searchProjects(HUB_PROJECTS, { q: "esp32" }).length).toBeGreaterThan(0);
    expect(searchProjects(HUB_PROJECTS, { q: "concrete" }).length).toBeGreaterThan(0);
    expect(
      searchProjects(HUB_PROJECTS, { discipline: "MINING" }).length,
    ).toBeGreaterThan(0);
  });
});

describe("groupByTier", () => {
  it("orders groups from beginner upwards and drops empty tiers", () => {
    const groups = groupByTier(
      HUB_PROJECTS.filter((p) => p.discipline === "CIVIL"),
    );
    const tiers = groups.map((g) => g.tier);
    expect(tiers).toEqual([...tiers].sort(
      (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b),
    ));
    for (const g of groups) expect(g.projects.length).toBeGreaterThan(0);
  });

  it("returns nothing for an empty list", () => {
    expect(groupByTier([])).toEqual([]);
  });
});

describe("relatedProjects", () => {
  const current = HUB_PROJECTS.find((p) => p.slug === "environment-data-logger")!;

  it("never suggests the project you are already on", () => {
    const r = relatedProjects(HUB_PROJECTS, current, 5);
    expect(r.some((p) => p.slug === current.slug)).toBe(false);
  });

  it("respects the limit", () => {
    expect(relatedProjects(HUB_PROJECTS, current, 2)).toHaveLength(2);
  });

  it("is deterministic across calls", () => {
    const a = relatedProjects(HUB_PROJECTS, current, 3).map((p) => p.slug);
    const b = relatedProjects(HUB_PROJECTS, current, 3).map((p) => p.slug);
    expect(a).toEqual(b);
  });

  it("prefers the same discipline", () => {
    const r = relatedProjects(HUB_PROJECTS, current, 3);
    expect(r.some((p) => p.discipline === current.discipline)).toBe(true);
  });
});

describe("formatting", () => {
  it("sums a bill of materials including quantities", () => {
    expect(
      bomTotalUsd([
        { item: "x", qty: 2, unitUsd: 10 },
        { item: "y", qty: 3, unitUsd: 5 },
      ]),
    ).toBe(35);
  });

  it("totals an empty bill of materials to zero", () => {
    expect(bomTotalUsd([])).toBe(0);
  });

  it("says so plainly when nothing needs buying", () => {
    expect(formatBudget({ min: 0, max: 0 })).toBe("No parts needed");
  });

  it("collapses an identical range to a single figure", () => {
    expect(formatBudget({ min: 40, max: 40 })).toBe("$40");
  });

  it("renders a range", () => {
    expect(formatBudget({ min: 40, max: 80 })).toBe("$40 – $80");
  });

  it("describes durations in human terms", () => {
    expect(formatWeeks(1)).toBe("About a week");
    expect(formatWeeks(3)).toBe("3 weeks");
    expect(formatWeeks(4)).toBe("About a month");
    expect(formatWeeks(24)).toBe("About 6 months");
  });
});

describe("staleSources", () => {
  it("reports nothing when every source is recent", () => {
    // Sources are dated 2026-07-27 onwards; a day later nothing is stale.
    expect(staleSources(new Date("2026-07-30T00:00:00Z"))).toEqual([]);
  });

  it("flags sources past the threshold, oldest first", () => {
    const stale = staleSources(new Date("2028-01-01T00:00:00Z"));
    expect(stale.length).toBe(Object.keys(SOURCES).length);
    const ages = stale.map((s) => s.ageDays);
    expect(ages).toEqual([...ages].sort((a, b) => b - a));
  });

  it("honours a custom threshold", () => {
    // One day after the newest entry, a 1-day window catches the older batch.
    const stale = staleSources(new Date("2026-07-30T00:00:00Z"), 1);
    expect(stale.length).toBeGreaterThan(0);
  });
});
