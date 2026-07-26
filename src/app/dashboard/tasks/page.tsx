import Link from "next/link";
import { displayName } from "@/lib/identity";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listTasksForUser, userWorkspaceIds } from "@/lib/task";
import { cn } from "@/lib/utils";
import { NewTaskForm, TaskItem, type TaskDTO, type Option } from "./tasks-ui";

export const metadata: Metadata = { title: "Tasks" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "personal", label: "Personal" },
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "BLOCKED", label: "Blocked" },
  { key: "DONE", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { filter = "" } = await searchParams;

  const statusFilter = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"].includes(filter)
    ? filter
    : undefined;
  const scope = filter === "personal" ? ("personal" as const) : undefined;

  const [tasks, wsIds] = await Promise.all([
    listTasksForUser(userId, { status: statusFilter, scope }),
    userWorkspaceIds(userId),
  ]);

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: { id: true, name: true },
  });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: { in: wsIds } },
    select: { user: { select: { id: true, name: true, email: true } } },
    distinct: ["userId"],
  });

  const workspaceOptions: Option[] = workspaces.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  const assigneeMap = new Map<string, string>();
  assigneeMap.set(userId, `${session!.user.name ?? "Me"} (me)`);
  for (const m of members) {
    assigneeMap.set(m.user.id, displayName(m.user));
  }
  const assigneeOptions: Option[] = [...assigneeMap].map(([id, label]) => ({
    id,
    label,
  }));

  const dependencyOptions: Option[] = tasks
    .filter((t) => t.status !== "DONE")
    .map((t) => ({ id: t.id, label: t.title }));

  const dto: TaskDTO[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    recurrence: t.recurrence,
    estimatedMinutes: t.estimatedMinutes,
    loggedMinutes: t.loggedMinutes,
    workspaceName: t.workspace?.name ?? null,
    assigneeName: t.assignee ? displayName(t.assignee) : null,
    dependsOn: t.dependsOn.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Priorities, deadlines, assignments, dependencies, and time tracking.
          </p>
        </div>
        <NewTaskForm
          workspaces={workspaceOptions}
          assignees={assigneeOptions}
          tasks={dependencyOptions}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/dashboard/tasks?filter=${f.key}` : "/dashboard/tasks"}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {dto.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks here yet. Create your first task to get started.
        </p>
      ) : (
        <div className="grid gap-3">
          {dto.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
