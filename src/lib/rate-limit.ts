/**
 * Rate limiting, in two flavours — and the choice between them matters.
 *
 * `rateLimit()` is in-memory: instant, free, and WRONG on serverless. Each
 * Vercel instance keeps its own Map, so a limit of 5 becomes 5-per-instance.
 * With several warm, the real ceiling is some unknown multiple.
 *
 * `rateLimitShared()` is backed by a Postgres row, so every instance agrees.
 * It costs one round trip, and this database is ~271ms away.
 *
 * THAT COST IS WHY BOTH EXIST. Spending a quarter-second to throttle a
 * profile edit would be a poor trade — the failure it prevents is someone
 * saving their bio too often. Spending it to stop a password being
 * brute-forced across instances, or to stop the Gemini free tier being
 * exhausted in an afternoon, obviously pays for itself.
 *
 * So: anything protecting money, quota, or credentials uses the shared one.
 * Everything else stays in memory and is documented as best-effort.
 *
 * WHY POSTGRES AND NOT REDIS
 * Upstash would be faster. It is also another account, another key, another
 * free tier, and another dependency that can be down — for a counter read a
 * few times per user per day. Postgres is already here with the connection
 * open, and provides the only thing that actually matters: one atomic
 * statement every instance sees the same way.
 */

import { prisma } from "@/lib/prisma";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * BEST-EFFORT, per-instance. Use only where exceeding the limit is an
 * annoyance rather than a loss — see the note at the top of this file. For
 * credentials, money or paid quota, use `rateLimitShared`.
 *
 * @param key      unique caller identity (e.g. `profile:${userId}`)
 * @param limit    max requests allowed per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/**
 * Durable fixed-window limit, shared across every serverless instance.
 *
 * ONE STATEMENT, DELIBERATELY. Read-then-write would race: two instances can
 * both read a count of 4, both decide they are under the limit of 5, and both
 * write 5 — which is exactly the concurrency this function exists to defeat.
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING` does the whole thing inside one
 * atomic Postgres statement, so the count it returns is the count that was
 * actually recorded.
 *
 * The window rolls over inside the same statement: if `resetAt` has passed the
 * row is reset to 1 rather than deleted, which avoids a separate cleanup path
 * on the hot road.
 *
 * FAILURE POLICY: allow. If the database is unreachable, every rate-limited
 * action would otherwise fail closed — nobody could log in, register, or
 * recover a password during an outage. A throttle that takes the whole product
 * down with it is worse than the abuse it prevents, so an error here is logged
 * and treated as "under the limit". The in-memory limiter still applies
 * underneath for the callers that layer both.
 */
export async function rateLimitShared(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."resetAt" <= NOW() THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimit"."resetAt" <= NOW() THEN ${resetAt}
          ELSE "RateLimit"."resetAt"
        END
      RETURNING "count", "resetAt";
    `;
    const row = rows[0];
    if (!row) return { ok: true, remaining: limit - 1, retryAfterSec: 0 };

    const count = Number(row.count);
    if (count > limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.max(
          1,
          Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000),
        ),
      };
    }
    return { ok: true, remaining: limit - count, retryAfterSec: 0 };
  } catch (err) {
    console.error("[rate-limit] shared store unavailable; allowing", err);
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
}

/**
 * Drop expired rows. Not on the hot path — the window rollover above already
 * reuses a stale row in place, so this only reclaims space for keys that are
 * never seen again (an IP that visited once, a user who left).
 */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { resetAt: { lt: new Date() } },
  });
  return count;
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// Periodically evict expired buckets to bound memory.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    },
    10 * 60 * 1000,
  ).unref?.();
}
