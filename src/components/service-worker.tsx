"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for every visitor.
 *
 * It used to register only when someone opted into push notifications in
 * Settings, which meant the asset cache — the part that actually saves a
 * student money on mobile data — existed only for the small minority who had
 * turned notifications on. Registration and notification consent are separate
 * things and are now separated: this asks for no permission and shows no
 * prompt, it only makes the cache available.
 *
 * Registered after `load` so it never competes with the first render for
 * bandwidth on a slow connection. Failure is swallowed deliberately — a
 * service worker is an optimisation, and an unsupported browser or a blocked
 * registration must not surface an error to someone trying to read their
 * tasks.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Optimisation only — never surfaced. */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
