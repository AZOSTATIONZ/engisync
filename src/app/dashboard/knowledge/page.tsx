import Link from "next/link";
import type { Metadata } from "next";
import { Archive, Building2, Lightbulb } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userDepartmentIds } from "@/lib/department";
import { HUB_PROJECTS } from "@/lib/project-hub-catalog";
import { routes } from "@/lib/routes";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Knowledge" };

/**
 * Knowledge — one destination for everything that is not your own project.
 *
 * Three surfaces used to sit as separate top-level nav items (Repository,
 * Project Hub, Library) even though a student reaches for them at the same
 * moment and for the same reason: "someone has already thought about this, show
 * me". Grouping them makes that moment a single decision instead of three.
 *
 * They keep their own routes for now — this page is the grouping, and merging
 * the route trees is a later migration that this page makes safe to do.
 */
export default async function KnowledgePage() {
  const session = await auth();
  const userId = session!.user.id;

  const deptIds = await userDepartmentIds(userId);
  const [publishedCount, resourceCount] = await Promise.all([
    prisma.publishedProject.count({ where: { status: "PUBLISHED" } }),
    deptIds.length
      ? prisma.departmentResource.count({
          where: { departmentId: { in: deptIds }, status: "APPROVED" },
        })
      : Promise.resolve(0),
  ]);

  const surfaces = [
    {
      href: routes.repository,
      icon: Archive,
      title: "Archive",
      chip: "chip-brand",
      lead: "What past cohorts built",
      body: `${publishedCount} published project${publishedCount === 1 ? "" : "s"} with reports, code and drawings. Search here before you start — repeating a previous project is the most expensive mistake in engineering coursework.`,
    },
    {
      href: routes.projectHub,
      icon: Lightbulb,
      title: "Build",
      chip: "chip-warning",
      lead: "What you could build next",
      body: `${HUB_PROJECTS.length} project briefs with parts lists, budgets and prerequisites, filtered by discipline and year. Start one and it becomes a real project with the brief pre-filled.`,
    },
    {
      href: routes.library,
      icon: Building2,
      title: "Learn",
      chip: "chip-ai",
      lead: "How to learn it",
      body: `${resourceCount} approved resource${resourceCount === 1 ? "" : "s"} from your department — tools, tutorials, datasheets and announcements curated by staff and classmates.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Knowledge</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Work that already exists, so you build on it instead of repeating it.
        </p>
      </div>

      {/* Three columns only at `lg`, not `md`.
          The sidebar takes ~250px, so a 768px window left these cards 146px
          wide and every card became a column of two-word lines. A breakpoint
          has to account for the chrome around the grid, not just the viewport. */}
      <div className="stagger grid gap-4 lg:grid-cols-3">
        {surfaces.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="glow-hover sheen surface-premium relative h-full overflow-hidden border-0">
              <CardContent className="space-y-2 py-5">
                <span className={`chip ${s.chip} mb-1`}>
                  <s.icon className="icon-nudge h-[1.15rem] w-[1.15rem]" />
                </span>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm font-medium text-primary">{s.lead}</p>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
