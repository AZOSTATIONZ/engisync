import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Crown,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  GraduationCap,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { WorkspaceRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceForUser } from "@/lib/workspace";
import { getInvolvedDepartments } from "@/lib/collaboration";
import { buildJoinUrl, generateQrDataUrl, getBaseUrl } from "@/lib/qr";
import { isEmailConfigured } from "@/lib/email";
import {
  RequestCollaborationForm,
  RemoveCollaborationButton,
} from "../../collaboration-ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CopyButton,
  RegenerateCodeButton,
  LeaveWorkspaceButton,
  DeleteWorkspaceButton,
} from "./workspace-controls";
import { MemberControls } from "./member-controls";
import {
  AccessSettingsForm,
  JoinRequestRow,
  InviteManager,
} from "./access-ui";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const workspace = await getWorkspaceForUser(id, userId);
  if (!workspace) notFound();

  const isLeader = workspace.members.some(
    (m) => m.userId === userId && m.role === WorkspaceRole.LEADER,
  );

  const joinUrl = await buildJoinUrl(workspace.joinCode);
  const qr = await generateQrDataUrl(joinUrl);
  const origin = await getBaseUrl();

  const involved = await getInvolvedDepartments(workspace.id);
  const involvedIds = new Set(
    [involved.primary?.id, ...involved.collaborations.map((c) => c.department.id)].filter(
      Boolean,
    ) as string[],
  );
  const allDepartments = isLeader
    ? await prisma.department.findMany({ select: { id: true, name: true, code: true } })
    : [];
  const availableDepartments = allDepartments
    .filter((d) => !involvedIds.has(d.id))
    .map((d) => ({ id: d.id, label: `${d.name} (${d.code})` }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/workspaces"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All workspaces
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            {workspace.description && (
              <p className="max-w-2xl text-muted-foreground">
                {workspace.description}
              </p>
            )}
          </div>
          {isLeader ? (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <Crown className="h-4 w-4" /> Group Leader
            </span>
          ) : (
            <LeaveWorkspaceButton workspaceId={workspace.id} />
          )}
        </div>
      </div>

      {/* Quick links to group collaboration spaces */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/workspaces/${workspace.id}/discussions`}>
            <MessageSquare className="h-4 w-4" /> Discussions
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/workspaces/${workspace.id}/quizzes`}>
            <GraduationCap className="h-4 w-4" /> Quizzes
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/tasks`}>
            <CheckSquare className="h-4 w-4" /> Tasks
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/workspaces/${workspace.id}/evaluation`}>
            <Sparkles className="h-4 w-4" /> AI Evaluation
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invite / access card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invite members</CardTitle>
            <CardDescription>
              Share the join code, link, or QR code with your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="rounded-lg border bg-white p-3">
              <Image
                src={qr}
                alt="Workspace join QR code"
                width={180}
                height={180}
                unoptimized
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Join code
                </p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-lg tracking-widest">
                    {workspace.joinCode}
                  </code>
                  <CopyButton value={workspace.joinCode} />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Join link
                </p>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-muted-foreground">
                    {joinUrl}
                  </span>
                  <CopyButton value={joinUrl} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {workspace.pinHash ? (
                    <>
                      <KeyRound className="h-4 w-4" /> PIN required
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> No PIN
                    </>
                  )}
                </span>
                {isLeader && <RegenerateCodeButton workspaceId={workspace.id} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members card */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({workspace.members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {workspace.members.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {m.user.name ?? m.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.title ? `${m.title} · ` : ""}
                        {m.user.email}
                      </p>
                    </div>
                    <span
                      className={
                        m.role === WorkspaceRole.LEADER
                          ? "flex shrink-0 items-center gap-1 text-xs text-primary"
                          : "shrink-0 text-xs text-muted-foreground"
                      }
                    >
                      {m.role === WorkspaceRole.LEADER && (
                        <Crown className="h-3.5 w-3.5" />
                      )}
                      {m.userId === workspace.leaderId
                        ? "Owner"
                        : m.role === WorkspaceRole.LEADER
                          ? "Co-leader"
                          : "Member"}
                    </span>
                  </div>
                  {isLeader && (
                    <MemberControls
                      workspaceId={workspace.id}
                      memberUserId={m.userId}
                      memberName={m.user.name ?? m.user.email}
                      role={m.role}
                      title={m.title}
                      isOwner={m.userId === workspace.leaderId}
                    />
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Cross-department collaboration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departments involved</CardTitle>
          <CardDescription>
            This project&apos;s home department and any approved collaborations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {involved.primary && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                {involved.primary.name} · home
              </span>
            )}
            {involved.collaborations.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
              >
                {c.department.name}
                <span
                  className={
                    c.status === "APPROVED"
                      ? "text-xs text-green-600"
                      : c.status === "PENDING"
                        ? "text-xs text-amber-600"
                        : "text-xs text-destructive"
                  }
                >
                  · {c.status.toLowerCase()}
                </span>
                {isLeader && <RemoveCollaborationButton collabId={c.id} />}
              </span>
            ))}
          </div>
          {isLeader && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Invite another department to collaborate (their admin must approve):
              </p>
              <RequestCollaborationForm
                workspaceId={workspace.id}
                departments={availableDepartments}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {isLeader && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Access settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access settings</CardTitle>
              <CardDescription>
                Cap the group size and require approval for new members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccessSettingsForm
                workspaceId={workspace.id}
                maxMembers={workspace.maxMembers}
                requireApproval={workspace.requireApproval}
              />
            </CardContent>
          </Card>

          {/* Pending join requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Join requests ({workspace.joinRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.joinRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending requests.
                </p>
              ) : (
                <div className="divide-y">
                  {workspace.joinRequests.map((r) => (
                    <JoinRequestRow
                      key={r.id}
                      requestId={r.id}
                      name={r.user.name ?? r.user.email}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invite links */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Invite links</CardTitle>
              <CardDescription>
                One-time or expiring links that grant access without the join code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteManager
                workspaceId={workspace.id}
                origin={origin}
                emailConfigured={isEmailConfigured()}
                invites={workspace.invites.map((i) => ({
                  id: i.id,
                  token: i.token,
                  expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
                  maxUses: i.maxUses,
                  uses: i.uses,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {isLeader && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Deleting the workspace removes it for all members permanently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteWorkspaceButton workspaceId={workspace.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
