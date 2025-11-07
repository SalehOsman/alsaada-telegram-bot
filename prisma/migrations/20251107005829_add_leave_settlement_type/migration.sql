-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HR_EmployeeLeave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leaveNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'REGULAR',
    "settlementType" TEXT NOT NULL DEFAULT 'ACTUAL_LEAVE',
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
    "allowancePaidDate" DATETIME,
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
INSERT INTO "new_HR_EmployeeLeave" ("actualReturnDate", "affectsNextLeave", "allowanceAmount", "allowanceSettled", "approvedAt", "approvedBy", "createdAt", "delayDays", "employeeId", "endDate", "id", "isActive", "isPostponed", "leaveNumber", "leaveType", "medicalReportPath", "postponedTimes", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt") SELECT "actualReturnDate", "affectsNextLeave", "allowanceAmount", "allowanceSettled", "approvedAt", "approvedBy", "createdAt", "delayDays", "employeeId", "endDate", "id", "isActive", "isPostponed", "leaveNumber", "leaveType", "medicalReportPath", "postponedTimes", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt" FROM "HR_EmployeeLeave";
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
