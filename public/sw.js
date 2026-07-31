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

const ASSET_CACHE = "engisync-static-v1";

self.addEventListener("activate", (event) => {
  // Drop caches from previous releases so storage does not grow without bound.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k))),
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

  // Same-origin immutable build assets only. Anything else falls through to
  // the network untouched — the service worker does not participate.
  const cacheable =
    url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
  if (!cacheable) return;

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Only store a genuine success; an error page cached under an asset
        // URL would persist until the next release.
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
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
