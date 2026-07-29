import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email";
import { isSupervisor } from "@/lib/supervisor";
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

  // Show the "verify your email" banner only when relevant.
  let showVerify = false;
  if (isEmailConfigured()) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });
    showVerify = !user?.emailVerified;
  }

  const supervises = await isSupervisor(session.user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isSupervisor={supervises} />
      {showVerify && <VerifyBanner />}
      {/* `overflow-x-clip` is a structural guard: if any child ever exceeds the
          viewport width (a dropdown, a long unbroken string, a wide table), it
          gets clipped here instead of widening the whole document and cutting
          content off across every page. `min-w-0` lets the main column actually
          shrink — without it, flex children refuse to go below their content
          width, which is what makes long titles push the layout wide. */}
      <div className="container flex flex-1 gap-0 overflow-x-clip">
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
