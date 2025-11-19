# 🛠️ Bot Utils - Global Utilities

وحدات مساعدة عامة يمكن استخدامها في جميع features البوت

---

## 📁 الهيكل

```
src/bot/utils/
├── validation/          # أدوات التحقق من المدخلات
├── formatting/          # أدوات التنسيق (أرقام، عملة، تاريخ)
├── ui/                  # أدوات واجهة المستخدم (keyboards, messages)
├── core/                # أدوات أساسية (errors, notifications, callbacks)
└── data/                # أدوات البيانات (pagination, cache)
```

---

## ✅ Utils المتاحة

### 1. Validation (`validation/`)
- `input-validator.util.ts` - التحقق من جميع أنواع المدخلات
- `validators.util.ts` - validators متقدمة

### 2. Formatting (`formatting/`)
- `arabic-formatter.util.ts` - تنسيق النصوص والأرقام بالعربية
- `formatters.util.ts` - formatters متقدمة
- `detail-formatter.util.ts` - تنسيق تفاصيل الأصناف
- `transaction-summary.util.ts` - تنسيق ملخصات المعاملات

### 3. UI (`ui/`)
- `keyboard-builder.util.ts` - بناء لوحات المفاتيح
- `message-builder.util.ts` - بناء الرسائل العامة
- `confirmation-dialog.util.ts` - حوارات التأكيد
- `loading-indicator.util.ts` - مؤشرات التحميل
- `message-tracker.util.ts` - تتبع وحذف الرسائل المؤقتة
- **🆕 `conversation-step.util.ts`** - توحيد patterns المحادثات متعددة الخطوات
- `category-selector.util.ts` - اختيار التصنيفات
- `unit-selector.util.ts` - اختيار الوحدات
- `selection-lists.util.ts` - قوائم الاختيار
- `skip-handler.util.ts` - معالجة التخطي
- `step-flow.util.ts` - إدارة تدفق الخطوات
- `filter-builder.util.ts` - بناء الفلاتر

### 4. Core (`core/`)
- `error-handler.util.ts` - معالجة الأخطاء
- `notification-helper.util.ts` - الإشعارات
- `callback-parser.util.ts` - تحليل callback data
- `session-manager.util.ts` - إدارة الـ session
- `photo-handler.util.ts` - معالجة الصور

### 5. Data (`data/`)
- `pagination.util.ts` - التصفح بين الصفحات
- `cache-helper.util.ts` - التخزين المؤقت
- **🆕 `barcode-generator.util.ts`** - توليد barcodes موحدة لجميع المخازن
- **🆕 `duplicate-checker.util.ts`** - فحص التكرارات وعرض التحذيرات
- `barcode-handler.util.ts` - معالجة ومسح الـ barcodes
- `code-generator.util.ts` - توليد أكواد الأصناف
- `search-helper.util.ts` - البحث المتقدم

### 6. Media (`media/`)
- `excel-helper.util.ts` - إنشاء ملفات Excel

---

## 📝 الاستخدام

```typescript
// Validation
import { validateText, validateNumber } from '#root/bot/utils/validation/input-validator.util.js'

// Formatting
import { formatArabicCurrency, toArabicNumerals } from '#root/bot/utils/formatting/arabic-formatter.util.js'

// UI
import { buildActionButtons, buildConfirmKeyboard } from '#root/bot/utils/ui/keyboard-builder.util.js'
import { buildSuccessMessage, buildErrorMessage } from '#root/bot/utils/ui/message-builder.util.js'

// Core
import { handleError, showSimpleError } from '#root/bot/utils/core/error-handler.util.js'
import { notifyAdmins } from '#root/bot/utils/core/notification-helper.util.js'

// Data
import { buildPaginationButtons, calculatePagination } from '#root/bot/utils/data/pagination.util.js'
import { SimpleCache } from '#root/bot/utils/data/cache-helper.util.js'
```

---

## 🎯 مبادئ التطوير

### ✅ يجب وضعها في `src/bot/utils/`:
- دوال عامة تستخدم في أكثر من feature
- لا تحتوي على logic خاص بـ feature معين
- قابلة لإعادة الاستخدام في أي مكان

### ❌ يجب أن تبقى في `features/[name]/utils/`:
- دوال خاصة بـ feature معين
- تحتوي على logic أو business rules خاصة
- مرتبطة بنماذج بيانات محددة

---

## 📚 المزيد

- [UTILS-ANALYSIS.md](../features/inventory-management/docs/testing/UTILS-ANALYSIS.md) - تحليل شامل
- [REFACTORING-COMPLETE.md](../features/inventory-management/docs/testing/REFACTORING-COMPLETE.md) - توثيق إعادة الهيكلة
- **🆕 [NEW-UTILS-IMPLEMENTATION.md](../features/inventory-management/docs/testing/NEW-UTILS-IMPLEMENTATION.md)** - تطبيق Utils الجديدة (v3.0)

