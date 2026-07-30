"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";

import { cn } from "@/lib/utils";
import { DEFAULT_THEME, THEMES, resolveTheme, themeCss } from "@/lib/themes";

const STORAGE_KEY = "engisync-theme";

/**
 * The inline script that runs BEFORE first paint.
 *
 * Without this the page renders in the default personality and then snaps to
 * the chosen one once React hydrates — a flash of the wrong world on every
 * single navigation. That flash is exactly the kind of detail that makes an
 * interface feel cheap, and it cannot be fixed from a `useEffect`, which runs
 * far too late.
 *
 * Wrapped in try/catch because localStorage throws outright in Safari private
 * mode; a theme preference is never worth a blank page.
 */
const NO_FLASH = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.setAttribute("data-theme",t||"${DEFAULT_THEME}")}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}")}})()`;

type Ctx = { theme: string; setTheme: (k: string) => void };
const ThemeCtx = createContext<Ctx>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function useThemePersonality() {
  return useContext(ThemeCtx);
}

export function ThemePersonalityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  // Adopt whatever the no-flash script already put on the element, so the
  // React state agrees with the DOM instead of overwriting it.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setThemeState(resolveTheme(current));
  }, []);

  const setTheme = useCallback((key: string) => {
    const next = resolveTheme(key);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference simply won't persist. Not worth surfacing.
    }
    setThemeState(next);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {/* Both emitted once, at the root. `themeCss()` is generated from the
          THEMES data so a personality can never drift from its stylesheet. */}
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      {children}
    </ThemeCtx.Provider>
  );
}

/**
 * The picker.
 *
 * Shows each world as its own two-colour chip rather than a name in a list —
 * choosing a look from a text label is guesswork, and the whole point is that
 * these feel different.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useThemePersonality();

  return (
    <div className={cn("space-y-3", className)}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Palette className="h-4 w-4 text-primary" />
        Appearance
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEMES.map((t) => {
          const active = t.key === theme;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTheme(t.key)}
              aria-pressed={active}
              className={cn(
                "group glow-hover relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left",
                active
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <span
                aria-hidden
                className="h-8 w-8 shrink-0 rounded-lg border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {t.label}
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span className="block truncate text-[0.7rem] text-muted-foreground">
                  {t.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Each personality has a light and a dark version — this sits alongside
        your light/dark setting rather than replacing it.
      </p>
    </div>
  );
}
