/*
  Warnings:

  - You are about to drop the `HR_MonthlyPayroll` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_MonthlyPayroll";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "HR_AllowanceType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HR_PositionAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "allowanceTypeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_PositionAllowance_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "HR_Position" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_PositionAllowance_allowanceTypeId_fkey" FOREIGN KEY ("allowanceTypeId") REFERENCES "HR_AllowanceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_EmployeeAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "allowanceTypeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "overridePosition" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_EmployeeAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_EmployeeAllowance_allowanceTypeId_fkey" FOREIGN KEY ("allowanceTypeId") REFERENCES "HR_AllowanceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_MaterialEntitlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "dailyQuantity" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_MaterialEntitlement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_Bonus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bonusType" TEXT NOT NULL,
    "targetId" INTEGER,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "HR_PayrollCycle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "cycleType" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "workDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "vacationAllowance" REAL NOT NULL DEFAULT 0,
    "overtimeAllowance" REAL NOT NULL DEFAULT 0,
    "otherAllowances" REAL NOT NULL DEFAULT 0,
    "materialEntitlement" REAL NOT NULL DEFAULT 0,
    "bonuses" REAL NOT NULL DEFAULT 0,
    "totalEarnings" REAL NOT NULL,
    "advances" REAL NOT NULL DEFAULT 0,
    "materialWithdrawals" REAL NOT NULL DEFAULT 0,
    "delayPenalties" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "previousSettlement" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL,
    "netSalary" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" DATETIME,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "calculationDetails" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    CONSTRAINT "HR_PayrollCycle_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HR_AllowanceType_code_key" ON "HR_AllowanceType"("code");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_code_idx" ON "HR_AllowanceType"("code");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_isActive_idx" ON "HR_AllowanceType"("isActive");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_orderIndex_idx" ON "HR_AllowanceType"("orderIndex");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_positionId_idx" ON "HR_PositionAllowance"("positionId");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_allowanceTypeId_idx" ON "HR_PositionAllowance"("allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_isActive_idx" ON "HR_PositionAllowance"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_PositionAllowance_positionId_allowanceTypeId_key" ON "HR_PositionAllowance"("positionId", "allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_employeeId_idx" ON "HR_EmployeeAllowance"("employeeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_allowanceTypeId_idx" ON "HR_EmployeeAllowance"("allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_isActive_idx" ON "HR_EmployeeAllowance"("isActive");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_startDate_endDate_idx" ON "HR_EmployeeAllowance"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_targetType_targetId_idx" ON "HR_MaterialEntitlement"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_itemId_idx" ON "HR_MaterialEntitlement"("itemId");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_isActive_idx" ON "HR_MaterialEntitlement"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_MaterialEntitlement_targetType_targetId_itemId_key" ON "HR_MaterialEntitlement"("targetType", "targetId", "itemId");

-- CreateIndex
CREATE INDEX "HR_Bonus_bonusType_idx" ON "HR_Bonus"("bonusType");

-- CreateIndex
CREATE INDEX "HR_Bonus_targetId_idx" ON "HR_Bonus"("targetId");

-- CreateIndex
CREATE INDEX "HR_Bonus_isActive_idx" ON "HR_Bonus"("isActive");

-- CreateIndex
CREATE INDEX "HR_Bonus_startDate_endDate_idx" ON "HR_Bonus"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_PayrollCycle_employeeId_idx" ON "HR_PayrollCycle"("employeeId");

-- CreateIndex
CREATE INDEX "HR_PayrollCycle_cycleType_idx" ON "HR_PayrollCycle"("cycleType");

-- CreateIndex
CREATE INDEX "HR_PayrollCycle_month_year_idx" ON "HR_PayrollCycle"("month", "year");

-- CreateIndex
CREATE INDEX "HR_PayrollCycle_paymentStatus_idx" ON "HR_PayrollCycle"("paymentStatus");

-- CreateIndex
CREATE INDEX "HR_PayrollCycle_periodStart_periodEnd_idx" ON "HR_PayrollCycle"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "HR_PayrollCycle_employeeId_cycleType_month_year_key" ON "HR_PayrollCycle"("employeeId", "cycleType", "month", "year");
