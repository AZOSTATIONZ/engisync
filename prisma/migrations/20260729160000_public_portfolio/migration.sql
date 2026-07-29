-- Public engineering portfolio at /p/<handle>.
--
-- `publicProfile` defaults to FALSE and must stay that way: publishing a
-- student's work to the open internet is a decision only they can make, and a
-- migration that opted everyone in would be a privacy incident rather than a
-- feature launch.
--
-- `handle` is nullable — nobody has one until they choose to publish — and
-- UNIQUE, so two students cannot claim the same URL. Handles are lowercased
-- before storage (see normaliseHandle) so the uniqueness check cannot be
-- defeated by differing in case.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "handle" TEXT,
  ADD COLUMN IF NOT EXISTS "publicProfile" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");
