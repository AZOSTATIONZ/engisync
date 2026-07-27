import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { auth } from "@/auth";
import { listProjects } from "@/lib/project";
import { STAGE_META } from "@/lib/lifecycle";
import { projectPlan } from "@/lib/routes";
import { PaceBadge } from "@/components/pace-badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  const projects = await listProjects(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-muted-foreground">
          Objectives, scope, milestones, risks, and deliverables for each of
          your groups.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <FolderKanban className="h-8 w-8 text-primary" />
            You&apos;re not in any project group yet. Join or create a group to
            start planning.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={projectPlan(p.id)}>
              <Card className="card-hover h-full">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium">{p.name}</p>
                    {p.pace && <PaceBadge status={p.pace.status} showLabel={false} />}
                  </div>
                  <p className="text-xs font-medium text-primary">
                    {STAGE_META[p.stage].label}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.role === "LEADER" ? "You lead this" : "Member"}</span>
                    <span>{p.completionPct}% of tasks done</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${p.completionPct}%` }} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
