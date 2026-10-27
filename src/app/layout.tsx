import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

/* NO WEBFONT.
   `Inter` was imported here and its `--font-sans` variable put on the body,
   while `font-sans` resolved to Tailwind's default system stack — so the
   typeface was preloaded and rendered nowhere. Measured on the live site:
   47.6 KB transferred per first load, with every Inter face reporting
   "unloaded" in `document.fonts` and both body and headings computing to
   `ui-sans-serif, system-ui, ...`.

   Removing it changes nothing visible, because nothing was using it, and
   returns 47.6 KB to students on metered mobile data. That is also what this
   codebase already said it wanted: see the note on `ThemeForm.fontSans` —
   "deliberately a STACK, not a webfont URL".

   Typography is now a token (`--font-sans` in globals.css, read by
   tailwind.config.ts), so a style can change the typeface using fonts
   already on the device, at no bandwidth cost at all. */

export const metadata: Metadata = {
  metadataBase: new URL("https://engisync.co.zw"),
  title: {
    default: "EngiSync — Engineering Student Collaboration",
    template: "%s · EngiSync",
  },
  description:
    "Manage individual work, group projects, resources, and productivity — built for university engineering students.",

  // Points at src/app/manifest.ts. Without this link the browser never looks
  // for a manifest and no install prompt is ever offered.
  manifest: "/manifest.webmanifest",

  // iOS ignores the manifest almost entirely and reads these instead. Safari
  // will not show "Add to Home Screen" as a proper app without them.
  appleWebApp: {
    capable: true,
    title: "EngiSync",
    // "default" keeps the status bar legible against the dark app background;
    // "black-translucent" would let content slide under the clock.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  // The app is a private workspace; indexing dashboard routes would be both
  // useless and a privacy smell. Public portfolios opt back in per-page.
  robots: { index: true, follow: true },
  verification: { google: "41e1W5Ss2JvohLQz_BEZHIlGI1BPHYuOrlqZBDaNMB0" },

  openGraph: {
    title: "EngiSync — Engineering Student Collaboration",
    description:
      "Manage individual work, group projects, resources, and productivity — built for university engineering students.",
    url: "https://engisync.co.zw",
    siteName: "EngiSync",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Matches the manifest theme_color. A mismatch leaves the Android status
  // bar a different colour from the app it is sitting above.
  themeColor: "#070B14",
  // Draws behind the notch/punch-hole so an installed app does not show a
  // white band at the top of the screen.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CAPTURE THE INSTALL EVENT BEFORE REACT EXISTS.
            `beforeinstallprompt` fires as soon as Chrome decides the app is
            installable — frequently before React has hydrated and attached its
            own listener. A component that only starts listening on mount
            therefore misses it on most first visits, and the Install button
            never appears. Stashing it on `window` from an inline script in the
            head means the event is already waiting by the time anything
            renders. preventDefault() also suppresses Chrome's own mini-infobar
            so ours is the only prompt. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__engisyncInstall=e;window.dispatchEvent(new Event('engisync:installable'))});",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
