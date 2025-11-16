# 📦 نظام قالب المخازن الاحترافي (Warehouse Template System)

## 🎯 نظرة عامة

نظام قالب احترافي **قابل لإعادة الاستخدام** لجميع أنواع المخازن في البوت:
- ✅ مخزن قطع الغيار (Spare Parts)
- ✅ مخزن الوقود (Fuel)
- ✅ مخزن الزيوت (Oils)
- ✅ مخزن المواد (Materials)
- ✅ مخزن العدد والأدوات (Tools & Equipment)
- ✅ **أي مخزن مستقبلي**

---

## 🏗️ الهيكل الكامل

```
src/bot/features/inventory-management/
│
├── types/
│   └── warehouse.types.ts                # ✅ جميع الأنواع المشتركة
│
├── services/                             # ✅ الخدمات القابلة لإعادة الاستخدام
│   ├── warehouse.service.ts              # خدمة المخزن الأساسية
│   ├── transaction.service.ts            # خدمة الحركات (إدخال/إخراج/نقل)
│   ├── audit.service.ts                  # خدمة الجرد
│   ├── excel-export.service.ts           # خدمة تصدير Excel
│   └── notification.service.ts           # خدمة الإشعارات
│
├── utils/                                # ✅ أدوات مشتركة
│   ├── selection-lists.util.ts           # قوائم الاختيار (موظفين، معدات...)
│   ├── formatters.util.ts                # تنسيق البيانات والرسائل
│   └── validators.util.ts                # التحقق من البيانات
│
├── config/
│   └── feature-flags.ts                  # 🚩 نظام التحكم (تشغيل/إيقاف)
│
└── handlers/                             # 📁 المعالجات
    ├── spare-parts-transactions.handler.ts  # ❌ النظام القديم (لا يُمس!)
    └── [future handlers using templates]    # ✅ النظام الجديد (قريباً)
```

---

## 📚 دليل المكونات

### 1️⃣ **Types (الأنواع)** - `types/warehouse.types.ts`

جميع الأنواع المشتركة بين المخازن:

```typescript
// أنواع المخازن
export type WarehouseType = 
  | 'SPARE_PARTS' 
  | 'FUEL' 
  | 'OILS' 
  | 'MATERIALS'
  | 'TOOLS_EQUIPMENT'

// أنواع الحركات
export type TransactionType = 
  | 'IN'          // إدخال
  | 'OUT'         // إخراج
  | 'TRANSFER'    // نقل
  | 'RETURN'      // إرجاع
  | 'ADJUSTMENT'  // تسوية
  | 'PURCHASE'    // شراء
  | 'ISSUE'       // صرف

// أنواع الجرد
export type AuditType = 
  | 'FULL'        // جرد شامل
  | 'CATEGORY'    // جرد فئة
  | 'LOCATION'    // جرد موقع
  | 'SINGLE_ITEM' // جرد صنف واحد
```

---

### 2️⃣ **Services (الخدمات)**

#### 📦 **Warehouse Service** - `services/warehouse.service.ts`

الخدمة الأساسية لجميع المخازن:

```typescript
import { WarehouseService } from '../services/warehouse.service'

// البحث عن صنف
const items = await WarehouseService.searchItems({
  warehouseType: 'SPARE_PARTS',
  searchTerm: 'فلتر زيت',
  limit: 10
})

// الحصول على معلومات المخزن
const stocks = await WarehouseService.getStock({
  warehouseType: 'SPARE_PARTS',
  itemId: 123
})

// حساب إحصائيات الجرد
const statistics = WarehouseService.calculateAuditStatistics(auditItems)
```

#### 🔄 **Transaction Service** - `services/transaction.service.ts`

خدمة الحركات الموحدة:

```typescript
import { TransactionService } from '../services/transaction.service'

// إنشاء حركة إدخال
const transaction = await TransactionService.createTransaction({
  warehouseType: 'SPARE_PARTS',
  itemId: 123,
  type: 'IN',
  quantity: 50,
  unitPrice: 100,
  notes: 'شراء دفعة جديدة'
})

// إنشاء حركة إخراج
await TransactionService.createTransaction({
  warehouseType: 'SPARE_PARTS',
  itemId: 123,
  type: 'OUT',
  quantity: 10,
  employeeId: 456,
  notes: 'صرف للموظف أحمد'
})

// إنشاء حركة نقل
await TransactionService.createTransaction({
  warehouseType: 'SPARE_PARTS',
  itemId: 123,
  type: 'TRANSFER',
  quantity: 20,
  fromLocationId: 1,
  toLocationId: 2
})
```

#### 📊 **Audit Service** - `services/audit.service.ts`

خدمة الجرد الموحدة:

```typescript
import { AuditService } from '../services/audit.service'

// إنشاء جرد شامل
const audit = await AuditService.createAudit({
  warehouseType: 'SPARE_PARTS',
  auditType: 'FULL',
  userId: 1
})

// إنشاء جرد فئة
const categoryAudit = await AuditService.createAudit({
  warehouseType: 'SPARE_PARTS',
  auditType: 'CATEGORY',
  categoryId: 5,
  userId: 1
})

// تحديث كمية صنف
await AuditService.updateAuditItemQuantity({
  auditItemId: 789,
  actualQuantity: 45
})

// إنهاء الجرد
const result = await AuditService.completeAudit(auditId)
```

#### 📊 **Excel Export Service** - `services/excel-export.service.ts`

خدمة تصدير تقارير Excel احترافية:

```typescript
import { ExcelExportService } from '../services/excel-export.service'

// تصدير تقرير جرد
const excelFile = await ExcelExportService.exportAuditReport({
  auditNumber: 'AUD-20251111-00001',
  auditType: 'FULL',
  warehouseType: 'SPARE_PARTS',
  warehouseName: 'مخزن قطع الغيار الرئيسي',
  auditDate: new Date(),
  createdBy: 'أحمد محمد',
  statistics: {
    totalItems: 100,
    checkedItems: 100,
    matchedItems: 85,
    shortageItems: 10,
    surplusItems: 5,
    totalShortageQty: 50,
    totalSurplusQty: 20
  },
  items: [...]
})

// إرسال الملف للمستخدم
await ctx.replyWithDocument(excelFile)
```

#### 🔔 **Notification Service** - `services/notification.service.ts`

خدمة الإشعارات للمسؤولين:

```typescript
import { NotificationService } from '../services/notification.service'

// إرسال إشعار بحركة جديدة
await NotificationService.sendTransactionNotification(ctx, {
  type: 'PURCHASE',
  itemName: 'فلتر زيت',
  quantity: 100,
  employeeName: 'أحمد محمد',
  notes: 'شراء دفعة جديدة'
})

// إرسال إشعار بإنهاء الجرد
await NotificationService.sendAuditCompletionNotification(ctx, {
  auditNumber: 'AUD-20251111-00001',
  warehouseName: 'مخزن قطع الغيار',
  statistics: {...}
})
```

---

### 3️⃣ **Utils (الأدوات)**

#### 📋 **Selection Lists** - `utils/selection-lists.util.ts`

قوائم الاختيار المرقمة:

```typescript
import { 
  showEmployeeSelectionList,
  showEquipmentSelectionList,
  showProjectSelectionList,
  showLocationSelectionList,
  showCategorySelectionList
} from '../utils/selection-lists.util'

// عرض قائمة الموظفين
await showEmployeeSelectionList(ctx, {
  page: 1,
  callbackPrefix: 'sp:issue:employee',
  pageCallbackPrefix: 'sp:issue:employee-page',
  cancelCallback: 'sp:issue:cancel',
  title: '👥 اختر الموظف المستلم:'
})

// عرض قائمة المعدات
await showEquipmentSelectionList(ctx, {
  page: 1,
  callbackPrefix: 'sp:dispense:equipment',
  pageCallbackPrefix: 'sp:dispense:equipment-page',
  cancelCallback: 'sp:dispense:cancel'
})
```

#### 🎨 **Formatters** - `utils/formatters.util.ts`

تنسيق البيانات والرسائل:

```typescript
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatItemInfo,
  formatTransactionInfo,
  formatAuditStatistics,
  getTransactionTypeLabel,
  getAuditTypeLabel
} from '../utils/formatters.util'

// تنسيق التاريخ
const arabicDate = formatDate(new Date())  // "١١ نوفمبر ٢٠٢٥"

// تنسيق المبالغ
const price = formatCurrency(1500.50)  // "1,500.50 جنيه"

// تنسيق معلومات الصنف
const message = formatItemInfo({
  code: 'SP-001',
  name: 'فلتر زيت',
  quantity: 50,
  unit: 'قطعة',
  unitPrice: 100
})
```

#### ✅ **Validators** - `utils/validators.util.ts`

التحقق من البيانات:

```typescript
import {
  validateQuantity,
  validatePrice,
  validateCode,
  validateName,
  validateStockAvailability,
  validateMultiple
} from '../utils/validators.util'

// التحقق من الكمية
const qtyCheck = validateQuantity(userInput)
if (!qtyCheck.isValid) {
  await ctx.reply(qtyCheck.error)
  return
}

// التحقق من توفر المخزون
const stockCheck = validateStockAvailability(
  requestedQty, 
  availableQty, 
  'فلتر زيت'
)

// التحقق من حقول متعددة
const allValid = validateMultiple([
  validateQuantity(qty),
  validatePrice(price),
  validateName(itemName)
])
```

---

## 🚀 كيفية الاستخدام

### **مثال: إنشاء معالج جديد باستخدام الخدمات**

```typescript
import { Composer } from 'grammy'
import type { Context } from '../../context'
import { TransactionService } from '../services/transaction.service'
import { NotificationService } from '../services/notification.service'
import { validateQuantity, validateSelection } from '../utils/validators.util'
import { formatTransactionInfo } from '../utils/formatters.util'
import { showEmployeeSelectionList } from '../utils/selection-lists.util'

export const newWarehouseHandler = new Composer<Context>()

// زر الإدخال السريع
newWarehouseHandler.callbackQuery(/^new:trans:in:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = parseInt(ctx.match[1])
  
  // حفظ الحالة
  ctx.session.transaction = { itemId, type: 'IN', step: 'QUANTITY' }
  
  await ctx.editMessageText('✍️ أدخل الكمية:')
})

// استقبال الكمية
newWarehouseHandler.on('message:text', async (ctx) => {
  const state = ctx.session.transaction
  if (!state || state.step !== 'QUANTITY') return
  
  // التحقق من الكمية
  const validation = validateQuantity(ctx.message.text)
  if (!validation.isValid) {
    await ctx.reply(validation.error)
    return
  }
  
  const quantity = parseInt(ctx.message.text)
  
  try {
    // إنشاء الحركة باستخدام الخدمة
    const transaction = await TransactionService.createTransaction({
      warehouseType: 'NEW_WAREHOUSE',
      itemId: state.itemId,
      type: 'IN',
      quantity,
      userId: ctx.dbUser!.id
    })
    
    // تنسيق الرسالة
    const message = formatTransactionInfo(transaction)
    await ctx.reply(message)
    
    // إرسال إشعار للمسؤولين
    await NotificationService.sendTransactionNotification(ctx, transaction)
    
    // مسح الحالة
    delete ctx.session.transaction
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء الإدخال')
  }
})
```

---

## ✨ المزايا

### ✅ **إعادة الاستخدام الكامل**
- كتابة الكود **مرة واحدة**
- استخدامه في **5+ مخازن**
- أي تحسين يطبق على **الجميع**

### ✅ **سهولة الصيانة**
- تعديل في **مكان واحد** → يؤثر على الجميع
- **لا تكرار** للأكواد
- سهولة إصلاح الأخطاء

### ✅ **سهولة إضافة مخازن جديدة**
```typescript
// مخزن جديد في 5 دقائق!
const oilsHandler = new Composer<Context>()

oilsHandler.callbackQuery('oils:quick-in', async (ctx) => {
  // نفس المنطق، استخدام نفس الخدمات
  const transaction = await TransactionService.createTransaction({
    warehouseType: 'OILS',  // فقط تغيير النوع!
    // ... باقي البيانات
  })
})
```

### ✅ **اختبار مركزي**
- اختبار الخدمات **مرة واحدة**
- يضمن عمل **جميع المخازن**

---

## 🛡️ الأمان

### **النظام القديم محمي 100%**
- ✅ `spare-parts-transactions.handler.ts` لا يُمس أبداً
- ✅ نسخة احتياطية تلقائية
- ✅ Feature Flags للتحكم

### **التحكم الكامل**
```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_AUDIT_SYSTEM: false,        // تشغيل/إيقاف
  USE_NEW_TRANSACTION_SYSTEM: false,  // تشغيل/إيقاف
  USE_OLD_SYSTEM: true,               // القديم يعمل دائماً
}
```

---

## 📋 الحالة الحالية

| المكون | الحالة | الوصف |
|--------|---------|--------|
| **Types** | ✅ مكتمل | جميع الأنواع المشتركة جاهزة |
| **Warehouse Service** | ✅ مكتمل | الخدمة الأساسية جاهزة |
| **Transaction Service** | ✅ مكتمل | خدمة الحركات جاهزة |
| **Audit Service** | ✅ مكتمل | خدمة الجرد جاهزة |
| **Excel Export Service** | ✅ مكتمل | خدمة التصدير جاهزة |
| **Notification Service** | ✅ مكتمل | خدمة الإشعارات جاهزة |
| **Selection Lists** | ✅ مكتمل | قوائم الاختيار جاهزة |
| **Formatters** | ✅ مكتمل | أدوات التنسيق جاهزة |
| **Validators** | ✅ مكتمل | أدوات التحقق جاهزة |
| **Templates** | ⏳ قريباً | قوالب Handlers قابلة لإعادة الاستخدام |
| **Migration** | ⏳ قريباً | الانتقال التدريجي من النظام القديم |

---

## 🚦 الخطوات التالية

### **المرحلة 1: اختبار النظام القديم ✅**
1. اختبار تصدير Excel
2. اختبار مسح الباركود بالصورة
3. اختبار عرض الصور في الجرد

### **المرحلة 2: إنشاء Templates 🔄**
1. Transaction Template
2. Audit Template
3. Report Template

### **المرحلة 3: الانتقال التدريجي ⏳**
1. نقل الجرد للنظام الجديد
2. نقل الحركات للنظام الجديد
3. نقل باقي الأجزاء

---

## 📞 الدعم

للأسئلة أو المساعدة:
- 📧 راسل مطور النظام
- 📖 راجع التوثيق في `docs/`
- 🐛 أبلغ عن الأخطاء في Issues

---

## 📄 الترخيص

هذا النظام جزء من مشروع Telegram Bot وهو مفتوح المصدر.

---

**✨ تم بناء النظام بحب واحترافية لتسهيل إدارة المخازن 💙**
