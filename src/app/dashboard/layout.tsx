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
      <div className="container flex flex-1 gap-0">
        <Sidebar isSupervisor={supervises} />
        {/* pb-24 on mobile keeps content clear of the fixed bottom nav. */}
        <main className="flex-1 py-6 pb-24 md:py-8 md:pb-8 md:pl-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
