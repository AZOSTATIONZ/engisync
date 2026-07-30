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
      lead: "What past cohorts built",
      body: `${publishedCount} published project${publishedCount === 1 ? "" : "s"} with reports, code and drawings. Search here before you start — repeating a previous project is the most expensive mistake in engineering coursework.`,
    },
    {
      href: routes.projectHub,
      icon: Lightbulb,
      title: "Build",
      lead: "What you could build next",
      body: `${HUB_PROJECTS.length} project briefs with parts lists, budgets and prerequisites, filtered by discipline and year. Start one and it becomes a real project with the brief pre-filled.`,
    },
    {
      href: routes.library,
      icon: Building2,
      title: "Learn",
      lead: "How to learn it",
      body: `${resourceCount} approved resource${resourceCount === 1 ? "" : "s"} from your department — tools, tutorials, datasheets and announcements curated by staff and classmates.`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge</h1>
        <p className="text-muted-foreground">
          Work that already exists, so you build on it instead of repeating it.
        </p>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-3">
        {surfaces.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="card-hover h-full">
              <CardContent className="space-y-2 py-5">
                <s.icon className="h-6 w-6 text-primary" />
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
