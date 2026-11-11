/*
  Warnings:

  - You are about to drop the column `date` on the `Activity` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ActivitySchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activityId" INTEGER NOT NULL,
    "classRoomId" INTEGER,
    "weekday" TEXT,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME,
    "educatorId" INTEGER,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySchedule_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitySchedule_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivitySchedule_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "EducatorProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivitySchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleOccurrence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classRoomId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "activityId" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceId" INTEGER,
    "educatorId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "tracksParticipation" BOOLEAN NOT NULL DEFAULT false,
    "educatorNote" TEXT,
    "noteVisibleToParents" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT NOT NULL,
    CONSTRAINT "ScheduleOccurrence_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScheduleOccurrence_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduleOccurrence_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "EducatorProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("category", "description", "id", "title") SELECT "category", "description", "id", "title" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivitySchedule_activityId_weekday_idx" ON "ActivitySchedule"("activityId", "weekday");

-- CreateIndex
CREATE INDEX "ActivitySchedule_classRoomId_idx" ON "ActivitySchedule"("classRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleOccurrence_dedupeKey_key" ON "ScheduleOccurrence"("dedupeKey");

-- CreateIndex
CREATE INDEX "ScheduleOccurrence_classRoomId_date_idx" ON "ScheduleOccurrence"("classRoomId", "date");

-- CreateIndex
CREATE INDEX "ScheduleOccurrence_date_idx" ON "ScheduleOccurrence"("date");

-- CreateIndex
CREATE INDEX "ScheduleOccurrence_activityId_idx" ON "ScheduleOccurrence"("activityId");
