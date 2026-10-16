import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { DEFAULT_FORM, THEMES, shade, themeCss } from "@/lib/themes";

/**
 * Form tokens and the gradient derivation.
 *
 * Stage 1's whole promise is "no visible change", and the way that promise
 * breaks is silently: a malformed `calc()`, a variable that resolves to
 * nothing, a gradient endpoint that lands outside 0–100% lightness. None of
 * those throw. The browser just drops the declaration and a surface renders
 * flat, which nobody notices until a screenshot looks wrong weeks later.
 */

describe("shade", () => {
  it("moves lightness by the requested amount", () => {
    expect(shade("210 30% 98%", -1)).toBe("210 30% 97%");
    expect(shade("221 39% 11%", -2)).toBe("221 39% 9%");
    expect(shade("255 30% 95%", +2)).toBe("255 30% 97%");
  });

  it("keeps hue and saturation exactly as given", () => {
    // The entire point of deriving the gradient is that a Sunset card stops
    // carrying Midnight's blue. If this dropped the hue, the bug would come
    // straight back wearing a different name.
    expect(shade("24 70% 96%", -1)).toBe("24 70% 95%");
    expect(shade("142 44% 12%", -2)).toBe("142 44% 10%");
  });

  it("clamps rather than producing invalid CSS", () => {
    // Lightness below 0 or above 100 makes the whole declaration invalid, and
    // an invalid gradient means the surface silently loses its background.
    expect(shade("210 30% 1%", -5)).toBe("210 30% 0%");
    expect(shade("210 30% 99.5%", +5)).toBe("210 30% 100%");
  });

  it("handles fractional lightness without trailing noise", () => {
    expect(shade("222 34% 15.5%", -2)).toBe("222 34% 13.5%");
    expect(shade("210 35% 99.5%", -1.5)).toBe("210 35% 98%");
  });

  it("returns anything it does not recognise untouched", () => {
    // Better a theme that looks unchanged than one that emits `NaN%` and
    // drops its background entirely.
    expect(shade("not a triple", -1)).toBe("not a triple");
    expect(shade("", -1)).toBe("");
  });
});

describe("generated theme CSS", () => {
  const css = themeCss();

  it("gives every personality both gradient endpoints, light and dark", () => {
    // A missing endpoint resolves to nothing and the gradient collapses.
    for (const t of THEMES) {
      const light = new RegExp(`\\[data-theme="${t.key}"\\]\\{[^}]*--surface-top:`);
      const dark = new RegExp(`\\.dark\\[data-theme="${t.key}"\\]\\{[^}]*--surface-bottom:`);
      expect(light.test(css), `${t.key} light --surface-top`).toBe(true);
      expect(dark.test(css), `${t.key} dark --surface-bottom`).toBe(true);
    }
  });

  it("emits no form variables while no personality defines form", () => {
    // Stage 1 adds the mechanism, not the styles. If a form variable appears
    // here today, something is overriding shape and the "no visible change"
    // guarantee is already broken.
    const withForm = THEMES.filter((t) => t.form);
    if (withForm.length === 0) {
      expect(css).not.toContain("--shadow-strength:");
      expect(css).not.toContain("--border-width:");
      expect(css).not.toContain("--radius:");
    }
  });

  it("never emits an empty declaration", () => {
    // `--font-sans:` with no value is invalid and takes the whole rule with
    // it. DEFAULT_FORM.fontSans is deliberately empty until typography is
    // wired, so the skip-empty branch in formBlock is load-bearing.
    expect(css).not.toMatch(/--[a-z-]+:\s*(;|})/);
  });

  it("produces balanced braces", () => {
    // Generated CSS is injected as one <style>; an unbalanced brace silently
    // voids every rule after it.
    const open = (css.match(/\{/g) ?? []).length;
    const close = (css.match(/\}/g) ?? []).length;
    expect(open).toBe(close);
  });
});

describe("DEFAULT_FORM", () => {
  it("matches what the application rendered before form tokens existed", () => {
    // These are the values measured out of globals.css, not invented. If any
    // of them drifts, every theme silently changes shape.
    expect(DEFAULT_FORM.radius).toBe("0.7rem");
    expect(DEFAULT_FORM.borderWidth).toBe("1px");
    expect(DEFAULT_FORM.shadowStrength).toBe("1");
    expect(DEFAULT_FORM.glassBlur).toBe("24px");
  });

  it("leaves typography unwired on purpose", () => {
    // Nothing currently binds font-family to a variable, so Inter is fetched
    // and never rendered. Connecting it is a visible change and belongs to
    // its own stage — see the note on ThemeForm.fontSans.
    expect(DEFAULT_FORM.fontSans).toBe("");
  });
});

describe("account theme persistence", () => {
  const sync = readFileSync(
    join(process.cwd(), "src/components/theme-studio/theme-sync.tsx"),
    "utf8",
  );
  const action = readFileSync(
    join(process.cwd(), "src/app/theme-actions.ts"),
    "utf8",
  );

  it("validates the key server-side", () => {
    // A server action is a public endpoint. The gallery only offers real
    // themes, which constrains people and not crafted requests — and an
    // arbitrary string in this column would render as the default forever
    // with no indication why.
    expect(action).toContain("isThemeKey");
  });

  it("returns quietly for guests instead of redirecting", () => {
    // The provider lives in the root layout and therefore runs on the
    // sign-in page. Bouncing someone out of the form they are filling in,
    // because of a colour scheme, would be absurd.
    expect(action).toContain("if (!session?.user?.id) return");
    expect(action).not.toContain("redirect(");
  });

  it("lets the account win, and promotes a device choice when it is silent", () => {
    // The two halves of reconciliation. `themeKey` is nullable precisely so
    // "never chose" is distinguishable from "chose the default": a student
    // who picked a theme before registering keeps it.
    expect(sync).toContain("adoptFromAccount(accountTheme)");
    expect(sync).toContain("saveThemePreference(onDevice)");
  });

  it("reconciles once per mount, not on every navigation", () => {
    // The dashboard layout re-renders on every navigation. Re-applying the
    // account theme each time would fight whatever the user just chose in
    // the Studio.
    expect(sync).toContain("done.current");
  });
});
