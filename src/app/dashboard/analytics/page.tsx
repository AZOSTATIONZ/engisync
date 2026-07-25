import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Users } from "lucide-react";
import { auth } from "@/auth";
import { listGroupSummaries } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const session = await auth();
  const groups = await listGroupSummaries(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Project health, productivity, workload, and attendance per group.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" /> No groups yet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Join or create a group to see its analytics.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/dashboard/analytics/${g.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  {g.department && (
                    <p className="text-xs text-muted-foreground">{g.department}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-semibold">{g.completionPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${g.completionPct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {g.memberCount}
                    </span>
                    <span>{g.total} tasks</span>
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
