-- CreateTable
CREATE TABLE "INV_EquipmentCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "INV_StorageLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "locationType" TEXT NOT NULL DEFAULT 'SHELF',
    "locationArea" TEXT,
    "description" TEXT,
    "capacity" INTEGER,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "INV_SparePart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 5,
    "maxQuantity" INTEGER,
    "reorderPoint" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "supplierName" TEXT,
    "supplierContact" TEXT,
    "lastPurchaseDate" DATETIME,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "partNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "specifications" JSONB,
    "imagePath" TEXT,
    "images" JSONB,
    "documents" JSONB,
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isDamaged" BOOLEAN NOT NULL DEFAULT false,
    "damageDate" DATETIME,
    "damageReason" TEXT,
    "damageQuantity" INTEGER NOT NULL DEFAULT 0,
    "damageValue" REAL NOT NULL DEFAULT 0,
    "disposalDate" DATETIME,
    "disposalMethod" TEXT,
    "disposalApprovedBy" BIGINT,
    "compatibleEquipmentTypes" JSONB,
    "accountCode" TEXT,
    "costCenterId" INTEGER,
    "maintenanceTypeId" INTEGER,
    "averageLifespan" INTEGER,
    "responsibleEmployeeId" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "INV_SparePart_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "INV_EquipmentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePart_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePart_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_SparePartTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNumber" TEXT NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "fromLocationId" INTEGER,
    "toLocationId" INTEGER,
    "equipmentId" INTEGER,
    "projectId" INTEGER,
    "employeeId" INTEGER,
    "employeeName" TEXT,
    "employeeCode" TEXT,
    "invoiceNumber" TEXT,
    "supplierName" TEXT,
    "unitPrice" REAL,
    "totalCost" REAL,
    "reason" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    CONSTRAINT "INV_SparePartTransaction_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "INV_SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartTransaction_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_SparePartUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sparePartId" INTEGER NOT NULL,
    "equipmentId" INTEGER,
    "equipmentName" TEXT,
    "equipmentCode" TEXT,
    "projectId" INTEGER,
    "projectName" TEXT,
    "quantity" INTEGER NOT NULL,
    "installDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedLife" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'IN_USE',
    "replacedDate" DATETIME,
    "failureReason" TEXT,
    "installedBy" BIGINT,
    "installedByEmployeeId" INTEGER,
    "installedByName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "INV_SparePartUsage_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "INV_SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_installedByEmployeeId_fkey" FOREIGN KEY ("installedByEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_StockAlert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sparePartId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "alertLevel" TEXT NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "currentValue" INTEGER,
    "thresholdValue" INTEGER,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "INV_DamageRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recordNumber" TEXT NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "damageType" TEXT NOT NULL,
    "damageDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveredBy" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalValue" REAL NOT NULL,
    "damageReason" TEXT NOT NULL,
    "damageSeverity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRepairable" BOOLEAN NOT NULL DEFAULT false,
    "repairCost" REAL,
    "actionTaken" TEXT,
    "actionDate" DATETIME,
    "actionBy" BIGINT,
    "recoveredValue" REAL NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "photos" JSONB,
    "documents" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "INV_DamageRecord_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "INV_SparePart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "INV_EquipmentCategory_code_key" ON "INV_EquipmentCategory"("code");

-- CreateIndex
CREATE INDEX "INV_EquipmentCategory_code_idx" ON "INV_EquipmentCategory"("code");

-- CreateIndex
CREATE INDEX "INV_EquipmentCategory_isActive_idx" ON "INV_EquipmentCategory"("isActive");

-- CreateIndex
CREATE INDEX "INV_EquipmentCategory_orderIndex_idx" ON "INV_EquipmentCategory"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "INV_StorageLocation_code_key" ON "INV_StorageLocation"("code");

-- CreateIndex
CREATE INDEX "INV_StorageLocation_code_idx" ON "INV_StorageLocation"("code");

-- CreateIndex
CREATE INDEX "INV_StorageLocation_locationType_idx" ON "INV_StorageLocation"("locationType");

-- CreateIndex
CREATE INDEX "INV_StorageLocation_isActive_idx" ON "INV_StorageLocation"("isActive");

-- CreateIndex
CREATE INDEX "INV_StorageLocation_orderIndex_idx" ON "INV_StorageLocation"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "INV_SparePart_code_key" ON "INV_SparePart"("code");

-- CreateIndex
CREATE UNIQUE INDEX "INV_SparePart_barcode_key" ON "INV_SparePart"("barcode");

-- CreateIndex
CREATE INDEX "INV_SparePart_code_idx" ON "INV_SparePart"("code");

-- CreateIndex
CREATE INDEX "INV_SparePart_barcode_idx" ON "INV_SparePart"("barcode");

-- CreateIndex
CREATE INDEX "INV_SparePart_categoryId_idx" ON "INV_SparePart"("categoryId");

-- CreateIndex
CREATE INDEX "INV_SparePart_locationId_idx" ON "INV_SparePart"("locationId");

-- CreateIndex
CREATE INDEX "INV_SparePart_status_idx" ON "INV_SparePart"("status");

-- CreateIndex
CREATE INDEX "INV_SparePart_isActive_idx" ON "INV_SparePart"("isActive");

-- CreateIndex
CREATE INDEX "INV_SparePart_quantity_idx" ON "INV_SparePart"("quantity");

-- CreateIndex
CREATE INDEX "INV_SparePart_nameAr_idx" ON "INV_SparePart"("nameAr");

-- CreateIndex
CREATE INDEX "INV_SparePart_partNumber_idx" ON "INV_SparePart"("partNumber");

-- CreateIndex
CREATE INDEX "INV_SparePart_manufacturer_idx" ON "INV_SparePart"("manufacturer");

-- CreateIndex
CREATE INDEX "INV_SparePart_responsibleEmployeeId_idx" ON "INV_SparePart"("responsibleEmployeeId");

-- CreateIndex
CREATE INDEX "INV_SparePart_categoryId_status_idx" ON "INV_SparePart"("categoryId", "status");

-- CreateIndex
CREATE INDEX "INV_SparePart_locationId_status_idx" ON "INV_SparePart"("locationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "INV_SparePartTransaction_transactionNumber_key" ON "INV_SparePartTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_transactionNumber_idx" ON "INV_SparePartTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_sparePartId_idx" ON "INV_SparePartTransaction"("sparePartId");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_transactionType_idx" ON "INV_SparePartTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_transactionDate_idx" ON "INV_SparePartTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_createdBy_idx" ON "INV_SparePartTransaction"("createdBy");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_employeeId_idx" ON "INV_SparePartTransaction"("employeeId");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_equipmentId_idx" ON "INV_SparePartTransaction"("equipmentId");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_projectId_idx" ON "INV_SparePartTransaction"("projectId");

-- CreateIndex
CREATE INDEX "INV_SparePartTransaction_sparePartId_transactionDate_idx" ON "INV_SparePartTransaction"("sparePartId", "transactionDate");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_sparePartId_idx" ON "INV_SparePartUsage"("sparePartId");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_equipmentId_idx" ON "INV_SparePartUsage"("equipmentId");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_projectId_idx" ON "INV_SparePartUsage"("projectId");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_status_idx" ON "INV_SparePartUsage"("status");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_installDate_idx" ON "INV_SparePartUsage"("installDate");

-- CreateIndex
CREATE INDEX "INV_SparePartUsage_installedByEmployeeId_idx" ON "INV_SparePartUsage"("installedByEmployeeId");

-- CreateIndex
CREATE INDEX "INV_StockAlert_sparePartId_idx" ON "INV_StockAlert"("sparePartId");

-- CreateIndex
CREATE INDEX "INV_StockAlert_alertType_idx" ON "INV_StockAlert"("alertType");

-- CreateIndex
CREATE INDEX "INV_StockAlert_alertLevel_idx" ON "INV_StockAlert"("alertLevel");

-- CreateIndex
CREATE INDEX "INV_StockAlert_isResolved_idx" ON "INV_StockAlert"("isResolved");

-- CreateIndex
CREATE INDEX "INV_StockAlert_createdAt_idx" ON "INV_StockAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "INV_DamageRecord_recordNumber_key" ON "INV_DamageRecord"("recordNumber");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_recordNumber_idx" ON "INV_DamageRecord"("recordNumber");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_sparePartId_idx" ON "INV_DamageRecord"("sparePartId");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_damageType_idx" ON "INV_DamageRecord"("damageType");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_damageDate_idx" ON "INV_DamageRecord"("damageDate");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_approvalStatus_idx" ON "INV_DamageRecord"("approvalStatus");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_actionTaken_idx" ON "INV_DamageRecord"("actionTaken");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_discoveredBy_idx" ON "INV_DamageRecord"("discoveredBy");

-- CreateIndex
CREATE INDEX "INV_DamageRecord_sparePartId_damageDate_idx" ON "INV_DamageRecord"("sparePartId", "damageDate");
