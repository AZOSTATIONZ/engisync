import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFilesForUser, formatBytes } from "@/lib/files";
import { userWorkspaceIds } from "@/lib/task";
import {
  UploadForm,
  FileRow,
  type FileDTO,
  type Option,
} from "./resources-ui";

export const metadata: Metadata = { title: "Resource Library" };

export default async function ResourcesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [files, wsIds] = await Promise.all([
    listFilesForUser(userId),
    userWorkspaceIds(userId),
  ]);

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: wsIds } },
    select: { id: true, name: true },
  });
  const workspaceOptions: Option[] = workspaces.map((w) => ({
    id: w.id,
    label: w.name,
  }));

  const dto: FileDTO[] = files.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    mimeType: f.mimeType,
    sizeLabel: formatBytes(f.size),
    uploaderName: f.uploader.name ?? f.uploader.email,
    workspaceName: f.workspace?.name ?? null,
    createdAt: f.createdAt.toISOString(),
    shareCount: f._count.shareLinks,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resource Library</h1>
        <p className="text-muted-foreground">
          Upload engineering files and share them with secure, expiring links.
        </p>
      </div>

      <UploadForm workspaces={workspaceOptions} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Files ({dto.length})
        </h2>
        {dto.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Upload your first resource above.
          </p>
        ) : (
          <div className="grid gap-3">
            {dto.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
