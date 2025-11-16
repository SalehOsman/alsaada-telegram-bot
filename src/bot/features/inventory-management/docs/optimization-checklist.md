# قائمة التحقق - تحسينات مخزن الزيوت والشحوم

## 📋 التقدم العام

- [ ] المرحلة 1: التحسينات الأساسية (0/3)
- [ ] المرحلة 2: التحسينات المتوسطة (0/3)
- [ ] المرحلة 3: التحسينات النهائية (0/2)

**التقدم الإجمالي:** 0/8 (0%)

---

## 🔴 المرحلة 1: التحسينات الأساسية

### ✅ التحسين 1: حذف Wrapper Services

#### Items Services (3 ملفات)
- [ ] حذف `items/edit-item/edit-item.service.ts`
  - [ ] تحديث imports في `edit-item.handler.ts`
  - [ ] استبدال `EditItemService` بـ `InventoryItemsService` و `OilsGreasesItemsService`
  - [ ] اختبار edit-item

- [ ] حذف `items/search-item/search-item.service.ts`
  - [ ] تحديث imports في `search-item.handler.ts`
  - [ ] استبدال `SearchItemService` بـ `InventoryItemsService`
  - [ ] اختبار search-item

- [ ] حذف `items/view-item/view-item.service.ts`
  - [ ] تحديث imports في `view-item.handler.ts`
  - [ ] استبدال `ViewItemService` بـ `OilsGreasesItemsService`
  - [ ] اختبار view-item

#### Reports Services (4 ملفات)
- [ ] حذف `reports/alerts/alerts.service.ts`
  - [ ] تحديث imports في `alerts.handler.ts`
  - [ ] استبدال `AlertsService` بـ `ReportsService`
  - [ ] اختبار alerts

- [ ] حذف `reports/export/export.service.ts`
  - [ ] تحديث imports في `export.handler.ts`
  - [ ] استبدال `ExportService` بـ `ExcelExportService`
  - [ ] اختبار export

- [ ] حذف `reports/summary/summary.service.ts`
  - [ ] تحديث imports في `summary.handler.ts`
  - [ ] استبدال `SummaryService` بـ `ReportsService`
  - [ ] اختبار summary

- [ ] حذف `reports/value/value.service.ts`
  - [ ] تحديث imports في `value.handler.ts`
  - [ ] استبدال `ValueService` بـ `ReportsService`
  - [ ] اختبار value

#### Settings Services (2 ملفات)
- [ ] حذف `settings/categories/categories.service.ts`
  - [ ] تحديث imports في `categories.handler.ts`
  - [ ] استبدال `CategoriesService` بـ `CategoryService`
  - [ ] اختبار categories

- [ ] حذف `settings/locations/locations.service.ts`
  - [ ] تحديث imports في `locations.handler.ts`
  - [ ] استبدال `LocationsService` بـ `StorageLocationsService`
  - [ ] اختبار locations

**التوفير:** 200 سطر

---

### ✅ التحسين 2: استخدام Callback Parser

#### Items Handlers (4 ملفات)
- [ ] `items/edit-item/edit-item.handler.ts`
  - [ ] إضافة import `parseItemCallback`
  - [ ] استبدال parsing يدوي (3 مواضع)
  - [ ] اختبار

- [ ] `items/list-items/list-items.handler.ts`
  - [ ] إضافة import `parsePageCallback`
  - [ ] استبدال parsing يدوي (2 مواضع)
  - [ ] اختبار

- [ ] `items/search-item/search-item.handler.ts`
  - [ ] إضافة import `parseItemCallback`
  - [ ] استبدال parsing يدوي (2 مواضع)
  - [ ] اختبار

- [ ] `items/view-item/view-item.handler.ts`
  - [ ] إضافة import `parseItemCallback`
  - [ ] استبدال parsing يدوي (1 موضع)
  - [ ] اختبار

#### Transactions Handlers (6 ملفات)
- [ ] `transactions/purchase/purchase.handler.ts`
- [ ] `transactions/issue/issue.handler.ts`
- [ ] `transactions/transfer/transfer.handler.ts`
- [ ] `transactions/return/return.handler.ts`
- [ ] `transactions/adjust/adjust.handler.ts`
- [ ] `transactions/list/list.handler.ts`

#### Reports Handlers (4 ملفات)
- [ ] `reports/alerts/alerts.handler.ts`
- [ ] `reports/export/export.handler.ts`
- [ ] `reports/summary/summary.handler.ts`
- [ ] `reports/value/value.handler.ts`

#### Settings Handlers (2 ملفات)
- [ ] `settings/categories/categories.handler.ts`
- [ ] `settings/locations/locations.handler.ts`

**التوفير:** 100 سطر

---

### ✅ التحسين 3: استخدام Message Builder

#### Items Handlers (4 ملفات)
- [ ] `items/edit-item/edit-item.handler.ts`
  - [ ] إضافة import `buildSuccessMessage`, `buildErrorMessage`
  - [ ] استبدال رسائل النجاح (3 مواضع)
  - [ ] استبدال رسائل الفشل (2 مواضع)
  - [ ] اختبار

- [ ] `items/list-items/list-items.handler.ts`
  - [ ] إضافة import `buildListHeaderMessage`
  - [ ] استبدال رأس القائمة (1 موضع)
  - [ ] اختبار

- [ ] `items/search-item/search-item.handler.ts`
  - [ ] إضافة import `buildSuccessMessage`
  - [ ] استبدال رسائل (2 مواضع)
  - [ ] اختبار

- [ ] `items/view-item/view-item.handler.ts`
  - [ ] إضافة import `buildItemDetailsMessage`
  - [ ] استبدال عرض التفاصيل (1 موضع)
  - [ ] اختبار

#### Transactions Handlers (6 ملفات)
- [ ] `transactions/purchase/purchase.handler.ts`
- [ ] `transactions/issue/issue.handler.ts`
- [ ] `transactions/transfer/transfer.handler.ts`
- [ ] `transactions/return/return.handler.ts`
- [ ] `transactions/adjust/adjust.handler.ts`
- [ ] `transactions/list/list.handler.ts`

#### Reports Handlers (4 ملفات)
- [ ] `reports/alerts/alerts.handler.ts`
- [ ] `reports/export/export.handler.ts`
- [ ] `reports/summary/summary.handler.ts`
- [ ] `reports/value/value.handler.ts`

#### Settings Handlers (2 ملفات)
- [ ] `settings/categories/categories.handler.ts`
- [ ] `settings/locations/locations.handler.ts`

**التوفير:** 100 سطر

---

## 🟡 المرحلة 2: التحسينات المتوسطة

### ✅ التحسين 4: استخدام Keyboard Builder

#### Items Handlers (4 ملفات)
- [ ] `items/edit-item/edit-item.handler.ts`
  - [ ] إضافة import `buildActionButtons`, `buildBackButton`
  - [ ] استبدال keyboards (3 مواضع)
  - [ ] اختبار

- [ ] `items/list-items/list-items.handler.ts`
  - [ ] إضافة import `buildItemsKeyboard`
  - [ ] استبدال keyboard الأصناف (1 موضع)
  - [ ] اختبار

- [ ] `items/search-item/search-item.handler.ts`
  - [ ] إضافة import `buildActionButtons`
  - [ ] استبدال keyboards (2 مواضع)
  - [ ] اختبار

- [ ] `items/view-item/view-item.handler.ts`
  - [ ] إضافة import `buildActionButtons`
  - [ ] استبدال keyboard (1 موضع)
  - [ ] اختبار

#### Transactions Handlers (6 ملفات)
- [ ] `transactions/purchase/purchase.handler.ts`
- [ ] `transactions/issue/issue.handler.ts`
- [ ] `transactions/transfer/transfer.handler.ts`
- [ ] `transactions/return/return.handler.ts`
- [ ] `transactions/adjust/adjust.handler.ts`
- [ ] `transactions/list/list.handler.ts`

#### Reports Handlers (4 ملفات)
- [ ] `reports/alerts/alerts.handler.ts`
- [ ] `reports/export/export.handler.ts`
- [ ] `reports/summary/summary.handler.ts`
- [ ] `reports/value/value.handler.ts`

#### Settings Handlers (2 ملفات)
- [ ] `settings/categories/categories.handler.ts`
- [ ] `settings/locations/locations.handler.ts`

**التوفير:** 100 سطر

---

### ✅ التحسين 5: استخدام Session Manager

#### Conversations (2 ملفات)
- [ ] `items/add-item/add-item.conversation.ts`
  - [ ] إضافة import session utils
  - [ ] استبدال `ctx.session.inventoryForm` (5 مواضع)
  - [ ] استبدال تحديثات session (3 مواضع)
  - [ ] استبدال حذف session (1 موضع)
  - [ ] اختبار

- [ ] `items/edit-item/edit-item.conversation.ts`
  - [ ] إضافة import session utils
  - [ ] استبدال `ctx.session.inventoryForm` (4 مواضع)
  - [ ] استبدال تحديثات session (2 مواضع)
  - [ ] استبدال حذف session (1 موضع)
  - [ ] اختبار

**التوفير:** 50 سطر

---

### ✅ التحسين 6: استخدام Input Validator

#### Conversations (2 ملفات)
- [ ] `items/add-item/add-item.conversation.ts`
  - [ ] إضافة import validator utils
  - [ ] استبدال validation الكمية (1 موضع)
  - [ ] استبدال validation السعر (1 موضع)
  - [ ] استبدال validation النص (3 مواضع)
  - [ ] اختبار

- [ ] `items/edit-item/edit-item.conversation.ts`
  - [ ] إضافة import validator utils
  - [ ] استبدال validation الكمية (1 موضع)
  - [ ] استبدال validation السعر (1 موضع)
  - [ ] استبدال validation النص (2 مواضع)
  - [ ] اختبار

**التوفير:** 80 سطر

---

## 🟢 المرحلة 3: التحسينات النهائية

### ✅ التحسين 7: استخدام Arabic Formatter

#### جميع Handlers (16 ملف)
- [ ] إضافة imports للـ formatter utils
- [ ] استبدال `toFixed(2)` بـ `formatArabicCurrency()`
- [ ] استبدال `toString()` بـ `toArabicNumerals()`
- [ ] استبدال `toLocaleDateString()` بـ `formatArabicDate()`
- [ ] اختبار جميع الـ handlers

**الملفات:**
- [ ] Items (4)
- [ ] Transactions (6)
- [ ] Reports (4)
- [ ] Settings (2)

**التوفير:** 100 سطر

---

### ✅ التحسين 8: استخدام Error Handler

#### جميع Handlers (16 ملف)
- [ ] إضافة import `handleError`, `showErrorWithRetry`
- [ ] استبدال try-catch blocks
- [ ] إزالة `console.error` اليدوي
- [ ] اختبار معالجة الأخطاء

**الملفات:**
- [ ] Items (4)
- [ ] Transactions (6)
- [ ] Reports (4)
- [ ] Settings (2)

**التوفير:** 150 سطر

---

## 📊 ملخص التقدم

### حسب النوع:
- [ ] Wrapper Services: 0/10 (0%)
- [ ] Callback Parser: 0/16 (0%)
- [ ] Message Builder: 0/16 (0%)
- [ ] Keyboard Builder: 0/16 (0%)
- [ ] Session Manager: 0/2 (0%)
- [ ] Input Validator: 0/2 (0%)
- [ ] Arabic Formatter: 0/16 (0%)
- [ ] Error Handler: 0/16 (0%)

### حسب القسم:
- [ ] Items: 0/4 handlers
- [ ] Transactions: 0/6 handlers
- [ ] Reports: 0/4 handlers
- [ ] Settings: 0/2 handlers
- [ ] Conversations: 0/2 files

---

## ✅ الاختبار النهائي

### قبل النشر:
- [ ] جميع الـ handlers تعمل
- [ ] لا توجد أخطاء TypeScript
- [ ] لا توجد أخطاء في Console
- [ ] جميع الوظائف تعمل كما هو متوقع
- [ ] الرسائل بالعربية صحيحة
- [ ] الأرقام بالعربية صحيحة
- [ ] التواريخ بالعربية صحيحة

### الأداء:
- [ ] سرعة الاستجابة < 2 ثانية
- [ ] لا توجد memory leaks
- [ ] Session management يعمل بشكل صحيح

---

## 📈 النتائج

### قبل التحسين:
- عدد الملفات: 36
- سطور الكود: ~2,200
- التكرار: 40%

### بعد التحسين:
- عدد الملفات: ___
- سطور الكود: ___
- التكرار: ___%

### التوفير الفعلي:
- الملفات: ___ (-__%)
- الأسطر: ___ (-__%)
- التكرار: ___ (-__%)

---

**تاريخ البدء:** ___________  
**تاريخ الانتهاء:** ___________  
**المدة الإجمالية:** ___________
