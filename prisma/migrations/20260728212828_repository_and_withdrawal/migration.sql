-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'LEADER_APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublishedFileKind" AS ENUM ('REPORT', 'PRESENTATION', 'SOURCE_CODE', 'CAD', 'SIMULATION', 'BOM', 'IMAGE', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "PublishedVisibility" AS ENUM ('DEPARTMENT', 'UNIVERSITY');

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "leaderNote" TEXT,
    "supervisorNote" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "PublishedVisibility" NOT NULL DEFAULT 'DEPARTMENT',
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "license" TEXT NOT NULL DEFAULT 'All rights reserved',
    "keywords" TEXT[],
    "disciplines" TEXT[],
    "components" TEXT[],
    "languages" TEXT[],
    "departmentName" TEXT NOT NULL,
    "authors" TEXT[],
    "supervisorName" TEXT,
    "workspaceId" TEXT,
    "departmentId" TEXT,
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "PublishedProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedFile" (
    "id" TEXT NOT NULL,
    "publishedId" TEXT NOT NULL,
    "kind" "PublishedFileKind" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_workspaceId_status_idx" ON "WithdrawalRequest"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedProject_slug_key" ON "PublishedProject"("slug");

-- CreateIndex
CREATE INDEX "PublishedProject_status_year_idx" ON "PublishedProject"("status", "year");

-- CreateIndex
CREATE INDEX "PublishedProject_departmentId_status_idx" ON "PublishedProject"("departmentId", "status");

-- CreateIndex
CREATE INDEX "PublishedProject_workspaceId_idx" ON "PublishedProject"("workspaceId");

-- CreateIndex
CREATE INDEX "PublishedFile_publishedId_idx" ON "PublishedFile"("publishedId");

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedFile" ADD CONSTRAINT "PublishedFile_publishedId_fkey" FOREIGN KEY ("publishedId") REFERENCES "PublishedProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
