-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DepartmentConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minRole" TEXT NOT NULL DEFAULT 'ADMIN',
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);
INSERT INTO "new_DepartmentConfig" ("code", "createdAt", "createdBy", "description", "icon", "id", "isEnabled", "name", "nameEn", "order", "updatedAt", "updatedBy") SELECT "code", "createdAt", "createdBy", "description", "icon", "id", "isEnabled", "name", "nameEn", "order", "updatedAt", "updatedBy" FROM "DepartmentConfig";
DROP TABLE "DepartmentConfig";
ALTER TABLE "new_DepartmentConfig" RENAME TO "DepartmentConfig";
CREATE UNIQUE INDEX "DepartmentConfig_code_key" ON "DepartmentConfig"("code");
CREATE INDEX "DepartmentConfig_code_idx" ON "DepartmentConfig"("code");
CREATE INDEX "DepartmentConfig_isEnabled_idx" ON "DepartmentConfig"("isEnabled");
CREATE INDEX "DepartmentConfig_minRole_idx" ON "DepartmentConfig"("minRole");
CREATE TABLE "new_SubFeatureConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minRole" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "superAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "SubFeatureConfig_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "DepartmentConfig" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SubFeatureConfig" ("code", "createdAt", "createdBy", "departmentCode", "description", "icon", "id", "isEnabled", "name", "nameEn", "order", "superAdminOnly", "updatedAt", "updatedBy") SELECT "code", "createdAt", "createdBy", "departmentCode", "description", "icon", "id", "isEnabled", "name", "nameEn", "order", "superAdminOnly", "updatedAt", "updatedBy" FROM "SubFeatureConfig";
DROP TABLE "SubFeatureConfig";
ALTER TABLE "new_SubFeatureConfig" RENAME TO "SubFeatureConfig";
CREATE UNIQUE INDEX "SubFeatureConfig_code_key" ON "SubFeatureConfig"("code");
CREATE INDEX "SubFeatureConfig_code_idx" ON "SubFeatureConfig"("code");
CREATE INDEX "SubFeatureConfig_departmentCode_idx" ON "SubFeatureConfig"("departmentCode");
CREATE INDEX "SubFeatureConfig_isEnabled_idx" ON "SubFeatureConfig"("isEnabled");
CREATE INDEX "SubFeatureConfig_minRole_idx" ON "SubFeatureConfig"("minRole");
CREATE INDEX "SubFeatureConfig_superAdminOnly_idx" ON "SubFeatureConfig"("superAdminOnly");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
