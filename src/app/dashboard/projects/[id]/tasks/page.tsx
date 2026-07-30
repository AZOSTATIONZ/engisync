import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { displayName } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { listTasksForUser } from "@/lib/task";
import { getMembership } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { projectTasks } from "@/lib/routes";
import {
  NewTaskForm,
  TaskItem,
  type TaskDTO,
  type Option,
} from "@/app/dashboard/tasks/tasks-ui";

export const metadata: Metadata = { title: "Tasks" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "BLOCKED", label: "Blocked" },
  { key: "DONE", label: "Done" },
];

/**
 * This project's tasks.
 *
 * Scoped by route rather than by a `?workspace=` query on a global task list:
 * a project's work is part of the project, so it gets a real address inside it.
 * The cross-project view of "everything assigned to me" remains on Home, which
 * is the personal lens.
 */
export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter = "" } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getMembership(id, userId);
  if (!membership) notFound();

  const statusFilter = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"].includes(filter)
    ? filter
    : undefined;

  const [tasks, project, members] = await Promise.all([
    listTasksForUser(userId, { workspaceId: id, status: statusFilter }),
    prisma.workspace.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  if (!project) notFound();

  const workspaceOptions: Option[] = [{ id: project.id, label: project.name }];

  const assigneeMap = new Map<string, string>();
  for (const m of members) assigneeMap.set(m.user.id, displayName(m.user));
  assigneeMap.set(userId, `${session!.user.name ?? "Me"} (me)`);
  const assigneeOptions: Option[] = [...assigneeMap].map(([uid, label]) => ({
    id: uid,
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
    workspaceName: null,
    assigneeName: t.assignee ? displayName(t.assignee) : null,
    dependsOn: t.dependsOn.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
    })),
  }));

  const base = projectTasks(id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key ? `${base}?filter=${f.key}` : base}
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
        {/* Only this project is offered, so a task created here cannot
            silently land in a different project. */}
        <NewTaskForm
          workspaces={workspaceOptions}
          assignees={assigneeOptions}
          tasks={dependencyOptions}
        />
      </div>

      {dto.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks here yet. Create the first one to get the team moving.
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
