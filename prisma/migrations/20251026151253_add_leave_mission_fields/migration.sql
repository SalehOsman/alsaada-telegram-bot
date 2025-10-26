/*
  Warnings:

  - Added the required column `leaveNumber` to the `HR_EmployeeLeave` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "HR_EmployeeMission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "missionNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "missionType" TEXT NOT NULL DEFAULT 'TASK_EXECUTION',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "allowanceAmount" REAL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "actualReturnDate" DATETIME,
    "notes" TEXT,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeMission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HR_EmployeeLeave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leaveNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'REGULAR',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "actualReturnDate" DATETIME,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "isPostponed" BOOLEAN NOT NULL DEFAULT false,
    "postponedTimes" INTEGER NOT NULL DEFAULT 0,
    "allowanceAmount" REAL,
    "allowanceSettled" BOOLEAN NOT NULL DEFAULT false,
    "medicalReportPath" TEXT,
    "affectsNextLeave" BOOLEAN NOT NULL DEFAULT true,
    "replacementId" INTEGER,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeLeave_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_EmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_EmployeeLeave" ("approvedAt", "approvedBy", "createdAt", "employeeId", "endDate", "id", "leaveType", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt") SELECT "approvedAt", "approvedBy", "createdAt", "employeeId", "endDate", "id", "leaveType", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt" FROM "HR_EmployeeLeave";
DROP TABLE "HR_EmployeeLeave";
ALTER TABLE "new_HR_EmployeeLeave" RENAME TO "HR_EmployeeLeave";
CREATE UNIQUE INDEX "HR_EmployeeLeave_leaveNumber_key" ON "HR_EmployeeLeave"("leaveNumber");
CREATE INDEX "HR_EmployeeLeave_employeeId_idx" ON "HR_EmployeeLeave"("employeeId");
CREATE INDEX "HR_EmployeeLeave_leaveNumber_idx" ON "HR_EmployeeLeave"("leaveNumber");
CREATE INDEX "HR_EmployeeLeave_leaveType_idx" ON "HR_EmployeeLeave"("leaveType");
CREATE INDEX "HR_EmployeeLeave_status_idx" ON "HR_EmployeeLeave"("status");
CREATE INDEX "HR_EmployeeLeave_isActive_idx" ON "HR_EmployeeLeave"("isActive");
CREATE INDEX "HR_EmployeeLeave_startDate_endDate_idx" ON "HR_EmployeeLeave"("startDate", "endDate");
CREATE INDEX "HR_EmployeeLeave_employeeId_isActive_idx" ON "HR_EmployeeLeave"("employeeId", "isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "HR_EmployeeMission_missionNumber_key" ON "HR_EmployeeMission"("missionNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_employeeId_idx" ON "HR_EmployeeMission"("employeeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_missionNumber_idx" ON "HR_EmployeeMission"("missionNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_missionType_idx" ON "HR_EmployeeMission"("missionType");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_status_idx" ON "HR_EmployeeMission"("status");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_isActive_idx" ON "HR_EmployeeMission"("isActive");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_startDate_endDate_idx" ON "HR_EmployeeMission"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_employeeId_isActive_idx" ON "HR_EmployeeMission"("employeeId", "isActive");
