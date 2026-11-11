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
    "reviewedBy" INTEGER,
    "reviewedAt" DATETIME,
    CONSTRAINT "AbsenceDeclaration_declaredByUserId_fkey" FOREIGN KEY ("declaredByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclaration_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AbsenceDeclaration_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AbsenceDeclaration" ("attendanceId", "declaredByUserId", "description", "expectedReturnDate", "id", "reason", "source", "status") SELECT "attendanceId", "declaredByUserId", "description", "expectedReturnDate", "id", "reason", "source", "status" FROM "AbsenceDeclaration";
DROP TABLE "AbsenceDeclaration";
ALTER TABLE "new_AbsenceDeclaration" RENAME TO "AbsenceDeclaration";
CREATE UNIQUE INDEX "AbsenceDeclaration_attendanceId_key" ON "AbsenceDeclaration"("attendanceId");
CREATE INDEX "AbsenceDeclaration_status_idx" ON "AbsenceDeclaration"("status");
CREATE INDEX "AbsenceDeclaration_declaredByUserId_idx" ON "AbsenceDeclaration"("declaredByUserId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);
INSERT INTO "new_User" ("email", "id", "isActive", "name", "passwordHash", "role") SELECT "email", "id", "isActive", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Child_classRoomId_idx" ON "Child"("classRoomId");

-- CreateIndex
CREATE INDEX "Child_enrollmentStatus_idx" ON "Child"("enrollmentStatus");

-- CreateIndex
CREATE INDEX "ChildGuardian_guardianId_idx" ON "ChildGuardian"("guardianId");

-- CreateIndex
CREATE INDEX "FoundObject_status_idx" ON "FoundObject"("status");

-- CreateIndex
CREATE INDEX "FoundObject_foundDate_idx" ON "FoundObject"("foundDate");

-- CreateIndex
CREATE INDEX "Invoice_childId_idx" ON "Invoice"("childId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_issueDate_idx" ON "Invoice"("issueDate");

-- CreateIndex
CREATE INDEX "LostItemReport_status_idx" ON "LostItemReport"("status");

-- CreateIndex
CREATE INDEX "LostItemReport_childId_idx" ON "LostItemReport"("childId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_childId_idx" ON "Request"("childId");

-- CreateIndex
CREATE INDEX "Request_createdBy_idx" ON "Request"("createdBy");
