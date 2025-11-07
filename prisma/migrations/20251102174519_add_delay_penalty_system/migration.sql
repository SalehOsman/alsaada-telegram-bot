-- CreateTable
CREATE TABLE "HR_DelayPenaltyPolicy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "delayDays" INTEGER NOT NULL,
    "penaltyType" TEXT NOT NULL,
    "deductionDays" REAL,
    "suspensionDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "HR_AppliedPenalty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leaveId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "policyId" INTEGER,
    "penaltyType" TEXT NOT NULL,
    "deductionDays" REAL,
    "suspensionDays" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "cancelledBy" BIGINT,
    "cancelledAt" DATETIME,
    "isAppliedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "payrollRecordId" INTEGER,
    "appliedToPayrollAt" DATETIME,
    "createdBy" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notes" TEXT,
    CONSTRAINT "HR_AppliedPenalty_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "HR_EmployeeLeave" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "HR_DelayPenaltyPolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "HR_PayrollRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HR_DelayPenaltyPolicy_delayDays_key" ON "HR_DelayPenaltyPolicy"("delayDays");

-- CreateIndex
CREATE INDEX "HR_DelayPenaltyPolicy_delayDays_idx" ON "HR_DelayPenaltyPolicy"("delayDays");

-- CreateIndex
CREATE INDEX "HR_DelayPenaltyPolicy_isActive_idx" ON "HR_DelayPenaltyPolicy"("isActive");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_leaveId_idx" ON "HR_AppliedPenalty"("leaveId");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_employeeId_idx" ON "HR_AppliedPenalty"("employeeId");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_status_idx" ON "HR_AppliedPenalty"("status");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_isCancelled_idx" ON "HR_AppliedPenalty"("isCancelled");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_isAppliedToPayroll_idx" ON "HR_AppliedPenalty"("isAppliedToPayroll");
