import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_FORM, THEMES } from "@/lib/themes";

/**
 * MOTION: that it is wired at all, and that it never outranks the user.
 *
 * `--motion-scale` shipped in Stage 4 with eleven styles setting it — 0.4 for
 * Neo-Brutalism, 1.3 for Maximalism — and nothing read it for two stages. It
 * was declared in globals.css, written into every theme, documented in the
 * type, and consumed nowhere. The suite was entirely green the whole time,
 * because every test asserted the variable was EMITTED and none asserted
 * anything CONSUMED it.
 *
 * That is the failure mode this file exists for. A design token is not a
 * value in a data structure; it is a value something reads.
 *
 * `fontSans` is still in exactly that state, deliberately and documented —
 * so it is asserted as unwired rather than left ambiguous.
 */

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const tw = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");

describe("--motion-scale is actually consumed", () => {
  it("drives Tailwind's default transition duration", () => {
    // This is the consumer. Without it the token is decoration: 76
    // `transition-*` utilities in this codebase take their duration from
    // `transitionDuration.DEFAULT`, so overriding that scales all of them.
    expect(tw).toMatch(/transitionDuration/);
    expect(tw).toMatch(/calc\(150ms \* var\(--motion-scale\)\)/);
  });

  it("still defines the base value the calc multiplies", () => {
    expect(css).toMatch(/--motion-scale:\s*1\s*;/);
    expect(DEFAULT_FORM.motionScale).toBe("1");
  });

  it("is set by styles that mean to change the pace", () => {
    const scaled = THEMES.filter(
      (t) => t.form?.motionScale && t.form.motionScale !== "1",
    );
    expect(scaled.length, "some style should alter motion").toBeGreaterThan(0);
    for (const t of scaled) {
      const n = Number(t.form!.motionScale);
      expect(Number.isFinite(n), `${t.key} motionScale must be numeric`).toBe(true);
      // 0 would mean "no motion", which is the USER's call and not a style's.
      expect(n, `${t.key} motionScale`).toBeGreaterThan(0);
      // A style that quadrupled durations would feel broken rather than slow.
      expect(n, `${t.key} motionScale`).toBeLessThanOrEqual(2);
    }
  });
});

describe("prefers-reduced-motion outranks every style", () => {
  it("forces durations with !important so no calc can beat it", () => {
    /* The guarantee rests entirely on `!important`. An important declaration
       wins over any normal one regardless of specificity, and the scaled
       duration is a normal declaration from Tailwind's utilities — so the
       reduce block wins for all twenty styles at once.

       Verified in a real browser with reducedMotion emulated: Midnight,
       Maximalism (1.3) and Neo-Brutalism (0.4) all computed to 1e-05s. This
       asserts the mechanism that made that true stays in place. */
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block, "reduced-motion block should exist").not.toBe("");
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });

  it("does not let the scale leak into the reduce block", () => {
    // A `calc(... * var(--motion-scale))` inside the reduce block would make
    // the user's preference depend on the chosen style, which is the exact
    // inversion this is meant to prevent.
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    const block = css.slice(start, start + 1200);
    expect(block).not.toContain("--motion-scale");
  });
});

describe("typography is wired, and costs nothing", () => {
  /* This block previously asserted the OPPOSITE — that `--font-sans` had no
     consumer — as a deliberate record of a known gap. The gap is closed, so
     the assertions are inverted rather than deleted. That inversion is the
     test doing its job: it had to be edited for the behaviour to change,
     which is what stops a gap closing by accident. */
  it("has a consumer for --font-sans", () => {
    expect(tw).toMatch(/fontFamily/);
    expect(tw).toMatch(/var\(--font-sans\)/);
    expect(css).toMatch(/--font-sans:/);
    expect(DEFAULT_FORM.fontSans).not.toBe("");
  });

  it("ships no webfont", () => {
    /* The fix was deleting a typeface, not adding one. Inter was preloaded at
       47.6 KB per first load and rendered nowhere, because `font-sans`
       resolved to Tailwind's built-in stack while the variable sat unused on
       the body. If a `next/font` import returns, this fails — the bandwidth
       decision then has to be made again rather than inherited. */
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).not.toMatch(/next\/font/);
  });

  it("names only fonts already on the device", () => {
    /* A webfont URL in a style would reintroduce the cost twenty times over.
       Anything fetched looks like a url() or an https reference. */
    for (const t of THEMES) {
      const stack = t.form?.fontSans;
      if (!stack) continue;
      expect(stack, `${t.key} must not fetch a font`).not.toMatch(/url\(|https?:/);
      expect(stack, `${t.key} needs a generic fallback`).toMatch(
        /(sans-serif|serif|monospace)\s*$/,
      );
    }
  });
});
