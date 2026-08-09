-- AlterTable
ALTER TABLE "PublishedFile" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;

