import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Printer } from "lucide-react";
import { auth } from "@/auth";
import {
  generateProjectReport,
  RANGE_LABELS,
  type ReportRange,
} from "@/lib/lecturer-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkloadChart, RankingChart } from "./report-charts";

export const metadata: Metadata = { title: "Project report" };

const RANGES: ReportRange[] = ["daily", "weekly", "monthly", "semester", "final"];

function ScoreCard({ label, value, suffix = "" }: { label: string; value: number | string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">
          {value}
          {suffix}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function ProjectReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  const range = (RANGES.includes(rangeParam as ReportRange) ? rangeParam : "final") as ReportRange;

  const session = await auth();
  const report = await generateProjectReport(id, session!.user.id, range);
  if (!report) notFound();

  const o = report.overall;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/supervisor/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>

      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-soft sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm/relaxed opacity-90">
              <BarChart3 className="h-4 w-4" /> Analytics Report · {report.rangeLabel}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{report.workspaceName}</h1>
            {report.department && <p className="opacity-90">{report.department}</p>}
          </div>
          <Button asChild variant="secondary" size="sm">
            <a href={`/dashboard/supervisor/${id}/report/print?range=${range}`} target="_blank">
              <Printer className="h-4 w-4" /> Printable PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/dashboard/supervisor/${id}/report?range=${r}`}
            className={
              r === range
                ? "rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                : "rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-accent"
            }
          >
            {RANGE_LABELS[r]}
          </Link>
        ))}
      </div>

      {/* Overall performance */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Overall project performance</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <ScoreCard label="Overall score" value={o.overallScore} suffix="/100" />
          <ScoreCard label="Progress" value={o.progressPct} suffix="%" />
          <ScoreCard label="Completion" value={o.completionPct} suffix="%" />
          <ScoreCard label="Documentation" value={o.documentationScore} suffix="%" />
          <ScoreCard label="Eng. quality" value={o.engineeringQuality} suffix="/100" />
          <ScoreCard label="Innovation" value={o.innovationScore} suffix="/100" />
          <ScoreCard label="Health" value={o.projectHealth} />
          <ScoreCard label="Risk level" value={o.riskLevel} />
          <ScoreCard label="Budget" value={o.budgetHealth} />
        </div>
      </div>

      {/* Team performance */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Team performance</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <ScoreCard label="Members" value={report.team.memberCount} />
          <ScoreCard label="Participation" value={report.team.participationPct} suffix="%" />
          <ScoreCard label="Attendance" value={report.team.attendancePct} suffix="%" />
          <ScoreCard label="Productivity" value={report.team.productivityPct} suffix="%" />
          <ScoreCard label="Tasks done" value={report.team.tasksCompleted} />
          <ScoreCard label="Missed deadlines" value={report.team.missedDeadlines} />
          <ScoreCard label="Late tasks" value={report.team.lateTasks} />
          <ScoreCard label="Time logged" value={report.team.timeSpentHours} suffix="h" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Workload (tasks assigned)</CardTitle></CardHeader>
            <CardContent><WorkloadChart data={report.team.workload} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Contribution ranking</CardTitle></CardHeader>
            <CardContent><RankingChart data={report.team.ranking} /></CardContent>
          </Card>
        </div>
      </div>

      {/* Individual performance */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Individual performance</h2>
        {/* Mobile: one card per student — wide tables are unusable on phones. */}
        <div className="space-y-3 md:hidden">
          {report.individuals.map((s) => (
            <Card key={s.userId}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{s.name}</p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {s.contributionPct}%
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ["Done", `${s.tasksCompleted}/${s.tasksAssigned}`],
                    ["Attend.", `${s.attendancePct}%`],
                    ["Product.", s.productivityScore],
                    ["Files", s.filesUploaded],
                    ["Comments", s.commentsMade],
                    ["Avg days", s.avgCompletionDays ?? "—"],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-md bg-muted/40 py-1.5">
                      <dt className="text-[0.65rem] uppercase text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: full comparison table. */}
        <Card className="hidden md:block">
          <CardContent className="overflow-x-auto py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Student</th>
                  <th className="px-2">Assigned</th>
                  <th className="px-2">Done</th>
                  <th className="px-2">Attend.</th>
                  <th className="px-2">Product.</th>
                  <th className="px-2">Files</th>
                  <th className="px-2">Comments</th>
                  <th className="px-2">Meetings</th>
                  <th className="px-2">Avg days</th>
                  <th className="px-2">Contrib.</th>
                </tr>
              </thead>
              <tbody>
                {report.individuals.map((s) => (
                  <tr key={s.userId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="px-2">{s.tasksAssigned}</td>
                    <td className="px-2">{s.tasksCompleted}</td>
                    <td className="px-2">{s.attendancePct}%</td>
                    <td className="px-2">{s.productivityScore}</td>
                    <td className="px-2">{s.filesUploaded}</td>
                    <td className="px-2">{s.commentsMade}</td>
                    <td className="px-2">{s.meetingsAttended}</td>
                    <td className="px-2">{s.avgCompletionDays ?? "—"}</td>
                    <td className="px-2 font-semibold">{s.contributionPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
