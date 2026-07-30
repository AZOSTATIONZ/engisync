"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { getMembership } from "@/lib/workspace";
import { createNotification } from "@/lib/notifications";

export type DiscussionState = { error?: string; success?: string } | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function createThread(
  workspaceId: string,
  _prev: DiscussionState,
  formData: FormData,
): Promise<DiscussionState> {
  const user = await requireUser();
  if (!(await getMembership(workspaceId, user.id))) {
    return { error: "You're not a member of this group." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 3) return { error: "Give your topic a title." };
  if (body.length < 1) return { error: "Write the first message." };

  const authorName = user.name ?? user.email ?? "Member";
  const thread = await prisma.discussionThread.create({
    data: {
      workspaceId,
      authorId: user.id,
      authorName,
      title,
      messages: { create: { authorId: user.id, authorName, body } },
    },
  });

  revalidatePath(`/dashboard/projects/${workspaceId}/discussions`);
  redirect(`/dashboard/projects/${workspaceId}/discussions/${thread.id}`);
}

export async function postMessage(
  threadId: string,
  _prev: DiscussionState,
  formData: FormData,
): Promise<DiscussionState> {
  const user = await requireUser();
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    select: { workspaceId: true, title: true, authorId: true },
  });
  if (!thread) return { error: "Thread not found." };
  if (!(await getMembership(thread.workspaceId, user.id))) {
    return { error: "You're not a member of this group." };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message." };

  const authorName = user.name ?? user.email ?? "Member";
  await prisma.$transaction([
    prisma.discussionMessage.create({
      data: { threadId, authorId: user.id, authorName, body },
    }),
    prisma.discussionThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Notify the thread starter if someone else replied.
  if (thread.authorId !== user.id) {
    await createNotification({
      userId: thread.authorId,
      type: NotificationType.WORKSPACE,
      title: `New reply: ${thread.title}`,
      body: `${authorName} replied in your discussion.`,
      link: `/dashboard/projects/${thread.workspaceId}/discussions/${threadId}`,
    });
  }

  revalidatePath(`/dashboard/projects/${thread.workspaceId}/discussions/${threadId}`);
  return { success: "Posted." };
}

export async function deleteThread(threadId: string): Promise<DiscussionState> {
  const user = await requireUser();
  const thread = await prisma.discussionThread.findUnique({
    where: { id: threadId },
    select: { workspaceId: true, authorId: true },
  });
  if (!thread) return { error: "Not found." };
  // Authors may delete their own threads; anyone else needs moderation
  // rights (leader-only via the policy layer).
  const allowed =
    thread.authorId === user.id ||
    (await authorize(thread.workspaceId, user.id, "discussion.moderate")).ok;
  if (!allowed) return { error: "You can't delete this thread." };

  await prisma.discussionThread.delete({ where: { id: threadId } });
  revalidatePath(`/dashboard/projects/${thread.workspaceId}/discussions`);
  redirect(`/dashboard/projects/${thread.workspaceId}/discussions`);
}
