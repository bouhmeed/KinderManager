-- CreateTable
CREATE TABLE "ClassScheduleException" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classRoomId" INTEGER NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "reason" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassScheduleException_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClassScheduleException_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleExceptionItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exceptionId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "sourceSlotId" INTEGER,
    "weekday" TEXT,
    "kind" TEXT,
    "title" TEXT,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "activityId" INTEGER,
    "notes" TEXT,
    CONSTRAINT "ScheduleExceptionItem_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "ClassScheduleException" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleExceptionItem_sourceSlotId_fkey" FOREIGN KEY ("sourceSlotId") REFERENCES "TimetableSlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduleExceptionItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ClassScheduleException_classRoomId_validFrom_validTo_idx" ON "ClassScheduleException"("classRoomId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "ScheduleExceptionItem_exceptionId_idx" ON "ScheduleExceptionItem"("exceptionId");
