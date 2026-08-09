import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

/**
 * The ONE place that answers "where are this file's bytes, and how do I get
 * them?".
 *
 * A `FileResource` can now be in one of three states, and the whole point of
 * this module is that no caller has to remember that:
 *
 *   storageKey  → bytes live in object storage (new uploads)
 *   data        → bytes live in Postgres (legacy rows, and the fallback used
 *                 when object storage is unconfigured or momentarily failing)
 *   externalUrl → there are no bytes; it is a link to somebody else's page
 *
 * Reading them in that order matters during migration. A row that has been
 * copied to object storage but whose `data` has not yet been cleared is
 * legitimate and expected — the backfill writes the object first, verifies it,
 * and only then drops the column value. Preferring `storageKey` means such a
 * row is served from its new home, so the copy is exercised BEFORE anything
 * is deleted.
 */

export type FileLocation = "object-storage" | "database" | "link" | "missing";

/** Classify without fetching anything. */
export function fileLocation(file: {
  storageKey?: string | null;
  data?: Uint8Array | Buffer | null;
  externalUrl?: string | null;
}): FileLocation {
  if (file.storageKey) return "object-storage";
  if (file.data) return "database";
  if (file.externalUrl) return "link";
  return "missing";
}

/**
 * Fetch the bytes for a file, wherever they are.
 *
 * NOTE the two-step read. The metadata query deliberately EXCLUDES `data`,
 * because the common case for a migrated file is that the column is empty and
 * pulling it would drag megabytes across the connection for nothing. Only if
 * the row turns out to be legacy do we go back for the bytes. That is one
 * extra round trip on the old path and zero on the new one, which is the
 * right way round.
 *
 * Returns null for links and for anything unreadable; callers distinguish the
 * cases with `fileLocation`.
 */
export async function readFileBytes(fileId: string): Promise<Uint8Array | null> {
  const meta = await prisma.fileResource.findUnique({
    where: { id: fileId },
    select: { storageKey: true, externalUrl: true },
  });
  if (!meta) return null;

  if (meta.storageKey) {
    const bytes = await getObject(meta.storageKey);
    if (bytes) return bytes;
    // Object storage said no. Fall through rather than fail: during the
    // backfill window a row may legitimately still hold its database copy,
    // and serving the file the user asked for beats being right about where
    // it should have come from.
    console.error("[file-bytes] storage miss, trying database", fileId);
  }

  const row = await prisma.fileResource.findUnique({
    where: { id: fileId },
    select: { data: true },
  });
  return row?.data ? new Uint8Array(row.data) : null;
}

/**
 * Bytes for an ARCHIVED file (`PublishedFile`).
 *
 * A near-twin of `readFileBytes` rather than a shared generic, because the two
 * tables mean different things and are allowed to diverge: an archive entry is
 * a permanent snapshot with no `externalUrl` concept at all — a published
 * project whose "source code" is a link to a repository that might later be
 * deleted or made private is not an archive.
 */
export async function readPublishedFileBytes(
  fileId: string,
): Promise<Uint8Array | null> {
  const meta = await prisma.publishedFile.findUnique({
    where: { id: fileId },
    select: { storageKey: true },
  });
  if (!meta) return null;

  if (meta.storageKey) {
    const bytes = await getObject(meta.storageKey);
    if (bytes) return bytes;
    console.error("[file-bytes] archive storage miss, trying database", fileId);
  }

  const row = await prisma.publishedFile.findUnique({
    where: { id: fileId },
    select: { data: true },
  });
  return row?.data ? new Uint8Array(row.data) : null;
}
