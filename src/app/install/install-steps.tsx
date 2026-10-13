"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Platform-specific install instructions.
 *
 * WHY DETECT THE PLATFORM AT ALL
 * The three routes to installing are genuinely different — Chrome has a menu
 * item, Safari has a Share sheet and no programmatic install, desktop has an
 * address-bar icon. Showing all three to everyone means every reader has to
 * work out which two paragraphs to ignore, and the one person who needed the
 * iOS steps skims past them.
 *
 * Detection runs AFTER mount, never during render. Reading `navigator` while
 * rendering on the server produces a hydration mismatch, and the usual
 * symptom is React discarding the server HTML and re-rendering — a visible
 * flash on exactly the page meant to make a good first impression. The
 * generic steps are rendered first and replaced once the platform is known.
 */

type Platform = "android" | "ios" | "desktop";

function detect(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ claims to be a Mac; touch points separate a real iPad from a
  // desktop Safari, where the install route is different.
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const STEPS: Record<Platform, { title: string; steps: string[]; note?: string }> = {
  android: {
    title: "Install on Android",
    steps: [
      "Open this page in Chrome",
      "Tap the ⋮ menu, top right",
      "Tap Install app (or Add to Home screen)",
      "Open EngiSync from your home screen",
    ],
    note: "Reminders and group messages arrive as normal phone notifications once installed.",
  },
  ios: {
    title: "Install on iPhone or iPad",
    steps: [
      "Open this page in Safari — not Chrome",
      "Tap the Share button at the bottom",
      "Scroll down and tap Add to Home Screen",
      "Tap Add, then open EngiSync from your home screen",
    ],
    // This is a real iOS limitation, not an EngiSync shortcoming, and saying
    // so prevents someone concluding notifications are broken.
    note: "On iPhone, notifications only work after you add it to the home screen. Safari is required — Chrome on iOS cannot install web apps.",
  },
  desktop: {
    title: "Install on your computer",
    steps: [
      "Open this page in Chrome or Edge",
      "Click the install icon in the address bar, on the right",
      "Or use the ⋮ menu → Cast, save and share → Install",
      "EngiSync opens in its own window, like any other program",
    ],
  },
};

export function InstallSteps({ url }: { url: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setPlatform(detect()), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions). The URL is printed
      // on the page anyway, so this is a convenience, not the only route.
    }
  }

  async function share() {
    // Web Share opens WhatsApp, Messages and the rest — the way a student
    // would actually pass this to a classmate.
    try {
      await navigator.share({
        title: "EngiSync",
        text: "Our engineering project workspace — install it on your phone:",
        url,
      });
    } catch {
      // Cancelled, or unsupported. Copy remains available.
    }
  }

  const content = platform ? STEPS[platform] : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          The link
        </p>
        <p className="mt-1 break-all font-mono text-sm">{url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button size="sm" variant="outline" onClick={share}>
              <Share className="h-4 w-4" /> Share
            </Button>
          )}
        </div>
      </div>

      {content ? (
        <div>
          <h2 className="font-semibold">{content.title}</h2>
          <ol className="mt-2 ml-5 list-decimal space-y-1.5 text-sm">
            {content.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {content.note && (
            <p className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              {content.note}
            </p>
          )}
        </div>
      ) : (
        /* Rendered on the server and for the instant before detection runs. */
        <div>
          <h2 className="font-semibold">Install it</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open this page on the device you want to install on, and the exact
            steps for it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
