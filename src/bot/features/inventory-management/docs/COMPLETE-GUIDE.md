# 📖 الدليل الكامل الشامل - قسم إدارة المخازن

> **المرجع الوحيد والشامل - كل ما تحتاجه في ملف واحد**

---

## 📑 الفهرس

1. [نظرة عامة](#نظرة-عامة)
2. [البنية المعمارية](#البنية-المعمارية)
3. [Utils (15 أداة)](#utils)
4. [Services (12 خدمة)](#services)
5. [Oils-Greases (16 وظيفة)](#oils-greases)
6. [أمثلة عملية](#أمثلة-عملية)
7. [Troubleshooting](#troubleshooting)

---

## نظرة عامة

### الحالة الحالية

| المخزن | الحالة | الوظائف | الملفات |
|--------|--------|---------|---------|
| **Oils-Greases** | ✅ مكتمل | 16/16 | 32 |
| **Spare-Parts** | 🚧 قيد التطوير | 0/16 | 4 |

### الإحصائيات

```
Utils:           15 ملف (66 وظيفة)
Shared Services: 6 ملفات
Warehouse Services: 6 ملفات (Oils-Greases)
Handlers:        32 ملف (Oils-Greases)
التكرار:         0%
```

---

## البنية المعمارية

### الهيكل الكامل

```
inventory-management/
├── handlers/
│   ├── oils-greases/          # ✅ مكتمل
│   │   ├── items/             # 5 وظائف × 2 ملفات
│   │   ├── transactions/      # 5 وظائف × 2 ملفات
│   │   ├── reports/           # 4 وظائف × 2 ملفات
│   │   └── settings/          # 2 وظائف × 2 ملفات
│   ├── shared/                # Handlers مشتركة
│   │   ├── categories/
│   │   └── locations/
│   └── spare-parts/           # 🚧 قيد التطوير
│
├── services/ (في modules/services/inventory/)
│   ├── shared/                # 6 خدمات عامة
│   │   ├── inventory-items.service.ts
│   │   ├── transaction-number.service.ts
│   │   ├── storage-locations.service.ts
│   │   ├── excel-export.service.ts
│   │   ├── category.service.ts
│   │   └── reports.service.ts
│   └── oils-greases/          # 6 خدمات خاصة
│       ├── items.service.ts
│       ├── purchase.service.ts
│       ├── issue.service.ts
│       ├── transfer.service.ts
│       ├── return.service.ts
│       └── adjust.service.ts
│
├── utils/                     # 15 أداة
│   ├── arabic-formatter.util.ts
│   ├── pagination.util.ts
│   ├── keyboard-builder.util.ts
│   ├── message-builder.util.ts
│   ├── session-manager.util.ts
│   ├── input-validator.util.ts
│   ├── error-handler.util.ts
│   ├── loading-indicator.util.ts
│   ├── confirmation-dialog.util.ts
│   ├── cache-helper.util.ts
│   ├── search-helper.util.ts
│   ├── notification-helper.util.ts
│   ├── callback-parser.util.ts
│   ├── excel-helper.util.ts
│   └── transaction-summary.util.ts
│
└── types/
    └── warehouse.types.ts
```

### الطبقات

```
1. Handlers (UI)      → عرض + تنقل
2. Services (Logic)   → منطق + قاعدة بيانات
3. Utils (Helpers)    → وظائف مساعدة
4. Database (Prisma)  → قاعدة البيانات
```

---

## Utils

### 1. arabic-formatter.util.ts (8 وظائف)

```typescript
import {
  toArabicNumerals,        // 1234 → "١٢٣٤"
  formatArabicNumber,      // 1234.56 → "١٬٢٣٤٫٥٦"
  formatArabicCurrency,    // 5000 → "٥٬٠٠٠٫٠٠ جنيه"
  formatArabicDate,        // Date → "١٧ يناير ٢٠٢٥"
  formatArabicDateTime,    // Date → "١٧ يناير ٢٠٢٥، ١٠:٣٠ م"
  formatArabicPercentage,  // 75.5 → "٪٧٥٫٥"
  formatArabicQuantity,    // (50, 'لتر') → "٥٠ لتر"
  formatArabicPhone        // '01234567890' → "٠١٢٣٤٥٦٧٨٩٠"
} from '../../utils/arabic-formatter.util.js'
```

### 2. pagination.util.ts (4 وظائف)

```typescript
import {
  buildPaginationButtons,  // بناء أزرار الترقيم
  calculatePagination,     // حساب pagination
  parsePaginationParams,   // تحليل parameters
  getPaginationInfo        // معلومات pagination
} from '../../utils/pagination.util.js'
```

### 3. keyboard-builder.util.ts (6 وظائف)

```typescript
import {
  buildItemsKeyboard,        // لوحة أصناف
  buildConfirmKeyboard,      // لوحة تأكيد
  buildActionButtons,        // أزرار إجراءات
  buildBackButton,           // زر رجوع
  buildCancelButton,         // زر إلغاء
  buildNavigationKeyboard    // لوحة تنقل
} from '../../utils/keyboard-builder.util.js'
```

### 4. message-builder.util.ts (6 وظائف)

```typescript
import {
  buildItemDetailsMessage,     // تفاصيل صنف
  buildListHeaderMessage,      // رأس قائمة
  buildSuccessMessage,         // رسالة نجاح
  buildErrorMessage,           // رسالة خطأ
  buildConfirmationMessage,    // رسالة تأكيد
  buildSummaryMessage          // ملخص
} from '../../utils/message-builder.util.js'
```

### 5. session-manager.util.ts (11 وظيفة)

```typescript
import {
  initInventorySession,      // بدء session
  updateSessionStep,         // تحديث خطوة
  updateSessionData,         // تحديث بيانات
  getSessionData,            // قراءة بيانات
  getSessionStep,            // قراءة خطوة
  clearInventorySession,     // تنظيف
  hasActiveSession,          // التحقق من session نشط
  isSessionStep,             // التحقق من خطوة
  getSessionAction,          // قراءة الإجراء
  getSessionWarehouse,       // قراءة المخزن
  validateSession            // التحقق من صحة
} from '../../utils/session-manager.util.js'
```

### 6. input-validator.util.ts (10 وظائف)

```typescript
import {
  validateQuantity,          // التحقق من كمية
  validatePrice,             // التحقق من سعر
  validateText,              // التحقق من نص
  validateNumber,            // التحقق من رقم
  validatePositiveNumber,    // التحقق من رقم موجب
  validateDate,              // التحقق من تاريخ
  validateBarcode,           // التحقق من باركود
  validatePhone,             // التحقق من هاتف
  validateEmail,             // التحقق من بريد
  sanitizeInput              // تنظيف مدخل
} from '../../utils/input-validator.util.js'
```

### 7-15. باقي Utils

```typescript
// error-handler.util.ts (4 وظائف)
handleError, getErrorMessage, showErrorWithRetry, logError

// loading-indicator.util.ts (4 وظائف)
showLoading, updateLoading, hideLoading, LoadingMessages

// confirmation-dialog.util.ts (3 وظائف)
showConfirmDialog, showDeleteConfirm, showCancelConfirm

// cache-helper.util.ts (5 caches)
categoriesCache, locationsCache, itemsCache, employeesCache, equipmentCache

// search-helper.util.ts (6 وظائف)
// notification-helper.util.ts (6 وظائف)
// callback-parser.util.ts (4 وظائف)
// excel-helper.util.ts (5 وظائف)
// transaction-summary.util.ts (5 وظائف)
```

---

## Services

### Shared Services (6 خدمات)

#### 1. InventoryItemsService

```typescript
// الحصول على أصناف
await InventoryItemsService.getItems('oils-greases', page, limit, filters)

// البحث
await InventoryItemsService.searchItems('oils-greases', query, 'name')

// الحصول بالـ ID
await InventoryItemsService.getItemById('oils-greases', id)

// التحقق من باركود
await InventoryItemsService.checkBarcodeExists('oils-greases', barcode)

// حذف ناعم
await InventoryItemsService.softDelete('oils-greases', id)
```

#### 2. TransactionNumberService

```typescript
// توليد رقم معاملة
const number = await TransactionNumberService.generate(
  'PUR-OILS',
  Database.prisma.iNV_OilsGreasesPurchase
)
// النتيجة: "PUR-OILS-20250117-001"
```

#### 3. StorageLocationsService

```typescript
// الحصول على مواقع
await StorageLocationsService.getLocations()

// الحصول بالـ ID
await StorageLocationsService.getLocationById(id)

// إنشاء
await StorageLocationsService.createLocation(data, userId)

// تحديث
await StorageLocationsService.updateLocation(id, data, userId)

// حذف
await StorageLocationsService.deleteLocation(id)
```

#### 4. ExcelExportService

```typescript
// تصدير أصناف
const result = await ExcelExportService.exportItems('oils-greases', items, filters)
// { buffer, fileName, count }
```

#### 5. CategoryService

```typescript
// الحصول على فئات
await CategoryService.getCategories('oils-greases')

// الحصول بالـ ID
await CategoryService.getCategoryById('oils-greases', id)

// إنشاء
await CategoryService.createCategory('oils-greases', data, userId)

// تحديث
await CategoryService.updateCategory('oils-greases', id, data, userId)

// حذف
await CategoryService.deleteCategory('oils-greases', id)
```

#### 6. ReportsService

```typescript
// أصناف منخفضة
await ReportsService.getLowStockItems('oils-greases', threshold)

// أصناف منتهية
await ReportsService.getOutOfStockItems('oils-greases')

// ملخص المخزون
await ReportsService.getInventorySummary('oils-greases')

// قيمة حسب الفئة
await ReportsService.getValueByCategory('oils-greases')

// قيمة حسب الموقع
await ReportsService.getValueByLocation('oils-greases')
```

### Warehouse Services (6 خدمات - Oils-Greases)

#### 1. OilsGreasesItemsService

```typescript
// توليد كود
await OilsGreasesItemsService.generateCode(categoryId)

// إنشاء صنف
await OilsGreasesItemsService.createItem(data, userId)

// تحديث صنف
await OilsGreasesItemsService.updateItem(id, data, userId)

// الحصول مع تفاصيل
await OilsGreasesItemsService.getItemWithDetails(id)
```

#### 2-6. Transaction Services

```typescript
// شراء
await OilsGreasesPurchaseService.createPurchase(data)

// صرف
await OilsGreasesIssueService.createIssue(data)

// نقل
await OilsGreasesTransferService.createTransfer(data)

// إرجاع
await OilsGreasesReturnService.createReturn(data)

// تسوية
await OilsGreasesAdjustService.createAdjustment(data)
```

---

## Oils-Greases

### الوظائف (16 وظيفة)

#### 1. Items (5 وظائف)

##### 1.1 Add Item
```
التدفق:
1. اختيار الفئة
2. إدخال الاسم
3. إدخال الكمية الأولية
4. إدخال الحد الأدنى
5. إدخال السعر
6. إدخال الباركود (اختياري)
7. اختيار الموقع
8. تأكيد وحفظ

الملفات:
- items/add-item/add-item.handler.ts
- items/add-item/add-item.service.ts

Services:
- OilsGreasesItemsService.generateCode()
- OilsGreasesItemsService.createItem()
```

##### 1.2 Edit Item
```
التدفق:
1. اختيار الصنف
2. اختيار الحقل للتعديل
3. إدخال القيمة الجديدة
4. تأكيد وحفظ
```

##### 1.3 List Items
```
الميزات:
- Pagination (8 عناصر/صفحة)
- فلترة حسب الفئة
- تصدير Excel
- عرض الكمية والسعر
```

##### 1.4 Search Item
```
طرق البحث:
- بالكود
- بالاسم
- بالباركود
```

##### 1.5 View Item
```
المعلومات:
- الاسم والكود
- الفئة والموقع
- الكمية (الحالية/الأدنى)
- السعر
- الباركود
- آخر المعاملات
```

#### 2. Transactions (5 وظائف)

##### 2.1 Purchase (شراء)
```
التدفق:
1. اختيار الصنف
2. إدخال الكمية
3. إدخال السعر
4. إدخال اسم المورد
5. إدخال رقم الفاتورة
6. إدخال ملاحظات (اختياري)
7. مراجعة وتأكيد
8. حفظ وتحديث الكمية

النتيجة:
✅ زيادة كمية الصنف
✅ إنشاء سجل شراء
✅ توليد رقم معاملة (PUR-OILS-YYYYMMDD-XXX)
✅ تسجيل audit log
```

##### 2.2 Issue (صرف)
```
التدفق:
1. اختيار الصنف
2. إدخال الكمية
3. اختيار نوع المستلم (موظف/معدة)
4. اختيار المستلم
5. إدخال ملاحظات (اختياري)
6. مراجعة وتأكيد
7. حفظ وتحديث الكمية

النتيجة:
✅ تقليل كمية الصنف
✅ إنشاء سجل صرف
✅ توليد رقم معاملة (ISS-OILS-YYYYMMDD-XXX)
✅ تسجيل audit log
```

##### 2.3 Transfer (نقل)
```
التدفق:
1. اختيار الصنف
2. اختيار الموقع الجديد
3. إدخال ملاحظات (اختياري)
4. مراجعة وتأكيد
5. حفظ وتحديث الموقع
```

##### 2.4 Return (إرجاع)
```
التدفق:
1. اختيار الصنف
2. إدخال الكمية
3. اختيار نوع المُرجِع (موظف/معدة)
4. اختيار المُرجِع
5. إدخال ملاحظات (اختياري)
6. مراجعة وتأكيد
7. حفظ وتحديث الكمية
```

##### 2.5 Adjust (تسوية)
```
التدفق:
1. اختيار الصنف
2. اختيار نوع التسوية (زيادة/نقصان)
3. إدخال الكمية
4. إدخال السبب
5. إدخال ملاحظات (اختياري)
6. مراجعة وتأكيد
7. حفظ وتحديث الكمية
```

#### 3. Reports (4 وظائف)

##### 3.1 Alerts (تنبيهات)
```
التنبيهات:
⚠️ أصناف منخفضة (< الحد الأدنى)
❌ أصناف منتهية (= 0)
📊 إحصائيات سريعة
```

##### 3.2 Export (تصدير)
```
التصدير:
📄 Excel (جميع الأصناف)
📄 Excel (حسب الفئة)
📄 Excel (أصناف منخفضة)
```

##### 3.3 Summary (ملخص)
```
المعلومات:
📦 إجمالي الأصناف
💰 القيمة الإجمالية
⚠️ عدد الأصناف المنخفضة
❌ عدد الأصناف المنتهية
```

##### 3.4 Value (قيمة)
```
التقارير:
📊 قيمة حسب الفئة
📍 قيمة حسب الموقع
📈 توزيع القيمة
```

#### 4. Settings (2 وظائف)

##### 4.1 Categories (الفئات)
```
الوظائف:
➕ إضافة فئة
✏️ تعديل فئة
🗑️ حذف فئة
🔄 إعادة ترتيب
```

##### 4.2 Locations (المواقع)
```
الوظائف:
➕ إضافة موقع
✏️ تعديل موقع
🗑️ حذف موقع
```

---

## أمثلة عملية

### مثال 1: Handler كامل

```typescript
import { Composer } from 'grammy'
import type { Context } from '#root/bot/context.js'

// Services
import { InventoryItemsService } from 'shared/inventory-items.service.js'
import { OilsGreasesPurchaseService } from 'oils-greases/purchase.service.js'

// Utils
import { toArabicNumerals } from '../../utils/arabic-formatter.util.js'
import { buildItemsKeyboard } from '../../utils/keyboard-builder.util.js'
import { getSessionData } from '../../utils/session-manager.util.js'
import { validateQuantity } from '../../utils/input-validator.util.js'
import { handleError } from '../../utils/error-handler.util.js'

export const purchaseHandler = new Composer<Context>()

// عرض قائمة
purchaseHandler.callbackQuery('purchase:start', async (ctx) => {
  try {
    const items = await InventoryItemsService.getItems('oils-greases', 1)
    const keyboard = buildItemsKeyboard(items.items, 'purchase:select')
    await ctx.editMessageText('اختر الصنف:', { reply_markup: keyboard })
  } catch (error) {
    await handleError(ctx, error, 'purchase:start')
  }
})

// إدخال كمية
purchaseHandler.on('message:text', async (ctx) => {
  try {
    const data = getSessionData(ctx)
    if (!data) return
    
    const result = validateQuantity(ctx.message.text, { min: 1, max: 10000 })
    if (!result.valid) {
      await ctx.reply(`❌ ${result.error}`)
      return
    }
    
    await OilsGreasesPurchaseService.createPurchase({
      itemId: data.itemId,
      quantity: result.value,
      userId: BigInt(ctx.from!.id)
    })
    
    await ctx.reply(`✅ تمت العملية\n\nالكمية: ${toArabicNumerals(result.value)}`)
  } catch (error) {
    await handleError(ctx, error, 'purchase:quantity')
  }
})
```

---

## Troubleshooting

### مشكلة: TypeScript Errors

```typescript
// ❌ خطأ: Property 'totalPages' does not exist
const result = await Service.getItems()
console.log(result.totalPages)  // خطأ

// ✅ حل: تأكد من return type
interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  totalPages: number  // ✅ موجود
  hasNext: boolean
  hasPrev: boolean
}
```

### مشكلة: Session لا يعمل

```typescript
// ❌ خطأ: استخدام ctx.session مباشرة
ctx.session.data = { ... }

// ✅ حل: استخدام session-manager
import { initInventorySession, getSessionData } from 'utils/session-manager.util.js'

initInventorySession(ctx, 'purchase', 'oils-greases', 'step1')
const data = getSessionData(ctx)
```

### مشكلة: Prisma Model Not Found

```typescript
// ❌ خطأ: اسم خاطئ
Database.prisma.oilsGreasesItem  // خطأ

// ✅ حل: استخدام الاسم الصحيح
Database.prisma.iNV_OilsGreasesItem  // ✅ صحيح (مع بادئة INV_)
```

### مشكلة: Utils لا تعمل

```typescript
// ❌ خطأ: استيراد خاطئ
import { toArabicNumerals } from 'utils/arabic-formatter'  // خطأ

// ✅ حل: استيراد صحيح
import { toArabicNumerals } from '../../utils/arabic-formatter.util.js'  // ✅
```

---

## الخلاصة

### الملفات الموجودة

```
handlers/oils-greases/    32 ملف (16 وظيفة × 2)
services/shared/          6 ملفات
services/oils-greases/    6 ملفات
utils/                    15 ملف
```

### القواعد الأساسية

1. **الفصل التام** - كل وظيفة = ملف منفصل
2. **Utils أولاً** - لا تكرار للكود
3. **Shared Services** - منطق مشترك = service مشترك
4. **Handler = UI فقط** - لا منطق أعمال في handlers
5. **معالجة أخطاء** - try-catch في كل handler

---

**آخر تحديث**: 2025-01-17  
**الإصدار**: 3.0 (نهائي)  
**الحالة**: مكتمل (Oils-Greases)
