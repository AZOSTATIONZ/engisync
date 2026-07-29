import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Users } from "lucide-react";
import { auth } from "@/auth";
import { listSupervisedProjects } from "@/lib/supervisor";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Supervisor" };

export default async function SupervisorPage() {
  const session = await auth();
  const projects = await listSupervisedProjects(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <GraduationCap className="h-6 w-6 text-primary" /> Supervisor dashboard
        </h1>
        <p className="text-muted-foreground">
          Every project in the departments you supervise.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You&apos;re not supervising any department yet. A department admin can
            set your role to Supervisor.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/supervisor/${p.id}`}>
              <Card className="card-hover h-full">
                <CardContent className="space-y-2 py-4">
                  <p className="font-medium">{p.name}</p>
                  {p.department && (
                    <p className="text-xs text-muted-foreground">{p.department}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {p.memberCount}
                    </span>
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
