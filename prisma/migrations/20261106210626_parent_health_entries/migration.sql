-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Allergy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdBy" INTEGER,
    CONSTRAINT "Allergy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Allergy_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Allergy" ("childId", "description", "id", "severity") SELECT "childId", "description", "id", "severity" FROM "Allergy";
DROP TABLE "Allergy";
ALTER TABLE "new_Allergy" RENAME TO "Allergy";
CREATE TABLE "new_AuthorizedPickupPerson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdBy" INTEGER,
    CONSTRAINT "AuthorizedPickupPerson_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuthorizedPickupPerson_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuthorizedPickupPerson" ("childId", "id", "name", "phone", "relationship") SELECT "childId", "id", "name", "phone", "relationship" FROM "AuthorizedPickupPerson";
DROP TABLE "AuthorizedPickupPerson";
ALTER TABLE "new_AuthorizedPickupPerson" RENAME TO "AuthorizedPickupPerson";
CREATE TABLE "new_EmergencyContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdBy" INTEGER,
    CONSTRAINT "EmergencyContact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmergencyContact_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EmergencyContact" ("childId", "id", "name", "phone", "relationship") SELECT "childId", "id", "name", "phone", "relationship" FROM "EmergencyContact";
DROP TABLE "EmergencyContact";
ALTER TABLE "new_EmergencyContact" RENAME TO "EmergencyContact";
CREATE TABLE "new_FoodRestriction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" INTEGER,
    CONSTRAINT "FoodRestriction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FoodRestriction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FoodRestriction" ("childId", "description", "id") SELECT "childId", "description", "id" FROM "FoodRestriction";
DROP TABLE "FoodRestriction";
ALTER TABLE "new_FoodRestriction" RENAME TO "FoodRestriction";
CREATE TABLE "new_ParentInstruction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "childId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    CONSTRAINT "ParentInstruction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParentInstruction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ParentInstruction" ("childId", "content", "createdAt", "id") SELECT "childId", "content", "createdAt", "id" FROM "ParentInstruction";
DROP TABLE "ParentInstruction";
ALTER TABLE "new_ParentInstruction" RENAME TO "ParentInstruction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
