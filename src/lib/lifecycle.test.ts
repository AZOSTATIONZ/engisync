import { describe, expect, it } from "vitest";
import {
  PROJECT_STAGES,
  STAGE_META,
  getPace,
  nextStage,
  previousStage,
  stageIndex,
  stageProgress,
  stagesInPhase,
  PHASES,
  type ProjectStage,
} from "./lifecycle";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-27T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY);
}
function daysAhead(n: number): Date {
  return new Date(NOW.getTime() + n * DAY);
}

describe("stage metadata", () => {
  it("has metadata for every stage", () => {
    for (const s of PROJECT_STAGES) {
      expect(STAGE_META[s]).toBeDefined();
      expect(STAGE_META[s].label.length).toBeGreaterThan(0);
      expect(STAGE_META[s].hint.length).toBeGreaterThan(0);
    }
  });

  it("assigns every stage to exactly one phase, covering all ten", () => {
    const grouped = PHASES.flatMap(stagesInPhase);
    expect(grouped).toHaveLength(PROJECT_STAGES.length);
    expect(new Set(grouped).size).toBe(PROJECT_STAGES.length);
  });

  it("keeps phases contiguous — a phase must not straddle other phases", () => {
    for (const phase of PHASES) {
      const idxs = stagesInPhase(phase).map(stageIndex);
      const min = Math.min(...idxs);
      const max = Math.max(...idxs);
      expect(max - min).toBe(idxs.length - 1);
    }
  });
});

describe("stage navigation", () => {
  it("progresses 0 → 100 across the lifecycle", () => {
    expect(stageProgress("IDEA")).toBe(0);
    expect(stageProgress("COMPLETED")).toBe(100);
  });

  it("increases monotonically", () => {
    let last = -1;
    for (const s of PROJECT_STAGES) {
      const p = stageProgress(s);
      expect(p).toBeGreaterThan(last);
      last = p;
    }
  });

  it("has no next stage after COMPLETED and no previous before IDEA", () => {
    expect(nextStage("COMPLETED")).toBeNull();
    expect(previousStage("IDEA")).toBeNull();
    expect(nextStage("IDEA")).toBe("PROPOSAL");
    expect(previousStage("COMPLETED")).toBe("PRESENTATION");
  });
});

describe("getPace — without a target date", () => {
  it("reports unknown when recently moved", () => {
    const p = getPace("DESIGN", daysAgo(2), null, daysAgo(30), NOW);
    expect(p.status).toBe("unknown");
    expect(p.expectedProgress).toBeNull();
  });

  it("warns after two weeks in one stage", () => {
    const p = getPace("DESIGN", daysAgo(15), null, daysAgo(40), NOW);
    expect(p.status).toBe("watch");
  });

  it("flags a stall after three weeks even with no deadline", () => {
    const p = getPace("DESIGN", daysAgo(25), null, daysAgo(60), NOW);
    expect(p.status).toBe("behind");
    expect(p.message).toContain("25 days");
  });
});

describe("getPace — with a target date", () => {
  it("is on track when progress matches elapsed time", () => {
    // Halfway through the calendar, halfway through the lifecycle.
    const p = getPace("SIMULATION", daysAgo(3), daysAhead(50), daysAgo(50), NOW);
    expect(p.expectedProgress).toBe(50);
    expect(p.status).toBe("on-track");
  });

  it("is behind when the lifecycle lags the calendar badly", () => {
    // 80% of the time gone, still at stage 2 of 10.
    const p = getPace("PROPOSAL", daysAgo(5), daysAhead(20), daysAgo(80), NOW);
    expect(p.expectedProgress).toBe(80);
    expect(p.actualProgress).toBeLessThan(20);
    expect(p.status).toBe("behind");
  });

  it("flags an overdue target date regardless of stage", () => {
    const p = getPace("TESTING", daysAgo(1), daysAgo(5), daysAgo(60), NOW);
    expect(p.status).toBe("behind");
    expect(p.message).toContain("5 days ago");
  });

  it("treats COMPLETED as done even past the target date", () => {
    const p = getPace("COMPLETED", daysAgo(1), daysAgo(10), daysAgo(60), NOW);
    expect(p.status).toBe("done");
    expect(p.actualProgress).toBe(100);
  });

  it("handles a target date before the start date without crashing", () => {
    const p = getPace("DESIGN", daysAgo(1), daysAgo(90), daysAgo(30), NOW);
    expect(p.status).toBe("unknown");
  });

  it("never reports negative days in stage for a future timestamp", () => {
    const p = getPace("DESIGN", daysAhead(2), daysAhead(30), daysAgo(10), NOW);
    expect(p.daysInStage).toBeGreaterThanOrEqual(0);
  });

  it("clamps expected progress to 0–100", () => {
    const p = getPace("DESIGN", daysAgo(1), daysAhead(1), daysAgo(365), NOW);
    expect(p.expectedProgress).toBeLessThanOrEqual(100);
    expect(p.expectedProgress).toBeGreaterThanOrEqual(0);
  });
});

describe("getPace — stall beats a comfortable deadline", () => {
  it("still flags a long stall when the deadline is far away", () => {
    // Only 10% of time elapsed, but parked in one stage for 30 days.
    const p = getPace("DESIGN", daysAgo(30), daysAhead(300), daysAgo(30), NOW);
    expect(p.status).toBe("behind");
    expect(p.message).toContain("Stuck");
  });
});

describe("stage type safety", () => {
  it("stageIndex falls back to 0 for an unknown value", () => {
    expect(stageIndex("NOT_A_STAGE" as ProjectStage)).toBe(0);
  });
});
