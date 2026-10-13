/* EngiSync service worker — web push, and a deliberately narrow asset cache.
 *
 * WHAT IS CACHED, AND WHAT IS EMPHATICALLY NOT
 * Only `/_next/static/*` — the build's JavaScript, CSS and fonts. Those URLs
 * contain a content hash, so a given URL's bytes can never change: serving
 * them from cache is not a staleness risk, it is a correctness-preserving
 * shortcut. When the app is rebuilt the filenames change and the old entries
 * are evicted below.
 *
 * NOTHING ELSE IS CACHED. No HTML, no server-rendered payloads, no API
 * responses, no file downloads. Every one of those is per-user and
 * authorisation-dependent, and a service worker cache is shared across
 * accounts on a shared device — a laptop in a university lab, a phone passed
 * between classmates. Caching one student's project page and serving it to the
 * next person is a data leak that no amount of cleverness makes safe, so the
 * rule here is absolute rather than case-by-case.
 *
 * WHY BOTHER AT ALL
 * On Zimbabwean mobile data the JS and CSS bundle is the single largest
 * repeated cost of using this app. Caching it means a student pays for it once
 * per release instead of once per visit.
 */

const ASSET_CACHE = "engisync-static-v2";

/* OFFLINE FALLBACK — the one HTML page that may be cached.
 *
 * The rule above ("no HTML, ever") exists because a service worker cache is
 * shared across accounts on a device. /offline is the single exception, and
 * only because it is provably safe: it is a static page with no user data, no
 * fetching and identical bytes for every visitor. Serving it to the wrong
 * person reveals nothing.
 *
 * It is used ONLY when a navigation request fails outright — the network is
 * gone. A successful response, including an error status from the server, is
 * always passed through untouched. The cache never shadows a working network.
 */
const OFFLINE_URL = "/offline";
const OFFLINE_CACHE = "engisync-offline-v1";

self.addEventListener("install", (event) => {
  // Do not wait for existing tabs to close before replacing a broken worker.
  self.skipWaiting();
  // Pre-cache the fallback; if it fails the worker still installs and simply
  // has no fallback, which is the previous behaviour rather than a breakage.
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // No fallback available this release. Not fatal.
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  // Drop caches from previous releases so storage does not grow without bound.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSET_CACHE && k !== OFFLINE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  /* NAVIGATIONS: network only, with an offline fallback.
   *
   * Note what this does NOT do. It never reads a cached copy of the page the
   * user asked for, and it never writes one. It tries the network; if the
   * network answers at all — 200, 404, 500 — that answer is returned
   * unaltered. Only an outright failure (no connection) falls back, and the
   * fallback is the generic /offline page, never the page requested.
   *
   * That distinction is the whole safety argument: a student's project page
   * is never stored, so it can never be served to whoever picks the device up
   * next. */
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          try {
            const cached = await caches.match(OFFLINE_URL);
            if (cached) return cached;
          } catch {
            // Fallback unavailable; fall through to the browser's own error.
          }
          return Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin immutable build assets only. Anything else falls through to
  // the network untouched — the service worker does not participate.
  const cacheable =
    url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
  if (!cacheable) return;

  /* A CACHE MUST NEVER BE ABLE TO BREAK THE PAGE.
     ------------------------------------------------------------------
     The first version of this handler had no catch anywhere in the chain:

       respondWith(caches.match(req).then(hit => hit || fetch(req).then(...)))

     If `caches.match` threw — Android evicting storage under pressure, a
     corrupted cache, quota exhaustion — or if `fetch` rejected on a flaky
     mobile connection, the promise handed to `respondWith` rejected, and the
     browser turned that into a hard network error for the resource. For a
     JavaScript chunk that means React never boots and the whole app dies with
     "a client-side exception has occurred". It shipped, and it bricked the
     landing page on a real phone on mobile data.

     The cache existed to SAVE data, and instead it introduced a failure mode
     that not having it would not have had. So the rule now is absolute: every
     step is wrapped, and any problem at all falls through to an ordinary
     network request. The worst this handler can now do is behave exactly as
     though it were not installed. */
  event.respondWith(
    (async () => {
      try {
        const hit = await caches.match(req);
        if (hit) return hit;
      } catch {
        // Cache unreadable — carry on to the network.
      }

      const res = await fetch(req);

      // Store opportunistically. A failure here (quota, eviction, private
      // mode) must never affect the response the page receives, so it is
      // awaited separately and swallowed.
      try {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          const cache = await caches.open(ASSET_CACHE);
          await cache.put(req, copy);
        }
      } catch {
        // Not cached this time. Immaterial.
      }

      return res;
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "EngiSync", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "EngiSync";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/dashboard" },
    tag: data.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
