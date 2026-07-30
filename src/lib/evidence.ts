import type { EvidenceKind } from "@prisma/client";

/**
 * Engineering evidence — the rules for what belongs where.
 *
 * WHY THIS EXISTS
 * ---------------
 * Uploading used to be a single global action: pick a file, and it landed in a
 * flat list ordered by upload time. Nothing recorded what the file was or which
 * part of the project it supported, so "I uploaded the report and can't find
 * it" was the expected outcome rather than a bug.
 *
 * A document section knows what kind of evidence it needs. The Circuit Diagrams
 * section wants schematics; the CAD sections want STEP and SolidWorks; Source
 * Code wants a repository link or an archive. Encoding that here turns an
 * upload box into something that can validate, classify, file and check
 * completeness — and it is the reason a file becomes structured evidence
 * instead of bytes in a bucket.
 *
 * EXTENSIONS ARE AUTHORITATIVE, MIME IS ADVISORY
 * Engineering formats have unreliable MIME types: browsers report
 * `application/octet-stream` for .step, .kicad_pcb, .asc, .sldprt and most CAD
 * exports, and Windows reports nothing at all for some. Validating on MIME
 * would reject legitimate engineering work, which is worse than useless. So the
 * allow-list is by extension, with MIME recorded but never used to refuse.
 *
 * This is a validation and classification rule, NOT a security boundary. The
 * security property comes from storage: files are bytes in Postgres served
 * through authenticated routes, never written to a filesystem path and never
 * executed, so upload-to-RCE and path traversal are structurally impossible.
 */

export type EvidenceSpec = {
  kind: EvidenceKind;
  label: string;
  /** Lowercase, dot-prefixed. */
  extensions: string[];
  /** Shown under the upload control so the expectation is explicit. */
  hint: string;
};

/** Every kind of evidence the platform understands. */
export const EVIDENCE_SPECS: Record<EvidenceKind, EvidenceSpec> = {
  FLOWCHART: {
    kind: "FLOWCHART",
    label: "Flowchart",
    extensions: [".png", ".jpg", ".jpeg", ".svg", ".pdf", ".docx", ".drawio", ".vsdx"],
    hint: "Exported diagram or the source file from draw.io / Visio.",
  },
  CIRCUIT: {
    kind: "CIRCUIT",
    label: "Circuit",
    extensions: [
      ".png", ".jpg", ".jpeg", ".svg", ".pdf",
      ".dsn", ".pdsprj",           // Proteus
      ".sch", ".kicad_sch", ".kicad_pro", // KiCad / Eagle
      ".asc", ".plt",              // LTspice
      ".fzz",                      // Fritzing
    ],
    hint: "Proteus, KiCad, LTspice or Fritzing source — or an exported image/PDF.",
  },
  SCHEMATIC: {
    kind: "SCHEMATIC",
    label: "Schematic",
    extensions: [".pdf", ".png", ".jpg", ".jpeg", ".svg", ".sch", ".kicad_sch", ".dsn"],
    hint: "The formal schematic sheet.",
  },
  PCB: {
    kind: "PCB",
    label: "PCB layout",
    extensions: [".kicad_pcb", ".brd", ".gbr", ".zip", ".pdf", ".png"],
    hint: "Board layout or a zipped Gerber set.",
  },
  CAD: {
    kind: "CAD",
    label: "CAD model",
    extensions: [
      ".step", ".stp", ".stl", ".iges", ".igs",
      ".dwg", ".dxf",
      ".sldprt", ".sldasm", ".slddrw", // SolidWorks
      ".ipt", ".iam",                  // Inventor
      ".f3d", ".3mf", ".obj",
      ".pdf",
    ],
    hint: "STEP, STL, DWG, SolidWorks or Inventor files.",
  },
  SIMULATION: {
    kind: "SIMULATION",
    label: "Simulation",
    extensions: [".mat", ".slx", ".mdl", ".m", ".asc", ".raw", ".csv", ".pdf", ".png", ".zip"],
    hint: "Simulation model, run output or a results plot.",
  },
  SOURCE_CODE: {
    kind: "SOURCE_CODE",
    label: "Source code",
    extensions: [
      ".zip", ".tar", ".gz", ".7z",
      ".c", ".h", ".cpp", ".hpp", ".ino",
      ".py", ".js", ".ts", ".java", ".cs", ".rs", ".go",
      ".vhd", ".vhdl", ".v", ".sv",
      ".m", ".ipynb",
    ],
    hint: "Link a GitHub repository, or upload an archive or source files.",
  },
  DATASET: {
    kind: "DATASET",
    label: "Data",
    extensions: [".csv", ".tsv", ".xlsx", ".xls", ".json", ".txt", ".mat", ".log"],
    hint: "Measurements, test logs or raw results.",
  },
  REPORT: {
    kind: "REPORT",
    label: "Document",
    extensions: [".pdf", ".docx", ".doc", ".odt", ".md", ".txt", ".pptx"],
    hint: "A written document — report, proposal or slides.",
  },
  IMAGE: {
    kind: "IMAGE",
    label: "Image",
    extensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic"],
    hint: "Photograph or exported figure.",
  },
  VIDEO: {
    kind: "VIDEO",
    label: "Video",
    extensions: [".mp4", ".webm", ".mov", ".avi"],
    hint: "Demonstration or test footage.",
  },
  BOM: {
    kind: "BOM",
    label: "Bill of materials",
    extensions: [".csv", ".xlsx", ".xls", ".pdf", ".ods"],
    hint: "Costed parts list.",
  },
  DATASHEET: {
    kind: "DATASHEET",
    label: "Datasheet",
    extensions: [".pdf"],
    hint: "Component datasheet or reference manual.",
  },
  OTHER: {
    kind: "OTHER",
    label: "Other",
    extensions: [],
    hint: "Anything else that supports this section.",
  },
};

/**
 * Which kinds of evidence each document section accepts.
 *
 * Keys match `DOC_SECTIONS` in lib/documentation.ts. The FIRST kind listed is
 * the default classification for an ambiguous upload, so order matters: a PNG
 * dropped on "Flowcharts" should become a FLOWCHART, while the same PNG on
 * "Results" should become an IMAGE.
 *
 * Sections not listed accept anything — a deliberate choice. Refusing an upload
 * because a rule-writer did not anticipate a legitimate artefact is a worse
 * failure than accepting a loosely-typed file, especially in Appendices.
 */
export const SECTION_EVIDENCE: Record<string, EvidenceKind[]> = {
  title: ["REPORT"],
  abstract: ["REPORT"],
  problem: ["REPORT", "IMAGE"],
  objectives: ["REPORT"],
  scope: ["REPORT"],
  literature: ["REPORT", "DATASHEET"],
  methodology: ["REPORT", "FLOWCHART", "IMAGE"],
  "system-design": ["CAD", "SCHEMATIC", "FLOWCHART", "IMAGE", "REPORT"],
  "hardware-design": ["CIRCUIT", "SCHEMATIC", "PCB", "CAD", "DATASHEET", "IMAGE"],
  "software-design": ["SOURCE_CODE", "FLOWCHART", "IMAGE", "REPORT"],
  circuit: ["CIRCUIT", "SCHEMATIC", "PCB", "IMAGE"],
  flowcharts: ["FLOWCHART", "IMAGE"],
  gantt: ["IMAGE", "REPORT", "DATASET"],
  budget: ["BOM", "DATASET", "REPORT"],
  risk: ["REPORT", "DATASET"],
  testing: ["DATASET", "SIMULATION", "REPORT", "VIDEO", "IMAGE"],
  results: ["DATASET", "IMAGE", "SIMULATION", "VIDEO"],
  discussion: ["REPORT", "IMAGE", "DATASET"],
  conclusion: ["REPORT"],
  recommendations: ["REPORT"],
  references: ["REPORT", "DATASHEET"],
  appendices: [
    "REPORT", "DATASHEET", "SOURCE_CODE", "DATASET",
    "CAD", "CIRCUIT", "IMAGE", "VIDEO", "OTHER",
  ],
};

/** Kinds accepted by a section. Unlisted sections accept everything. */
export function kindsForSection(sectionKey: string): EvidenceKind[] {
  return (
    SECTION_EVIDENCE[sectionKey] ??
    (Object.keys(EVIDENCE_SPECS) as EvidenceKind[])
  );
}

/** True when a section has no specific expectation and accepts anything. */
export function acceptsAnything(sectionKey: string): boolean {
  return !(sectionKey in SECTION_EVIDENCE);
}

/**
 * One line telling the student what belongs in this section.
 *
 * Sections with no configured expectation must NOT list the first few kinds
 * that happen to exist — "Project Title" once advertised
 * "Flowchart · Circuit · Schematic · PCB layout" purely because those are
 * declared first in EVIDENCE_SPECS, which is misleading nonsense.
 */
export function expectationLabel(sectionKey: string): string {
  if (acceptsAnything(sectionKey)) return "Anything that supports this section";
  const kinds = kindsForSection(sectionKey);
  const shown = kinds.slice(0, 4).map((k) => EVIDENCE_SPECS[k].label);
  return kinds.length > shown.length
    ? `${shown.join(" · ")} and more`
    : shown.join(" · ");
}

/**
 * Priority for classifying a file with NO section context.
 *
 * Without a section there is no "what is this chapter about?" signal, so we
 * pick the most likely plain meaning of the extension. Order matters and is
 * explicit rather than inherited from `EVIDENCE_SPECS` declaration order —
 * several kinds legitimately claim the same extension (.pdf belongs to
 * FLOWCHART, SCHEMATIC, REPORT and more), and depending on object key order to
 * break that tie is the kind of thing that silently changes when someone
 * reorders a map.
 *
 * Generic kinds come first so a bare .pdf reads as a document and a bare .png
 * as an image, rather than as whichever specialised kind happens to list them.
 */
const UNFILED_PRIORITY: EvidenceKind[] = [
  "REPORT",
  "IMAGE",
  "VIDEO",
  "CAD",
  "SOURCE_CODE",
  "DATASET",
  "CIRCUIT",
  "PCB",
  "SIMULATION",
  "SCHEMATIC",
  "BOM",
  "DATASHEET",
  "FLOWCHART",
  "OTHER",
];

/** Lowercase extension including the dot, or "" when there is none. */
export function extensionOf(filename: string): string {
  // Take the last dot only: "board.kicad_pcb" → ".kicad_pcb", "a.tar.gz" → ".gz".
  const i = filename.lastIndexOf(".");
  if (i <= 0 || i === filename.length - 1) return "";
  return filename.slice(i).toLowerCase();
}

/** The `accept` attribute for a section's file input. */
export function acceptAttribute(sectionKey: string): string {
  const exts = new Set<string>();
  for (const kind of kindsForSection(sectionKey)) {
    for (const e of EVIDENCE_SPECS[kind].extensions) exts.add(e);
  }
  // Empty means the section accepts anything (e.g. OTHER-only sections).
  return exts.size ? [...exts].sort().join(",") : "";
}

/**
 * Best-guess classification for a file dropped on a section.
 *
 * Prefers the section's own expectations: the first accepted kind whose
 * extension list contains this file wins. That is what makes the same .png
 * become a FLOWCHART on one section and an IMAGE on another.
 */
export function classifyEvidence(
  sectionKey: string | null,
  filename: string,
): EvidenceKind {
  const ext = extensionOf(filename);
  if (!ext) return "OTHER";

  if (sectionKey) {
    for (const kind of kindsForSection(sectionKey)) {
      if (EVIDENCE_SPECS[kind].extensions.includes(ext)) return kind;
    }
  }

  // Unfiled upload: fall back to the plainest meaning of the extension.
  for (const kind of UNFILED_PRIORITY) {
    if (EVIDENCE_SPECS[kind].extensions.includes(ext)) return kind;
  }
  return "OTHER";
}

export type EvidenceCheck =
  | { ok: true; kind: EvidenceKind }
  | { ok: false; error: string };

/**
 * Validate a file against a section's expectations.
 *
 * Returns a message naming what the section DOES accept rather than a bare
 * rejection — a student who picked the wrong export format needs to know which
 * one to pick instead.
 */
export function validateEvidence(
  sectionKey: string | null,
  filename: string,
): EvidenceCheck {
  const ext = extensionOf(filename);
  if (!ext) {
    return { ok: false, error: "That file has no extension, so we can't tell what it is." };
  }

  // Unfiled uploads accept anything — filing happens later.
  if (!sectionKey) return { ok: true, kind: classifyEvidence(null, filename) };

  const kinds = kindsForSection(sectionKey);
  const allowed = new Set<string>();
  for (const k of kinds) for (const e of EVIDENCE_SPECS[k].extensions) allowed.add(e);

  // A section whose only kind is OTHER has no extension list — accept freely.
  if (allowed.size === 0) return { ok: true, kind: "OTHER" };

  if (!allowed.has(ext)) {
    const names = kinds.map((k) => EVIDENCE_SPECS[k].label).join(", ");
    return {
      ok: false,
      error: `${ext} isn't the kind of evidence this section expects. It accepts: ${names}.`,
    };
  }

  return { ok: true, kind: classifyEvidence(sectionKey, filename) };
}

/** True when a URL is a plausible source-code repository. */
export function isRepositoryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return /(^|\.)(github\.com|gitlab\.com|bitbucket\.org)$/.test(u.hostname);
  } catch {
    return false;
  }
}
