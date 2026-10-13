import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Shared plumbing for the versioned REST API (`/api/v1/*`).
 *
 * WHY A REST LAYER EXISTS AT ALL
 * The web app talks to the server through Server Actions, which are a Next.js
 * transport — a React Native app, a desktop client or a third party cannot
 * call them. This layer exposes the SAME business logic over plain HTTP.
 *
 * WHAT IT MUST NEVER BECOME
 * A second implementation. Every route here is a thin adapter: parse the
 * request, call a function in `src/lib/`, shape the response. If a rule is
 * enforced in `policy.ts` for the web, it is enforced here by calling
 * `policy.ts` — never by re-deriving the rule. The moment a route contains
 * business logic of its own, mobile and web start disagreeing about what a
 * user may do, and the disagreement will be discovered by a student rather
 * than by us.
 *
 * WHY /v1 IS IN THE PATH
 * Once a mobile app is installed, old versions keep calling the server for
 * months — a student on a cheap phone does not update apps. Breaking a
 * response shape then is not a deploy, it is an outage for everyone who has
 * not updated. Versioning the path means a breaking change becomes /v2 and
 * the old contract keeps working until the install base has moved.
 */

/* ── Response envelope ──────────────────────────────────────────────── */

/**
 * Every response, success or failure, has the same outer shape.
 *
 * A client that must guess whether it received data or an error — sometimes a
 * bare array, sometimes `{error}`, sometimes a string — ends up with parsing
 * logic at every call site. One envelope means one parser.
 *
 * Errors carry a stable machine-readable `code` ALONGSIDE the human message,
 * because clients must branch on behaviour (re-authenticate, show the upgrade
 * screen, back off) and must never do that by matching on English prose that
 * a copy edit can change.
 */
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: ErrorCode; message: string } };

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "SERVER_ERROR";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_INPUT: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function fail(
  code: ErrorCode,
  message: string,
  extraHeaders?: HeadersInit,
): NextResponse<ApiErr> {
  return NextResponse.json(
    { ok: false as const, error: { code, message } },
    { status: STATUS[code], headers: extraHeaders },
  );
}

/* ── Authentication ─────────────────────────────────────────────────── */

/**
 * Resolve the caller, or null.
 *
 * Auth.js is already configured with a JWT session strategy, and its cookie is
 * sent by a PWA exactly as it is by the website — so the installed app needs
 * no separate token scheme, no refresh flow, and no second place where
 * credentials can leak. If a future native client cannot hold cookies, the
 * right move is to issue a bearer token that resolves to the same session
 * here, so that this function stays the ONLY place identity is established.
 */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

type Handler<T> = (userId: string) => Promise<NextResponse<ApiOk<T> | ApiErr>>;

/**
 * Wrap a handler so it only runs for an authenticated caller, with a rate
 * limit and a catch-all.
 *
 * The catch-all is not politeness. An unhandled throw in a route leaks the
 * stack trace and, with Prisma, frequently the failing SQL and column names.
 * Errors are logged server-side and the client is told only that something
 * failed.
 */
export async function withUser<T>(
  opts: { limitKey: string; limit?: number; windowMs?: number },
  handler: Handler<T>,
): Promise<NextResponse<ApiOk<T> | ApiErr>> {
  const userId = await currentUserId();
  if (!userId) {
    return fail("UNAUTHENTICATED", "Sign in to use this endpoint.");
  }

  // Keyed per user, not per IP: a university NAT puts an entire campus behind
  // one address, so IP limiting would throttle a lecture theatre as one caller.
  const limited = rateLimit(
    `api:${opts.limitKey}:${userId}`,
    opts.limit ?? 120,
    opts.windowMs ?? 60_000,
  );
  if (!limited.ok) {
    return fail("RATE_LIMITED", "Too many requests. Slow down and try again.", {
      "Retry-After": String(Math.ceil((opts.windowMs ?? 60_000) / 1000)),
    });
  }

  try {
    return await handler(userId);
  } catch (err) {
    console.error(`[api/v1/${opts.limitKey}]`, err);
    return fail("SERVER_ERROR", "Something went wrong. Please try again.");
  }
}

/**
 * Translate an `authorize()` result into an HTTP failure.
 *
 * Keeping this one-liner shared means every route denies access the same way,
 * and that the reason shown to a user comes from `policy.ts` rather than being
 * reworded per endpoint.
 */
export function forbidden(error: string): NextResponse<ApiErr> {
  return fail("FORBIDDEN", error);
}

/** Clamp a `?limit=` parameter. Unbounded page sizes are a denial-of-service
 *  vector and an accidental way to ship a 40 MB JSON payload to a phone. */
export function pageLimit(raw: string | null, fallback = 25, max = 100): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}
