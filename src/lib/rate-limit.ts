/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * Good enough for a single-instance deployment and abuse protection on
 * sensitive endpoints. For multi-instance/serverless scale, swap the Map for
 * a shared store (e.g. Upstash Redis) behind the same `rateLimit` signature.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * @param key      unique caller identity (e.g. `register:${ip}`)
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
