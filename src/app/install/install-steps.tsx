"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One button that installs the app.
 *
 * WHY THIS REPLACED A LIST OF INSTRUCTIONS
 * The first version of this page explained how to install on each platform.
 * It was accurate and nobody would have read it. Chrome exposes
 * `beforeinstallprompt`, which lets a single tap do the whole thing — asking
 * someone to open a menu and hunt for "Install app" when the browser will do
 * it for them is work we created, not work that exists.
 *
 * Written instructions are now the FALLBACK, not the offer, and they appear
 * only where there is genuinely no alternative:
 *
 *   - iOS has no programmatic install at all. Safari exposes nothing; the
 *     Share sheet is the only route. Those users get the steps because
 *     nothing else is possible, not as a style choice.
 *   - Desktop Chrome sometimes withholds the event until it has seen a bit of
 *     engagement. If it never arrives, short steps appear instead of a button
 *     that would do nothing.
 *
 * The event itself is captured by an inline script in the root layout, long
 * before React hydrates — see the comment there. This component reads what
 * that script stashed, so a slow phone does not miss the prompt.
 */


type State = "checking" | "ready" | "ios" | "unsupported" | "installed";

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch points separate a real iPad
  // from a desktop Safari, where the route differs.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function isInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallSteps() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isInstalled()) return setState("installed");
    if (isIos()) return setState("ios");
    if (window.__engisyncInstall) return setState("ready");

    // The event may still be on its way. Listen for the signal the head
    // script dispatches, and fall back to written steps if it never comes.
    const onReady = () => setState("ready");
    window.addEventListener("engisync:installable", onReady);
    window.addEventListener("appinstalled", () => setState("installed"));

    const timer = setTimeout(() => {
      setState((s) => (s === "checking" ? "unsupported" : s));
    }, 2500);

    return () => {
      window.removeEventListener("engisync:installable", onReady);
      clearTimeout(timer);
    };
  }, []);

  const install = useCallback(async () => {
    const evt = window.__engisyncInstall;
    if (!evt) return;
    setBusy(true);
    // Single-use: clear first so a double tap cannot call prompt() twice on
    // the same event, which throws.
    window.__engisyncInstall = undefined;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      setState(outcome === "accepted" ? "installed" : "unsupported");
    } catch {
      setState("unsupported");
    } finally {
      setBusy(false);
    }
  }, []);

  if (state === "installed") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
        <Check className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold">Already installed</p>
          <p className="text-sm text-muted-foreground">
            Open EngiSync from your home screen.
          </p>
        </div>
      </div>
    );
  }

  if (state === "ios") {
    return (
      <div className="space-y-3">
        {/* No button is possible here. Apple does not allow it. */}
        <p className="text-lg font-semibold">Add to your home screen</p>
        <ol className="ml-5 list-decimal space-y-2 text-base">
          <li>
            Tap{" "}
            <Share className="inline h-5 w-5 align-text-bottom text-primary" />{" "}
            at the bottom of Safari
          </li>
          <li>
            Tap <span className="font-semibold">Add to Home Screen</span>
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Must be Safari — Chrome on iPhone can&apos;t install apps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="h-14 w-full text-base"
        onClick={install}
        disabled={state !== "ready" || busy}
      >
        <Download className="h-5 w-5" />
        {busy ? "Installing…" : "Install EngiSync"}
      </Button>

      {state === "checking" && (
        <p className="text-center text-sm text-muted-foreground">
          Preparing…
        </p>
      )}

      {state === "unsupported" && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Your browser didn&apos;t offer the button.</p>
          <p className="mt-1 text-muted-foreground">
            Open the browser menu (⋮) and choose{" "}
            <span className="font-medium">Install app</span> or{" "}
            <span className="font-medium">Add to Home screen</span>.
          </p>
        </div>
      )}
    </div>
  );
}
