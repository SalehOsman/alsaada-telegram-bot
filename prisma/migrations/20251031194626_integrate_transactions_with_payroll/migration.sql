/*
  Warnings:

  - You are about to drop the `HR_FinancialTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "HR_FinancialTransaction_itemId_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_status_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_payrollCycleId_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_isSettled_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_transactionDate_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_transactionType_idx";

-- DropIndex
DROP INDEX "HR_FinancialTransaction_employeeId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HR_FinancialTransaction";
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
    "payrollCycleId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_Transaction_payrollCycleId_fkey" FOREIGN KEY ("payrollCycleId") REFERENCES "HR_PayrollCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HR_Transaction" ("amount", "approvedAt", "approvedBy", "createdAt", "createdBy", "description", "employeeId", "id", "isSettled", "itemId", "notes", "quantity", "rejectionReason", "settledAt", "settledBy", "status", "transactionNumber", "transactionType", "unitPrice", "updatedAt", "updatedBy") SELECT "amount", "approvedAt", "approvedBy", "createdAt", "createdBy", "description", "employeeId", "id", "isSettled", "itemId", "notes", "quantity", "rejectionReason", "settledAt", "settledBy", "status", "transactionNumber", "transactionType", "unitPrice", "updatedAt", "updatedBy" FROM "HR_Transaction";
DROP TABLE "HR_Transaction";
ALTER TABLE "new_HR_Transaction" RENAME TO "HR_Transaction";
CREATE UNIQUE INDEX "HR_Transaction_transactionNumber_key" ON "HR_Transaction"("transactionNumber");
CREATE INDEX "HR_Transaction_employeeId_idx" ON "HR_Transaction"("employeeId");
CREATE INDEX "HR_Transaction_transactionNumber_idx" ON "HR_Transaction"("transactionNumber");
CREATE INDEX "HR_Transaction_transactionType_idx" ON "HR_Transaction"("transactionType");
CREATE INDEX "HR_Transaction_isSettled_idx" ON "HR_Transaction"("isSettled");
CREATE INDEX "HR_Transaction_payrollCycleId_idx" ON "HR_Transaction"("payrollCycleId");
CREATE INDEX "HR_Transaction_status_idx" ON "HR_Transaction"("status");
CREATE INDEX "HR_Transaction_createdAt_idx" ON "HR_Transaction"("createdAt");
CREATE INDEX "HR_Transaction_itemId_idx" ON "HR_Transaction"("itemId");
CREATE INDEX "HR_Transaction_employeeId_isSettled_idx" ON "HR_Transaction"("employeeId", "isSettled");
CREATE INDEX "HR_Transaction_employeeId_createdAt_idx" ON "HR_Transaction"("employeeId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
