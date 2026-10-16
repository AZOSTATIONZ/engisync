/**
 * WCAG CONTRAST, computed from the token values themselves.
 *
 * WHY THIS EXISTS
 * Twenty styles is twenty palettes, and a palette is where accessibility
 * quietly dies. Eyeballing a screenshot cannot tell 4.3:1 from 4.6:1, and the
 * failure mode is not "looks bad" — it is a student with low vision who cannot
 * read a label that everyone else can. The brief was explicit that a style's
 * tokens get adjusted rather than the requirement relaxed, which only means
 * something if the requirement is measured.
 *
 * This takes the same `H S% L%` strings the themes are written in, so the test
 * checks the values that actually ship rather than a transcription of them.
 *
 * Maths is WCAG 2.x: sRGB → linearised channels → relative luminance →
 * (lighter + 0.05) / (darker + 0.05).
 */

export type Rgb = { r: number; g: number; b: number };

/**
 * Parse `"210 40% 98%"` into RGB in 0–1.
 *
 * Accepts exactly the format globals.css uses, because that is the only format
 * these tokens are ever written in — a lenient parser here would silently
 * accept a typo that the browser then drops.
 */
export function parseHsl(triple: string): Rgb | null {
  const m = /^\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*$/.exec(triple);
  if (!m) return null;
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  if (![h, s, l].every(Number.isFinite)) return null;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m0 = l - c / 2;

  const seg: [number, number, number] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
             [c, 0, x];

  return { r: seg[0] + m0, g: seg[1] + m0, b: seg[2] + m0 };
}

/** WCAG relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Contrast ratio between two `H S% L%` triples, 1–21.
 *
 * Returns NaN for anything unparseable rather than a plausible-looking number:
 * a bad token should fail loudly in the test, not score 1.0 and look like a
 * contrast problem that sends someone hunting through colours.
 */
export function contrastRatio(a: string, b: string): number {
  const ra = toRgb(a);
  const rb = toRgb(b);
  if (!ra || !rb) return NaN;
  const la = luminance(ra);
  const lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Flatten a translucent colour onto an opaque one.
 *
 * The default button is `bg-primary text-primary-foreground
 * hover:bg-primary/90`, so hovering renders the label over primary at 90%
 * alpha composited onto whatever surface the button sits on — a lighter
 * background in light mode, and therefore a LOWER ratio than the resting
 * state. Hover is a state a sighted mouse user spends real time in, so 1.4.3
 * applies to it and measuring only the resting state would miss it.
 *
 * Simple source-over in linear-free sRGB, which is what browsers do for
 * `background-color` compositing.
 */
export function composite(fg: string, alpha: number, bg: string): string | null {
  const a = parseHsl(fg);
  const b = parseHsl(bg);
  if (!a || !b) return null;
  const mix = (x: number, y: number) => x * alpha + y * (1 - alpha);
  // Returned as an sRGB triple in the same `H S% L%` shape is not possible
  // without a round trip through HSL, so this hands back a sentinel the
  // ratio function understands instead.
  return `rgb:${mix(a.r, b.r)} ${mix(a.g, b.g)} ${mix(a.b, b.b)}`;
}

/** Parse either an `H S% L%` triple or the `rgb:` sentinel `composite` emits. */
function toRgb(v: string): Rgb | null {
  if (v.startsWith("rgb:")) {
    const p = v.slice(4).split(/\s+/).map(Number);
    if (p.length !== 3 || !p.every(Number.isFinite)) return null;
    return { r: p[0], g: p[1], b: p[2] };
  }
  return parseHsl(v);
}

/**
 * The foreground tokens NO personality overrides.
 *
 * Personalities set eight colour tokens; text colour is not among them, by
 * design — see the header of themes.ts. So every style's text is one of these
 * four values, read straight out of globals.css's `:root` and `.dark`. That is
 * what makes checking a style tractable: eight backgrounds against four fixed
 * foregrounds, not forty tokens against each other.
 *
 * If globals.css changes a foreground, these must change with it. The test
 * asserts they still match the stylesheet, so the pair cannot drift.
 */
export const BASE_FOREGROUND = {
  light: {
    foreground: "222 40% 16%",
    mutedForeground: "215 18% 42%",
    primaryForeground: "210 40% 98%",
  },
  dark: {
    foreground: "210 40% 98%",
    mutedForeground: "215 20% 65%",
    primaryForeground: "222 48% 7%",
  },
} as const;

/** WCAG 2.2 thresholds, named so a failure message says which rule broke. */
export const AA_NORMAL_TEXT = 4.5; // 1.4.3
export const AA_LARGE_TEXT = 3; // 1.4.3, >=24px or >=19px bold
export const AA_NON_TEXT = 3; // 1.4.11, UI component boundaries
