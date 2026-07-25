"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";
import { canAccessFile, MAX_FILE_BYTES, formatBytes } from "@/lib/files";
import { shareLinkSchema } from "@/lib/validations";

export type ActionState = {
  error?: string;
  success?: string;
  token?: string;
} | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function uploadFile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: `File is too large. Max ${formatBytes(MAX_FILE_BYTES)}.` };
  }

  const rawWorkspaceId = formData.get("workspaceId");
  const workspaceId =
    typeof rawWorkspaceId === "string" && rawWorkspaceId ? rawWorkspaceId : null;
  const description = (formData.get("description") as string) || null;

  if (workspaceId) {
    const wsIds = await userWorkspaceIds(userId);
    if (!wsIds.includes(workspaceId)) {
      return { error: "You are not a member of that workspace." };
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const created = await prisma.fileResource.create({
    data: {
      name: file.name,
      description,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: bytes,
      workspaceId,
      uploaderId: userId,
    },
    select: { id: true, name: true },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "FILE_UPLOADED",
      target: created.id,
      metadata: { name: created.name, size: file.size },
    },
  });

  revalidatePath("/dashboard/resources");
  return { success: `Uploaded ${created.name}.` };
}

export async function deleteFile(fileId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const file = await canAccessFile(fileId, userId);
  if (!file) return { error: "You don't have access to this file." };

  let allowed = file.uploaderId === userId;
  if (!allowed && file.workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId } },
    });
    allowed = membership?.role === "LEADER";
  }
  if (!allowed) return { error: "Only the uploader or group leader can delete this." };

  await prisma.fileResource.delete({ where: { id: fileId } });
  await prisma.auditLog.create({
    data: { userId, action: "FILE_DELETED", target: fileId },
  });

  revalidatePath("/dashboard/resources");
  return { success: "File deleted." };
}

export async function createShareLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = shareLinkSchema.safeParse({
    fileId: formData.get("fileId"),
    expiresInHours: formData.get("expiresInHours") || undefined,
    maxDownloads: formData.get("maxDownloads") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { fileId, expiresInHours, maxDownloads } = parsed.data;

  if (!(await canAccessFile(fileId, userId))) {
    return { error: "You don't have access to this file." };
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt =
    expiresInHours && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 3600 * 1000)
      : null;

  await prisma.shareLink.create({
    data: {
      token,
      fileId,
      expiresAt,
      maxDownloads: maxDownloads ?? null,
      createdById: userId,
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "SHARE_LINK_CREATED", target: fileId },
  });

  revalidatePath("/dashboard/resources");
  return { success: "Share link created.", token };
}

export async function revokeShareLink(shareId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const link = await prisma.shareLink.findUnique({
    where: { id: shareId },
    include: { file: { select: { uploaderId: true } } },
  });
  if (!link) return { error: "Share link not found." };
  if (link.createdById !== userId && link.file.uploaderId !== userId) {
    return { error: "You can't revoke this link." };
  }

  await prisma.shareLink.update({
    where: { id: shareId },
    data: { revoked: true },
  });

  revalidatePath("/dashboard/resources");
  return { success: "Share link revoked." };
}
