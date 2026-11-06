-- CreateTable
CREATE TABLE "EducatorClassRoom" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "educatorId" INTEGER NOT NULL,
    "classRoomId" INTEGER NOT NULL,
    CONSTRAINT "EducatorClassRoom_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "EducatorProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EducatorClassRoom_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EducatorClassRoom_classRoomId_idx" ON "EducatorClassRoom"("classRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "EducatorClassRoom_educatorId_classRoomId_key" ON "EducatorClassRoom"("educatorId", "classRoomId");
