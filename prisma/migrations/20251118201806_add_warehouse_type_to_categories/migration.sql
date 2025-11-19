-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_INV_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "prefix" TEXT,
    "warehouseType" TEXT NOT NULL DEFAULT 'oils-greases',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);
INSERT INTO "new_INV_Category" ("code", "createdAt", "createdBy", "description", "displayOrder", "icon", "id", "isActive", "nameAr", "nameEn", "orderIndex", "prefix", "updatedAt", "updatedBy") SELECT "code", "createdAt", "createdBy", "description", "displayOrder", "icon", "id", "isActive", "nameAr", "nameEn", "orderIndex", "prefix", "updatedAt", "updatedBy" FROM "INV_Category";
DROP TABLE "INV_Category";
ALTER TABLE "new_INV_Category" RENAME TO "INV_Category";
CREATE UNIQUE INDEX "INV_Category_code_key" ON "INV_Category"("code");
CREATE UNIQUE INDEX "INV_Category_prefix_key" ON "INV_Category"("prefix");
CREATE INDEX "INV_Category_code_idx" ON "INV_Category"("code");
CREATE INDEX "INV_Category_isActive_idx" ON "INV_Category"("isActive");
CREATE INDEX "INV_Category_warehouseType_idx" ON "INV_Category"("warehouseType");
CREATE INDEX "INV_Category_warehouseType_isActive_idx" ON "INV_Category"("warehouseType", "isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
