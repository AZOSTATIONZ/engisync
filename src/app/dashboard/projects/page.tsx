import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { auth } from "@/auth";
import { listProjects } from "@/lib/project";
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
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
              <Card className="card-hover h-full">
                <CardContent className="space-y-2 py-4">
                  <p className="font-medium">{p.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.role === "LEADER" ? "You lead this" : "Member"}</span>
                    <span>{p.completionPct}% done</span>
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
