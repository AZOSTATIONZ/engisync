import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { listProjects } from "@/lib/project";
import { STAGE_META } from "@/lib/lifecycle";
import { Plus } from "lucide-react";
import { projectHome, routes } from "@/lib/routes";
import { PaceBadge } from "@/components/pace-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  const projects = await listProjects(session!.user.id);

  return (
    <div className="space-y-6">
      {/* The create action is PERSISTENT, not empty-state only. Previously it
          existed solely inside the "no projects yet" card, so it disappeared
          the moment a student had one — and there was no other route to it
          anywhere in the product. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Everything for each of your projects — plan, tasks, documents, money and team.
          </p>
        </div>
        <Button asChild>
          <Link href={`${routes.projects}/new`}>
            <Plus className="h-4 w-4" /> New project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project and invite your team, or join one with a code from your leader — the plan, tasks, finance and publication all live inside it."
          actionLabel="Start a project"
          actionHref={`${routes.projects}/new`}
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            /* Opens the project's OVERVIEW, not its plan. Clicking a project
               previously landed on objectives and milestones — a page with no
               route to tasks, documents, team or budget. */
            <Link key={p.id} href={projectHome(p.id)}>
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
