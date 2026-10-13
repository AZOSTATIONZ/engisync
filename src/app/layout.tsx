import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
