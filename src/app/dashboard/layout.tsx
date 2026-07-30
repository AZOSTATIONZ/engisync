import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email";
import { ACCENTS, isAccentKey, resolveAccent } from "@/lib/personalization";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { VerifyBanner } from "@/components/verify-banner";
import { LivingBackground } from "@/components/living-background";
import { disciplineFor } from "@/lib/media";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // ONE query for everything this shell needs.
  //
  // This layout renders on every single page, so each round trip here is a tax
  // on every navigation in the product — and the database is ~271ms away
  // (Neon, us-east-2). The verify banner and the accent were already merged for
  // this reason; the supervisor check was then added underneath as a second
  // sequential await, quietly putting the second round trip back. Folding it in
  // as a filtered relation count removes a quarter-second from every page.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      accentColor: true,
      _count: { select: { projectGrants: { where: { revokedAt: null } } } },
      // The department drives the ambient motif. Folded into this query as a
      // nested select rather than fetched separately — the whole point of the
      // single-query rule here is that the shell renders on every page, and a
      // decorative background must not cost a round trip to another continent.
      deptMemberships: {
        take: 1,
        select: { department: { select: { name: true, code: true } } },
      },
    },
  });

  const showVerify = isEmailConfigured() && !user?.emailVerified;
  const supervises = (user?._count.projectGrants ?? 0) > 0;

  // `resolveAccent` falls back to the default for null, so it cannot answer
  // "did they actually choose?" — which is the question precedence turns on.
  const explicitAccent = isAccentKey(user?.accentColor);
  const accent = ACCENTS[resolveAccent(user?.accentColor)];

  const dept = user?.deptMemberships[0]?.department;
  const discipline = disciplineFor(dept?.name, dept?.code);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Ambient depth behind everything. Fixed and -z-10 so it never repaints
          on scroll and never sits above content; aria-hidden because it
          carries no information. Defined fully in globals.css. */}
      <div className="aurora" aria-hidden>
        {/* The discipline's own motif over the static wash: traces for
            electronics, gears for mechanical, a survey grid for civil, a
            lattice for chemical. Canvas rather than SVG because it animates
            without touching the DOM — measured at 2fps of cost (58 vs 60)
            after capping it to 1x resolution and 30fps. */}
        <LivingBackground discipline={discipline} />
      </div>
      {/* Values come from a fixed palette keyed by `accentColor`, never from
          user input — see lib/personalization.ts. That is what stops this being
          a CSS injection point. Both light and dark are set because the mode
          can change client-side without a re-render.

          ACCENT vs THEME PERSONALITY — who wins, and why.
          Both can define the brand colour, so precedence has to be decided
          rather than left to whichever stylesheet happens to load last.

          An EXPLICIT choice beats a bundled default: if the student picked an
          accent, it overrides the personality's brand colour, and they keep
          amber buttons inside the Ocean world. If they never picked one, this
          block is not emitted at all and the personality supplies the colour —
          which is what makes Neon Circuit green and Blueprint cyan out of the
          box.

          The doubled `:root:root` is deliberate. Personality tokens live on
          `.dark[data-theme="x"]`, a two-part selector, so a plain `:root` would
          lose to them on specificity. Doubling the selector wins without
          reaching for `!important`, which would then have to be fought by
          everything downstream. */}
      {explicitAccent && (
        <style>{`:root:root{--primary:${accent.light};--primary-2:${accent.light2}}.dark:root:root{--primary:${accent.dark};--primary-2:${accent.dark2}}`}</style>
      )}
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
