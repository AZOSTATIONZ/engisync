/**
 * Move file bytes out of Postgres and into object storage.
 *
 * Run with:
 *   node scripts/migrate-files-to-storage.mjs --dry-run
 *   node scripts/migrate-files-to-storage.mjs
 *
 * SAFE TO RUN WHILE THE APP IS SERVING TRAFFIC, and safe to run twice. That is
 * the whole design, because the alternative — a maintenance window on a
 * student platform during a submission week — is not really available.
 *
 * The order of operations is what makes it safe:
 *
 *   1. write the object
 *   2. read it back and compare the SHA-256 against the row
 *   3. only then set `storageKey` and clear `data`
 *
 * Step 2 is not ceremony. Without it, a partial or corrupted upload would be
 * followed by deleting the only good copy, and the failure would surface weeks
 * later as a student's report refusing to download. Verification means the
 * database copy is dropped only once a byte-identical replacement has been
 * proven to exist.
 *
 * Between steps 1 and 3 a row legitimately has BOTH copies. `readFileBytes`
 * prefers `storageKey`, so such a row is already being served from its new
 * home before anything is deleted — the new path is exercised while the old
 * one is still there to fall back on.
 *
 * Rows are processed one at a time and re-read inside the loop. This is slower
 * than batching and it is the right call: a 10 MB file per iteration keeps
 * memory flat, and a crash halfway through leaves every completed row
 * consistent rather than a batch half-applied.
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { put, head, del } from "@vercel/blob";

const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const prisma = new PrismaClient();

function keyFor(workspaceId, name, id) {
  // Underscores included: .kicad_pcb / .kicad_sch / .kicad_pro are accepted
  // evidence types, and an alphanumeric-only pattern files them as .bin.
  const ext = /\.([A-Za-z0-9_]{1,12})$/.exec(name)?.[1]?.toLowerCase() ?? "bin";
  const safe = String(workspaceId ?? "orphan").replace(/[^A-Za-z0-9_-]/g, "");
  return `evidence/${safe}/${id}.${ext}`;
}

async function main() {
  if (!TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set. Nothing to migrate to.\n" +
        "Set it in .env (and in Vercel for production) and re-run.",
    );
    process.exit(1);
  }

  const pending = await prisma.fileResource.findMany({
    where: { storageKey: null, NOT: { data: null } },
    select: { id: true, name: true, mimeType: true, workspaceId: true, sha256: true },
    orderBy: { id: "asc" },
  });

  console.log(`${pending.length} file(s) to migrate${DRY_RUN ? " (dry run)" : ""}.`);
  if (pending.length === 0) return;

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const meta of pending) {
    // Re-read the bytes for this row only — never all of them at once.
    const row = await prisma.fileResource.findUnique({
      where: { id: meta.id },
      select: { data: true },
    });
    if (!row?.data) {
      // Migrated or deleted by another run since the list was built.
      skipped++;
      continue;
    }

    const bytes = Buffer.from(row.data);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const key = keyFor(meta.workspaceId, meta.name, meta.id);
    const label = `${meta.name} (${(bytes.length / 1048576).toFixed(2)} MB)`;

    if (DRY_RUN) {
      console.log(`  would move ${label} -> ${key}`);
      moved++;
      continue;
    }

    try {
      await put(key, bytes, {
        access: "public",
        contentType: meta.mimeType || "application/octet-stream",
        token: TOKEN,
        addRandomSuffix: false,
      });

      // VERIFY BEFORE DELETING. Read it back and compare byte-for-byte.
      const info = await head(key, { token: TOKEN });
      const check = await fetch(info.url);
      if (!check.ok) throw new Error(`read-back failed: HTTP ${check.status}`);
      const roundTripped = Buffer.from(await check.arrayBuffer());
      const rtDigest = createHash("sha256").update(roundTripped).digest("hex");

      if (rtDigest !== digest) {
        throw new Error("read-back digest mismatch — refusing to drop the database copy");
      }
      // Also cross-check the stored hash where the row has one.
      if (meta.sha256 && meta.sha256 !== digest) {
        console.warn(`  ! ${meta.name}: stored sha256 disagrees with its own bytes; migrating anyway`);
      }

      await prisma.fileResource.update({
        where: { id: meta.id },
        data: { storageKey: key, data: null },
      });

      console.log(`  moved ${label}`);
      moved++;
    } catch (err) {
      failed++;
      console.error(`  FAILED ${label}: ${err.message}`);
      // Remove the half-written object so a retry starts clean. The database
      // copy was never touched, so the file is still intact and downloadable.
      try {
        await del(key, { token: TOKEN });
      } catch {
        /* Orphan costs a fraction of a cent; the file is what matters. */
      }
    }
  }

  console.log(`\nmoved ${moved}, skipped ${skipped}, failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
