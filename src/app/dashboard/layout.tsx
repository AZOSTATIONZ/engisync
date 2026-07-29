import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email";
import { isSupervisor } from "@/lib/supervisor";
import { ACCENTS, resolveAccent } from "@/lib/personalization";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { VerifyBanner } from "@/components/verify-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // One query for both the verify banner and the chosen accent, rather than
  // two round trips to a serverless database that suspends when idle.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, accentColor: true },
  });

  const showVerify = isEmailConfigured() && !user?.emailVerified;
  const supervises = await isSupervisor(session.user.id);

  const accent = ACCENTS[resolveAccent(user?.accentColor)];

  return (
    <div className="flex min-h-screen flex-col">
      {/* The chosen accent overrides one custom property rather than shipping a
          stylesheet per colour. Both light and dark values are set because the
          theme can change client-side without a re-render, and an accent that
          only worked in one theme would look broken in the other.

          Values come from a fixed palette keyed by `accentColor`, never from
          user input — see lib/personalization.ts. That is what stops this
          being a CSS injection point. */}
      <style>{`:root{--primary:${accent.light}}.dark{--primary:${accent.dark}}`}</style>
      <Navbar isSupervisor={supervises} />
      {showVerify && <VerifyBanner />}
      {/* `min-w-0` lets the main column actually shrink — without it, flex
          children refuse to go below their content width, which is what makes
          long titles push the layout wide.

          There is deliberately NO `overflow-x-clip` here any more. Clipping
          HIDES overflow, which to a user is indistinguishable from "the text
          is cut off" — the very complaint it was meant to solve. Content is
          instead made to fit: long strings break (globals.css), rows wrap,
          and wide tables scroll inside their own container. */}
      <div className="container flex flex-1 gap-0">
        <Sidebar isSupervisor={supervises} />
        {/* pb-24 on mobile keeps content clear of the fixed bottom nav. */}
        <main className="min-w-0 flex-1 py-6 pb-24 md:py-8 md:pb-8 md:pl-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
