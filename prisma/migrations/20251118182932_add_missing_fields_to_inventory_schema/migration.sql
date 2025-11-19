/*
  Warnings:

  - You are about to drop the column `employeeId` on the `INV_Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `INV_Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "INV_Stock" ADD COLUMN "createdBy" BIGINT;
ALTER TABLE "INV_Stock" ADD COLUMN "updatedBy" BIGINT;

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
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "unitCapacity" REAL,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "minQuantity" REAL NOT NULL DEFAULT 5,
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
    CONSTRAINT "INV_Item_responsibleEmployeeId_fkey" FOREIGN KEY ("responsibleEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_INV_Item" ("barcode", "categoryId", "code", "createdAt", "createdBy", "description", "documents", "id", "imagePath", "images", "isActive", "manufacturer", "nameAr", "nameEn", "partNumber", "responsibleEmployeeId", "specifications", "supplierContact", "supplierName", "unit", "unitCapacity", "updatedAt", "updatedBy") SELECT "barcode", "categoryId", "code", "createdAt", "createdBy", "description", "documents", "id", "imagePath", "images", "isActive", "manufacturer", "nameAr", "nameEn", "partNumber", "responsibleEmployeeId", "specifications", "supplierContact", "supplierName", "unit", "unitCapacity", "updatedAt", "updatedBy" FROM "INV_Item";
DROP TABLE "INV_Item";
ALTER TABLE "new_INV_Item" RENAME TO "INV_Item";
CREATE UNIQUE INDEX "INV_Item_code_key" ON "INV_Item"("code");
CREATE UNIQUE INDEX "INV_Item_barcode_key" ON "INV_Item"("barcode");
CREATE INDEX "INV_Item_code_idx" ON "INV_Item"("code");
CREATE INDEX "INV_Item_barcode_idx" ON "INV_Item"("barcode");
CREATE INDEX "INV_Item_categoryId_idx" ON "INV_Item"("categoryId");
CREATE INDEX "INV_Item_isActive_idx" ON "INV_Item"("isActive");
CREATE INDEX "INV_Item_nameAr_idx" ON "INV_Item"("nameAr");
CREATE INDEX "INV_Item_partNumber_idx" ON "INV_Item"("partNumber");
CREATE INDEX "INV_Item_manufacturer_idx" ON "INV_Item"("manufacturer");
CREATE INDEX "INV_Item_responsibleEmployeeId_idx" ON "INV_Item"("responsibleEmployeeId");
CREATE TABLE "new_INV_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "quantityBefore" REAL NOT NULL DEFAULT 0,
    "quantityAfter" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL,
    "totalPrice" REAL,
    "locationId" INTEGER,
    "fromLocationId" INTEGER,
    "toLocationId" INTEGER,
    "equipmentId" INTEGER,
    "projectId" INTEGER,
    "recipientEmployeeId" INTEGER,
    "returnedByEmployeeId" INTEGER,
    "returnedByEquipmentId" INTEGER,
    "supplierName" TEXT,
    "invoiceNumber" TEXT,
    "referenceNumber" TEXT,
    "reason" TEXT,
    "adjustmentType" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    "updatedBy" BIGINT,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    CONSTRAINT "INV_Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_returnedByEmployeeId_fkey" FOREIGN KEY ("returnedByEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_returnedByEquipmentId_fkey" FOREIGN KEY ("returnedByEquipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_INV_Transaction" ("approvedAt", "approvedBy", "attachments", "createdAt", "createdBy", "equipmentId", "fromLocationId", "id", "invoiceNumber", "itemId", "notes", "projectId", "quantity", "quantityAfter", "quantityBefore", "reason", "supplierName", "toLocationId", "transactionDate", "transactionNumber", "transactionType", "unitPrice") SELECT "approvedAt", "approvedBy", "attachments", "createdAt", "createdBy", "equipmentId", "fromLocationId", "id", "invoiceNumber", "itemId", "notes", "projectId", "quantity", "quantityAfter", "quantityBefore", "reason", "supplierName", "toLocationId", "transactionDate", "transactionNumber", "transactionType", "unitPrice" FROM "INV_Transaction";
DROP TABLE "INV_Transaction";
ALTER TABLE "new_INV_Transaction" RENAME TO "INV_Transaction";
CREATE UNIQUE INDEX "INV_Transaction_transactionNumber_key" ON "INV_Transaction"("transactionNumber");
CREATE INDEX "INV_Transaction_transactionNumber_idx" ON "INV_Transaction"("transactionNumber");
CREATE INDEX "INV_Transaction_itemId_idx" ON "INV_Transaction"("itemId");
CREATE INDEX "INV_Transaction_transactionType_idx" ON "INV_Transaction"("transactionType");
CREATE INDEX "INV_Transaction_transactionDate_idx" ON "INV_Transaction"("transactionDate");
CREATE INDEX "INV_Transaction_createdBy_idx" ON "INV_Transaction"("createdBy");
CREATE INDEX "INV_Transaction_recipientEmployeeId_idx" ON "INV_Transaction"("recipientEmployeeId");
CREATE INDEX "INV_Transaction_returnedByEmployeeId_idx" ON "INV_Transaction"("returnedByEmployeeId");
CREATE INDEX "INV_Transaction_equipmentId_idx" ON "INV_Transaction"("equipmentId");
CREATE INDEX "INV_Transaction_projectId_idx" ON "INV_Transaction"("projectId");
CREATE INDEX "INV_Transaction_itemId_transactionDate_idx" ON "INV_Transaction"("itemId", "transactionDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
