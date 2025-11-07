-- CreateTable
CREATE TABLE "HR_PayrollAuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payrollRecordId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actionBy" BIGINT NOT NULL,
    "actionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldData" JSONB,
    "newData" JSONB,
    "changes" JSONB,
    "notes" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "HR_PayrollAuditLog_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "HR_PayrollRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HR_PayrollRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "positionTitle" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStartDate" DATETIME NOT NULL,
    "periodEndDate" DATETIME NOT NULL,
    "settlementType" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "workDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "totalAllowances" REAL NOT NULL DEFAULT 0,
    "totalBonuses" REAL NOT NULL DEFAULT 0,
    "materialAllowance" REAL NOT NULL DEFAULT 0,
    "grossSalary" REAL NOT NULL,
    "cashAdvances" REAL NOT NULL DEFAULT 0,
    "itemWithdrawals" REAL NOT NULL DEFAULT 0,
    "absenceDeductions" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL,
    "netSalary" REAL NOT NULL,
    "allowancesDetails" JSONB,
    "bonusesDetails" JSONB,
    "deductionsDetails" JSONB,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "paymentNotes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" BIGINT,
    "deleteReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_PayrollRecord" ("absenceDeductions", "allowancesDetails", "basicSalary", "bonusesDetails", "cashAdvances", "createdAt", "createdBy", "deductionsDetails", "employeeCode", "employeeId", "employeeName", "grossSalary", "id", "itemWithdrawals", "leaveDays", "materialAllowance", "month", "netSalary", "otherDeductions", "periodEndDate", "periodStartDate", "positionTitle", "settlementType", "totalAllowances", "totalBonuses", "totalDays", "totalDeductions", "workDays", "year") SELECT "absenceDeductions", "allowancesDetails", "basicSalary", "bonusesDetails", "cashAdvances", "createdAt", "createdBy", "deductionsDetails", "employeeCode", "employeeId", "employeeName", "grossSalary", "id", "itemWithdrawals", "leaveDays", "materialAllowance", "month", "netSalary", "otherDeductions", "periodEndDate", "periodStartDate", "positionTitle", "settlementType", "totalAllowances", "totalBonuses", "totalDays", "totalDeductions", "workDays", "year" FROM "HR_PayrollRecord";
DROP TABLE "HR_PayrollRecord";
ALTER TABLE "new_HR_PayrollRecord" RENAME TO "HR_PayrollRecord";
CREATE INDEX "HR_PayrollRecord_employeeId_idx" ON "HR_PayrollRecord"("employeeId");
CREATE INDEX "HR_PayrollRecord_month_year_idx" ON "HR_PayrollRecord"("month", "year");
CREATE INDEX "HR_PayrollRecord_createdAt_idx" ON "HR_PayrollRecord"("createdAt");
CREATE INDEX "HR_PayrollRecord_paymentStatus_idx" ON "HR_PayrollRecord"("paymentStatus");
CREATE UNIQUE INDEX "HR_PayrollRecord_employeeId_month_year_key" ON "HR_PayrollRecord"("employeeId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_payrollRecordId_idx" ON "HR_PayrollAuditLog"("payrollRecordId");

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_actionBy_idx" ON "HR_PayrollAuditLog"("actionBy");

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_actionAt_idx" ON "HR_PayrollAuditLog"("actionAt");
