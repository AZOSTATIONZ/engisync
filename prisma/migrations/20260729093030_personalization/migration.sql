-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "avatarStyle" TEXT,
ADD COLUMN     "bio" VARCHAR(280),
ADD COLUMN     "headline" VARCHAR(80),
ADD COLUMN     "skills" TEXT[];
