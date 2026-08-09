import { createHash, randomInt } from "crypto";

/**
 * Recovery codes for two-factor authentication.
 *
 * WHY THIS EXISTS
 * ---------------
 * 2FA shipped as an authentication CHECK without the recovery half. A student
 * whose phone was lost, wiped, or reset had no way back in: `authorize()`
 * returned null forever, and with production email unconfigured there was not
 * even a password-reset route around it. The people most careful about
 * security were the only ones who could permanently destroy their accounts.
 *
 * These codes are the way back. Ten of them, single-use, shown exactly once.
 *
 * WHY A FAST HASH, NOT BCRYPT
 * ---------------------------
 * The audit for this work said "bcrypt-hashed exactly like passwords". That
 * was wrong, and the reason is worth recording so nobody "fixes" it back.
 *
 * bcrypt is slow BY DESIGN because passwords are low-entropy — people pick
 * `Tafadzwa2004`, and an attacker who steals the hashes will guess it in
 * seconds unless each guess is made expensive. These codes are not chosen by
 * anyone: they are 10 characters drawn uniformly from a 32-symbol alphabet,
 * which is 50 bits of entropy. Guessing one takes ~10^15 attempts. Making
 * each attempt slow protects nothing that entropy has not already protected.
 *
 * Meanwhile the cost is real. Codes cannot be looked up by value if they are
 * salted, so verification means comparing a candidate against every stored
 * hash — ten bcrypt comparisons at cost 12 is roughly 2.5 SECONDS of server
 * CPU per login attempt, on a path an unauthenticated caller controls. That
 * is a denial-of-service vector wearing the costume of a security measure.
 *
 * SHA-256 of the normalised code, stored unique and indexed, makes
 * verification a single O(1) query. Unsalted is safe here precisely because
 * the input is high-entropy and uniformly random: there is no dictionary to
 * build a rainbow table from. This is what GitHub, Django and Auth0 do.
 *
 * FORMAT
 * ------
 * Ten characters as `XXXXX-XXXXX`, from an alphabet with no 0/O, 1/I/L, U/V.
 * Students will read these off a phone screen and type them on a laptop, or
 * copy them onto paper. Ambiguity there is a support ticket, and a support
 * ticket for a locked-out account is exactly what this feature exists to
 * prevent.
 */

/** No 0/O, 1/I/L, U/V — the pairs people transcribe wrongly. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ";
const CODE_LENGTH = 10;

export const BACKUP_CODE_COUNT = 10;
/** Warn the user at or below this many remaining. */
export const BACKUP_CODE_LOW_WATER = 3;

/**
 * Strip formatting so what the user types matches what we stored. Hyphens,
 * spaces and case are presentation, not content — a code copied out of a
 * password manager arrives differently from one typed off paper, and both
 * must work.
 */
export function normalizeBackupCode(input: string): string {
  return input.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

/** One code, formatted for display. */
function generateOne(): string {
  let raw = "";
  // `randomInt` is CSPRNG-backed and rejection-samples internally, so this
  // has no modulo bias. `Math.random()` here would be a real vulnerability.
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/**
 * A fresh set of display codes. The caller shows these once and stores only
 * their hashes — there is deliberately no way to recover them afterwards.
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const out = new Set<string>();
  // A collision within one set is astronomically unlikely, but a duplicate
  // would silently give the user nine codes while claiming ten.
  while (out.size < count) out.add(generateOne());
  return [...out];
}

/** The stored form. Normalised first so formatting never affects the hash. */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

/** Shape check only — does NOT tell you whether a code is valid or unused. */
export function looksLikeBackupCode(input: string): boolean {
  const n = normalizeBackupCode(input);
  if (n.length !== CODE_LENGTH) return false;
  return [...n].every((c) => ALPHABET.includes(c));
}
