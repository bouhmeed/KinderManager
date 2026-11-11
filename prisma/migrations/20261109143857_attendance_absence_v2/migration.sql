-- CreateTable
CREATE TABLE "AbsenceDeclarationDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "declarationId" INTEGER NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" INTEGER,
    "verifiedAt" DATETIME,
    "note" TEXT,
    CONSTRAINT "AbsenceDeclarationDay_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "AbsenceDeclaration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclarationDay_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclarationDay_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceHistory_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceHistory_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AbsenceDeclaration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "declaredByUserId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reviewedBy" INTEGER,
    "reviewedAt" DATETIME,
    CONSTRAINT "AbsenceDeclaration_declaredByUserId_fkey" FOREIGN KEY ("declaredByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclaration_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclaration_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Preserve the old declaration -> attendance mapping before the old table is dropped
CREATE TEMP TABLE "_decl_map" AS
SELECT d."id" AS "declarationId", d."attendanceId", d."status" AS "declStatus", d."reviewedBy", d."reviewedAt"
FROM "AbsenceDeclaration" d;

-- Migrate declarations: childId/date come from the linked Attendance row;
-- single-day declarations become startDate = endDate = attendance.date
INSERT INTO "new_AbsenceDeclaration" ("id", "childId", "declaredByUserId", "source", "reason", "description", "status", "startDate", "endDate", "reviewedBy", "reviewedAt")
SELECT d."id", a."childId", d."declaredByUserId", d."source", d."reason", d."description", d."status", a."date", a."date", d."reviewedBy", d."reviewedAt"
FROM "AbsenceDeclaration" d
JOIN "Attendance" a ON a."id" = d."attendanceId";

DROP TABLE "AbsenceDeclaration";
ALTER TABLE "new_AbsenceDeclaration" RENAME TO "AbsenceDeclaration";

-- Recreate one declaration day per migrated declaration (all legacy declarations are single-day)
INSERT INTO "AbsenceDeclarationDay" ("declarationId", "attendanceId", "date", "status", "verifiedBy", "verifiedAt", "note")
SELECT m."declarationId", m."attendanceId", a."date",
       CASE m."declStatus"
         WHEN 'APPROVED' THEN 'CONFIRMED'
         WHEN 'REJECTED' THEN 'NOT_APPLICABLE'
         ELSE 'PENDING'
       END,
       CASE WHEN m."declStatus" = 'APPROVED' THEN m."reviewedBy" ELSE NULL END,
       CASE WHEN m."declStatus" = 'APPROVED' THEN m."reviewedAt" ELSE NULL END,
       NULL
FROM "_decl_map" m
JOIN "Attendance" a ON a."id" = m."attendanceId";

DROP TABLE "_decl_map";

CREATE INDEX "AbsenceDeclaration_status_idx" ON "AbsenceDeclaration"("status");
CREATE INDEX "AbsenceDeclaration_declaredByUserId_idx" ON "AbsenceDeclaration"("declaredByUserId");
CREATE INDEX "AbsenceDeclaration_childId_idx" ON "AbsenceDeclaration"("childId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceDeclarationDay_attendanceId_key" ON "AbsenceDeclarationDay"("attendanceId");

-- CreateIndex
CREATE INDEX "AbsenceDeclarationDay_date_idx" ON "AbsenceDeclarationDay"("date");

-- CreateIndex
CREATE INDEX "AbsenceDeclarationDay_verifiedBy_idx" ON "AbsenceDeclarationDay"("verifiedBy");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceDeclarationDay_declarationId_date_key" ON "AbsenceDeclarationDay"("declarationId", "date");

-- CreateIndex
CREATE INDEX "AttendanceHistory_childId_idx" ON "AttendanceHistory"("childId");

-- CreateIndex
CREATE INDEX "AttendanceHistory_attendanceId_idx" ON "AttendanceHistory"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceHistory_date_idx" ON "AttendanceHistory"("date");

-- CreateIndex
CREATE INDEX "AttendanceHistory_changedBy_idx" ON "AttendanceHistory"("changedBy");
