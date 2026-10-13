import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Shown when a page is requested with no connection.
 *
 * WHY THIS PAGE CONTAINS NO USER DATA, AND NEVER MAY
 * The service worker caches it so it can be served while offline, and a
 * service worker cache is shared by every account that uses that browser —
 * a lab PC, a phone passed between classmates. Anything personal cached here
 * would be shown to the next person. It is therefore static, generic, and
 * identical for everyone.
 *
 * It is also deliberately plain: no data fetching, no client JavaScript
 * beyond what the layout already ships. A fallback that itself needs the
 * network to render is not a fallback.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        EngiSync needs a connection to load your projects. Your work is saved on
        the server — nothing has been lost.
      </p>
      <p className="text-xs text-muted-foreground">
        This page will work again as soon as you reconnect. Try turning mobile
        data on, or moving somewhere with better signal.
      </p>
    </div>
  );
}
