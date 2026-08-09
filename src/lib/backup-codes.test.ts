import { describe, it, expect } from "vitest";
import {
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
  looksLikeBackupCode,
  normalizeBackupCode,
} from "@/lib/backup-codes";

/**
 * These codes are the ONLY way back into an account whose second factor is
 * gone. Every property below is load-bearing for that: weak generation makes
 * them guessable, and over-strict matching makes a legitimate code fail at
 * precisely the moment the user has no other route in.
 */
describe("generateBackupCodes", () => {
  it("issues the promised number of distinct codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    expect(new Set(codes).size).toBe(BACKUP_CODE_COUNT);
  });

  it("never emits characters that are misread when transcribed", () => {
    // 0/O, 1/I/L and U/V are the pairs people get wrong copying off a screen.
    // A locked-out student typing from paper gets no second chance to guess.
    const joined = generateBackupCodes(50).join("").replace(/-/g, "");
    for (const bad of ["0", "O", "1", "I", "L", "U", "V"]) {
      expect(joined).not.toContain(bad);
    }
  });

  it("does not repeat across separate issuances", () => {
    const a = new Set(generateBackupCodes());
    const b = generateBackupCodes();
    expect(b.some((c) => a.has(c))).toBe(false);
  });

  it("draws on the whole alphabet rather than a narrow slice", () => {
    // A crude but real guard against a broken RNG or an off-by-one range:
    // 500 codes should exercise most of a 29-symbol alphabet.
    const chars = new Set(generateBackupCodes(500).join("").replace(/-/g, ""));
    expect(chars.size).toBeGreaterThan(20);
  });
});

describe("normalizeBackupCode", () => {
  it("accepts the code however the user reasonably types it", () => {
    // Same code from: the displayed form, a password manager, paper with
    // spaces, and someone who ignored the hyphen entirely.
    const target = normalizeBackupCode("7K2MN-9QX4P");
    for (const variant of ["7k2mn-9qx4p", "7K2MN9QX4P", "7K2MN 9QX4P", " 7K2MN-9QX4P "]) {
      expect(normalizeBackupCode(variant)).toBe(target);
    }
  });
});

describe("hashBackupCode", () => {
  it("is stable across formatting differences", () => {
    expect(hashBackupCode("7k2mn 9qx4p")).toBe(hashBackupCode("7K2MN-9QX4P"));
  });

  it("differs for different codes", () => {
    expect(hashBackupCode("7K2MN-9QX4P")).not.toBe(hashBackupCode("7K2MN-9QX4Q"));
  });

  it("does not store anything recoverable", () => {
    const code = "7K2MN-9QX4P";
    const hash = hashBackupCode(code);
    expect(hash).not.toContain("7K2MN");
    expect(hash).toHaveLength(64); // sha256 hex
  });
});

describe("looksLikeBackupCode", () => {
  it("accepts every code it generates", () => {
    for (const c of generateBackupCodes(30)) {
      expect(looksLikeBackupCode(c)).toBe(true);
    }
  });

  it("rejects a 6-digit TOTP code", () => {
    // The login form has ONE field for both. A TOTP code must not reach the
    // database as a candidate recovery code.
    expect(looksLikeBackupCode("123456")).toBe(false);
  });

  it("rejects wrong lengths and out-of-alphabet characters", () => {
    expect(looksLikeBackupCode("")).toBe(false);
    expect(looksLikeBackupCode("7K2MN-9QX4PZ")).toBe(false);
    expect(looksLikeBackupCode("7K2MN-9QX40")).toBe(false); // contains 0
  });
});
