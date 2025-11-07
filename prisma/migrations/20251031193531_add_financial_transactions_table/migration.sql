-- CreateTable
CREATE TABLE "HR_FinancialTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "cashAmount" REAL,
    "itemId" INTEGER,
    "quantity" REAL,
    "unitPrice" REAL,
    "totalValue" REAL NOT NULL,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "notes" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "payrollCycleId" INTEGER,
    "settlementDate" DATETIME,
    "settlementNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_FinancialTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_FinancialTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_FinancialTransaction_payrollCycleId_fkey" FOREIGN KEY ("payrollCycleId") REFERENCES "HR_PayrollCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_employeeId_idx" ON "HR_FinancialTransaction"("employeeId");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_transactionType_idx" ON "HR_FinancialTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_transactionDate_idx" ON "HR_FinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_isSettled_idx" ON "HR_FinancialTransaction"("isSettled");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_payrollCycleId_idx" ON "HR_FinancialTransaction"("payrollCycleId");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_status_idx" ON "HR_FinancialTransaction"("status");

-- CreateIndex
CREATE INDEX "HR_FinancialTransaction_itemId_idx" ON "HR_FinancialTransaction"("itemId");
