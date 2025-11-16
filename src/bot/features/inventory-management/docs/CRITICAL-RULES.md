# ⚠️ القواعد الإلزامية - يجب قراءتها قبل كتابة أي كود

> **هذه قواعد إلزامية - لا استثناءات**

---

## 🚨 القاعدة 1: الفصل التام

### ❌ ممنوع
```
ملف واحد كبير (4000+ سطر)
```

### ✅ إلزامي
```
كل وظيفة في مجلد منفصل
handler.ts (< 200 سطر)
service.ts (< 300 سطر)
```

---

## 🚨 القاعدة 2: Utils أولاً

### ❌ ممنوع
```typescript
// تكرار الكود
const arabicNum = num.toString()...
```

### ✅ إلزامي
```typescript
import { toArabicNumerals } from '../../utils/arabic-formatter.util.js'
const arabicNum = toArabicNumerals(num)
```

**القاعدة**: إذا استخدمت الكود في مكانين → أنشئ util

---

## 🚨 القاعدة 3: Shared Services

### ❌ ممنوع
```typescript
// نفس المنطق في كل مخزن
async function getItems() { ... }
```

### ✅ إلزامي
```typescript
import { InventoryItemsService } from 'shared/inventory-items.service.js'
const items = await InventoryItemsService.getItems('oils-greases', page)
```

**القاعدة**: منطق مشترك بين مخزنين → Shared Service

---

## 🚨 القاعدة 4: Handler = UI فقط

### ❌ ممنوع
```typescript
handler.callbackQuery('action', async (ctx) => {
  // منطق أعمال ❌
  const data = await Database.prisma...
  // حسابات ❌
})
```

### ✅ إلزامي
```typescript
handler.callbackQuery('action', async (ctx) => {
  await Service.doSomething()  // ✅
  await ctx.reply('✅ تم')
})
```

---

## 🚨 القاعدة 5: حجم الملفات

```
Handler:  < 200 سطر
Service:  < 300 سطر
Util:     < 150 سطر
```

**إذا تجاوزت**: قسّم الملف

---

## 🚨 القاعدة 6: معالجة الأخطاء

### ✅ إلزامي
```typescript
import { handleError } from '../../utils/error-handler.util.js'

try {
  await operation()
} catch (error) {
  await handleError(ctx, error, 'operationName')
}
```

---

## 🚨 القاعدة 7: Validation

### ✅ إلزامي
```typescript
import { validateQuantity } from '../../utils/input-validator.util.js'

const result = validateQuantity(text, { min: 1, max: 10000 })
if (!result.valid) {
  await ctx.reply(`❌ ${result.error}`)
  return
}
```

---

## 🚨 القاعدة 8: Session Management

### ✅ إلزامي
```typescript
import { 
  initInventorySession,
  getSessionData,
  clearInventorySession 
} from '../../utils/session-manager.util.js'
```

---

## 🚨 القاعدة 9: التسمية

```typescript
// Files
purchase-item.handler.ts  // kebab-case

// Classes
class PurchaseService {}  // PascalCase

// Functions
function createPurchase() {}  // camelCase

// Constants
const MAX_ITEMS = 8  // UPPER_SNAKE_CASE
```

---

## 🚨 القاعدة 10: الاستيراد

```typescript
// 1. External
import { Composer } from 'grammy'

// 2. Internal
import { Database } from '#root/modules/database/index.js'

// 3. Services
import { PurchaseService } from 'services/...'

// 4. Utils
import { toArabicNumerals } from 'utils/...'
```

---

## ✅ Checklist قبل كتابة الكود

- [ ] هل الوظيفة في ملف منفصل؟
- [ ] هل استخدمت Utils بدلاً من التكرار؟
- [ ] هل استخدمت Shared Services؟
- [ ] هل Handler يحتوي UI فقط؟
- [ ] هل حجم الملف < الحد الأقصى؟
- [ ] هل أضفت معالجة أخطاء؟
- [ ] هل أضفت validation؟

---

## 🎯 الخلاصة

### 3 قواعد ذهبية:
1. **الفصل التام** - كل وظيفة = ملف
2. **Utils أولاً** - لا تكرار
3. **Shared Services** - منطق مشترك

---

**⚠️ عدم الالتزام = رفض الكود**

**آخر تحديث**: 2025-01-17
