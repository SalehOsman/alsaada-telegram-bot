/*
  Warnings:

  - You are about to drop the column `endDate` on the `HR_Bonus` table. All the data in the column will be lost.
  - You are about to drop the column `isPermanent` on the `HR_Bonus` table. All the data in the column will be lost.
  - Added the required column `bonusName` to the `HR_Bonus` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HR_Bonus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bonusType" TEXT NOT NULL,
    "targetId" INTEGER,
    "bonusName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "durationMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME
);
INSERT INTO "new_HR_Bonus" ("amount", "approvedAt", "approvedBy", "bonusType", "createdAt", "createdBy", "description", "id", "isActive", "startDate", "targetId", "updatedAt") SELECT "amount", "approvedAt", "approvedBy", "bonusType", "createdAt", "createdBy", "description", "id", "isActive", "startDate", "targetId", "updatedAt" FROM "HR_Bonus";
DROP TABLE "HR_Bonus";
ALTER TABLE "new_HR_Bonus" RENAME TO "HR_Bonus";
CREATE INDEX "HR_Bonus_bonusType_idx" ON "HR_Bonus"("bonusType");
CREATE INDEX "HR_Bonus_targetId_idx" ON "HR_Bonus"("targetId");
CREATE INDEX "HR_Bonus_isActive_idx" ON "HR_Bonus"("isActive");
CREATE INDEX "HR_Bonus_startDate_idx" ON "HR_Bonus"("startDate");
CREATE INDEX "HR_Bonus_durationMonths_idx" ON "HR_Bonus"("durationMonths");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
