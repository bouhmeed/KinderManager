/*
  Warnings:

  - You are about to drop the `ChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChildChecklistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChildNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChildObservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventExternalProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExternalProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FoundObject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LostItemReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Observation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RegistrationChecklist` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChecklistItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChildChecklistItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChildNote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChildObservation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClassActivity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Event";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EventExternalProvider";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExternalProvider";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FoundObject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LostItemReport";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Observation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RegistrationChecklist";
PRAGMA foreign_keys=on;
