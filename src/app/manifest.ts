import type { MetadataRoute } from "next";

/**
 * The web app manifest — what makes EngiSync installable to a phone's home
 * screen, launching without browser chrome.
 *
 * WHY A PWA AND NOT A NATIVE APP
 * This product has no product API. Thirty files export Server Actions; the
 * eight route handlers are infrastructure (auth, health, cron, file download,
 * push subscription). A React Native or Flutter client could not call any of
 * it — an entire API surface would have to be built first, for every project,
 * task, document, evidence, budget and grant mutation in the app, before a
 * single screen existed.
 *
 * It would also be the wrong trade for these users. On Zimbabwean mobile data
 * a 40 MB store download to reach a site that already works is a cost with no
 * benefit, and updates would cost it again. An installed PWA is the same bytes
 * they have already downloaded, with a home-screen icon and no browser bars.
 *
 * `display: standalone` rather than `fullscreen`: this app is full of forms and
 * text fields, and hiding the status bar means hiding the clock and battery
 * from a student working to a deadline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EngiSync — Engineering Projects",
    short_name: "EngiSync",
    description:
      "Plan, document and submit university engineering projects — tasks, evidence, meetings, budget and supervisor review in one place.",
    start_url: "/dashboard",
    // Scope excludes nothing: the whole origin is the app.
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    /* Static hex, deliberately. `theme_color` is read by the OS before any CSS
       runs, so it cannot follow the user's chosen personality — it must be a
       literal. These are the Midnight defaults, which is what an installing
       user sees first. */
    background_color: "#070B14",
    theme_color: "#070B14",
    categories: ["education", "productivity"],
    /* STATIC PNGs, not generated at request or build time.
       These were originally `icon.tsx` / `apple-icon.tsx` using
       `next/og`'s ImageResponse. That looked tidier — the mark could not drift
       from the navbar — but it FAILED THE PRODUCTION BUILD outright:

         Error occurred prerendering page "/icon"
         TypeError: Invalid URL
         Export encountered an error on /icon/route, exiting the build.

       An app icon changes roughly never, so generating it on every build was
       buying a guarantee nobody needed at the cost of a build-time dependency
       that can fail. They are now rasterised once with sharp from the same
       lucide `Cpu` glyph the navbar uses, and committed. */
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "My projects",
        short_name: "Projects",
        url: "/dashboard/projects",
      },
      {
        name: "Start a project",
        short_name: "New",
        url: "/dashboard/projects/new",
      },
    ],
  };
}
