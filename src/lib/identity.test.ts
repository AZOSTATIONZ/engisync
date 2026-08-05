import { describe, it, expect } from "vitest";
import { displayName, maskEmail } from "@/lib/identity";

/**
 * `displayName()` is the control for the audit's CRITICAL finding — every
 * user's email address being rendered to every other member of their
 * department and project. It shipped without tests, and the leak recurred in
 * ten more places (analytics, budget, meetings, discussions, quizzes,
 * lecturer reports) via the same `name ?? email` fallback it exists to
 * replace. These tests pin the guarantee.
 */
describe("displayName", () => {
  it("uses the display name when set", () => {
    expect(displayName({ name: "Tariro M", email: "t@example.com" })).toBe("Tariro M");
  });

  it("NEVER returns the raw address when no name is set", () => {
    const email = "tafadzwa.musendo174@gmail.com";
    const out = displayName({ name: null, email });
    expect(out).not.toBe(email);
    expect(out).not.toContain("musendo174");
    // The domain body must not survive either — "gmail" is enough to profile.
    expect(out).not.toContain("gmail");
  });

  it("handles a blank or whitespace-only name as unset", () => {
    expect(displayName({ name: "   ", email: "a@b.com" })).not.toBe("   ");
    expect(displayName({ name: "", email: "a@b.com" })).not.toBe("");
  });

  it("degrades safely for missing users and missing fields", () => {
    expect(displayName(null)).toBe("Member");
    expect(displayName(undefined)).toBe("Member");
    expect(displayName({})).toBe("Member");
    expect(displayName({ name: null, email: null })).toBe("Member");
  });

  it("does not treat a malformed address as an email", () => {
    expect(displayName({ name: null, email: "not-an-email" })).toBe("Member");
  });
});

describe("maskEmail", () => {
  it("keeps just enough to recognise, not enough to contact", () => {
    const masked = maskEmail("tariro@gmail.com");
    expect(masked.startsWith("ta")).toBe(true);
    expect(masked).toContain("@");
    expect(masked).toContain(".com");
    expect(masked).not.toContain("tariro");
    expect(masked).not.toContain("gmail");
  });

  it("does not expose a short local part in full", () => {
    // A 3-character local part must not be recoverable from the mask.
    const masked = maskEmail("abc@x.com");
    expect(masked).not.toContain("abc");
  });

  it("returns a neutral label for anything that is not an address", () => {
    expect(maskEmail(null)).toBe("Member");
    expect(maskEmail(undefined)).toBe("Member");
    expect(maskEmail("nope")).toBe("Member");
  });
});

describe("softenShouting", () => {
  it("folds a name written entirely in capitals", () => {
    expect(displayName({ name: "TAFADZWA MUSENDO", email: null })).toBe("Tafadzwa Musendo");
  });

  it("keeps hyphens and apostrophes as word boundaries", () => {
    expect(displayName({ name: "MARY-JANE O'BRIEN", email: null })).toBe("Mary-Jane O'Brien");
  });

  it("NEVER touches a name that contains a lowercase letter", () => {
    // These are spelled the way their owners spell them. Correcting a
    // data-entry artefact is one thing; overruling somebody about their own
    // name is another.
    for (const n of ["van der Berg", "McDonald", "bell hooks", "d'Angelo", "eE Cummings"]) {
      expect(displayName({ name: n, email: null })).toBe(n);
    }
  });

  it("leaves initials and caseless text alone", () => {
    expect(displayName({ name: "T.M.", email: null })).toBe("T.M.");
    expect(displayName({ name: "北京", email: null })).toBe("北京");
  });

  it("still never leaks an email when no name is set", () => {
    const out = displayName({ name: null, email: "someone@example.com" });
    expect(out).not.toContain("someone");
  });
});
