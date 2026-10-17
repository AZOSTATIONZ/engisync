import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { luminance, parseHsl } from "@/lib/contrast";

/**
 * REGRESSION NET FOR THE BUGS THIS REDESIGN KEPT FINDING.
 *
 * Stages 5 to 8 turned up four defects that look unrelated and are not. Each
 * was a value written directly into a rule instead of read from a token, and
 * each was invisible until somebody measured the right surface:
 *
 *   - `.banner-brand` laid white text over `hsl(222 47% 11%)`, Midnight's
 *     navy, in all twenty styles. Failed AA in every dark theme; Minimalism
 *     reached 1.37:1, white on near-white.
 *   - `.surface-premium` had fixed blue gradient endpoints, so a Sunset card
 *     carried Midnight's tint. (Fixed earlier by `shade()`.)
 *   - The navbar and bottom bar used Tailwind's fixed `backdrop-blur-xl`, so
 *     seven styles that set `glassBlur: 0` flattened every panel and kept a
 *     frosted bar on screen.
 *   - `text-white/80` and `/85` on composited surfaces, twice, costing about
 *     1.4:1 each time.
 *
 * None of these were caught by review. All of them would have been caught by
 * the rules below, which is the argument for having them. Each rule names the
 * defect it would have stopped, so that relaxing one later is a decision
 * rather than an accident.
 */

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

/** Every .tsx under src, with its path. */
function sourceFiles(dir: string, acc: Array<[string, string]> = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (entry.endsWith(".tsx")) acc.push([full.replace(ROOT, "").replace(/\\/g, "/"), readFileSync(full, "utf8")]);
  }
  return acc;
}
const FILES = sourceFiles(join(ROOT, "src"));

/**
 * The pre-auth brand panel is the ONE surface allowed fixed brand colours.
 *
 * It is the product's identity on the sign-in screen — the equivalent of a
 * logo — on a fixed near-black that no theme touches, and it renders before
 * anyone has an account to have a preference on. Its contrast does not vary,
 * so it is asserted numerically below rather than taken on trust.
 */
const BRAND_PANEL = "/src/components/auth-brand-panel.tsx";

describe("no colour leaks past the token system", () => {
  it("globals.css hardcodes nothing but white and the semantic gradients", () => {
    /* Would have caught: the `hsl(222 47% 11%)` banner underlay.

       Two things are legitimately fixed.

       White at some alpha is a specular highlight or a hairline on glass; it
       is mode-independent by nature, and tinting it per theme would make
       every raised edge subtly wrong rather than subtly right.

       The semantic gradients are fixed ON PURPOSE and documented as such: a
       personality may change what the product FEELS like, never what a colour
       MEANS. Success is green and danger is red in all twenty styles. */
    const offenders: string[] = [];
    css.split("\n").forEach((line, i) => {
      if (!/hsl\(\s*[\d.]/.test(line)) return;
      if (/hsl\(\s*0\s+0%\s+100%/.test(line)) return; // white highlight
      if (/--grad-(ai|success|warning|danger)/.test(line)) return; // semantic
      offenders.push(`${i + 1}: ${line.trim().slice(0, 90)}`);
    });
    expect(
      offenders,
      `hardcoded colour in a rule — use a token:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("components use arbitrary hex colours only on the fixed brand panel", () => {
    /* Would have caught: any future component hardcoding a brand colour
       instead of `bg-primary`, which is how a theme stops applying to part of
       the product without anyone noticing.

       `var(--token, #fallback)` is fine and not matched here: the fallback
       only applies when the token is missing, which is the point of it. */
    const offenders: string[] = [];
    for (const [path, src] of FILES) {
      if (path === BRAND_PANEL) continue;
      for (const m of src.matchAll(/(?:bg|text|border|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g)) {
        offenders.push(`${path}: ${m[0]}`);
      }
    }
    expect(
      offenders,
      `arbitrary hex colour outside the brand panel:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps translucent white off surfaces whose background is not known", () => {
    /* Would have caught BOTH `/80` on `.banner-brand` and `/85` on the hero
       photograph. Fading white costs roughly 1.4:1, which is affordable on a
       known-dark surface and not affordable on a composite or a photo.

       The brand panel is exempt because its background is a constant, and the
       next test measures it rather than assuming. */
    const offenders: string[] = [];
    for (const [path, src] of FILES) {
      if (path === BRAND_PANEL) continue;
      for (const m of src.matchAll(/className=["'`][^"'`]*?(text-white\/\d+)/g)) {
        offenders.push(`${path}: ${m[1]}`);
      }
    }
    expect(
      offenders,
      `translucent white on an unknown background:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the brand panel's exemption is earned, not asserted", () => {
    // #070B14 is its fixed background. If that ever changes, this fails and
    // the exemption above has to be re-justified instead of inherited.
    const src = FILES.find(([p]) => p === BRAND_PANEL)?.[1] ?? "";
    expect(src, "brand panel should still use its fixed near-black").toContain("bg-[#070B14]");

    const bg = { r: 0x07 / 255, g: 0x0b / 255, b: 0x14 / 255 };
    const bgLum = luminance(bg);
    const over = (a: number) => ({
      r: a + bg.r * (1 - a),
      g: a + bg.g * (1 - a),
      b: a + bg.b * (1 - a),
    });
    for (const alpha of [0.85, 0.8]) {
      const l = luminance(over(alpha));
      const ratio = (Math.max(l, bgLum) + 0.05) / (Math.min(l, bgLum) + 0.05);
      expect(ratio, `white/${alpha * 100} on #070B14 is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("chrome reads the same tokens as the panels", () => {
  it("has no fixed backdrop-blur left in the shell", () => {
    /* Would have caught: the navbar and bottom bar blurring at a fixed 24px
       and 16px while seven styles set `glassBlur: 0`. The product flattened
       every panel it owns and kept a frosted bar pinned to the screen. */
    const shell = ["/src/components/navbar.tsx", "/src/components/bottom-nav.tsx"];
    for (const path of shell) {
      const src = FILES.find(([p]) => p === path)?.[1];
      expect(src, `${path} should exist`).toBeTruthy();
      expect(src, `${path} should not hardcode a blur`).not.toMatch(/backdrop-blur-(sm|md|lg|xl|2xl|3xl)\b/);
      expect(src, `${path} should use the token`).toContain("chrome-blur");
    }
    expect(css).toMatch(/\.chrome-blur\s*\{[^}]*var\(--glass-blur\)/);
  });
});

describe("every style still produces usable CSS", () => {
  it("defines the surface tokens the utilities depend on", () => {
    // A theme missing one of these renders a surface with no background at
    // all, which looks like a broken page rather than a wrong colour.
    for (const name of [
      "--background",
      "--card",
      "--elevated",
      "--sidebar",
      "--primary",
      "--primary-hover",
      "--banner-underlay",
      "--surface-top",
      "--surface-bottom",
    ]) {
      expect(css + readFileSync(join(ROOT, "src/lib/themes.ts"), "utf8")).toContain(name);
    }
  });

  it("parses every colour value it ships", () => {
    // A malformed triple does not throw; the browser drops the declaration
    // and the surface silently loses its colour.
    const themes = readFileSync(join(ROOT, "src/lib/themes.ts"), "utf8");
    const triples = [...themes.matchAll(/"(\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)"/g)];
    expect(triples.length, "should find the theme colour values").toBeGreaterThan(100);
    for (const [, triple] of triples) {
      expect(parseHsl(triple), `unparseable triple: ${triple}`).not.toBeNull();
    }
  });
});
