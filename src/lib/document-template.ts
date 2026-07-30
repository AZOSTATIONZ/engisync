/**
 * The fixed engineering project-documentation template.
 *
 * Extracted from `lib/documentation.ts` so it can be imported by pure modules
 * (and their unit tests) without dragging in the Prisma client. The order here
 * is canonical: it is the structure every project document is seeded with.
 */
export const DOC_SECTIONS: { key: string; title: string; hint: string }[] = [
  { key: "title", title: "Project Title", hint: "The full, formal title of the project." },
  { key: "abstract", title: "Abstract", hint: "A concise 150–300 word summary of the whole project." },
  { key: "problem", title: "Problem Statement", hint: "The engineering problem being solved and why it matters." },
  { key: "objectives", title: "Objectives", hint: "Specific, measurable aims of the project." },
  { key: "scope", title: "Scope", hint: "What is and isn't covered by the project." },
  { key: "literature", title: "Literature Review", hint: "Existing work, prior art, and references reviewed." },
  { key: "methodology", title: "Methodology", hint: "The approach, methods, and tools used." },
  { key: "system-design", title: "System Design", hint: "High-level architecture and system overview." },
  { key: "hardware-design", title: "Hardware Design", hint: "Components, wiring, and hardware architecture." },
  { key: "software-design", title: "Software Design", hint: "Software architecture, modules, and data flow." },
  { key: "circuit", title: "Circuit Diagrams", hint: "Schematics and circuit descriptions — attach the source or an export." },
  { key: "flowcharts", title: "Flowcharts", hint: "Process and logic flowcharts." },
  { key: "gantt", title: "Gantt Chart", hint: "Project timeline and scheduling." },
  { key: "budget", title: "Budget", hint: "Costed bill of materials and expenses." },
  { key: "risk", title: "Risk Assessment", hint: "Identified risks, likelihood, impact, and mitigation." },
  { key: "testing", title: "Testing", hint: "Test plan, cases, and validation approach." },
  { key: "results", title: "Results", hint: "Findings and measured outcomes." },
  { key: "discussion", title: "Discussion", hint: "Interpretation of results and analysis." },
  { key: "conclusion", title: "Conclusion", hint: "Summary of what was achieved." },
  { key: "recommendations", title: "Recommendations", hint: "Suggestions for future work or improvement." },
  { key: "references", title: "References", hint: "Full citation list." },
  { key: "appendices", title: "Appendices", hint: "Supporting material, datasheets, code listings." },
];

/** Every section key, in template order. */
export const DOC_SECTION_KEYS: string[] = DOC_SECTIONS.map((s) => s.key);
