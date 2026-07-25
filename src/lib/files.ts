import { prisma } from "@/lib/prisma";
import { userWorkspaceIds } from "@/lib/task";

/** Max upload size (bytes). Files are stored in Postgres, so keep this modest. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Files visible to the user (metadata only — never selects the byte data). */
export async function listFilesForUser(userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  return prisma.fileResource.findMany({
    where: {
      OR: [{ uploaderId: userId }, { workspaceId: { in: wsIds } }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploader: { select: { id: true, name: true, email: true } },
      workspace: { select: { id: true, name: true } },
      _count: { select: { shareLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Return file metadata if the user may access it, else null. */
export async function canAccessFile(fileId: string, userId: string) {
  const wsIds = await userWorkspaceIds(userId);
  return prisma.fileResource.findFirst({
    where: {
      id: fileId,
      OR: [{ uploaderId: userId }, { workspaceId: { in: wsIds } }],
    },
    select: { id: true, uploaderId: true, workspaceId: true },
  });
}
