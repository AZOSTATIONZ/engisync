import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes EngiSync installable.
 *
 * WHY THIS FILE IS THE WHOLE "MOBILE APP" FOR NOW
 * The service worker in public/sw.js already caches build assets and handles
 * web push. The only thing standing between this app and an icon on a
 * student's home screen was a manifest. With it, Android offers "Install app",
 * the app opens without browser chrome, and push notifications arrive exactly
 * as they would from a Play Store build — at no cost, with no review cycle,
 * and with no second codebase to keep in sync.
 *
 * Written as a TypeScript route rather than a static public/manifest.json so
 * the shape is checked at build time. A manifest with one misspelled key
 * silently stops the install prompt appearing, and nothing in the UI would
 * tell you.
 *
 * ICONS — the `purpose` field is not decoration:
 *   "any"      used as supplied, inside whatever frame the OS draws.
 *   "maskable" the launcher may crop up to 20% from every edge into a circle
 *              or squircle. Those files inset the mark into the centre 80%
 *              safe zone; supplying a non-maskable icon here gets the logo's
 *              edges sliced off on most Android launchers.
 * Both are listed because Android picks per-launcher.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EngiSync — Engineering Collaboration",
    short_name: "EngiSync",
    description:
      "Projects, tasks, documentation, budgets and deadlines for university engineering teams.",

    start_url: "/dashboard",
    // `id` is what the browser uses to decide whether an install is the SAME
    // app on a later visit. Without it the start_url is used, so changing the
    // landing route would strand the installed copy as a separate app.
    id: "/",
    scope: "/",

    // `standalone` removes the browser UI. Deliberately not "fullscreen":
    // this app is used between lectures, and hiding the clock and battery on
    // a phone someone is checking in a corridor is hostile.
    display: "standalone",
    orientation: "portrait-primary",

    background_color: "#070B14",
    theme_color: "#070B14",

    // Right-to-left is not supported in the copy yet; saying so is honest.
    dir: "ltr",
    lang: "en-ZW",

    categories: ["education", "productivity"],

    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

    /**
     * Long-press the home screen icon to jump straight to a task.
     *
     * Chosen as the three things a student opens the app to DO, not the three
     * biggest features: check what is due, start something new, find an idea.
     * Android shows at most four and reverses the order in some launchers, so
     * the most important one is listed first and the list is kept short.
     */
    shortcuts: [
      {
        name: "My Work",
        short_name: "My Work",
        description: "Tasks, deadlines and meetings assigned to you",
        url: "/dashboard/my-work",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "New project",
        short_name: "New",
        description: "Create a project or join one with a code",
        url: "/dashboard/projects/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Project Hub",
        short_name: "Hub",
        description: "Projects you can build, with parts lists and budgets",
        url: "/dashboard/project-hub",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],

    prefer_related_applications: false,
  };
}
