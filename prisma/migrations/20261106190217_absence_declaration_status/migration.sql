-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AbsenceDeclaration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attendanceId" INTEGER NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "declaredByUserId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expectedReturnDate" DATETIME,
    CONSTRAINT "AbsenceDeclaration_declaredByUserId_fkey" FOREIGN KEY ("declaredByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclaration_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AbsenceDeclaration" ("attendanceId", "declaredByUserId", "description", "expectedReturnDate", "id", "reason", "source") SELECT "attendanceId", "declaredByUserId", "description", "expectedReturnDate", "id", "reason", "source" FROM "AbsenceDeclaration";
DROP TABLE "AbsenceDeclaration";
ALTER TABLE "new_AbsenceDeclaration" RENAME TO "AbsenceDeclaration";
CREATE UNIQUE INDEX "AbsenceDeclaration_attendanceId_key" ON "AbsenceDeclaration"("attendanceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
