-- CreateTable
CREATE TABLE "INV_ItemHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'SPARE_PART',
    "action" TEXT NOT NULL,
    "actionDetail" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "changedFields" JSONB,
    "performedBy" BIGINT NOT NULL,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "reason" TEXT,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "relatedRecordId" INTEGER,
    "relatedRecordType" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_INV_SparePart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "quantityNew" INTEGER NOT NULL DEFAULT 0,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "quantityRefurbished" INTEGER NOT NULL DEFAULT 0,
    "quantityImport" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_INV_SparePart" ("accountCode", "averageLifespan", "barcode", "categoryId", "code", "compatibleEquipmentTypes", "condition", "costCenterId", "createdAt", "createdBy", "currency", "damageDate", "damageQuantity", "damageReason", "damageValue", "description", "disposalApprovedBy", "disposalDate", "disposalMethod", "documents", "id", "imagePath", "images", "isActive", "isDamaged", "lastPurchaseDate", "locationId", "maintenanceTypeId", "manufacturer", "maxQuantity", "minQuantity", "model", "nameAr", "nameEn", "notes", "partNumber", "quantity", "reorderPoint", "responsibleEmployeeId", "specifications", "status", "supplierContact", "supplierName", "totalValue", "unit", "unitPrice", "updatedAt", "updatedBy", "yearFrom", "yearTo") SELECT "accountCode", "averageLifespan", "barcode", "categoryId", "code", "compatibleEquipmentTypes", "condition", "costCenterId", "createdAt", "createdBy", "currency", "damageDate", "damageQuantity", "damageReason", "damageValue", "description", "disposalApprovedBy", "disposalDate", "disposalMethod", "documents", "id", "imagePath", "images", "isActive", "isDamaged", "lastPurchaseDate", "locationId", "maintenanceTypeId", "manufacturer", "maxQuantity", "minQuantity", "model", "nameAr", "nameEn", "notes", "partNumber", "quantity", "reorderPoint", "responsibleEmployeeId", "specifications", "status", "supplierContact", "supplierName", "totalValue", "unit", "unitPrice", "updatedAt", "updatedBy", "yearFrom", "yearTo" FROM "INV_SparePart";
DROP TABLE "INV_SparePart";
ALTER TABLE "new_INV_SparePart" RENAME TO "INV_SparePart";
CREATE UNIQUE INDEX "INV_SparePart_code_key" ON "INV_SparePart"("code");
CREATE UNIQUE INDEX "INV_SparePart_barcode_key" ON "INV_SparePart"("barcode");
CREATE INDEX "INV_SparePart_code_idx" ON "INV_SparePart"("code");
CREATE INDEX "INV_SparePart_barcode_idx" ON "INV_SparePart"("barcode");
CREATE INDEX "INV_SparePart_categoryId_idx" ON "INV_SparePart"("categoryId");
CREATE INDEX "INV_SparePart_locationId_idx" ON "INV_SparePart"("locationId");
CREATE INDEX "INV_SparePart_status_idx" ON "INV_SparePart"("status");
CREATE INDEX "INV_SparePart_isActive_idx" ON "INV_SparePart"("isActive");
CREATE INDEX "INV_SparePart_quantity_idx" ON "INV_SparePart"("quantity");
CREATE INDEX "INV_SparePart_nameAr_idx" ON "INV_SparePart"("nameAr");
CREATE INDEX "INV_SparePart_partNumber_idx" ON "INV_SparePart"("partNumber");
CREATE INDEX "INV_SparePart_manufacturer_idx" ON "INV_SparePart"("manufacturer");
CREATE INDEX "INV_SparePart_responsibleEmployeeId_idx" ON "INV_SparePart"("responsibleEmployeeId");
CREATE INDEX "INV_SparePart_categoryId_status_idx" ON "INV_SparePart"("categoryId", "status");
CREATE INDEX "INV_SparePart_locationId_status_idx" ON "INV_SparePart"("locationId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "INV_ItemHistory_itemId_idx" ON "INV_ItemHistory"("itemId");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_itemType_idx" ON "INV_ItemHistory"("itemType");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_action_idx" ON "INV_ItemHistory"("action");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_performedBy_idx" ON "INV_ItemHistory"("performedBy");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_performedAt_idx" ON "INV_ItemHistory"("performedAt");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_itemId_performedAt_idx" ON "INV_ItemHistory"("itemId", "performedAt");

-- CreateIndex
CREATE INDEX "INV_ItemHistory_itemType_action_idx" ON "INV_ItemHistory"("itemType", "action");
