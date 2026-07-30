-- Explicit, revocable project grants — replacing implicit department-wide
-- supervisor access.
--
-- SAFE TO RUN AGAINST LIVE DATA. This migration only creates a new table and
-- fills it. It alters no existing column and deletes no row. The behaviour
-- change lands in application code; this migration exists to make sure that
-- change does not lock anybody out on the way in.
--
-- As with the evidence migration, `prisma migrate diff` also emitted
-- `DROP TABLE "playing_with_neon"` — Neon's sample table, not ours, not this
-- migration's business. Deliberately removed.

-- CreateEnum
CREATE TYPE "ProjectGrantRole" AS ENUM ('SUPERVISOR', 'LECTURER');

-- CreateTable
CREATE TABLE "ProjectGrant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectGrantRole" NOT NULL DEFAULT 'SUPERVISOR',
    "grantedById" TEXT,
    "grantedByName" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectGrant_userId_revokedAt_idx" ON "ProjectGrant"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ProjectGrant_workspaceId_revokedAt_idx" ON "ProjectGrant"("workspaceId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGrant_workspaceId_userId_key" ON "ProjectGrant"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectGrant" ADD CONSTRAINT "ProjectGrant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGrant" ADD CONSTRAINT "ProjectGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- BACKFILL: preserve every access that exists today.
--
-- Before this migration, holding SUPERVISOR in a department granted sight of
-- every project in that department. After it, access requires a grant. Without
-- this step every supervisor would lose every project the moment the code
-- deploys — mid-semester, with no way for them to get it back except asking
-- each team to invite them.
--
-- So each implicit access becomes an explicit row. Nothing is gained and
-- nothing is lost at the moment of migration; what changes is that the access
-- is now visible to the team and revocable by them.
--
-- Department ADMINs are deliberately NOT backfilled. Admin implicit read
-- access to every project's contents is exactly the over-reach being removed:
-- administering a department is not the same as reading students' work. Admins
-- keep the project LIST (names only, enforced in application code) and need a
-- grant like anyone else to open one.
--
-- `grantedByName` records 'System (migrated)' rather than a person, because
-- attributing these to a user who never made the decision would be a lie in an
-- audit record.
INSERT INTO "ProjectGrant" ("id", "workspaceId", "userId", "role", "grantedById", "grantedByName", "createdAt")
SELECT
    -- Deterministic id derived from the pair, so re-running this statement
    -- cannot produce a duplicate even if the unique index were absent.
    'mig_' || substr(md5(w."id" || dm."userId"), 1, 21),
    w."id",
    dm."userId",
    'SUPERVISOR',
    NULL,
    'System (migrated)',
    NOW()
FROM "Workspace" w
JOIN "DepartmentMember" dm ON dm."departmentId" = w."departmentId"
WHERE w."departmentId" IS NOT NULL
  AND dm."role" = 'SUPERVISOR'
  -- A supervisor who is also a member of the project already has access
  -- through membership; a grant on top would be redundant and confusing.
  AND NOT EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      WHERE wm."workspaceId" = w."id" AND wm."userId" = dm."userId"
  )
ON CONFLICT ("workspaceId", "userId") DO NOTHING;
