-- CreateTable
CREATE TABLE "INV_InventoryAudit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditNumber" TEXT NOT NULL,
    "warehouseType" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "categoryId" INTEGER,
    "locationId" INTEGER,
    "itemId" INTEGER,
    "itemCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "itemsChecked" INTEGER NOT NULL DEFAULT 0,
    "itemsWithDiff" INTEGER NOT NULL DEFAULT 0,
    "totalShortage" INTEGER NOT NULL DEFAULT 0,
    "totalSurplus" INTEGER NOT NULL DEFAULT 0,
    "auditDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" DATETIME,
    "createdBy" BIGINT NOT NULL,
    "completedBy" BIGINT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "INV_InventoryAuditItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "systemDetails" JSONB,
    "actualDetails" JSONB,
    "locationId" INTEGER,
    "locationName" TEXT,
    "categoryId" INTEGER,
    "categoryName" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyType" TEXT,
    "notes" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "INV_InventoryAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "INV_InventoryAudit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "INV_InventoryAudit_auditNumber_key" ON "INV_InventoryAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditNumber_idx" ON "INV_InventoryAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_warehouseType_idx" ON "INV_InventoryAudit"("warehouseType");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_status_idx" ON "INV_InventoryAudit"("status");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditType_idx" ON "INV_InventoryAudit"("auditType");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditDate_idx" ON "INV_InventoryAudit"("auditDate");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_createdBy_idx" ON "INV_InventoryAudit"("createdBy");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_warehouseType_status_idx" ON "INV_InventoryAudit"("warehouseType", "status");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_warehouseType_auditDate_idx" ON "INV_InventoryAudit"("warehouseType", "auditDate");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_auditId_idx" ON "INV_InventoryAuditItem"("auditId");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_itemType_idx" ON "INV_InventoryAuditItem"("itemType");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_itemId_idx" ON "INV_InventoryAuditItem"("itemId");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_hasDiscrepancy_idx" ON "INV_InventoryAuditItem"("hasDiscrepancy");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_discrepancyType_idx" ON "INV_InventoryAuditItem"("discrepancyType");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_auditId_itemType_idx" ON "INV_InventoryAuditItem"("auditId", "itemType");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_auditId_hasDiscrepancy_idx" ON "INV_InventoryAuditItem"("auditId", "hasDiscrepancy");
