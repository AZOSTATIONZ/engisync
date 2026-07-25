import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";

/** Threads in a group (member access enforced by the caller/page). */
export async function listThreads(workspaceId: string) {
  return prisma.discussionThread.findMany({
    where: { workspaceId },
    include: { _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/** A thread with messages — only if the user is a member of its group. */
export async function getThread(threadId: string, userId: string) {
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      workspace: { select: { id: true, name: true, leaderId: true } },
    },
  });
  if (!thread) return null;
  const membership = await getMembership(thread.workspaceId, userId);
  if (!membership) return null;
  return thread;
}
