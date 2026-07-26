-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LINK', 'PDF', 'GITHUB', 'YOUTUBE', 'SOFTWARE', 'TUTORIAL', 'DOCUMENTATION', 'PAPER', 'DATASET', 'TEMPLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'SAVE', 'HELPFUL');

-- CreateTable
CREATE TABLE "DepartmentResource" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL DEFAULT 'LINK',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "studentNote" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "difficulty" "ResourceDifficulty",
    "category" TEXT,
    "whyUseful" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderationReason" TEXT,
    "suggestedCategory" TEXT,
    "moderatedByAI" BOOLEAN NOT NULL DEFAULT false,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceInteraction" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedResource" (
    "id" TEXT NOT NULL,
    "departmentCode" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "ResourceDifficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ResourceStatus" NOT NULL DEFAULT 'APPROVED',
    "source" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "userId" TEXT NOT NULL,
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "DepartmentResource_departmentId_status_idx" ON "DepartmentResource"("departmentId", "status");

-- CreateIndex
CREATE INDEX "ResourceInteraction_userId_idx" ON "ResourceInteraction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceInteraction_resourceId_userId_type_key" ON "ResourceInteraction"("resourceId", "userId", "type");

-- CreateIndex
CREATE INDEX "TrustedResource_departmentCode_status_idx" ON "TrustedResource"("departmentCode", "status");

-- AddForeignKey
ALTER TABLE "DepartmentResource" ADD CONSTRAINT "DepartmentResource_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceInteraction" ADD CONSTRAINT "ResourceInteraction_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "DepartmentResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
