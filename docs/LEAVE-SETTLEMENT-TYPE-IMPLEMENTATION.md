# تنفيذ نظام LeaveSettlementType

## 📋 الملخص التنفيذي

تم تنفيذ نظام متكامل لتصنيف الإجازات حسب نوع التسوية باستخدام enum `LeaveSettlementType` مع 3 أنواع:
- **ACTUAL_LEAVE** (🏖️): إجازة فعلية - العامل تغيب
- **CASH_SETTLEMENT** (💰): تسوية نقدية - صرف بدل بدون غياب
- **POSTPONED** (⏸️): إجازة مؤجلة

---

## 🗄️ التعديلات على قاعدة البيانات

### 1. Prisma Schema
**الملف:** `prisma/schema.prisma`

#### الـ Enum الجديد:
```prisma
enum LeaveSettlementType {
  ACTUAL_LEAVE    // إجازة فعلية (العامل تغيب)
  CASH_SETTLEMENT // تسوية نقدية (بدل نقدي - لم يتغيب)
  POSTPONED       // مؤجلة
}
```

#### الحقول الجديدة في `HR_EmployeeLeave`:
```prisma
model HR_EmployeeLeave {
  // ... الحقول الموجودة
  settlementType    LeaveSettlementType @default(ACTUAL_LEAVE)
  allowancePaidDate DateTime?           // تاريخ صرف البدل
  // ... باقي الحقول
}
```

### 2. Migration
- **اسم الـ Migration:** `20251107005829_add_leave_settlement_type`
- **تم التطبيق:** ✅ نعم
- **Generated Prisma Client:** ✅ نعم

### 3. Data Migration
**الملف:** `scripts/migrate-allowance-leaves.ts`

**النتيجة:**
- ✅ تم تحديث 7 إجازات من `ACTUAL_LEAVE` إلى `CASH_SETTLEMENT`
- ✅ تم تعيين `allowancePaidDate` للإجازات المسوّاة
- ✅ الإحصائيات النهائية:
  - 🏖️ إجازات فعلية: 51
  - 💰 تسويات نقدية: 7

---

## 📝 التعديلات على الـ Handlers

### 1. Handler صرف البدل
**الملف:** `src/bot/features/hr-management/handlers/leaves-allowance.handler.ts`

**التعديل:**
```typescript
await Database.prisma.hR_EmployeeLeave.create({
  data: {
    // ... البيانات الأخرى
    settlementType: 'CASH_SETTLEMENT', // 💰 تسوية نقدية
    actualReturnDate: leaveEndDate,    // تسجيل العودة تلقائياً
    // ... باقي البيانات
  },
})
```

### 2. Handler قائمة الإجازات الحالية
**الملف:** `src/bot/features/hr-management/handlers/leaves-list.handler.ts`

**التعديل:**
```typescript
const where = {
  isActive: true,
  status: { in: ['PENDING', 'APPROVED'] },
  actualReturnDate: null,
  settlementType: 'ACTUAL_LEAVE', // 🏖️ إجازات فعلية فقط
}
```

**قبل:** كان يستبعد `allowanceAmount > 0`
**بعد:** يستبعد `settlementType = 'CASH_SETTLEMENT'`

### 3. Handler إضافة إجازة
**الملف:** `src/bot/features/hr-management/handlers/leaves-add.handler.ts`

**التعديلات (مكانين):**
```typescript
// عند جلب العاملين المتاحين
NOT: {
  leaves: {
    some: {
      actualReturnDate: null,
      status: { in: ['PENDING', 'APPROVED'] },
      settlementType: 'ACTUAL_LEAVE', // 🏖️ إجازات فعلية فقط
    },
  },
}

// عند التحقق من الإجازات النشطة
where: {
  employeeId,
  isActive: true,
  status: { in: ['PENDING', 'APPROVED'] },
  settlementType: 'ACTUAL_LEAVE', // 🏖️ فقط الإجازات الفعلية
  startDate: { lte: today },
  endDate: { gte: today },
}
```

### 4. Handler عرض إجازات العامل
**الملف:** `src/bot/features/hr-management/handlers/leaves-employee.handler.ts`

**التعديل:**
```typescript
leaves.forEach((leave, index) => {
  const isCashSettlement = leave.settlementType === 'CASH_SETTLEMENT'
  message += `**${index + 1}.** ${isCashSettlement ? '💰 تسوية نقدية' : leaveTypeLabels[leave.leaveType]}\n`
  // ... باقي التفاصيل
  if (isCashSettlement && leave.allowanceAmount) {
    message += `   💵 ${leave.allowanceAmount.toFixed(2)} جنيه\n`
  }
})
```

---

## 💰 تكامل نظام الرواتب

### 1. Handler حساب الراتب
**الملف:** `src/bot/features/hr-management/handlers/payroll-calculate.handler.ts`

**التعديلات (مكانين):**

#### أ. حساب الإجازات في الشهر:
```typescript
const leaveAllowancesInMonth = await Database.prisma.hR_EmployeeLeave.findMany({
  where: {
    employeeId: employee.id,
    status: 'APPROVED',
    settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية
    allowanceAmount: { gt: 0 },
    allowanceSettled: false,
    startDate: { gte: startOfMonth, lte: endOfPeriod },
  },
})
```

#### ب. حساب بدل الإجازات:
```typescript
const leaveAllowances = await Database.prisma.hR_EmployeeLeave.findMany({
  where: {
    employeeId: employee.id,
    status: 'APPROVED',
    settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية
    allowanceAmount: { gt: 0 },
    allowanceSettled: false,
    createdAt: { lte: endOfPeriod },
  },
})
```

### 2. Handler الرواتب الشهرية
**الملف:** `src/bot/features/hr-management/handlers/monthly-payroll.handler.ts`

**التعديلات (مكانين):**

#### أ. بدل الإجازات في الشهر:
```typescript
const leaveAllowancesInMonth = await prisma.hR_EmployeeLeave.findMany({
  where: {
    employeeId: employee.id,
    status: 'APPROVED',
    settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية
    allowanceAmount: { gt: 0 },
    allowanceSettled: false,
    startDate: { gte: startOfMonth, lte: endOfPeriod },
  },
})
```

#### ب. إجمالي بدل الإجازات:
```typescript
const leaveAllowances = await prisma.hR_EmployeeLeave.findMany({
  where: {
    employeeId: employee.id,
    status: 'APPROVED',
    settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية
    allowanceAmount: { gt: 0 },
    allowanceSettled: false,
    createdAt: { lte: endOfPeriod },
  },
})
```

---

## 🆕 ميزة جديدة: عرض التسويات النقدية

### 1. Handler جديد
**الملف:** `src/bot/features/hr-management/handlers/leaves-cash-settlements.handler.ts`

**الوظائف:**
- ✅ عرض قائمة جميع التسويات النقدية مع Pagination
- ✅ عرض تفاصيل كل تسوية (العامل، المبلغ، التواريخ، حالة الصرف)
- ✅ أيقونات توضيحية: ✅ مسوّى | ⏳ قيد الانتظار
- ✅ رابط سريع لعرض بيانات العامل

**Callback Queries:**
- `leaves:cash-settlements` - عرض القائمة
- `leaves:cash-settlements:(:page)` - التنقل بين الصفحات
- `leaves:cash-settlement:details:(:id)` - عرض التفاصيل

### 2. تحديث القائمة الرئيسية
**الملف:** `src/bot/features/hr-management/handlers/leaves.handler.ts`

**التعديل:**
```typescript
const keyboard = new InlineKeyboard()
  .text('📝 تسجيل إجازة جديدة', 'leaves:add')
  .row()
  .text('↩️ تسجيل عودة', 'leaves:return')
  .row()
  .text('📋 قائمة الإجازات', 'leaves:list')
  .row()
  .text('💰 التسويات النقدية', 'leaves:cash-settlements') // ✅ جديد
  .row()
  .text('🔄 جدول أدوار الإجازات', 'leaves:schedule')
  // ... باقي الأزرار
```

### 3. تسجيل الـ Handler
**الملف:** `src/bot/features/hr-management/index.ts`

```typescript
import { leavesCashSettlementsHandler } from './handlers/leaves-cash-settlements.handler.js'

// ... في composer.use()
composer.use(leavesCashSettlementsHandler) // 💰 عرض التسويات النقدية
```

---

## 🧪 Scripts للاختبار

### 1. Script التحقق من التسويات
**الملف:** `scripts/check-cash-settlements.ts`

**الوظائف:**
- عرض جميع التسويات النقدية
- إحصائيات (إجمالي المبالغ، المسوّى، قيد الانتظار)
- تجميع حسب العامل

**تشغيل:**
```bash
npx tsx scripts/check-cash-settlements.ts
```

---

## 📊 الإحصائيات النهائية

### قبل التطبيق:
- ❌ الإجازات ببدل مخفية من القائمة
- ❌ تمنع العامل من تسجيل إجازات جديدة
- ❌ لا يوجد تمييز واضح في قاعدة البيانات
- ❌ صعوبة في التتبع والتقارير

### بعد التطبيق:
- ✅ تصنيف واضح: ACTUAL_LEAVE vs CASH_SETTLEMENT
- ✅ لا تمنع العامل من تسجيل إجازات جديدة
- ✅ قائمة مخصصة لعرض التسويات النقدية
- ✅ تكامل كامل مع نظام الرواتب
- ✅ تتبع سهل وتقارير دقيقة
- ✅ أيقونات توضيحية (💰 للتسويات، 🏖️ للإجازات الفعلية)

---

## 🔄 سير العمل الجديد

### صرف بدل إجازة:
1. المستخدم يختار "💰 صرف بدل إجازة"
2. يدخل المبلغ (مثلاً: 2000)
3. النظام:
   - ينشئ سجل إجازة بـ `settlementType = 'CASH_SETTLEMENT'`
   - يسجل `actualReturnDate = endDate` (إغلاق تلقائي)
   - يحسب الإجازة القادمة تلقائياً
4. العامل يستطيع تسجيل إجازة فعلية جديدة فوراً

### عرض التسويات النقدية:
1. من القائمة الرئيسية → "💰 التسويات النقدية"
2. عرض قائمة مع:
   - اسم العامل والوظيفة
   - المبلغ
   - التاريخ
   - حالة الصرف (✅ مسوّى / ⏳ قيد الانتظار)
3. الضغط على أي تسوية → تفاصيل كاملة

### تقارير الرواتب:
- التسويات النقدية تظهر في قسم "💰 بدل الإجازات"
- تحتسب ضمن الراتب إذا كانت `allowanceSettled = false`
- تُعلّم كـ `allowanceSettled = true` بعد الصرف

---

## ✅ التحقق والاختبار

### 1. Migration ✅
```bash
npx prisma migrate dev --name add_leave_settlement_type
# ✅ Created successfully
```

### 2. Data Migration ✅
```bash
npx tsx scripts/migrate-allowance-leaves.ts
# ✅ Updated 7 leaves
# 🏖️ Actual: 51 | 💰 Cash: 7
```

### 3. Compilation ✅
```bash
npm run dev
# ✅ No TypeScript errors
```

### 4. Testing ✅
- ✅ قائمة الإجازات تعرض إجازة واحدة فقط (فعلية)
- ✅ جدول الأدوار يعرض 11 عامل (كلهم متاحين)
- ✅ صرف بدل إجازة ينشئ CASH_SETTLEMENT بنجاح
- ✅ الإجازة القادمة تُحسب صحيحاً (تجاوز التسوية النقدية)
- ✅ قائمة التسويات النقدية تعمل بنجاح

---

## 📝 ملاحظات مهمة

### التوافق مع النظام القديم:
- ✅ جميع الإجازات القديمة ببدل تم تحويلها تلقائياً
- ✅ استعلامات الرواتب محدّثة لاستخدام `settlementType`
- ✅ الحقل `allowanceAmount` ما زال موجوداً للتوافق

### الأمان:
- ✅ Default value = `ACTUAL_LEAVE` (آمن)
- ✅ Required field في Migration
- ✅ Type-safe مع TypeScript

### الأداء:
- ✅ Index موجود على `[employeeId, isActive]`
- ✅ Queries محسّنة مع `settlementType` filter
- ✅ Pagination في قائمة التسويات (15 عنصر/صفحة)

---

## 🎯 الخلاصة

تم تنفيذ نظام متكامل لتصنيف الإجازات مع:
1. ✅ Schema update مع enum واضح
2. ✅ Data migration ناجح
3. ✅ تحديث جميع الـ handlers المتأثرة
4. ✅ تكامل كامل مع نظام الرواتب
5. ✅ واجهة جديدة لعرض التسويات النقدية
6. ✅ أيقونات توضيحية وتجربة مستخدم محسّنة
7. ✅ Scripts للاختبار والتحقق

**النتيجة:** نظام احترافي يميز بوضوح بين الإجازات الفعلية والتسويات النقدية مع الحفاظ على التكامل الكامل مع نظام الرواتب.
