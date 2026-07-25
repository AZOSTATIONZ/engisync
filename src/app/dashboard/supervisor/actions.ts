"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSuperviseWorkspace } from "@/lib/supervisor";
import { createNotification } from "@/lib/notifications";

export type FeedbackState = { error?: string; success?: string } | null;

export async function postSupervisorFeedback(
  workspaceId: string,
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = session.user;

  if (!(await canSuperviseWorkspace(workspaceId, user.id))) {
    return { error: "You don't supervise this project." };
  }
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) return { error: "Write your feedback first." };

  const authorName = user.name ? `${user.name} (supervisor)` : "Supervisor";
  await prisma.projectFeedback.create({
    data: { workspaceId, authorId: user.id, authorName, body },
  });

  // Notify the group's leaders.
  const leaders = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: "LEADER" },
    select: { userId: true },
  });
  await Promise.all(
    leaders.map((l) =>
      createNotification({
        userId: l.userId,
        type: NotificationType.WORKSPACE,
        title: "New supervisor feedback",
        body: body.slice(0, 140),
        link: `/dashboard/projects/${workspaceId}`,
      }),
    ),
  );
  await prisma.auditLog.create({
    data: { userId: user.id, action: "SUPERVISOR_FEEDBACK", target: workspaceId },
  });

  revalidatePath(`/dashboard/supervisor/${workspaceId}`);
  revalidatePath(`/dashboard/projects/${workspaceId}`);
  return { success: "Feedback sent to the group." };
}
