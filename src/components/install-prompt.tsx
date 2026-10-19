"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCopy, Download, Share, X } from "lucide-react";
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

function isIosSafari(): boolean {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  // Every iOS browser uses WebKit, but only Safari omits CriOS/FxiOS/etc.
  // In-app browsers (Instagram, WhatsApp, LinkedIn) include their own token.
  return (
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|OPiOS|EdgiOS|FBAN|FBAV|Instagram|LinkedIn|Twitter|Line\//.test(ua)
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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showIosNonSafari, setShowIosNonSafari] = useState(false);
  const [copied, setCopied] = useState(false);
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
      if (isIosSafari()) {
        setShowIosHelp(true);
      } else {
        setShowIosNonSafari(true);
      }
      setVisible(true);
      return;
    }

    /* The event is captured and stashed by an inline script in the root
       layout, which runs long before React hydrates. Listening for
       `beforeinstallprompt` here would never fire: by the time this effect
       runs the event has already been dispatched and consumed, and a listener
       added afterwards does not receive past events. Read what the head
       script stored, and listen for the signal it emits in case it has not
       arrived yet. */
    if (window.__engisyncInstall) {
      setDeferred(window.__engisyncInstall);
      setVisible(true);
    }

    const onPrompt = () => {
      if (!window.__engisyncInstall) return;
      setDeferred(window.__engisyncInstall);
      setVisible(true);
    };
    window.addEventListener("engisync:installable", onPrompt);

    // Once installed, take the banner away immediately rather than waiting
    // for the next page load.
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("engisync:installable", onPrompt);
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

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the user can still long-press the URL bar.
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

  /* RESERVE THE SPACE THIS BANNER OCCUPIES.
     ------------------------------------------------------------------
     It is `fixed`, so it is outside flow and sits ON TOP of the page. The
     layout's `pb-24` reserves room for the bottom NAV and nothing else, so
     on a phone this card covered whatever was at the end of the content —
     the last row of a table, the submit button of a form. The one place a
     banner must not cover anything is the bottom of a scrollable page,
     because that is exactly where scrolling stops.

     The height cannot be hardcoded: the iOS copy runs to three lines, the
     Chrome copy has an Install button, and both reflow with text size. So
     the banner measures itself and publishes the result as
     `--install-prompt-h`, which the dashboard layout adds to the padding it
     already applies. A ResizeObserver rather than a one-off measurement,
     because rotating the phone changes the wrap.

     Cleared on unmount, which also covers dismissal and installation —
     leaving a stale value would reserve space for a banner that is gone. */
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    const root = document.documentElement;
    const clear = () => root.style.removeProperty("--install-prompt-h");
    if (!visible || !el) {
      clear();
      return;
    }
    const publish = () =>
      root.style.setProperty("--install-prompt-h", `${el.offsetHeight}px`);
    publish();
    // Guarded: ResizeObserver is absent on some older Android browsers, and
    // these students are on exactly those. The single measurement above
    // still applies there.
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(publish) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      clear();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={cardRef}
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
          {showIosNonSafari ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open this link in{" "}
              <span className="font-medium">Safari</span> to install EngiSync
              on your home screen. Copy the link below and paste it in Safari.
            </p>
          ) : showIosHelp ? (
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

      {showIosNonSafari ? (
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={copyLink}>
          {copied ? (
            <>Copied!</>
          ) : (
            <>
              <ClipboardCopy className="h-4 w-4" /> Copy link
            </>
          )}
        </Button>
      ) : !showIosHelp ? (
        <Button size="sm" className="mt-3 w-full" onClick={install}>
          <Download className="h-4 w-4" /> Install
        </Button>
      ) : null}
    </div>
  );
}
