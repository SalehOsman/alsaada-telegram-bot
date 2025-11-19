-- CreateTable
CREATE TABLE "Company" (
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

-- CreateTable
CREATE TABLE "Branch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "manager" TEXT,
    "managerPhone" TEXT,
    "type" TEXT,
    "capacity" INTEGER,
    "openingDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "addressEn" TEXT,
    "country" TEXT,
    "email2" TEXT,
    "fax" TEXT,
    "nameEn" TEXT,
    "phone2" TEXT,
    "postalCode" TEXT,
    "website" TEXT,
    CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "location" TEXT,
    "city" TEXT,
    "region" TEXT,
    "contractValue" REAL,
    "currency" TEXT,
    "paidAmount" REAL,
    "remainingAmount" REAL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "actualEndDate" DATETIME,
    "projectManager" TEXT,
    "engineer" TEXT,
    "supervisor" TEXT,
    "status" TEXT,
    "progress" INTEGER,
    "priority" TEXT,
    "type" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "descriptionEn" TEXT,
    "nameEn" TEXT,
    CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
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

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "approvedBy" INTEGER,
    "rejectedBy" INTEGER,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "userId" INTEGER,
    CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JoinRequest_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JoinRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "oldRole" TEXT NOT NULL,
    "newRole" TEXT NOT NULL,
    "changedBy" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleChange_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoleChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
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

-- CreateTable
CREATE TABLE "Notification" (
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

-- CreateTable
CREATE TABLE "NotificationRecipient" (
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

-- CreateTable
CREATE TABLE "NotificationTemplate" (
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

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "type" TEXT NOT NULL,
    "userId" INTEGER DEFAULT 0,
    "featureId" TEXT DEFAULT '',
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "HR_Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "managerId" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "HR_Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultWorkDaysPerCycle" INTEGER,
    "defaultLeaveDaysPerCycle" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "HR_Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HR_Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location_Governorate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HR_Employee" (
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
CREATE TABLE "HR_EmployeeLeave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leaveNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'REGULAR',
    "settlementType" TEXT NOT NULL DEFAULT 'ACTUAL_LEAVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "actualReturnDate" DATETIME,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "isPostponed" BOOLEAN NOT NULL DEFAULT false,
    "postponedTimes" INTEGER NOT NULL DEFAULT 0,
    "allowanceAmount" REAL,
    "allowanceSettled" BOOLEAN NOT NULL DEFAULT false,
    "allowancePaidDate" DATETIME,
    "medicalReportPath" TEXT,
    "affectsNextLeave" BOOLEAN NOT NULL DEFAULT true,
    "replacementId" INTEGER,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeLeave_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_EmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_AllowanceType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HR_PositionAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "allowanceTypeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_PositionAllowance_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "HR_Position" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_PositionAllowance_allowanceTypeId_fkey" FOREIGN KEY ("allowanceTypeId") REFERENCES "HR_AllowanceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_EmployeeAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "allowanceTypeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "overridePosition" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_EmployeeAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_EmployeeAllowance_allowanceTypeId_fkey" FOREIGN KEY ("allowanceTypeId") REFERENCES "HR_AllowanceType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_MaterialEntitlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "dailyQuantity" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_MaterialEntitlement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_Bonus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bonusType" TEXT NOT NULL,
    "targetId" INTEGER,
    "bonusName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "durationMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "HR_PayrollRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "positionTitle" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodStartDate" DATETIME NOT NULL,
    "periodEndDate" DATETIME NOT NULL,
    "settlementType" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "workDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "totalAllowances" REAL NOT NULL DEFAULT 0,
    "totalBonuses" REAL NOT NULL DEFAULT 0,
    "materialAllowance" REAL NOT NULL DEFAULT 0,
    "grossSalary" REAL NOT NULL,
    "cashAdvances" REAL NOT NULL DEFAULT 0,
    "itemWithdrawals" REAL NOT NULL DEFAULT 0,
    "absenceDeductions" REAL NOT NULL DEFAULT 0,
    "otherDeductions" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL,
    "netSalary" REAL NOT NULL,
    "allowancesDetails" JSONB,
    "bonusesDetails" JSONB,
    "deductionsDetails" JSONB,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "paymentNotes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "deletedBy" BIGINT,
    "deleteReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_PayrollAuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payrollRecordId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actionBy" BIGINT NOT NULL,
    "actionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldData" JSONB,
    "newData" JSONB,
    "changes" JSONB,
    "notes" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "HR_PayrollAuditLog_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "HR_PayrollRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_MonthlyPayroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "actualWorkDays" INTEGER NOT NULL,
    "workDaysForAllowances" INTEGER NOT NULL,
    "daysBeforeHire" INTEGER NOT NULL DEFAULT 0,
    "daysAfterTermination" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "paidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "actualPresenceDays" INTEGER NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "proratedSalary" REAL NOT NULL DEFAULT 0,
    "housingAllowance" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "foodAllowance" REAL NOT NULL DEFAULT 0,
    "fieldAllowance" REAL NOT NULL DEFAULT 0,
    "materialAllowance" REAL NOT NULL DEFAULT 0,
    "totalAllowances" REAL NOT NULL DEFAULT 0,
    "totalBonuses" REAL NOT NULL DEFAULT 0,
    "totalLeaveAllowances" REAL NOT NULL DEFAULT 0,
    "totalAdvances" REAL NOT NULL DEFAULT 0,
    "totalWithdrawals" REAL NOT NULL DEFAULT 0,
    "totalDebts" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL DEFAULT 0,
    "totalDelayPenalties" REAL NOT NULL DEFAULT 0,
    "totalEarnings" REAL NOT NULL DEFAULT 0,
    "netSalary" REAL NOT NULL DEFAULT 0,
    "allowancesDetails" JSONB,
    "bonusesDetails" JSONB,
    "leaveAllowancesDetails" JSONB,
    "deductionsDetails" JSONB,
    "penaltiesDetails" JSONB,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "paymentNotes" TEXT,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "settledAt" DATETIME,
    "settledBy" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" BIGINT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HR_MonthlyPayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "Equipment_Type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "defaultCapacity" TEXT,
    "defaultFuelType" TEXT,
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "licenseType" TEXT,
    "maintenanceTrackingType" TEXT NOT NULL DEFAULT 'HOURS',
    "oilChangeInterval" INTEGER,
    "maintenanceIntervalDays" INTEGER,
    "maintenanceIntervalHours" INTEGER,
    "maintenanceIntervalKm" INTEGER,
    "inspectionIntervalDays" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Type_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Equipment_Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
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

-- CreateTable
CREATE TABLE "Equipment_Maintenance" (
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

-- CreateTable
CREATE TABLE "Equipment_Usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "operatorId" INTEGER,
    "shift" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "startMileage" INTEGER,
    "endMileage" INTEGER,
    "workingHours" REAL,
    "fuelConsumed" REAL,
    "fuelCost" REAL,
    "location" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Usage_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Usage_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment_Cost" (
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

-- CreateTable
CREATE TABLE "Equipment_Fuel_Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipmentId" INTEGER NOT NULL,
    "fuelDate" DATETIME NOT NULL,
    "fuelType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "currentMileage" INTEGER,
    "currentHours" INTEGER,
    "operatorId" INTEGER,
    "station" TEXT,
    "location" TEXT,
    "invoiceNumber" TEXT,
    "isFull" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "Equipment_Fuel_Log_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_Fuel_Log_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment_Maintenance_Schedule" (
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

-- CreateTable
CREATE TABLE "Equipment_Shift_Assignment" (
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
CREATE TABLE "HR_EmployeeMission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "missionNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "missionType" TEXT NOT NULL DEFAULT 'TASK_EXECUTION',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "allowanceAmount" REAL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "actualReturnDate" DATETIME,
    "notes" TEXT,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_EmployeeMission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_LeaveAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HR_LeaveAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_AdvanceItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'وحدة',
    "category" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "HR_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNumber" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'CASH_ADVANCE',
    "itemId" INTEGER,
    "quantity" REAL,
    "unitPrice" REAL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" DATETIME,
    "settledBy" BIGINT,
    "isManuallySettled" BOOLEAN NOT NULL DEFAULT false,
    "manualSettlementType" TEXT,
    "manualSettlementNote" TEXT,
    "manuallySettledAt" DATETIME,
    "manuallySettledBy" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT,
    CONSTRAINT "HR_Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HR_Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "HR_AdvanceItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_TransactionSettlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionIds" JSONB NOT NULL,
    "settlementType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "totalAmount" REAL NOT NULL,
    "description" TEXT,
    "settledBy" BIGINT NOT NULL,
    "settledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "transactionId" INTEGER,
    CONSTRAINT "HR_TransactionSettlement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "HR_Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_TransactionChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionId" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL DEFAULT 'EDIT',
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT NOT NULL,
    "changedBy" BIGINT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "HR_TransactionChangeLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "HR_Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepartmentConfig" (
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

-- CreateTable
CREATE TABLE "DepartmentAdmin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepartmentAdmin_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DepartmentAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubFeatureConfig" (
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

-- CreateTable
CREATE TABLE "HR_DelayPenaltyPolicy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "delayDays" INTEGER NOT NULL,
    "penaltyType" TEXT NOT NULL,
    "deductionDays" REAL,
    "suspensionDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "HR_AppliedPenalty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leaveId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "policyId" INTEGER,
    "penaltyType" TEXT NOT NULL,
    "deductionDays" REAL,
    "suspensionDays" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "cancelledBy" BIGINT,
    "cancelledAt" DATETIME,
    "isAppliedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "payrollRecordId" INTEGER,
    "appliedToPayrollAt" DATETIME,
    "createdBy" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notes" TEXT,
    CONSTRAINT "HR_AppliedPenalty_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "HR_EmployeeLeave" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "HR_DelayPenaltyPolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HR_AppliedPenalty_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "HR_PayrollRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HR_CycleChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "oldWorkDays" INTEGER,
    "oldLeaveDays" INTEGER,
    "newWorkDays" INTEGER,
    "newLeaveDays" INTEGER,
    "changedBy" BIGINT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT
);

-- CreateTable
CREATE TABLE "HR_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationTime" TEXT NOT NULL DEFAULT '09:00',
    "leaveStartReminderDays" INTEGER NOT NULL DEFAULT 1,
    "leaveEndReminderDays" INTEGER NOT NULL DEFAULT 1,
    "sectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "INV_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "prefix" TEXT,
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
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" BIGINT,
    "updatedBy" BIGINT
);

-- CreateTable
CREATE TABLE "INV_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "unitCapacity" REAL,
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

-- CreateTable
CREATE TABLE "INV_Stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "quantityNew" REAL NOT NULL DEFAULT 0,
    "quantityUsed" REAL NOT NULL DEFAULT 0,
    "quantityRefurbished" REAL NOT NULL DEFAULT 0,
    "lastUnitPrice" REAL NOT NULL DEFAULT 0,
    "averageCost" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0,
    "minQuantity" REAL NOT NULL DEFAULT 5,
    "maxQuantity" REAL,
    "reorderPoint" REAL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "lastPurchaseDate" DATETIME,
    "lastUsedDate" DATETIME,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "INV_Stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "INV_Stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNumber" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "quantityBefore" REAL NOT NULL,
    "quantityAfter" REAL NOT NULL,
    "unitPrice" REAL,
    "totalCost" REAL,
    "fromLocationId" INTEGER,
    "toLocationId" INTEGER,
    "equipmentId" INTEGER,
    "projectId" INTEGER,
    "employeeId" INTEGER,
    "supplierName" TEXT,
    "invoiceNumber" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" BIGINT NOT NULL,
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    CONSTRAINT "INV_Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_Transaction_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "INV_StorageLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "installedByEmployeeId" INTEGER,
    "installedByName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "INV_SparePartUsage_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "INV_Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "INV_SparePartUsage_installedByEmployeeId_fkey" FOREIGN KEY ("installedByEmployeeId") REFERENCES "HR_Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "actionTaken" TEXT,
    "actionDate" DATETIME,
    "actionBy" BIGINT,
    "recoveredValue" REAL NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" BIGINT,
    "approvedAt" DATETIME,
    "photos" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "INV_DamageRecord_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "INV_Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "INV_InventoryAudit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditNumber" TEXT NOT NULL,
    "warehouseType" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "categoryId" INTEGER,
    "locationId" INTEGER,
    "itemId" INTEGER,
    "itemCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "itemsChecked" INTEGER NOT NULL DEFAULT 0,
    "itemsWithDiff" INTEGER NOT NULL DEFAULT 0,
    "totalShortage" INTEGER NOT NULL DEFAULT 0,
    "totalSurplus" INTEGER NOT NULL DEFAULT 0,
    "auditDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" DATETIME,
    "createdBy" BIGINT NOT NULL,
    "completedBy" BIGINT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "INV_InventoryAuditItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "systemQuantity" REAL NOT NULL,
    "actualQuantity" REAL NOT NULL,
    "difference" REAL NOT NULL,
    "systemDetails" JSONB,
    "actualDetails" JSONB,
    "locationId" INTEGER,
    "locationName" TEXT,
    "categoryId" INTEGER,
    "categoryName" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyType" TEXT,
    "notes" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "INV_InventoryAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "INV_InventoryAudit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "INV_InventoryAuditItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "INV_Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_EmployeeToSkill" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_EmployeeToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "HR_Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EmployeeToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "HR_Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_createdBy_idx" ON "Company"("createdBy");

-- CreateIndex
CREATE INDEX "Company_updatedBy_idx" ON "Company"("updatedBy");

-- CreateIndex
CREATE INDEX "Company_establishedYear_idx" ON "Company"("establishedYear");

-- CreateIndex
CREATE INDEX "Company_legalForm_idx" ON "Company"("legalForm");

-- CreateIndex
CREATE INDEX "Company_governorateId_idx" ON "Company"("governorateId");

-- CreateIndex
CREATE INDEX "Company_city_idx" ON "Company"("city");

-- CreateIndex
CREATE INDEX "Company_country_idx" ON "Company"("country");

-- CreateIndex
CREATE INDEX "Company_createdAt_idx" ON "Company"("createdAt");

-- CreateIndex
CREATE INDEX "Company_name_isActive_idx" ON "Company"("name", "isActive");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE INDEX "Branch_name_idx" ON "Branch"("name");

-- CreateIndex
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");

-- CreateIndex
CREATE INDEX "Branch_createdBy_idx" ON "Branch"("createdBy");

-- CreateIndex
CREATE INDEX "Branch_updatedBy_idx" ON "Branch"("updatedBy");

-- CreateIndex
CREATE INDEX "Branch_type_idx" ON "Branch"("type");

-- CreateIndex
CREATE INDEX "Branch_capacity_idx" ON "Branch"("capacity");

-- CreateIndex
CREATE INDEX "Branch_city_idx" ON "Branch"("city");

-- CreateIndex
CREATE INDEX "Branch_country_idx" ON "Branch"("country");

-- CreateIndex
CREATE INDEX "Branch_createdAt_idx" ON "Branch"("createdAt");

-- CreateIndex
CREATE INDEX "Branch_companyId_isActive_idx" ON "Branch"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "Project_endDate_idx" ON "Project"("endDate");

-- CreateIndex
CREATE INDEX "Project_startDate_idx" ON "Project"("startDate");

-- CreateIndex
CREATE INDEX "Project_isActive_idx" ON "Project"("isActive");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

-- CreateIndex
CREATE INDEX "Project_updatedBy_idx" ON "Project"("updatedBy");

-- CreateIndex
CREATE INDEX "Project_priority_idx" ON "Project"("priority");

-- CreateIndex
CREATE INDEX "Project_type_idx" ON "Project"("type");

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");

-- CreateIndex
CREATE INDEX "Project_city_idx" ON "Project"("city");

-- CreateIndex
CREATE INDEX "Project_region_idx" ON "Project"("region");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_companyId_isActive_idx" ON "Project"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_bannedBy_idx" ON "User"("bannedBy");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE INDEX "User_position_idx" ON "User"("position");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_telegramId_key" ON "JoinRequest"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_userId_key" ON "JoinRequest"("userId");

-- CreateIndex
CREATE INDEX "JoinRequest_requestedAt_idx" ON "JoinRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "JoinRequest_status_idx" ON "JoinRequest"("status");

-- CreateIndex
CREATE INDEX "JoinRequest_telegramId_idx" ON "JoinRequest"("telegramId");

-- CreateIndex
CREATE INDEX "JoinRequest_approvedBy_idx" ON "JoinRequest"("approvedBy");

-- CreateIndex
CREATE INDEX "JoinRequest_rejectedBy_idx" ON "JoinRequest"("rejectedBy");

-- CreateIndex
CREATE INDEX "JoinRequest_respondedAt_idx" ON "JoinRequest"("respondedAt");

-- CreateIndex
CREATE INDEX "JoinRequest_fullName_idx" ON "JoinRequest"("fullName");

-- CreateIndex
CREATE INDEX "JoinRequest_phone_idx" ON "JoinRequest"("phone");

-- CreateIndex
CREATE INDEX "JoinRequest_nickname_idx" ON "JoinRequest"("nickname");

-- CreateIndex
CREATE INDEX "JoinRequest_status_requestedAt_idx" ON "JoinRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "RoleChange_changedBy_idx" ON "RoleChange"("changedBy");

-- CreateIndex
CREATE INDEX "RoleChange_userId_idx" ON "RoleChange"("userId");

-- CreateIndex
CREATE INDEX "RoleChange_createdAt_idx" ON "RoleChange"("createdAt");

-- CreateIndex
CREATE INDEX "RoleChange_oldRole_idx" ON "RoleChange"("oldRole");

-- CreateIndex
CREATE INDEX "RoleChange_newRole_idx" ON "RoleChange"("newRole");

-- CreateIndex
CREATE INDEX "RoleChange_reason_idx" ON "RoleChange"("reason");

-- CreateIndex
CREATE INDEX "RoleChange_changedBy_createdAt_idx" ON "RoleChange"("changedBy", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChange_userId_createdAt_idx" ON "RoleChange"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChange_oldRole_newRole_idx" ON "RoleChange"("oldRole", "newRole");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "Permission"("isActive");

-- CreateIndex
CREATE INDEX "Permission_name_idx" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_createdAt_idx" ON "Permission"("createdAt");

-- CreateIndex
CREATE INDEX "Permission_updatedAt_idx" ON "Permission"("updatedAt");

-- CreateIndex
CREATE INDEX "Permission_category_isActive_idx" ON "Permission"("category", "isActive");

-- CreateIndex
CREATE INDEX "Permission_name_isActive_idx" ON "Permission"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userId_idx" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_enabled_idx" ON "NotificationPreferences"("enabled");

-- CreateIndex
CREATE INDEX "NotificationPreferences_quietHoursEnabled_idx" ON "NotificationPreferences"("quietHoursEnabled");

-- CreateIndex
CREATE INDEX "NotificationPreferences_createdAt_idx" ON "NotificationPreferences"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationPreferences_updatedAt_idx" ON "NotificationPreferences"("updatedAt");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userId_enabled_idx" ON "NotificationPreferences"("userId", "enabled");

-- CreateIndex
CREATE INDEX "NotificationPreferences_enabled_quietHoursEnabled_idx" ON "NotificationPreferences"("enabled", "quietHoursEnabled");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_targetAudience_idx" ON "Notification"("targetAudience");

-- CreateIndex
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_sentAt_idx" ON "Notification"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_templateId_idx" ON "Notification"("templateId");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_priority_idx" ON "Notification"("type", "priority");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_sentAt_idx" ON "NotificationRecipient"("sentAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_createdAt_idx" ON "NotificationRecipient"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_failureReason_idx" ON "NotificationRecipient"("failureReason");

-- CreateIndex
CREATE INDEX "NotificationRecipient_updatedAt_idx" ON "NotificationRecipient"("updatedAt");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_status_idx" ON "NotificationRecipient"("notificationId", "status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_status_idx" ON "NotificationRecipient"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");

-- CreateIndex
CREATE INDEX "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE INDEX "NotificationTemplate_priority_idx" ON "NotificationTemplate"("priority");

-- CreateIndex
CREATE INDEX "NotificationTemplate_createdBy_idx" ON "NotificationTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "NotificationTemplate_name_idx" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_createdAt_idx" ON "NotificationTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationTemplate_updatedAt_idx" ON "NotificationTemplate"("updatedAt");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_type_idx" ON "NotificationTemplate"("isActive", "type");

-- CreateIndex
CREATE INDEX "NotificationTemplate_type_priority_idx" ON "NotificationTemplate"("type", "priority");

-- CreateIndex
CREATE INDEX "Setting_featureId_idx" ON "Setting"("featureId");

-- CreateIndex
CREATE INDEX "Setting_userId_idx" ON "Setting"("userId");

-- CreateIndex
CREATE INDEX "Setting_category_idx" ON "Setting"("category");

-- CreateIndex
CREATE INDEX "Setting_scope_idx" ON "Setting"("scope");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_updatedBy_idx" ON "Setting"("updatedBy");

-- CreateIndex
CREATE INDEX "Setting_isSecret_idx" ON "Setting"("isSecret");

-- CreateIndex
CREATE INDEX "Setting_createdAt_idx" ON "Setting"("createdAt");

-- CreateIndex
CREATE INDEX "Setting_updatedAt_idx" ON "Setting"("updatedAt");

-- CreateIndex
CREATE INDEX "Setting_category_scope_idx" ON "Setting"("category", "scope");

-- CreateIndex
CREATE INDEX "Setting_key_scope_idx" ON "Setting"("key", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_scope_userId_featureId_key" ON "Setting"("key", "scope", "userId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Department_code_key" ON "HR_Department"("code");

-- CreateIndex
CREATE INDEX "HR_Department_code_idx" ON "HR_Department"("code");

-- CreateIndex
CREATE INDEX "HR_Department_isActive_idx" ON "HR_Department"("isActive");

-- CreateIndex
CREATE INDEX "HR_Department_orderIndex_idx" ON "HR_Department"("orderIndex");

-- CreateIndex
CREATE INDEX "HR_Department_name_idx" ON "HR_Department"("name");

-- CreateIndex
CREATE INDEX "HR_Department_createdAt_idx" ON "HR_Department"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Position_code_key" ON "HR_Position"("code");

-- CreateIndex
CREATE INDEX "HR_Position_code_idx" ON "HR_Position"("code");

-- CreateIndex
CREATE INDEX "HR_Position_departmentId_idx" ON "HR_Position"("departmentId");

-- CreateIndex
CREATE INDEX "HR_Position_isActive_idx" ON "HR_Position"("isActive");

-- CreateIndex
CREATE INDEX "HR_Position_title_idx" ON "HR_Position"("title");

-- CreateIndex
CREATE INDEX "HR_Position_titleAr_idx" ON "HR_Position"("titleAr");

-- CreateIndex
CREATE INDEX "HR_Position_createdAt_idx" ON "HR_Position"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Location_Governorate_nameAr_key" ON "Location_Governorate"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "Location_Governorate_nameEn_key" ON "Location_Governorate"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Location_Governorate_code_key" ON "Location_Governorate"("code");

-- CreateIndex
CREATE INDEX "Location_Governorate_nameAr_idx" ON "Location_Governorate"("nameAr");

-- CreateIndex
CREATE INDEX "Location_Governorate_nameEn_idx" ON "Location_Governorate"("nameEn");

-- CreateIndex
CREATE INDEX "Location_Governorate_code_idx" ON "Location_Governorate"("code");

-- CreateIndex
CREATE INDEX "Location_Governorate_isActive_idx" ON "Location_Governorate"("isActive");

-- CreateIndex
CREATE INDEX "Location_Governorate_orderIndex_idx" ON "Location_Governorate"("orderIndex");

-- CreateIndex
CREATE INDEX "Location_Governorate_region_idx" ON "Location_Governorate"("region");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Employee_employeeCode_key" ON "HR_Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Employee_nationalId_key" ON "HR_Employee"("nationalId");

-- CreateIndex
CREATE INDEX "HR_Employee_employeeCode_idx" ON "HR_Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "HR_Employee_nationalId_idx" ON "HR_Employee"("nationalId");

-- CreateIndex
CREATE INDEX "HR_Employee_companyId_idx" ON "HR_Employee"("companyId");

-- CreateIndex
CREATE INDEX "HR_Employee_departmentId_idx" ON "HR_Employee"("departmentId");

-- CreateIndex
CREATE INDEX "HR_Employee_positionId_idx" ON "HR_Employee"("positionId");

-- CreateIndex
CREATE INDEX "HR_Employee_directManagerId_idx" ON "HR_Employee"("directManagerId");

-- CreateIndex
CREATE INDEX "HR_Employee_employmentStatus_idx" ON "HR_Employee"("employmentStatus");

-- CreateIndex
CREATE INDEX "HR_Employee_employmentType_idx" ON "HR_Employee"("employmentType");

-- CreateIndex
CREATE INDEX "HR_Employee_isActive_idx" ON "HR_Employee"("isActive");

-- CreateIndex
CREATE INDEX "HR_Employee_hireDate_idx" ON "HR_Employee"("hireDate");

-- CreateIndex
CREATE INDEX "HR_Employee_fullName_idx" ON "HR_Employee"("fullName");

-- CreateIndex
CREATE INDEX "HR_Employee_nickname_idx" ON "HR_Employee"("nickname");

-- CreateIndex
CREATE INDEX "HR_Employee_gender_idx" ON "HR_Employee"("gender");

-- CreateIndex
CREATE INDEX "HR_Employee_maritalStatus_idx" ON "HR_Employee"("maritalStatus");

-- CreateIndex
CREATE INDEX "HR_Employee_governorateId_idx" ON "HR_Employee"("governorateId");

-- CreateIndex
CREATE INDEX "HR_Employee_city_idx" ON "HR_Employee"("city");

-- CreateIndex
CREATE INDEX "HR_Employee_country_idx" ON "HR_Employee"("country");

-- CreateIndex
CREATE INDEX "HR_Employee_createdAt_idx" ON "HR_Employee"("createdAt");

-- CreateIndex
CREATE INDEX "HR_Employee_companyId_departmentId_idx" ON "HR_Employee"("companyId", "departmentId");

-- CreateIndex
CREATE INDEX "HR_Employee_companyId_isActive_idx" ON "HR_Employee"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "HR_Employee_departmentId_isActive_idx" ON "HR_Employee"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "HR_Employee_employmentStatus_isActive_idx" ON "HR_Employee"("employmentStatus", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Skill_name_key" ON "HR_Skill"("name");

-- CreateIndex
CREATE INDEX "HR_Document_employeeId_idx" ON "HR_Document"("employeeId");

-- CreateIndex
CREATE INDEX "HR_Certification_employeeId_idx" ON "HR_Certification"("employeeId");

-- CreateIndex
CREATE INDEX "HR_WorkExperience_employeeId_idx" ON "HR_WorkExperience"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "HR_EmployeeLeave_leaveNumber_key" ON "HR_EmployeeLeave"("leaveNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_employeeId_idx" ON "HR_EmployeeLeave"("employeeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_leaveNumber_idx" ON "HR_EmployeeLeave"("leaveNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_leaveType_idx" ON "HR_EmployeeLeave"("leaveType");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_status_idx" ON "HR_EmployeeLeave"("status");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_isActive_idx" ON "HR_EmployeeLeave"("isActive");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_startDate_endDate_idx" ON "HR_EmployeeLeave"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_EmployeeLeave_employeeId_isActive_idx" ON "HR_EmployeeLeave"("employeeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_AllowanceType_code_key" ON "HR_AllowanceType"("code");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_code_idx" ON "HR_AllowanceType"("code");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_isActive_idx" ON "HR_AllowanceType"("isActive");

-- CreateIndex
CREATE INDEX "HR_AllowanceType_orderIndex_idx" ON "HR_AllowanceType"("orderIndex");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_positionId_idx" ON "HR_PositionAllowance"("positionId");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_allowanceTypeId_idx" ON "HR_PositionAllowance"("allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_PositionAllowance_isActive_idx" ON "HR_PositionAllowance"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_PositionAllowance_positionId_allowanceTypeId_key" ON "HR_PositionAllowance"("positionId", "allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_employeeId_idx" ON "HR_EmployeeAllowance"("employeeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_allowanceTypeId_idx" ON "HR_EmployeeAllowance"("allowanceTypeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_isActive_idx" ON "HR_EmployeeAllowance"("isActive");

-- CreateIndex
CREATE INDEX "HR_EmployeeAllowance_startDate_endDate_idx" ON "HR_EmployeeAllowance"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_targetType_targetId_idx" ON "HR_MaterialEntitlement"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_itemId_idx" ON "HR_MaterialEntitlement"("itemId");

-- CreateIndex
CREATE INDEX "HR_MaterialEntitlement_isActive_idx" ON "HR_MaterialEntitlement"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HR_MaterialEntitlement_targetType_targetId_itemId_key" ON "HR_MaterialEntitlement"("targetType", "targetId", "itemId");

-- CreateIndex
CREATE INDEX "HR_Bonus_bonusType_idx" ON "HR_Bonus"("bonusType");

-- CreateIndex
CREATE INDEX "HR_Bonus_targetId_idx" ON "HR_Bonus"("targetId");

-- CreateIndex
CREATE INDEX "HR_Bonus_isActive_idx" ON "HR_Bonus"("isActive");

-- CreateIndex
CREATE INDEX "HR_Bonus_startDate_idx" ON "HR_Bonus"("startDate");

-- CreateIndex
CREATE INDEX "HR_Bonus_durationMonths_idx" ON "HR_Bonus"("durationMonths");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_employeeId_idx" ON "HR_PayrollRecord"("employeeId");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_month_year_idx" ON "HR_PayrollRecord"("month", "year");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_createdAt_idx" ON "HR_PayrollRecord"("createdAt");

-- CreateIndex
CREATE INDEX "HR_PayrollRecord_paymentStatus_idx" ON "HR_PayrollRecord"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "HR_PayrollRecord_employeeId_month_year_key" ON "HR_PayrollRecord"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_payrollRecordId_idx" ON "HR_PayrollAuditLog"("payrollRecordId");

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_actionBy_idx" ON "HR_PayrollAuditLog"("actionBy");

-- CreateIndex
CREATE INDEX "HR_PayrollAuditLog_actionAt_idx" ON "HR_PayrollAuditLog"("actionAt");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_employeeId_idx" ON "HR_MonthlyPayroll"("employeeId");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_month_year_idx" ON "HR_MonthlyPayroll"("month", "year");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_createdAt_idx" ON "HR_MonthlyPayroll"("createdAt");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_paymentStatus_idx" ON "HR_MonthlyPayroll"("paymentStatus");

-- CreateIndex
CREATE INDEX "HR_MonthlyPayroll_settlementStatus_idx" ON "HR_MonthlyPayroll"("settlementStatus");

-- CreateIndex
CREATE UNIQUE INDEX "HR_MonthlyPayroll_employeeId_month_year_key" ON "HR_MonthlyPayroll"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_Category_nameAr_key" ON "Equipment_Category"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_Category_nameEn_key" ON "Equipment_Category"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_Category_code_key" ON "Equipment_Category"("code");

-- CreateIndex
CREATE INDEX "Equipment_Category_code_idx" ON "Equipment_Category"("code");

-- CreateIndex
CREATE INDEX "Equipment_Category_isActive_idx" ON "Equipment_Category"("isActive");

-- CreateIndex
CREATE INDEX "Equipment_Category_orderIndex_idx" ON "Equipment_Category"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_Type_code_key" ON "Equipment_Type"("code");

-- CreateIndex
CREATE INDEX "Equipment_Type_code_idx" ON "Equipment_Type"("code");

-- CreateIndex
CREATE INDEX "Equipment_Type_categoryId_idx" ON "Equipment_Type"("categoryId");

-- CreateIndex
CREATE INDEX "Equipment_Type_isActive_idx" ON "Equipment_Type"("isActive");

-- CreateIndex
CREATE INDEX "Equipment_Type_orderIndex_idx" ON "Equipment_Type"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_plateNumber_key" ON "Equipment"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");

-- CreateIndex
CREATE INDEX "Equipment_code_idx" ON "Equipment"("code");

-- CreateIndex
CREATE INDEX "Equipment_plateNumber_idx" ON "Equipment"("plateNumber");

-- CreateIndex
CREATE INDEX "Equipment_equipmentTypeId_idx" ON "Equipment"("equipmentTypeId");

-- CreateIndex
CREATE INDEX "Equipment_companyId_idx" ON "Equipment"("companyId");

-- CreateIndex
CREATE INDEX "Equipment_currentProjectId_idx" ON "Equipment"("currentProjectId");

-- CreateIndex
CREATE INDEX "Equipment_currentOperatorId_idx" ON "Equipment"("currentOperatorId");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_condition_idx" ON "Equipment"("condition");

-- CreateIndex
CREATE INDEX "Equipment_isActive_idx" ON "Equipment"("isActive");

-- CreateIndex
CREATE INDEX "Equipment_nextMaintenanceDate_idx" ON "Equipment"("nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "Equipment_insuranceEndDate_idx" ON "Equipment"("insuranceEndDate");

-- CreateIndex
CREATE INDEX "Equipment_licenseExpiryDate_idx" ON "Equipment"("licenseExpiryDate");

-- CreateIndex
CREATE INDEX "Equipment_status_isActive_idx" ON "Equipment"("status", "isActive");

-- CreateIndex
CREATE INDEX "Equipment_companyId_status_idx" ON "Equipment"("companyId", "status");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_equipmentId_idx" ON "Equipment_Maintenance"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_maintenanceType_idx" ON "Equipment_Maintenance"("maintenanceType");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_maintenanceDate_idx" ON "Equipment_Maintenance"("maintenanceDate");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_nextDueDate_idx" ON "Equipment_Maintenance"("nextDueDate");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_performedById_idx" ON "Equipment_Maintenance"("performedById");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_equipmentId_maintenanceDate_idx" ON "Equipment_Maintenance"("equipmentId", "maintenanceDate");

-- CreateIndex
CREATE INDEX "Equipment_Usage_equipmentId_idx" ON "Equipment_Usage"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Usage_projectId_idx" ON "Equipment_Usage"("projectId");

-- CreateIndex
CREATE INDEX "Equipment_Usage_operatorId_idx" ON "Equipment_Usage"("operatorId");

-- CreateIndex
CREATE INDEX "Equipment_Usage_startDate_idx" ON "Equipment_Usage"("startDate");

-- CreateIndex
CREATE INDEX "Equipment_Usage_endDate_idx" ON "Equipment_Usage"("endDate");

-- CreateIndex
CREATE INDEX "Equipment_Usage_equipmentId_startDate_idx" ON "Equipment_Usage"("equipmentId", "startDate");

-- CreateIndex
CREATE INDEX "Equipment_Cost_equipmentId_idx" ON "Equipment_Cost"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Cost_costType_idx" ON "Equipment_Cost"("costType");

-- CreateIndex
CREATE INDEX "Equipment_Cost_costDate_idx" ON "Equipment_Cost"("costDate");

-- CreateIndex
CREATE INDEX "Equipment_Cost_equipmentId_costDate_idx" ON "Equipment_Cost"("equipmentId", "costDate");

-- CreateIndex
CREATE INDEX "Equipment_Fuel_Log_equipmentId_idx" ON "Equipment_Fuel_Log"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Fuel_Log_fuelDate_idx" ON "Equipment_Fuel_Log"("fuelDate");

-- CreateIndex
CREATE INDEX "Equipment_Fuel_Log_operatorId_idx" ON "Equipment_Fuel_Log"("operatorId");

-- CreateIndex
CREATE INDEX "Equipment_Fuel_Log_equipmentId_fuelDate_idx" ON "Equipment_Fuel_Log"("equipmentId", "fuelDate");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_equipmentId_idx" ON "Equipment_Maintenance_Schedule"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_maintenanceType_idx" ON "Equipment_Maintenance_Schedule"("maintenanceType");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_nextDueDate_idx" ON "Equipment_Maintenance_Schedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_status_idx" ON "Equipment_Maintenance_Schedule"("status");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_isActive_idx" ON "Equipment_Maintenance_Schedule"("isActive");

-- CreateIndex
CREATE INDEX "Equipment_Maintenance_Schedule_equipmentId_status_idx" ON "Equipment_Maintenance_Schedule"("equipmentId", "status");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_equipmentId_idx" ON "Equipment_Shift_Assignment"("equipmentId");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_operatorId_idx" ON "Equipment_Shift_Assignment"("operatorId");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_shift_idx" ON "Equipment_Shift_Assignment"("shift");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_startDate_idx" ON "Equipment_Shift_Assignment"("startDate");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_endDate_idx" ON "Equipment_Shift_Assignment"("endDate");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_isActive_idx" ON "Equipment_Shift_Assignment"("isActive");

-- CreateIndex
CREATE INDEX "Equipment_Shift_Assignment_equipmentId_shift_isActive_idx" ON "Equipment_Shift_Assignment"("equipmentId", "shift", "isActive");

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
CREATE UNIQUE INDEX "HR_EmployeeMission_missionNumber_key" ON "HR_EmployeeMission"("missionNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_employeeId_idx" ON "HR_EmployeeMission"("employeeId");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_missionNumber_idx" ON "HR_EmployeeMission"("missionNumber");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_missionType_idx" ON "HR_EmployeeMission"("missionType");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_status_idx" ON "HR_EmployeeMission"("status");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_isActive_idx" ON "HR_EmployeeMission"("isActive");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_startDate_endDate_idx" ON "HR_EmployeeMission"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HR_EmployeeMission_employeeId_isActive_idx" ON "HR_EmployeeMission"("employeeId", "isActive");

-- CreateIndex
CREATE INDEX "HR_LeaveAllowance_employeeId_idx" ON "HR_LeaveAllowance"("employeeId");

-- CreateIndex
CREATE INDEX "HR_LeaveAllowance_isSettled_idx" ON "HR_LeaveAllowance"("isSettled");

-- CreateIndex
CREATE INDEX "HR_LeaveAllowance_createdAt_idx" ON "HR_LeaveAllowance"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HR_AdvanceItem_code_key" ON "HR_AdvanceItem"("code");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_code_idx" ON "HR_AdvanceItem"("code");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_isActive_idx" ON "HR_AdvanceItem"("isActive");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_category_idx" ON "HR_AdvanceItem"("category");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_orderIndex_idx" ON "HR_AdvanceItem"("orderIndex");

-- CreateIndex
CREATE INDEX "HR_AdvanceItem_nameAr_idx" ON "HR_AdvanceItem"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "HR_Transaction_transactionNumber_key" ON "HR_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_idx" ON "HR_Transaction"("employeeId");

-- CreateIndex
CREATE INDEX "HR_Transaction_transactionNumber_idx" ON "HR_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "HR_Transaction_transactionType_idx" ON "HR_Transaction"("transactionType");

-- CreateIndex
CREATE INDEX "HR_Transaction_isSettled_idx" ON "HR_Transaction"("isSettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_isManuallySettled_idx" ON "HR_Transaction"("isManuallySettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_status_idx" ON "HR_Transaction"("status");

-- CreateIndex
CREATE INDEX "HR_Transaction_createdAt_idx" ON "HR_Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "HR_Transaction_itemId_idx" ON "HR_Transaction"("itemId");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_isSettled_idx" ON "HR_Transaction"("employeeId", "isSettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_isManuallySettled_idx" ON "HR_Transaction"("employeeId", "isManuallySettled");

-- CreateIndex
CREATE INDEX "HR_Transaction_employeeId_createdAt_idx" ON "HR_Transaction"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settledBy_idx" ON "HR_TransactionSettlement"("settledBy");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settlementType_idx" ON "HR_TransactionSettlement"("settlementType");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_settledAt_idx" ON "HR_TransactionSettlement"("settledAt");

-- CreateIndex
CREATE INDEX "HR_TransactionSettlement_createdAt_idx" ON "HR_TransactionSettlement"("createdAt");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_transactionId_idx" ON "HR_TransactionChangeLog"("transactionId");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changeType_idx" ON "HR_TransactionChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changedBy_idx" ON "HR_TransactionChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_changedAt_idx" ON "HR_TransactionChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX "HR_TransactionChangeLog_transactionId_changedAt_idx" ON "HR_TransactionChangeLog"("transactionId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentConfig_code_key" ON "DepartmentConfig"("code");

-- CreateIndex
CREATE INDEX "DepartmentConfig_code_idx" ON "DepartmentConfig"("code");

-- CreateIndex
CREATE INDEX "DepartmentConfig_isEnabled_idx" ON "DepartmentConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "DepartmentConfig_minRole_idx" ON "DepartmentConfig"("minRole");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_departmentId_idx" ON "DepartmentAdmin"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_userId_idx" ON "DepartmentAdmin"("userId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_telegramId_idx" ON "DepartmentAdmin"("telegramId");

-- CreateIndex
CREATE INDEX "DepartmentAdmin_isActive_idx" ON "DepartmentAdmin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentAdmin_departmentId_userId_key" ON "DepartmentAdmin"("departmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubFeatureConfig_code_key" ON "SubFeatureConfig"("code");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_code_idx" ON "SubFeatureConfig"("code");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_departmentCode_idx" ON "SubFeatureConfig"("departmentCode");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_isEnabled_idx" ON "SubFeatureConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "SubFeatureConfig_minRole_idx" ON "SubFeatureConfig"("minRole");

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

-- CreateIndex
CREATE UNIQUE INDEX "HR_DelayPenaltyPolicy_delayDays_key" ON "HR_DelayPenaltyPolicy"("delayDays");

-- CreateIndex
CREATE INDEX "HR_DelayPenaltyPolicy_delayDays_idx" ON "HR_DelayPenaltyPolicy"("delayDays");

-- CreateIndex
CREATE INDEX "HR_DelayPenaltyPolicy_isActive_idx" ON "HR_DelayPenaltyPolicy"("isActive");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_leaveId_idx" ON "HR_AppliedPenalty"("leaveId");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_employeeId_idx" ON "HR_AppliedPenalty"("employeeId");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_status_idx" ON "HR_AppliedPenalty"("status");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_isCancelled_idx" ON "HR_AppliedPenalty"("isCancelled");

-- CreateIndex
CREATE INDEX "HR_AppliedPenalty_isAppliedToPayroll_idx" ON "HR_AppliedPenalty"("isAppliedToPayroll");

-- CreateIndex
CREATE INDEX "HR_CycleChangeLog_entityType_entityId_idx" ON "HR_CycleChangeLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "HR_CycleChangeLog_changedBy_idx" ON "HR_CycleChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "HR_CycleChangeLog_changedAt_idx" ON "HR_CycleChangeLog"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "INV_Category_code_key" ON "INV_Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "INV_Category_prefix_key" ON "INV_Category"("prefix");

-- CreateIndex
CREATE INDEX "INV_Category_code_idx" ON "INV_Category"("code");

-- CreateIndex
CREATE INDEX "INV_Category_isActive_idx" ON "INV_Category"("isActive");

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
CREATE UNIQUE INDEX "INV_Item_code_key" ON "INV_Item"("code");

-- CreateIndex
CREATE UNIQUE INDEX "INV_Item_barcode_key" ON "INV_Item"("barcode");

-- CreateIndex
CREATE INDEX "INV_Item_code_idx" ON "INV_Item"("code");

-- CreateIndex
CREATE INDEX "INV_Item_barcode_idx" ON "INV_Item"("barcode");

-- CreateIndex
CREATE INDEX "INV_Item_categoryId_idx" ON "INV_Item"("categoryId");

-- CreateIndex
CREATE INDEX "INV_Item_isActive_idx" ON "INV_Item"("isActive");

-- CreateIndex
CREATE INDEX "INV_Item_nameAr_idx" ON "INV_Item"("nameAr");

-- CreateIndex
CREATE INDEX "INV_Item_partNumber_idx" ON "INV_Item"("partNumber");

-- CreateIndex
CREATE INDEX "INV_Item_manufacturer_idx" ON "INV_Item"("manufacturer");

-- CreateIndex
CREATE INDEX "INV_Item_responsibleEmployeeId_idx" ON "INV_Item"("responsibleEmployeeId");

-- CreateIndex
CREATE INDEX "INV_Stock_itemId_idx" ON "INV_Stock"("itemId");

-- CreateIndex
CREATE INDEX "INV_Stock_locationId_idx" ON "INV_Stock"("locationId");

-- CreateIndex
CREATE INDEX "INV_Stock_quantity_idx" ON "INV_Stock"("quantity");

-- CreateIndex
CREATE INDEX "INV_Stock_status_idx" ON "INV_Stock"("status");

-- CreateIndex
CREATE UNIQUE INDEX "INV_Stock_itemId_locationId_key" ON "INV_Stock"("itemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "INV_Transaction_transactionNumber_key" ON "INV_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "INV_Transaction_transactionNumber_idx" ON "INV_Transaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "INV_Transaction_itemId_idx" ON "INV_Transaction"("itemId");

-- CreateIndex
CREATE INDEX "INV_Transaction_transactionType_idx" ON "INV_Transaction"("transactionType");

-- CreateIndex
CREATE INDEX "INV_Transaction_transactionDate_idx" ON "INV_Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "INV_Transaction_createdBy_idx" ON "INV_Transaction"("createdBy");

-- CreateIndex
CREATE INDEX "INV_Transaction_employeeId_idx" ON "INV_Transaction"("employeeId");

-- CreateIndex
CREATE INDEX "INV_Transaction_equipmentId_idx" ON "INV_Transaction"("equipmentId");

-- CreateIndex
CREATE INDEX "INV_Transaction_projectId_idx" ON "INV_Transaction"("projectId");

-- CreateIndex
CREATE INDEX "INV_Transaction_itemId_transactionDate_idx" ON "INV_Transaction"("itemId", "transactionDate");

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
CREATE UNIQUE INDEX "INV_InventoryAudit_auditNumber_key" ON "INV_InventoryAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditNumber_idx" ON "INV_InventoryAudit"("auditNumber");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_warehouseType_idx" ON "INV_InventoryAudit"("warehouseType");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_status_idx" ON "INV_InventoryAudit"("status");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditType_idx" ON "INV_InventoryAudit"("auditType");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_auditDate_idx" ON "INV_InventoryAudit"("auditDate");

-- CreateIndex
CREATE INDEX "INV_InventoryAudit_createdBy_idx" ON "INV_InventoryAudit"("createdBy");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_auditId_idx" ON "INV_InventoryAuditItem"("auditId");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_itemType_idx" ON "INV_InventoryAuditItem"("itemType");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_itemId_idx" ON "INV_InventoryAuditItem"("itemId");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_hasDiscrepancy_idx" ON "INV_InventoryAuditItem"("hasDiscrepancy");

-- CreateIndex
CREATE INDEX "INV_InventoryAuditItem_discrepancyType_idx" ON "INV_InventoryAuditItem"("discrepancyType");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeToSkill_AB_unique" ON "_EmployeeToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeToSkill_B_index" ON "_EmployeeToSkill"("B");
