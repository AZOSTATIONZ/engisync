import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { canSuperviseWorkspace } from "@/lib/supervisor";
import { getPace, STAGE_META, type ProjectStage } from "@/lib/lifecycle";
import { ProjectTabs } from "@/components/project-tabs";
import { PaceBadge } from "@/components/pace-badge";
import { routes } from "@/lib/routes";

/**
 * The project shell.
 *
 * Every page inside a project renders through here, so the project's identity
 * (name, department, stage, whether it is behind) and its full set of tabs are
 * present on every single surface. This is the structural fix for the problem
 * that made the product hard to learn: previously a member could land on a
 * project page with no indication that tasks, documents, money or a team page
 * existed at all.
 *
 * Access is resolved once, here, rather than repeated in each child page.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, canSupervise] = await Promise.all([
    getMembership(id, userId),
    canSuperviseWorkspace(id, userId),
  ]);
  if (!membership && !canSupervise) notFound();

  const project = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      stage: true,
      stageEnteredAt: true,
      targetEndDate: true,
      createdAt: true,
      department: { select: { name: true } },
    },
  });
  if (!project) notFound();

  const stage = project.stage as ProjectStage;
  const pace = getPace(
    stage,
    project.stageEnteredAt,
    project.targetEndDate,
    project.createdAt,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={routes.projects}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate page-title">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {/* `department` is the RELATION, not a string — interpolating it
                  rendered "[object Object] · Idea" under every project title.
                  The select above only fetches `name`, so that is what shows. */}
              {project.department ? `${project.department.name} · ` : ""}
              {STAGE_META[stage].label}
              {canSupervise && !membership ? " · Reviewing as supervisor" : ""}
            </p>
          </div>
          <PaceBadge status={pace.status} />
        </div>
      </div>

      <ProjectTabs projectId={project.id} />

      {children}
    </div>
  );
}
