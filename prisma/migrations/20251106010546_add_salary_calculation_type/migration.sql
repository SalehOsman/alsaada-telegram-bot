-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "salaryCalculationType" TEXT NOT NULL DEFAULT 'MONTHLY',
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
    "hasCustomCycle" BOOLEAN NOT NULL DEFAULT false,
    "currentWorkDays" INTEGER DEFAULT 0,
    "currentLeaveDays" INTEGER DEFAULT 0,
    "lastLeaveStartDate" DATETIME,
    "lastLeaveEndDate" DATETIME,
    "nextLeaveStartDate" DATETIME,
    "nextLeaveEndDate" DATETIME,
    "isOnLeave" BOOLEAN NOT NULL DEFAULT false,
    "isOnMission" BOOLEAN NOT NULL DEFAULT false,
    "currentLeaveId" INTEGER,
    "currentMissionId" INTEGER,
    "totalLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "totalDelayDays" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_HR_Employee" ("allowances", "annualLeaveBalance", "attendanceRequired", "bankAccountNumber", "bankName", "basicSalary", "bloodType", "casualLeaveBalance", "city", "companyId", "confirmationDate", "contractType", "country", "createdAt", "createdBy", "currency", "currentAddress", "currentAddressEn", "currentLeaveDays", "currentLeaveId", "currentMissionId", "currentWorkDays", "cv", "dateOfBirth", "departmentId", "directManagerId", "educationLevel", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "employeeCode", "employmentStatus", "employmentType", "fingerprintId", "fullName", "fullNameEn", "gender", "governorateId", "graduationYear", "hasCustomCycle", "hireDate", "iban", "id", "insuranceStartDate", "isActive", "isOnLeave", "isOnMission", "lastLeaveEndDate", "lastLeaveStartDate", "leaveDaysPerCycle", "major", "maritalStatus", "nationalId", "nationalIdCardUrl", "nationality", "nextLeaveEndDate", "nextLeaveStartDate", "nickname", "notes", "passportNumber", "paymentMethod", "permanentAddress", "personalEmail", "personalPhone", "placeOfBirth", "positionId", "postalCode", "profilePhoto", "region", "religion", "resignationDate", "sickLeaveBalance", "socialInsuranceNumber", "taxNumber", "telegramId", "terminationDate", "terminationReason", "totalDelayDays", "totalLeaveDays", "totalSalary", "transferNumber1", "transferNumber2", "transferType1", "transferType2", "university", "updatedAt", "updatedBy", "workDaysPerCycle", "workEmail", "workLocation", "workPhone", "workSchedule", "yearsOfExperience") SELECT "allowances", "annualLeaveBalance", "attendanceRequired", "bankAccountNumber", "bankName", "basicSalary", "bloodType", "casualLeaveBalance", "city", "companyId", "confirmationDate", "contractType", "country", "createdAt", "createdBy", "currency", "currentAddress", "currentAddressEn", "currentLeaveDays", "currentLeaveId", "currentMissionId", "currentWorkDays", "cv", "dateOfBirth", "departmentId", "directManagerId", "educationLevel", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "employeeCode", "employmentStatus", "employmentType", "fingerprintId", "fullName", "fullNameEn", "gender", "governorateId", "graduationYear", "hasCustomCycle", "hireDate", "iban", "id", "insuranceStartDate", "isActive", "isOnLeave", "isOnMission", "lastLeaveEndDate", "lastLeaveStartDate", "leaveDaysPerCycle", "major", "maritalStatus", "nationalId", "nationalIdCardUrl", "nationality", "nextLeaveEndDate", "nextLeaveStartDate", "nickname", "notes", "passportNumber", "paymentMethod", "permanentAddress", "personalEmail", "personalPhone", "placeOfBirth", "positionId", "postalCode", "profilePhoto", "region", "religion", "resignationDate", "sickLeaveBalance", "socialInsuranceNumber", "taxNumber", "telegramId", "terminationDate", "terminationReason", "totalDelayDays", "totalLeaveDays", "totalSalary", "transferNumber1", "transferNumber2", "transferType1", "transferType2", "university", "updatedAt", "updatedBy", "workDaysPerCycle", "workEmail", "workLocation", "workPhone", "workSchedule", "yearsOfExperience" FROM "HR_Employee";
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
