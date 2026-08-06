"use client";

import { useEffect, useState } from "react";

/**
 * The last line of defence.
 *
 * `dashboard/error.tsx` catches failures inside the app shell, but a client
 * exception thrown OUTSIDE it — on the landing page, during hydration, from a
 * provider — had no boundary at all, so Next fell back to its bare default:
 *
 *   "Application error: a client-side exception has occurred
 *    (see the browser console for more information)."
 *
 * On a phone that is a dead end. There is no console to see, no reload
 * affordance, and no way to clear whatever local state caused it. A student on
 * mobile data has nothing to do but close the tab.
 *
 * WHY THE RESET BUTTON DOES WHAT IT DOES
 * The most likely cause of a hard client failure in this app is local state
 * the page cannot recover from on its own: a stale or corrupt service worker
 * cache, or a service worker whose fetch handler is faulty. Those survive a
 * refresh — that is the entire point of a service worker — so "try again"
 * alone can loop forever. Unregistering the worker and dropping the caches is
 * the one action that reliably breaks that loop, and it costs the user only a
 * re-download.
 *
 * This file must be self-contained and defensive: it renders when the app is
 * already broken, so it deliberately uses no shared components, no design
 * tokens, and no imports beyond React. Inline styles because a stylesheet
 * failure is one of the things that could have put us here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  async function hardReset() {
    setClearing(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // Nothing to unregister, or unavailable. Continue.
    }
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Caches unavailable. Continue.
    }
    // Full reload rather than `reset()` — the point is to start from nothing.
    window.location.replace("/");
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#070B14",
          color: "#F8FAFC",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 20px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0B1220, #22D3EE)",
            }}
          />
          <h1 style={{ fontSize: "1.4rem", margin: "0 0 8px", fontWeight: 700 }}>
            EngiSync didn&apos;t load properly
          </h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "#94A3B8" }}>
            Your work is safe — nothing here is stored on this device. This is
            the app failing to start, not your data.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "block",
              width: "100%",
              minHeight: 48,
              marginBottom: 10,
              borderRadius: 12,
              border: "none",
              background: "#22D3EE",
              color: "#070B14",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          <button
            type="button"
            onClick={hardReset}
            disabled={clearing}
            style={{
              display: "block",
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              color: "#F8FAFC",
              fontSize: "0.95rem",
              cursor: clearing ? "default" : "pointer",
              opacity: clearing ? 0.6 : 1,
            }}
          >
            {clearing ? "Clearing…" : "Reset the app and reload"}
          </button>

          <p style={{ marginTop: 18, fontSize: "0.75rem", color: "#64748B" }}>
            Resetting clears this device&apos;s cached copy of the app and
            downloads a fresh one. You stay signed in.
          </p>

          {/* SHOW THE ACTUAL ERROR.
              The first version of this screen showed only a digest, which is
              populated for server errors and empty for client ones — so for
              the exact failure that prompted this file, it displayed nothing
              diagnostic at all. Debugging a phone that way is guesswork, and
              guesswork already cost a wrong diagnosis here.

              It is behind a disclosure because a stack trace is noise to a
              student and a lifeline to whoever is fixing it, and it is
              selectable so it can be copied into a message. Nothing here is
              sensitive: it is this device's own exception, not user data. */}
          {(error?.message || error?.digest) && (
            <details style={{ marginTop: 20, textAlign: "left" }}>
              <summary
                style={{
                  fontSize: "0.75rem",
                  color: "#64748B",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                Technical details
              </summary>
              <pre
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  color: "#94A3B8",
                  fontSize: "0.68rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  userSelect: "text",
                  maxHeight: "40vh",
                  overflow: "auto",
                }}
              >
                {[
                  error?.name && `${error.name}: ${error.message ?? ""}`,
                  error?.digest && `digest ${error.digest}`,
                  error?.stack,
                ]
                  .filter(Boolean)
                  .join("\n\n")}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
