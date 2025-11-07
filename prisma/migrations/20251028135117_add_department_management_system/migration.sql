-- CreateTable
CREATE TABLE "HR_AdvanceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'وحدة',
    "category" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "HR_Transaction" (
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

-- CreateTable
CREATE TABLE "HR_TransactionSettlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionIds" JSONB NOT NULL,
    "settlementType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "totalAmount" REAL NOT NULL,
    "description" TEXT,
    "settledBy" BIGINT NOT NULL,
    "settledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "transactionId" INTEGER,
    CONSTRAINT "HR_TransactionSettlement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "HR_Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_TransactionChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionId" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL DEFAULT 'EDIT',
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT NOT NULL,
    "changedBy" BIGINT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "HR_TransactionChangeLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "HR_Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepartmentConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "DepartmentAdmin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepartmentAdmin_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DepartmentAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HR_AdvanceItem_code_key" ON "HR_AdvanceItem"("code");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_code_idx" ON "HR_AdvanceItem"("code");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_isActive_idx" ON "HR_AdvanceItem"("isActive");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_category_idx" ON "HR_AdvanceItem"("category");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_orderIndex_idx" ON "HR_AdvanceItem"("orderIndex");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_nameAr_idx" ON "HR_AdvanceItem"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Transaction_transactionNumber_key" ON "HR_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_idx" ON "HR_Transaction"("employeeId");

-- CreateIndex
CREATE INDEX "HR_Transaction_transactionNumber_idx" ON "HR_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "HR_Transaction_transactionType_idx" ON "HR_Transaction"("transactionType");

-- CreateIndex
CREATE INDEX "HR_Transaction_isSettled_idx" ON "HR_Transaction"("isSettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_status_idx" ON "HR_Transaction"("status");

-- CreateIndex
CREATE INDEX "HR_Transaction_createdAt_idx" ON "HR_Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "HR_Transaction_itemId_idx" ON "HR_Transaction"("itemId");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_isSettled_idx" ON "HR_Transaction"("employeeId", "isSettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_createdAt_idx" ON "HR_Transaction"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settledBy_idx" ON "HR_TransactionSettlement"("settledBy");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settlementType_idx" ON "HR_TransactionSettlement"("settlementType");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settledAt_idx" ON "HR_TransactionSettlement"("settledAt");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_createdAt_idx" ON "HR_TransactionSettlement"("createdAt");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_transactionId_idx" ON "HR_TransactionChangeLog"("transactionId");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changeType_idx" ON "HR_TransactionChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changedBy_idx" ON "HR_TransactionChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changedAt_idx" ON "HR_TransactionChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_transactionId_changedAt_idx" ON "HR_TransactionChangeLog"("transactionId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentConfig_code_key" ON "DepartmentConfig"("code");

-- CreateIndex
CREATE INDEX "DepartmentConfig_code_idx" ON "DepartmentConfig"("code");

-- CreateIndex
CREATE INDEX "DepartmentConfig_isEnabled_idx" ON "DepartmentConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_departmentId_idx" ON "DepartmentAdmin"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_userId_idx" ON "DepartmentAdmin"("userId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_telegramId_idx" ON "DepartmentAdmin"("telegramId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_isActive_idx" ON "DepartmentAdmin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentAdmin_departmentId_userId_key" ON "DepartmentAdmin"("departmentId", "userId");
