/*
  Warnings:

  - You are about to drop the `HR_AttendanceException` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HR_EmployeeAdvance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HR_PayrollCycle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HR_WorkRotation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `payrollCycleId` on the `HR_Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "HR_AttendanceException_status_idx";

-- DropIndex
DROP INDEX "HR_AttendanceException_date_idx";

-- DropIndex
DROP INDEX "HR_AttendanceException_employeeId_idx";

-- DropIndex
DROP INDEX "HR_EmployeeAdvance_isPaid_idx";

-- DropIndex
DROP INDEX "HR_EmployeeAdvance_approvalStatus_idx";

-- DropIndex
DROP INDEX "HR_EmployeeAdvance_employeeId_idx";

-- DropIndex
DROP INDEX "HR_PayrollCycle_employeeId_cycleType_month_year_key";

-- DropIndex
DROP INDEX "HR_PayrollCycle_periodStart_periodEnd_idx";

-- DropIndex
DROP INDEX "HR_PayrollCycle_paymentStatus_idx";

-- DropIndex
DROP INDEX "HR_PayrollCycle_month_year_idx";

-- DropIndex
DROP INDEX "HR_PayrollCycle_cycleType_idx";

-- DropIndex
DROP INDEX "HR_PayrollCycle_employeeId_idx";

-- DropIndex
DROP INDEX "HR_WorkRotation_startDate_endDate_idx";

-- DropIndex
DROP INDEX "HR_WorkRotation_status_idx";

-- DropIndex
DROP INDEX "HR_WorkRotation_employeeId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_AttendanceException";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_EmployeeAdvance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_PayrollCycle";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_WorkRotation";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HR_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'CASH_ADVANCE',
    "itemId" INTEGER,
    "quantity" REAL,
    "unitPrice" REAL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" DATETIME,
    "settledBy" BIGINT,
    "isManuallySettled" BOOLEAN NOT NULL DEFAULT false,
    "manualSettlementType" TEXT,
    "manualSettlementNote" TEXT,
    "manuallySettledAt" DATETIME,
    "manuallySettledBy" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HR_Transaction" ("amount", "approvedAt", "approvedBy", "createdAt", "createdBy", "description", "employeeId", "id", "isManuallySettled", "isSettled", "itemId", "manualSettlementNote", "manualSettlementType", "manuallySettledAt", "manuallySettledBy", "notes", "quantity", "rejectionReason", "settledAt", "settledBy", "status", "transactionNumber", "transactionType", "unitPrice", "updatedAt", "updatedBy") SELECT "amount", "approvedAt", "approvedBy", "createdAt", "createdBy", "description", "employeeId", "id", "isManuallySettled", "isSettled", "itemId", "manualSettlementNote", "manualSettlementType", "manuallySettledAt", "manuallySettledBy", "notes", "quantity", "rejectionReason", "settledAt", "settledBy", "status", "transactionNumber", "transactionType", "unitPrice", "updatedAt", "updatedBy" FROM "HR_Transaction";
DROP TABLE "HR_Transaction";
ALTER TABLE "new_HR_Transaction" RENAME TO "HR_Transaction";
CREATE UNIQUE INDEX "HR_Transaction_transactionNumber_key" ON "HR_Transaction"("transactionNumber");
CREATE INDEX "HR_Transaction_employeeId_idx" ON "HR_Transaction"("employeeId");
CREATE INDEX "HR_Transaction_transactionNumber_idx" ON "HR_Transaction"("transactionNumber");
CREATE INDEX "HR_Transaction_transactionType_idx" ON "HR_Transaction"("transactionType");
CREATE INDEX "HR_Transaction_isSettled_idx" ON "HR_Transaction"("isSettled");
CREATE INDEX "HR_Transaction_isManuallySettled_idx" ON "HR_Transaction"("isManuallySettled");
CREATE INDEX "HR_Transaction_status_idx" ON "HR_Transaction"("status");
CREATE INDEX "HR_Transaction_createdAt_idx" ON "HR_Transaction"("createdAt");
CREATE INDEX "HR_Transaction_itemId_idx" ON "HR_Transaction"("itemId");
CREATE INDEX "HR_Transaction_employeeId_isSettled_idx" ON "HR_Transaction"("employeeId", "isSettled");
CREATE INDEX "HR_Transaction_employeeId_isManuallySettled_idx" ON "HR_Transaction"("employeeId", "isManuallySettled");
CREATE INDEX "HR_Transaction_employeeId_createdAt_idx" ON "HR_Transaction"("employeeId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
