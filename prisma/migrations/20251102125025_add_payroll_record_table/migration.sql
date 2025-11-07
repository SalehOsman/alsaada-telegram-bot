-- CreateTable
CREATE TABLE "HR_PayrollRecord" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT,
    CONSTRAINT "HR_PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_employeeId_idx" ON "HR_PayrollRecord"("employeeId");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_month_year_idx" ON "HR_PayrollRecord"("month", "year");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_createdAt_idx" ON "HR_PayrollRecord"("createdAt");
