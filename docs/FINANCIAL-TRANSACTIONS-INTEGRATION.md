# 💸 دليل التكامل: نظام السلف والمسحوبات مع الرواتب

## 📋 نظرة عامة

تم دمج نظام السلف والمسحوبات القديم (**HR_Transaction**) مع نظام الرواتب الجديد (**HR_PayrollCycle**) لضمان:
- ✅ تتبع دقيق لكل معاملة مالية
- ✅ احتساب تلقائي في الرواتب
- ✅ منع الاحتساب المزدوج
- ✅ تكامل سلس بين الأنظمة

---

## 🗂️ هيكل الجداول

### 1️⃣ HR_Transaction (نظام السلف والمسحوبات الأساسي)

```prisma
model HR_Transaction {
  id                  Int
  transactionNumber   String  @unique    // رقم معاملة فريد
  employeeId          Int
  transactionType     TransactionType    // CASH_ADVANCE أو MATERIAL_WITHDRAWAL
  
  // للسلف النقدية
  amount              Float
  
  // للمسحوبات العينية
  itemId              Int?
  quantity            Float?
  unitPrice           Float?
  
  // حالة المعاملة
  status              GeneralStatus      // PENDING, APPROVED, REJECTED
  isSettled           Boolean            // هل تم احتسابها في راتب؟
  settledAt           DateTime?
  
  // ⭐ الحقل الجديد: ربط مع نظام الرواتب
  payrollCycleId      Int?               // معرف دورة الراتب
  
  // العلاقات
  employee            Employee
  item                HR_AdvanceItem?
  payrollCycle        HR_PayrollCycle?   // ⭐ علاقة جديدة
  settlements         HR_TransactionSettlement[]
  changeLogs          HR_TransactionChangeLog[]
}
```

**المميزات:**
- ✅ نظام موافقات كامل (PENDING → APPROVED → REJECTED)
- ✅ رقم معاملة تلقائي (مثل: TRX-2025-00001)
- ✅ تتبع التعديلات (changeLogs)
- ✅ تسويات متقدمة (settlements)
- ✅ ربط مباشر مع دورات الرواتب

---

### 2️⃣ HR_PayrollCycle (نظام الرواتب)

```prisma
model HR_PayrollCycle {
  id                  Int
  employeeId          Int
  month               Int
  year                Int
  
  // الخصومات
  advances            Float  // إجمالي السلف النقدية
  materialWithdrawals Float  // إجمالي المسحوبات العينية
  
  // ⭐ العلاقة الجديدة
  transactions        HR_Transaction[]  // المعاملات المحتسبة
}
```

---

## 🔄 آلية التكامل

### السيناريو 1: تسجيل سلفة نقدية

```typescript
// 1. تسجيل السلفة
const transaction = await prisma.hR_Transaction.create({
  data: {
    transactionNumber: 'TRX-2025-00123',
    employeeId: 1,
    transactionType: 'CASH_ADVANCE',
    amount: 500,
    status: 'APPROVED',
    isSettled: false,        // ← لم تُحتسب بعد
    payrollCycleId: null     // ← لم تُربط بدورة راتب
  }
})
```

### السيناريو 2: إنشاء كشف راتب وربط المعاملات

```typescript
// 2. عند إنشاء كشف راتب شهر يناير
const periodStart = new Date('2025-01-01')
const periodEnd = new Date('2025-01-31')

// جلب المعاملات غير المحتسبة في الفترة
const unsettledTransactions = await prisma.hR_Transaction.findMany({
  where: {
    employeeId: 1,
    status: 'APPROVED',
    isSettled: false,
    createdAt: {
      gte: periodStart,
      lte: periodEnd
    }
  }
})

// حساب الإجماليات
const cashAdvances = unsettledTransactions
  .filter(t => t.transactionType === 'CASH_ADVANCE')
  .reduce((sum, t) => sum + t.amount, 0)

const materialWithdrawals = unsettledTransactions
  .filter(t => t.transactionType === 'MATERIAL_WITHDRAWAL')
  .reduce((sum, t) => sum + (t.quantity! * t.unitPrice!), 0)

// 3. إنشاء دورة الراتب
const payroll = await prisma.hR_PayrollCycle.create({
  data: {
    employeeId: 1,
    month: 1,
    year: 2025,
    advances: cashAdvances,            // 500 جنيه
    materialWithdrawals: materialWithdrawals,
    totalDeductions: cashAdvances + materialWithdrawals,
    // ... باقي الحقول
  }
})

// 4. ⭐ ربط المعاملات بدورة الراتب
await prisma.hR_Transaction.updateMany({
  where: {
    id: { in: unsettledTransactions.map(t => t.id) }
  },
  data: {
    isSettled: true,
    settledAt: new Date(),
    payrollCycleId: payroll.id  // ← ربط المعاملة بالدورة
  }
})
```

---

## 🎯 حل المشكلة: السحوبات بعد التصفية

### المشكلة:
```
📅 يناير 2025:
  - أيام 1-28: عمل 20 يوم، استحقاق = 20 علبة سجائر
  - يوم 28: تم إنشاء كشف راتب يناير ✅
  - أيام 29-31: سحب 10 علب إضافية ⚠️

❓ السؤال: كيف يتم احتساب ال 10 علب؟
```

### ✅ الحل:

**الخطوة 1: عند تسجيل السحبة يوم 29**
```typescript
await prisma.hR_Transaction.create({
  data: {
    employeeId: 1,
    transactionType: 'MATERIAL_WITHDRAWAL',
    itemId: 5,        // سجائر
    quantity: 1,
    unitPrice: 50,
    amount: 50,
    createdAt: new Date('2025-01-29'),
    status: 'APPROVED',
    isSettled: false,     // ← غير محتسبة
    payrollCycleId: null  // ← لم تُربط بيناير
  }
})
```

**الخطوة 2: عند إنشاء كشف راتب فبراير**
```typescript
// فبراير: سيجد النظام تلقائياً:
// - 10 علب من 29-31 يناير (غير محتسبة)
// - سحوبات فبراير الجديدة

const februaryUnsettled = await prisma.hR_Transaction.findMany({
  where: {
    employeeId: 1,
    status: 'APPROVED',
    isSettled: false,      // ← السحوبات المعلقة
    createdAt: {
      lte: new Date('2025-02-28')
    }
  }
})

// النتيجة: سيتم احتساب ال 10 علب في راتب فبراير ✅
```

---

## 📊 أمثلة عملية

### مثال 1: موظف يسحب سجائر يومياً

```typescript
// الموظف: أحمد
// الاستحقاق: 1 علبة سجائر/يوم

// يوم 5 يناير
await createTransaction({
  employeeId: 1,
  itemId: 5,
  quantity: 1,
  date: '2025-01-05'
})

// يوم 10 يناير
await createTransaction({
  employeeId: 1,
  itemId: 5,
  quantity: 2,  // سحب علبتين
  date: '2025-01-10'
})

// يوم 28 يناير: إنشاء كشف راتب
const payroll = await createPayrollCycle({
  employeeId: 1,
  month: 1,
  year: 2025,
  workDays: 22
})

// النتيجة:
// - الاستحقاق: 22 علبة (22 يوم عمل)
// - المسحوب فعلياً: 3 علب
// - الفرق: 19 علبة (يُضاف للاستحقاق أو يُخصم حسب السياسة)
```

### مثال 2: سلفة نقدية طارئة

```typescript
// يوم 15 يناير: سلفة طارئة
await createTransaction({
  employeeId: 2,
  transactionType: 'CASH_ADVANCE',
  amount: 1000,
  description: 'سلفة طارئة - ظرف عائلي',
  status: 'PENDING'  // تحتاج موافقة
})

// يوم 16 يناير: موافقة المدير
await approveTransaction(transactionId)
// status: 'PENDING' → 'APPROVED'

// يوم 28 يناير: كشف الراتب
// سيتم خصم 1000 جنيه تلقائياً من الراتب
```

---

## 🔒 ميزات الأمان

### 1. منع الاحتساب المزدوج
```typescript
// عند محاولة إنشاء دورة راتب جديدة
const alreadySettled = await prisma.hR_Transaction.findMany({
  where: {
    employeeId: 1,
    isSettled: true,
    payrollCycleId: { not: null },
    createdAt: {
      gte: periodStart,
      lte: periodEnd
    }
  }
})

if (alreadySettled.length > 0) {
  throw new Error('بعض المعاملات محتسبة مسبقاً!')
}
```

### 2. تتبع التعديلات
```typescript
// كل تعديل على معاملة يُسجل في changeLogs
await prisma.hR_TransactionChangeLog.create({
  data: {
    transactionId: 123,
    fieldName: 'amount',
    oldValue: '500',
    newValue: '600',
    changedBy: adminId,
    changeReason: 'تصحيح خطأ إدخال'
  }
})
```

### 3. تسويات متقدمة
```typescript
// يمكن تسوية عدة معاملات دفعة واحدة
await prisma.hR_TransactionSettlement.create({
  data: {
    transactionIds: [123, 124, 125],
    settlementType: 'BATCH',
    totalAmount: 1500,
    settledBy: adminId
  }
})
```

---

## 🎨 واجهة المستخدم

### نقطة الدخول من قائمة الرواتب:

```
💵 الرواتب والأجور
  └─ ⚙️ إعدادات الرواتب
       ├─ 💰 إدارة أنواع البدلات
       ├─ 🏢 بدلات الوظائف
       ├─ 👤 بدلات الموظفين
       ├─ 📦 استحقاقات المواد
       ├─ 🎁 إدارة المكافآت
       └─ 💸 السلف والمسحوبات ← ⭐ نقطة الدخول الجديدة
```

### وظائف السلف والمسحوبات:
```
💸 السلف والمسحوبات
  ├─ 📋 عرض جميع المعاملات
  ├─ ➕ تسجيل معاملة جديدة
  ├─ 👤 عرض حسب الموظف
  ├─ 📊 تقارير وإحصائيات
  ├─ ⏳ معاملات معلقة (غير محتسبة)
  └─ ✅ معاملات محتسبة
```

---

## 📈 التقارير المتاحة

### 1. تقرير المعاملات المعلقة
```typescript
const unsettledReport = await prisma.hR_Transaction.findMany({
  where: {
    isSettled: false,
    status: 'APPROVED'
  },
  include: {
    employee: { select: { fullName: true } },
    item: { select: { nameAr: true } }
  }
})
```

### 2. تقرير السلف حسب الموظف
```typescript
const employeeAdvances = await prisma.hR_Transaction.findMany({
  where: {
    employeeId: 1,
    transactionType: 'CASH_ADVANCE'
  },
  orderBy: { createdAt: 'desc' }
})
```

### 3. تقرير المسحوبات حسب الصنف
```typescript
const itemWithdrawals = await prisma.hR_Transaction.groupBy({
  by: ['itemId'],
  where: {
    transactionType: 'MATERIAL_WITHDRAWAL'
  },
  _sum: { quantity: true, amount: true }
})
```

---

## ✅ الخلاصة

### قبل التحسين:
- ❌ نظامان منفصلان (HR_Transaction + HR_PayrollCycle)
- ❌ لا يوجد ربط تلقائي
- ❌ إمكانية احتساب مزدوج
- ❌ صعوبة تتبع المعاملات المعلقة

### بعد التحسين:
- ✅ نظام واحد متكامل
- ✅ ربط تلقائي عبر `payrollCycleId`
- ✅ منع الاحتساب المزدوج (`isSettled`)
- ✅ تتبع دقيق لكل معاملة
- ✅ المعاملات المتأخرة تُحتسب تلقائياً في الدورة التالية

---

## 🚀 الخطوات التالية

1. ✅ **تم**: إضافة `payrollCycleId` إلى HR_Transaction
2. ✅ **تم**: إضافة علاقة في HR_PayrollCycle
3. ✅ **تم**: Migration ناجح
4. ✅ **تم**: إضافة نقطة دخول في قائمة الرواتب
5. ⏳ **قادم**: بناء Handler لإنشاء كشف الراتب مع احتساب تلقائي
6. ⏳ **قادم**: تقارير متقدمة للمعاملات المعلقة

---

## 📞 للدعم

إذا واجهت أي مشكلة في التكامل، تحقق من:
- ✅ وجود `payrollCycleId` في جدول HR_Transaction
- ✅ حالة `isSettled` للمعاملات
- ✅ صحة التواريخ (periodStart, periodEnd)
- ✅ حالة الموافقة (`status = 'APPROVED'`)
