-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_INV_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "categoryId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "unitCapacity" REAL,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "minQuantity" REAL NOT NULL DEFAULT 5,
    "quantity" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "supplierName" TEXT,
    "supplierContact" TEXT,
    "partNumber" TEXT,
    "manufacturer" TEXT,
    "specifications" JSONB,
    "imagePath" TEXT,
    "images" JSONB,
    "documents" JSONB,
    "responsibleEmployeeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "INV_Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "INV_Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Item_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_INV_Item" ("barcode", "categoryId", "code", "createdAt", "createdBy", "description", "documents", "id", "imagePath", "images", "isActive", "manufacturer", "minQuantity", "nameAr", "nameEn", "notes", "partNumber", "responsibleEmployeeId", "specifications", "supplierContact", "supplierName", "unit", "unitCapacity", "unitPrice", "updatedAt", "updatedBy") SELECT "barcode", "categoryId", "code", "createdAt", "createdBy", "description", "documents", "id", "imagePath", "images", "isActive", "manufacturer", "minQuantity", "nameAr", "nameEn", "notes", "partNumber", "responsibleEmployeeId", "specifications", "supplierContact", "supplierName", "unit", "unitCapacity", "unitPrice", "updatedAt", "updatedBy" FROM "INV_Item";
DROP TABLE "INV_Item";
ALTER TABLE "new_INV_Item" RENAME TO "INV_Item";
CREATE UNIQUE INDEX "INV_Item_code_key" ON "INV_Item"("code");
CREATE UNIQUE INDEX "INV_Item_barcode_key" ON "INV_Item"("barcode");
CREATE INDEX "INV_Item_code_idx" ON "INV_Item"("code");
CREATE INDEX "INV_Item_barcode_idx" ON "INV_Item"("barcode");
CREATE INDEX "INV_Item_categoryId_idx" ON "INV_Item"("categoryId");
CREATE INDEX "INV_Item_locationId_idx" ON "INV_Item"("locationId");
CREATE INDEX "INV_Item_isActive_idx" ON "INV_Item"("isActive");
CREATE INDEX "INV_Item_nameAr_idx" ON "INV_Item"("nameAr");
CREATE INDEX "INV_Item_partNumber_idx" ON "INV_Item"("partNumber");
CREATE INDEX "INV_Item_manufacturer_idx" ON "INV_Item"("manufacturer");
CREATE INDEX "INV_Item_responsibleEmployeeId_idx" ON "INV_Item"("responsibleEmployeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
