-- CreateTable
CREATE TABLE "SubFeatureConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "superAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "SubFeatureAdmin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subFeatureId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubFeatureAdmin_subFeatureId_fkey" FOREIGN KEY ("subFeatureId") REFERENCES "SubFeatureConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubFeatureAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SubFeatureConfig_code_key" ON "SubFeatureConfig"("code");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_code_idx" ON "SubFeatureConfig"("code");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_departmentCode_idx" ON "SubFeatureConfig"("departmentCode");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_isEnabled_idx" ON "SubFeatureConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_superAdminOnly_idx" ON "SubFeatureConfig"("superAdminOnly");

-- CreateIndex
CREATE INDEX "SubFeatureAdmin_subFeatureId_idx" ON "SubFeatureAdmin"("subFeatureId");

-- CreateIndex
CREATE INDEX "SubFeatureAdmin_userId_idx" ON "SubFeatureAdmin"("userId");

-- CreateIndex
CREATE INDEX "SubFeatureAdmin_telegramId_idx" ON "SubFeatureAdmin"("telegramId");

-- CreateIndex
CREATE INDEX "SubFeatureAdmin_isActive_idx" ON "SubFeatureAdmin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubFeatureAdmin_subFeatureId_userId_key" ON "SubFeatureAdmin"("subFeatureId", "userId");
