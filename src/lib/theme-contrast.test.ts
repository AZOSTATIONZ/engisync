import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { THEMES, shade } from "@/lib/themes";
import { ACCENTS } from "@/lib/personalization";
import {
  AA_NON_TEXT,
  AA_NORMAL_TEXT,
  BASE_FOREGROUND,
  contrastRatio,
  luminance,
  parseHsl,
} from "@/lib/contrast";

/**
 * Every style, measured.
 *
 * The brief's rule was that a style which cannot meet accessibility gets its
 * tokens adjusted, not its requirement lowered. This is where that is decided.
 * It runs over THEMES rather than a copy of it, so adding a twenty-first style
 * without checking it is not possible.
 */

describe("contrast maths", () => {
  it("agrees with known WCAG ratios", () => {
    // Black on white is 21:1 exactly; anything against itself is 1:1.
    expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 2);
    expect(contrastRatio("210 40% 50%", "210 40% 50%")).toBeCloseTo(1, 5);
    // #767676 on white is the canonical "just passes AA" grey.
    expect(contrastRatio("0 0% 46.3%", "0 0% 100%")).toBeGreaterThan(4.5);
    expect(contrastRatio("0 0% 48%", "0 0% 100%")).toBeLessThan(4.5);
  });

  it("gets hue right across all six sectors", () => {
    // A bug in the sector table would quietly swap channels, and since
    // luminance weights green 3x red it would change every ratio involving a
    // saturated colour — which is most of them.
    const red = parseHsl("0 100% 50%")!;
    const green = parseHsl("120 100% 50%")!;
    const blue = parseHsl("240 100% 50%")!;
    expect(red).toEqual({ r: 1, g: 0, b: 0 });
    expect(green).toEqual({ r: 0, g: 1, b: 0 });
    expect(blue).toEqual({ r: 0, g: 0, b: 1 });
    expect(luminance(green)).toBeGreaterThan(luminance(red));
  });

  it("returns NaN for anything it cannot parse", () => {
    // Not 1.0 — a silent 1.0 looks like a contrast failure and sends someone
    // looking at colours instead of at the typo.
    expect(contrastRatio("not a colour", "0 0% 100%")).toBeNaN();
    expect(parseHsl("210 40 98")).toBeNull(); // missing % signs
    expect(parseHsl("")).toBeNull();
  });
});

describe("base foregrounds match globals.css", () => {
  // BASE_FOREGROUND is a transcription, and a transcription drifts. If someone
  // darkens --muted-foreground in the stylesheet, every ratio computed here
  // becomes a measurement of a colour the product no longer uses.
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  const declared = (mode: "light" | "dark", name: string) => {
    // :root is the first `--x:` definition; .dark overrides it later. Taking
    // the first match for light and the last for dark is enough given the
    // stylesheet's structure, and both are asserted to exist.
    const all = [...css.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, "g"))].map(
      (m) => m[1].trim(),
    );
    expect(all.length, `--${name} in globals.css`).toBeGreaterThan(1);
    return mode === "light" ? all[0] : all[all.length - 1];
  };

  for (const mode of ["light", "dark"] as const) {
    it(`${mode} foregrounds are still what the stylesheet says`, () => {
      expect(declared(mode, "foreground")).toBe(BASE_FOREGROUND[mode].foreground);
      expect(declared(mode, "muted-foreground")).toBe(
        BASE_FOREGROUND[mode].mutedForeground,
      );
      expect(declared(mode, "primary-foreground")).toBe(
        BASE_FOREGROUND[mode].primaryForeground,
      );
    });
  }
});

describe("every style meets WCAG 2.2 AA", () => {
  const SURFACES = ["bg", "card", "elevated", "sidebar"] as const;

  for (const theme of THEMES) {
    for (const mode of ["light", "dark"] as const) {
      const t = theme[mode];
      const fg = BASE_FOREGROUND[mode];

      describe(`${theme.label} (${mode})`, () => {
        it("renders body text at 4.5:1 or better on every surface", () => {
          // Four surfaces because a card sits on the page and a dialog sits on
          // a card: text has to survive all of them, and a style that only
          // checked `bg` would ship an unreadable popover.
          for (const s of SURFACES) {
            const ratio = contrastRatio(fg.foreground, t[s]);
            expect(
              ratio,
              `${theme.key}.${mode}.${s} — body text ${ratio.toFixed(2)}:1`,
            ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
          }
        });

        it("renders secondary text at 4.5:1 or better on every surface", () => {
          // --muted-foreground carries timestamps, counts and helper text at
          // normal size, so it is 1.4.3 body text and not a large-text
          // exemption, however secondary it looks.
          //
          // `sidebar` BELONGS IN THIS LIST and was missing from it. Every
          // inactive navigation item is `text-muted-foreground` on the rail
          // (components/sidebar.tsx), and the rail has its own background
          // token — so checking bg/card/elevated said nothing about the one
          // surface that carries the most muted text in the product. Three
          // styles were below AA there and nothing caught it: Glassmorphism
          // 4.32:1, Skeuomorphism 4.13:1, Maximalism 4.50:1.
          //
          // The obvious repair — lightening each rail until it passed — put
          // it at 1.01:1 against the page, i.e. no longer a visible rail at
          // all. Those three are lighter than their page instead of barely
          // darker, which clears AA and separates them better than before.
          for (const s of ["bg", "card", "elevated", "sidebar"] as const) {
            const ratio = contrastRatio(fg.mutedForeground, t[s]);
            expect(
              ratio,
              `${theme.key}.${mode}.${s} — muted text ${ratio.toFixed(2)}:1`,
            ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
          }
        });

        it("renders button labels at 4.5:1, resting and hovered", () => {
          // `bg-primary text-primary-foreground` is the default button —
          // verified in components/ui/button.tsx, not assumed.
          const resting = contrastRatio(fg.primaryForeground, t.primary);
          expect(
            resting,
            `${theme.key}.${mode}.primary — button label ${resting.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

          // Hover is an opaque colour now, derived by `shade()`. The first
          // version of this test measured `hover:bg-primary/90` composited
          // over the card and found six shipped themes between 3.91:1 and
          // 4.48:1 — a real AA failure in the state a mouse user holds. That
          // is why `--primary-hover` exists; this asserts the cure.
          const hovered = contrastRatio(
            fg.primaryForeground,
            shade(t.primary, mode === "dark" ? 6 : -6),
          );
          expect(
            hovered,
            `${theme.key}.${mode}.primary/90 on card — hovered label ${hovered.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });

        it("keeps the gradient chip's icon visible at its weak end", () => {
          // --primary-2 is NOT a text background. Its only consumers are
          // `--grad-brand` (the `.chip-*` square, which holds a white icon
          // glyph), a hero that hardcodes #fff over a dark base layer, and the
          // decorative `.aurora` wash — all checked in globals.css rather than
          // inferred from the name.
          //
          // So this is WCAG 1.4.11 at 3:1, not 1.4.3 at 4.5:1. Asserting 4.5
          // here was the first version of this test, and it failed six shipped
          // themes for a rendering that does not exist. Darkening six palettes
          // to satisfy a measurement of the wrong surface would have been a
          // real regression justified by a green test.
          // The icon is redundant with the text label directly beneath it
          // ("Create project", "Join project" — see quick-actions.tsx), so it
          // carries no information of its own and 1.4.11 does not ask it to
          // meet a ratio. What 1.4.11 DOES require is that the chip be
          // distinguishable as a component, i.e. against the card behind it.
          const ratio = contrastRatio(t.primary2, t.card);
          expect(
            ratio,
            `${theme.key}.${mode}.primary2 vs card — chip boundary ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NON_TEXT);
        });

        it("keeps the brand colour distinguishable as a UI boundary", () => {
          // 1.4.11: the focus ring is --primary and must be visible against
          // the surface it outlines. This is the check a pastel style fails,
          // and failing it means keyboard users lose the cursor.
          const ratio = contrastRatio(t.primary, t.card);
          expect(
            ratio,
            `${theme.key}.${mode}.primary vs card — focus ring ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NON_TEXT);
        });
      });
    }
  }
});

describe("form overrides stay inside what the utilities can take", () => {
  it("scopes every extraCss selector to its own style", () => {
    // extraCss is emitted verbatim and unlayered, so one unscoped selector
    // silently restyles all twenty. Checked per rule, not per string: a file
    // that happened to mention the right attribute once would otherwise pass.
    for (const t of THEMES) {
      if (!t.extraCss) continue;
      const rules = t.extraCss.split("}").filter((r) => r.includes("{"));
      for (const rule of rules) {
        const selectors = rule.slice(0, rule.indexOf("{")).split(",");
        for (const sel of selectors) {
          if (!sel.trim()) continue;
          expect(
            sel,
            `${t.key} extraCss selector must be scoped: ${sel.trim()}`,
          ).toContain(`[data-theme="${t.key}"]`);
        }
      }
    }
  });

  it("never sets a negative or absent border width", () => {
    // --border-width multiplies into `.surface-premium` and `.glass`. A zero
    // there removes the only edge some surfaces have, which on a flat style
    // leaves a card with no boundary at all.
    for (const t of THEMES) {
      const w = t.form?.borderWidth;
      if (w === undefined) continue;
      expect(w, `${t.key} borderWidth`).toMatch(/^[0-9.]+(px|rem)$/);
      expect(parseFloat(w), `${t.key} borderWidth`).toBeGreaterThan(0);
    }
  });

  it("keeps motionScale positive so transitions still resolve", () => {
    // 0 would make every duration 0s, which is `prefers-reduced-motion`'s
    // decision to make and not a style's — see the note on the field.
    for (const t of THEMES) {
      const m = t.form?.motionScale;
      if (m === undefined) continue;
      expect(parseFloat(m), `${t.key} motionScale`).toBeGreaterThan(0);
    }
  });

  it("gives every style a unique key and label", () => {
    const keys = THEMES.map((t) => t.key);
    const labels = THEMES.map((t) => t.label);
    expect(new Set(keys).size, "duplicate theme key").toBe(keys.length);
    expect(new Set(labels).size, "duplicate theme label").toBe(labels.length);
  });
});

describe("accent colours meet AA on the surfaces they override", () => {
  // ACCENTS is the OTHER thing that sets --primary: an explicit accent beats
  // the personality's brand colour (dashboard/layout.tsx). So a student on
  // Copper with the rose accent gets a rose button, and the personality's
  // contrast having been checked says nothing about theirs. Same surface, same
  // rule, different source — this closes the gap.
  for (const [key, a] of Object.entries(ACCENTS)) {
    for (const mode of ["light", "dark"] as const) {
      const primary = mode === "light" ? a.light : a.dark;
      const partner = mode === "light" ? a.light2 : a.dark2;
      const fg = BASE_FOREGROUND[mode].primaryForeground;

      it(`${a.label} (${mode}) carries a button label, resting and hovered`, () => {
        const resting = contrastRatio(fg, primary);
        expect(
          resting,
          `accent ${key}.${mode} — button label ${resting.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

        const hovered = contrastRatio(fg, shade(primary, mode === "dark" ? 6 : -6));
        expect(
          hovered,
          `accent ${key}.${mode} — hovered label ${hovered.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });

      it(`${a.label} (${mode}) has a gradient partner that is a real second stop`, () => {
        // Not a contrast rule. `light2`/`dark2` are hand-picked 20-40° along
        // the wheel precisely so the gradient reads as one colour rather than
        // two; a partner that collapsed onto its base would make `--grad-brand`
        // a flat fill and nobody would notice it had broken.
        expect(contrastRatio(primary, partner), `accent ${key}.${mode}`).not.toBeNaN();
        expect(partner, `accent ${key}.${mode} partner`).not.toBe(primary);
      });
    }
  }
});
