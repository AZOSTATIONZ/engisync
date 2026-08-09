-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "KnownDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT,

    CONSTRAINT "KnownDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnownDevice_userId_idx" ON "KnownDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KnownDevice_userId_fingerprint_key" ON "KnownDevice"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "KnownDevice" ADD CONSTRAINT "KnownDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

