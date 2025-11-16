# دليل التحسينات - مخزن الزيوت والشحوم

## 📋 نظرة عامة

هذا الدليل يوثق جميع التحسينات المطلوبة لتقليل التكرار واستخدام Shared Services و Utils بشكل كامل.

**الهدف:** تقليل 880 سطر كود إضافية (40% تحسين)

---

## 🎯 التحسين 1: حذف Wrapper Services

### المشكلة
10 ملفات service تعمل كـ wrapper فقط بدون أي منطق إضافي، مجرد استدعاء مباشر للـ Shared Services.

### الملفات المطلوب حذفها

#### 1. `items/edit-item/edit-item.service.ts`
```typescript
// ❌ الكود الحالي (wrapper فقط)
export class EditItemService {
  static async getItemById(id: number) {
    return InventoryItemsService.getItemById('oils-greases', id)
  }
  static async updateCategory(itemId: number, categoryId: number, userId: bigint) {
    return OilsGreasesItemsService.updateItem(itemId, { categoryId }, userId)
  }
  // ... المزيد من wrappers
}

// ✅ الحل: حذف الملف واستخدام Services مباشرة في handler
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'

// في handler:
const item = await InventoryItemsService.getItemById('oils-greases', itemId)
await OilsGreasesItemsService.updateItem(itemId, { categoryId }, userId)
```

#### 2. `items/search-item/search-item.service.ts`
```typescript
// ❌ حذف
export class SearchItemService {
  static async searchByBarcode(barcode: string) {
    return InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
  }
}

// ✅ استخدام مباشر
const item = await InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
```

#### 3. `items/view-item/view-item.service.ts`
```typescript
// ❌ حذف (سطر واحد فقط!)
export class ViewItemService {
  static async getItemWithDetails(id: number) {
    return OilsGreasesItemsService.getItemWithDetails(id)
  }
}

// ✅ استخدام مباشر
const item = await OilsGreasesItemsService.getItemWithDetails(id)
```

#### 4-7. Reports Services (4 ملفات)
```typescript
// ❌ حذف جميع الـ reports services
// alerts.service.ts
// export.service.ts
// summary.service.ts
// value.service.ts

// ✅ استخدام ReportsService مباشرة
import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

const lowStock = await ReportsService.getLowStockItems('oils-greases', threshold)
const summary = await ReportsService.getInventorySummary('oils-greases')
```

#### 8-9. Settings Services (2 ملفات)
```typescript
// ❌ حذف
// categories.service.ts
// locations.service.ts

// ✅ استخدام مباشر
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'

const categories = await CategoryService.getCategories('oils-greases')
const locations = await StorageLocationsService.getLocations()
```

### خطوات التنفيذ

1. **حذف الملفات:**
```bash
rm handlers/oils-greases/items/edit-item/edit-item.service.ts
rm handlers/oils-greases/items/search-item/search-item.service.ts
rm handlers/oils-greases/items/view-item/view-item.service.ts
rm handlers/oils-greases/reports/alerts/alerts.service.ts
rm handlers/oils-greases/reports/export/export.service.ts
rm handlers/oils-greases/reports/summary/summary.service.ts
rm handlers/oils-greases/reports/value/value.service.ts
rm handlers/oils-greases/settings/categories/categories.service.ts
rm handlers/oils-greases/settings/locations/locations.service.ts
```

2. **تحديث Imports في Handlers:**
   - استبدال `import { EditItemService }` بـ `import { InventoryItemsService, OilsGreasesItemsService }`
   - استبدال جميع استدعاءات `EditItemService.method()` بـ `InventoryItemsService.method()`

3. **الاختبار:**
   - اختبار كل handler بعد التعديل
   - التأكد من عمل جميع الوظائف

**التوفير:** 200 سطر كود

---

## 🎯 التحسين 2: استخدام Callback Parser Util

### المشكلة
كل handler يحتوي على نفس الكود لتحليل callback data:

```typescript
// ❌ مكرر في 16+ handler
await ctx.answerCallbackQuery()
const itemId = Number.parseInt(ctx.match![1], 10)
const page = Number.parseInt(ctx.match![2], 10)
const categoryId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined
```

### الحل

#### استخدام `callback-parser.util.ts`:

```typescript
// ✅ في أي handler
import { parseItemCallback, parsePageCallback } from '../../utils/callback-parser.util.js'

// بدلاً من 4 أسطر:
const { itemId, page, categoryId } = parseItemCallback(ctx.match!)

// أو للصفحات فقط:
const { page, categoryId } = parsePageCallback(ctx.match!)
```

### الملفات المتأثرة (16 handler)

**Items:**
- edit-item.handler.ts
- list-items.handler.ts
- search-item.handler.ts
- view-item.handler.ts

**Transactions:**
- purchase.handler.ts
- issue.handler.ts
- transfer.handler.ts
- return.handler.ts
- adjust.handler.ts
- list.handler.ts

**Reports:**
- alerts.handler.ts
- export.handler.ts
- summary.handler.ts
- value.handler.ts

**Settings:**
- categories.handler.ts
- locations.handler.ts

### مثال التطبيق

#### قبل:
```typescript
editItemHandler.callbackQuery(/^og:items:edit:category:select:(\d+):(\d+):(\d+)(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  const itemId = Number.parseInt(ctx.match![2], 10)
  const page = Number.parseInt(ctx.match![3], 10)
  const filterCatId = ctx.match![4] ? Number.parseInt(ctx.match![4], 10) : undefined
  
  // منطق العمل...
})
```

#### بعد:
```typescript
import { parseItemCallback } from '../../utils/callback-parser.util.js'

editItemHandler.callbackQuery(/^og:items:edit:category:select:(\d+):(\d+):(\d+)(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const { itemId: categoryId, page, categoryId: filterCatId } = parseItemCallback(ctx.match!)
  
  // منطق العمل...
})
```

**التوفير:** 100 سطر كود

---

## 🎯 التحسين 3: استخدام Message Builder Util

### المشكلة
رسائل النجاح/الفشل مكررة في كل handler:

```typescript
// ❌ مكرر
await ctx.answerCallbackQuery({ text: '✅ تم التحديث بنجاح' })
await ctx.editMessageText('✅ تم التحديث بنجاح\n\nاضغط على الزر للعودة:', {
  reply_markup: { ... }
})
```

### الحل

#### استخدام `message-builder.util.ts`:

```typescript
// ✅ في أي handler
import { buildSuccessMessage, buildErrorMessage, buildConfirmMessage } from '../../utils/message-builder.util.js'

// رسالة نجاح
await ctx.editMessageText(buildSuccessMessage('تحديث الفئة'))

// رسالة خطأ
await ctx.editMessageText(buildErrorMessage('تحديث الفئة'))

// رسالة تأكيد
await ctx.editMessageText(buildConfirmMessage('حذف الصنف', 'هل أنت متأكد؟'))
```

### الوظائف المتاحة

```typescript
// 1. رسائل النجاح
buildSuccessMessage(operation: string): string
// "✅ تمت عملية [operation] بنجاح"

// 2. رسائل الفشل
buildErrorMessage(operation: string, details?: string): string
// "❌ فشلت عملية [operation]\n\n[details]"

// 3. رسائل التأكيد
buildConfirmMessage(action: string, details?: string): string
// "⚠️ تأكيد [action]\n\n[details]"

// 4. تفاصيل الصنف
buildItemDetailsMessage(item: any): string
// عرض كامل لتفاصيل الصنف

// 5. رأس القائمة
buildListHeaderMessage(total: number, page: number, totalPages: number, filter?: string): string
// "📦 إجمالي الأصناف: [total]\n📄 الصفحة: [page] من [totalPages]"
```

### مثال التطبيق

#### قبل:
```typescript
try {
  await EditItemService.updateCategory(itemId, categoryId, userId)
  await ctx.answerCallbackQuery({ text: '✅ تم تحديث الفئة بنجاح' })
  await ctx.editMessageText('✅ تم تحديث الفئة بنجاح\n\nاضغط على الزر للعودة:', {
    reply_markup: { ... }
  })
} catch (error) {
  console.error('Error:', error)
  await ctx.editMessageText('❌ حدث خطأ أثناء تحديث الفئة\n\nالرجاء المحاولة مرة أخرى.')
}
```

#### بعد:
```typescript
import { buildSuccessMessage, buildErrorMessage } from '../../utils/message-builder.util.js'

try {
  await OilsGreasesItemsService.updateItem(itemId, { categoryId }, userId)
  await ctx.answerCallbackQuery({ text: '✅ تم التحديث' })
  await ctx.editMessageText(buildSuccessMessage('تحديث الفئة'), {
    reply_markup: { ... }
  })
} catch (error) {
  await ctx.editMessageText(buildErrorMessage('تحديث الفئة'))
}
```

**التوفير:** 100 سطر كود

---

## 🎯 التحسين 4: استخدام Keyboard Builder Util

### المشكلة
بناء keyboards يدوياً في كل handler:

```typescript
// ❌ مكرر
reply_markup: {
  inline_keyboard: [
    [
      { text: '📦 عرض الصنف', callback_data: `og:items:view:${itemId}` },
      { text: '✏️ تعديل', callback_data: `og:items:edit:${itemId}` }
    ],
    [
      { text: '⬅️ رجوع', callback_data: 'og:items:list' }
    ]
  ]
}
```

### الحل

#### استخدام `keyboard-builder.util.ts`:

```typescript
// ✅ في أي handler
import { buildActionButtons, buildConfirmKeyboard, buildBackButton } from '../../utils/keyboard-builder.util.js'

// أزرار إجراءات
const keyboard = buildActionButtons([
  { text: '📦 عرض الصنف', callback: `og:items:view:${itemId}` },
  { text: '✏️ تعديل', callback: `og:items:edit:${itemId}` }
], 'og:items:list')

// أزرار تأكيد
const keyboard = buildConfirmKeyboard(
  `og:items:delete:confirm:${itemId}`,
  'og:items:list'
)

// زر رجوع فقط
const keyboard = buildBackButton('og:items:list')
```

### الوظائف المتاحة

```typescript
// 1. أزرار الإجراءات
buildActionButtons(
  actions: Array<{ text: string; callback: string }>,
  backCallback?: string,
  itemsPerRow?: number
): InlineKeyboard

// 2. أزرار التأكيد
buildConfirmKeyboard(
  confirmCallback: string,
  cancelCallback: string,
  confirmText?: string,
  cancelText?: string
): InlineKeyboard

// 3. زر الرجوع
buildBackButton(callback: string, text?: string): InlineKeyboard

// 4. قائمة الأصناف
buildItemsKeyboard(
  items: any[],
  callbackPrefix: string,
  options?: {
    itemsPerRow?: number
    showWarning?: boolean
    pageParam?: string
  }
): InlineKeyboard
```

### مثال التطبيق

#### قبل:
```typescript
await ctx.editMessageText('✅ تم التحديث بنجاح', {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '📦 عرض الصنف', callback_data: `og:items:view:${itemId}:page:${page}` }
      ],
      [
        { text: '⬅️ رجوع', callback_data: 'og:items:list' }
      ]
    ]
  }
})
```

#### بعد:
```typescript
import { buildActionButtons } from '../../utils/keyboard-builder.util.js'

await ctx.editMessageText('✅ تم التحديث بنجاح', {
  reply_markup: buildActionButtons([
    { text: '📦 عرض الصنف', callback: `og:items:view:${itemId}:page:${page}` }
  ], 'og:items:list')
})
```

**التوفير:** 100 سطر كود

---

## 🎯 التحسين 5: استخدام Session Manager Util

### المشكلة
إدارة session يدوية في conversations:

```typescript
// ❌ مكرر في كل conversation
ctx.session.inventoryForm = {
  action: 'edit',
  warehouse: 'oils-greases',
  step: 'select_field',
  data: { itemId, page }
}

// تحديث
ctx.session.inventoryForm.step = 'enter_value'
ctx.session.inventoryForm.data.field = 'name'

// حذف
delete ctx.session.inventoryForm
```

### الحل

#### استخدام `session-manager.util.ts`:

```typescript
// ✅ في conversations
import { 
  initInventorySession, 
  updateSessionStep, 
  updateSessionData,
  clearInventorySession,
  getSessionData
} from '../../utils/session-manager.util.js'

// إنشاء session
initInventorySession(ctx, 'edit', 'oils-greases', 'select_field', { itemId, page })

// تحديث الخطوة
updateSessionStep(ctx, 'enter_value')

// تحديث البيانات
updateSessionData(ctx, { field: 'name' })

// الحصول على البيانات
const data = getSessionData(ctx)

// حذف session
clearInventorySession(ctx)
```

### الوظائف المتاحة

```typescript
// 1. إنشاء session
initInventorySession(
  ctx: Context,
  action: string,
  warehouse: string,
  step: string,
  data?: any
): void

// 2. تحديث الخطوة
updateSessionStep(ctx: Context, step: string, data?: any): void

// 3. تحديث البيانات
updateSessionData(ctx: Context, data: any): void

// 4. الحصول على البيانات
getSessionData<T>(ctx: Context): T | null

// 5. حذف session
clearInventorySession(ctx: Context): void

// 6. التحقق من وجود session
hasInventorySession(ctx: Context): boolean
```

### الملفات المتأثرة
- add-item.conversation.ts
- edit-item.conversation.ts

**التوفير:** 50 سطر كود

---

## 🎯 التحسين 6: استخدام Input Validator Util

### المشكلة
Validation يدوي في conversations:

```typescript
// ❌ مكرر
const quantity = Number.parseFloat(text)
if (isNaN(quantity) || quantity <= 0) {
  await ctx.reply('❌ الكمية يجب أن تكون أكبر من صفر')
  return
}

const price = Number.parseFloat(text)
if (isNaN(price) || price < 0) {
  await ctx.reply('❌ السعر غير صحيح')
  return
}
```

### الحل

#### استخدام `input-validator.util.ts`:

```typescript
// ✅ في conversations
import { validateQuantity, validatePrice, validateText } from '../../utils/input-validator.util.js'

// التحقق من الكمية
const qtyResult = validateQuantity(text)
if (!qtyResult.valid) {
  await ctx.reply(`❌ ${qtyResult.error}`)
  return
}
const quantity = qtyResult.value!

// التحقق من السعر
const priceResult = validatePrice(text)
if (!priceResult.valid) {
  await ctx.reply(`❌ ${priceResult.error}`)
  return
}
const price = priceResult.value!

// التحقق من النص
if (!validateText(text, { minLength: 3, maxLength: 100 })) {
  await ctx.reply('❌ النص يجب أن يكون بين 3 و 100 حرف')
  return
}
```

### الوظائف المتاحة

```typescript
// 1. التحقق من الكمية
validateQuantity(text: string, options?: { min?: number; max?: number }): {
  valid: boolean
  value?: number
  error?: string
}

// 2. التحقق من السعر
validatePrice(text: string, options?: { min?: number; max?: number }): {
  valid: boolean
  value?: number
  error?: string
}

// 3. التحقق من النص
validateText(text: string, options?: { minLength?: number; maxLength?: number }): boolean

// 4. التحقق من الرقم الموجب
validatePositiveNumber(text: string): boolean

// 5. التحقق من الباركود
validateBarcode(barcode: string): boolean

// 6. التحقق من الكود
validateCode(code: string, pattern?: RegExp): boolean
```

### الملفات المتأثرة
- add-item.conversation.ts
- edit-item.conversation.ts

**التوفير:** 80 سطر كود

---

## 🎯 التحسين 7: استخدام Arabic Formatter Util

### المشكلة
تنسيق الأرقام يدوياً:

```typescript
// ❌ مكرر
const price = `${item.unitPrice.toFixed(2)} جنيه`
const quantity = item.quantity.toString()
const date = new Date().toLocaleDateString('ar-EG')
```

### الحل

#### استخدام `arabic-formatter.util.ts`:

```typescript
// ✅ في handlers
import { 
  formatArabicCurrency, 
  toArabicNumerals, 
  formatArabicDate 
} from '../../utils/arabic-formatter.util.js'

const price = formatArabicCurrency(item.unitPrice)
// "١٬٠٠٠٫٥٠ جنيه"

const quantity = toArabicNumerals(item.quantity)
// "٥٠"

const date = formatArabicDate(new Date())
// "١٧ يناير ٢٠٢٥"
```

### الوظائف المتاحة

```typescript
// 1. تنسيق العملة
formatArabicCurrency(amount: number): string

// 2. تحويل للأرقام العربية
toArabicNumerals(num: number): string

// 3. تنسيق التاريخ
formatArabicDate(date: Date): string

// 4. تنسيق التاريخ والوقت
formatArabicDateTime(date: Date): string

// 5. تنسيق الوقت
formatArabicTime(date: Date): string

// 6. تنسيق الرقم مع فواصل
formatArabicNumber(num: number, decimals?: number): string
```

### الملفات المتأثرة
جميع الـ handlers التي تعرض:
- أسعار
- كميات
- تواريخ
- أرقام

**التوفير:** 100 سطر كود

---

## 🎯 التحسين 8: استخدام Error Handler Util

### المشكلة
معالجة أخطاء مكررة:

```typescript
// ❌ مكرر في كل handler
try {
  await someOperation()
  await ctx.editMessageText('✅ نجحت العملية')
} catch (error) {
  console.error('Error in operation:', error)
  await ctx.editMessageText('❌ حدث خطأ\n\nالرجاء المحاولة مرة أخرى.')
}
```

### الحل

#### استخدام `error-handler.util.ts`:

```typescript
// ✅ في handlers
import { handleError, showErrorWithRetry } from '../../utils/error-handler.util.js'

try {
  await someOperation()
  await ctx.editMessageText('✅ نجحت العملية')
} catch (error) {
  await handleError(ctx, error, 'تحديث الصنف')
}

// أو مع زر إعادة المحاولة
try {
  await someOperation()
} catch (error) {
  await showErrorWithRetry(ctx, 'فشل التحديث', 'og:items:edit:retry')
}
```

### الوظائف المتاحة

```typescript
// 1. معالجة الخطأ
handleError(ctx: Context, error: any, operation: string): Promise<void>

// 2. عرض خطأ مع إعادة المحاولة
showErrorWithRetry(
  ctx: Context,
  error: string,
  retryCallback: string
): Promise<void>

// 3. الحصول على رسالة الخطأ
getErrorMessage(error: any): string

// 4. تسجيل الخطأ
logError(error: any, context: string): void
```

### الملفات المتأثرة
جميع الـ 16 handler

**التوفير:** 150 سطر كود

---

## 📊 ملخص التحسينات

| # | التحسين | الملفات | التوفير | الأولوية |
|---|---------|---------|---------|----------|
| 1 | حذف Wrapper Services | 10 | 200 سطر | 🔴 عالية |
| 2 | Callback Parser | 16 | 100 سطر | 🔴 عالية |
| 3 | Message Builder | 16 | 100 سطر | 🔴 عالية |
| 4 | Keyboard Builder | 16 | 100 سطر | 🟡 متوسطة |
| 5 | Session Manager | 2 | 50 سطر | 🟡 متوسطة |
| 6 | Input Validator | 2 | 80 سطر | 🟡 متوسطة |
| 7 | Arabic Formatter | 16 | 100 سطر | 🟢 منخفضة |
| 8 | Error Handler | 16 | 150 سطر | 🟢 منخفضة |

**الإجمالي:** 880 سطر كود

---

## ✅ خطة التنفيذ

### المرحلة 1: التحسينات الأساسية (1 ساعة)
1. حذف 10 wrapper services
2. تطبيق Callback Parser
3. تطبيق Message Builder
4. الاختبار

**التوفير:** 400 سطر

### المرحلة 2: التحسينات المتوسطة (1 ساعة)
5. تطبيق Keyboard Builder
6. تطبيق Session Manager
7. تطبيق Input Validator
8. الاختبار

**التوفير:** 230 سطر

### المرحلة 3: التحسينات النهائية (30 دقيقة)
9. تطبيق Arabic Formatter
10. تطبيق Error Handler
11. الاختبار الشامل

**التوفير:** 250 سطر

---

## 📈 النتيجة المتوقعة

### قبل التحسين:
- عدد الملفات: 36
- سطور الكود: ~2,200
- التكرار: 40%

### بعد التحسين:
- عدد الملفات: 26 (-28%)
- سطور الكود: ~1,320 (-40%)
- التكرار: 5% (-87%)

---

## 🎯 معايير النجاح

✅ جميع الـ handlers تعمل بشكل صحيح  
✅ لا توجد أخطاء TypeScript  
✅ جميع الاختبارات تمر بنجاح  
✅ الكود أكثر قابلية للقراءة  
✅ التكرار أقل من 10%  

---

**آخر تحديث:** 2025-01-17  
**الحالة:** جاهز للتنفيذ
