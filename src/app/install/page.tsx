import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Cpu } from "lucide-react";
import { getBaseUrl, generateQrDataUrl } from "@/lib/qr";
import { InstallSteps } from "./install-steps";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = {
  title: "Install EngiSync",
  description: "Put EngiSync on your phone — one tap, no download.",
  robots: { index: true, follow: true },
};

/**
 * /install — the page you send people.
 *
 * DESIGN RULE FOR THIS PAGE: a student should install without reading.
 *
 * The first version explained the process on three platforms, listed three
 * benefits and warned about app stores. All true, all ignored — someone sent
 * a link in a WhatsApp group gives a page about two seconds, and a wall of
 * text reads as "this is complicated" and gets closed.
 *
 * So the button is the page. Everything that was prose is either gone or
 * moved below the fold, and the only text above it is one line saying what
 * the thing is. The QR code stays because it is the mechanism for a lecture
 * room: put it on a slide and thirty people install without typing anything.
 */
export default async function InstallPage() {
  const base = await getBaseUrl();
  const url = `${base}/install`;
  const qr = await generateQrDataUrl(url);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Cpu className="h-8 w-8 text-primary" aria-hidden />
        <span className="text-xl font-bold">EngiSync</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">
        Get EngiSync on your phone
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your projects, tasks and deadlines — with notifications.
      </p>

      <div className="mt-7">
        <InstallSteps />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Free · No download · Updates automatically
      </p>

      {/* Below the fold: for the person sharing it, not the person installing. */}
      <div className="mt-12 border-t pt-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-white p-2">
            <Image
              src={qr}
              alt={`QR code for ${url}`}
              width={96}
              height={96}
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Share with your group</p>
            <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
              {url}
            </p>
            <CopyLink url={url} />
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="mt-8 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Already have an account? Sign in
      </Link>
    </main>
  );
}
