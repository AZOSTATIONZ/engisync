-- CreateEnum
CREATE TYPE "ContributionMethod" AS ENUM ('ECOCASH', 'ONEMONEY', 'INNBUCKS', 'CASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('COMPONENTS', 'TOOLS', 'PRINTING', 'TRANSPORT', 'SOFTWARE', 'SERVICES', 'OTHER');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "budgetTarget" DECIMAL(12,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "ContributionMethod" NOT NULL DEFAULT 'ECOCASH',
    "reference" TEXT,
    "note" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "workspaceId" TEXT NOT NULL,
    "spentById" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_workspaceId_idx" ON "Contribution"("workspaceId");

-- CreateIndex
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");

-- CreateIndex
CREATE INDEX "Expense_workspaceId_idx" ON "Expense"("workspaceId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_spentById_fkey" FOREIGN KEY ("spentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
