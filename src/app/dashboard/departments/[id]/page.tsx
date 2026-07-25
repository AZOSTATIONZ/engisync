import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, Lock, Megaphone, Users } from "lucide-react";
import { auth } from "@/auth";
import { getDepartment } from "@/lib/department";
import {
  listCollaborationRequests,
  listCollaboratingGroups,
} from "@/lib/collaboration";
import { CollaborationRequestRow } from "../../collaboration-ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  JoinLeaveButton,
  AnnouncementForm,
  DeleteAnnouncementButton,
  MemberAdminControls,
} from "../departments-ui";

export const metadata: Metadata = { title: "Department" };

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const dept = await getDepartment(id, userId);
  if (!dept) notFound();

  const [collabRequests, collaboratingGroups] = await Promise.all([
    dept.isAdmin ? listCollaborationRequests(id) : Promise.resolve([]),
    listCollaboratingGroups(id),
  ]);

  function fmt(iso: string) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/departments"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All departments
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
              {dept.code}
            </span>
            <div>
              <h1 className="text-2xl font-bold">{dept.name}</h1>
              {dept.description && (
                <p className="text-muted-foreground">{dept.description}</p>
              )}
            </div>
          </div>
          <JoinLeaveButton
            departmentId={dept.id}
            isMember={dept.isMember}
            isAdmin={dept.isAdmin}
          />
        </div>
      </div>

      {/* Announcements */}
      {dept.isMember && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5 text-primary" /> Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dept.isAdmin && <AnnouncementForm departmentId={dept.id} />}
            {dept.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No announcements yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {dept.announcements.map((a) => (
                  <li key={a.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {a.body}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {a.authorName} · {fmt(a.createdAt)}
                        </p>
                      </div>
                      {dept.isAdmin && <DeleteAnnouncementButton id={a.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cross-department collaboration */}
      {dept.isMember && (dept.isAdmin || collaboratingGroups.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-department collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dept.isAdmin && (
              <div>
                <p className="mb-1 text-sm font-medium">
                  Requests ({collabRequests.length})
                </p>
                {collabRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending collaboration requests.
                  </p>
                ) : (
                  <div className="divide-y">
                    {collabRequests.map((r) => (
                      <CollaborationRequestRow
                        key={r.id}
                        collabId={r.id}
                        workspaceName={r.workspaceName}
                        fromDepartment={r.fromDepartment}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {collaboratingGroups.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Collaborating groups</p>
                <ul className="divide-y text-sm">
                  {collaboratingGroups.map((g) => (
                    <li key={g.id} className="flex items-center justify-between py-2">
                      <span>
                        {g.name}
                        {g.homeDepartment && (
                          <span className="text-xs text-muted-foreground">
                            {" "}· from {g.homeDepartment}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {g.memberCount} members
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Groups (isolated) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {dept.isAdmin ? "All groups" : "Your groups"} in this department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!dept.isMember ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Join this department to see and create groups.
              </div>
            ) : dept.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dept.isAdmin
                  ? "No groups have been created in this department yet."
                  : "You're not in any group here yet. Create one from the Groups page, or join with an invite."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {dept.groups.map((g) => (
                  <Link key={g.id} href={`/dashboard/workspaces/${g.id}`}>
                    <Card className="h-full transition-colors hover:border-primary">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{g.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {g.memberCount} members
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members (members-only) */}
        {dept.isMember && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members ({dept.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {dept.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {m.id === userId && " (you)"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </p>
                  </div>
                  {dept.isAdmin && m.id !== userId ? (
                    <MemberAdminControls
                      departmentId={dept.id}
                      userId={m.id}
                      role={m.role}
                    />
                  ) : (
                    m.role === "ADMIN" && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Crown className="h-3.5 w-3.5" /> Admin
                      </span>
                    )
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
