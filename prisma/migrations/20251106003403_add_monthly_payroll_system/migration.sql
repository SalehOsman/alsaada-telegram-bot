-- CreateTable
CREATE TABLE "HR_MonthlyPayroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "actualWorkDays" INTEGER NOT NULL,
    "workDaysForAllowances" INTEGER NOT NULL,
    "daysBeforeHire" INTEGER NOT NULL DEFAULT 0,
    "daysAfterTermination" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "paidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "actualPresenceDays" INTEGER NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "proratedSalary" REAL NOT NULL DEFAULT 0,
    "housingAllowance" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "foodAllowance" REAL NOT NULL DEFAULT 0,
    "fieldAllowance" REAL NOT NULL DEFAULT 0,
    "materialAllowance" REAL NOT NULL DEFAULT 0,
    "totalAllowances" REAL NOT NULL DEFAULT 0,
    "totalBonuses" REAL NOT NULL DEFAULT 0,
    "totalLeaveAllowances" REAL NOT NULL DEFAULT 0,
    "totalAdvances" REAL NOT NULL DEFAULT 0,
    "totalWithdrawals" REAL NOT NULL DEFAULT 0,
    "totalDebts" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL DEFAULT 0,
    "totalDelayPenalties" REAL NOT NULL DEFAULT 0,
    "totalEarnings" REAL NOT NULL DEFAULT 0,
    "netSalary" REAL NOT NULL DEFAULT 0,
    "allowancesDetails" JSONB,
    "bonusesDetails" JSONB,
    "leaveAllowancesDetails" JSONB,
    "deductionsDetails" JSONB,
    "penaltiesDetails" JSONB,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "paymentNotes" TEXT,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "settledAt" DATETIME,
    "settledBy" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" BIGINT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HR_MonthlyPayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_employeeId_idx" ON "HR_MonthlyPayroll"("employeeId");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_month_year_idx" ON "HR_MonthlyPayroll"("month", "year");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_createdAt_idx" ON "HR_MonthlyPayroll"("createdAt");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_paymentStatus_idx" ON "HR_MonthlyPayroll"("paymentStatus");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_settlementStatus_idx" ON "HR_MonthlyPayroll"("settlementStatus");

-- CreateIndex
CREATE UNIQUE INDEX "HR_MonthlyPayroll_employeeId_month_year_key" ON "HR_MonthlyPayroll"("employeeId", "month", "year");
