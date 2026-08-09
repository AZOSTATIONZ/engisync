import { describe, it, expect } from "vitest";
import { disciplineForDepartment } from "@/lib/project-hub";

/**
 * These nine departments are the real ones in production, with real students
 * in them. This mapping decides what each of them sees the first time they
 * open the Project Hub, so it is pinned against the actual data rather than
 * against invented examples.
 */
const PRODUCTION_DEPARTMENTS: [string, string, string][] = [
  // [name, code, expected discipline]
  ["Chemical Engineering", "CHEM", "CHEMICAL"],
  ["Civil Engineering", "CIVIL", "CIVIL"],
  ["Computer Engineering", "COMP", "COMPUTER"],
  ["Computer Science", "CS", "SOFTWARE"],
  ["Electrical Engineering", "EE", "ELECTRICAL"],
  ["Electronic Engineering", "ELEC", "ELECTRONIC"],
  ["Industrial Engineering", "IE", "INDUSTRIAL"],
  ["Mechanical Engineering", "MECH", "MECHANICAL"],
  ["Mining Engineering", "MINE", "MINING"],
];

describe("disciplineForDepartment", () => {
  for (const [name, code, expected] of PRODUCTION_DEPARTMENTS) {
    it(`${name} (${code}) → ${expected}`, () => {
      expect(disciplineForDepartment(name, code)).toBe(expected);
    });
  }

  it("distinguishes Electrical from Electronic by name alone", () => {
    // The pair most likely to be resolved by declaration order rather than by
    // merit. Both contain "electr"; the 11 students in Electronic Engineering
    // must not be shown the Electrical list.
    expect(disciplineForDepartment("Electronic Engineering", null)).toBe("ELECTRONIC");
    expect(disciplineForDepartment("Electrical Engineering", null)).toBe("ELECTRICAL");
  });

  it("distinguishes Computer Science from Computer Engineering by name alone", () => {
    // "computer science" must beat "computer" on length, not on ordering.
    expect(disciplineForDepartment("Computer Science", null)).toBe("SOFTWARE");
    expect(disciplineForDepartment("Computer Engineering", null)).toBe("COMPUTER");
  });

  it("matches codes exactly, never as substrings", () => {
    // "EE" sits inside plenty of words. A department whose code merely
    // contains those letters must not inherit Electrical.
    expect(disciplineForDepartment("Engineering Management", "EMGT")).toBeNull();
    expect(disciplineForDepartment("Agricultural Engineering", "AGRI")).toBeNull();
  });

  it("is case and whitespace tolerant", () => {
    expect(disciplineForDepartment("  electronic engineering  ", null)).toBe("ELECTRONIC");
    expect(disciplineForDepartment(null, " elec ")).toBe("ELECTRONIC");
    expect(disciplineForDepartment(null, "mech")).toBe("MECHANICAL");
  });

  it("returns null rather than guessing when it cannot tell", () => {
    // The caller shows the WHOLE catalogue on null. A wrong guess would hide
    // most of it from someone whose department we misread, with nothing on
    // screen to explain the short list — worse than not filtering at all.
    expect(disciplineForDepartment(null, null)).toBeNull();
    expect(disciplineForDepartment("", "")).toBeNull();
    expect(disciplineForDepartment("Faculty of Everything", null)).toBeNull();
  });

  it("handles related departments a university might add later", () => {
    expect(disciplineForDepartment("Telecommunications Engineering", null)).toBe("ELECTRONIC");
    expect(disciplineForDepartment("Mechatronics", null)).toBe("ELECTRONIC");
    expect(disciplineForDepartment("Metallurgical Engineering", null)).toBe("MINING");
    expect(disciplineForDepartment("Structural Engineering", null)).toBe("CIVIL");
    expect(disciplineForDepartment("Manufacturing Engineering", null)).toBe("INDUSTRIAL");
  });
});
