import Link from "next/link";
import { Cpu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* `min-h-dvh`, not `min-h-screen`.
     *
     * `100vh` on mobile is the viewport with the browser UI HIDDEN, so a page
     * sized to it is always taller than what is actually visible — the classic
     * symptom being a login button sitting just below the fold that the user
     * has to scroll to reach. `dvh` tracks the real viewport as the address
     * bar and keyboard come and go. */
    <div className="flex min-h-dvh flex-col">
      <header className="container flex h-16 shrink-0 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Cpu className="h-6 w-6 text-primary" />
          <span>EngiSync</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* `items-center` centres the card on a tall screen, but on a SHORT one
          (landscape phone, or portrait with the keyboard open) centring a card
          taller than the viewport clips its top beyond reach — the content
          overflows in both directions and the scroll container cannot get to
          it. `justify-center` plus `my-auto` on a block child achieves the
          same centring while still allowing the card to push the page taller
          and scroll normally when it has to. */}
      <main className="flex flex-1 flex-col justify-center px-4 py-6">
        <div
          className="mx-auto my-auto w-full"
          /* Clears the iPhone home indicator and any notch in landscape. */
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
