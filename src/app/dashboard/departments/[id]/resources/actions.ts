"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import {
  getDeptMembership,
  isDeptAdmin,
  moderateResource,
} from "@/lib/resource-hub";
import { saveLearnerProfile } from "@/lib/recommendations";
import {
  ResourceType,
  ResourceStatus,
  InteractionType,
  NotificationType,
} from "@prisma/client";

export type HubActionState = { error?: string; success?: string; status?: string } | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, name: session.user.name ?? "A student" };
}

const TYPES = new Set(Object.values(ResourceType));
const URL_TYPES = new Set(["LINK", "GITHUB", "YOUTUBE", "DOCUMENTATION", "PAPER", "DATASET", "TUTORIAL", "SOFTWARE"]);

/** Submit a resource → create PENDING → run moderation pipeline inline. */
export async function submitResource(
  _prev: HubActionState,
  formData: FormData,
): Promise<HubActionState> {
  const user = await requireUser();
  const departmentId = String(formData.get("departmentId") ?? "");
  const type = String(formData.get("type") ?? "LINK").toUpperCase();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!(await getDeptMembership(departmentId, user.id))) {
    return { error: "Join this department before contributing resources." };
  }
  if (!TYPES.has(type as ResourceType)) return { error: "Pick a valid resource type." };
  if (title.length < 3) return { error: "Give the resource a clear title." };
  if (URL_TYPES.has(type) && !/^https?:\/\/\S+\.\S+/.test(url)) {
    return { error: "Enter a valid URL (starting with http:// or https://)." };
  }

  const created = await prisma.departmentResource.create({
    data: {
      departmentId,
      submittedById: user.id,
      submittedByName: user.name,
      type: type as ResourceType,
      title,
      url: url || null,
      studentNote: note || null,
      status: ResourceStatus.PENDING,
    },
  });

  await moderateResource(created.id, user.id);

  const after = await prisma.departmentResource.findUnique({
    where: { id: created.id },
    select: { status: true, moderationReason: true },
  });

  // If it stayed pending (AI off), alert department admins for manual review.
  if (after?.status === "PENDING") {
    const admins = await prisma.departmentMember.findMany({
      where: { departmentId, role: "ADMIN" },
      select: { userId: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.userId,
          type: NotificationType.SYSTEM,
          title: "Resource awaiting review",
          body: `"${title}" needs manual approval in the Resource Hub.`,
          link: `/dashboard/departments/${departmentId}/resources`,
        }),
      ),
    );
  }

  revalidatePath(`/dashboard/departments/${departmentId}/resources`);

  if (after?.status === "APPROVED") {
    return { success: "Approved and published to your department.", status: "APPROVED" };
  }
  if (after?.status === "REJECTED") {
    return {
      error: after.moderationReason ?? "The AI did not approve this resource.",
      status: "REJECTED",
    };
  }
  return {
    success: "Submitted — awaiting review by a department admin.",
    status: "PENDING",
  };
}

/** Admin: manually approve or reject a pending resource. */
export async function moderateManually(
  resourceId: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
): Promise<HubActionState> {
  const user = await requireUser();
  const resource = await prisma.departmentResource.findUnique({
    where: { id: resourceId },
    select: { departmentId: true, title: true, submittedById: true },
  });
  if (!resource) return { error: "Resource not found." };
  if (!(await isDeptAdmin(resource.departmentId, user.id))) {
    return { error: "Only a department admin can review resources." };
  }

  await prisma.departmentResource.update({
    where: { id: resourceId },
    data: {
      status: decision as ResourceStatus,
      moderationReason: note.trim() || (decision === "APPROVED" ? "Approved by admin." : "Not accepted."),
      moderatedByAI: false,
      moderatedAt: new Date(),
    },
  });

  await createNotification({
    userId: resource.submittedById,
    type: NotificationType.SYSTEM,
    title: decision === "APPROVED" ? "Resource approved" : "Resource not accepted",
    body: `"${resource.title}" was ${decision === "APPROVED" ? "published" : "declined"}.`,
    link: `/dashboard/departments/${resource.departmentId}/resources`,
  });

  revalidatePath(`/dashboard/departments/${resource.departmentId}/resources`);
  return { success: decision === "APPROVED" ? "Published." : "Rejected." };
}

/** Record a view/save/helpful interaction (idempotent per type). */
export async function recordInteraction(
  resourceId: string,
  type: "VIEW" | "SAVE" | "HELPFUL",
): Promise<HubActionState> {
  const user = await requireUser();
  const resource = await prisma.departmentResource.findUnique({
    where: { id: resourceId },
    select: { departmentId: true },
  });
  if (!resource) return { error: "Resource not found." };
  if (!(await getDeptMembership(resource.departmentId, user.id))) {
    return { error: "You don't have access to this department." };
  }

  await prisma.resourceInteraction.upsert({
    where: {
      resourceId_userId_type: {
        resourceId,
        userId: user.id,
        type: type as InteractionType,
      },
    },
    create: { resourceId, userId: user.id, type: type as InteractionType },
    update: {},
  });
  revalidatePath(`/dashboard/departments/${resource.departmentId}/resources`);
  return { success: type === "SAVE" ? "Saved." : type === "HELPFUL" ? "Marked helpful." : "" };
}

/** Save the learner profile that personalizes recommendations. */
export async function saveProfile(
  departmentId: string,
  _prev: HubActionState,
  formData: FormData,
): Promise<HubActionState> {
  const user = await requireUser();
  const parseList = (v: string) =>
    v.split(",").map((s) => s.trim()).filter(Boolean);
  await saveLearnerProfile(user.id, {
    modules: parseList(String(formData.get("modules") ?? "")),
    skills: parseList(String(formData.get("skills") ?? "")),
    goals: String(formData.get("goals") ?? "").trim(),
  });
  revalidatePath(`/dashboard/departments/${departmentId}/resources`);
  return { success: "Profile saved — recommendations updated." };
}
