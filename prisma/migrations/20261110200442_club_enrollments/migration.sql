-- CreateTable
CREATE TABLE "ClubEnrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "activityId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" INTEGER,
    "decidedBy" INTEGER,
    "decidedAt" DATETIME,
    "decisionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClubEnrollment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClubEnrollment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClubEnrollment_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClubEnrollment_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ClubEnrollment_status_idx" ON "ClubEnrollment"("status");

-- CreateIndex
CREATE INDEX "ClubEnrollment_activityId_idx" ON "ClubEnrollment"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEnrollment_childId_activityId_key" ON "ClubEnrollment"("childId", "activityId");
