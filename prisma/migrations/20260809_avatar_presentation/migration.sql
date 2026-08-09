-- CreateEnum
CREATE TYPE "AvatarPresentation" AS ENUM ('NEUTRAL', 'MASCULINE', 'FEMININE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarPresentation" "AvatarPresentation" NOT NULL DEFAULT 'NEUTRAL';

