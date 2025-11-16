-- CreateTable
CREATE TABLE "INV_OilsGreasesCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "prefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "INV_OilsGreasesItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "qrCode" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "quantity" REAL NOT NULL DEFAULT 0,
    "minQuantity" REAL NOT NULL DEFAULT 5,
    "maxQuantity" REAL,
    "reorderPoint" REAL,
    "unit" TEXT NOT NULL DEFAULT 'لتر',
    "supplierName" TEXT,
    "supplierContact" TEXT,
    "lastPurchaseDate" DATETIME,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "partNumber" TEXT,
    "manufacturer" TEXT,
    "specifications" JSONB,
    "imagePath" TEXT,
    "images" JSONB,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "expiryDate" DATETIME,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "INV_OilsGreasesItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "INV_OilsGreasesCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_OilsGreasesItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_OilsGreasesPurchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "supplierName" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME,
    "invoiceImagePath" TEXT,
    "receiptImagePath" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    CONSTRAINT "INV_OilsGreasesPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_OilsGreasesItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_OilsGreasesIssuance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "issuanceNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "issuedToEmployeeId" INTEGER,
    "issuedToEmployeeName" TEXT,
    "issuedToEquipmentId" INTEGER,
    "issuedToEquipmentCode" TEXT,
    "issuanceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    CONSTRAINT "INV_OilsGreasesIssuance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_OilsGreasesItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_OilsGreasesIssuance_issuedToEmployeeId_fkey" FOREIGN KEY ("issuedToEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_OilsGreasesIssuance_issuedToEquipmentId_fkey" FOREIGN KEY ("issuedToEquipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesCategory_code_key" ON "INV_OilsGreasesCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesCategory_prefix_key" ON "INV_OilsGreasesCategory"("prefix");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesCategory_code_idx" ON "INV_OilsGreasesCategory"("code");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesCategory_isActive_idx" ON "INV_OilsGreasesCategory"("isActive");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesCategory_displayOrder_idx" ON "INV_OilsGreasesCategory"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesItem_code_key" ON "INV_OilsGreasesItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesItem_barcode_key" ON "INV_OilsGreasesItem"("barcode");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_code_idx" ON "INV_OilsGreasesItem"("code");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_barcode_idx" ON "INV_OilsGreasesItem"("barcode");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_categoryId_idx" ON "INV_OilsGreasesItem"("categoryId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_locationId_idx" ON "INV_OilsGreasesItem"("locationId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_status_idx" ON "INV_OilsGreasesItem"("status");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_isActive_idx" ON "INV_OilsGreasesItem"("isActive");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_quantity_idx" ON "INV_OilsGreasesItem"("quantity");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_nameAr_idx" ON "INV_OilsGreasesItem"("nameAr");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_expiryDate_idx" ON "INV_OilsGreasesItem"("expiryDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_categoryId_status_idx" ON "INV_OilsGreasesItem"("categoryId", "status");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesItem_locationId_status_idx" ON "INV_OilsGreasesItem"("locationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesPurchase_purchaseNumber_key" ON "INV_OilsGreasesPurchase"("purchaseNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesPurchase_purchaseNumber_idx" ON "INV_OilsGreasesPurchase"("purchaseNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesPurchase_itemId_idx" ON "INV_OilsGreasesPurchase"("itemId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesPurchase_purchaseDate_idx" ON "INV_OilsGreasesPurchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesPurchase_createdBy_idx" ON "INV_OilsGreasesPurchase"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "INV_OilsGreasesIssuance_issuanceNumber_key" ON "INV_OilsGreasesIssuance"("issuanceNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_issuanceNumber_idx" ON "INV_OilsGreasesIssuance"("issuanceNumber");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_itemId_idx" ON "INV_OilsGreasesIssuance"("itemId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_issuanceDate_idx" ON "INV_OilsGreasesIssuance"("issuanceDate");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_createdBy_idx" ON "INV_OilsGreasesIssuance"("createdBy");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_issuedToEmployeeId_idx" ON "INV_OilsGreasesIssuance"("issuedToEmployeeId");

-- CreateIndex
CREATE INDEX "INV_OilsGreasesIssuance_issuedToEquipmentId_idx" ON "INV_OilsGreasesIssuance"("issuedToEquipmentId");
