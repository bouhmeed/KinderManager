-- CreateTable
CREATE TABLE "ActivityParticipation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "occurrenceId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "autoStatus" TEXT,
    "autoMinutes" INTEGER,
    "manualMinutes" INTEGER,
    "confirmedBy" INTEGER,
    "confirmedAt" DATETIME,
    "overrideReason" TEXT,
    "educatorRemark" TEXT,
    "remarkVisibleToParents" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" DATETIME,
    CONSTRAINT "ActivityParticipation_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ScheduleOccurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityParticipation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActivityParticipation_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParticipationHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participationId" INTEGER NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "oldMinutes" INTEGER,
    "newMinutes" INTEGER,
    "reason" TEXT NOT NULL,
    "changedBy" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipationHistory_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ActivityParticipation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipationHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER,
    "classId" INTEGER,
    "occurrenceId" INTEGER,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" DATETIME,
    "audience" TEXT NOT NULL DEFAULT 'STAFF_ONLY',
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Photo_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ScheduleOccurrence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("childId", "classId", "createdAt", "filePath", "id", "uploadedBy") SELECT "childId", "classId", "createdAt", "filePath", "id", "uploadedBy" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivityParticipation_childId_idx" ON "ActivityParticipation"("childId");

-- CreateIndex
CREATE INDEX "ActivityParticipation_occurrenceId_idx" ON "ActivityParticipation"("occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityParticipation_occurrenceId_childId_key" ON "ActivityParticipation"("occurrenceId", "childId");

-- CreateIndex
CREATE INDEX "ParticipationHistory_participationId_idx" ON "ParticipationHistory"("participationId");
