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
  /**
   * ESCAPE HATCH, for the one thing tokens cannot express.
   *
   * `shadowStrength` scales an existing recipe's alpha; it cannot change the
   * recipe. Neo-Brutalism's defining feature is a hard offset shadow with no
   * blur at all — a different shape, not a darker version of the same shape.
   * Rather than inventing `--shadow-offset-x`, `--shadow-blur-scale` and a
   * handful of other variables that exactly one style would ever set, a style
   * may ship targeted CSS.
   *
   * TWO RULES, both load-bearing:
   *  1. Selectors must scope themselves to `[data-theme="<key>"]`. This string
   *     is emitted verbatim, so an unscoped rule here leaks into every theme.
   *     The test suite enforces it.
   *  2. It is emitted UNLAYERED, and the house utilities live in
   *     `@layer components`. Unlayered CSS beats layered CSS regardless of
   *     specificity, so these rules win without `!important` — which would
   *     then have to be fought by everything downstream.
   *
   * Reach for `form` first. This is for shape, never for colour: colour
   * belongs in the token blocks where the contrast test can see it.
   */
  extraCss?: string;
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
      sidebar: "35 20% 92%", primary: "28 88% 37%", primary2: "14 82% 44%",
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

  /* ================================================================
     FORM-LED STYLES
     ----------------------------------------------------------------
     Everything above this line varies hue and nothing else, which is
     why those nine read as one interface painted differently. The
     styles below also set `form`, so they change the product's SHAPE:
     how round, how heavy, how thick, how fast.

     Each one still overrides only the eight colour tokens, so success
     stays green and danger stays red in every style. A style changes
     how the product feels, never what a colour MEANS.
     ================================================================ */

  {
    key: "flat",
    label: "Flat",
    blurb: "No shadows, no gradients. Colour does all the work.",
    swatch: ["#16202B", "#3498DB"],
    light: {
      bg: "204 20% 96%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "204 18% 93%", primary: "204 70% 38%", primary2: "168 76% 30%",
      shadow: "210 20% 40%", border: "204 16% 85%",
    },
    dark: {
      bg: "210 29% 11%", card: "210 25% 16%", elevated: "210 22% 21%",
      sidebar: "210 30% 13%", primary: "204 72% 62%", primary2: "168 65% 50%",
      shadow: "210 40% 4%", border: "210 16% 27%",
    },
    form: {
      // Flat design's whole argument is that depth cues are decoration.
      // shadowStrength 0 means every `.elev-*` and `.shadow-soft` in the
      // product resolves to transparent — nothing is edited, it just goes
      // away. glassOpacity 1 makes the "glass" surfaces honestly opaque
      // rather than blurring at a cost nobody can see.
      radius: "0.25rem",
      shadowStrength: "0",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "0.7",
    },
  },
  {
    key: "flat2",
    label: "Flat 2.0",
    blurb: "Flat, with just enough shadow to show what is clickable.",
    swatch: ["#121A2B", "#5B9DF9"],
    light: {
      bg: "213 24% 96%", card: "0 0% 100%", elevated: "210 30% 99%",
      sidebar: "213 22% 93.5%", primary: "217 76% 44%", primary2: "262 64% 50%",
      shadow: "217 30% 35%", border: "213 20% 87%",
    },
    dark: {
      bg: "217 30% 10%", card: "217 24% 14.5%", elevated: "217 20% 19%",
      sidebar: "217 28% 12%", primary: "217 85% 68%", primary2: "262 80% 74%",
      shadow: "217 45% 3%", border: "217 16% 24%",
    },
    form: {
      // The semi-flat correction: flat design removed affordances along with
      // the ornament, so people stopped knowing what was a button. Depth
      // returns at under half strength — present enough to read as raised,
      // too subtle to read as skeuomorphic.
      radius: "0.5rem",
      shadowStrength: "0.45",
      glassBlur: "8px",
      glassOpacity: "0.9",
      motionScale: "0.85",
    },
  },
  {
    key: "material",
    label: "Material",
    blurb: "Paper and ink. Elevation means something here.",
    swatch: ["#121212", "#7986CB"],
    light: {
      bg: "0 0% 96%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "0 0% 98%", primary: "231 44% 44%", primary2: "174 85% 26%",
      shadow: "231 30% 28%", border: "0 0% 87%",
    },
    dark: {
      bg: "0 0% 7%", card: "0 0% 12%", elevated: "0 0% 16.5%",
      sidebar: "0 0% 9%", primary: "231 60% 74%", primary2: "174 55% 58%",
      shadow: "0 0% 0%", border: "0 0% 22%",
    },
    form: {
      // Material treats elevation as information, not decoration: a dialog is
      // literally further from the page than a card. shadowStrength 1.8
      // widens the gap between `.elev-1` and `.elev-4` so that hierarchy is
      // legible. 2dp corners, because Material rounds barely at all.
      radius: "0.25rem",
      shadowStrength: "1.8",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "1",
    },
  },
  {
    key: "brutalist",
    label: "Neo-Brutalism",
    blurb: "Square corners, black outlines, shadows that do not blur.",
    swatch: ["#141414", "#FFD633"],
    light: {
      bg: "48 92% 88%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "48 88% 83%", primary: "350 78% 42%", primary2: "222 82% 44%",
      shadow: "0 0% 0%", border: "0 0% 0%",
    },
    dark: {
      bg: "0 0% 8%", card: "0 0% 13%", elevated: "0 0% 18%",
      sidebar: "0 0% 5%", primary: "48 96% 62%", primary2: "160 80% 58%",
      shadow: "0 0% 0%", border: "0 0% 96%",
    },
    form: {
      // radius 0 makes Tailwind's `sm` compute calc(0rem - 4px), which is out
      // of range for border-radius and clamps to 0. Square either way — the
      // negative intermediate is harmless, not an oversight.
      radius: "0rem",
      borderWidth: "3px",
      // The soft recipe is switched off entirely; extraCss supplies the hard
      // one below. Leaving both on would stack a blurred shadow underneath an
      // offset one and read as a printing error.
      shadowStrength: "0",
      glassBlur: "0px",
      glassOpacity: "1",
      // Brutalism does not ease. Snapping is the point.
      motionScale: "0.4",
    },
    // Hard offset shadows cannot come from `shadowStrength`, which only scales
    // the alpha of a blurred recipe — see the note on `extraCss`. The offset
    // grows with elevation so hierarchy survives the loss of blur, and it is
    // drawn in `--border` (black in light, near-white in dark) so it reads as
    // a drawn outline rather than a light source.
    extraCss:
      `[data-theme="brutalist"] .elev-1,[data-theme="brutalist"] .shadow-soft` +
      `{box-shadow:2px 2px 0 0 hsl(var(--border))}` +
      `[data-theme="brutalist"] .elev-2{box-shadow:3px 3px 0 0 hsl(var(--border))}` +
      `[data-theme="brutalist"] .elev-3{box-shadow:5px 5px 0 0 hsl(var(--border))}` +
      `[data-theme="brutalist"] .elev-4{box-shadow:7px 7px 0 0 hsl(var(--border))}` +
      // A gradient-filled headline is the opposite of this style's argument,
      // and `-webkit-text-fill-color` must be reset or the text stays
      // transparent and vanishes.
      `[data-theme="brutalist"] .text-gradient` +
      `{background:none;color:hsl(var(--primary));-webkit-text-fill-color:currentColor}` +
      // `.sheen` sweeps a highlight across buttons. There is no gloss here.
      `[data-theme="brutalist"] .sheen::after{display:none}`,
  },
  {
    key: "minimal",
    label: "Minimalism",
    blurb: "Hairlines and whitespace. Almost no colour at all.",
    swatch: ["#0A0A0A", "#E5E5E5"],
    light: {
      bg: "0 0% 99%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "0 0% 99%", primary: "0 0% 13%", primary2: "0 0% 32%",
      shadow: "0 0% 45%", border: "0 0% 89%",
    },
    dark: {
      bg: "0 0% 4%", card: "0 0% 7.5%", elevated: "0 0% 11%",
      sidebar: "0 0% 4%", primary: "0 0% 93%", primary2: "0 0% 72%",
      shadow: "0 0% 0%", border: "0 0% 17%",
    },
    form: {
      // Not the same as Graphite, which is a cool grey PALETTE at default
      // shape. This is a pure neutral at minimal shape: shadow almost gone,
      // corners nearly square, motion halved. The difference is form.
      radius: "0.35rem",
      shadowStrength: "0.15",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "0.6",
    },
  },
  {
    key: "glass",
    label: "Glassmorphism",
    blurb: "Frosted panels floating over colour.",
    swatch: ["#0C1026", "#6E8BFF"],
    light: {
      bg: "220 60% 92%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "220 55% 96%", primary: "230 68% 42%", primary2: "280 60% 45%",
      shadow: "230 40% 35%", border: "220 30% 85%",
    },
    dark: {
      bg: "230 45% 7%", card: "230 30% 13%", elevated: "230 26% 18%",
      sidebar: "230 40% 9%", primary: "220 90% 68%", primary2: "280 82% 72%",
      shadow: "230 60% 2%", border: "230 25% 24%",
    },
    form: {
      // Glass only reads as glass if there is something behind it worth
      // blurring, which is why the page background is the most saturated of
      // any style here rather than a near-neutral.
      //
      // glassOpacity 0.55 is a floor, not a preference. `.glass` composites
      // `--card` at this alpha over `--bg`, so the text sits on the blend;
      // card and bg are deliberately close in lightness in BOTH modes so the
      // blend cannot land somewhere the foreground fails against. Pushing
      // this lower looks better in a screenshot and starts eating legibility
      // on a busy background.
      radius: "1rem",
      shadowStrength: "1.2",
      glassBlur: "40px",
      glassOpacity: "0.55",
      motionScale: "1.1",
    },
  },
  {
    key: "neu",
    label: "Neumorphism",
    blurb: "Shapes pressed out of a single surface.",
    swatch: ["#23262E", "#7B93D6"],
    light: {
      // bg and card are THE SAME VALUE on purpose. Soft UI has no figure/
      // ground contrast at all — an element is legible only because of the
      // light and dark shadow pair below, which is the style's whole idea
      // and also its well-known accessibility weakness.
      bg: "220 16% 90.5%", card: "220 16% 90.5%", elevated: "220 16% 93%",
      sidebar: "220 16% 90.5%", primary: "220 55% 36%", primary2: "250 48% 42%",
      shadow: "220 25% 55%", border: "220 14% 84%",
    },
    dark: {
      bg: "220 14% 16%", card: "220 14% 16%", elevated: "220 14% 20%",
      sidebar: "220 14% 16%", primary: "220 75% 70%", primary2: "250 72% 74%",
      shadow: "220 32% 7%", border: "220 12% 23%",
    },
    form: {
      radius: "1.2rem",
      shadowStrength: "1",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "1",
    },
    // The extruded look is a PAIR of shadows — dark bottom-right, light
    // top-left — which `shadowStrength` cannot express any more than it could
    // express Neo-Brutalism's hard offset. The light source is top-left in
    // both modes so the two stay recognisably one style.
    //
    // The highlight is near-white at 0.6 in light mode and barely there in
    // dark: a white glow at that strength on a dark surface reads as a haze
    // rather than a bevel.
    extraCss:
      `[data-theme="neu"] .surface-premium{background:hsl(var(--card));` +
      `box-shadow:6px 6px 14px hsl(var(--shadow-color) / 0.45),` +
      `-6px -6px 14px hsl(0 0% 100% / 0.6)}` +
      `.dark[data-theme="neu"] .surface-premium{background:hsl(var(--card));` +
      `box-shadow:6px 6px 14px hsl(var(--shadow-color) / 0.65),` +
      `-6px -6px 14px hsl(0 0% 100% / 0.04)}`,
  },
  {
    key: "clay",
    label: "Claymorphism",
    blurb: "Rounded, puffy shapes in soft pastel.",
    swatch: ["#17102A", "#B07CFF"],
    light: {
      bg: "265 55% 95%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "265 50% 93%", primary: "265 62% 44%", primary2: "330 62% 42%",
      shadow: "265 45% 55%", border: "265 30% 90%",
    },
    dark: {
      bg: "265 35% 10%", card: "265 28% 16%", elevated: "265 24% 21%",
      sidebar: "265 32% 12%", primary: "265 85% 76%", primary2: "330 80% 74%",
      shadow: "265 50% 4%", border: "265 22% 26%",
    },
    form: {
      // No `borderWidth` override: clay has no visible outline, and setting
      // it to 0 would strip the only edge `.glass` has. The border is made
      // to disappear by COLOUR instead — it sits a few points off the card —
      // which keeps the token meaningful for anything that needs it.
      radius: "1.75rem",
      shadowStrength: "1.5",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "1.15",
    },
  },
  {
    key: "maximal",
    label: "Maximalism",
    blurb: "Loud, saturated and unapologetic.",
    swatch: ["#1A0A22", "#FF5FC8"],
    light: {
      bg: "45 88% 94%", card: "0 0% 100%", elevated: "0 0% 100%",
      sidebar: "320 65% 92.5%", primary: "320 78% 38%", primary2: "180 85% 26%",
      shadow: "320 50% 30%", border: "320 40% 80%",
    },
    dark: {
      bg: "285 50% 8%", card: "285 35% 14%", elevated: "285 30% 19%",
      sidebar: "320 45% 11%", primary: "320 92% 72%", primary2: "170 88% 58%",
      shadow: "285 60% 3%", border: "285 30% 26%",
    },
    form: {
      // The page and the rail are DIFFERENT hues, which no other style here
      // does. Maximalism is the one place where surfaces are allowed to
      // argue with each other.
      //
      // The brand colours are darker in light mode than they look like they
      // should be: a hot pink at the lightness this style wants cannot carry
      // a white label at 4.5:1, and the label is not negotiable.
      radius: "1rem",
      borderWidth: "2px",
      shadowStrength: "1.6",
      glassBlur: "12px",
      glassOpacity: "0.8",
      motionScale: "1.3",
    },
  },
  {
    key: "skeuo",
    label: "Skeuomorphism",
    blurb: "Warm, glossy surfaces that look like objects.",
    swatch: ["#1A1510", "#4A90D9"],
    light: {
      bg: "35 30% 89%", card: "38 40% 96%", elevated: "38 45% 98%",
      sidebar: "38 38% 95%", primary: "210 72% 36%", primary2: "25 72% 36%",
      shadow: "30 40% 30%", border: "35 25% 78%",
    },
    dark: {
      bg: "30 20% 10%", card: "32 18% 15%", elevated: "32 16% 20%",
      sidebar: "30 22% 12%", primary: "205 80% 64%", primary2: "28 82% 60%",
      shadow: "30 45% 3%", border: "32 16% 26%",
    },
    form: {
      // shadowStrength 2 does the gloss on its own. `.surface-premium` already
      // carries an inset white highlight along its top edge; at this
      // multiplier the alpha saturates at 1 and that hairline becomes a
      // genuine specular line, with the drop shadows deepening to match. No
      // extraCss needed — this is the tokenised path doing exactly the job it
      // was built for.
      radius: "0.55rem",
      shadowStrength: "2",
      glassBlur: "0px",
      glassOpacity: "1",
      motionScale: "0.9",
    },
  },
  {
    key: "organic",
    label: "Organic",
    blurb: "Soft asymmetric shapes, leaf and bark colours.",
    swatch: ["#0C1A0E", "#6FD36F"],
    light: {
      bg: "80 25% 94%", card: "70 30% 98%", elevated: "70 35% 99.5%",
      sidebar: "80 24% 91%", primary: "130 48% 28%", primary2: "45 60% 30%",
      shadow: "100 30% 28%", border: "80 20% 85%",
    },
    dark: {
      bg: "120 25% 7%", card: "120 18% 12%", elevated: "120 16% 17%",
      sidebar: "120 24% 9%", primary: "110 55% 60%", primary2: "45 68% 60%",
      shadow: "120 40% 2%", border: "120 16% 20%",
    },
    form: {
      radius: "1.4rem",
      shadowStrength: "0.8",
      glassBlur: "16px",
      glassOpacity: "0.75",
      motionScale: "1.2",
    },
    // Nothing in nature is a rounded rectangle. Opposite corners differ, which
    // a single `--radius` cannot express whatever value it is given.
    //
    // Scoped to `.surface-premium` alone, deliberately. Applying this to every
    // rounded thing would deform chips, avatars and buttons — a lopsided 40px
    // avatar reads as a rendering fault, not as a design.
    extraCss:
      `[data-theme="organic"] .surface-premium` +
      `{border-radius:1.6rem 0.9rem 1.6rem 0.9rem}`,
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
    // Hover moves AWAY from the label colour: darker under white light-mode
    // labels, lighter under near-black dark-mode ones. The alpha blend this
    // replaced moved it toward the surface instead, which took the default
    // theme's hovered button below AA. See globals.css for the measurement.
    `--primary-hover:${shade(t.primary, dark ? 6 : -6)};` +
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
      formBlock(`[data-theme="${t.key}"]`, t.form) +
      // Scoped by the style's own selectors — see the note on `extraCss`.
      (t.extraCss ?? ""),
  ).join("");
}
