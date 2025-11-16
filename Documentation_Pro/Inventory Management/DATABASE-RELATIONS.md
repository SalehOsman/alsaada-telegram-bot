# 🔗 علاقات قاعدة البيانات - نظام المخازن
## Database Relations - Inventory System

---

## ✅ **تم الربط بنجاح مع:**

### 1️⃣ **نظام العاملين (HR_Employee)**

```typescript
// في Employee
{
  // الموظف المسؤول عن الأصناف
  responsibleSpareParts: INV_SparePart[] // الأصناف المسؤول عنها
  
  // الموظف المستلم في الحركات
  sparePartTransactions: INV_SparePartTransaction[] // الحركات التي استلمها
  
  // الفني المركّب
  sparePartInstallations: INV_SparePartUsage[] // القطع التي ركّبها
}

// في INV_SparePart
{
  responsibleEmployeeId: number // معرف الموظف المسؤول
  responsibleEmployee: Employee // بيانات الموظف
}

// في INV_SparePartTransaction
{
  employeeId: number // معرف الموظف المستلم
  employeeName: string // اسم الموظف (حفظ مباشر)
  employeeCode: string // كود الموظف
  employee: Employee // بيانات الموظف الكاملة
}

// في INV_SparePartUsage
{
  installedByEmployeeId: number // معرف الفني
  installedByName: string // اسم الفني
  installer: Employee // بيانات الفني
}
```

---

### 2️⃣ **نظام المعدات (Equipment)**

```typescript
// في Equipment
{
  // المعدات المستخدمة في الحركات
  sparePartTransactions: INV_SparePartTransaction[]
  
  // المعدات المركب عليها القطع
  sparePartUsages: INV_SparePartUsage[]
}

// في INV_SparePart
{
  compatibleEquipmentTypes: Json // [1, 5, 12] أنواع المعدات المتوافقة
}

// في INV_SparePartTransaction
{
  equipmentId: number // معرف المعدة
  equipment: Equipment // بيانات المعدة
}

// في INV_SparePartUsage
{
  equipmentId: number // المعدة المركب عليها
  equipmentName: string // اسم المعدة
  equipmentCode: string // كود المعدة
  equipment: Equipment // بيانات المعدة الكاملة
}
```

---

### 3️⃣ **نظام المشاريع (Project)**

```typescript
// في Project
{
  // المشاريع المستخدمة فيها القطع
  sparePartTransactions: INV_SparePartTransaction[]
  sparePartUsages: INV_SparePartUsage[]
}

// في INV_SparePartTransaction
{
  projectId: number // معرف المشروع
  project: Project // بيانات المشروع
}

// في INV_SparePartUsage
{
  projectId: number // المشروع
  projectName: string // اسم المشروع
  project: Project // بيانات المشروع الكاملة
}
```

---

### 4️⃣ **نظام الحسابات (Accounting) - جاهز للتوسع**

```typescript
// في INV_SparePart
{
  accountCode: string // رمز الحساب
  costCenterId: number // مركز التكلفة
  totalValue: number // القيمة الإجمالية (quantity × unitPrice)
}

// في INV_SparePartTransaction
{
  totalCost: number // التكلفة الإجمالية
  invoiceNumber: string // رقم الفاتورة
  supplierName: string // اسم المورد
}

// في INV_DamageRecord
{
  totalValue: number // قيمة الهالك
  recoveredValue: number // القيمة المستردة
}
```

---

### 5️⃣ **نظام الصيانة (Maintenance) - جاهز للتوسع**

```typescript
// في INV_SparePart
{
  maintenanceTypeId: number // نوع الصيانة
  averageLifespan: number // العمر الافتراضي (أيام/ساعات)
}

// يمكن إضافة لاحقاً في MaintenanceRecord
{
  sparePartsUsed: Json // [{sparePartId, quantity, cost}, ...]
}
```

---

## 🎯 **حالات الاستخدام العملية:**

### **مثال 1: صرف قطعة غيار لمعدة**

```typescript
// السيناريو: صرف فلتر زيت للودر رقم 5 في مشروع البناء
const transaction = {
  sparePartId: 123,          // فلتر الزيت
  transactionType: 'OUT',     // إخراج
  quantity: 1,
  
  // 🔗 ربط بالمعدة
  equipmentId: 45,            // اللودر رقم 5
  
  // 🔗 ربط بالمشروع
  projectId: 12,              // مشروع البناء
  
  // 🔗 ربط بالموظف
  employeeId: 789,            // الفني أحمد محمد
  employeeName: 'أحمد محمد',
  employeeCode: 'EMP-001',
  
  reason: 'صيانة دورية'
}

// النتيجة: يمكن الاستعلام لاحقاً:
// - كل القطع المستخدمة في اللودر رقم 5
// - كل القطع المصروفة لمشروع البناء
// - كل ما استلمه الفني أحمد محمد
```

---

### **مثال 2: تركيب قطعة على معدة**

```typescript
// السيناريو: تركيب فلتر على اللودر
const usage = {
  sparePartId: 123,           // فلتر الزيت
  
  // 🔗 ربط بالمعدة
  equipmentId: 45,            // اللودر رقم 5
  equipmentName: 'لودر كاتربيلر',
  equipmentCode: 'LOADER-005',
  
  // 🔗 ربط بالمشروع
  projectId: 12,
  projectName: 'مشروع البناء',
  
  // 🔗 ربط بالفني
  installedByEmployeeId: 789, // أحمد محمد
  installedByName: 'أحمد محمد',
  
  quantity: 1,
  installDate: new Date(),
  expectedLife: 180 // أيام
}

// النتيجة: متابعة دورة حياة القطعة:
// - متى تم تركيبها؟
// - على أي معدة؟
// - من ركبها؟
// - متى يجب استبدالها؟
```

---

### **مثال 3: تقرير شامل**

```sql
-- الاستعلام: كل القطع المستخدمة في معدة معينة
SELECT 
  sp.nameAr AS 'اسم القطعة',
  sp.code AS 'الكود',
  t.quantity AS 'الكمية',
  t.transactionDate AS 'التاريخ',
  e.fullName AS 'المستلم',
  p.name AS 'المشروع'
FROM INV_SparePartTransaction t
JOIN INV_SparePart sp ON t.sparePartId = sp.id
LEFT JOIN Employee e ON t.employeeId = e.id
LEFT JOIN Project p ON t.projectId = p.id
WHERE t.equipmentId = 45 -- اللودر رقم 5
ORDER BY t.transactionDate DESC;
```

---

## 📊 **إحصائيات الربط:**

| النظام | الجداول المرتبطة | عدد العلاقات |
|--------|------------------|--------------|
| العاملين (HR) | 3 | 5 علاقات |
| المعدات (Equipment) | 2 | 4 علاقات |
| المشاريع (Project) | 2 | 2 علاقات |
| الحسابات (Accounting) | - | جاهز للتوسع |
| الصيانة (Maintenance) | - | جاهز للتوسع |

---

## ✅ **الميزات الإضافية:**

### **1. حفظ النص المباشر (Denormalization)**
```typescript
// بدلاً من الاستعلام دائماً، يتم حفظ النص مباشرة:
{
  employeeId: 789,           // للربط
  employeeName: 'أحمد محمد',  // للعرض السريع ✅
  employeeCode: 'EMP-001'     // للطباعة ✅
}

// الفائدة:
// - سرعة العرض (بدون joins)
// - يبقى التاريخ صحيح حتى لو تم حذف الموظف
// - سهولة الطباعة والتصدير
```

---

### **2. الفهرسة (Indexing)**
```typescript
// تم إضافة indexes لكل العلاقات:
@@index([employeeId])
@@index([equipmentId])
@@index([projectId])
@@index([responsibleEmployeeId])

// النتيجة: استعلامات سريعة جداً ⚡
```

---

**📅 آخر تحديث:** 9 نوفمبر 2025  
**✅ الحالة:** جاهز للاستخدام - جميع العلاقات مُفعّلة
