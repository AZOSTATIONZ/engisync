import { describe, it, expect } from "vitest";
import {
  SECTION_EVIDENCE,
  acceptAttribute,
  acceptsAnything,
  classifyEvidence,
  expectationLabel,
  extensionOf,
  isRepositoryUrl,
  kindsForSection,
  validateEvidence,
} from "@/lib/evidence";
import { DOC_SECTION_KEYS } from "@/lib/document-template";

describe("template coverage", () => {
  // Regression guard. "Project Title" shipped with no entry here, so it fell
  // through to "accepts everything" and advertised
  // "Flowchart · Circuit · Schematic · PCB layout" — the first four kinds that
  // happened to be declared. Any new template section must state what it wants.
  it("every documentation section declares its expected evidence", () => {
    const missing = DOC_SECTION_KEYS.filter((k) => !(k in SECTION_EVIDENCE));
    expect(missing).toEqual([]);
  });

  it("declares no expectations for sections that do not exist", () => {
    const known = new Set(DOC_SECTION_KEYS);
    expect(Object.keys(SECTION_EVIDENCE).filter((k) => !known.has(k))).toEqual([]);
  });
});

describe("expectationLabel", () => {
  it("names the section's kinds", () => {
    expect(expectationLabel("flowcharts")).toBe("Flowchart · Image");
  });

  it("does not invent expectations for an unconfigured section", () => {
    expect(acceptsAnything("not-a-real-section")).toBe(true);
    expect(expectationLabel("not-a-real-section")).toBe(
      "Anything that supports this section",
    );
  });

  it("signals truncation when a section accepts many kinds", () => {
    expect(expectationLabel("appendices")).toContain("and more");
  });
});

describe("extensionOf", () => {
  it("lowercases and keeps the dot", () => {
    expect(extensionOf("Report.PDF")).toBe(".pdf");
  });

  it("takes only the final segment", () => {
    expect(extensionOf("board.kicad_pcb")).toBe(".kicad_pcb");
    expect(extensionOf("src.tar.gz")).toBe(".gz");
  });

  it("returns empty for names with no usable extension", () => {
    expect(extensionOf("Makefile")).toBe("");
    expect(extensionOf(".gitignore")).toBe(""); // leading dot is not an extension
    expect(extensionOf("trailing.")).toBe("");
  });
});

describe("classifyEvidence", () => {
  it("classifies by the SECTION, not just the file type", () => {
    // The same PNG means different things in different chapters — this is the
    // whole point of section-scoped evidence.
    expect(classifyEvidence("flowcharts", "process.png")).toBe("FLOWCHART");
    expect(classifyEvidence("results", "process.png")).toBe("IMAGE");
    expect(classifyEvidence("circuit", "process.png")).toBe("CIRCUIT");
  });

  it("recognises engineering formats", () => {
    expect(classifyEvidence("system-design", "chassis.step")).toBe("CAD");
    expect(classifyEvidence("hardware-design", "supply.asc")).toBe("CIRCUIT");
    expect(classifyEvidence("software-design", "firmware.ino")).toBe("SOURCE_CODE");
    expect(classifyEvidence("budget", "parts.csv")).toBe("BOM");
  });

  it("falls back to a global guess when unfiled", () => {
    expect(classifyEvidence(null, "model.stl")).toBe("CAD");
    expect(classifyEvidence(null, "notes.pdf")).toBe("REPORT");
  });

  it("returns OTHER for unknown extensions", () => {
    expect(classifyEvidence("appendices", "thing.qqq")).toBe("OTHER");
    expect(classifyEvidence(null, "Makefile")).toBe("OTHER");
  });
});

describe("validateEvidence", () => {
  it("accepts what a section expects", () => {
    expect(validateEvidence("circuit", "supply.kicad_sch")).toEqual({
      ok: true,
      kind: "CIRCUIT",
    });
    expect(validateEvidence("flowcharts", "logic.svg").ok).toBe(true);
  });

  it("rejects with a message naming what IS accepted", () => {
    const res = validateEvidence("circuit", "song.mp3");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain(".mp3");
      // Must tell the student what to upload instead, not just refuse.
      expect(res.error).toContain("Circuit");
    }
  });

  it("rejects files with no extension", () => {
    expect(validateEvidence("circuit", "Makefile").ok).toBe(false);
  });

  it("accepts anything when unfiled — filing happens later", () => {
    expect(validateEvidence(null, "whatever.mp3").ok).toBe(true);
  });

  it("is permissive in appendices", () => {
    expect(validateEvidence("appendices", "datasheet.pdf").ok).toBe(true);
    expect(validateEvidence("appendices", "capture.mp4").ok).toBe(true);
  });

  it("accepts every extension it advertises for a section", () => {
    // Guards against the accept attribute and the validator drifting apart,
    // which would let the picker offer a file the server then refuses.
    for (const key of ["circuit", "flowcharts", "system-design", "software-design"]) {
      for (const ext of acceptAttribute(key).split(",")) {
        expect(validateEvidence(key, `file${ext}`).ok).toBe(true);
      }
    }
  });
});

describe("kindsForSection", () => {
  it("returns the configured kinds", () => {
    expect(kindsForSection("flowcharts")).toEqual(["FLOWCHART", "IMAGE"]);
  });

  it("accepts everything for unconfigured sections", () => {
    expect(kindsForSection("not-a-real-section").length).toBeGreaterThan(5);
  });
});

describe("acceptAttribute", () => {
  it("unions the extensions of every accepted kind", () => {
    const accept = acceptAttribute("circuit");
    expect(accept).toContain(".asc");
    expect(accept).toContain(".kicad_sch");
    expect(accept).toContain(".pdf");
  });

  it("does not offer formats the section rejects", () => {
    expect(acceptAttribute("flowcharts")).not.toContain(".step");
  });
});

describe("isRepositoryUrl", () => {
  it("accepts the common forges over https", () => {
    expect(isRepositoryUrl("https://github.com/user/repo")).toBe(true);
    expect(isRepositoryUrl("https://gitlab.com/user/repo")).toBe(true);
  });

  it("rejects non-https and unknown hosts", () => {
    expect(isRepositoryUrl("http://github.com/user/repo")).toBe(false);
    expect(isRepositoryUrl("https://evil.example.com/repo")).toBe(false);
    expect(isRepositoryUrl("not a url")).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(isRepositoryUrl("https://github.com.evil.io/x")).toBe(false);
  });
});
