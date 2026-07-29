import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { listProjects } from "@/lib/project";
import { STAGE_META } from "@/lib/lifecycle";
import { projectPlan } from "@/lib/routes";
import { PaceBadge } from "@/components/pace-badge";
import { DisciplineHero } from "@/components/discipline-hero";
import { DISCIPLINE_MEDIA } from "@/lib/media";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

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

      <DisciplineHero
        images={DISCIPLINE_MEDIA.general.images}
        height="h-28 sm:h-36"
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a group for your project or join one with a code from your leader — the plan, tasks, finance and publication all live inside it."
          actionLabel="Create or join a group"
          actionHref="/dashboard/workspaces"
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{p.role === "LEADER" ? "You lead this" : "Member"}</span>
                    <span>{p.completionPct}% of tasks done</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="animate-grow-x h-full bg-primary" style={{ width: `${p.completionPct}%` }} />
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
