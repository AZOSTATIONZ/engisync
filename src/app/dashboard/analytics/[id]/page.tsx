import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Activity } from "lucide-react";
import { auth } from "@/auth";
import { getWorkspaceAnalytics } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  StatusPie,
  PriorityPie,
  WorkloadBar,
  HoursBar,
  BurndownArea,
  ActivityLine,
} from "./charts";
import { ExportCsvButton, InsightsPanel } from "./tools";

export const metadata: Metadata = { title: "Analytics" };

const RISK_STYLES: Record<string, string> = {
  Low: "text-green-600",
  Medium: "text-amber-600",
  High: "text-red-600",
};

export default async function GroupAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const a = await getWorkspaceAnalytics(id, session!.user.id);
  if (!a) notFound();

  const stat = [
    { label: "Completion", value: `${a.totals.completionPct}%` },
    { label: "Open / total", value: `${a.totals.pending}/${a.totals.total}` },
    { label: "Overdue", value: a.totals.overdue },
    { label: "Hours logged", value: a.totals.hoursLogged },
    { label: "Attendance", value: `${a.totals.attendanceRate}%` },
    { label: "Files shared", value: a.totals.filesShared },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/analytics"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All analytics
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{a.workspace.name}</h1>
            {a.workspace.department && (
              <p className="text-muted-foreground">{a.workspace.department}</p>
            )}
          </div>
          <ExportCsvButton workspaceName={a.workspace.name} rows={a.memberStats} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stat.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health & risk */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Project health</p>
              <p className="text-2xl font-bold">
                {a.health}/100{" "}
                <span className={`text-sm ${RISK_STYLES[a.risk]}`}>
                  · {a.risk} risk
                </span>
              </p>
            </div>
          </div>
          <div className="h-3 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${a.health >= 70 ? "bg-green-500" : a.health >= 40 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${a.health}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Task status</CardTitle></CardHeader>
          <CardContent><StatusPie data={a.statusCounts} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Priority mix</CardTitle></CardHeader>
          <CardContent><PriorityPie data={a.priorityCounts} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Burndown (14 days)</CardTitle></CardHeader>
          <CardContent><BurndownArea data={a.burndown} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Activity (created vs completed)</CardTitle></CardHeader>
          <CardContent><ActivityLine data={a.activity} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Workload by member</CardTitle></CardHeader>
          <CardContent><WorkloadBar data={a.memberStats} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Hours logged by member</CardTitle></CardHeader>
          <CardContent><HoursBar data={a.memberStats} /></CardContent>
        </Card>
      </div>

      {/* Attention + upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Most loaded: </span>
              {a.overloaded.length
                ? `${a.overloaded[0].name} (${a.overloaded[0].openTasks} open tasks)`
                : "Balanced"}
            </p>
            <p>
              <span className="text-muted-foreground">Inactive members: </span>
              {a.inactive.length ? a.inactive.join(", ") : "None"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader>
          <CardContent>
            {a.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due this week.</p>
            ) : (
              <ul className="divide-y text-sm">
                {a.upcoming.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="truncate">{u.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.due).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI insights */}
      <Card>
        <CardHeader><CardTitle className="text-base">AI insights & recommendations</CardTitle></CardHeader>
        <CardContent>
          <InsightsPanel workspaceId={a.workspace.id} />
        </CardContent>
      </Card>
    </div>
  );
}
