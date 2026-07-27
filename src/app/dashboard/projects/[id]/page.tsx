import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, Flag, AlertTriangle, Package, MessageSquare, Route, Archive } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProject } from "@/lib/project";
import { PublishForm } from "./publish-form";
import { STAGE_META } from "@/lib/lifecycle";
import { ProjectStepper } from "@/components/project-stepper";
import { PaceBadge } from "@/components/pace-badge";
import { TargetDateForm } from "../projects-ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ProjectInfoForm,
  MilestoneManager,
  RiskManager,
  DeliverableManager,
} from "../projects-ui";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const project = await getProject(id, session!.user.id);
  if (!project) notFound();

  // Publication state + files available for archiving.
  const [publication, workspaceFiles] = await Promise.all([
    prisma.publishedProject.findFirst({
      where: { workspaceId: id, status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      select: { status: true, slug: true },
    }),
    prisma.fileResource.findMany({
      where: { workspaceId: id },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const lastRejection = publication
    ? null
    : await prisma.publishedProject.findFirst({
        where: { workspaceId: id, status: "REJECTED" },
        orderBy: { createdAt: "desc" },
        select: { rejectionReason: true },
      });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.department && (
              <p className="text-muted-foreground">{project.department}</p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/workspaces/${project.id}`}>Open group</Link>
          </Button>
        </div>
      </div>

      {/* Lifecycle — the first thing anyone should see: where are we, and
          are we behind? */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-5 w-5 text-primary" /> Project lifecycle
          </CardTitle>
          <PaceBadge status={project.pace.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <ProjectStepper
            workspaceId={project.id}
            stage={project.stage}
            canEdit={project.isLeader}
          />

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm">{project.pace.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {project.pace.daysInStage === 0
                ? `Moved to ${STAGE_META[project.stage].label} today.`
                : `${project.pace.daysInStage} day${
                    project.pace.daysInStage === 1 ? "" : "s"
                  } in ${STAGE_META[project.stage].label}.`}
              {project.pace.expectedProgress !== null &&
                ` Schedule expects ~${project.pace.expectedProgress}%, project is at ${project.pace.actualProgress}%.`}
            </p>
          </div>

          {project.isLeader && (
            <TargetDateForm
              workspaceId={project.id}
              targetEndDate={project.targetEndDate}
            />
          )}
        </CardContent>
      </Card>

      {/* Objectives & scope */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" /> Objectives &amp; scope
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.isLeader ? (
            <ProjectInfoForm
              workspaceId={project.id}
              objectives={project.objectives}
              scope={project.scope}
            />
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Objectives</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {project.objectives || "Not set yet."}
                </p>
              </div>
              <div>
                <p className="font-medium">Scope</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {project.scope || "Not set yet."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-5 w-5 text-primary" /> Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneManager
              workspaceId={project.id}
              isLeader={project.isLeader}
              items={project.milestones}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" /> Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeliverableManager
              workspaceId={project.id}
              isLeader={project.isLeader}
              items={project.deliverables}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Risk register
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RiskManager
            workspaceId={project.id}
            isLeader={project.isLeader}
            items={project.risks}
          />
        </CardContent>
      </Card>

      {project.feedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-primary" /> Supervisor feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.feedback.map((f) => (
                <li key={f.id} className="rounded-md border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{f.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.authorName} ·{" "}
                    {new Date(f.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Publication — the final lifecycle step ─────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="h-5 w-5 text-primary" /> Repository publication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {publication?.status === "PUBLISHED" ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                Published as {publication.slug}
              </p>
              <Link
                href={`/dashboard/repository/${publication.slug}`}
                className="text-xs text-primary hover:underline"
              >
                View in the repository →
              </Link>
            </div>
          ) : publication?.status === "PENDING_APPROVAL" ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              Submitted — awaiting your supervisor&apos;s approval.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                When the project is complete, publish it to the department
                repository so future students can build on your work instead of
                starting from zero.
              </p>
              {lastRejection?.rejectionReason && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <span className="font-medium text-destructive">
                    Previous submission was sent back:
                  </span>{" "}
                  {lastRejection.rejectionReason}
                </p>
              )}
              {project.isLeader ? (
                <PublishForm
                  workspaceId={project.id}
                  projectName={project.name}
                  files={workspaceFiles}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your group leader submits the publication.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
