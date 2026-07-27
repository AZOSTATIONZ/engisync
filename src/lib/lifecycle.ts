/**
 * Engineering project lifecycle.
 *
 * DESIGN DECISIONS
 * ----------------
 * 1. Ten stages is a lot to render on a phone. Each stage belongs to one of
 *    four PHASES (Define / Design / Build / Deliver). Mobile shows four phase
 *    dots; desktop shows all ten. Same data, two densities.
 *
 * 2. Stages are ADVISORY. Nothing here gates an action. A team in "Planning"
 *    can still upload documents and run meetings — blocking that would be
 *    infuriating and pedagogically wrong.
 *
 * 3. Pacing is derived from `stageEnteredAt` and an optional target end date,
 *    NOT from AI. "Are we behind?" is arithmetic; it should be instant, free
 *    and identical for every viewer.
 */

export const PROJECT_STAGES = [
  "IDEA",
  "PROPOSAL",
  "PLANNING",
  "DESIGN",
  "SIMULATION",
  "IMPLEMENTATION",
  "TESTING",
  "DOCUMENTATION",
  "PRESENTATION",
  "COMPLETED",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export type ProjectPhase = "Define" | "Design" | "Build" | "Deliver";

type StageMeta = {
  label: string;
  phase: ProjectPhase;
  /** One line explaining what "done" looks like for this stage. */
  hint: string;
};

export const STAGE_META: Record<ProjectStage, StageMeta> = {
  IDEA: {
    label: "Idea",
    phase: "Define",
    hint: "Agree what problem the project solves and why it matters.",
  },
  PROPOSAL: {
    label: "Proposal",
    phase: "Define",
    hint: "Write the proposal and get it approved by your supervisor.",
  },
  PLANNING: {
    label: "Planning",
    phase: "Define",
    hint: "Set objectives, scope, milestones and who does what.",
  },
  DESIGN: {
    label: "Design",
    phase: "Design",
    hint: "Produce drawings, schematics or models of the solution.",
  },
  SIMULATION: {
    label: "Simulation",
    phase: "Design",
    hint: "Validate the design in Proteus, MATLAB, SolidWorks or similar.",
  },
  IMPLEMENTATION: {
    label: "Implementation",
    phase: "Build",
    hint: "Build the prototype, circuit, structure or software.",
  },
  TESTING: {
    label: "Testing",
    phase: "Build",
    hint: "Run tests, record results and fix what fails.",
  },
  DOCUMENTATION: {
    label: "Documentation",
    phase: "Deliver",
    hint: "Write up the report, results and references.",
  },
  PRESENTATION: {
    label: "Presentation",
    phase: "Deliver",
    hint: "Prepare slides and rehearse the defence.",
  },
  COMPLETED: {
    label: "Completed",
    phase: "Deliver",
    hint: "Submitted and signed off.",
  },
};

export const PHASES: ProjectPhase[] = ["Define", "Design", "Build", "Deliver"];

export function stageIndex(stage: ProjectStage): number {
  const i = PROJECT_STAGES.indexOf(stage);
  return i === -1 ? 0 : i;
}

export function stagesInPhase(phase: ProjectPhase): ProjectStage[] {
  return PROJECT_STAGES.filter((s) => STAGE_META[s].phase === phase);
}

/** How far through the lifecycle, 0–100. */
export function stageProgress(stage: ProjectStage): number {
  return Math.round((stageIndex(stage) / (PROJECT_STAGES.length - 1)) * 100);
}

export function nextStage(stage: ProjectStage): ProjectStage | null {
  const i = stageIndex(stage);
  return i < PROJECT_STAGES.length - 1 ? PROJECT_STAGES[i + 1] : null;
}

export function previousStage(stage: ProjectStage): ProjectStage | null {
  const i = stageIndex(stage);
  return i > 0 ? PROJECT_STAGES[i - 1] : null;
}

export type PaceStatus = "on-track" | "watch" | "behind" | "done" | "unknown";

export type Pace = {
  status: PaceStatus;
  /** Days spent in the current stage. */
  daysInStage: number;
  /** Plain-language summary, safe to show a student. */
  message: string;
  /** Expected progress 0–100 given the target date, null if none set. */
  expectedProgress: number | null;
  actualProgress: number;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Is this project behind?
 *
 * Two independent signals:
 *  - Elapsed time against `targetEndDate` compared with lifecycle progress.
 *  - Time parked in the current stage (a stall is a problem even when the
 *    overall deadline is far away).
 *
 * Deliberately conservative in wording: this is a prompt to look, not a verdict.
 */
export function getPace(
  stage: ProjectStage,
  stageEnteredAt: Date,
  targetEndDate: Date | null,
  createdAt: Date,
  now: Date = new Date(),
): Pace {
  const daysInStage = Math.max(
    0,
    Math.floor((now.getTime() - stageEnteredAt.getTime()) / DAY),
  );
  const actualProgress = stageProgress(stage);

  if (stage === "COMPLETED") {
    return {
      status: "done",
      daysInStage,
      message: "Project complete.",
      expectedProgress: 100,
      actualProgress: 100,
    };
  }

  // Stall detection works without a target date.
  const stalled = daysInStage >= 21;
  const slowing = daysInStage >= 14;

  if (!targetEndDate) {
    if (stalled) {
      return {
        status: "behind",
        daysInStage,
        message: `No movement out of ${STAGE_META[stage].label} for ${daysInStage} days.`,
        expectedProgress: null,
        actualProgress,
      };
    }
    return {
      status: slowing ? "watch" : "unknown",
      daysInStage,
      message: slowing
        ? `${daysInStage} days in ${STAGE_META[stage].label}. Set a target date to track pace.`
        : "Set a target end date to track whether you're on schedule.",
      expectedProgress: null,
      actualProgress,
    };
  }

  const total = targetEndDate.getTime() - createdAt.getTime();
  const elapsed = now.getTime() - createdAt.getTime();

  if (total <= 0) {
    return {
      status: "unknown",
      daysInStage,
      message: "Target end date is before the project start date.",
      expectedProgress: null,
      actualProgress,
    };
  }

  const expectedProgress = Math.min(
    100,
    Math.max(0, Math.round((elapsed / total) * 100)),
  );
  const gap = expectedProgress - actualProgress;
  const daysLeft = Math.ceil((targetEndDate.getTime() - now.getTime()) / DAY);

  if (daysLeft < 0) {
    return {
      status: "behind",
      daysInStage,
      message: `Target date passed ${Math.abs(daysLeft)} days ago and the project is at ${STAGE_META[stage].label}.`,
      expectedProgress,
      actualProgress,
    };
  }

  if (gap >= 25 || stalled) {
    return {
      status: "behind",
      daysInStage,
      message: stalled
        ? `Stuck in ${STAGE_META[stage].label} for ${daysInStage} days, with ${daysLeft} days left.`
        : `About ${gap}% behind where the schedule expects, with ${daysLeft} days left.`,
      expectedProgress,
      actualProgress,
    };
  }

  if (gap >= 10 || slowing) {
    return {
      status: "watch",
      daysInStage,
      message: `Slightly behind schedule — ${daysLeft} days left to reach Completed.`,
      expectedProgress,
      actualProgress,
    };
  }

  return {
    status: "on-track",
    daysInStage,
    message: `On track — ${daysLeft} days until the target date.`,
    expectedProgress,
    actualProgress,
  };
}

export const PACE_LABEL: Record<PaceStatus, string> = {
  "on-track": "On track",
  watch: "Watch",
  behind: "Behind",
  done: "Complete",
  unknown: "No target set",
};
