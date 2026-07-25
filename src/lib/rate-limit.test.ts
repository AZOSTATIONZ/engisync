import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("resets after the window elapses", () => {
    const key = `reset-${Math.random()}`;
    expect(rateLimit(key, 1, 1).ok).toBe(true); // 1ms window
    // wait past the window
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* spin ~5ms */
    }
    expect(rateLimit(key, 1, 1).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(clientIp(h)).toBe("203.0.113.1");
  });

  it("falls back to 'unknown'", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
