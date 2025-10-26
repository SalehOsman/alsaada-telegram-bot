/*
  Warnings:

  - You are about to drop the `EmployeeAdvanceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeAllowanceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeCodeHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeContactHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeCycleInterruptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeCycleLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeDataChangeLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeDeductionHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeDepartmentHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeDisciplinaryHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeDocumentHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeFinancialTransactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeLeaveBalance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeLeaveHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePayrollHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePerformanceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePositionHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeSalaryHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeStatusHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeTrainingHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeWorkCycleHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SettingHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `bankAccounts` on the `Company` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `documents` on the `Equipment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `photos` on the `Equipment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `specifications` on the `Equipment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `documents` on the `Equipment_Cost` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `documents` on the `Equipment_Maintenance` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `photos` on the `Equipment_Maintenance` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `requiredOils` on the `Equipment_Maintenance_Schedule` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `requiredParts` on the `Equipment_Maintenance_Schedule` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `workDays` on the `Equipment_Shift_Assignment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to drop the column `certifications` on the `HR_Employee` table. All the data in the column will be lost.
  - You are about to drop the column `documents` on the `HR_Employee` table. All the data in the column will be lost.
  - You are about to drop the column `previousExperience` on the `HR_Employee` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `HR_Employee` table. All the data in the column will be lost.
  - You are about to alter the column `buttons` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `data` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `metadata` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `recurringConfig` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `targetUserIds` on the `Notification` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `channels` on the `NotificationPreferences` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `priorities` on the `NotificationPreferences` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `types` on the `NotificationPreferences` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `buttons` on the `NotificationTemplate` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `variables` on the `NotificationTemplate` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `customPermissions` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- DropIndex
DROP INDEX "EmployeeAdvanceHistory_isPaidOff_idx";

-- DropIndex
DROP INDEX "EmployeeAdvanceHistory_approvalStatus_idx";

-- DropIndex
DROP INDEX "EmployeeAdvanceHistory_requestDate_idx";

-- DropIndex
DROP INDEX "EmployeeAdvanceHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeAllowanceHistory_effectiveDate_idx";

-- DropIndex
DROP INDEX "EmployeeAllowanceHistory_allowanceType_idx";

-- DropIndex
DROP INDEX "EmployeeAllowanceHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeAllowanceHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_performedBy_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_severity_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_eventCategory_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_eventType_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_eventDate_idx";

-- DropIndex
DROP INDEX "EmployeeAuditLog_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeCodeHistory_newCode_idx";

-- DropIndex
DROP INDEX "EmployeeCodeHistory_oldCode_idx";

-- DropIndex
DROP INDEX "EmployeeCodeHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeCodeHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeContactHistory_verificationStatus_idx";

-- DropIndex
DROP INDEX "EmployeeContactHistory_fieldName_idx";

-- DropIndex
DROP INDEX "EmployeeContactHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeContactHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeCycleInterruptions_isCompensated_idx";

-- DropIndex
DROP INDEX "EmployeeCycleInterruptions_interruptionType_idx";

-- DropIndex
DROP INDEX "EmployeeCycleInterruptions_startDate_endDate_idx";

-- DropIndex
DROP INDEX "EmployeeCycleInterruptions_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeCycleLog_completionStatus_idx";

-- DropIndex
DROP INDEX "EmployeeCycleLog_cycleType_idx";

-- DropIndex
DROP INDEX "EmployeeCycleLog_startDate_endDate_idx";

-- DropIndex
DROP INDEX "EmployeeCycleLog_cycleNumber_idx";

-- DropIndex
DROP INDEX "EmployeeCycleLog_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_changedBy_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_changeType_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_fieldName_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_tableName_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeDataChangeLog_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeDeductionHistory_isRecovered_idx";

-- DropIndex
DROP INDEX "EmployeeDeductionHistory_deductionType_idx";

-- DropIndex
DROP INDEX "EmployeeDeductionHistory_deductionDate_idx";

-- DropIndex
DROP INDEX "EmployeeDeductionHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeDepartmentHistory_newDepartmentId_idx";

-- DropIndex
DROP INDEX "EmployeeDepartmentHistory_oldDepartmentId_idx";

-- DropIndex
DROP INDEX "EmployeeDepartmentHistory_transferDate_idx";

-- DropIndex
DROP INDEX "EmployeeDepartmentHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_isActive_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_violationType_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_severity_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_actionType_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_incidentDate_idx";

-- DropIndex
DROP INDEX "EmployeeDisciplinaryHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeDocumentHistory_expiryDate_idx";

-- DropIndex
DROP INDEX "EmployeeDocumentHistory_status_idx";

-- DropIndex
DROP INDEX "EmployeeDocumentHistory_uploadDate_idx";

-- DropIndex
DROP INDEX "EmployeeDocumentHistory_documentType_idx";

-- DropIndex
DROP INDEX "EmployeeDocumentHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeFinancialTransactions_referenceId_idx";

-- DropIndex
DROP INDEX "EmployeeFinancialTransactions_status_idx";

-- DropIndex
DROP INDEX "EmployeeFinancialTransactions_transactionType_idx";

-- DropIndex
DROP INDEX "EmployeeFinancialTransactions_transactionDate_idx";

-- DropIndex
DROP INDEX "EmployeeFinancialTransactions_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveBalance_lastUpdated_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveBalance_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveBalance_employeeId_key";

-- DropIndex
DROP INDEX "EmployeeLeaveHistory_isCompleted_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveHistory_approvalStatus_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveHistory_leaveType_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveHistory_startDate_endDate_idx";

-- DropIndex
DROP INDEX "EmployeeLeaveHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeePayrollHistory_employeeId_month_year_key";

-- DropIndex
DROP INDEX "EmployeePayrollHistory_paymentDate_idx";

-- DropIndex
DROP INDEX "EmployeePayrollHistory_paymentStatus_idx";

-- DropIndex
DROP INDEX "EmployeePayrollHistory_month_year_idx";

-- DropIndex
DROP INDEX "EmployeePayrollHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeePerformanceHistory_status_idx";

-- DropIndex
DROP INDEX "EmployeePerformanceHistory_evaluationType_idx";

-- DropIndex
DROP INDEX "EmployeePerformanceHistory_evaluationDate_idx";

-- DropIndex
DROP INDEX "EmployeePerformanceHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeePositionHistory_newPositionId_idx";

-- DropIndex
DROP INDEX "EmployeePositionHistory_oldPositionId_idx";

-- DropIndex
DROP INDEX "EmployeePositionHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeePositionHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeSalaryHistory_effectiveDate_idx";

-- DropIndex
DROP INDEX "EmployeeSalaryHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeSalaryHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeStatusHistory_changedBy_idx";

-- DropIndex
DROP INDEX "EmployeeStatusHistory_newStatus_idx";

-- DropIndex
DROP INDEX "EmployeeStatusHistory_statusDate_idx";

-- DropIndex
DROP INDEX "EmployeeStatusHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeTrainingHistory_status_idx";

-- DropIndex
DROP INDEX "EmployeeTrainingHistory_trainingType_idx";

-- DropIndex
DROP INDEX "EmployeeTrainingHistory_startDate_idx";

-- DropIndex
DROP INDEX "EmployeeTrainingHistory_employeeId_idx";

-- DropIndex
DROP INDEX "EmployeeWorkCycleHistory_effectiveDate_idx";

-- DropIndex
DROP INDEX "EmployeeWorkCycleHistory_changeDate_idx";

-- DropIndex
DROP INDEX "EmployeeWorkCycleHistory_employeeId_idx";

-- DropIndex
DROP INDEX "SettingHistory_settingKey_createdAt_idx";

-- DropIndex
DROP INDEX "SettingHistory_settingId_createdAt_idx";

-- DropIndex
DROP INDEX "SettingHistory_changedBy_createdAt_idx";

-- DropIndex
DROP INDEX "SettingHistory_reason_idx";

-- DropIndex
DROP INDEX "SettingHistory_newValue_idx";

-- DropIndex
DROP INDEX "SettingHistory_oldValue_idx";

-- DropIndex
DROP INDEX "SettingHistory_createdAt_idx";

-- DropIndex
DROP INDEX "SettingHistory_changedBy_idx";

-- DropIndex
DROP INDEX "SettingHistory_settingKey_idx";

-- DropIndex
DROP INDEX "SettingHistory_settingId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeAdvanceHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeAllowanceHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeAuditLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeCodeHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeContactHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeCycleInterruptions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeCycleLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeDataChangeLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeDeductionHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeDepartmentHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeDisciplinaryHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeDocumentHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeFinancialTransactions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeLeaveBalance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeLeaveHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeePayrollHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeePerformanceHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeePositionHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeSalaryHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeStatusHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeTrainingHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmployeeWorkCycleHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SettingHistory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "HR_Skill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "HR_Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    CONSTRAINT "HR_Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_Certification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "issuingOrg" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "credentialId" TEXT,
    "url" TEXT,
    "employeeId" INTEGER NOT NULL,
    CONSTRAINT "HR_Certification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_WorkExperience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "description" TEXT,
    "employeeId" INTEGER NOT NULL,
    CONSTRAINT "HR_WorkExperience_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedByUserId" INTEGER,
    "description" TEXT,
    "metadata" JSONB,
    CONSTRAINT "AuditLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_EmployeeToSkill" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_EmployeeToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EmployeeToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "HR_Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "commercialRegister" TEXT,
    "taxId" TEXT,
    "insuranceNumber" TEXT,
    "address" TEXT,
    "addressEn" TEXT,
    "governorateId" INTEGER,
    "city" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "fax" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "email2" TEXT,
    "website" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "establishedYear" INTEGER,
    "legalForm" TEXT,
    "capital" REAL,
    "currency" TEXT,
    "bankAccounts" JSONB,
    "taxOffice" TEXT,
    "taxRecord" TEXT,
    "chamberOfCommerce" TEXT,
    "ceo" TEXT,
    "ceoPhone" TEXT,
    "accountant" TEXT,
    "accountantPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "timezone" TEXT DEFAULT 'Africa/Cairo',
    CONSTRAINT "Company_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "Location_Governorate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("accountant", "accountantPhone", "address", "addressEn", "bankAccounts", "capital", "ceo", "ceoPhone", "chamberOfCommerce", "city", "commercialRegister", "country", "createdAt", "createdBy", "currency", "description", "email", "email2", "establishedYear", "facebook", "fax", "governorateId", "id", "instagram", "insuranceNumber", "isActive", "legalForm", "linkedin", "logo", "mobile", "name", "nameEn", "notes", "phone", "phone2", "postalCode", "taxId", "taxOffice", "taxRecord", "timezone", "twitter", "updatedAt", "updatedBy", "website") SELECT "accountant", "accountantPhone", "address", "addressEn", "bankAccounts", "capital", "ceo", "ceoPhone", "chamberOfCommerce", "city", "commercialRegister", "country", "createdAt", "createdBy", "currency", "description", "email", "email2", "establishedYear", "facebook", "fax", "governorateId", "id", "instagram", "insuranceNumber", "isActive", "legalForm", "linkedin", "logo", "mobile", "name", "nameEn", "notes", "phone", "phone2", "postalCode", "taxId", "taxOffice", "taxRecord", "timezone", "twitter", "updatedAt", "updatedBy", "website" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");
CREATE INDEX "Company_name_idx" ON "Company"("name");
CREATE INDEX "Company_createdBy_idx" ON "Company"("createdBy");
CREATE INDEX "Company_updatedBy_idx" ON "Company"("updatedBy");
CREATE INDEX "Company_establishedYear_idx" ON "Company"("establishedYear");
CREATE INDEX "Company_legalForm_idx" ON "Company"("legalForm");
CREATE INDEX "Company_governorateId_idx" ON "Company"("governorateId");
CREATE INDEX "Company_city_idx" ON "Company"("city");
CREATE INDEX "Company_country_idx" ON "Company"("country");
CREATE INDEX "Company_createdAt_idx" ON "Company"("createdAt");
CREATE INDEX "Company_name_isActive_idx" ON "Company"("name", "isActive");
CREATE TABLE "new_Equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentTypeId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "plateNumber" TEXT,
    "companyId" INTEGER,
    "purchaseDate" DATETIME,
    "purchasePrice" REAL,
    "currency" TEXT DEFAULT 'EGP',
    "supplier" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "yearOfManufacture" INTEGER,
    "serialNumber" TEXT,
    "capacity" TEXT,
    "fuelType" TEXT,
    "engineNumber" TEXT,
    "chassisNumber" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "currentLocation" TEXT,
    "currentProjectId" INTEGER,
    "currentOperatorId" INTEGER,
    "lastMaintenanceDate" DATETIME,
    "nextMaintenanceDate" DATETIME,
    "maintenanceInterval" INTEGER,
    "maintenanceBy" TEXT NOT NULL DEFAULT 'MILEAGE',
    "oilChangeInterval" INTEGER,
    "lastOilChangeAt" INTEGER,
    "nextOilChangeAt" INTEGER,
    "totalWorkingHours" INTEGER DEFAULT 0,
    "currentMileage" INTEGER DEFAULT 0,
    "lastOilChangeDate" DATETIME,
    "lastOilChangeMileage" INTEGER,
    "lastOilChangeHours" INTEGER,
    "nextOilChangeDue" INTEGER,
    "oilType" TEXT,
    "oilCapacity" REAL,
    "insuranceCompany" TEXT,
    "insuranceNumber" TEXT,
    "insuranceStartDate" DATETIME,
    "insuranceEndDate" DATETIME,
    "licenseNumber" TEXT,
    "licenseExpiryDate" DATETIME,
    "dailyRentalRate" REAL,
    "hourlyRate" REAL,
    "fuelConsumptionRate" REAL,
    "photos" JSONB,
    "documents" JSONB,
    "specifications" JSONB,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_currentOperatorId_fkey" FOREIGN KEY ("currentOperatorId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_currentProjectId_fkey" FOREIGN KEY ("currentProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "Equipment_Type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("capacity", "chassisNumber", "code", "color", "companyId", "condition", "createdAt", "createdBy", "currency", "currentLocation", "currentMileage", "currentOperatorId", "currentProjectId", "dailyRentalRate", "documents", "engineNumber", "equipmentTypeId", "fuelConsumptionRate", "fuelType", "hourlyRate", "id", "insuranceCompany", "insuranceEndDate", "insuranceNumber", "insuranceStartDate", "isActive", "lastMaintenanceDate", "lastOilChangeAt", "lastOilChangeDate", "lastOilChangeHours", "lastOilChangeMileage", "licenseExpiryDate", "licenseNumber", "maintenanceBy", "maintenanceInterval", "manufacturer", "model", "nameAr", "nameEn", "nextMaintenanceDate", "nextOilChangeAt", "nextOilChangeDue", "notes", "oilCapacity", "oilChangeInterval", "oilType", "photos", "plateNumber", "purchaseDate", "purchasePrice", "serialNumber", "specifications", "status", "supplier", "totalWorkingHours", "updatedAt", "updatedBy", "yearOfManufacture") SELECT "capacity", "chassisNumber", "code", "color", "companyId", "condition", "createdAt", "createdBy", "currency", "currentLocation", "currentMileage", "currentOperatorId", "currentProjectId", "dailyRentalRate", "documents", "engineNumber", "equipmentTypeId", "fuelConsumptionRate", "fuelType", "hourlyRate", "id", "insuranceCompany", "insuranceEndDate", "insuranceNumber", "insuranceStartDate", "isActive", "lastMaintenanceDate", "lastOilChangeAt", "lastOilChangeDate", "lastOilChangeHours", "lastOilChangeMileage", "licenseExpiryDate", "licenseNumber", "maintenanceBy", "maintenanceInterval", "manufacturer", "model", "nameAr", "nameEn", "nextMaintenanceDate", "nextOilChangeAt", "nextOilChangeDue", "notes", "oilCapacity", "oilChangeInterval", "oilType", "photos", "plateNumber", "purchaseDate", "purchasePrice", "serialNumber", "specifications", "status", "supplier", "totalWorkingHours", "updatedAt", "updatedBy", "yearOfManufacture" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");
CREATE UNIQUE INDEX "Equipment_plateNumber_key" ON "Equipment"("plateNumber");
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");
CREATE INDEX "Equipment_code_idx" ON "Equipment"("code");
CREATE INDEX "Equipment_plateNumber_idx" ON "Equipment"("plateNumber");
CREATE INDEX "Equipment_equipmentTypeId_idx" ON "Equipment"("equipmentTypeId");
CREATE INDEX "Equipment_companyId_idx" ON "Equipment"("companyId");
CREATE INDEX "Equipment_currentProjectId_idx" ON "Equipment"("currentProjectId");
CREATE INDEX "Equipment_currentOperatorId_idx" ON "Equipment"("currentOperatorId");
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");
CREATE INDEX "Equipment_condition_idx" ON "Equipment"("condition");
CREATE INDEX "Equipment_isActive_idx" ON "Equipment"("isActive");
CREATE INDEX "Equipment_nextMaintenanceDate_idx" ON "Equipment"("nextMaintenanceDate");
CREATE INDEX "Equipment_insuranceEndDate_idx" ON "Equipment"("insuranceEndDate");
CREATE INDEX "Equipment_licenseExpiryDate_idx" ON "Equipment"("licenseExpiryDate");
CREATE INDEX "Equipment_status_isActive_idx" ON "Equipment"("status", "isActive");
CREATE INDEX "Equipment_companyId_status_idx" ON "Equipment"("companyId", "status");
CREATE TABLE "new_Equipment_Cost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "costType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "costDate" DATETIME NOT NULL,
    "description" TEXT,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT,
    "maintenanceRecordId" INTEGER,
    "notes" TEXT,
    "documents" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Cost_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipment_Cost" ("amount", "costDate", "costType", "createdAt", "createdBy", "currency", "description", "documents", "equipmentId", "id", "invoiceNumber", "maintenanceRecordId", "notes", "paymentMethod", "supplier", "updatedAt", "updatedBy") SELECT "amount", "costDate", "costType", "createdAt", "createdBy", "currency", "description", "documents", "equipmentId", "id", "invoiceNumber", "maintenanceRecordId", "notes", "paymentMethod", "supplier", "updatedAt", "updatedBy" FROM "Equipment_Cost";
DROP TABLE "Equipment_Cost";
ALTER TABLE "new_Equipment_Cost" RENAME TO "Equipment_Cost";
CREATE INDEX "Equipment_Cost_equipmentId_idx" ON "Equipment_Cost"("equipmentId");
CREATE INDEX "Equipment_Cost_costType_idx" ON "Equipment_Cost"("costType");
CREATE INDEX "Equipment_Cost_costDate_idx" ON "Equipment_Cost"("costDate");
CREATE INDEX "Equipment_Cost_equipmentId_costDate_idx" ON "Equipment_Cost"("equipmentId", "costDate");
CREATE TABLE "new_Equipment_Maintenance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "maintenanceDate" DATETIME NOT NULL,
    "nextDueDate" DATETIME,
    "description" TEXT NOT NULL,
    "workPerformed" TEXT,
    "partsReplaced" TEXT,
    "laborCost" REAL DEFAULT 0,
    "partsCost" REAL DEFAULT 0,
    "totalCost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "performedBy" TEXT,
    "performedById" INTEGER,
    "serviceProvider" TEXT,
    "invoiceNumber" TEXT,
    "mileageBefore" INTEGER,
    "mileageAfter" INTEGER,
    "workingHoursBefore" INTEGER,
    "workingHoursAfter" INTEGER,
    "conditionBefore" TEXT,
    "conditionAfter" TEXT,
    "photos" JSONB,
    "documents" JSONB,
    "notes" TEXT,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Maintenance_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Maintenance_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipment_Maintenance" ("conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "documents", "equipmentId", "id", "invoiceNumber", "isWarranty", "laborCost", "maintenanceDate", "maintenanceType", "mileageAfter", "mileageBefore", "nextDueDate", "notes", "partsCost", "partsReplaced", "performedBy", "performedById", "photos", "serviceProvider", "totalCost", "updatedAt", "updatedBy", "workPerformed", "workingHoursAfter", "workingHoursBefore") SELECT "conditionAfter", "conditionBefore", "createdAt", "createdBy", "currency", "description", "documents", "equipmentId", "id", "invoiceNumber", "isWarranty", "laborCost", "maintenanceDate", "maintenanceType", "mileageAfter", "mileageBefore", "nextDueDate", "notes", "partsCost", "partsReplaced", "performedBy", "performedById", "photos", "serviceProvider", "totalCost", "updatedAt", "updatedBy", "workPerformed", "workingHoursAfter", "workingHoursBefore" FROM "Equipment_Maintenance";
DROP TABLE "Equipment_Maintenance";
ALTER TABLE "new_Equipment_Maintenance" RENAME TO "Equipment_Maintenance";
CREATE INDEX "Equipment_Maintenance_equipmentId_idx" ON "Equipment_Maintenance"("equipmentId");
CREATE INDEX "Equipment_Maintenance_maintenanceType_idx" ON "Equipment_Maintenance"("maintenanceType");
CREATE INDEX "Equipment_Maintenance_maintenanceDate_idx" ON "Equipment_Maintenance"("maintenanceDate");
CREATE INDEX "Equipment_Maintenance_nextDueDate_idx" ON "Equipment_Maintenance"("nextDueDate");
CREATE INDEX "Equipment_Maintenance_performedById_idx" ON "Equipment_Maintenance"("performedById");
CREATE INDEX "Equipment_Maintenance_equipmentId_maintenanceDate_idx" ON "Equipment_Maintenance"("equipmentId", "maintenanceDate");
CREATE TABLE "new_Equipment_Maintenance_Schedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "intervalType" TEXT NOT NULL,
    "intervalValue" INTEGER NOT NULL,
    "lastPerformedDate" DATETIME,
    "lastPerformedMileage" INTEGER,
    "lastPerformedHours" INTEGER,
    "nextDueDate" DATETIME,
    "nextDueMileage" INTEGER,
    "nextDueHours" INTEGER,
    "estimatedCost" REAL,
    "estimatedDuration" REAL,
    "requiredParts" JSONB,
    "requiredOils" JSONB,
    "notifyBeforeDays" INTEGER DEFAULT 7,
    "notifyBeforeKm" INTEGER,
    "notifyBeforeHours" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Maintenance_Schedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipment_Maintenance_Schedule" ("createdAt", "createdBy", "description", "equipmentId", "estimatedCost", "estimatedDuration", "id", "intervalType", "intervalValue", "isActive", "isRecurring", "lastPerformedDate", "lastPerformedHours", "lastPerformedMileage", "maintenanceType", "nextDueDate", "nextDueHours", "nextDueMileage", "notes", "notifyBeforeDays", "notifyBeforeHours", "notifyBeforeKm", "priority", "requiredOils", "requiredParts", "status", "title", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "description", "equipmentId", "estimatedCost", "estimatedDuration", "id", "intervalType", "intervalValue", "isActive", "isRecurring", "lastPerformedDate", "lastPerformedHours", "lastPerformedMileage", "maintenanceType", "nextDueDate", "nextDueHours", "nextDueMileage", "notes", "notifyBeforeDays", "notifyBeforeHours", "notifyBeforeKm", "priority", "requiredOils", "requiredParts", "status", "title", "updatedAt", "updatedBy" FROM "Equipment_Maintenance_Schedule";
DROP TABLE "Equipment_Maintenance_Schedule";
ALTER TABLE "new_Equipment_Maintenance_Schedule" RENAME TO "Equipment_Maintenance_Schedule";
CREATE INDEX "Equipment_Maintenance_Schedule_equipmentId_idx" ON "Equipment_Maintenance_Schedule"("equipmentId");
CREATE INDEX "Equipment_Maintenance_Schedule_maintenanceType_idx" ON "Equipment_Maintenance_Schedule"("maintenanceType");
CREATE INDEX "Equipment_Maintenance_Schedule_nextDueDate_idx" ON "Equipment_Maintenance_Schedule"("nextDueDate");
CREATE INDEX "Equipment_Maintenance_Schedule_status_idx" ON "Equipment_Maintenance_Schedule"("status");
CREATE INDEX "Equipment_Maintenance_Schedule_isActive_idx" ON "Equipment_Maintenance_Schedule"("isActive");
CREATE INDEX "Equipment_Maintenance_Schedule_equipmentId_status_idx" ON "Equipment_Maintenance_Schedule"("equipmentId", "status");
CREATE TABLE "new_Equipment_Shift_Assignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "shift" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "workDays" JSONB,
    "projectId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Shift_Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Shift_Assignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Shift_Assignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipment_Shift_Assignment" ("createdAt", "createdBy", "endDate", "equipmentId", "id", "isActive", "notes", "operatorId", "projectId", "shift", "startDate", "updatedAt", "updatedBy", "workDays") SELECT "createdAt", "createdBy", "endDate", "equipmentId", "id", "isActive", "notes", "operatorId", "projectId", "shift", "startDate", "updatedAt", "updatedBy", "workDays" FROM "Equipment_Shift_Assignment";
DROP TABLE "Equipment_Shift_Assignment";
ALTER TABLE "new_Equipment_Shift_Assignment" RENAME TO "Equipment_Shift_Assignment";
CREATE INDEX "Equipment_Shift_Assignment_equipmentId_idx" ON "Equipment_Shift_Assignment"("equipmentId");
CREATE INDEX "Equipment_Shift_Assignment_operatorId_idx" ON "Equipment_Shift_Assignment"("operatorId");
CREATE INDEX "Equipment_Shift_Assignment_shift_idx" ON "Equipment_Shift_Assignment"("shift");
CREATE INDEX "Equipment_Shift_Assignment_startDate_idx" ON "Equipment_Shift_Assignment"("startDate");
CREATE INDEX "Equipment_Shift_Assignment_endDate_idx" ON "Equipment_Shift_Assignment"("endDate");
CREATE INDEX "Equipment_Shift_Assignment_isActive_idx" ON "Equipment_Shift_Assignment"("isActive");
CREATE INDEX "Equipment_Shift_Assignment_equipmentId_shift_isActive_idx" ON "Equipment_Shift_Assignment"("equipmentId", "shift", "isActive");
CREATE TABLE "new_HR_AttendanceException" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "hours" REAL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_AttendanceException_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_AttendanceException" ("approvedBy", "createdAt", "date", "employeeId", "exceptionType", "hours", "id", "reason", "status", "updatedAt") SELECT "approvedBy", "createdAt", "date", "employeeId", "exceptionType", "hours", "id", "reason", "status", "updatedAt" FROM "HR_AttendanceException";
DROP TABLE "HR_AttendanceException";
ALTER TABLE "new_HR_AttendanceException" RENAME TO "HR_AttendanceException";
CREATE INDEX "HR_AttendanceException_employeeId_idx" ON "HR_AttendanceException"("employeeId");
CREATE INDEX "HR_AttendanceException_date_idx" ON "HR_AttendanceException"("date");
CREATE INDEX "HR_AttendanceException_status_idx" ON "HR_AttendanceException"("status");
CREATE TABLE "new_HR_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fullNameEn" TEXT,
    "nickname" TEXT,
    "nationalId" TEXT NOT NULL,
    "passportNumber" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "placeOfBirth" TEXT,
    "nationality" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "religion" TEXT,
    "bloodType" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "personalPhone" TEXT NOT NULL,
    "workPhone" TEXT,
    "telegramId" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRelation" TEXT,
    "currentAddress" TEXT NOT NULL,
    "currentAddressEn" TEXT,
    "permanentAddress" TEXT,
    "governorateId" INTEGER,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Egypt',
    "postalCode" TEXT,
    "companyId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "positionId" INTEGER NOT NULL,
    "employmentType" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hireDate" DATETIME NOT NULL,
    "confirmationDate" DATETIME,
    "resignationDate" DATETIME,
    "terminationDate" DATETIME,
    "terminationReason" TEXT,
    "basicSalary" REAL NOT NULL,
    "allowances" REAL DEFAULT 0,
    "totalSalary" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "iban" TEXT,
    "transferNumber1" TEXT,
    "transferType1" TEXT,
    "transferNumber2" TEXT,
    "transferType2" TEXT,
    "socialInsuranceNumber" TEXT,
    "taxNumber" TEXT,
    "insuranceStartDate" DATETIME,
    "directManagerId" INTEGER,
    "workSchedule" TEXT,
    "workLocation" TEXT,
    "educationLevel" TEXT,
    "major" TEXT,
    "university" TEXT,
    "graduationYear" INTEGER,
    "yearsOfExperience" INTEGER DEFAULT 0,
    "profilePhoto" TEXT,
    "cv" TEXT,
    "nationalIdCardUrl" TEXT,
    "annualLeaveBalance" INTEGER NOT NULL DEFAULT 21,
    "sickLeaveBalance" INTEGER NOT NULL DEFAULT 180,
    "casualLeaveBalance" INTEGER NOT NULL DEFAULT 7,
    "attendanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "workDaysPerCycle" INTEGER,
    "leaveDaysPerCycle" INTEGER,
    "currentWorkDays" INTEGER DEFAULT 0,
    "currentLeaveDays" INTEGER DEFAULT 0,
    "lastLeaveStartDate" DATETIME,
    "lastLeaveEndDate" DATETIME,
    "nextLeaveStartDate" DATETIME,
    "nextLeaveEndDate" DATETIME,
    "fingerprintId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "HR_Employee_directManagerId_fkey" FOREIGN KEY ("directManagerId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "HR_Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HR_Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_Employee_governorateId_fkey" FOREIGN KEY ("governorateId") REFERENCES "Location_Governorate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HR_Employee" ("allowances", "annualLeaveBalance", "attendanceRequired", "bankAccountNumber", "bankName", "basicSalary", "bloodType", "casualLeaveBalance", "city", "companyId", "confirmationDate", "contractType", "country", "createdAt", "createdBy", "currency", "currentAddress", "currentAddressEn", "currentLeaveDays", "currentWorkDays", "cv", "dateOfBirth", "departmentId", "directManagerId", "educationLevel", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "employeeCode", "employmentStatus", "employmentType", "fingerprintId", "fullName", "fullNameEn", "gender", "governorateId", "graduationYear", "hireDate", "iban", "id", "insuranceStartDate", "isActive", "lastLeaveEndDate", "lastLeaveStartDate", "leaveDaysPerCycle", "major", "maritalStatus", "nationalId", "nationalIdCardUrl", "nationality", "nextLeaveEndDate", "nextLeaveStartDate", "nickname", "notes", "passportNumber", "paymentMethod", "permanentAddress", "personalEmail", "personalPhone", "placeOfBirth", "positionId", "postalCode", "profilePhoto", "region", "religion", "resignationDate", "sickLeaveBalance", "socialInsuranceNumber", "taxNumber", "telegramId", "terminationDate", "terminationReason", "totalSalary", "transferNumber1", "transferNumber2", "transferType1", "transferType2", "university", "updatedAt", "updatedBy", "workDaysPerCycle", "workEmail", "workLocation", "workPhone", "workSchedule", "yearsOfExperience") SELECT "allowances", "annualLeaveBalance", "attendanceRequired", "bankAccountNumber", "bankName", "basicSalary", "bloodType", "casualLeaveBalance", "city", "companyId", "confirmationDate", "contractType", "country", "createdAt", "createdBy", "currency", "currentAddress", "currentAddressEn", "currentLeaveDays", "currentWorkDays", "cv", "dateOfBirth", "departmentId", "directManagerId", "educationLevel", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "employeeCode", "employmentStatus", "employmentType", "fingerprintId", "fullName", "fullNameEn", "gender", "governorateId", "graduationYear", "hireDate", "iban", "id", "insuranceStartDate", "isActive", "lastLeaveEndDate", "lastLeaveStartDate", "leaveDaysPerCycle", "major", "maritalStatus", "nationalId", "nationalIdCardUrl", "nationality", "nextLeaveEndDate", "nextLeaveStartDate", "nickname", "notes", "passportNumber", "paymentMethod", "permanentAddress", "personalEmail", "personalPhone", "placeOfBirth", "positionId", "postalCode", "profilePhoto", "region", "religion", "resignationDate", "sickLeaveBalance", "socialInsuranceNumber", "taxNumber", "telegramId", "terminationDate", "terminationReason", "totalSalary", "transferNumber1", "transferNumber2", "transferType1", "transferType2", "university", "updatedAt", "updatedBy", "workDaysPerCycle", "workEmail", "workLocation", "workPhone", "workSchedule", "yearsOfExperience" FROM "HR_Employee";
DROP TABLE "HR_Employee";
ALTER TABLE "new_HR_Employee" RENAME TO "HR_Employee";
CREATE UNIQUE INDEX "HR_Employee_employeeCode_key" ON "HR_Employee"("employeeCode");
CREATE UNIQUE INDEX "HR_Employee_nationalId_key" ON "HR_Employee"("nationalId");
CREATE INDEX "HR_Employee_employeeCode_idx" ON "HR_Employee"("employeeCode");
CREATE INDEX "HR_Employee_nationalId_idx" ON "HR_Employee"("nationalId");
CREATE INDEX "HR_Employee_companyId_idx" ON "HR_Employee"("companyId");
CREATE INDEX "HR_Employee_departmentId_idx" ON "HR_Employee"("departmentId");
CREATE INDEX "HR_Employee_positionId_idx" ON "HR_Employee"("positionId");
CREATE INDEX "HR_Employee_directManagerId_idx" ON "HR_Employee"("directManagerId");
CREATE INDEX "HR_Employee_employmentStatus_idx" ON "HR_Employee"("employmentStatus");
CREATE INDEX "HR_Employee_employmentType_idx" ON "HR_Employee"("employmentType");
CREATE INDEX "HR_Employee_isActive_idx" ON "HR_Employee"("isActive");
CREATE INDEX "HR_Employee_hireDate_idx" ON "HR_Employee"("hireDate");
CREATE INDEX "HR_Employee_fullName_idx" ON "HR_Employee"("fullName");
CREATE INDEX "HR_Employee_nickname_idx" ON "HR_Employee"("nickname");
CREATE INDEX "HR_Employee_gender_idx" ON "HR_Employee"("gender");
CREATE INDEX "HR_Employee_maritalStatus_idx" ON "HR_Employee"("maritalStatus");
CREATE INDEX "HR_Employee_governorateId_idx" ON "HR_Employee"("governorateId");
CREATE INDEX "HR_Employee_city_idx" ON "HR_Employee"("city");
CREATE INDEX "HR_Employee_country_idx" ON "HR_Employee"("country");
CREATE INDEX "HR_Employee_createdAt_idx" ON "HR_Employee"("createdAt");
CREATE INDEX "HR_Employee_companyId_departmentId_idx" ON "HR_Employee"("companyId", "departmentId");
CREATE INDEX "HR_Employee_companyId_isActive_idx" ON "HR_Employee"("companyId", "isActive");
CREATE INDEX "HR_Employee_departmentId_isActive_idx" ON "HR_Employee"("departmentId", "isActive");
CREATE INDEX "HR_Employee_employmentStatus_isActive_idx" ON "HR_Employee"("employmentStatus", "isActive");
CREATE TABLE "new_HR_EmployeeAdvance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT,
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "deductionStartDate" DATETIME,
    "monthlyDeduction" REAL,
    "remainingBalance" REAL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_EmployeeAdvance" ("amount", "approvalStatus", "approvedAt", "approvedBy", "createdAt", "deductionStartDate", "employeeId", "id", "isPaid", "monthlyDeduction", "notes", "reason", "remainingBalance", "requestDate", "updatedAt") SELECT "amount", "approvalStatus", "approvedAt", "approvedBy", "createdAt", "deductionStartDate", "employeeId", "id", "isPaid", "monthlyDeduction", "notes", "reason", "remainingBalance", "requestDate", "updatedAt" FROM "HR_EmployeeAdvance";
DROP TABLE "HR_EmployeeAdvance";
ALTER TABLE "new_HR_EmployeeAdvance" RENAME TO "HR_EmployeeAdvance";
CREATE INDEX "HR_EmployeeAdvance_employeeId_idx" ON "HR_EmployeeAdvance"("employeeId");
CREATE INDEX "HR_EmployeeAdvance_approvalStatus_idx" ON "HR_EmployeeAdvance"("approvalStatus");
CREATE INDEX "HR_EmployeeAdvance_isPaid_idx" ON "HR_EmployeeAdvance"("isPaid");
CREATE TABLE "new_HR_EmployeeLeave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "replacementId" INTEGER,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeLeave_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_EmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_EmployeeLeave" ("approvedAt", "approvedBy", "createdAt", "employeeId", "endDate", "id", "leaveType", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt") SELECT "approvedAt", "approvedBy", "createdAt", "employeeId", "endDate", "id", "leaveType", "reason", "rejectionReason", "replacementId", "startDate", "status", "totalDays", "updatedAt" FROM "HR_EmployeeLeave";
DROP TABLE "HR_EmployeeLeave";
ALTER TABLE "new_HR_EmployeeLeave" RENAME TO "HR_EmployeeLeave";
CREATE INDEX "HR_EmployeeLeave_employeeId_idx" ON "HR_EmployeeLeave"("employeeId");
CREATE INDEX "HR_EmployeeLeave_status_idx" ON "HR_EmployeeLeave"("status");
CREATE INDEX "HR_EmployeeLeave_startDate_endDate_idx" ON "HR_EmployeeLeave"("startDate", "endDate");
CREATE TABLE "new_HR_MonthlyPayroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicSalary" REAL NOT NULL,
    "housingAllowance" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "foodAllowance" REAL NOT NULL DEFAULT 0,
    "fieldAllowance" REAL NOT NULL DEFAULT 0,
    "otherAllowances" REAL NOT NULL DEFAULT 0,
    "advances" REAL NOT NULL DEFAULT 0,
    "penalties" REAL NOT NULL DEFAULT 0,
    "absences" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "grossSalary" REAL NOT NULL,
    "totalDeductions" REAL NOT NULL,
    "netSalary" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" DATETIME,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_MonthlyPayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_MonthlyPayroll" ("absences", "advances", "basicSalary", "createdAt", "employeeId", "fieldAllowance", "foodAllowance", "grossSalary", "housingAllowance", "id", "month", "netSalary", "notes", "otherAllowances", "otherDeductions", "paymentDate", "paymentMethod", "paymentStatus", "penalties", "totalDeductions", "transportAllowance", "updatedAt", "year") SELECT "absences", "advances", "basicSalary", "createdAt", "employeeId", "fieldAllowance", "foodAllowance", "grossSalary", "housingAllowance", "id", "month", "netSalary", "notes", "otherAllowances", "otherDeductions", "paymentDate", "paymentMethod", "paymentStatus", "penalties", "totalDeductions", "transportAllowance", "updatedAt", "year" FROM "HR_MonthlyPayroll";
DROP TABLE "HR_MonthlyPayroll";
ALTER TABLE "new_HR_MonthlyPayroll" RENAME TO "HR_MonthlyPayroll";
CREATE INDEX "HR_MonthlyPayroll_employeeId_idx" ON "HR_MonthlyPayroll"("employeeId");
CREATE INDEX "HR_MonthlyPayroll_month_year_idx" ON "HR_MonthlyPayroll"("month", "year");
CREATE INDEX "HR_MonthlyPayroll_paymentStatus_idx" ON "HR_MonthlyPayroll"("paymentStatus");
CREATE UNIQUE INDEX "HR_MonthlyPayroll_employeeId_month_year_key" ON "HR_MonthlyPayroll"("employeeId", "month", "year");
CREATE TABLE "new_HR_WorkRotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "rotationType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_WorkRotation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HR_WorkRotation" ("createdAt", "employeeId", "endDate", "id", "location", "notes", "rotationType", "startDate", "status", "updatedAt") SELECT "createdAt", "employeeId", "endDate", "id", "location", "notes", "rotationType", "startDate", "status", "updatedAt" FROM "HR_WorkRotation";
DROP TABLE "HR_WorkRotation";
ALTER TABLE "new_HR_WorkRotation" RENAME TO "HR_WorkRotation";
CREATE INDEX "HR_WorkRotation_employeeId_idx" ON "HR_WorkRotation"("employeeId");
CREATE INDEX "HR_WorkRotation_status_idx" ON "HR_WorkRotation"("status");
CREATE INDEX "HR_WorkRotation_startDate_endDate_idx" ON "HR_WorkRotation"("startDate", "endDate");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetAudience" TEXT NOT NULL,
    "targetRole" TEXT,
    "targetUserIds" JSONB,
    "data" JSONB,
    "buttons" JSONB,
    "image" TEXT,
    "parseMode" TEXT DEFAULT 'HTML',
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringConfig" JSONB,
    "templateId" TEXT,
    "failureReason" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Notification" ("buttons", "createdAt", "data", "failureCount", "failureReason", "id", "image", "message", "metadata", "parseMode", "priority", "recurring", "recurringConfig", "scheduledAt", "sentAt", "status", "successCount", "targetAudience", "targetRole", "targetUserIds", "templateId", "type", "updatedAt") SELECT "buttons", "createdAt", "data", "failureCount", "failureReason", "id", "image", "message", "metadata", "parseMode", "priority", "recurring", "recurringConfig", "scheduledAt", "sentAt", "status", "successCount", "targetAudience", "targetRole", "targetUserIds", "templateId", "type", "updatedAt" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");
CREATE INDEX "Notification_targetAudience_idx" ON "Notification"("targetAudience");
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");
CREATE INDEX "Notification_sentAt_idx" ON "Notification"("sentAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_templateId_idx" ON "Notification"("templateId");
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");
CREATE INDEX "Notification_type_priority_idx" ON "Notification"("type", "priority");
CREATE TABLE "new_NotificationPreferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "types" JSONB,
    "priorities" JSONB,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "channels" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationPreferences" ("channels", "createdAt", "enabled", "id", "priorities", "quietHoursEnabled", "quietHoursEnd", "quietHoursStart", "types", "updatedAt", "userId") SELECT "channels", "createdAt", "enabled", "id", "priorities", "quietHoursEnabled", "quietHoursEnd", "quietHoursStart", "types", "updatedAt", "userId" FROM "NotificationPreferences";
DROP TABLE "NotificationPreferences";
ALTER TABLE "new_NotificationPreferences" RENAME TO "NotificationPreferences";
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");
CREATE INDEX "NotificationPreferences_userId_idx" ON "NotificationPreferences"("userId");
CREATE INDEX "NotificationPreferences_enabled_idx" ON "NotificationPreferences"("enabled");
CREATE INDEX "NotificationPreferences_quietHoursEnabled_idx" ON "NotificationPreferences"("quietHoursEnabled");
CREATE INDEX "NotificationPreferences_createdAt_idx" ON "NotificationPreferences"("createdAt");
CREATE INDEX "NotificationPreferences_updatedAt_idx" ON "NotificationPreferences"("updatedAt");
CREATE INDEX "NotificationPreferences_userId_enabled_idx" ON "NotificationPreferences"("userId", "enabled");
CREATE INDEX "NotificationPreferences_enabled_quietHoursEnabled_idx" ON "NotificationPreferences"("enabled", "quietHoursEnabled");
CREATE TABLE "new_NotificationRecipient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificationId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationRecipient" ("createdAt", "failureReason", "id", "notificationId", "sentAt", "status", "updatedAt", "userId") SELECT "createdAt", "failureReason", "id", "notificationId", "sentAt", "status", "updatedAt", "userId" FROM "NotificationRecipient";
DROP TABLE "NotificationRecipient";
ALTER TABLE "new_NotificationRecipient" RENAME TO "NotificationRecipient";
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");
CREATE INDEX "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");
CREATE INDEX "NotificationRecipient_sentAt_idx" ON "NotificationRecipient"("sentAt");
CREATE INDEX "NotificationRecipient_createdAt_idx" ON "NotificationRecipient"("createdAt");
CREATE INDEX "NotificationRecipient_failureReason_idx" ON "NotificationRecipient"("failureReason");
CREATE INDEX "NotificationRecipient_updatedAt_idx" ON "NotificationRecipient"("updatedAt");
CREATE INDEX "NotificationRecipient_notificationId_status_idx" ON "NotificationRecipient"("notificationId", "status");
CREATE INDEX "NotificationRecipient_userId_status_idx" ON "NotificationRecipient"("userId", "status");
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");
CREATE TABLE "new_NotificationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "variables" JSONB,
    "buttons" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_NotificationTemplate" ("buttons", "createdAt", "createdBy", "id", "isActive", "message", "name", "priority", "type", "updatedAt", "variables") SELECT "buttons", "createdAt", "createdBy", "id", "isActive", "message", "name", "priority", "type", "updatedAt", "variables" FROM "NotificationTemplate";
DROP TABLE "NotificationTemplate";
ALTER TABLE "new_NotificationTemplate" RENAME TO "NotificationTemplate";
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");
CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");
CREATE INDEX "NotificationTemplate_priority_idx" ON "NotificationTemplate"("priority");
CREATE INDEX "NotificationTemplate_createdBy_idx" ON "NotificationTemplate"("createdBy");
CREATE INDEX "NotificationTemplate_name_idx" ON "NotificationTemplate"("name");
CREATE INDEX "NotificationTemplate_createdAt_idx" ON "NotificationTemplate"("createdAt");
CREATE INDEX "NotificationTemplate_updatedAt_idx" ON "NotificationTemplate"("updatedAt");
CREATE INDEX "NotificationTemplate_isActive_type_idx" ON "NotificationTemplate"("isActive", "type");
CREATE INDEX "NotificationTemplate_type_priority_idx" ON "NotificationTemplate"("type", "priority");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "fullName" TEXT,
    "nickname" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'GUEST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" DATETIME,
    "bannedReason" TEXT,
    "bannedBy" INTEGER,
    "customPermissions" JSONB,
    "department" TEXT,
    "position" TEXT,
    "notes" TEXT,
    "lastActiveAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bannedAt", "bannedBy", "bannedReason", "createdAt", "customPermissions", "department", "email", "fullName", "id", "isActive", "isBanned", "lastActiveAt", "nickname", "notes", "phone", "position", "role", "telegramId", "updatedAt", "username") SELECT "bannedAt", "bannedBy", "bannedReason", "createdAt", "customPermissions", "department", "email", "fullName", "id", "isActive", "isBanned", "lastActiveAt", "nickname", "notes", "phone", "position", "role", "telegramId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_bannedBy_idx" ON "User"("bannedBy");
CREATE INDEX "User_department_idx" ON "User"("department");
CREATE INDEX "User_position_idx" ON "User"("position");
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "HR_Skill_name_key" ON "HR_Skill"("name");

-- CreateIndex
CREATE INDEX "HR_Document_employeeId_idx" ON "HR_Document"("employeeId");

-- CreateIndex
CREATE INDEX "HR_Certification_employeeId_idx" ON "HR_Certification"("employeeId");

-- CreateIndex
CREATE INDEX "HR_WorkExperience_employeeId_idx" ON "HR_WorkExperience"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_model_recordId_idx" ON "AuditLog"("model", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_changedByUserId_idx" ON "AuditLog"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeToSkill_AB_unique" ON "_EmployeeToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeToSkill_B_index" ON "_EmployeeToSkill"("B");
