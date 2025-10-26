# 🚀 تعليمات تنفيذ نظام شئون العاملين

## الخطوات المطلوبة:

### 1️⃣ افتح ملف schema.prisma
الموقع: `F:\_Alsaada_Telegram_Bot\telegram-bot-template-main\prisma\schema.prisma`

---

### 2️⃣ ابحث واستبدل (Ctrl+H في VS Code):

#### أ) تغيير اسم model Department:
**ابحث عن:**
```
model Department {
```
**استبدل بـ:**
```
model HR_Department {
```

**ثم ابحث عن:**
```
positions   Position[]
employees   Employee[]
```
**استبدل بـ:**
```
positions   HR_Position[]
employees   HR_Employee[]
```

**ثم احذف السطر:**
```
@@map("HR_Department")
```

---

#### ب) تغيير اسم model Position:
**ابحث عن:**
```
model Position {
```
**استبدل بـ:**
```
model HR_Position {
```

**ثم ابحث عن:**
```
department    Department
```
**استبدل بـ:**
```
department    HR_Department
```

**ثم ابحث عن:**
```
employees     Employee[]
```
**استبدل بـ:**
```
employees     HR_Employee[]
```

**ثم احذف السطر:**
```
@@map("HR_Position")
```

---

#### ج) تغيير اسم model Employee:
**ابحث عن:**
```
model Employee {
```
**استبدل بـ:**
```
model HR_Employee {
```

**ثم ابحث عن جميع:**
```
department            Department
```
**استبدل بـ:**
```
department            HR_Department
```

**ثم ابحث عن:**
```
position              Position
```
**استبدل بـ:**
```
position              HR_Position
```

**ثم ابحث عن:**
```
directManager         Employee?
subordinates          Employee[]
```
**استبدل بـ:**
```
directManager         HR_Employee?
subordinates          HR_Employee[]
```

**ثم احذف السطر:**
```
@@map("HR_Employee")
```

---

### 3️⃣ أضف حقول جديدة لجدول HR_Employee

ابحث عن السطر:
```
  workLocation          String?          // موقع العمل
```

**أضف بعده مباشرة:**
```
  
  // 🆕 معلومات العمل الصحراوي
  isFieldWorker         Boolean          @default(true)  // عامل ميداني؟
  rotationSchedule      String?          // نظام الدورة (28/7, 21/7)
  fieldAllowanceRate    Float?           @default(0)     // بدل العمل الصحراوي
  housingAllowance      Float?           @default(0)     // بدل سكن
  transportAllowance    Float?           @default(0)     // بدل مواصلات
  foodAllowance         Float?           @default(0)     // بدل طعام
  currentRotationId     Int?             // الدورة الحالية
  lastRotationEndDate   DateTime?        // آخر دورة
  nextRotationStartDate DateTime?        // بداية الدورة القادمة
```

---

ابحث عن السطر:
```
  attendanceRequired    Boolean          @default(true)
```

**استبدله بـ:**
```
  attendanceRequired    Boolean          @default(false) // ليس مطلوب في العمل الصحراوي
```

---

ابحث عن السطر:
```
  // Equipment Relations
  operatedEquipment     Equipment[]      @relation("EquipmentOperator")
```

**أضف قبله:**
```
  // Relations - HR
  rotations             HR_WorkRotation[]       @relation("EmployeeRotations")
  leaves                HR_EmployeeLeave[]      @relation("EmployeeLeaves")
  leaveReplacements     HR_EmployeeLeave[]      @relation("LeaveReplacements")
  advances              HR_EmployeeAdvance[]    @relation("EmployeeAdvances")
  payrolls              HR_MonthlyPayroll[]     @relation("EmployeePayrolls")
  attendanceExceptions  HR_AttendanceException[]
  
```

---

ابحث عن آخر index في جدول HR_Employee:
```
  @@index([employmentStatus, isActive])
  @@map("HR_Employee")
```

**استبدله بـ:**
```
  @@index([employmentStatus, isActive])
  @@index([isFieldWorker])
  @@index([currentRotationId])
}
```

---

### 4️⃣ أضف الجداول الجديدة

اذهب لنهاية الملف (قبل Enums) وأضف الجداول التالية...

(تابع في الملف التالي...)
