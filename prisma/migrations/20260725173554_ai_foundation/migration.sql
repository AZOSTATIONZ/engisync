-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STUDENT_PREMIUM', 'UNIVERSITY');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "minutes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
