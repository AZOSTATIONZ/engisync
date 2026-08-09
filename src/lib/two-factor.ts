import { prisma } from "@/lib/prisma";
import {
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
  looksLikeBackupCode,
} from "@/lib/backup-codes";

/**
 * Database-side half of two-factor recovery. The pure code generation and
 * hashing lives in `lib/backup-codes.ts` so it stays unit-testable without a
 * database; everything here touches Postgres.
 */

/**
 * Replace a user's recovery codes with a fresh set and return the PLAINTEXT
 * codes — the only moment they exist in readable form.
 *
 * Issuing always revokes the previous set. Half-old, half-new would mean a
 * code the user believes they destroyed still opens the account, and "I
 * regenerated my codes" must mean the old paper is worthless.
 */
export async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = generateBackupCodes(BACKUP_CODE_COUNT);

  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({
      data: codes.map((c) => ({ userId, codeHash: hashBackupCode(c) })),
    }),
  ]);

  return codes;
}

/** How many codes remain unspent. Drives the "running low" warning. */
export function countUnusedBackupCodes(userId: string): Promise<number> {
  return prisma.twoFactorBackupCode.count({
    where: { userId, usedAt: null },
  });
}

/**
 * Spend a recovery code. Returns true only if it was valid, unused, and
 * belonged to this user.
 *
 * ATOMICITY MATTERS HERE. Reading the row and then marking it used would let
 * two simultaneous logins spend the SAME code twice — a genuine race, and
 * exactly the kind an attacker replays deliberately. The `updateMany` below
 * is a single conditional UPDATE: Postgres matches `usedAt: null` and writes
 * in one statement, so precisely one of two racing callers sees `count === 1`
 * and the other sees zero.
 *
 * `userId` is part of the WHERE clause rather than checked afterwards. The
 * hash is globally unique, so a match implies the owner — but relying on that
 * would mean a future change to the uniqueness constraint silently becomes an
 * authentication bypass. Scoping the query costs nothing.
 */
export async function consumeBackupCode(
  userId: string,
  input: string,
): Promise<boolean> {
  // Cheap shape check first — avoids a query for obvious typos and for TOTP
  // codes that landed in the wrong field.
  if (!looksLikeBackupCode(input)) return false;

  const { count } = await prisma.twoFactorBackupCode.updateMany({
    where: { userId, codeHash: hashBackupCode(input), usedAt: null },
    data: { usedAt: new Date() },
  });

  return count === 1;
}

/** Remove every code. Called when 2FA is switched off. */
export async function clearBackupCodes(userId: string): Promise<void> {
  await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
}

/**
 * Invalidate every session issued before now by bumping `sessionVersion`.
 *
 * Call this on password reset, on 2FA being enabled or disabled, and from an
 * explicit "sign out everywhere". Returns the new version so a caller that is
 * ALSO signing the user in can mint a token that survives its own bump.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return user.sessionVersion;
}
