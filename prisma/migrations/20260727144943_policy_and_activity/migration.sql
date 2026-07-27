-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('STAGE', 'APPROVAL', 'MEMBER', 'BUDGET', 'DOCUMENT', 'AI', 'SYSTEM');

-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "canApprove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canInvite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageBudget" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_workspaceId_createdAt_idx" ON "Activity"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
