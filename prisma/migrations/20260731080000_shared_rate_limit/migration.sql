-- Rate-limit counters shared across serverless instances.
--
-- SAFE: creates one new table and one index. Alters nothing, deletes nothing,
-- touches no existing row. The table starts empty and fills itself on first
-- use; there is no backfill because a counter has no history worth keeping.
--
-- As with the previous two migrations, `prisma migrate diff` also emitted
-- `DROP TABLE "playing_with_neon"` — Neon's sample table, not ours, and not
-- this migration's business. Deliberately removed.
--
-- Apply with `prisma migrate deploy`. `migrate dev` reads that same sample
-- table as drift and offers to reset the database.

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
