import type { CSSProperties } from "react";
import { DEFAULT_FORM, type ThemeForm, type ThemePersonality, type ThemeTokens, shade } from "@/lib/themes";

/**
 * The CSS variables for one personality, as an inline style object.
 *
 * WHY THIS EXISTS RATHER THAN RENDERING THE APP TWENTY TIMES
 * A gallery has to show what each style actually looks like, and the honest
 * way to do that is with the real tokens and the real components. The
 * dishonest-but-cheap way is twenty coloured rectangles, which tells a student
 * nothing and makes the choice guesswork.
 *
 * Mounting twenty copies of the dashboard would be faithful and absurd —
 * twenty subtrees, twenty data fetches, on a page whose only job is picking a
 * colour scheme. So instead: one small mock, rendered twenty times, each
 * wrapped in an element carrying that theme's variables inline. CSS custom
 * properties inherit, so everything inside resolves against the scoped values
 * exactly as it would if the theme were applied globally — with no provider,
 * no re-render of the app, and no second copy of the stylesheet.
 *
 * The form tokens are included so a flat or brutalist style previews with the
 * right shape, not just the right hue.
 */
export function themeVars(
  theme: ThemePersonality,
  mode: "light" | "dark",
): CSSProperties {
  const t: ThemeTokens = mode === "dark" ? theme.dark : theme.light;
  const form: ThemeForm = { ...DEFAULT_FORM, ...theme.form };

  const vars: Record<string, string> = {
    "--background": t.bg,
    "--card": t.card,
    "--elevated": t.elevated,
    "--sidebar": t.sidebar,
    "--primary": t.primary,
    "--primary-2": t.primary2,
    "--shadow-color": t.shadow,
    "--border": t.border,
    "--ring": t.primary,

    // Same derivation as themeCss(), so a thumbnail cannot drift from what
    // applying the theme actually produces.
    "--surface-top": mode === "dark" ? t.card : t.elevated,
    "--surface-bottom": shade(t.card, mode === "dark" ? -2 : -1),

    "--border-width": form.borderWidth,
    "--shadow-strength": form.shadowStrength,
    "--glass-blur": form.glassBlur,
    "--glass-opacity": form.glassOpacity,
    "--motion-scale": form.motionScale,
    "--radius": form.radius,
  };

  // `fontSans` is empty until typography is wired; emitting an empty
  // declaration would invalidate the whole inline style.
  if (form.fontSans) vars["--font-sans"] = form.fontSans;

  return vars as CSSProperties;
}
