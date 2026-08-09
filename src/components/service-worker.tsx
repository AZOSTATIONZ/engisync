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

    /* NEVER IN DEVELOPMENT — and unregister if it is already there.
       ----------------------------------------------------------------
       The worker caches `/_next/static/*` on the reasoning that those URLs
       contain a content hash, so a URL's bytes can never change. That holds
       in a production build. It is FALSE under `next dev`, where chunk names
       are stable across rebuilds and their contents change constantly.

       The result is a development environment that silently serves yesterday's
       JavaScript. It cost real time here: after a rebuild, every submission
       failed with "Failed to find Server Action <id>" because the cached
       bundle kept posting an action ID the running server no longer knew.
       Nothing in the error points at a service worker, and clearing `.next`
       and restarting does not help, because the stale copy is in the BROWSER.

       Unregistering rather than merely skipping registration matters: any
       developer who ran the app before this change still has the worker
       installed, and a worker nobody registers is still a worker that runs. */
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then(
        (regs) => regs.forEach((r) => r.unregister()),
        () => {},
      );
      return;
    }

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
