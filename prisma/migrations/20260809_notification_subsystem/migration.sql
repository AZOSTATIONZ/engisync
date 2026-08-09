-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('DEADLINE', 'SUPERVISION', 'TEAM', 'MONEY', 'ACTIVITY', 'SECURITY');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('URGENT', 'NORMAL', 'LOW');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'ACTIVITY',
ADD COLUMN     "digestedAt" TIMESTAMP(3),
ADD COLUMN     "emailedAt" TIMESTAMP(3),
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Harare';

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE INDEX "Notification_userId_emailedAt_digestedAt_idx" ON "Notification"("userId", "emailedAt", "digestedAt");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: treat everything that predates delivery tracking as already
-- delivered.
--
-- WITHOUT THIS, the first digest run would find every notification ever
-- created sitting with emailedAt IS NULL AND digestedAt IS NULL — the exact
-- shape the sweep looks for — and email every user their entire history in one
-- message. Stamping createdAt says "this was handled under the old rules",
-- which is true: the old code emailed immediately or not at all, and either
-- way that decision is already made and cannot be revisited.
UPDATE "Notification" SET "digestedAt" = "createdAt" WHERE "digestedAt" IS NULL;
