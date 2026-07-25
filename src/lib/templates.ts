/**
 * Project starter templates. Picking one on group creation seeds a set of
 * milestones and deliverables so a new team isn't staring at a blank project.
 * Everything stays editable afterwards — these are just a head start.
 */

export type ProjectTemplate = {
  id: string;
  label: string;
  description: string;
  objectives: string;
  scope: string;
  /** Milestones seeded relative to today, offset in days. */
  milestones: { title: string; offsetDays: number }[];
  deliverables: string[];
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    label: "Blank project",
    description: "Start empty and add your own milestones.",
    objectives: "",
    scope: "",
    milestones: [],
    deliverables: [],
  },
  {
    id: "capstone",
    label: "Final-year capstone",
    description: "Proposal → design → build → test → defend.",
    objectives:
      "Deliver a complete engineering capstone: define a problem, design a solution, build a prototype, validate it, and present the findings.",
    scope:
      "Covers project proposal, literature review, design, implementation, testing, and final report/defence. Excludes commercial production.",
    milestones: [
      { title: "Proposal approved", offsetDays: 14 },
      { title: "Literature review complete", offsetDays: 28 },
      { title: "Design & specification signed off", offsetDays: 49 },
      { title: "Prototype built", offsetDays: 84 },
      { title: "Testing & validation done", offsetDays: 105 },
      { title: "Final report submitted", offsetDays: 126 },
      { title: "Project defence", offsetDays: 133 },
    ],
    deliverables: [
      "Project proposal document",
      "Literature review",
      "Design specification",
      "Working prototype",
      "Test report",
      "Final report",
      "Presentation slides",
    ],
  },
  {
    id: "hardware",
    label: "Hardware / embedded build",
    description: "For Arduino, ESP32, PCB and circuit projects.",
    objectives:
      "Design, assemble, and program an embedded hardware system that meets the defined functional requirements.",
    scope:
      "Covers schematic design, component selection, firmware, assembly, and bench testing. Excludes enclosure mass-manufacture.",
    milestones: [
      { title: "Requirements & BOM finalised", offsetDays: 10 },
      { title: "Schematic & wiring designed", offsetDays: 21 },
      { title: "Firmware first light", offsetDays: 35 },
      { title: "Hardware assembled", offsetDays: 49 },
      { title: "Integration testing complete", offsetDays: 70 },
      { title: "Demo-ready", offsetDays: 84 },
    ],
    deliverables: [
      "Bill of materials",
      "Circuit schematic",
      "Firmware source (GitHub)",
      "Assembled hardware",
      "Test log",
      "Demo video",
    ],
  },
  {
    id: "design",
    label: "CAD / design project",
    description: "For AutoCAD, SolidWorks and simulation work.",
    objectives:
      "Produce a validated mechanical/structural design with full CAD models, analysis, and manufacturing documentation.",
    scope:
      "Covers concept design, CAD modelling, simulation/analysis, and drawing package. Excludes physical fabrication unless added.",
    milestones: [
      { title: "Concept sketches approved", offsetDays: 10 },
      { title: "CAD model v1", offsetDays: 28 },
      { title: "Simulation / FEA complete", offsetDays: 45 },
      { title: "Design review passed", offsetDays: 60 },
      { title: "Drawing package finalised", offsetDays: 75 },
    ],
    deliverables: [
      "Concept sketches",
      "CAD assembly files",
      "Simulation report",
      "Engineering drawings",
      "Design review document",
    ],
  },
  {
    id: "research",
    label: "Research / lab study",
    description: "Hypothesis, experiments, analysis, write-up.",
    objectives:
      "Investigate a research question through structured experiments and produce an analysed, written result.",
    scope:
      "Covers hypothesis, methodology, data collection, analysis, and reporting. Excludes publication/peer review.",
    milestones: [
      { title: "Research question & method defined", offsetDays: 14 },
      { title: "Experimental setup ready", offsetDays: 28 },
      { title: "Data collection complete", offsetDays: 56 },
      { title: "Analysis complete", offsetDays: 77 },
      { title: "Report submitted", offsetDays: 98 },
    ],
    deliverables: [
      "Research plan",
      "Methodology document",
      "Raw dataset",
      "Analysis / results",
      "Research report",
    ],
  },
];

export function getTemplate(id: string | null | undefined): ProjectTemplate | null {
  if (!id || id === "blank") return null;
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? null;
}
