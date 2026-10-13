import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Cpu, WifiOff, BellRing, Zap } from "lucide-react";
import { getBaseUrl, generateQrDataUrl } from "@/lib/qr";
import { InstallSteps } from "./install-steps";

export const metadata: Metadata = {
  title: "Install EngiSync",
  description:
    "Put EngiSync on your phone — project tasks, deadlines and group messages, with notifications.",
  // The one page in the product that SHOULD be found by someone who was told
  // about it verbally and is searching for it.
  robots: { index: true, follow: true },
};

/**
 * /install — the page you send people.
 *
 * WHY THIS PAGE EXISTS INSTEAD OF AN APP STORE LISTING
 * EngiSync is a progressive web app: it installs from the browser, with no
 * store account, no review queue and no download. That is a genuine advantage
 * on Zimbabwean mobile data — there is no 40 MB APK, the install is a few
 * hundred kilobytes of cached assets — but it is unfamiliar. Most people
 * expect to search a store, do not find one, and conclude there is no app.
 *
 * So this page does the job a store listing does: says what it is, says why
 * installing beats a bookmark, and gives the exact steps for the device in
 * the reader's hand. The QR code is the point for a class — put it on a slide
 * or a printed sheet and thirty people install it without anyone typing a URL.
 */
export default async function InstallPage() {
  const base = await getBaseUrl();
  const url = `${base}/install`;
  // Generated server-side at request time rather than shipped as a client
  // library: the QR is a few hundred bytes of data URL, against ~40 KB of
  // JavaScript to draw the same thing in the browser.
  const qr = await generateQrDataUrl(url);

  const benefits = [
    {
      icon: BellRing,
      title: "Real notifications",
      body: "Deadline reminders and group messages arrive like any other app, even when it's closed.",
    },
    {
      icon: Zap,
      title: "Opens instantly",
      body: "Launches from your home screen with no browser bar, and loads faster each time.",
    },
    {
      icon: WifiOff,
      title: "Lighter on data",
      body: "The app is stored on your phone, so you pay for it once instead of on every visit.",
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Cpu className="h-7 w-7 text-primary" aria-hidden />
        <span className="text-lg font-bold">EngiSync</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Install EngiSync</h1>
      <p className="mt-2 text-muted-foreground">
        Your projects, tasks, deadlines and group messages — on your home
        screen. It installs straight from this page.
      </p>

      {/* Said plainly and early. Someone who came here looking for a Play
          Store link needs this answered before anything else, or they leave
          thinking the app does not exist. */}
      <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
        <span className="font-medium">There is no Play Store or App Store download.</span>{" "}
        EngiSync installs directly from your browser — nothing to download,
        and it updates itself.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <InstallSteps url={url} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl border bg-white p-3">
            <Image
              src={qr}
              alt={`QR code linking to ${url}`}
              width={148}
              height={148}
              unoptimized
            />
          </div>
          <p className="max-w-[10rem] text-center text-xs text-muted-foreground">
            Scan to open this page on a phone
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-xl border bg-card p-4">
            <b.icon className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-medium">{b.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t pt-6 text-sm">
        <p className="text-muted-foreground">
          Already installed, or just want to use it in your browser?
        </p>
        <Link
          href="/login"
          className="mt-1 inline-block font-medium text-primary hover:underline"
        >
          Sign in to EngiSync →
        </Link>
      </div>
    </main>
  );
}
