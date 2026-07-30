"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { recordActivity } from "@/lib/activity-log";
import { createNotification } from "@/lib/notifications";
import { displayName } from "@/lib/identity";
import {
  buildChecklist,
  checklistPasses,
  nextSlug,
  parseTags,
} from "@/lib/repository";

export type RepoState = { error?: string; success?: string } | null;

const FILE_KINDS = [
  "REPORT",
  "PRESENTATION",
  "SOURCE_CODE",
  "CAD",
  "SIMULATION",
  "BOM",
  "IMAGE",
  "VIDEO",
  "OTHER",
] as const;
type FileKind = (typeof FILE_KINDS)[number];

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function rev(workspaceId?: string) {
  revalidatePath("/dashboard/repository");
  if (workspaceId) revalidatePath(`/dashboard/projects/${workspaceId}`);
}

/**
 * Leader assembles and submits a publication in one step.
 *
 * The form carries: metadata (title/abstract/keywords/facets/license) and a
 * mapping of workspace file ids → archive kinds. The universal checklist is
 * enforced server-side; the supervisor judges the rest.
 */
export async function submitForPublication(
  workspaceId: string,
  _prev: RepoState,
  formData: FormData,
): Promise<RepoState> {
  const userId = await requireUserId();
  const authz = await authorize(workspaceId, userId, "project.publish");
  if (!authz.ok) return { error: authz.error };

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { name: true } },
      members: {
        select: { user: { select: { name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!workspace) return { error: "Project not found." };

  // One live submission per project.
  const existing = await prisma.publishedProject.findFirst({
    where: { workspaceId, status: { in: ["PENDING_APPROVAL", "PUBLISHED"] } },
    select: { status: true },
  });
  if (existing?.status === "PUBLISHED") {
    return { error: "This project is already published." };
  }
  if (existing?.status === "PENDING_APPROVAL") {
    return { error: "This project is already awaiting supervisor approval." };
  }

  const title = String(formData.get("title") ?? "").trim() || workspace.name;
  const abstract = String(formData.get("abstract") ?? "").trim();
  const license = String(formData.get("license") ?? "").trim();
  const keywords = parseTags(String(formData.get("keywords") ?? ""));
  const components = parseTags(String(formData.get("components") ?? ""));
  const languages = parseTags(String(formData.get("languages") ?? ""));
  const disciplines = parseTags(String(formData.get("disciplines") ?? ""));

  // File selection: fields named file-<id> carry the chosen kind.
  const fileMap: { id: string; kind: FileKind }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("file-")) continue;
    const kind = String(value);
    if (kind === "SKIP") continue;
    if (!(FILE_KINDS as readonly string[]).includes(kind)) continue;
    fileMap.push({ id: key.slice(5), kind: kind as FileKind });
  }

  const checklist = buildChecklist({
    abstract,
    keywords,
    license,
    fileKinds: fileMap.map((f) => f.kind),
  });
  if (!checklistPasses(checklist)) {
    const missing = checklist
      .filter((i) => i.required && !i.done)
      .map((i) => i.label)
      .join("; ");
    return { error: `Not ready to submit — missing: ${missing}` };
  }

  // Verify every selected file actually belongs to this workspace.
  // Without this, a crafted form could archive another group's private files.
  const files = await prisma.fileResource.findMany({
    where: { id: { in: fileMap.map((f) => f.id) }, workspaceId },
    select: { id: true },
  });
  if (files.length !== fileMap.length) {
    return { error: "One of the selected files doesn't belong to this project." };
  }

  const year = new Date().getFullYear();
  const authors = workspace.members.map((m) => displayName(m.user));

  // Slug collisions are possible under concurrency; retry once.
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    try {
      created = await prisma.publishedProject.create({
        data: {
          slug: await nextSlug(year),
          status: "PENDING_APPROVAL",
          title,
          abstract,
          year,
          license,
          keywords,
          components,
          languages,
          disciplines,
          departmentName: workspace.department?.name ?? "Independent",
          authors,
          workspaceId,
          departmentId: workspace.departmentId,
          submittedById: userId,
          submittedAt: new Date(),
        },
        select: { id: true },
      });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code !== "P2002" || attempt === 1) throw err;
    }
  }
  if (!created) return { error: "Could not create the submission. Try again." };

  // Remember which files to snapshot at approval time. Bytes are NOT copied
  // yet — copying happens only when the supervisor approves, so a rejected
  // submission costs no storage.
  await prisma.publishedFile.createMany({
    data: await Promise.all(
      fileMap.map(async (f) => {
        const src = await prisma.fileResource.findUniqueOrThrow({
          where: { id: f.id },
          select: { name: true, mimeType: true, size: true },
        });
        return {
          publishedId: created!.id,
          kind: f.kind,
          name: src.name,
          mimeType: src.mimeType,
          size: src.size,
          // Placeholder until approval snapshots the real bytes; the source
          // file id is carried in `data` (tiny) so approval can find it.
          data: Buffer.from(f.id, "utf8"),
        };
      }),
    ),
  });

  await recordActivity({
    workspaceId,
    actorId: userId,
    kind: "DOCUMENT",
    action: "submitted for publication",
    subject: title,
  });

  // Tell every supervisor of this department.
  if (workspace.departmentId) {
    const supervisors = await prisma.departmentMember.findMany({
      where: {
        departmentId: workspace.departmentId,
        role: { in: ["SUPERVISOR", "ADMIN"] },
      },
      select: { userId: true },
    });
    await Promise.all(
      supervisors.map((s) =>
        createNotification({
          userId: s.userId,
          type: NotificationType.WORKSPACE,
          title: "Publication awaiting your approval",
          body: title,
          link: "/dashboard/repository",
        }),
      ),
    );
  }

  rev(workspaceId);
  return {
    success: "Submitted. Your supervisor has been asked to review and approve.",
  };
}

/**
 * Supervisor sign-off. Snapshots the file bytes into the archive — from this
 * moment the record no longer depends on the workspace existing.
 */
export async function approvePublication(publishedId: string): Promise<RepoState> {
  const userId = await requireUserId();

  const pub = await prisma.publishedProject.findUnique({
    where: { id: publishedId },
    select: {
      id: true,
      status: true,
      title: true,
      workspaceId: true,
      submittedById: true,
      files: { select: { id: true, data: true } },
    },
  });
  if (!pub) return { error: "Submission not found." };
  if (pub.status !== "PENDING_APPROVAL") {
    return { error: "This submission isn't awaiting approval." };
  }
  if (!pub.workspaceId) return { error: "Source project no longer exists." };

  const authz = await authorize(pub.workspaceId, userId, "publication.approve");
  if (!authz.ok) return { error: authz.error };

  // Snapshot: replace each placeholder (source file id) with the real bytes.
  for (const f of pub.files) {
    // Prisma 6 returns Bytes as Uint8Array; wrap in Buffer to decode.
    const sourceId = Buffer.from(f.data).toString("utf8");
    const src = await prisma.fileResource.findUnique({
      where: { id: sourceId },
      select: { data: true, size: true, name: true },
    });
    if (!src) {
      return {
        error:
          "A selected file was deleted from the project after submission. Ask the group to resubmit.",
      };
    }
    // Link evidence has no bytes to archive. The archive must be
    // self-contained — a published project whose "source code" is a URL to a
    // repository that may be deleted or made private is not an archive — so
    // this is refused rather than stored as an empty file.
    if (!src.data) {
      return {
        error: `"${src.name}" is a link, not a stored file, so it can't go into the permanent archive. Upload the actual files (for example a source archive) and resubmit.`,
      };
    }
    await prisma.publishedFile.update({
      where: { id: f.id },
      data: { data: src.data, size: src.size },
    });
  }

  const name = await prisma.user
    .findUnique({ where: { id: userId }, select: { name: true, email: true } })
    .then(displayName);

  await prisma.publishedProject.update({
    where: { id: publishedId },
    data: {
      status: "PUBLISHED",
      approvedById: userId,
      supervisorName: name,
      publishedAt: new Date(),
    },
  });

  await recordActivity({
    workspaceId: pub.workspaceId,
    actorId: userId,
    kind: "APPROVAL",
    action: "approved publication of",
    subject: pub.title,
  });
  await createNotification({
    userId: pub.submittedById,
    type: NotificationType.WORKSPACE,
    title: "Your project has been published",
    body: `${pub.title} is now in the department repository.`,
    link: "/dashboard/repository",
  });

  rev(pub.workspaceId);
  return { success: "Published to the repository." };
}

export async function rejectPublication(
  publishedId: string,
  reason: string,
): Promise<RepoState> {
  const userId = await requireUserId();
  const note = reason.trim();
  if (!note) return { error: "Give the group a reason so they can fix it." };

  const pub = await prisma.publishedProject.findUnique({
    where: { id: publishedId },
    select: { id: true, status: true, title: true, workspaceId: true, submittedById: true },
  });
  if (!pub) return { error: "Submission not found." };
  if (pub.status !== "PENDING_APPROVAL") {
    return { error: "This submission isn't awaiting approval." };
  }
  if (!pub.workspaceId) return { error: "Source project no longer exists." };

  const authz = await authorize(pub.workspaceId, userId, "publication.approve");
  if (!authz.ok) return { error: authz.error };

  await prisma.publishedProject.update({
    where: { id: publishedId },
    data: { status: "REJECTED", rejectionReason: note },
  });

  await createNotification({
    userId: pub.submittedById,
    type: NotificationType.WORKSPACE,
    title: "Publication needs changes",
    body: note,
    link: `/dashboard/projects/${pub.workspaceId}`,
  });

  rev(pub.workspaceId);
  return { success: "Sent back to the group with your reason." };
}
