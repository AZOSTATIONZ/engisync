-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkspaceCollaboration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCollaboration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceCollaboration_departmentId_idx" ON "WorkspaceCollaboration"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceCollaboration_workspaceId_departmentId_key" ON "WorkspaceCollaboration"("workspaceId", "departmentId");

-- AddForeignKey
ALTER TABLE "WorkspaceCollaboration" ADD CONSTRAINT "WorkspaceCollaboration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCollaboration" ADD CONSTRAINT "WorkspaceCollaboration_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
