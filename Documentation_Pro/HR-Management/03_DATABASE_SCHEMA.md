# 🗄️ هيكل قاعدة البيانات الكامل - نظام إدارة الموارد البشرية
## Complete Database Schema - HR Management System

> **آخر تحديث:** 7 نوفمبر 2025  
> **الإصدار:** 3.0  
> **قاعدة البيانات:** SQLite (Prisma ORM)  
> **عدد الجداول:** 25+ جدول  
> **عدد العلاقات:** 60+ علاقة

---

## 📋 فهرس الجداول

### الجداول الأساسية (Core Tables)
1. [Employee](#1-employee) - جدول الموظفين الرئيسي ⭐
2. [Department](#2-department) - الأقسام
3. [Position](#3-position) - الوظائف
4. [Governorate](#4-governorate) - المحافظات

### جداول الإجازات (Leaves Tables)
5. [HR_EmployeeLeave](#5-hr_employeeleave) - الإجازات ⭐
6. [HR_EmployeeMission](#6-hr_employeemission) - المأموريات
7. [HR_LeaveAllowance](#7-hr_leaveallowance) - بدلات الإجازات
8. [HR_CycleChangeLog](#8-hr_cyclechangelog) - سجل دورات العمل/الإجازة

### جداول العقوبات (Penalties Tables) 🆕
9. [HR_DelayPenaltyPolicy](#9-hr_delaypenaltypolicy) - سياسات العقوبات
10. [HR_AppliedPenalty](#10-hr_appliedpenalty) - العقوبات المطبقة ⭐

### جداول الرواتب (Payroll Tables)
11. [HR_AllowanceType](#11-hr_allowancetype) - أنواع البدلات
12. [HR_PositionAllowance](#12-hr_positionallowance) - بدلات الوظائف
13. [HR_EmployeeAllowance](#13-hr_employeeallowance) - بدلات الموظفين
14. [HR_Bonus](#14-hr_bonus) - المكافآت
15. [HR_MaterialEntitlement](#15-hr_materialentitlement) - البدلات العينية
16. [HR_PayrollRecord](#16-hr_payrollrecord) - سجلات الرواتب
17. [HR_MonthlyPayroll](#17-hr_monthlypayroll) - الرواتب الشهرية
18. [HR_PayrollAuditLog](#18-hr_payrollauditlog) - سجل التدقيق

### جداول المعاملات المالية (Transactions Tables)
19. [HR_Transaction](#19-hr_transaction) - المعاملات (سلف/مسحوبات) ⭐
20. [HR_AdvanceItem](#20-hr_advanceitem) - أصناف السلف العينية
21. [HR_TransactionSettlement](#21-hr_transactionsettlement) - التسويات
22. [HR_TransactionChangeLog](#22-hr_transactionchangelog) - سجل التغييرات

### جداول الإعدادات (Settings Tables)
23. [HR_Settings](#23-hr_settings) - إعدادات النظام

---

## 📊 مخطط العلاقات الرئيسية

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Employee (المحور الرئيسي)                  │
│  - employmentStatus: ACTIVE | SUSPENDED | TERMINATED ⭐جديد        │
│  - workDaysPerCycle / leaveDaysPerCycle (دورات البحارة)            │
│  - annualLeaveBalance, sickLeaveBalance                           │
└─────────────────────────────────────────────────────────────────────┘
         │
         ├──> Position ──> Department
         ├──> Governorate
         │
         ├──> HR_EmployeeLeave (الإجازات)
         │      └──> HR_AppliedPenalty (العقوبات المرتبطة)
         │
         ├──> HR_AppliedPenalty (العقوبات)
         │      ├─ penaltyType: SUSPENSION ⭐ → employmentStatus = SUSPENDED
         │      └─ Auto-created by Scheduler عقوبات تلقائية
         │
         ├──> HR_Transaction (السلف والمسحوبات)
         │      └──> HR_AdvanceItem (الأصناف العينية)
         │
         ├──> HR_EmployeeAllowance (البدلات الثابتة)
         ├──> HR_Bonus (المكافآت الاستثنائية)
         ├──> HR_MaterialEntitlement (البدلات العينية - سجائر)
         │
         ├──> HR_PayrollRecord (سجلات الرواتب اليومية)
         └──> HR_MonthlyPayroll (سجلات الرواتب الشهرية)
```

---

## 🔍 الجداول التفصيلية

### 1. Employee
**جدول الموظفين الرئيسي - قلب النظام**

#### الحقول الأساسية:

```prisma
model Employee {
  id                       Int                   @id @default(autoincrement())
  employeeCode             String                @unique // كود الموظف الفريد
  fullName                 String                // الاسم الكامل
  fullNameEn               String?               // الاسم بالإنجليزية
  nickname                 String?               // الاسم المختصر
  nationalId               String                @unique // الرقم القومي
  passportNumber           String?               // رقم الجواز
  
  // معلومات شخصية
  gender                   Gender                // ذكر/أنثى
  dateOfBirth              DateTime              // تاريخ الميلاد
  placeOfBirth             String?               // مكان الميلاد
  nationality              String                // الجنسية
  maritalStatus            MaritalStatus         // الحالة الاجتماعية
  religion                 String?               // الديانة
  bloodType                String?               // فصيلة الدم
  
  // معلومات الاتصال
  personalEmail            String?
  workEmail                String?
  personalPhone            String
  workPhone                String?
  telegramId               String?
  
  emergencyContactName     String                // اسم جهة الاتصال للطوارئ
  emergencyContactPhone    String                // هاتف الطوارئ
  emergencyContactRelation String?               // صلة القرابة
  
  // العنوان
  currentAddress           String                // العنوان الحالي
  currentAddressEn         String?
  permanentAddress         String?               // العنوان الدائم
  governorateId            Int?                  // المحافظة
  city                     String                // المدينة
  region                   String?               // المنطقة
  country                  String                @default("Egypt")
  postalCode               String?               // الكود البريدي
  
  // معلومات الوظيفة
  companyId                Int                   // الشركة
  departmentId             Int                   // القسم
  positionId               Int                   // الوظيفة
  employmentType           EmploymentType        // نوع العمل (كامل/جزئي)
  contractType             ContractType          // نوع العقد (دائم/مؤقت)
  
  // 🆕 الحالة الوظيفية - محدثة
  employmentStatus         EmploymentStatus      @default(ACTIVE)
  // ACTIVE | SUSPENDED ⭐ | ON_LEAVE | TERMINATED | RESIGNED | RETIRED
  
  hireDate                 DateTime              // تاريخ التعيين
  confirmationDate         DateTime?             // تاريخ التثبيت
  resignationDate          DateTime?             // تاريخ الاستقالة
  terminationDate          DateTime?             // تاريخ الفصل
  terminationReason        String?               // سبب الفصل
  
  // المعلومات المالية
  basicSalary              Float                 // الراتب الأساسي
  allowances               Float?                @default(0) // البدلات
  totalSalary              Float                 // إجمالي الراتب
  currency                 String                @default("EGP")
  paymentMethod            PaymentMethod         @default(BANK_TRANSFER)
  
  bankName                 String?               // اسم البنك
  bankAccountNumber        String?               // رقم الحساب
  iban                     String?               // الآيبان
  transferNumber1          String?               // رقم تحويل 1
  transferType1            TransferType?         // نوع التحويل 1
  transferNumber2          String?               // رقم تحويل 2
  transferType2            TransferType?         // نوع التحويل 2
  
  socialInsuranceNumber    String?               // رقم التأمين الاجتماعي
  taxNumber                String?               // الرقم الضريبي
  insuranceStartDate       DateTime?             // تاريخ بدء التأمين
  
  // 🆕 نوع حساب الراتب
  salaryCalculationType    SalaryCalculationType @default(MONTHLY)
  // DAILY (يومي للمياومين) | MONTHLY (شهري للموظفين الثابتين)
  
  directManagerId          Int?                  // المدير المباشر
  workSchedule             String?               // جدول العمل
  workLocation             String?               // موقع العمل
  
  // التعليم والخبرة
  educationLevel           EducationLevel?       // المؤهل
  major                    String?               // التخصص
  university               String?               // الجامعة
  graduationYear           Int?                  // سنة التخرج
  yearsOfExperience        Int?                  @default(0) // سنوات الخبرة
  
  // المرفقات
  profilePhoto             String?               // الصورة الشخصية
  cv                       String?               // السيرة الذاتية
  nationalIdCardUrl        String?               // صورة البطاقة
  
  // أرصدة الإجازات
  annualLeaveBalance       Int                   @default(21) // رصيد الإجازة السنوية
  sickLeaveBalance         Int                   @default(180) // رصيد الإجازة المرضية
  casualLeaveBalance       Int                   @default(7) // رصيد الإجازة العارضة
  
  attendanceRequired       Boolean               @default(false) // يتطلب حضور
  
  // 🌟 نظام دورات العمل والإجازة (للبحارة)
  workDaysPerCycle         Int?                  // أيام العمل في الدورة (مثلاً 90)
  leaveDaysPerCycle        Int?                  // أيام الإجازة في الدورة (مثلاً 45)
  hasCustomCycle           Boolean               @default(false) // دورة مخصصة
  
  currentWorkDays          Int?                  @default(0) // أيام العمل الحالية
  currentLeaveDays         Int?                  @default(0) // أيام الإجازة الحالية
  
  lastLeaveStartDate       DateTime?             // تاريخ بدء آخر إجازة
  lastLeaveEndDate         DateTime?             // تاريخ نهاية آخر إجازة
  nextLeaveStartDate       DateTime?             // تاريخ بدء الإجازة القادمة
  nextLeaveEndDate         DateTime?             // تاريخ نهاية الإجازة القادمة
  
  // حالة الإجازة/المأمورية
  isOnLeave                Boolean               @default(false) // في إجازة
  isOnMission              Boolean               @default(false) // في مأمورية
  currentLeaveId           Int?                  // الإجازة الحالية
  currentMissionId         Int?                  // المأمورية الحالية
  
  totalLeaveDays           Int                   @default(0) // إجمالي أيام الإجازة
  totalDelayDays           Int                   @default(0) // إجمالي أيام التأخير
  
  fingerprintId            String?               // رقم البصمة
  notes                    String?               // ملاحظات
  isActive                 Boolean               @default(true) // نشط
  
  createdAt                DateTime              @default(now())
  updatedAt                DateTime              @updatedAt
  createdBy                Int?
  updatedBy                Int?
  
  // العلاقات (Relations)
  position                 Position              @relation(fields: [positionId], references: [id])
  department               Department            @relation(fields: [departmentId], references: [id])
  company                  Company               @relation(fields: [companyId], references: [id])
  governorate              Governorate?          @relation("EmployeeGovernorate", fields: [governorateId], references: [id])
  directManager            Employee?             @relation("ManagerSubordinates", fields: [directManagerId], references: [id])
  subordinates             Employee[]            @relation("ManagerSubordinates")
  
  // إجازات ومأموريات
  leaves                   HR_EmployeeLeave[]    @relation("EmployeeLeaves")
  leaveReplacements        HR_EmployeeLeave[]    @relation("LeaveReplacements")
  missions                 HR_EmployeeMission[]  @relation("EmployeeMissions")
  leaveAllowances          HR_LeaveAllowance[]   @relation("EmployeeAllowances")
  
  // المعاملات المالية
  transactions             HR_Transaction[]      @relation("EmployeeTransactions")
  
  // الرواتب
  employeeAllowances       HR_EmployeeAllowance[] @relation("EmployeeAllowances")
  payrollRecords           HR_PayrollRecord[]    @relation("EmployeePayrollRecords")
  monthlyPayrolls          HR_MonthlyPayroll[]   @relation("EmployeeMonthlyPayrolls")
  
  // 🆕 نظام العقوبات
  appliedPenalties         HR_AppliedPenalty[]   @relation("EmployeeAppliedPenalties")
  
  // أخرى
  skills                   Skill[]
  certifications           Certification[]
  documents                Document[]
  workHistory              WorkExperience[]
  
  // (... معدات وشيفتات ومهندسي أنظمة أخرى)
  
  @@map("HR_Employee")
}
```

#### Enums مهمة:

```prisma
enum EmploymentStatus {
  ACTIVE        // نشط ✅
  ON_LEAVE      // في إجازة
  SUSPENDED     // موقوف 🆕⭐ (نتيجة عقوبة)
  RESIGNED      // مستقيل
  TERMINATED    // مفصول
  RETIRED       // متقاعد
  ON_MISSION    // في مأمورية
  SETTLED       // مسوّى
}

enum SalaryCalculationType {
  DAILY    // يومي (للمياومين)
  MONTHLY  // شهري (للموظفين الثابتين)
}

enum EmploymentType {
  FULL_TIME   // دوام كامل
  PART_TIME   // دوام جزئي
  CONTRACT    // عقد
  FREELANCE   // حر
}

enum ContractType {
  PERMANENT    // دائم
  TEMPORARY    // مؤقت
  PROBATION    // تحت الاختبار
}
```

---

### 2. Department
**جدول الأقسام**

```prisma
model Department {
  id          Int        @id @default(autoincrement())
  name        String     // اسم القسم
  nameEn      String?    // الاسم بالإنجليزية
  code        String     @unique // كود القسم
  description String?    // الوصف
  managerId   Int?       // مدير القسم
  orderIndex  Int        @default(0) // الترتيب
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  createdBy   Int?
  updatedBy   Int?
  
  // العلاقات
  employees   Employee[]
  positions   Position[]
  
  @@map("HR_Department")
}
```

---

### 3. Position
**جدول الوظائف**

```prisma
model Position {
  id                       Int        @id @default(autoincrement())
  title                    String     // المسمى الوظيفي
  titleAr                  String     // المسمى بالعربية
  code                     String     @unique // كود الوظيفة
  description              String?    // الوصف
  departmentId             Int        // القسم
  orderIndex               Int        @default(0) // الترتيب
  isActive                 Boolean    @default(true)
  
  // 🌟 إعدادات دورات العمل الافتراضية
  defaultWorkDaysPerCycle  Int?       // أيام العمل الافتراضية (مثلاً 90 للبحارة)
  defaultLeaveDaysPerCycle Int?       // أيام الإجازة الافتراضية (مثلاً 45)
  
  createdAt                DateTime   @default(now())
  updatedAt                DateTime   @updatedAt
  createdBy                Int?
  updatedBy                Int?
  
  // العلاقات
  employees                Employee[]
  department               Department @relation(fields: [departmentId], references: [id])
  positionAllowances       HR_PositionAllowance[] @relation("PositionAllowances")
  
  @@map("HR_Position")
}
```

---

### 4. Governorate
**جدول المحافظات**

```prisma
model Governorate {
  id         Int        @id @default(autoincrement())
  nameAr     String     @unique // الاسم بالعربية
  nameEn     String     @unique // الاسم بالإنجليزية
  code       String     @unique // الكود
  region     String?    // المنطقة (مثلاً: الدلتا، الصعيد، إلخ)
  orderIndex Int        @default(0) // الترتيب
  isActive   Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  
  // العلاقات
  companies  Company[]  @relation("CompanyGovernorate")
  employees  Employee[] @relation("EmployeeGovernorate")
}
```

---

### 5. HR_EmployeeLeave
**جدول الإجازات - مركزي جداً**

```prisma
model HR_EmployeeLeave {
  id                  Int                  @id @default(autoincrement())
  employeeId          Int                  // الموظف
  leaveNumber         String               @unique // رقم الإجازة الفريد
  leaveType           LeaveType            // نوع الإجازة
  
  // التواريخ
  startDate           DateTime             // تاريخ البداية
  endDate             DateTime             // تاريخ النهاية المتوقعة
  actualReturnDate    DateTime?            // 🆕 تاريخ العودة الفعلي
  
  totalDays           Int                  // إجمالي الأيام
  delayDays           Int                  @default(0) // أيام التأخير
  
  reason              String?              // السبب
  notes               String?              // ملاحظات
  
  // بدل الموظف أثناء الإجازة
  replacementEmployeeId Int?               // الموظف البديل
  
  // الحالة
  status              LeaveStatus          // PENDING | APPROVED | REJECTED | CANCELLED
  isActive            Boolean              @default(true)
  
  approvedBy          BigInt?              // من وافق
  approvedAt          DateTime?            // متى الموافقة
  rejectedBy          BigInt?              // من رفض
  rejectedAt          DateTime?            // متى الرفض
  rejectionReason     String?              // سبب الرفض
  
  createdBy           BigInt               // من أنشأ
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  updatedBy           BigInt?
  
  // العلاقات
  employee            Employee             @relation("EmployeeLeaves", fields: [employeeId], references: [id])
  replacementEmployee Employee?            @relation("LeaveReplacements", fields: [replacementEmployeeId], references: [id])
  
  leaveAllowances     HR_LeaveAllowance[]  @relation("LeaveAllowances")
  
  // 🆕 العقوبات المرتبطة بالإجازة
  penalties           HR_AppliedPenalty[]  @relation("LeaveRelatedPenalties")
}
```

#### Enums:

```prisma
enum LeaveType {
  ANNUAL      // إجازة اعتيادية
  SICK        // إجازة مرضية
  EMERGENCY   // إجازة عارضة
  UNPAID      // إجازة بدون مرتب 🆕 (مهمة للحسابات)
  STUDY       // إجازة دراسية
  MATERNITY   // إجازة وضع
  DEATH       // إجازة وفاة
  MISSION     // مأمورية
}

enum LeaveStatus {
  PENDING    // معلقة
  APPROVED   // معتمدة
  REJECTED   // مرفوضة
  CANCELLED  // ملغاة
}
```

**🔔 ملاحظة مهمة:**
- حقل `actualReturnDate` مهم جداً في كشف التأخير
- إذا كان `null` وتجاوزنا `endDate + 5 أيام` → عقوبة تلقائية

---

### 6. HR_EmployeeMission
**جدول المأموريات**

```prisma
model HR_EmployeeMission {
  id                  Int            @id @default(autoincrement())
  employeeId          Int
  missionNumber       String         @unique // رقم المأمورية
  destination         String         // الوجهة
  purpose             String         // الغرض
  startDate           DateTime
  endDate             DateTime
  actualReturnDate    DateTime?
  totalDays           Int
  delayDays           Int            @default(0)
  status              MissionStatus  // PENDING | APPROVED | REJECTED | CANCELLED | COMPLETED
  isActive            Boolean        @default(true)
  
  approvedBy          BigInt?
  approvedAt          DateTime?
  rejectedBy          BigInt?
  rejectedAt          DateTime?
  rejectionReason     String?
  
  createdBy           BigInt
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  updatedBy           BigInt?
  
  employee            Employee       @relation("EmployeeMissions", fields: [employeeId], references: [id])
}
```

---

### 7. HR_LeaveAllowance
**جدول بدلات الإجازات**

```prisma
model HR_LeaveAllowance {
  id                Int                @id @default(autoincrement())
  employeeId        Int
  leaveId           Int
  allowanceTypeId   Int
  amount            Float
  isSettled         Boolean            @default(false)
  notes             String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  employee          Employee           @relation("EmployeeAllowances", fields: [employeeId], references: [id])
  leave             HR_EmployeeLeave   @relation("LeaveAllowances", fields: [leaveId], references: [id])
  allowanceType     HR_AllowanceType   @relation(fields: [allowanceTypeId], references: [id])
}
```

---

### 8. HR_CycleChangeLog
**سجل تغييرات دورات العمل/الإجازة**

```prisma
model HR_CycleChangeLog {
  id                Int      @id @default(autoincrement())
  employeeId        Int
  oldWorkDays       Int?
  newWorkDays       Int?
  oldLeaveDays      Int?
  newLeaveDays      Int?
  reason            String?
  changedBy         BigInt
  createdAt         DateTime @default(now())
}
```

---

### 9. HR_DelayPenaltyPolicy
**سياسات عقوبات التأخير**

```prisma
model HR_DelayPenaltyPolicy {
  id                Int                @id @default(autoincrement())
  name              String             // اسم السياسة
  nameAr            String             // الاسم بالعربية
  description       String?
  minDelayDays      Int                // الحد الأدنى لأيام التأخير
  maxDelayDays      Int?               // الحد الأقصى (null = لا نهاية)
  penaltyType       DelayPenaltyType   // نوع العقوبة
  deductionDays     Int?               // أيام الخصم (إذا كان خصم أيام)
  deductionAmount   Float?             // مبلغ الخصم (إذا كان خصم مالي)
  isActive          Boolean            @default(true)
  orderIndex        Int                @default(0) // الترتيب
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

#### Enums:

```prisma
enum DelayPenaltyType {
  WARNING      // إنذار
  DEDUCTION    // خصم مالي
  DAY_CUT      // خصم أيام
  SUSPENSION   // إيقاف عن العمل 🆕⭐
}
```

---

### 10. HR_AppliedPenalty
**🆕 العقوبات المطبقة - جدول مركزي جداً**

```prisma
model HR_AppliedPenalty {
  id                Int                  @id @default(autoincrement())
  employeeId        Int                  // الموظف المعاقب
  leaveId           Int?                 // الإجازة المرتبطة (إن وجدت)
  policyId          Int?                 // السياسة المطبقة
  
  penaltyType       DelayPenaltyType     // نوع العقوبة
  penaltyReason     String?              // السبب
  
  delayDays         Int?                 // أيام التأخير (إن كانت السبب)
  deductionDays     Int?                 // أيام الخصم
  deductionAmount   Float?               // مبلغ الخصم
  
  // 🆕 حالة العقوبة
  status            PenaltyStatus        @default(PENDING)
  // PENDING | APPROVED | REJECTED | CANCELLED
  
  // الموافقات
  approvedBy        BigInt?
  approvedAt        DateTime?
  rejectedBy        BigInt?
  rejectedAt        DateTime?
  rejectionReason   String?
  
  // 🆕 علامة العقوبة التلقائية
  isAutoCreated     Boolean              @default(false)
  // true = تم إنشاؤها بواسطة Auto-Penalties Scheduler
  
  notes             String?
  isActive          Boolean              @default(true)
  
  createdBy         BigInt               // من أنشأها
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  updatedBy         BigInt?
  
  // العلاقات
  employee          Employee             @relation("EmployeeAppliedPenalties", fields: [employeeId], references: [id])
  leave             HR_EmployeeLeave?    @relation("LeaveRelatedPenalties", fields: [leaveId], references: [id])
  policy            HR_DelayPenaltyPolicy? @relation(fields: [policyId], references: [id])
}
```

#### Enums:

```prisma
enum PenaltyStatus {
  PENDING    // معلقة (في انتظار الموافقة)
  APPROVED   // معتمدة ✅ → تطبيق التأثير (مثلاً: SUSPENDED)
  REJECTED   // مرفوضة
  CANCELLED  // ملغاة
}
```

**🔔 ملاحظات مهمة جداً:**

1. **عند الموافقة على عقوبة نوع `SUSPENSION`:**
   ```typescript
   // في delay-penalty.service.ts → approvePenalty()
   if (penalty.penaltyType === 'SUSPENSION') {
     await prisma.employee.update({
       where: { id: penalty.employeeId },
       data: { employmentStatus: 'SUSPENDED' }
     });
   }
   ```

2. **العقوبات التلقائية (`isAutoCreated = true`):**
   - يتم إنشاؤها بواسطة `AutoPenaltiesScheduler`
   - Cron Job يومي الساعة 9 صباحاً
   - تكشف الإجازات المتأخرة 5+ أيام
   - ترسل إشعارات فورية ويومية

---

### 11. HR_AllowanceType
**أنواع البدلات**

```prisma
model HR_AllowanceType {
  id                  Int                      @id @default(autoincrement())
  code                String                   @unique // الكود (TRANSPORT, LEAVE, FOOD, etc.)
  nameAr              String                   // الاسم بالعربية
  nameEn              String?                  // الاسم بالإنجليزية
  description         String?
  category            AllowanceCategory        // التصنيف
  isActive            Boolean                  @default(true)
  isFixedAmount       Boolean                  @default(false) // مبلغ ثابت؟
  defaultAmount       Float?                   // المبلغ الافتراضي
  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt
  
  // العلاقات
  positionAllowances  HR_PositionAllowance[]
  employeeAllowances  HR_EmployeeAllowance[]
  leaveAllowances     HR_LeaveAllowance[]
}
```

#### Enums:

```prisma
enum AllowanceCategory {
  TRANSPORT      // مواصلات
  FOOD           // طعام
  HOUSING        // سكن
  COMMUNICATION  // اتصالات
  LEAVE          // إجازات
  OTHER          // أخرى
}
```

---

### 12. HR_PositionAllowance
**بدلات الوظائف**

```prisma
model HR_PositionAllowance {
  id              Int              @id @default(autoincrement())
  positionId      Int              // الوظيفة
  allowanceTypeId Int              // نوع البدل
  amount          Float            // المبلغ
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  position        Position         @relation("PositionAllowances", fields: [positionId], references: [id])
  allowanceType   HR_AllowanceType @relation(fields: [allowanceTypeId], references: [id])
}
```

---

### 13. HR_EmployeeAllowance
**بدلات الموظفين (الثابتة)**

```prisma
model HR_EmployeeAllowance {
  id              Int              @id @default(autoincrement())
  employeeId      Int              // الموظف
  allowanceTypeId Int              // نوع البدل
  amount          Float            // المبلغ
  notes           String?
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  employee        Employee         @relation("EmployeeAllowances", fields: [employeeId], references: [id])
  allowanceType   HR_AllowanceType @relation(fields: [allowanceTypeId], references: [id])
}
```

---

### 14. HR_Bonus
**المكافآت الاستثنائية**

```prisma
model HR_Bonus {
  id              Int        @id @default(autoincrement())
  employeeId      Int        // الموظف
  bonusType       BonusType  // نوع المكافأة
  description     String     // 🆕 الوصف (يُعرض في التقرير بدلاً من النوع)
  amount          Float      // المبلغ
  bonusDate       DateTime   // تاريخ المكافأة
  reason          String?    // السبب
  notes           String?
  isActive        Boolean    @default(true)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  employee        Employee   @relation(fields: [employeeId], references: [id])
}
```

#### Enums:

```prisma
enum BonusType {
  INDIVIDUAL     // مكافأة فردية
  PERFORMANCE    // مكافأة أداء
  HOLIDAY        // مكافأة عيد
  OTHER          // أخرى
}
```

---

### 15. HR_MaterialEntitlement
**البدلات العينية (سجائر وغيرها)**

```prisma
model HR_MaterialEntitlement {
  id              Int      @id @default(autoincrement())
  employeeId      Int      // الموظف
  itemType        String   // نوع الصنف (سجائر، وجبات، إلخ)
  itemName        String   // اسم الصنف
  quantity        Float    // الكمية
  unitPrice       Float    // سعر الوحدة
  totalAmount     Float    // المبلغ الإجمالي
  entitlementDate DateTime // تاريخ الاستحقاق
  notes           String?
  isSettled       Boolean  @default(false) // مسوّى؟
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  employee        Employee @relation(fields: [employeeId], references: [id])
}
```

---

### 16. HR_PayrollRecord
**سجلات الرواتب (يومي/شهري)**

```prisma
model HR_PayrollRecord {
  id                    Int      @id @default(autoincrement())
  employeeId            Int      // الموظف
  recordNumber          String   @unique // رقم السجل
  
  startDate             DateTime // تاريخ البداية
  endDate               DateTime // تاريخ النهاية
  
  // الراتب الأساسي
  basicSalary           Float    // الراتب الأساسي
  workingDays           Int      // أيام العمل الفعلية
  
  // الإضافات
  allowances            Float    @default(0) // البدلات الثابتة
  bonuses               Float    @default(0) // المكافآت
  
  // الخصومات
  advances              Float    @default(0) // السلف
  withdrawals           Float    @default(0) // المسحوبات
  penalties             Float    @default(0) // العقوبات
  materialEntitlements  Float    @default(0) // البدلات العينية
  
  // 🆕 خصم الإجازات بدون مرتب
  unpaidLeaveDays       Int      @default(0) // أيام الإجازة بدون مرتب
  unpaidLeaveDeduction  Float    @default(0) // مبلغ الخصم
  
  // الصافي
  netSalary             Float    // صافي الراتب
  
  calculationType       String   // DAILY أو MONTHLY
  notes                 String?
  isActive              Boolean  @default(true)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  employee              Employee @relation("EmployeePayrollRecords", fields: [employeeId], references: [id])
  auditLogs             HR_PayrollAuditLog[] @relation("RecordAuditLogs")
}
```

---

### 17. HR_MonthlyPayroll
**سجلات الرواتب الشهرية**

```prisma
model HR_MonthlyPayroll {
  id                    Int      @id @default(autoincrement())
  employeeId            Int      // الموظف
  recordNumber          String   @unique // رقم السجل
  
  year                  Int      // السنة
  month                 Int      // الشهر
  
  // الراتب الأساسي
  basicSalary           Float    // الراتب الأساسي
  
  // الإضافات
  allowances            Float    @default(0) // البدلات الثابتة
  bonuses               Float    @default(0) // المكافآت
  
  // الخصومات
  advances              Float    @default(0) // السلف
  withdrawals           Float    @default(0) // المسحوبات
  penalties             Float    @default(0) // العقوبات
  materialEntitlements  Float    @default(0) // البدلات العينية
  
  // 🆕 خصم الإجازات بدون مرتب
  unpaidLeaveDays       Int      @default(0) // أيام الإجازة بدون مرتب
  unpaidLeaveDeduction  Float    @default(0) // مبلغ الخصم
  
  // الصافي
  netSalary             Float    // صافي الراتب
  
  notes                 String?
  isActive              Boolean  @default(true)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  employee              Employee @relation("EmployeeMonthlyPayrolls", fields: [employeeId], references: [id])
}
```

---

### 18. HR_PayrollAuditLog
**سجل تدقيق الرواتب**

```prisma
model HR_PayrollAuditLog {
  id              Int              @id @default(autoincrement())
  recordId        Int              // سجل الراتب
  action          String           // الإجراء (CREATE, UPDATE, DELETE)
  oldData         String?          // البيانات القديمة (JSON)
  newData         String?          // البيانات الجديدة (JSON)
  changedBy       BigInt           // من قام بالتغيير
  createdAt       DateTime         @default(now())
  
  record          HR_PayrollRecord @relation("RecordAuditLogs", fields: [recordId], references: [id])
}
```

---

### 19. HR_Transaction
**المعاملات المالية (سلف ومسحوبات)**

```prisma
model HR_Transaction {
  id                  Int                      @id @default(autoincrement())
  transactionNumber   String                   @unique // رقم العملية
  employeeId          Int                      // الموظف
  transactionType     TransactionType          // نوع العملية
  
  // للمسحوبات العينية
  itemId              Int?                     // الصنف (من جدول HR_AdvanceItem)
  quantity            Float?                   // الكمية
  unitPrice           Float?                   // سعر الوحدة
  
  amount              Float                    // المبلغ الإجمالي
  description         String?                  // الوصف
  notes               String?                  // ملاحظات
  
  // الحالة والموافقة
  status              TransactionStatus        @default(PENDING)
  approvedBy          BigInt?
  approvedAt          DateTime?
  rejectedBy          BigInt?
  rejectedAt          DateTime?
  rejectionReason     String?
  
  // التسوية
  isSettled           Boolean                  @default(false) // مسوّى؟
  settlementId        Int?                     // التسوية
  
  createdBy           BigInt
  createdAt           DateTime                 @default(now())
  updatedAt           DateTime                 @updatedAt
  updatedBy           BigInt?
  
  // العلاقات
  employee            Employee                 @relation("EmployeeTransactions", fields: [employeeId], references: [id])
  item                HR_AdvanceItem?          @relation(fields: [itemId], references: [id])
  settlement          HR_TransactionSettlement? @relation(fields: [settlementId], references: [id])
  changeLogs          HR_TransactionChangeLog[]
}
```

#### Enums:

```prisma
enum TransactionType {
  CASH_ADVANCE      // سلفة نقدية
  ITEM_WITHDRAWAL   // مسحوب عيني
  EMPLOYEE_DEBT     // دين على العامل
}

enum TransactionStatus {
  PENDING    // معلقة
  APPROVED   // معتمدة
  REJECTED   // مرفوضة
  CANCELLED  // ملغاة
}
```

---

### 20. HR_AdvanceItem
**أصناف السلف العينية**

```prisma
model HR_AdvanceItem {
  id          Int              @id @default(autoincrement())
  nameAr      String           // الاسم بالعربية
  nameEn      String?          // الاسم بالإنجليزية
  description String?          // الوصف
  price       Float            // السعر
  unit        String           // الوحدة (كيس، عبوة، علبة، إلخ)
  isActive    Boolean          @default(true)
  orderIndex  Int              @default(0) // الترتيب
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  transactions HR_Transaction[]
}
```

**أمثلة:**
- سجائر (كيس) - 50 جنيه
- وجبة (وجبة) - 30 جنيه
- إلخ

---

### 21. HR_TransactionSettlement
**التسويات**

```prisma
model HR_TransactionSettlement {
  id             Int             @id @default(autoincrement())
  transactionIds Json
  settlementType SettlementType  @default(INDIVIDUAL)
  totalAmount    Float
  description    String?
  settledBy      BigInt
  settledAt      DateTime        @default(now())
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  transaction    HR_Transaction? @relation("TransactionSettlements", fields: [transactionId], references: [id])
  transactionId  Int?

  @@index([settledBy])
  @@index([settlementType])
  @@index([settledAt])
  @@index([createdAt])
  @@map("HR_TransactionSettlement")
}
```

---

### 22. HR_TransactionChangeLog
**سجل تغييرات المعاملات**

```prisma
model HR_TransactionChangeLog {
  id            Int                   @id @default(autoincrement())
  transactionId Int
  changeType    TransactionChangeType @default(EDIT)
  fieldName     String?
  oldValue      String?
  newValue      String?
  reason        String
  changedBy     BigInt
  changedAt     DateTime              @default(now())
  metadata      Json?
  transaction   HR_Transaction        @relation("TransactionChangeLogs", fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@index([changeType])
  @@index([changedBy])
  @@index([changedAt])
  @@index([transactionId, changedAt])
  @@map("HR_TransactionChangeLog")
}
```

---

### 23. HR_Settings
**إعدادات نظام الموارد البشرية**

```prisma
model HR_Settings {
  id        Int      @id @default(autoincrement())
  
  // إعدادات الإشعارات
  notificationsEnabled       Boolean  @default(true)   // تفعيل/تعطيل الإشعارات
  notificationTime           String   @default("09:00") // وقت إرسال الإشعارات اليومية (HH:MM)
  leaveStartReminderDays     Int      @default(1)      // إشعار قبل بداية الإجازة بكم يوم
  leaveEndReminderDays       Int      @default(1)      // إشعار قبل نهاية الإجازة بكم يوم
  
  // إعدادات القسم العامة
  sectionEnabled             Boolean  @default(true)   // تفعيل/تعطيل القسم
  
  // معلومات التعديل
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  updatedBy BigInt?
  
  @@map("HR_Settings")
}
```

---

### 24. DepartmentConfig
**إعدادات الأقسام**

```prisma
model DepartmentConfig {
  id          Int                @id @default(autoincrement())
  code        String             @unique // 'hr-management', 'notifications', etc.
  name        String // اسم القسم
  nameEn      String? // English name
  description String? // وصف القسم
  isEnabled   Boolean            @default(true) // تشغيل/إيقاف القسم
  minRole     String             @default("ADMIN") // الحد الأدنى للوصول: SUPER_ADMIN, ADMIN, USER, GUEST
  icon        String? // أيقونة القسم
  order       Int                @default(0) // ترتيب العرض
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  createdBy   BigInt? // من أنشأ القسم
  updatedBy   BigInt? // آخر من عدّل القسم
  admins      DepartmentAdmin[]  @relation("DepartmentAdmins")
  subFeatures SubFeatureConfig[] @relation("DepartmentSubFeatures")

  @@index([code])
  @@index([isEnabled])
  @@index([minRole])
  @@map("DepartmentConfig")
}
```

---

### 25. DepartmentAdmin
**مدراء الأقسام**

```prisma
model DepartmentAdmin {
  id           Int              @id @default(autoincrement())
  departmentId Int // معرف القسم
  userId       Int // معرف المستخدم
  telegramId   BigInt // معرف تيليجرام للمستخدم
  assignedAt   DateTime         @default(now())
  assignedBy   BigInt // من قام بالتعيين
  isActive     Boolean          @default(true)
  notes        String? // ملاحظات
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  department   DepartmentConfig @relation("DepartmentAdmins", fields: [departmentId], references: [id], onDelete: Cascade)
  user         User             @relation("UserDepartments", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([departmentId, userId])
  @@index([departmentId])
  @@index([userId])
  @@index([telegramId])
  @@index([isActive])
  @@map("DepartmentAdmin")
}
```

---

### 26. SubFeatureConfig
**الميزات الفرعية**

```prisma
model SubFeatureConfig {
  id             Int               @id @default(autoincrement())
  code           String            @unique // 'hr:advances', 'hr:employees', etc.
  departmentCode String // 'hr-management'
  name           String // اسم الوظيفة
  nameEn         String? // English name
  description    String? // وصف الوظيفة
  isEnabled      Boolean           @default(true) // تشغيل/إيقاف الوظيفة
  minRole        String? // الحد الأدنى للوصول (NULL = يرث من القسم)
  icon           String? // أيقونة الوظيفة
  order          Int               @default(0) // ترتيب العرض
  superAdminOnly Boolean           @default(false) // (مهمل) استخدم minRole بدلاً منه
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  createdBy      BigInt? // من أنشأ الوظيفة
  updatedBy      BigInt? // آخر من عدّل الوظيفة
  admins         SubFeatureAdmin[] @relation("SubFeatureAdmins")
  department     DepartmentConfig? @relation("DepartmentSubFeatures", fields: [departmentCode], references: [code])

  @@index([code])
  @@index([departmentCode])
  @@index([isEnabled])
  @@index([minRole])
  @@index([superAdminOnly])
  @@map("SubFeatureConfig")
}
```

---

### 27. SubFeatureAdmin
**مدراء الميزات الفرعية**

```prisma
model SubFeatureAdmin {
  id           Int              @id @default(autoincrement())
  subFeatureId Int // معرف الوظيفة الفرعية
  userId       Int // معرف المستخدم
  telegramId   BigInt // معرف تيليجرام للمستخدم
  assignedAt   DateTime         @default(now())
  assignedBy   BigInt // من قام بالتعيين
  isActive     Boolean          @default(true)
  notes        String? // ملاحظات
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  subFeature   SubFeatureConfig @relation("SubFeatureAdmins", fields: [subFeatureId], references: [id], onDelete: Cascade)
  user         User             @relation("UserSubFeatures", fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([subFeatureId, userId])
  @@index([subFeatureId])
  @@index([userId])
  @@index([telegramId])
  @@index([isActive])
  @@map("SubFeatureAdmin")
}
```


**أمثلة:**
```json
{
  "key": "auto_penalties_enabled",
  "value": "true",
  "category": "PENALTY"
}
{
  "key": "auto_penalties_delay_threshold",
  "value": "5",
  "category": "PENALTY"
}
{
  "key": "daily_penalty_check_time",
  "value": "09:00",
  "category": "PENALTY"
}
```

---

## 🔗 علاقات مهمة جداً

### علاقة الموظف بالإجازات والعقوبات:

```
Employee
  └──> leaves: HR_EmployeeLeave[]
         └──> penalties: HR_AppliedPenalty[]
                ├─ penaltyType = SUSPENSION
                │   └──> عند الموافقة: employmentStatus = SUSPENDED
                │
                └─ isAutoCreated = true
                    └──> تم إنشاؤها بواسطة Auto-Penalties Scheduler
```

### تدفق الإيقاف التلقائي:

```
1. HR_EmployeeLeave (actualReturnDate = null, delayDays >= 5)
   └──> AutoPenaltiesScheduler (كل يوم 9 صباحاً)
        └──> HR_AppliedPenalty (isAutoCreated = true, status = PENDING)
             └──> إشعار للمدراء
                  └──> موافقة (status = APPROVED, penaltyType = SUSPENSION)
                       └──> Employee.employmentStatus = SUSPENDED
                            └──> النتائج:
                                 ├─ إيقاف راتب من تاريخ بداية الإجازة
                                 ├─ إخفاء من قوائم التسجيل
                                 └─ منع تسجيل عودة
```

---

## 📊 إحصائيات قاعدة البيانات

- **إجمالي الجداول:** 25+ جدول
- **جداول HR مخصصة:** 20 جدول
- **إجمالي العلاقات:** 60+ علاقة
- **Indexes:** 100+ index لتحسين الأداء
- **Unique Constraints:** 30+ قيد فريد

---

## 🎯 ملاحظات مهمة للمطورين

### 1. استخدام Prisma:

```typescript
import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

// مثال: جلب موظف مع علاقاته
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    leaves: true,
    appliedPenalties: true,
    transactions: true,
    position: true,
    department: true
  }
});
```

### 2. التحقق من حالة الموظف:

```typescript
// التحقق من الإيقاف
if (employee.employmentStatus === 'SUSPENDED') {
  return ctx.reply('⛔ هذا الموظف موقوف عن العمل');
}
```

### 3. البحث عن العقوبات التلقائية:

```typescript
const autoPenalties = await prisma.hR_AppliedPenalty.findMany({
  where: {
    isAutoCreated: true,
    status: 'PENDING'
  },
  include: {
    employee: true,
    leave: true
  }
});
```

---

## 🔄 التغييرات الجديدة في الإصدار 3.0

### ✨ حقول جديدة:

1. **Employee:**
   - `employmentStatus: SUSPENDED` 🆕
   - `salaryCalculationType` (DAILY/MONTHLY)

2. **HR_EmployeeLeave:**
   - `actualReturnDate` (مهم لكشف التأخير)

3. **HR_AppliedPenalty:**
   - `isAutoCreated` (عقوبات تلقائية)
   - `status` (PENDING/APPROVED/REJECTED)

4. **HR_PayrollRecord / HR_MonthlyPayroll:**
   - `unpaidLeaveDays` (أيام الإجازة بدون مرتب)
   - `unpaidLeaveDeduction` (مبلغ الخصم)

5. **HR_Bonus:**
   - `description` (يُعرض بدلاً من النوع)

### ✨ Enums جديدة:

- `SUSPENDED` في `EmploymentStatus`
- `SUSPENSION` في `DelayPenaltyType`
- `UNPAID` في `LeaveType`

---

<div align="center">

**🎯 قاعدة بيانات احترافية متكاملة وجاهزة للإنتاج**

*آخر تحديث: 7 نوفمبر 2025*

</div>
