-- CreateTable
CREATE TABLE "INV_OilsGreasesTransfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transferNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "fromLocationId" INTEGER NOT NULL,
    "toLocationId" INTEGER NOT NULL,
    "transferDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "INV_OilsGreasesReturn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "returnedByEmployeeId" INTEGER,
    "returnedByEmployeeName" TEXT,
    "returnedByEquipmentId" INTEGER,
    "returnedByEquipmentCode" TEXT,
    "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "INV_OilsGreasesAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adjustmentNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantityBefore" REAL NOT NULL,
    "quantityAfter" REAL NOT NULL,
    "quantityDifference" REAL NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesTransfer_transferNumber_key" ON "INV_OilsGreasesTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_transferNumber_idx" ON "INV_OilsGreasesTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_itemId_idx" ON "INV_OilsGreasesTransfer"("itemId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_transferDate_idx" ON "INV_OilsGreasesTransfer"("transferDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_createdBy_idx" ON "INV_OilsGreasesTransfer"("createdBy");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_fromLocationId_idx" ON "INV_OilsGreasesTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesTransfer_toLocationId_idx" ON "INV_OilsGreasesTransfer"("toLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesReturn_returnNumber_key" ON "INV_OilsGreasesReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_returnNumber_idx" ON "INV_OilsGreasesReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_itemId_idx" ON "INV_OilsGreasesReturn"("itemId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_returnDate_idx" ON "INV_OilsGreasesReturn"("returnDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_createdBy_idx" ON "INV_OilsGreasesReturn"("createdBy");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_returnedByEmployeeId_idx" ON "INV_OilsGreasesReturn"("returnedByEmployeeId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesReturn_returnedByEquipmentId_idx" ON "INV_OilsGreasesReturn"("returnedByEquipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesAdjustment_adjustmentNumber_key" ON "INV_OilsGreasesAdjustment"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_adjustmentNumber_idx" ON "INV_OilsGreasesAdjustment"("adjustmentNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_itemId_idx" ON "INV_OilsGreasesAdjustment"("itemId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_adjustmentDate_idx" ON "INV_OilsGreasesAdjustment"("adjustmentDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_adjustmentType_idx" ON "INV_OilsGreasesAdjustment"("adjustmentType");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_createdBy_idx" ON "INV_OilsGreasesAdjustment"("createdBy");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesAdjustment_approvedBy_idx" ON "INV_OilsGreasesAdjustment"("approvedBy");
