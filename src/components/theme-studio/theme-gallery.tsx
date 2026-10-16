"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Eye, X } from "lucide-react";

import { THEMES } from "@/lib/themes";
import { useThemePersonality } from "@/components/theme-personality";
import { ThemeThumbnail } from "./theme-thumbnail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Theme Studio gallery.
 *
 * PREVIEW IS THE POINT. A thumbnail shows a style at the size of a postage
 * stamp; the only way to know whether you can live in it is to see your own
 * dashboard wearing it. So Preview applies the theme to the whole document
 * WITHOUT saving — the student browses their real tasks, their real project,
 * and then decides.
 *
 * THE DANGEROUS PART IS LEAVING. An unsaved preview that survives navigation
 * is indistinguishable from a bug: the app looks different, nothing in
 * Settings agrees, and a refresh silently undoes it. So the preview is
 * restored on unmount and on page hide, and a persistent bar states what is
 * happening with both exits in reach. Preview is a loan, never a quiet
 * mutation.
 */
export function ThemeGallery() {
  const { theme: savedTheme, setTheme } = useThemePersonality();
  const { resolvedTheme } = useTheme();

  const [previewing, setPreviewing] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  // The theme to return to if a preview is abandoned. Held in a ref so the
  // unmount cleanup reads the value at teardown rather than the one captured
  // when the effect first ran.
  const savedRef = useRef(savedTheme);
  savedRef.current = savedTheme;

  /* Thumbnails must show the mode the student is actually in — previewing a
     light swatch and then applying it into a dark interface is the kind of
     mismatch that makes a feature feel broken. `resolvedTheme` is undefined
     until next-themes has read the DOM, so render nothing rather than guess
     and flash the wrong mode. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  const restore = useCallback(() => {
    document.documentElement.setAttribute("data-theme", savedRef.current);
    setPreviewing(null);
  }, []);

  const startPreview = useCallback((key: string) => {
    // Only the attribute, never localStorage — that distinction IS the
    // difference between previewing and applying.
    document.documentElement.setAttribute("data-theme", key);
    setPreviewing(key);
    setJustSaved(null);
  }, []);

  const apply = useCallback(
    (key: string) => {
      setTheme(key); // Writes the attribute AND persists.
      setPreviewing(null);
      setJustSaved(key);
    },
    [setTheme],
  );

  // Abandoning the page mid-preview must not strand the user in a theme they
  // never chose.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        document.documentElement.setAttribute("data-theme", savedRef.current);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.documentElement.setAttribute("data-theme", savedRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      {previewing && (
        <div
          role="status"
          className="sticky top-2 z-30 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-elevated/95 p-3 shadow-soft backdrop-blur"
        >
          <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm">
            Previewing{" "}
            <strong>{THEMES.find((t) => t.key === previewing)?.label}</strong> —
            nothing is saved yet.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => apply(previewing)}>
              Use this theme
            </Button>
            <Button size="sm" variant="ghost" onClick={restore}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => {
          const isSaved = t.key === savedTheme;
          const isPreviewing = t.key === previewing;
          return (
            <div
              key={t.key}
              className={cn(
                "rounded-xl border p-2.5 transition-colors",
                isPreviewing
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : isSaved
                    ? "border-primary/50 bg-primary/[0.03]"
                    : "border-border hover:border-primary/40",
              )}
            >
              {mounted ? (
                <ThemeThumbnail theme={t} mode={mode} />
              ) : (
                // Reserves the exact box so the grid does not reflow once
                // next-themes reports the mode.
                <div className="h-[86px] w-full rounded-lg bg-muted" />
              )}

              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {t.label}
                    {isSaved && !previewing && (
                      <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-medium text-primary">
                        <Check className="h-3 w-3" aria-hidden /> Current
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.blurb}</p>
                </div>
              </div>

              <div className="mt-2.5 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => startPreview(t.key)}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? "Previewing" : "Preview"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => apply(t.key)}
                  disabled={isSaved && !previewing}
                >
                  {isSaved && !previewing ? "In use" : "Apply"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Announced rather than shown as a toast: a theme change is already
          visible everywhere, so the only thing left to confirm is that it was
          SAVED. */}
      <p aria-live="polite" className="text-sm text-green-600 empty:hidden">
        {justSaved
          ? `Saved. ${THEMES.find((t) => t.key === justSaved)?.label} is now your theme.`
          : ""}
      </p>
    </div>
  );
}
