import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/identity";
import { userWorkspaceIds } from "@/lib/task";

/**
 * Activity feed.
 *
 * DESIGN NOTE — why this derives rather than stores:
 * A user-facing activity stream and a security audit log are different
 * concerns. `AuditLog` is deliberately security-shaped (actor, IP, and its
 * target is redacted on account deletion), so reading it as a feed would be
 * both wrong and leaky.
 *
 * Rather than block this feature behind a new table and a migration, we derive
 * the feed by unioning timestamps that already exist: completed tasks,
 * uploaded files, scheduled meetings and discussion messages. This is accurate
 * from day one with zero backfill — the feed shows real history immediately
 * instead of starting empty on deploy day.
 *
 * When write volume justifies it, this module's signature stays the same and
 * the body swaps to a dedicated `Activity` table.
 */

export type ActivityKind =
  | "task"
  | "file"
  | "meeting"
  | "message"
  | "stage"
  | "approval"
  | "member"
  | "budget"
  | "document"
  | "ai"
  | "system";

/** Maps the stored ActivityKind enum onto the feed's display kinds. */
const STORED_KIND: Record<string, ActivityKind> = {
  STAGE: "stage",
  APPROVAL: "approval",
  MEMBER: "member",
  BUDGET: "budget",
  DOCUMENT: "document",
  AI: "ai",
  SYSTEM: "system",
};

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  actor: string;
  /** Verb phrase, e.g. 'completed' */
  action: string;
  /** The thing acted upon. */
  subject: string;
  projectId: string | null;
  projectName: string | null;
  at: Date;
};

const PERSON = { select: { id: true, name: true, email: true } } as const;

/**
 * Recent activity across the given projects. Pulls a small window from each
 * source and merges — cheaper than a single UNION query and keeps each source
 * independently indexable.
 */
export async function getActivity(
  workspaceIds: string[],
  limit = 12,
): Promise<ActivityItem[]> {
  if (workspaceIds.length === 0) return [];

  const perSource = Math.max(limit, 8);

  const [stored, tasks, files, meetings, messages] = await Promise.all([
    // Events that cannot be derived — stage changes, approvals, joins.
    prisma.activity.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: {
        id: true,
        kind: true,
        action: true,
        subject: true,
        actorName: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.max(limit, 8),
    }),
    prisma.task.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        status: "DONE",
        completedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        completedAt: true,
        workspaceId: true,
        assignee: PERSON,
        creator: PERSON,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { completedAt: "desc" },
      take: perSource,
    }),
    prisma.fileResource.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: {
        id: true,
        name: true,
        createdAt: true,
        workspaceId: true,
        uploader: PERSON,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
    prisma.meeting.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: {
        id: true,
        title: true,
        createdAt: true,
        workspaceId: true,
        createdBy: PERSON,
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
    // DiscussionMessage denormalises the author's name rather than relating to
    // User, so there is no join to make here.
    prisma.discussionMessage.findMany({
      where: { thread: { workspaceId: { in: workspaceIds } } },
      select: {
        id: true,
        createdAt: true,
        authorName: true,
        thread: {
          select: {
            title: true,
            workspaceId: true,
            workspace: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const a of stored) {
    items.push({
      id: `act-${a.id}`,
      kind: STORED_KIND[a.kind] ?? "system",
      actor: a.actorName,
      action: a.action,
      subject: a.subject,
      projectId: a.workspace?.id ?? null,
      projectName: a.workspace?.name ?? null,
      at: a.createdAt,
    });
  }

  for (const t of tasks) {
    if (!t.completedAt) continue;
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      actor: displayName(t.assignee ?? t.creator),
      action: "completed",
      subject: t.title,
      projectId: t.workspace?.id ?? null,
      projectName: t.workspace?.name ?? null,
      at: t.completedAt,
    });
  }

  for (const f of files) {
    items.push({
      id: `file-${f.id}`,
      kind: "file",
      actor: displayName(f.uploader),
      action: "uploaded",
      subject: f.name,
      projectId: f.workspace?.id ?? null,
      projectName: f.workspace?.name ?? null,
      at: f.createdAt,
    });
  }

  for (const m of meetings) {
    items.push({
      id: `meeting-${m.id}`,
      kind: "meeting",
      actor: displayName(m.createdBy),
      action: "scheduled",
      subject: m.title,
      projectId: m.workspace?.id ?? null,
      projectName: m.workspace?.name ?? null,
      at: m.createdAt,
    });
  }

  for (const msg of messages) {
    items.push({
      id: `msg-${msg.id}`,
      kind: "message",
      actor: msg.authorName || "Someone",
      action: "posted in",
      subject: msg.thread.title,
      projectId: msg.thread.workspace?.id ?? null,
      projectName: msg.thread.workspace?.name ?? null,
      at: msg.createdAt,
    });
  }

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

/** Activity across every project the user belongs to. */
export async function getActivityForUser(userId: string, limit = 12) {
  const ids = await userWorkspaceIds(userId);
  return getActivity(ids, limit);
}

/** Compact relative time — "just now", "4h ago", "3d ago". */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const secs = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
