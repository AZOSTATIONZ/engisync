/**
 * THEME PERSONALITIES
 *
 * "Dark" and "light" are display modes, not identities. A student who lives in
 * this product for a semester should be able to make it theirs, and picking
 * between two greys is not a choice anyone feels.
 *
 * WHY THIS IS A SEPARATE AXIS FROM DARK/LIGHT
 * `next-themes` owns the `class="dark"` mode and the whole codebase is built on
 * Tailwind's `dark:` variant — hundreds of utilities depend on that class being
 * exactly right. A personality system that fought for the same attribute would
 * break every one of them.
 *
 * So personality is its own axis on `data-theme`, and every personality defines
 * BOTH a light and a dark set. Mode says how bright; personality says which
 * world. They compose: Ocean-light and Ocean-dark are recognisably the same
 * product.
 *
 * WHY ONLY THESE TOKENS
 * A personality overrides eight tokens, not forty. Everything else — borders,
 * muted text, semantic success/warning/danger — inherits from the base theme,
 * which is what keeps ten personalities from becoming ten separate design
 * systems that each need contrast-testing from scratch. Success stays green in
 * every world, because a personality must never change what a colour MEANS.
 *
 * Values are HSL triples matching the `--x: H S% L%` custom-property format
 * already used throughout globals.css.
 */

export type ThemeTokens = {
  /** Page background. */
  bg: string;
  /** Raised surface — cards. */
  card: string;
  /** Above a card — popovers, dialogs. */
  elevated: string;
  /** Navigation rail. */
  sidebar: string;
  /** Brand colour and its gradient partner. */
  primary: string;
  primary2: string;
  /** Tint of every shadow in this world. */
  shadow: string;
  /** Hairline borders. */
  border: string;
};

/**
 * FORM, as opposed to colour.
 *
 * The nine personalities above vary hue and nothing else, which is why they
 * read as the same interface painted differently. A design *style* — flat,
 * brutalist, neumorphic, glass — is defined far more by shape than by colour:
 * how round things are, how heavy the shadow is, how thick a border is,
 * whether surfaces are blurred, what the type feels like.
 *
 * These tokens are that second axis. They are emitted as CSS variables
 * alongside the colour block, and the house utilities in globals.css
 * (`.elev-*`, `.glass`, `.surface-premium`) consume them — so a style changes
 * the whole product's shape without a single component being edited.
 *
 * EVERY VALUE HERE IS OPTIONAL and falls back to `DEFAULT_FORM`, which holds
 * exactly what the app renders today. A personality that specifies no form is
 * pixel-identical to how it looked before this existed.
 */
export type ThemeForm = {
  /** Corner radius. Drives Tailwind's rounded-sm/md/lg via --radius. */
  radius: string;
  /** Hairline width for bordered surfaces. Brutalist styles raise this. */
  borderWidth: string;
  /**
   * Multiplier on every elevation shadow's alpha.
   * 0 flattens the product completely; 1 is today; >1 deepens it.
   */
  shadowStrength: string;
  /** Backdrop blur on glass surfaces. 0px makes them opaque. */
  glassBlur: string;
  /** Opacity of the glass tint over the backdrop. */
  glassOpacity: string;
  /**
   * Font stack. Deliberately a STACK, not a webfont URL: these students are
   * on metered mobile data, and twenty typefaces would cost more bandwidth
   * than the entire application bundle.
   *
   * NOT WIRED YET, and deliberately so. Nothing in this codebase currently
   * binds `font-family` to a variable: `tailwind.config.ts` has no
   * `fontFamily` entry and globals.css has no `font-family` rule, so `body`'s
   * `font-sans` resolves to Tailwind's default system stack. `next/font` sets
   * `--font-sans` on the body and no rule reads it — meaning Inter is fetched
   * on every page load and never rendered. Connecting that is a visible
   * typography change and a bandwidth decision, so it belongs to its own
   * stage rather than being smuggled into a no-op one.
   */
  fontSans: string;
  /**
   * Multiplier on transition and animation duration. 0 is not "no motion" —
   * `prefers-reduced-motion` owns that, and a style must never override an
   * accessibility preference.
   */
  motionScale: string;
};

/** Exactly what the application renders today. */
export const DEFAULT_FORM: ThemeForm = {
  radius: "0.7rem",
  borderWidth: "1px",
  shadowStrength: "1",
  glassBlur: "24px",
  glassOpacity: "0.7",
  // Empty until typography is wired — see the note on the field. `formBlock`
  // skips empty values, so this emits nothing rather than an invalid rule.
  fontSans: "",
  motionScale: "1",
};

export type ThemePersonality = {
  key: string;
  label: string;
  /** One line shown under the name in the picker. */
  blurb: string;
  /** Two swatches for the picker chip. */
  swatch: [string, string];
  light: ThemeTokens;
  dark: ThemeTokens;
  /** Shape overrides. Omitted entirely = today's look. */
  form?: Partial<ThemeForm>;
};

export const THEMES: ThemePersonality[] = [
  {
    key: "midnight",
    label: "Midnight",
    blurb: "The default. Deep navy, electric cyan.",
    swatch: ["#070B14", "#22D3EE"],
    light: {
      bg: "213 26% 94.5%", card: "210 30% 98%", elevated: "210 35% 99.5%",
      sidebar: "213 30% 92%", primary: "188 86% 30%", primary2: "199 89% 38%",
      shadow: "222 47% 30%", border: "214 24% 87%",
    },
    dark: {
      bg: "222 48% 5%", card: "221 39% 11%", elevated: "222 34% 15.5%",
      sidebar: "222 45% 9%", primary: "188 86% 53%", primary2: "199 89% 62%",
      shadow: "222 60% 2%", border: "221 22% 18%",
    },
  },
  {
    key: "aurora",
    label: "Aurora",
    blurb: "Violet night sky with a green shimmer.",
    swatch: ["#0B0A1F", "#7C5CFF"],
    light: {
      bg: "255 30% 95%", card: "260 35% 98.5%", elevated: "260 40% 99.5%",
      sidebar: "255 30% 93%", primary: "262 72% 48%", primary2: "168 70% 36%",
      shadow: "260 45% 30%", border: "258 24% 87%",
    },
    dark: {
      bg: "252 45% 6%", card: "255 38% 12%", elevated: "255 34% 17%",
      sidebar: "252 44% 9%", primary: "258 90% 70%", primary2: "165 80% 55%",
      shadow: "258 60% 3%", border: "255 24% 20%",
    },
  },
  {
    key: "ocean",
    label: "Ocean",
    blurb: "Deep water, teal light.",
    swatch: ["#04141C", "#2DD4BF"],
    light: {
      bg: "195 30% 94%", card: "195 35% 98%", elevated: "195 40% 99.5%",
      sidebar: "195 30% 92%", primary: "187 85% 28%", primary2: "170 80% 32%",
      shadow: "200 50% 25%", border: "196 26% 86%",
    },
    dark: {
      bg: "198 55% 5%", card: "198 42% 10%", elevated: "198 38% 15%",
      sidebar: "198 52% 8%", primary: "174 80% 50%", primary2: "190 85% 58%",
      shadow: "198 60% 2%", border: "198 26% 18%",
    },
  },
  {
    key: "forest",
    label: "Forest",
    blurb: "Pine dark, moss accent.",
    swatch: ["#08150F", "#34D399"],
    light: {
      bg: "140 22% 94%", card: "140 28% 98%", elevated: "140 32% 99.5%",
      sidebar: "140 22% 92%", primary: "158 78% 26%", primary2: "142 70% 32%",
      shadow: "150 40% 22%", border: "142 20% 86%",
    },
    dark: {
      bg: "155 40% 5%", card: "155 32% 10%", elevated: "155 28% 15%",
      sidebar: "155 38% 7.5%", primary: "158 70% 50%", primary2: "142 68% 55%",
      shadow: "155 55% 2%", border: "155 20% 18%",
    },
  },
  {
    key: "sunset",
    label: "Sunset",
    blurb: "Warm plum with amber light.",
    swatch: ["#1A0B14", "#FB923C"],
    light: {
      bg: "20 30% 95%", card: "25 35% 98.5%", elevated: "25 40% 99.5%",
      sidebar: "20 28% 93%", primary: "18 88% 42%", primary2: "340 72% 48%",
      shadow: "350 40% 28%", border: "20 24% 87%",
    },
    dark: {
      bg: "330 35% 6%", card: "330 26% 11%", elevated: "330 24% 16%",
      sidebar: "330 34% 8.5%", primary: "25 95% 60%", primary2: "340 85% 62%",
      shadow: "340 50% 3%", border: "330 20% 19%",
    },
  },
  {
    key: "copper",
    label: "Copper",
    blurb: "Machined bronze on warm graphite.",
    swatch: ["#14100C", "#D97706"],
    light: {
      bg: "35 20% 94%", card: "38 28% 98%", elevated: "38 32% 99.5%",
      sidebar: "35 20% 92%", primary: "28 88% 38%", primary2: "14 82% 44%",
      shadow: "30 35% 25%", border: "34 20% 86%",
    },
    dark: {
      bg: "30 25% 5%", card: "30 18% 10%", elevated: "30 16% 15%",
      sidebar: "30 24% 7.5%", primary: "35 92% 55%", primary2: "18 88% 58%",
      shadow: "30 40% 2%", border: "30 16% 18%",
    },
  },
  {
    key: "graphite",
    label: "Graphite",
    blurb: "Neutral and quiet. Nothing competes with your work.",
    swatch: ["#0D0D0F", "#A1A1AA"],
    light: {
      bg: "220 8% 94%", card: "220 10% 98%", elevated: "220 12% 99.5%",
      sidebar: "220 8% 92%", primary: "220 12% 34%", primary2: "220 10% 46%",
      shadow: "220 20% 25%", border: "220 8% 86%",
    },
    dark: {
      bg: "240 8% 5%", card: "240 6% 10.5%", elevated: "240 6% 15.5%",
      sidebar: "240 8% 7.5%", primary: "220 12% 72%", primary2: "220 10% 58%",
      shadow: "240 20% 2%", border: "240 6% 18%",
    },
  },
  {
    key: "neon",
    label: "Neon Circuit",
    blurb: "Near-black board with a live trace.",
    swatch: ["#04060A", "#39FF88"],
    light: {
      bg: "150 14% 94%", card: "150 18% 98%", elevated: "150 22% 99.5%",
      sidebar: "150 14% 92%", primary: "152 80% 26%", primary2: "180 82% 30%",
      shadow: "160 40% 22%", border: "150 16% 86%",
    },
    dark: {
      bg: "210 60% 3%", card: "200 40% 8%", elevated: "200 34% 13%",
      sidebar: "210 55% 5%", primary: "150 90% 58%", primary2: "180 90% 55%",
      shadow: "200 70% 1%", border: "195 30% 16%",
    },
  },
  {
    key: "blueprint",
    label: "Blueprint",
    blurb: "Drafting paper and cyanotype ink.",
    swatch: ["#08243F", "#7DD3FC"],
    light: {
      bg: "205 40% 93%", card: "205 45% 97.5%", elevated: "205 50% 99.5%",
      sidebar: "205 40% 91%", primary: "205 85% 32%", primary2: "220 78% 42%",
      shadow: "210 50% 26%", border: "205 30% 84%",
    },
    dark: {
      bg: "210 65% 7%", card: "210 50% 13%", elevated: "210 44% 18%",
      sidebar: "210 62% 10%", primary: "200 90% 68%", primary2: "220 88% 68%",
      shadow: "212 70% 3%", border: "210 34% 22%",
    },
  },
];

export const DEFAULT_THEME = "midnight";
export const THEME_KEYS = THEMES.map((t) => t.key);

export function isThemeKey(v: unknown): v is string {
  return typeof v === "string" && THEME_KEYS.includes(v);
}

export function resolveTheme(v: string | null | undefined): string {
  return isThemeKey(v) ? v : DEFAULT_THEME;
}

/**
 * The CSS for every personality, emitted once into the document.
 *
 * Generated from the data above rather than hand-written, so a new personality
 * is one object and cannot drift out of sync with its stylesheet. Selectors are
 * `[data-theme="x"]` for light and `.dark[data-theme="x"]` for dark, which
 * composes with next-themes' `class="dark"` instead of competing for it.
 */
/**
 * Nudge the lightness of an `H S% L%` triple, clamped to 0–100.
 *
 * Exists for one reason: `.surface-premium` used to hardcode its gradient
 * endpoints as `hsl(210 40% 99.5%)` and `hsl(210 26% 97%)` — cool blue, in
 * every personality. A Sunset or Forest card therefore carried a blue tint
 * that belonged to Midnight, which is the sort of thing nobody can name but
 * everybody can see.
 *
 * Deriving the endpoints from each theme's own `card` fixes that, and doing it
 * here in TypeScript rather than with `color-mix()` keeps the output as plain
 * `hsl()` — these students are on old Android phones, and a surface that
 * silently fails to paint on a browser without `color-mix` support is a worse
 * bug than a blue tint.
 */
export function shade(triple: string, deltaL: number): string {
  const m = /^(.+?)\s+(\d+(?:\.\d+)?)%$/.exec(triple.trim());
  if (!m) return triple; // Unrecognised shape — leave it exactly as given.
  const lightness = Number(m[2]);
  if (!Number.isFinite(lightness)) return triple;
  const next = Math.min(100, Math.max(0, lightness + deltaL));
  // Trim a trailing ".0" so "97.0%" reads as "97%", matching the hand-written
  // values elsewhere in this file.
  return `${m[1]} ${String(Number(next.toFixed(2)))}%`;
}

export function themeCss(): string {
  const block = (sel: string, t: ThemeTokens, dark: boolean) =>
    `${sel}{--background:${t.bg};--card:${t.card};--elevated:${t.elevated};` +
    `--sidebar:${t.sidebar};--primary:${t.primary};--primary-2:${t.primary2};` +
    `--shadow-color:${t.shadow};--border:${t.border};--ring:${t.primary};` +
    // Premium surface gradient, derived from this theme rather than fixed.
    // Light reads brightest at the top; dark falls away towards the bottom.
    `--surface-top:${dark ? t.card : t.elevated};` +
    `--surface-bottom:${shade(t.card, dark ? -2 : -1)}}`;

  /** Form variables, only for the keys a personality actually overrides. */
  const formBlock = (sel: string, form?: Partial<ThemeForm>) => {
    if (!form) return "";
    const pairs: string[] = [];
    if (form.radius) pairs.push(`--radius:${form.radius}`);
    if (form.borderWidth) pairs.push(`--border-width:${form.borderWidth}`);
    if (form.shadowStrength) pairs.push(`--shadow-strength:${form.shadowStrength}`);
    if (form.glassBlur) pairs.push(`--glass-blur:${form.glassBlur}`);
    if (form.glassOpacity) pairs.push(`--glass-opacity:${form.glassOpacity}`);
    if (form.fontSans) pairs.push(`--font-sans:${form.fontSans}`);
    if (form.motionScale) pairs.push(`--motion-scale:${form.motionScale}`);
    return pairs.length ? `${sel}{${pairs.join(";")}}` : "";
  };

  return THEMES.map(
    (t) =>
      block(`[data-theme="${t.key}"]`, t.light, false) +
      block(`.dark[data-theme="${t.key}"]`, t.dark, true) +
      // Form is per-personality, not per-mode: a style's shape should not
      // change when the lights go out.
      formBlock(`[data-theme="${t.key}"]`, t.form),
  ).join("");
}
