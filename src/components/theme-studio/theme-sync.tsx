"use client";

import { useEffect, useRef } from "react";

import { useThemePersonality } from "@/components/theme-personality";
import { saveThemePreference } from "@/app/theme-actions";
import { isThemeKey } from "@/lib/themes";

/**
 * Reconciles the theme stored on the account with the one stored on this
 * device. Renders nothing.
 *
 * TWO STORES, AND THEY DISAGREE FOR GOOD REASONS. localStorage is what makes
 * the theme appear before first paint — the no-flash script cannot await a
 * database. The account copy is what makes a choice follow someone to the
 * library computer. So both exist, and something has to decide.
 *
 * THE ACCOUNT WINS WHEN IT HAS AN OPINION. Someone who picked Ocean on their
 * phone should find Ocean on a borrowed laptop; that is the entire point of
 * saving it server-side.
 *
 * THE DEVICE WINS WHEN THE ACCOUNT IS SILENT, and is promoted. `themeKey` is
 * nullable precisely so "never chose" is distinguishable from "chose the
 * default": a student who picked a theme before registering keeps it, and it
 * quietly becomes their account preference instead of being discarded at the
 * moment they sign up.
 *
 * Runs once per mount, guarded by a ref — the dashboard layout re-renders on
 * every navigation, and re-applying a theme on each one would fight whatever
 * the user just chose in the Studio.
 */
export function ThemeSync({ accountTheme }: { accountTheme: string | null }) {
  const { adoptFromAccount } = useThemePersonality();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const onDevice = (() => {
      try {
        return localStorage.getItem("engisync-theme");
      } catch {
        // Safari private mode throws outright. Treat as "no local opinion".
        return null;
      }
    })();

    if (accountTheme && isThemeKey(accountTheme)) {
      // Only touch the DOM when they actually differ; a no-op write would
      // still cause a React state update on every mount.
      if (accountTheme !== onDevice) adoptFromAccount(accountTheme);
      return;
    }

    // No account preference yet. Promote this device's choice so it survives
    // the next sign-in somewhere else.
    if (onDevice && isThemeKey(onDevice)) void saveThemePreference(onDevice);
  }, [accountTheme, adoptFromAccount]);

  return null;
}
