import { describe, it, expect } from "vitest";
// Imported from a plain .mjs script. TypeScript infers the exports from the
// source, so no directive is needed — an earlier `@ts-expect-error` here was
// itself an error, and I only caught it because `tsc` ran later than `lint`
// and `vitest` did.
import { pseudonym, pseudoEmail, substitute, sortReplacements } from "../../scripts/anonymise-dev-db.mjs";

/**
 * The anonymiser's pure logic.
 *
 * Every failure here is silent and looks like success: the script reports
 * "done", the database looks scrubbed, and a real name is still sitting in a
 * discussion message. That is worse than not running it, because somebody
 * then treats the branch as safe.
 */

describe("pseudonym", () => {
  it("is deterministic, so relationships stay legible across runs", () => {
    // Re-running the script must not reshuffle who is who, or a bug report
    // referring to "Tarisai Moyo" stops matching the database.
    expect(pseudonym("cme123abc").name).toBe(pseudonym("cme123abc").name);
  });

  it("gives different users different names", () => {
    const names = new Set(
      Array.from({ length: 60 }, (_, i) => pseudonym(`user-${i}`).name),
    );
    // Collisions are tolerable in principle but should be rare; a generator
    // that produced three names for sixty users would make the dev database
    // unusable for testing anything about people.
    expect(names.size).toBeGreaterThan(40);
  });

  it("produces a plausible two-part name", () => {
    const { name, first, last } = pseudonym("abc");
    expect(name).toBe(`${first} ${last}`);
    expect(name.split(" ")).toHaveLength(2);
  });
});

describe("pseudoEmail", () => {
  it("only ever produces unroutable addresses", () => {
    // RFC 2606 reserves `.invalid`, so a stray send from a dev environment
    // cannot reach a real person. This is the property that matters most:
    // the dev database will at some point run code that emails everyone.
    for (let i = 0; i < 40; i++) {
      const p = pseudonym(`u${i}`);
      expect(pseudoEmail(`u${i}`, p.first, p.last)).toMatch(/@engisync\.invalid$/);
    }
  });

  it("is unique per user and stable per user", () => {
    const a = pseudonym("one");
    const b = pseudonym("two");
    const e1 = pseudoEmail("one", a.first, a.last);
    const e2 = pseudoEmail("two", b.first, b.last);
    expect(e1).not.toBe(e2);
    expect(pseudoEmail("one", a.first, a.last)).toBe(e1);
  });
});

describe("substitute", () => {
  const pairs = sortReplacements([
    ["Tafadzwa", "Tarisai"],
    ["Tafadzwa Musendo", "Tarisai Moyo"],
    ["tafadzwa.musendo174@gmail.com", "tarisai.moyo.ab12@engisync.invalid"],
  ]);

  it("REPLACES THE LONGEST MATCH FIRST", () => {
    // The property this whole design turns on. Replacing "Tafadzwa" first
    // would leave "Tarisai Musendo" — a real surname beside a pseudonym,
    // which looks anonymised and is not.
    expect(substitute("Reviewed by Tafadzwa Musendo today", pairs)).toBe(
      "Reviewed by Tarisai Moyo today",
    );
  });

  it("catches names in running text regardless of case", () => {
    expect(substitute("ask TAFADZWA about the beam", pairs)).toBe(
      "ask Tarisai about the beam",
    );
    expect(substitute("ask tafadzwa about the beam", pairs)).toBe(
      "ask Tarisai about the beam",
    );
  });

  it("removes email addresses", () => {
    const out = substitute("contact tafadzwa.musendo174@gmail.com", pairs);
    expect(out).not.toContain("musendo174");
    expect(out).not.toContain("gmail");
  });

  it("handles names containing regex metacharacters", () => {
    // "O'Brien", "Jean-Luc", "T.M." — the reason this uses an indexOf scan
    // rather than a RegExp built from user data. A mis-escaped pattern throws,
    // or worse, quietly matches nothing.
    const tricky = sortReplacements([
      ["Mary-Jane O'Brien", "Rudo Ncube"],
      ["T.M.", "R.N."],
      ["A+B (Pvt) Ltd", "Acme Ltd"],
    ]);
    expect(substitute("signed Mary-Jane O'Brien", tricky)).toBe("signed Rudo Ncube");
    expect(substitute("initials T.M. here", tricky)).toBe("initials R.N. here");
    expect(substitute("paid to A+B (Pvt) Ltd", tricky)).toBe("paid to Acme Ltd");
  });

  it("leaves unrelated text untouched", () => {
    const text = "The concrete mix ratio is 1:2:4 and the beam spans 6 m.";
    expect(substitute(text, pairs)).toBe(text);
  });

  it("survives null, empty and non-string input", () => {
    // These fields are nullable across the schema; throwing here would abort
    // the run part-way and leave the database half-scrubbed.
    expect(substitute(null, pairs)).toBeNull();
    expect(substitute("", pairs)).toBe("");
    expect(substitute(undefined, pairs)).toBeUndefined();
  });

  it("replaces every occurrence, not just the first", () => {
    expect(substitute("Tafadzwa met Tafadzwa", pairs)).toBe("Tarisai met Tarisai");
  });
});
