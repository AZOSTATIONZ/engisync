-- Adds User.essentialEmails: announcements, task assignments and deadline
-- reminders are emailed by DEFAULT, while everything else stays opt-in via the
-- existing `emailNotifications` column.
--
-- WHY `IF NOT EXISTS`
-- This migration was written after the fact. The column may already exist in
-- the database from a `prisma db push`, which changes the schema without
-- recording a migration. A plain ADD COLUMN would then fail, and the usual
-- remedy Prisma suggests is a reset — which would destroy real student data.
--
-- Written idempotently instead, so `prisma migrate deploy` succeeds whether the
-- column is already present or not, and the migration history ends up matching
-- the database either way.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "essentialEmails" BOOLEAN NOT NULL DEFAULT true;
