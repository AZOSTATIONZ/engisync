/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,reference]` on the table `Contribution` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `baseAmount` to the `Contribution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `baseAmount` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('DECLARED', 'VERIFIED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM ('DECLARED', 'VERIFIED', 'REJECTED', 'DISPUTED', 'RESOLVED', 'NOTE');

-- AlterEnum
ALTER TYPE "ContributionMethod" ADD VALUE 'ZIPIT';

-- AlterTable
-- baseAmount added nullable, backfilled from `amount`, then made NOT NULL.
-- Existing rows predate multi-currency support, so their exchange rate is 1
-- and baseAmount is simply the amount.
ALTER TABLE "Contribution" ADD COLUMN     "baseAmount" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "receiptFileId" TEXT,
ADD COLUMN     "receiptHash" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "status" "ContributionStatus" NOT NULL DEFAULT 'DECLARED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

UPDATE "Contribution" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL;
ALTER TABLE "Contribution" ALTER COLUMN "baseAmount" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "baseAmount" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN     "receiptFileId" TEXT,
ADD COLUMN     "spentAt" TIMESTAMP(3),
ADD COLUMN     "vendor" TEXT;

UPDATE "Expense" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "baseAmount" SET NOT NULL;

-- CreateTable
CREATE TABLE "ContributionRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "perMemberAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dueDate" TIMESTAMP(3),
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstruction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ecocashNumber" TEXT,
    "ecocashName" TEXT,
    "oneMoneyNumber" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "type" "LedgerEventType" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContributionRequest_workspaceId_closed_idx" ON "ContributionRequest"("workspaceId", "closed");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInstruction_workspaceId_key" ON "PaymentInstruction"("workspaceId");

-- CreateIndex
CREATE INDEX "LedgerEvent_contributionId_createdAt_idx" ON "LedgerEvent"("contributionId", "createdAt");

-- CreateIndex
CREATE INDEX "Contribution_workspaceId_status_idx" ON "Contribution"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_workspaceId_reference_key" ON "Contribution"("workspaceId", "reference");

-- AddForeignKey
ALTER TABLE "ContributionRequest" ADD CONSTRAINT "ContributionRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstruction" ADD CONSTRAINT "PaymentInstruction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ContributionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
