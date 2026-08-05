import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckSquare,
  FileText,
  MessageSquare,
  Users,
  Wallet,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";
import { canSuperviseWorkspace } from "@/lib/supervisor";
import { getActivity, timeAgo } from "@/lib/activity";
import { STAGE_META, type ProjectStage } from "@/lib/lifecycle";
import { Markdown } from "@/components/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  projectBudget,
  projectDocs,
  projectPlan,
  projectTasks,
  projectTeam,
} from "@/lib/routes";

export const metadata: Metadata = { title: "Project overview" };

/**
 * Project overview — the project's front page.
 *
 * WHY THIS PAGE EXISTS
 * Opening a project previously landed on either its plan (objectives and
 * milestones) or its member list, depending on which of two route trees you
 * happened to arrive through. Neither answered the question a student actually
 * arrives with: what is going on here, and what should I do next?
 *
 * This page answers that and nothing else. It deliberately does not duplicate
 * the tabs' content — each block is a summary that hands off to the tab that
 * owns it.
 */
export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, canSupervise] = await Promise.all([
    getMembership(id, userId),
    canSuperviseWorkspace(id, userId),
  ]);
  if (!membership && !canSupervise) notFound();

  const now = new Date();
  const [project, tasks, activity] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        stage: true,
        _count: { select: { members: true, files: true } },
        milestones: {
          where: { done: false },
          orderBy: { dueDate: "asc" },
          take: 3,
          select: { id: true, title: true, dueDate: true },
        },
        risks: {
          where: { severity: "HIGH" },
          take: 3,
          select: { id: true, title: true },
        },
        feedback: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { id: true, authorName: true, body: true, createdAt: true },
        },
      },
    }),
    prisma.task.findMany({
      where: { workspaceId: id },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assigneeId: true,
      },
    }),
    getActivity([id], 8),
  ]);
  if (!project) notFound();

  const open = tasks.filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < now);
  const mine = open.filter((t) => t.assigneeId === userId);
  const donePct = tasks.length
    ? Math.round(((tasks.length - open.length) / tasks.length) * 100)
    : 0;

  const stage = project.stage as ProjectStage;

  return (
    <div className="space-y-6">
      {project.description && (
        <div className="text-sm text-muted-foreground">
          <Markdown content={project.description} />
        </div>
      )}

      {/* What this stage expects — advisory, never a gate. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {STAGE_META[stage].label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {STAGE_META[stage].hint}
          </p>
          <Link
            href={projectPlan(id)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Open the plan →
          </Link>
        </CardContent>
      </Card>

      {/* Every number links to where you act on it. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatLink
          href={projectTasks(id)}
          icon={<CheckSquare className="h-4 w-4" />}
          label="Open tasks"
          value={String(open.length)}
          note={mine.length > 0 ? `${mine.length} assigned to you` : "None assigned to you"}
        />
        <StatLink
          href={projectTasks(id)}
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Overdue"
          value={String(overdue.length)}
          note={overdue.length > 0 ? "Needs attention" : "Nothing overdue"}
          alert={overdue.length > 0}
        />
        <StatLink
          href={projectDocs(id)}
          icon={<FileText className="h-4 w-4" />}
          label="Progress"
          value={tasks.length === 0 ? "—" : `${donePct}%`}
          /* The note carries the DENOMINATOR, not a different quantity. It
             previously read "N files attached" beneath a number labelled
             "Progress", so the subtitle described something other than the
             figure above it — and a bare "100%" from a single task reads as a
             finished project. The sample size is what makes the percentage
             interpretable. */
          note={
            tasks.length === 0
              ? "No tasks yet"
              : `${tasks.length - open.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"} done`
          }
        />
        <StatLink
          href={projectTeam(id)}
          icon={<Users className="h-4 w-4" />}
          label="Team"
          value={String(project._count.members)}
          note="Members and invites"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Next milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Coming up</CardTitle>
          </CardHeader>
          <CardContent>
            {project.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open milestones.{" "}
                <Link href={projectPlan(id)} className="text-primary hover:underline">
                  Add some in the plan
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.milestones.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{m.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m.dueDate
                        ? m.dueDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : "No date"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet. Activity appears as the team completes tasks,
                uploads files and meets.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">
                        {a.action} {a.subject}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High risks — surfaced here because a risk nobody sees is not managed. */}
      {project.risks.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              High risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {project.risks.map((r) => (
                <li key={r.id}>{r.title}</li>
              ))}
            </ul>
            <Link
              href={projectPlan(id)}
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Review mitigations →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Supervisor feedback — previously buried; it is the most consequential
          text a team receives, so it belongs on the front page. */}
      {project.feedback.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Supervisor feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.feedback.map((f) => (
              <div key={f.id} className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  {f.authorName} · {timeAgo(f.createdAt)}
                </p>
                <Markdown content={f.body} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href={projectBudget(id)}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Wallet className="h-4 w-4" /> Money
        </Link>
        <Link
          href={projectDocs(id)}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-4 w-4" /> Document
        </Link>
      </div>
    </div>
  );
}

function StatLink({
  href,
  icon,
  label,
  value,
  note,
  alert,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="card-hover h-full">
        <CardContent className="space-y-1 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {icon}
            {label}
          </p>
          <p
            className={
              alert ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"
            }
          >
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
