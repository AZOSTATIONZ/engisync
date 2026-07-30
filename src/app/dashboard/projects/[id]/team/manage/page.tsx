import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckSquare,
  ClipboardCheck,
  DoorOpen,
  UserPlus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getContext, can } from "@/lib/policy";
import { getWorkspaceParticipation } from "@/lib/participation";
import { getProjectFinance } from "@/lib/finance-data";
import { getPace, STAGE_META, type ProjectStage } from "@/lib/lifecycle";
import { displayName } from "@/lib/identity";
import { formatCents } from "@/lib/finance";
import { projectPlan, projectTasks } from "@/lib/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaceBadge } from "@/components/pace-badge";
import { JoinRequestRow } from "../access-ui";
import { WithdrawalQueue } from "../withdrawal-section";
import { VerificationQueue } from "@/app/dashboard/projects/[id]/money/finance-ui";

export const metadata: Metadata = { title: "Manage group" };

/**
 * THE LEADER WORKSPACE.
 *
 * Design principle: a leader's actual job in this app is UNBLOCKING PEOPLE.
 * So this page leads with everything currently waiting on the leader — join
 * requests, withdrawal requests, payments to verify, unassigned work — and
 * puts statistics below the fold. A management view that leads with charts
 * makes leaders feel informed; one that leads with queues makes them useful.
 */
export default async function ManageWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const ctx = await getContext(id, userId);
  // Approvers (members granted canApprove) get in too — this page IS the
  // delegation surface.
  if (!can(ctx, "joinRequest.decide")) notFound();

  const [workspace, participation, finance, unassigned, overdueCount] =
    await Promise.all([
      prisma.workspace.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          stage: true,
          stageEnteredAt: true,
          targetEndDate: true,
          createdAt: true,
          joinRequests: {
            where: { status: "PENDING" },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
          withdrawalRequests: {
            where: { status: { in: ["PENDING", "LEADER_APPROVED"] } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      getWorkspaceParticipation(id),
      getProjectFinance(id, userId),
      prisma.task.findMany({
        where: { workspaceId: id, assigneeId: null, status: { not: "DONE" } },
        select: { id: true, title: true, dueDate: true, priority: true },
        orderBy: [{ dueDate: "asc" }],
        take: 8,
      }),
      prisma.task.count({
        where: {
          workspaceId: id,
          status: { not: "DONE" },
          dueDate: { lt: new Date() },
        },
      }),
    ]);
  if (!workspace) notFound();

  const pace = getPace(
    workspace.stage as ProjectStage,
    workspace.stageEnteredAt,
    workspace.targetEndDate,
    workspace.createdAt,
  );

  const inactive = Object.entries(participation)
    .filter(([, p]) => p.inactive)
    .map(([, p]) => p);

  const financeQueue = finance?.queue ?? [];
  const withdrawalInfos = workspace.withdrawalRequests.map((w) => ({
    id: w.id,
    memberName: displayName(w.user),
    reason: w.reason,
    status: w.status as "PENDING" | "LEADER_APPROVED",
    isMine: w.userId === userId,
    createdAt: w.createdAt.toISOString(),
  }));

  const queueCount =
    workspace.joinRequests.length +
    withdrawalInfos.filter((w) => w.status === "PENDING").length +
    financeQueue.length +
    unassigned.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {workspace.name}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Manage group</h1>
            <p className="text-muted-foreground">
              {queueCount === 0
                ? "Nothing is waiting on you right now."
                : `${queueCount} thing${queueCount === 1 ? "" : "s"} waiting on you.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PaceBadge status={pace.status} />
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {STAGE_META[workspace.stage as ProjectStage].label}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. People waiting to get in ────────────────────────────── */}
      {workspace.joinRequests.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Join requests ({workspace.joinRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspace.joinRequests.map((r) => (
              <JoinRequestRow
                key={r.id}
                requestId={r.id}
                name={displayName(r.user)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 2. People trying to leave ──────────────────────────────── */}
      <WithdrawalQueue requests={withdrawalInfos} />

      {/* ── 3. Money waiting for verification ──────────────────────── */}
      {financeQueue.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-5 w-5 text-primary" />
              Payments to verify ({financeQueue.length})
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/budget/${id}`}>Finance</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <VerificationQueue payments={financeQueue} />
          </CardContent>
        </Card>
      )}

      {/* ── 4. Work nobody owns ────────────────────────────────────── */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-5 w-5 text-primary" />
              Unassigned tasks ({unassigned.length})
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={projectTasks(id)}>
                Assign <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {unassigned.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{t.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.dueDate
                    ? t.dueDate.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })
                    : "No date"}
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Unowned work is how deadlines get missed — everything should have
              a name on it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Below the fold: health, not queues ─────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={projectTasks(id)} className="rounded-lg border p-3 transition-colors hover:bg-accent">
          <p className="text-xs text-muted-foreground">Overdue tasks</p>
          <p className={`text-lg font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>
            {overdueCount}
          </p>
        </Link>
        <Link href={`/dashboard/projects/${id}`} className="rounded-lg border p-3 transition-colors hover:bg-accent">
          <p className="text-xs text-muted-foreground">Inactive members</p>
          <p className={`text-lg font-bold ${inactive.length > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {inactive.length}
          </p>
        </Link>
        <Link href={`/dashboard/budget/${id}`} className="rounded-lg border p-3 transition-colors hover:bg-accent">
          <p className="text-xs text-muted-foreground">Collected (verified)</p>
          <p className="text-lg font-bold">
            {finance ? formatCents(finance.totals.verifiedCents, finance.baseCurrency) : "—"}
          </p>
        </Link>
        <Link href={projectPlan(id)} className="rounded-lg border p-3 transition-colors hover:bg-accent">
          <p className="text-xs text-muted-foreground">Days in stage</p>
          <p className="text-lg font-bold">{pace.daysInStage}</p>
        </Link>
      </div>

      {pace.status === "behind" && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium">{pace.message}</p>
            <p className="text-muted-foreground">
              Consider updating the stage, the target date, or the plan on the{" "}
              <Link href={projectPlan(id)} className="font-medium text-primary hover:underline">
                project page
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Quick actions — the leader's most common jumps. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={projectTasks(id)}>Assign tasks</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/meetings">Schedule meeting</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/budget/${id}`}>Open finance</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={projectPlan(id)}>Project plan</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/projects/${id}/document`}>Review documentation</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/analytics/${id}`}>Analytics</Link>
          </Button>
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" /> Members needing a nudge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {inactive.length} member{inactive.length === 1 ? " has" : "s have"}{" "}
              no completed tasks or recent activity. Use{" "}
              <Link
                href={`/dashboard/projects/${id}`}
                className="font-medium text-primary hover:underline"
              >
                the members list
              </Link>{" "}
              to nudge or reassign their work.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <DoorOpen className="h-4 w-4 shrink-0" />
        Members leave through withdrawal requests, which appear here — nobody
        can simply disappear from the group.
      </div>
    </div>
  );
}
