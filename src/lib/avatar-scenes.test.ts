import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { AvatarPresentation } from "@prisma/client";
import { DISCIPLINE_SCENES, SCENE_DESCRIPTION } from "@/components/avatar/scenes";
import { DISCIPLINE_LABEL, type Discipline } from "@/lib/project-hub";

const SRC = join(process.cwd(), "src");

/**
 * The avatar system's guarantees.
 *
 * Two of these are the kind that fail silently in production: a discipline
 * with no scene renders an empty box on the dashboard of whoever is in that
 * department, and a keyframe that animates geometry instead of transform
 * quietly costs frames on every phone that opens the page. Neither throws.
 */
describe("avatar scenes", () => {
  it("covers every discipline, so nobody gets an empty hero", () => {
    for (const d of Object.keys(DISCIPLINE_LABEL) as Discipline[]) {
      expect(DISCIPLINE_SCENES[d], `${d} has no scene`).toBeDefined();
      expect(SCENE_DESCRIPTION[d]?.length, `${d} has no description`).toBeGreaterThan(20);
    }
  });

  it("describes each scene distinctly", () => {
    // Copy-pasted descriptions would give a screen-reader user the same
    // sentence whatever their discipline, which is worse than none because it
    // sounds specific and is not.
    const all = Object.values(SCENE_DESCRIPTION);
    expect(new Set(all).size).toBe(all.length);
  });

  it("draws every presentation, including the default", () => {
    // NEUTRAL is what everyone gets until they choose otherwise, so it has to
    // be a real drawing rather than a fallback branch nobody looked at.
    const figure = readFileSync(join(SRC, "components/avatar/figure.tsx"), "utf8");
    for (const p of Object.values(AvatarPresentation)) {
      expect(figure, `figure.tsx never handles ${p}`).toContain(`"${p}"`);
    }
  });

  it("animates ONLY transform and opacity", () => {
    /* The measured constraint, from this dashboard in July: animating a
       full-height gradient took it from 60fps to 31fps, and `will-change`,
       `translateZ(0)` and `contain: paint` all failed to rescue it. Transform
       and opacity are composited; every other animatable property repaints.

       This scans the avatar keyframes for properties that would repaint —
       SVG geometry attributes are the tempting ones, because animating `cy`
       to make a bubble rise reads perfectly well in source and is exactly the
       mistake. */
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    const start = css.indexOf("/* ── Dashboard avatar scene ──");
    expect(start, "avatar CSS block not found").toBeGreaterThan(-1);
    const block = css.slice(start);

    const keyframeBodies = [...block.matchAll(/@keyframes\s+es-[\w-]+\s*\{([\s\S]*?)\n\}/g)]
      .map((m) => m[1]);
    expect(keyframeBodies.length).toBeGreaterThan(10);

    const forbidden = /(^|[\s;{])(cx|cy|r|x|y|width|height|d|top|left|right|bottom|margin|padding|filter|box-shadow)\s*:/;
    for (const body of keyframeBodies) {
      expect(forbidden.test(body), `a keyframe animates a repainting property:\n${body}`).toBe(false);
    }
  });

  it("stops every animation for prefers-reduced-motion", () => {
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion: reduce");
    // Stops rather than hides: someone who gets motion sickness from a moving
    // crane still deserves to see an engineer from their discipline.
    const block = css.slice(css.indexOf("/* ── Dashboard avatar scene ──"));
    expect(block).toMatch(/prefers-reduced-motion[\s\S]*\.es-avatar \*[\s\S]*animation: none/);
    expect(block).not.toMatch(/prefers-reduced-motion[\s\S]*\.es-avatar[\s\S]*display:\s*none/);
  });

  it("pauses when scrolled out of view", () => {
    const src = readFileSync(join(SRC, "components/avatar/avatar-scene.tsx"), "utf8");
    expect(src).toContain("IntersectionObserver");
    const css = readFileSync(join(SRC, "app/globals.css"), "utf8");
    expect(css).toContain("animation-play-state: paused");
  });

  it("keeps the scene out of the accessibility tree", () => {
    // It is decoration. The text alternative beside it is what carries the
    // meaning, and narrating a cartoon crane would be noise.
    const src = readFileSync(join(SRC, "components/avatar/avatar-scene.tsx"), "utf8");
    expect(src).toContain('aria-hidden="true"');
  });
});
