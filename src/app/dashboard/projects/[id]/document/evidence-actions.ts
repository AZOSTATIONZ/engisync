"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/policy";
import { getBaseUrl } from "@/lib/qr";
import { MAX_FILE_BYTES, formatBytes } from "@/lib/files";
import { buildStorageKey, deleteObject, putObject } from "@/lib/storage";
import { fileLocation } from "@/lib/file-bytes";
import { isRepositoryUrl, validateEvidence } from "@/lib/evidence";
import { projectDocs } from "@/lib/routes";
import { verifiedAccountGate } from "@/lib/verification";

export type EvidenceState = { error?: string; success?: string } | null;

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/** Confirm the section belongs to this project, and return its key. */
async function resolveSection(workspaceId: string, sectionId: string) {
  const section = await prisma.documentSection.findUnique({
    where: { id: sectionId },
    select: { id: true, key: true, locked: true, document: { select: { workspaceId: true, locked: true } } },
  });
  // Checking ownership rather than trusting the id from the form is what stops
  // a member of project A filing evidence into project B's document.
  if (!section || section.document.workspaceId !== workspaceId) return null;
  return section;
}

/**
 * Attach evidence to a document section.
 *
 * This is THE upload path. There is deliberately no global "upload a file"
 * action any more: an upload with no section has nowhere to belong, which is
 * exactly how files used to become unfindable.
 */
export async function uploadEvidence(
  _prev: EvidenceState,
  formData: FormData,
): Promise<EvidenceState> {
  const userId = await requireUserId();

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!workspaceId || !sectionId) return { error: "Missing project or section." };

  const authz = await authorize(workspaceId, userId, "file.upload");
  if (!authz.ok) return { error: authz.error };

  const section = await resolveSection(workspaceId, sectionId);
  if (!section) return { error: "That section doesn't belong to this project." };
  if (section.locked || section.document.locked) {
    return { error: "This section is locked by the supervisor." };
  }

  const description = (formData.get("description") as string) || null;
  const externalUrl = (formData.get("externalUrl") as string) || "";

  /* ── Link evidence (e.g. a GitHub repository) ── */
  if (externalUrl) {
    if (!isRepositoryUrl(externalUrl)) {
      return {
        error: "Enter an https link to a GitHub, GitLab or Bitbucket repository.",
      };
    }
    const created = await prisma.fileResource.create({
      data: {
        name: externalUrl.replace(/^https:\/\//, "").slice(0, 120),
        description,
        mimeType: "text/uri-list",
        size: 0,
        data: null,
        externalUrl,
        kind: "SOURCE_CODE",
        documentSectionId: section.id,
        workspaceId,
        uploaderId: userId,
      },
      select: { id: true, name: true },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EVIDENCE_LINKED",
        target: created.id,
        metadata: { section: section.key, url: externalUrl },
      },
    });
    revalidatePath(projectDocs(workspaceId));
    return { success: "Repository linked." };
  }

  /* ── File evidence ── */
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file, or paste a repository link." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      error: `That file is ${formatBytes(file.size)}. The current limit is ${formatBytes(MAX_FILE_BYTES)}.`,
    };
  }

  const check = validateEvidence(section.key, file.name);
  if (!check.ok) return { error: check.error };

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  // Same bytes already filed on this section — almost always a double-click or
  // a re-upload of an unchanged file. Refusing is friendlier than silently
  // creating a second identical "version".
  const duplicate = await prisma.fileResource.findFirst({
    where: { documentSectionId: section.id, sha256 },
    select: { name: true },
  });
  if (duplicate) {
    return { error: `That exact file is already attached here as "${duplicate.name}".` };
  }

  // Same NAME on this section means a new revision of the same artefact.
  // Supersede rather than overwrite, so a supervisor who reviewed v1 can still
  // see what they reviewed.
  const previous = await prisma.fileResource.findFirst({
    where: {
      documentSectionId: section.id,
      name: file.name,
      supersededBy: { is: null },
    },
    select: { id: true, version: true },
  });

  /* WHERE THE BYTES GO.
     ------------------------------------------------------------------
     Object storage when it is configured, Postgres when it is not. Uploads
     used to go into the database unconditionally, which is fine at three
     files and is the thing that does not survive growth — every download then
     materialises the whole file in server memory, and backup time scales with
     total upload volume.

     `putObject` returns null rather than throwing when storage is
     unconfigured OR when the write fails. Both collapse to the same safe
     answer here: keep the bytes in the database. A student mid-upload must
     not lose their work because an object store had a bad minute, and this is
     what makes enabling storage a pure environment change with no flag day. */
  const mimeType = file.type || "application/octet-stream";
  const storageKey = await putObject(
    buildStorageKey(workspaceId, file.name),
    bytes,
    mimeType,
  );

  const created = await prisma.fileResource.create({
    data: {
      name: file.name,
      description,
      mimeType,
      size: file.size,
      // Exactly one of these is set. Writing both would double the storage
      // cost and leave two copies to keep in step.
      data: storageKey ? null : bytes,
      storageKey,
      sha256,
      kind: check.kind,
      documentSectionId: section.id,
      version: previous ? previous.version + 1 : 1,
      supersedesId: previous?.id ?? null,
      workspaceId,
      uploaderId: userId,
    },
    select: { id: true, name: true, version: true },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "EVIDENCE_UPLOADED",
      target: created.id,
      metadata: {
        section: section.key,
        kind: check.kind,
        size: file.size,
        version: created.version,
      },
    },
  });

  revalidatePath(projectDocs(workspaceId));
  return {
    success:
      created.version > 1
        ? `Uploaded ${created.name} as version ${created.version}.`
        : `Attached ${created.name}.`,
  };
}

/**
 * File an existing unattached file into a section.
 *
 * This is what makes the migration of historical uploads safe: files that
 * predate section-scoped evidence keep working and can be put in their proper
 * place without re-uploading them.
 */
export async function fileEvidence(
  workspaceId: string,
  fileId: string,
  sectionId: string,
): Promise<EvidenceState> {
  const userId = await requireUserId();

  const authz = await authorize(workspaceId, userId, "file.upload");
  if (!authz.ok) return { error: authz.error };

  const section = await resolveSection(workspaceId, sectionId);
  if (!section) return { error: "That section doesn't belong to this project." };

  const file = await prisma.fileResource.findFirst({
    where: { id: fileId, workspaceId },
    select: { id: true, name: true },
  });
  if (!file) return { error: "File not found in this project." };

  const check = validateEvidence(section.key, file.name);
  if (!check.ok) return { error: check.error };

  await prisma.fileResource.update({
    where: { id: file.id },
    data: { documentSectionId: section.id, kind: check.kind },
  });

  revalidatePath(projectDocs(workspaceId));
  return { success: `Filed ${file.name}.` };
}

/**
 * Create a temporary, expiring share link for a piece of evidence.
 *
 * Kept from the retired global Files page because it is a real capability —
 * sending a supervisor or an external examiner one file without giving them an
 * account. It lives here now so sharing is an action on a specific piece of
 * evidence rather than on an anonymous entry in a bucket.
 */
export async function shareEvidence(
  workspaceId: string,
  fileId: string,
): Promise<EvidenceState & { url?: string }> {
  const userId = await requireUserId();

  /* Verified email required. This action reaches OUTSIDE the account, so the
     address behind it has to be real. `verifiedAccountGate` returns null when
     email is unconfigured on the server, which is what stops this becoming an
     outage before SMTP exists — nobody is asked for a verification they have
     no way to obtain. */
  const unverified = await verifiedAccountGate(userId);
  if (unverified) return { error: unverified };

  const authz = await authorize(workspaceId, userId, "file.upload");
  if (!authz.ok) return { error: authz.error };

  const file = await prisma.fileResource.findFirst({
    where: { id: fileId, workspaceId },
    // `data` is NOT selected: needing the bytes to answer "is this a link?"
    // was the old shape of this check and it would now be actively wrong.
    select: { id: true, storageKey: true, externalUrl: true },
  });
  if (!file) return { error: "File not found in this project." };
  /* "Has no bytes in the database" used to be a synonym for "is a link".
     Once uploads can live in object storage that synonym breaks: such a row
     has an empty `data` column and is very much a real file. Testing it the
     old way would have refused to share every newly uploaded document with
     a message about links, which is both wrong and baffling. `fileLocation`
     exists so this question has exactly one answer everywhere. */
  if (fileLocation({ ...file, data: null }) === "link") {
    return { error: "This evidence is already a link — share the URL directly." };
  }

  const token = randomBytes(24).toString("base64url");
  // Seven days is long enough to be useful for a review and short enough that a
  // forwarded link does not stay live for a whole semester.
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  await prisma.shareLink.create({
    data: { token, fileId: file.id, expiresAt, createdById: userId },
  });
  await prisma.auditLog.create({
    data: { userId, action: "SHARE_LINK_CREATED", target: file.id },
  });

  const base = await getBaseUrl();
  return { success: "Share link valid for 7 days.", url: `${base}/api/share/${token}` };
}

/** Detach evidence from its section without deleting the file. */
export async function unfileEvidence(
  workspaceId: string,
  fileId: string,
): Promise<EvidenceState> {
  const userId = await requireUserId();

  const authz = await authorize(workspaceId, userId, "file.upload");
  if (!authz.ok) return { error: authz.error };

  const updated = await prisma.fileResource.updateMany({
    where: { id: fileId, workspaceId },
    data: { documentSectionId: null },
  });
  if (updated.count === 0) return { error: "File not found in this project." };

  revalidatePath(projectDocs(workspaceId));
  return { success: "Moved to unfiled evidence." };
}

/**
 * Delete evidence.
 *
 * Only the uploader or someone who can approve may delete, and a superseded
 * version can never be deleted on its own — the version chain is the record of
 * what a supervisor reviewed, so it is not something one member can quietly
 * rewrite.
 */
export async function deleteEvidence(
  workspaceId: string,
  fileId: string,
): Promise<EvidenceState> {
  const userId = await requireUserId();

  const file = await prisma.fileResource.findFirst({
    where: { id: fileId, workspaceId },
    select: {
      id: true,
      name: true,
      uploaderId: true,
      storageKey: true,
      supersededBy: { select: { id: true } },
    },
  });
  if (!file) return { error: "File not found in this project." };

  if (file.supersededBy) {
    return {
      error: "This version has been replaced by a newer one and is kept as history.",
    };
  }

  if (file.uploaderId !== userId) {
    const authz = await authorize(workspaceId, userId, "document.approve");
    if (!authz.ok) {
      return { error: "Only the person who uploaded this, or the project leader, can delete it." };
    }
  }

  await prisma.fileResource.delete({ where: { id: file.id } });

  /* Drop the stored object too, or every deletion leaks storage that nothing
     will ever reference again — the row was the only record of the key.

     Deliberately AFTER the row delete and deliberately not awaited into the
     result: the row is the source of truth about what exists. Failing here
     leaves an orphan costing a fraction of a cent, whereas failing BEFORE the
     row delete would leave the user staring at a file they were told was
     gone. `deleteObject` swallows its own errors for the same reason. */
  if (file.storageKey) await deleteObject(file.storageKey);

  await prisma.auditLog.create({
    data: { userId, action: "EVIDENCE_DELETED", target: fileId, metadata: { name: file.name } },
  });

  revalidatePath(projectDocs(workspaceId));
  return { success: `Deleted ${file.name}.` };
}
