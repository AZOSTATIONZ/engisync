"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Install EngiSync" — the bridge from a browser tab to a home-screen app.
 *
 * HOW THE BROWSER ACTUALLY BEHAVES, because it governs the whole design:
 *
 * 1. Chrome fires `beforeinstallprompt` ONCE, when it decides the app is
 *    installable. If you do not call preventDefault() it shows its own
 *    mini-infobar and the event is spent. We capture and stash it so the
 *    install can happen at a moment the student chose.
 *
 * 2. `prompt()` must be called from a USER GESTURE and may be called ONCE per
 *    captured event. A second call throws. Hence the event is cleared the
 *    moment it is used — there is no retrying.
 *
 * 3. iOS/Safari never fires the event at all. There is no programmatic
 *    install on iOS; the only route is Share → Add to Home Screen. Pretending
 *    otherwise gives iPhone users a button that silently does nothing, so
 *    they get instructions instead.
 *
 * 4. An already-installed app relaunches in `display-mode: standalone`.
 *    Showing an install banner inside the installed app is a classic bug;
 *    that check runs first.
 *
 * DISMISSAL IS REMEMBERED. Re-asking on every visit is how install prompts
 * become the thing people associate with cookie banners. localStorage is
 * per-device, which is exactly the right scope — installing is a per-device
 * decision, so a dismissal on a lab PC should not follow you to your phone.
 */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "engisync-install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; the touch-point check separates a real
  // iPad from a desktop Safari where this banner does not belong.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari's own, non-standard flag for a home-screen launch.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never inside the installed app, never if previously dismissed.
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Private mode or storage disabled. Treat as "not dismissed" and carry
      // on rather than failing closed — the banner is dismissible either way.
    }

    if (isIos()) {
      setShowIosHelp(true);
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      // Suppress Chrome's own infobar so ours is the only ask.
      e.preventDefault();
      setDeferred(e as InstallEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Once installed, take the banner away immediately rather than waiting
    // for the next page load.
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not remembered on this device. Acceptable: worst case we ask again.
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    // Single-use: clear before awaiting so a double tap cannot call prompt()
    // twice on the same event, which throws.
    const evt = deferred;
    setDeferred(null);
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") setVisible(false);
      else dismiss();
    } catch {
      setVisible(false);
    }
  }, [deferred, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Install EngiSync"
      /* Sits above the mobile bottom nav (which is fixed) rather than under
         it — pb-safe keeps it clear of the iPhone home indicator. */
      className="elev-4 fixed inset-x-3 bottom-20 z-[90] rounded-xl border bg-popover p-3 md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install EngiSync</p>
          {showIosHelp ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap{" "}
              <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Share" />{" "}
              then <span className="font-medium">Add to Home Screen</span>. Push
              notifications only work once it&apos;s installed.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add it to your home screen — opens instantly, uses less data, and
              deadline reminders reach you.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!showIosHelp && (
        <Button size="sm" className="mt-3 w-full" onClick={install}>
          <Download className="h-4 w-4" /> Install
        </Button>
      )}
    </div>
  );
}
