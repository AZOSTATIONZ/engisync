import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ThemeGallery } from "@/components/theme-studio/theme-gallery";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Theme Studio" };

/**
 * Theme Studio.
 *
 * A route of its own rather than a tenth card in Settings. Settings is
 * already nine stacked cards deep, and choosing how the product looks is a
 * browsing task — you compare, you try one, you change your mind — which is a
 * poor fit for a panel wedged between notification toggles and the danger
 * zone.
 *
 * A server component holding a client gallery: nothing here needs data, so
 * there is no reason to pay for a client boundary above the part that is
 * genuinely interactive.
 */
export default function AppearancePage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href={routes.settings}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Settings
        </Link>
        <h1 className="page-title mt-2">Theme Studio</h1>
        <p className="page-sub max-w-2xl">
          Every theme has a light and a dark version, so this sits alongside
          your light/dark setting rather than replacing it. Preview one to see
          your own dashboard wearing it — nothing is saved until you apply it.
        </p>
      </div>

      <ThemeGallery />
    </div>
  );
}
