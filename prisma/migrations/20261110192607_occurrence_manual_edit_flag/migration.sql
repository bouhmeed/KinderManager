-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduleOccurrence" (
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
    "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "educatorNote" TEXT,
    "noteVisibleToParents" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT NOT NULL,
    CONSTRAINT "ScheduleOccurrence_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScheduleOccurrence_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduleOccurrence_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "EducatorProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScheduleOccurrence" ("activityId", "classRoomId", "date", "dedupeKey", "educatorId", "educatorNote", "endMinutes", "id", "kind", "noteVisibleToParents", "sourceId", "sourceType", "startMinutes", "status", "title", "tracksParticipation") SELECT "activityId", "classRoomId", "date", "dedupeKey", "educatorId", "educatorNote", "endMinutes", "id", "kind", "noteVisibleToParents", "sourceId", "sourceType", "startMinutes", "status", "title", "tracksParticipation" FROM "ScheduleOccurrence";
DROP TABLE "ScheduleOccurrence";
ALTER TABLE "new_ScheduleOccurrence" RENAME TO "ScheduleOccurrence";
CREATE UNIQUE INDEX "ScheduleOccurrence_dedupeKey_key" ON "ScheduleOccurrence"("dedupeKey");
CREATE INDEX "ScheduleOccurrence_classRoomId_date_idx" ON "ScheduleOccurrence"("classRoomId", "date");
CREATE INDEX "ScheduleOccurrence_date_idx" ON "ScheduleOccurrence"("date");
CREATE INDEX "ScheduleOccurrence_activityId_idx" ON "ScheduleOccurrence"("activityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
