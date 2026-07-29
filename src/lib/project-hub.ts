/**
 * Project Hub — types, verified sources, and query logic.
 *
 * WHY THIS IS CODE AND NOT DATABASE ROWS
 * --------------------------------------
 * These projects are EDITORIAL content, not user data. Nobody creates them
 * through the app; they are written, reviewed, and corrected by whoever
 * maintains EngiSync. Putting them in a TypeScript module rather than a table
 * means:
 *
 *   - no migration is needed to add a project,
 *   - a wrong budget or a dead link is fixed in a reviewable pull request
 *     rather than by editing production data,
 *   - the compiler catches a malformed entry before it ever renders,
 *   - filtering a few hundred items in memory is faster than a round trip.
 *
 * Student-generated data ABOUT these projects (bookmarks, ratings, "our group
 * built this") belongs in the database, keyed by `slug`. That split is
 * deliberate: the catalogue is versioned with the code, the opinions are not.
 *
 * WHY LINKS ARE REFERENCED BY ID
 * ------------------------------
 * Every external URL lives once, in `SOURCES`. Projects cite a source by key.
 * Link rot is the thing that kills a resource hub, and this makes each URL
 * appear in exactly one place — so a moved page is a one-line fix rather than
 * a search through forty project entries. Only URLs that have actually been
 * fetched and confirmed belong in `SOURCES`; a plausible-looking URL written
 * from memory is worse than no link at all, because a student trusts it.
 */

export type Discipline =
  | "ELECTRICAL"
  | "ELECTRONIC"
  | "COMPUTER"
  | "SOFTWARE"
  | "MECHANICAL"
  | "CIVIL"
  | "CHEMICAL"
  | "INDUSTRIAL"
  | "MINING"
  | "GENERAL";

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  ELECTRICAL: "Electrical",
  ELECTRONIC: "Electronic",
  COMPUTER: "Computer",
  SOFTWARE: "Software",
  MECHANICAL: "Mechanical",
  CIVIL: "Civil",
  CHEMICAL: "Chemical",
  INDUSTRIAL: "Industrial",
  MINING: "Mining",
  GENERAL: "All disciplines",
};

/**
 * Tiers, not difficulty labels.
 *
 * "Advanced" tells a student nothing about whether they can attempt something
 * this semester. Year-of-study framing does, because that is how they actually
 * plan. FINAL_YEAR is separated from ADVANCED because a final-year project has
 * a different obligation — it has to be defensible to a supervisor and produce
 * a report, not merely be difficult.
 */
export type Tier = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "FINAL_YEAR";

export const TIER_META: Record<
  Tier,
  { label: string; blurb: string; typicalYear: string }
> = {
  BEGINNER: {
    label: "Beginner",
    blurb: "First build. Expect to follow a guide closely.",
    typicalYear: "Year 1",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    blurb: "You choose some of the design. Debugging is part of the work.",
    typicalYear: "Year 2",
  },
  ADVANCED: {
    label: "Advanced",
    blurb: "Design decisions are yours to justify. No single tutorial covers it.",
    typicalYear: "Year 3",
  },
  FINAL_YEAR: {
    label: "Final year",
    blurb: "Enough scope for a full report, defence, and supervisor review.",
    typicalYear: "Year 4+",
  },
};

export const TIER_ORDER: Tier[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "FINAL_YEAR",
];

/** A verified external resource. Every URL in the hub resolves through here. */
export type Source = {
  name: string;
  url: string;
  kind:
    | "documentation"
    | "tutorial"
    | "simulator"
    | "software"
    | "community"
    | "course"
    | "reference"
    | "research";
  /** ISO date the URL was last confirmed to load. Drives the staleness audit. */
  verified: string;
};

/**
 * Every URL used anywhere in the Project Hub.
 *
 * `verified` is the date the page was actually fetched — not the date the
 * entry was written. `staleSources()` uses it so link maintenance is a visible
 * chore rather than something discovered by a frustrated student.
 */
export const SOURCES = {
  // ── Verified 2026-07-29 ──
  arduinoProjectHub: {
    name: "Arduino Project Hub",
    url: "https://projecthub.arduino.cc/",
    kind: "community",
    verified: "2026-07-29",
  },
  randomNerd: {
    name: "Random Nerd Tutorials",
    url: "https://randomnerdtutorials.com/",
    kind: "tutorial",
    verified: "2026-07-29",
  },
  tinkercadCircuits: {
    name: "Tinkercad Circuits",
    url: "https://www.tinkercad.com/circuits",
    kind: "simulator",
    verified: "2026-07-29",
  },
  adafruitLearn: {
    name: "Adafruit Learning System",
    url: "https://learn.adafruit.com/",
    kind: "tutorial",
    verified: "2026-07-29",
  },
  hackster: {
    name: "Hackster.io",
    url: "https://www.hackster.io/",
    kind: "community",
    verified: "2026-07-29",
  },
  rosDocs: {
    name: "ROS 2 Documentation",
    url: "https://docs.ros.org/en/rolling/index.html",
    kind: "documentation",
    verified: "2026-07-29",
  },
  freecad: {
    name: "FreeCAD",
    url: "https://www.freecad.org/",
    kind: "software",
    verified: "2026-07-29",
  },
  platformio: {
    name: "PlatformIO Documentation",
    url: "https://docs.platformio.org/en/latest/",
    kind: "documentation",
    verified: "2026-07-29",
  },
  mitOcw: {
    name: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/",
    kind: "course",
    verified: "2026-07-29",
  },

  // ── Carried over from the vetted TRUSTED_CATALOG ──
  wokwi: {
    name: "Wokwi",
    url: "https://wokwi.com",
    kind: "simulator",
    verified: "2026-07-27",
  },
  kicad: {
    name: "KiCad",
    url: "https://www.kicad.org",
    kind: "software",
    verified: "2026-07-27",
  },
  ltspice: {
    name: "LTspice",
    url: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html",
    kind: "simulator",
    verified: "2026-07-27",
  },
  falstad: {
    name: "Falstad Circuit Simulator",
    url: "https://www.falstad.com/circuit/",
    kind: "simulator",
    verified: "2026-07-27",
  },
  arduinoDocs: {
    name: "Arduino Documentation",
    url: "https://docs.arduino.cc",
    kind: "documentation",
    verified: "2026-07-27",
  },
  espIdf: {
    name: "ESP-IDF Documentation",
    url: "https://docs.espressif.com/projects/esp-idf/en/latest/",
    kind: "documentation",
    verified: "2026-07-27",
  },
  stm32CubeIde: {
    name: "STM32CubeIDE",
    url: "https://www.st.com/en/development-tools/stm32cubeide.html",
    kind: "software",
    verified: "2026-07-27",
  },
  allAboutCircuits: {
    name: "All About Circuits",
    url: "https://www.allaboutcircuits.com",
    kind: "reference",
    verified: "2026-07-27",
  },
  electronicsTutorials: {
    name: "Electronics Tutorials",
    url: "https://www.electronics-tutorials.ws",
    kind: "tutorial",
    verified: "2026-07-27",
  },
  tiAppNotes: {
    name: "TI Application Notes",
    url: "https://www.ti.com/technical-documents/",
    kind: "reference",
    verified: "2026-07-27",
  },
  grabcad: {
    name: "GrabCAD",
    url: "https://grabcad.com",
    kind: "community",
    verified: "2026-07-27",
  },
  fusionLearn: {
    name: "Autodesk Fusion — Learn",
    url: "https://www.autodesk.com/products/fusion-360/learn-support",
    kind: "course",
    verified: "2026-07-27",
  },
  engineeringToolbox: {
    name: "Engineering ToolBox",
    url: "https://www.engineeringtoolbox.com",
    kind: "reference",
    verified: "2026-07-27",
  },
  matlabOnramp: {
    name: "MATLAB Onramp",
    url: "https://matlabacademy.mathworks.com",
    kind: "course",
    verified: "2026-07-27",
  },
  github: {
    name: "GitHub",
    url: "https://github.com",
    kind: "community",
    verified: "2026-07-27",
  },
  overleaf: {
    name: "Overleaf",
    url: "https://www.overleaf.com",
    kind: "software",
    verified: "2026-07-27",
  },
  scholar: {
    name: "Google Scholar",
    url: "https://scholar.google.com",
    kind: "research",
    verified: "2026-07-27",
  },
  khanAcademy: {
    name: "Khan Academy",
    url: "https://www.khanacademy.org",
    kind: "course",
    verified: "2026-07-27",
  },
  freeCodeCamp: {
    name: "freeCodeCamp",
    url: "https://www.freecodecamp.org",
    kind: "course",
    verified: "2026-07-27",
  },
  missingSemester: {
    name: "The Missing Semester (MIT)",
    url: "https://missing.csail.mit.edu",
    kind: "course",
    verified: "2026-07-27",
  },
  mdn: {
    name: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    kind: "documentation",
    verified: "2026-07-27",
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** One line of the bill of materials. */
export type BomLine = {
  item: string;
  qty: number;
  /** Estimated unit cost in whole US dollars. See the note on `budgetUsd`. */
  unitUsd: number;
  note?: string;
};

export type HubProject = {
  slug: string;
  title: string;
  discipline: Discipline;
  tier: Tier;
  /** One or two sentences: what it does and why it is worth building. */
  summary: string;
  /** Realistic calendar weeks at a few hours per week, not full-time. */
  weeks: number;
  /**
   * Estimated total cost in whole US dollars.
   *
   * Whole dollars, not the integer cents used in `finance.ts`: this is an
   * ESTIMATE RANGE, and false precision on an estimate is misleading. Sourcing
   * in Harare also moves prices enough that cents are meaningless here.
   */
  budgetUsd: { min: number; max: number };
  bom: BomLine[];
  software: string[];
  /** What the student will be able to do afterwards — capability, not topics. */
  outcomes: string[];
  /** What they must already know. Honest, so nobody starts and stalls. */
  prerequisites: string[];
  /** Where the marks or the difficulty actually are. */
  challenges: string[];
  sources: SourceId[];
  tags: string[];
  /** Can it be built entirely in simulation if no parts are available? */
  simulationOnly: boolean;
};

/* ── Derived values ─────────────────────────────────────────────────── */

/** Total of the bill of materials, in whole US dollars. */
export function bomTotalUsd(bom: BomLine[]): number {
  return bom.reduce((sum, line) => sum + line.qty * line.unitUsd, 0);
}

/** "$40 – $65", or "$0" for a project needing nothing but a computer. */
export function formatBudget(b: { min: number; max: number }): string {
  if (b.max <= 0) return "No parts needed";
  if (b.min === b.max) return `$${b.min}`;
  return `$${b.min} – $${b.max}`;
}

export function formatWeeks(weeks: number): string {
  if (weeks <= 1) return "About a week";
  if (weeks < 4) return `${weeks} weeks`;
  const months = Math.round(weeks / 4);
  return months <= 1 ? "About a month" : `About ${months} months`;
}

/* ── Search and filtering ───────────────────────────────────────────── */

export type HubFilters = {
  q?: string;
  discipline?: Discipline | "ALL";
  tier?: Tier | "ALL";
  /** Upper bound on estimated cost, in whole dollars. */
  maxBudget?: number;
  /** Only projects buildable with no physical components. */
  simulationOnly?: boolean;
  software?: string;
};

function haystack(p: HubProject): string {
  return [
    p.title,
    p.summary,
    p.tags.join(" "),
    p.software.join(" "),
    p.outcomes.join(" "),
    p.bom.map((b) => b.item).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Filter the catalogue.
 *
 * Every term in the query must match SOMEWHERE in the project (AND, not OR).
 * With a catalogue this small, OR matching returns almost everything for a
 * two-word search, which reads as "the filter is broken".
 */
export function searchProjects(
  projects: HubProject[],
  f: HubFilters = {},
): HubProject[] {
  const terms = (f.q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return projects.filter((p) => {
    if (f.discipline && f.discipline !== "ALL" && p.discipline !== f.discipline) {
      return false;
    }
    if (f.tier && f.tier !== "ALL" && p.tier !== f.tier) return false;
    if (typeof f.maxBudget === "number" && p.budgetUsd.min > f.maxBudget) {
      return false;
    }
    if (f.simulationOnly && !p.simulationOnly) return false;
    if (f.software) {
      const want = f.software.toLowerCase();
      if (!p.software.some((s) => s.toLowerCase().includes(want))) return false;
    }
    if (terms.length > 0) {
      const hay = haystack(p);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

/** Group by tier, in teaching order, dropping tiers with nothing in them. */
export function groupByTier(
  projects: HubProject[],
): { tier: Tier; projects: HubProject[] }[] {
  return TIER_ORDER.map((tier) => ({
    tier,
    projects: projects.filter((p) => p.tier === tier),
  })).filter((g) => g.projects.length > 0);
}

/**
 * Projects a student might do next after finishing one.
 *
 * Deliberately deterministic — same discipline first, then one tier up, ranked
 * by shared tags. No AI call: a recommendation that changes every refresh
 * teaches a student not to trust it.
 */
export function relatedProjects(
  projects: HubProject[],
  current: HubProject,
  limit = 3,
): HubProject[] {
  const currentTierIndex = TIER_ORDER.indexOf(current.tier);
  const tags = new Set(current.tags);

  return projects
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      const shared = p.tags.filter((t) => tags.has(t)).length;
      const sameDiscipline = p.discipline === current.discipline ? 3 : 0;
      const nextTier =
        TIER_ORDER.indexOf(p.tier) === currentTierIndex + 1 ? 2 : 0;
      return { p, score: shared + sameDiscipline + nextTier };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * Sources not confirmed within `days`.
 *
 * Surfaces link maintenance as a task instead of leaving students to discover
 * dead links. Twelve months is deliberate: an official documentation root
 * rarely moves, and re-checking everything monthly would be noise nobody acts
 * on.
 */
export function staleSources(
  now: Date,
  days = 365,
): { id: SourceId; source: Source; ageDays: number }[] {
  const cutoffMs = days * 24 * 60 * 60 * 1000;
  return (Object.entries(SOURCES) as [SourceId, Source][])
    .map(([id, source]) => ({
      id,
      source,
      ageDays: Math.floor(
        (now.getTime() - new Date(source.verified).getTime()) / 86_400_000,
      ),
    }))
    .filter((x) => now.getTime() - new Date(x.source.verified).getTime() > cutoffMs)
    .sort((a, b) => b.ageDays - a.ageDays);
}
