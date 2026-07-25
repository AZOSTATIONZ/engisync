-- CreateTable
CREATE TABLE "DepartmentAnnouncement" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentAnnouncement_departmentId_idx" ON "DepartmentAnnouncement"("departmentId");

-- AddForeignKey
ALTER TABLE "DepartmentAnnouncement" ADD CONSTRAINT "DepartmentAnnouncement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentAnnouncement" ADD CONSTRAINT "DepartmentAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
