"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import {
  bumpRateLimit,
  clearRateLimit,
  peekRateLimit,
  rateLimitShared,
  clientIp,
} from "@/lib/rate-limit";
import { isKnownDevice, recordSecurityEvent } from "@/lib/security-events";

export type PreLoginResult = {
  ok: boolean;
  twoFactorRequired?: boolean;
  error?: string;
};

/* PER-ACCOUNT THROTTLING, AND THE DENIAL-OF-SERVICE IT WOULD NORMALLY CREATE.
   ------------------------------------------------------------------------
   The IP limiter alone was both too weak and too harsh. Too weak, because an
   attacker spread across many addresses could grind one account forever — the
   counter never saw the same IP twice. Too harsh, because a whole campus
   behind one NAT shares a single bucket, so one person's typos throttled
   everyone in the lab.

   Adding a per-account limit fixes the first problem and normally introduces a
   worse one: anybody who knows your email can lock you out by failing on
   purpose. That is a real attack, and it is the standard objection to account
   lockout.

   The escape hatch is device recognition, which Phase 2 builds anyway. A
   sign-in from a device this account has used before SKIPS the account limit.
   The attacker's browser is not that device, so the lockout still bites them,
   while the victim on their own phone walks straight through. Both limits
   still apply to genuinely new devices, which is where the risk actually is.

   The counter is keyed on a HASH of the email, not the address itself.
   `RateLimit` rows would otherwise become a list of every address anyone has
   ever tried to sign in as — readable by anything with database access, and a
   tidy target. */
const ACCOUNT_LIMIT = 10;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

/**
 * A real bcrypt hash at the same cost the app uses, of a value nobody holds.
 * Compared against when no account exists purely to spend the same time as a
 * genuine check — see the note where it is used. Hard-coded rather than
 * generated at boot so the cost factor is visible and cannot drift.
 */
const DUMMY_HASH = "$2a$12$N9qo8uLOickgx2ZMRZoMy.MH/rjnKq0dLpxxSs1v1ROVgQoLTLnwq";

function accountKey(email: string): string {
  const digest = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
  return `login-acct:${digest}`;
}

/**
 * Pre-check credentials so the login form knows whether to ask for a 2FA code
 * before calling signIn. Password is re-verified in authorize as well.
 */
export async function preLogin(
  email: string,
  password: string,
): Promise<PreLoginResult> {
  const h = await headers();
  const ip = clientIp(h);
  const userAgent = h.get("user-agent");

  const ipLimit = await rateLimitShared(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!ipLimit.ok) {
    await recordSecurityEvent({
      userId: null,
      action: "LOGIN_BLOCKED_RATE_LIMIT",
      ip,
      userAgent,
      metadata: { scope: "ip" },
    });
    return { ok: false, error: "Too many attempts. Try again soon." };
  }

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });

  // Whether the account limit applies at all depends on the device — see the
  // note above. Unknown user: treat as unrecognised, so probing addresses that
  // do not exist is throttled the same way.
  const recognised = user ? await isKnownDevice(user.id, userAgent) : false;
  const key = accountKey(email);

  if (!recognised) {
    const acct = await peekRateLimit(key, ACCOUNT_LIMIT);
    if (!acct.ok) {
      await recordSecurityEvent({
        userId: user?.id ?? null,
        action: "LOGIN_BLOCKED_RATE_LIMIT",
        ip,
        userAgent,
        metadata: { scope: "account" },
      });
      // Deliberately the same wording as the IP case. A distinct message
      // would tell an attacker which addresses are real.
      return { ok: false, error: "Too many attempts. Try again soon." };
    }
  }

  /* CONSTANT-ISH TIMING, so the response does not leak which addresses exist.
     Returning early for an unknown user answers in a few milliseconds, while
     a real account costs a full bcrypt comparison at cost 12 — around 250ms.
     That gap is measurable from anywhere and turns the login form into an
     account-enumeration oracle, quietly undoing the care taken to keep
     /forgot generic.

     Comparing against a throwaway hash of the same cost spends the same time
     on both paths. The result is discarded; only the delay matters. */
  const valid = user?.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : (await bcrypt.compare(password, DUMMY_HASH), false);

  if (!valid) {
    if (!recognised) await bumpRateLimit(key, ACCOUNT_WINDOW_MS);
    await recordSecurityEvent({
      userId: user?.id ?? null,
      action: "LOGIN_FAILED",
      ip,
      userAgent,
      // No password material, ever — not a length, not a prefix. And no email
      // for unknown accounts: writing every probed address into the log would
      // rebuild the leak the hash above exists to prevent.
      metadata: { reason: user ? "bad_password" : "no_such_account" },
    });
    return { ok: false, error: "Invalid email or password." };
  }

  // Correct password: the account is not under successful attack from here,
  // so release whatever failures had accumulated.
  await clearRateLimit(key);

  return { ok: true, twoFactorRequired: user!.twoFactorEnabled };
}
