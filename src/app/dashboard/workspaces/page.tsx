import Link from "next/link";
import type { Metadata } from "next";
import { Crown, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listWorkspacesForUser } from "@/lib/workspace";
import { userDepartmentIds } from "@/lib/department";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateWorkspaceForm, JoinWorkspaceForm } from "./workspace-forms";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const session = await auth();
  const memberships = await listWorkspacesForUser(session!.user.id);
  const { join } = await searchParams;

  const deptIds = await userDepartmentIds(session!.user.id);
  const myDepartments = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const departmentOptions = myDepartments.map((d) => ({
    id: d.id,
    label: `${d.name} (${d.code})`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Groups</h1>
        <p className="text-muted-foreground">
          Create a project group inside your department, or join one with a code.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create a group</CardTitle>
            <CardDescription>
              Pick a department; you become the group leader with a shareable join code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm departments={departmentOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a group</CardTitle>
            <CardDescription>
              Enter the join code (and PIN, if set) your group leader shared. If
              the group requires approval, your request is sent to the leader —
              you&apos;ll get a notification when you&apos;re added. You can only
              see groups you&apos;ve been given access to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinWorkspaceForm defaultCode={join ?? ""} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Your workspaces</h2>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re not in any workspace yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <Link key={m.id} href={`/dashboard/workspaces/${m.workspace.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {m.workspace.name}
                      </CardTitle>
                      {m.role === "LEADER" ? (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Crown className="h-3.5 w-3.5" /> Leader
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Member</span>
                      )}
                    </div>
                    {m.workspace.description && (
                      <CardDescription className="line-clamp-2">
                        {m.workspace.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {m.workspace._count.members} member
                    {m.workspace._count.members === 1 ? "" : "s"}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
