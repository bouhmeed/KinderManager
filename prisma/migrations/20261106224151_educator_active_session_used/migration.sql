-- AlterTable
ALTER TABLE "Session" ADD COLUMN "lastUsedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EducatorProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EducatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EducatorProfile" ("id", "phone", "userId") SELECT "id", "phone", "userId" FROM "EducatorProfile";
DROP TABLE "EducatorProfile";
ALTER TABLE "new_EducatorProfile" RENAME TO "EducatorProfile";
CREATE UNIQUE INDEX "EducatorProfile_userId_key" ON "EducatorProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
