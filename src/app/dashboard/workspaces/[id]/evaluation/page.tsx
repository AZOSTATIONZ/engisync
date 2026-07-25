import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, isWorkspaceLeader } from "@/lib/workspace";
import { gatherProjectFacts, type EvaluationReport } from "@/lib/ai-evaluation";
import { isAIConfigured } from "@/lib/ai";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GenerateEvaluationButton,
  MentorCheck,
  SupervisorAsk,
} from "./evaluation-ui";

export const metadata: Metadata = { title: "AI Evaluation" };

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-green-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{title}</p>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  if (!(await getMembership(id, userId))) notFound();

  const [facts, stored, isLeader] = await Promise.all([
    gatherProjectFacts(id, userId),
    prisma.aIEvaluation.findUnique({ where: { workspaceId: id } }),
    isWorkspaceLeader(id, userId),
  ]);
  if (!facts) notFound();

  const report = stored ? (stored.data as unknown as EvaluationReport) : null;
  const aiReady = isAIConfigured();

  const scoreEntries: [string, number][] = report
    ? [
        ["Overall health", report.scores.health],
        ["Productivity", report.scores.productivity],
        ["Documentation", report.scores.documentation],
        ["Research", report.scores.research],
        ["Design", report.scores.design],
        ["Testing", report.scores.testing],
        ["Collaboration", report.scores.collaboration],
        ["Participation", report.scores.participation],
        ["Attendance", report.scores.attendance],
        ["Budget health", report.scores.budgetHealth],
        ["Timeline", report.scores.timeline],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/workspaces/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to group
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-primary" /> AI Project Evaluation
            </h1>
            <p className="text-muted-foreground">{facts.name}</p>
          </div>
          {isLeader && aiReady && (
            <GenerateEvaluationButton
              workspaceId={id}
              label={report ? "Refresh evaluation" : "Run AI evaluation"}
            />
          )}
        </div>
      </div>

      {/* Mentor (works without AI) + Supervisor (needs AI) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project mentor</CardTitle>
          </CardHeader>
          <CardContent>
            <MentorCheck workspaceId={id} />
          </CardContent>
        </Card>
        {aiReady && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ask the AI supervisor</CardTitle>
            </CardHeader>
            <CardContent>
              <SupervisorAsk workspaceId={id} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Always-visible computed facts (work even without AI). */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Task completion", value: `${facts.tasks.completionPct}%` },
          { label: "Open / total", value: `${facts.tasks.pending}/${facts.tasks.total}` },
          { label: "Overdue", value: facts.tasks.overdue },
          { label: "Attendance", value: `${facts.attendanceRate}%` },
          { label: "Files", value: facts.filesShared },
          { label: "Members", value: facts.tasks.memberCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!report ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 text-primary" />
            {aiReady ? (
              isLeader ? (
                <p>Run the AI evaluation to get scores, risks, and predictions for this project.</p>
              ) : (
                <p>No evaluation yet. Ask your group leader to run it.</p>
              )
            ) : (
              <p>
                AI evaluation is available once an AI key is enabled. The project
                facts above are always shown.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scores + risk */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Scores</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {scoreEntries.map(([label, value]) => (
                  <ScoreBar key={label} label={label} value={value} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" /> Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On-time</span>
                  <span className="font-medium">{report.predictions.onTimeProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Over budget</span>
                  <span className="font-medium">{report.predictions.overBudgetProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success likelihood</span>
                  <span className="font-medium">{report.predictions.successLikelihood}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. completion</span>
                  <span className="font-medium">{report.predictions.estimatedCompletion}</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-2 py-1">
                  <span className="text-muted-foreground">Risk level</span>
                  <span
                    className={
                      report.riskLevel === "Low"
                        ? "font-semibold text-green-600"
                        : report.riskLevel === "Medium"
                          ? "font-semibold text-amber-600"
                          : "font-semibold text-red-600"
                    }
                  >
                    {report.riskLevel}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {report.summary && (
            <Card>
              <CardContent className="py-4 text-sm">{report.summary}</CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-green-500" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <List title="" items={report.strengths} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Needs work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <List title="Weaknesses" items={report.weaknesses} />
                <List title="Missing documentation" items={report.missingDocumentation} />
                <List title="Missed deadlines" items={report.missedDeadlines} />
                {report.unevenParticipation && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Participation</p>
                    <p className="text-sm text-muted-foreground">{report.unevenParticipation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Risks</CardTitle></CardHeader>
              <CardContent><List title="" items={report.risks} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Suggested improvements</CardTitle></CardHeader>
              <CardContent><List title="" items={report.improvements} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recommended next actions</CardTitle></CardHeader>
              <CardContent><List title="" items={report.nextActions} /></CardContent>
            </Card>
          </div>

          {stored && (
            <p className="text-xs text-muted-foreground">
              Last evaluated {new Date(stored.updatedAt).toLocaleString("en-GB")}
              {stored.model ? ` · ${stored.model}` : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
