-- Evidence system: a file now knows which document section it supports.
--
-- Purely ADDITIVE and safe to run against live data:
--   * every new column is nullable or has a default, so existing rows are valid
--     the moment this runs;
--   * `data` only loses its NOT NULL constraint, which cannot fail;
--   * no column is dropped and no row is rewritten.
--
-- Backfill is intentionally implicit: existing files get kind = OTHER and
-- documentSectionId = NULL, which puts them in the project's "Unfiled evidence"
-- tray rather than hiding them. They keep working and can be filed in one click.
--
-- NOTE: `prisma migrate diff` also emitted `DROP TABLE "playing_with_neon"`,
-- because that table exists in the database but not in schema.prisma. It is
-- Neon's sample table, it is not ours, and dropping tables is not this
-- migration's business — so it has been deliberately removed. Its presence is
-- also why `prisma migrate dev` reports drift and offers to reset; use
-- `prisma migrate deploy`, which applies migrations without a drift check.

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('FLOWCHART', 'CIRCUIT', 'SCHEMATIC', 'PCB', 'CAD', 'SIMULATION', 'SOURCE_CODE', 'DATASET', 'REPORT', 'IMAGE', 'VIDEO', 'BOM', 'DATASHEET', 'OTHER');

-- AlterTable
ALTER TABLE "FileResource" ADD COLUMN     "documentSectionId" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "kind" "EvidenceKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "sha256" TEXT,
ADD COLUMN     "supersedesId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "data" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FileResource_supersedesId_key" ON "FileResource"("supersedesId");

-- CreateIndex
CREATE INDEX "FileResource_documentSectionId_idx" ON "FileResource"("documentSectionId");

-- CreateIndex
CREATE INDEX "FileResource_workspaceId_sha256_idx" ON "FileResource"("workspaceId", "sha256");

-- AddForeignKey
ALTER TABLE "FileResource" ADD CONSTRAINT "FileResource_documentSectionId_fkey" FOREIGN KEY ("documentSectionId") REFERENCES "DocumentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileResource" ADD CONSTRAINT "FileResource_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "FileResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
