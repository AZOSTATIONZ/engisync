/**
 * Discipline imagery.
 *
 * Every picture here was chosen to match the field it represents — a civil
 * student sees construction and structures, an electronics student sees PCBs
 * and benches. Generic stock people-at-laptops are used only where no
 * discipline is known.
 *
 * PERFORMANCE NOTE (this matters more than it sounds):
 * The originals were 239 MB of full-resolution photographs and 195 MB of 4K
 * video. Served to a student on Zimbabwean mobile data that is not "rich
 * visuals", it is an unusable app and a large phone bill. Everything below
 * points at `/img/*.webp` (~1400px, ~95 KB each) and `/vid/*.mp4` (720p, 10s,
 * silent, ~500 KB) generated from those originals. Keep it that way: if you
 * add art, resize and convert it first.
 */

export type DisciplineKey =
  | "computer-science"
  | "software"
  | "electronic"
  | "electrical"
  | "computer-engineering"
  | "mechatronics"
  | "civil"
  | "mechanical"
  | "chemical"
  | "general";

export type DisciplineMedia = {
  label: string;
  /** Ordered slideshow images. */
  images: string[];
  /** Optional short silent loop for hero surfaces. */
  video?: string;
  /** Keywords matched against a department's name/code. */
  match: string[];
};

export const DISCIPLINE_MEDIA: Record<DisciplineKey, DisciplineMedia> = {
  "computer-science": {
    label: "Computer Science",
    images: [
      "/img/cs-code-dark.webp",
      "/img/cs-laptop-desk.webp",
      "/img/cs-editor.webp",
      "/img/cs-keyboard.webp",
    ],
    video: "/vid/computer-chip.mp4",
    match: ["computer science", "comp sci", "cs", "informatics"],
  },
  software: {
    label: "Software Engineering",
    images: [
      "/img/se-laptop-code.webp",
      "/img/se-code-screen.webp",
      "/img/cs-editor.webp",
      "/img/cs-laptop-desk.webp",
    ],
    match: ["software", "se", "programming", "web"],
  },
  electronic: {
    label: "Electronic Engineering",
    images: [
      "/img/eln-pcb-teal.webp",
      "/img/eln-bench.webp",
      "/img/eln-soldering.webp",
      "/img/eln-breadboard.webp",
      "/img/eln-components.webp",
    ],
    video: "/vid/electronics-solder.mp4",
    match: ["electronic", "electronics", "eln", "embedded"],
  },
  electrical: {
    label: "Electrical Engineering",
    images: [
      "/img/ee-substation.webp",
      "/img/ee-lineman.webp",
      "/img/ee-panel.webp",
      "/img/ee-solar.webp",
      "/img/ee-powerlines.webp",
    ],
    match: ["electrical", "power", "energy", "ee"],
  },
  "computer-engineering": {
    label: "Computer Engineering",
    images: [
      "/img/ce-boards.webp",
      "/img/ce-arduino.webp",
      "/img/ce-pcb-gold.webp",
      "/img/ce-pcb-blue.webp",
    ],
    video: "/vid/computer-chip.mp4",
    match: ["computer engineering", "hardware", "microcontroller", "ce"],
  },
  mechatronics: {
    label: "Mechatronics & Robotics",
    images: [
      "/img/mx-robot-blue.webp",
      "/img/mx-robot-orange.webp",
      "/img/mx-automation.webp",
      "/img/mx-kit.webp",
    ],
    match: ["mechatronic", "robotic", "automation", "control"],
  },
  civil: {
    label: "Civil Engineering",
    images: [
      "/img/civ-site-aerial.webp",
      "/img/civ-bridge.webp",
      "/img/civ-rebar.webp",
      "/img/civ-cranes.webp",
      "/img/civ-workers.webp",
    ],
    video: "/vid/civil-site.mp4",
    match: ["civil", "structural", "construction", "geotech"],
  },
  mechanical: {
    label: "Mechanical Engineering",
    images: [
      "/img/me-gears.webp",
      "/img/me-crankshaft.webp",
      "/img/me-turbine.webp",
      "/img/me-turbine-cut.webp",
      "/img/me-cad.webp",
    ],
    match: ["mechanical", "thermo", "manufactur", "automotive", "aero"],
  },
  chemical: {
    label: "Chemical & Process",
    images: ["/img/ch-refinery.webp", "/img/ch-plant.webp", "/img/ch-lab.webp"],
    match: ["chemical", "process", "metallurg", "mining"],
  },
  general: {
    label: "Engineering",
    images: [
      "/img/gen-students.webp",
      "/img/gen-blueprint.webp",
      "/img/gen-engineer.webp",
      "/img/me-cad.webp",
    ],
    video: "/vid/hero-team.mp4",
    match: [],
  },
};

/**
 * Best-guess discipline from a department name or code.
 * Longest keyword wins, so "computer engineering" beats a bare "computer".
 */
export function disciplineFor(name?: string | null, code?: string | null): DisciplineKey {
  const hay = `${name ?? ""} ${code ?? ""}`.toLowerCase();
  if (!hay.trim()) return "general";

  let best: { key: DisciplineKey; len: number } | null = null;
  for (const [key, media] of Object.entries(DISCIPLINE_MEDIA) as [
    DisciplineKey,
    DisciplineMedia,
  ][]) {
    for (const kw of media.match) {
      if (hay.includes(kw) && (!best || kw.length > best.len)) {
        best = { key, len: kw.length };
      }
    }
  }
  return best?.key ?? "general";
}

export function mediaFor(name?: string | null, code?: string | null): DisciplineMedia {
  return DISCIPLINE_MEDIA[disciplineFor(name, code)];
}
