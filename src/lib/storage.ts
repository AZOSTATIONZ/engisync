import { randomBytes } from "crypto";

/**
 * Object storage for uploaded file bytes.
 *
 * WHY THIS EXISTS
 * ---------------
 * `FileResource.data` put uploaded bytes inside Postgres. At three files and
 * five megabytes that is invisible; at scale it fails in ways that are hard to
 * undo:
 *
 *   - every download materialises the whole file in server memory, and
 *     concurrent downloads multiply that;
 *   - backup and restore time scale with total upload volume, so recovery
 *     gets SLOWER exactly as the product succeeds;
 *   - Neon bills and sizes for rows, not blobs;
 *   - any query that forgets to exclude `data` drags megabytes across the
 *     connection.
 *
 * None of that is on fire today, which is precisely why now is the moment to
 * change it. Moving three files is an afternoon. Moving thirty thousand, with
 * students actively depending on them, is a project with an outage in it.
 *
 * DEGRADES INSTEAD OF BREAKING
 * ----------------------------
 * When no store is configured — no `BLOB_READ_WRITE_TOKEN` — every function
 * here reports that fact and callers keep using the database exactly as
 * before. This mirrors `lib/email.ts`, which fails honestly rather than
 * pretending to have sent something. Turning storage on is one environment
 * variable, and no code path changes shape when it happens.
 *
 * WHY BYTES STILL PASS THROUGH THE SERVER
 * ---------------------------------------
 * Reads go store → server → user rather than handing out a direct URL.
 * Vercel Blob objects are public-by-URL, and evidence belongs to a specific
 * project team; a URL that escapes is access that cannot be withdrawn. Routing
 * through the existing authenticated endpoint keeps `canAccessFile` as the
 * single gate. The cost is bandwidth, and for documents of a few megabytes
 * that is the right trade. Signed, expiring URLs are the upgrade if downloads
 * ever become the bottleneck — the interface below does not need to change to
 * allow it.
 */

export function isObjectStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function storageProviderName(): string {
  return isObjectStorageConfigured() ? "Vercel Blob" : "database (legacy)";
}

/**
 * Build the object key for an upload.
 *
 * Random suffix, NOT the user's filename alone. Two students uploading
 * `report.pdf` to the same project must not collide, and a key derived from
 * user input is a path-traversal question nobody should have to keep
 * answering. The original name is preserved on the row and re-attached at
 * download time, so nothing is lost.
 */
export function buildStorageKey(workspaceId: string, fileName: string): string {
  // UNDERSCORES ARE PART OF THE EXTENSION HERE. `.kicad_pcb`, `.kicad_sch` and
  // `.kicad_pro` are on the accepted-evidence list (lib/evidence.ts) and are
  // ordinary submissions for an Electronic Engineering student. An
  // alphanumeric-only pattern silently filed all three as `.bin`, which a test
  // caught before it shipped — the download would still have worked, but the
  // object would have carried a type no tool recognises.
  const ext = /\.([A-Za-z0-9_]{1,12})$/.exec(fileName)?.[1]?.toLowerCase() ?? "bin";
  const safeWorkspace = workspaceId.replace(/[^A-Za-z0-9_-]/g, "");
  return `evidence/${safeWorkspace}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

/**
 * Write bytes. Returns the key on success, or null if storage is unconfigured
 * or the write failed.
 *
 * Returning null rather than throwing is deliberate: the caller's fallback is
 * to store in the database, which still works. A student mid-upload should not
 * lose their work because an object store had a bad minute.
 */
export async function putObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  if (!isObjectStorageConfigured()) return null;
  try {
    const { put } = await import("@vercel/blob");
    const res = await put(key, Buffer.from(bytes), {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // The key is already unique; letting the SDK add its own suffix would
      // mean the key we store is not the key that exists.
      addRandomSuffix: false,
    });
    return res.pathname ?? key;
  } catch (err) {
    console.error("[storage] put failed; falling back to database", err);
    return null;
  }
}

/** Read bytes back. Null means missing or unreadable — never a thrown error. */
export async function getObject(key: string): Promise<Uint8Array | null> {
  if (!isObjectStorageConfigured()) return null;
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!meta?.url) return null;

    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.error("[storage] get failed", key, err);
    return null;
  }
}

/**
 * Delete an object. Best-effort by design.
 *
 * A failure here leaves an orphan costing a few cents, whereas treating it as
 * fatal would leave a row the user has already been told is gone. The row is
 * the source of truth about what exists.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!isObjectStorageConfigured()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.error("[storage] delete failed; object orphaned", key, err);
  }
}
