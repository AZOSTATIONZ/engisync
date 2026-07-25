import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, CheckSquare, FolderKanban, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const wsIds = (
    await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    })
  ).map((m) => m.workspaceId);

  const [workspaceCount, memberships, openTasks] = await Promise.all([
    prisma.workspace.count({ where: { members: { some: { userId } } } }),
    prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      take: 5,
    }),
    prisma.task.count({
      where: {
        status: { not: "DONE" },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { workspaceId: { in: wsIds } },
        ],
      },
    }),
  ]);

  const stats = [
    { label: "My Workspaces", value: workspaceCount, icon: FolderKanban },
    { label: "Open Tasks", value: openTasks, icon: CheckSquare },
    { label: "Upcoming Meetings", value: 0, icon: CalendarClock },
    { label: "Teammates", value: memberships.length, icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session?.user.name?.split(" ")[0] ?? "Engineer"} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not part of any workspace yet. Create one or join with a
              code to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/workspaces/${m.workspace.id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80"
                  >
                    <div>
                      <p className="font-medium">{m.workspace.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {m.workspace.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      {m.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
