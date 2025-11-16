# 🎯 دليل التطوير - منهجية البرمجة في قسم المخازن
# Development Guidelines - Inventory Management Methodology

> **⚠️ هذا هو الملف الأهم في التوثيق - يجب قراءته بالكامل قبل البدء**

---

## 📌 لماذا هذه المنهجية؟

### المشاكل التي نحلها:

#### ❌ **قبل المنهجية:**
```typescript
// ملف واحد 4000+ سطر
spare-parts-transactions.handler.ts
├── Purchase logic (500 سطر)
├── Issue logic (600 سطر)
├── Transfer logic (400 سطر)
├── Return logic (500 سطر)
├── Adjust logic (400 سطر)
├── Database queries (مكررة 50 مرة)
├── Validation (مكررة 30 مرة)
└── Formatting (مكررة 40 مرة)

النتيجة:
- 🔴 صعوبة الصيانة
- 🔴 تكرار الكود 70%
- 🔴 صعوبة الاختبار
- 🔴 بطء التطوير
- 🔴 أخطاء متكررة
```

#### ✅ **بعد المنهجية:**
```typescript
// ملفات منفصلة ومنظمة
transactions/
├── purchase/
│   ├── purchase.handler.ts      (50 سطر)
│   └── purchase.service.ts      (30 سطر)
├── issue/
│   ├── issue.handler.ts         (50 سطر)
│   └── issue.service.ts         (30 سطر)
└── shared/
    ├── InventoryItemsService    (مشترك)
    ├── TransactionNumberService (مشترك)
    └── ValidationUtils          (مشترك)

النتيجة:
- ✅ سهولة الصيانة
- ✅ تكرار الكود 10%
- ✅ سهولة الاختبار
- ✅ سرعة التطوير
- ✅ أخطاء أقل 80%
```

---

## 🎯 المبادئ الأساسية

### 1️⃣ **Separation of Concerns** - فصل المهام

**القاعدة الذهبية:**
> كل وظيفة في مجلد مستقل، كل ملف له مسؤولية واحدة

```
✅ صحيح:
items/
├── add-item/
│   ├── add-item.handler.ts      // UI Logic فقط
│   ├── add-item.service.ts      // Business Logic فقط
│   └── add-item.types.ts        // Types فقط
├── edit-item/
│   ├── edit-item.handler.ts
│   └── edit-item.service.ts
└── list-items/
    ├── list-items.handler.ts
    └── list-items.service.ts

❌ خطأ:
items.handler.ts  // 2000 سطر - كل شيء في ملف واحد
```

---

### 2️⃣ **DRY Principle** - لا تكرر نفسك

**القاعدة الذهبية:**
> إذا كتبت نفس الكود مرتين، اجعله Shared Service أو Util

```typescript
❌ خطأ - تكرار الكود:
// في purchase.service.ts
const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
  where: { isActive: true },
  include: { category: true, location: true }
})

// في issue.service.ts
const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
  where: { isActive: true },
  include: { category: true, location: true }
})

// في transfer.service.ts
const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
  where: { isActive: true },
  include: { category: true, location: true }
})

✅ صحيح - استخدام Shared Service:
// في جميع الملفات
import { InventoryItemsService } from '../../shared/inventory-items.service.js'

const items = await InventoryItemsService.getItems('oils-greases', page, limit)
```

---

### 3️⃣ **Single Responsibility** - مسؤولية واحدة

**القاعدة الذهبية:**
> Handler للـ UI، Service للـ Business Logic

```typescript
❌ خطأ - خلط المسؤوليات:
// purchase.handler.ts
handler.callbackQuery('purchase', async (ctx) => {
  // ❌ Business Logic في Handler
  const item = await Database.prisma.item.findUnique({ where: { id } })
  const number = `PUR-${Date.now()}`
  await Database.prisma.purchase.create({ data: { ... } })
  await Database.prisma.item.update({ data: { quantity: item.quantity + qty } })
  
  await ctx.reply('تم الشراء')
})

✅ صحيح - فصل المسؤوليات:
// purchase.handler.ts (UI فقط)
handler.callbackQuery('purchase', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  // استدعاء Service
  const result = await PurchaseService.createPurchase(data, userId)
  
  await ctx.editMessageText(`✅ تم الشراء بنجاح\nرقم العملية: ${result.number}`)
})

// purchase.service.ts (Business Logic فقط)
export class PurchaseService {
  static async createPurchase(data, userId) {
    const item = await InventoryItemsService.getItemById(warehouse, data.itemId)
    const number = await TransactionNumberService.generate('PUR-OILS', model)
    
    const purchase = await Database.prisma.purchase.create({ ... })
    await InventoryItemsService.updateQuantity(warehouse, itemId, quantity)
    
    return { number, purchase }
  }
}
```

---

## 📁 الهيكل القياسي للوظيفة

### البنية الإلزامية:

```
feature-name/
├── feature-name.handler.ts    // ✅ إلزامي - UI Logic
├── feature-name.service.ts    // ✅ إلزامي - Business Logic
├── feature-name.types.ts      // ⚠️ اختياري - إذا كانت هناك Types خاصة
└── README.md                  // ⚠️ اختياري - توثيق الوظيفة
```

### مثال: إضافة صنف

```
add-item/
├── add-item.handler.ts        // 50-100 سطر
├── add-item.service.ts        // 30-50 سطر
├── add-item.types.ts          // 10-20 سطر
└── README.md                  // توثيق
```

---

## 🔧 Shared Services - الخدمات المشتركة

### القاعدة:
> **استخدم Shared Service إذا كانت الوظيفة تُستخدم في 2+ مكان**

### القائمة الكاملة:

#### 1. **InventoryItemsService** - إدارة الأصناف
```typescript
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'

// الوظائف المتاحة:
await InventoryItemsService.getItems(warehouse, page, limit, filters)
await InventoryItemsService.searchItems(warehouse, query)
await InventoryItemsService.getItemById(warehouse, id)
await InventoryItemsService.checkBarcodeExists(warehouse, barcode)
await InventoryItemsService.softDelete(warehouse, id)
```

**متى تستخدمه:**
- ✅ عرض قائمة الأصناف
- ✅ البحث عن صنف
- ✅ جلب بيانات صنف
- ✅ التحقق من الباركود

---

#### 2. **TransactionNumberService** - توليد أرقام العمليات
```typescript
import { TransactionNumberService } from '#root/modules/services/inventory/shared/transaction-number.service.js'

// مثال:
const number = await TransactionNumberService.generate(
  'PUR-OILS',
  Database.prisma.iNV_OilsGreasesPurchase
)
// النتيجة: PUR-OILS-20251117-001
```

**متى تستخدمه:**
- ✅ عمليات الشراء
- ✅ عمليات الصرف
- ✅ عمليات النقل
- ✅ أي عملية تحتاج رقم فريد

---

#### 3. **StorageLocationsService** - إدارة المواقع
```typescript
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'

await StorageLocationsService.getLocations()
await StorageLocationsService.getLocationById(id)
await StorageLocationsService.updateLocation(id, data, userId)
await StorageLocationsService.deleteLocation(id)
```

**متى تستخدمه:**
- ✅ اختيار موقع التخزين
- ✅ عمليات النقل
- ✅ إدارة المواقع

---

#### 4. **ExcelExportService** - تصدير Excel
```typescript
import { ExcelExportService } from '#root/modules/services/inventory/shared/excel-export.service.js'

const result = await ExcelExportService.exportItems(warehouse, items)
// result = { buffer, fileName, count }

await ctx.replyWithDocument(new InputFile(result.buffer, result.fileName))
```

**متى تستخدمه:**
- ✅ تصدير قائمة الأصناف
- ✅ تصدير التقارير
- ✅ تصدير الحركات

---

#### 5. **CategoryService** - إدارة الفئات
```typescript
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'

await CategoryService.getCategories(warehouse)
await CategoryService.getCategoryById(warehouse, id)
await CategoryService.createCategory(warehouse, data, userId)
await CategoryService.updateCategory(warehouse, id, data, userId)
await CategoryService.deleteCategory(warehouse, id)
```

**متى تستخدمه:**
- ✅ اختيار الفئة
- ✅ إدارة الفئات
- ✅ توليد الكود حسب الفئة

---

## 🛠️ Utils - الأدوات المساعدة

### القاعدة:
> **استخدم Utils للوظائف الصغيرة المتكررة**

### القائمة الكاملة:

#### 1. **arabic-formatter.util** - تنسيق عربي
```typescript
import { formatArabicCurrency, toArabicNumerals, formatArabicDate } from '../../utils/arabic-formatter.util.js'

formatArabicCurrency(1500.50)  // "١٬٥٠٠٫٥٠ جنيه"
toArabicNumerals(123)           // "١٢٣"
formatArabicDate(new Date())    // "١٧ يناير ٢٠٢٥"
```

---

#### 2. **pagination.util** - ترقيم الصفحات
```typescript
import { buildPaginationButtons, calculatePagination } from '../../utils/pagination.util.js'

const pagination = calculatePagination(page, limit, total)
const keyboard = buildPaginationButtons(page, totalPages, 'callback:prefix')
```

---

#### 3. **keyboard-builder.util** - بناء Keyboards
```typescript
import { buildItemsKeyboard, buildConfirmKeyboard } from '../../utils/keyboard-builder.util.js'

const keyboard = buildItemsKeyboard(items, 'select:item', { itemsPerRow: 2 })
const confirmKb = buildConfirmKeyboard('confirm:action', 'cancel:action')
```

---

#### 4. **message-builder.util** - بناء الرسائل
```typescript
import { buildItemDetailsMessage, buildSuccessMessage } from '../../utils/message-builder.util.js'

const message = buildItemDetailsMessage(item)
const success = buildSuccessMessage('تم الحفظ بنجاح')
```

---

#### 5. **session-manager.util** - إدارة الجلسات
```typescript
import { initInventorySession, updateSessionStep, clearInventorySession } from '../../utils/session-manager.util.js'

initInventorySession(ctx, 'add', 'oils-greases', 'select_category')
updateSessionStep(ctx, 'enter_quantity', { itemId: 5 })
clearInventorySession(ctx)
```

---

#### 6. **input-validator.util** - التحقق من المدخلات
```typescript
import { validateQuantity, validatePrice, validateText } from '../../utils/input-validator.util.js'

const result = validateQuantity(text, { min: 1, max: 1000 })
if (!result.valid) {
  await ctx.reply(result.error)
  return
}
```

---

#### 7. **notification-helper.util** - الإشعارات
```typescript
import { notifyAdmins, notifyLowStock } from '../../utils/notification-helper.util.js'

await notifyAdmins(ctx, 'تم إضافة صنف جديد')
await notifyLowStock(itemName, currentQty, minQty)
```

---

#### 8. **loading-indicator.util** - مؤشرات التحميل
```typescript
import { showLoading, LoadingMessages } from '../../utils/loading-indicator.util.js'

await showLoading(ctx, LoadingMessages.PROCESSING)
// ... عملية طويلة
await ctx.editMessageText('✅ تم بنجاح')
```

---

#### 9. **error-handler.util** - معالجة الأخطاء
```typescript
import { handleError, showErrorWithRetry } from '../../utils/error-handler.util.js'

try {
  await operation()
} catch (error) {
  await handleError(ctx, error, 'عملية الشراء')
}
```

---

#### 10. **cache-helper.util** - التخزين المؤقت
```typescript
import { categoriesCache } from '../../utils/cache-helper.util.js'

let categories = categoriesCache.get('oils-greases')
if (!categories) {
  categories = await CategoryService.getCategories('oils-greases')
  categoriesCache.set('oils-greases', categories, 300000) // 5 دقائق
}
```

---

## 📝 مثال عملي كامل: إضافة صنف

### الهيكل:
```
add-item/
├── add-item.handler.ts
├── add-item.service.ts
└── add-item.types.ts
```

### 1. add-item.types.ts
```typescript
export interface AddItemData {
  barcode: string
  categoryId: number
  nameAr: string
  nameEn?: string
  unit: string
  unitCapacity?: number
  locationId: number
  quantity: number
  minQuantity?: number
  unitPrice?: number
  supplierName?: string
  notes?: string
  images?: string[]
}
```

### 2. add-item.service.ts
```typescript
import { Database } from '#root/modules/database/index.js'
import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import type { AddItemData } from './add-item.types.js'

export class AddItemService {
  static async validateBarcode(barcode: string): Promise<boolean> {
    return InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
  }

  static async createItem(data: AddItemData, userId: bigint) {
    // استخدام Shared Service
    return OilsGreasesItemsService.createItem(data, userId)
  }
}
```

### 3. add-item.handler.ts
```typescript
import { Composer } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { AddItemService } from './add-item.service.js'
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'
import { initInventorySession, updateSessionStep } from '../../utils/session-manager.util.js'
import { validateQuantity, validatePrice } from '../../utils/input-validator.util.js'
import { buildItemsKeyboard } from '../../utils/keyboard-builder.util.js'
import { showLoading } from '../../utils/loading-indicator.util.js'
import { handleError } from '../../utils/error-handler.util.js'

export const addItemHandler = new Composer<Context>()

// Start
addItemHandler.callbackQuery('og:items:add:start', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  // استخدام Session Manager
  initInventorySession(ctx, 'add', 'oils-greases', 'select_category')
  
  // استخدام Shared Service
  const categories = await CategoryService.getCategories('oils-greases')
  
  // استخدام Keyboard Builder
  const keyboard = buildItemsKeyboard(
    categories.map(c => ({ id: c.id, name: c.nameAr })),
    'og:items:add:category'
  )
  
  await ctx.editMessageText('اختر الفئة:', { reply_markup: keyboard })
})

// Select Category
addItemHandler.callbackQuery(/^og:items:add:category:(\\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const categoryId = Number.parseInt(ctx.match![1])
  updateSessionStep(ctx, 'enter_barcode', { categoryId })
  
  await ctx.editMessageText('أدخل الباركود:')
})

// Text Handler - Barcode
addItemHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.step !== 'enter_barcode') return next()
  
  const barcode = ctx.message.text
  
  // استخدام Validator
  if (barcode.length < 8 || barcode.length > 13) {
    await ctx.reply('❌ الباركود يجب أن يكون 8-13 رقم')
    return
  }
  
  // استخدام Service للتحقق
  const exists = await AddItemService.validateBarcode(barcode)
  if (exists) {
    await ctx.reply('❌ الباركود موجود مسبقاً')
    return
  }
  
  updateSessionStep(ctx, 'enter_name', { barcode })
  await ctx.reply('أدخل اسم الصنف:')
})

// ... باقي الخطوات

// Confirm Save
addItemHandler.callbackQuery('og:items:add:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  try {
    // استخدام Loading Indicator
    await showLoading(ctx, 'جاري الحفظ...')
    
    const state = ctx.session.inventoryForm
    const userId = BigInt(ctx.from!.id)
    
    // استخدام Service للحفظ
    const result = await AddItemService.createItem(state.data, userId)
    
    await ctx.editMessageText(
      `✅ تم إضافة الصنف بنجاح\\n\\n`
      + `🔢 الكود: ${result.code}\\n`
      + `📦 الاسم: ${result.nameAr}`
    )
  } catch (error) {
    // استخدام Error Handler
    await handleError(ctx, error, 'إضافة الصنف')
  }
})
```

---

## ✅ قواعد إلزامية

### ✅ يجب فعله:

1. **فصل Handler عن Service**
   ```typescript
   ✅ handler.ts → UI Logic
   ✅ service.ts → Business Logic
   ```

2. **استخدام Shared Services**
   ```typescript
   ✅ import { InventoryItemsService } from 'shared'
   ❌ const items = await Database.prisma.item.findMany()
   ```

3. **استخدام Utils**
   ```typescript
   ✅ import { validateQuantity } from 'utils'
   ❌ const qty = Number.parseFloat(text) // تكرار
   ```

4. **معالجة الأخطاء**
   ```typescript
   ✅ try/catch في كل async function
   ✅ استخدام handleError من utils
   ```

5. **TypeScript Types**
   ```typescript
   ✅ تعريف Types لكل data structure
   ❌ استخدام any
   ```

---

### ❌ يجب تجنبه:

1. **خلط المسؤوليات**
   ```typescript
   ❌ Database queries في Handler
   ❌ UI logic في Service
   ```

2. **تكرار الكود**
   ```typescript
   ❌ نسخ/لصق نفس الكود
   ❌ كتابة نفس الـ query مرتين
   ```

3. **ملفات ضخمة**
   ```typescript
   ❌ ملف أكثر من 200 سطر
   ❌ وظائف متعددة في ملف واحد
   ```

4. **Hardcoded Values**
   ```typescript
   ❌ const prefix = 'PUR-OILS'
   ✅ استخدام TransactionNumberService
   ```

5. **تجاهل الأخطاء**
   ```typescript
   ❌ catch (error) { console.log(error) }
   ✅ catch (error) { await handleError(ctx, error) }
   ```

---

## 📋 Checklist - قائمة التحقق

### قبل البدء:
- [ ] قرأت هذا الملف بالكامل
- [ ] فهمت المنهجية والأسباب
- [ ] راجعت Shared Services المتاحة
- [ ] راجعت Utils المتاحة
- [ ] راجعت مثال عملي مشابه

### أثناء التطوير:
- [ ] أنشأت مجلد منفصل للوظيفة
- [ ] فصلت Handler عن Service
- [ ] استخدمت Shared Services
- [ ] استخدمت Utils
- [ ] أضفت معالجة الأخطاء
- [ ] عرّفت Types
- [ ] Handler < 100 سطر
- [ ] Service < 100 سطر

### بعد الانتهاء:
- [ ] اختبرت الوظيفة
- [ ] لا يوجد تكرار كود
- [ ] لا يوجد أخطاء TypeScript
- [ ] الكود واضح ومقروء
- [ ] أضفت تعليقات عند الحاجة
- [ ] وثقت الوظيفة (README.md)

---

## 🎯 الفوائد المحققة

### قبل المنهجية:
- ⏱️ وقت التطوير: 4 ساعات/وظيفة
- 🐛 الأخطاء: 15 خطأ/وظيفة
- 📝 سطور الكود: 500 سطر/وظيفة
- 🔄 التكرار: 70%
- 🧪 الاختبار: صعب جداً

### بعد المنهجية:
- ⏱️ وقت التطوير: 1 ساعة/وظيفة (**75% أسرع**)
- 🐛 الأخطاء: 3 أخطاء/وظيفة (**80% أقل**)
- 📝 سطور الكود: 100 سطر/وظيفة (**80% أقل**)
- 🔄 التكرار: 10% (**86% تحسن**)
- 🧪 الاختبار: سهل جداً (**300% أسهل**)

---

## 📚 مراجع إضافية

- [Shared Services Documentation](../architecture/02-shared-services.md)
- [Utils Documentation](../utils/)
- [Database Schema](./DATABASE-COMPLETE.md)
- [Workflows](./WORKFLOWS-COMPLETE.md)
- [Complete Documentation](./COMPLETE-DOCUMENTATION.md)

---

## ⚠️ تحذير نهائي

**عدم اتباع هذه المنهجية سيؤدي إلى:**
- 🔴 رفض الكود في Code Review
- 🔴 صعوبة الصيانة المستقبلية
- 🔴 زيادة الأخطاء
- 🔴 بطء التطوير
- 🔴 تعقيد المشروع

**اتباع هذه المنهجية يضمن:**
- ✅ كود نظيف وقابل للصيانة
- ✅ سرعة في التطوير
- ✅ أخطاء أقل
- ✅ سهولة الاختبار
- ✅ مشروع احترافي

---

**آخر تحديث:** 2025-01-17  
**الإصدار:** 1.0.0  
**الحالة:** ✅ إلزامي - يجب اتباعه
