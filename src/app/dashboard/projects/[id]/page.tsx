import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, Flag, AlertTriangle, Package } from "lucide-react";
import { auth } from "@/auth";
import { getProject } from "@/lib/project";
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
    </div>
  );
}
