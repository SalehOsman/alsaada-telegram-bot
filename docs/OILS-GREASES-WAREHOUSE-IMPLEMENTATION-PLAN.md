# خطة تنفيذ مخزن الزيوت والشحوم 🛢️

## 📋 جدول المحتويات
- [فهم المتطلبات](#فهم-المتطلبات)
- [تحليل البنية الحالية](#تحليل-البنية-الحالية)
- [المنهجية الجديدة](#المنهجية-الجديدة)
- [خطة التنفيذ التفصيلية](#خطة-التنفيذ-التفصيلية)
- [الوظائف سابقة الإعداد المتاحة](#الوظائف-سابقة-الإعداد-المتاحة)

---

## 🎯 فهم المتطلبات

### الهدف الرئيسي
إنشاء قسم **مخزن الزيوت والشحوم** بنفس وظائف ومنطق مخزن قطع الغيار، مع تطبيق **منهجية جديدة** تعتمد على:

1. ✅ **فصل كامل للوظائف** - كل وظيفة في ملفات خاصة منفصلة
2. ✅ **إعادة استخدام الكود** - استخدام الوظائف سابقة الإعداد (utils, services, types)
3. ✅ **عدم تكرار الكود** - تجنب نسخ ولصق الوظائف نفسها
4. ✅ **تنظيم أفضل** - structure واضح وسهل الصيانة

### الوظائف المطلوبة (نفس spare-parts)

#### 1. **إدارة الأصناف** (Items Management)
- ➕ إضافة صنف جديد (يدوي / باركود)
- 🔍 البحث عن صنف (باركود، كود، اسم، تصنيف، موقع)
- 📊 عرض جميع الأصناف (مع pagination)
- 👁️ عرض تفاصيل صنف
- ✏️ تعديل صنف
- 🗑️ حذف صنف

#### 2. **الحركات والمعاملات** (Transactions)
- ➕ إدخال كمية (شراء)
- ➖ إخراج كمية (صرف للمعدات/موظفين/مشاريع)
- 🔄 نقل بين مواقع
- ↩️ إرجاع للمخزن
- ⚖️ تسوية جرد (Inventory Adjustment)
- 📋 سجل الحركات

#### 3. **التقارير والإحصائيات** (Reports & Analytics)
- 📈 ملخص المخزون
- ⚠️ تنبيهات النقص
- 💰 تقرير القيمة المالية
- 📊 حركات فترة معينة
- 🏷️ تقرير حسب التصنيف
- 📍 تقرير حسب الموقع
- 📤 تصدير Excel

#### 4. **الإعدادات** (Settings)
- 🏷️ إدارة التصنيفات (أنواع الزيوت: محرك، هيدروليك، فرامل، الخ)
- 📍 إدارة المواقع (خزان 1، خزان 2، رف الشحوم، الخ)

---

## 📊 تحليل البنية الحالية لمخزن قطع الغيار

### البنية الحالية (المشكلة)

```
handlers/
├── spare-parts-items.handler.ts        (2,783 سطر) ❌ كل الوظائف في ملف واحد
├── spare-parts-transactions.handler.ts (7,374 سطر) ❌ جميع الحركات المخزنية
├── spare-parts-reports.handler.ts      (491 سطر)   ✅ حجم معقول
├── spare-parts-settings.handler.ts     (420 سطر)   ✅ حجم معقول
└── spare-parts-main.handler.ts         (184 سطر)   ✅ قائمة رئيسية فقط
```

### 🔴 المشاكل في البنية الحالية

#### 1. **spare-parts-items.handler.ts** (2,783 سطر)
يحتوي على **جميع** وظائف إدارة الأصناف في ملف واحد:
- إضافة صنف (مسح باركود + إدخال يدوي + validation)
- البحث (5 طرق مختلفة)
- العرض (pagination + filters)
- التعديل (9 حقول مختلفة)
- الحذف + تأكيد الحذف
- معالجة الصور (photo handler)
- معالجة النصوص (text handler)

**النتيجة:** صعوبة الصيانة، تكرار الكود، صعوبة العثور على الوظيفة المطلوبة

#### 2. **spare-parts-transactions.handler.ts** (7,374 سطر)
يحتوي على **جميع** أنواع الحركات المخزنية:
- إدخال كمية (IN): 800+ سطر
- إخراج كمية (OUT): 1500+ سطر
- نقل (TRANSFER): 600+ سطر
- إرجاع (RETURN): 900+ سطر
- تسوية جرد (ADJUSTMENT): 1200+ سطر
- سجل الحركات (LIST): 400+ سطر
- + معالجات النصوص والصور المشتركة

**النتيجة:** ملف ضخم جداً، صعوبة الصيانة، تكرار منطق البحث والفلترة

---

## 🆕 المنهجية الجديدة - Modular Architecture

### المبادئ الأساسية

#### 1️⃣ **فصل الوظائف حسب المسؤولية (Feature-based)**
كل **وظيفة رئيسية** في **ملفها الخاص**:

```
handlers/oils-greases/
├── items/                                    # إدارة الأصناف
│   ├── add-item.handler.ts                   # إضافة صنف فقط
│   ├── search-item.handler.ts                # البحث عن صنف فقط
│   ├── list-items.handler.ts                 # عرض القائمة + pagination
│   ├── view-item.handler.ts                  # عرض تفاصيل صنف
│   ├── edit-item.handler.ts                  # تعديل صنف
│   ├── delete-item.handler.ts                # حذف صنف
│   └── index.ts                              # تجميع handlers
│
├── transactions/                             # الحركات المخزنية
│   ├── in-transaction.handler.ts             # إدخال كمية
│   ├── out-transaction.handler.ts            # إخراج كمية
│   ├── transfer-transaction.handler.ts       # نقل بين مواقع
│   ├── return-transaction.handler.ts         # إرجاع للمخزن
│   ├── adjustment-transaction.handler.ts     # تسوية جرد
│   ├── transactions-list.handler.ts          # سجل الحركات
│   └── index.ts
│
├── reports/                                  # التقارير
│   ├── summary-report.handler.ts             # ملخص المخزون
│   ├── alerts-report.handler.ts              # تنبيهات النقص
│   ├── value-report.handler.ts               # القيمة المالية
│   ├── period-report.handler.ts              # حركات فترة معينة
│   ├── category-report.handler.ts            # تقرير حسب التصنيف
│   ├── location-report.handler.ts            # تقرير حسب الموقع
│   ├── export-excel.handler.ts               # تصدير Excel
│   └── index.ts
│
├── settings/                                 # الإعدادات
│   ├── categories-settings.handler.ts        # إدارة التصنيفات
│   ├── locations-settings.handler.ts         # إدارة المواقع
│   └── index.ts
│
├── shared/                                   # معالجات مشتركة
│   ├── photo.handler.ts                      # معالجة الصور (barcode scanning)
│   ├── text.handler.ts                       # معالجة النصوص (user input)
│   └── index.ts
│
└── oils-greases-main.handler.ts              # القائمة الرئيسية فقط
```

#### 2️⃣ **استخدام الوظائف سابقة الإعداد**

**بدلاً من تكرار الكود، نستخدم:**

```typescript
// ❌ الطريقة القديمة - تكرار الكود
function validateQuantity(qty: string): boolean {
  const num = parseInt(qty);
  return num > 0 && Number.isInteger(num);
}

// ✅ الطريقة الجديدة - استخدام utils
import { validateQuantity, validatePrice } from '../../utils/validators.util.js';

const validation = validateQuantity(userInput);
if (!validation.isValid) {
  await ctx.reply(validation.error!);
  return;
}
```

**الوظائف سابقة الإعداد المتاحة:**

##### **A) Validators** (`utils/validators.util.ts`)
- ✅ `validateQuantity()` - التحقق من الكمية
- ✅ `validatePrice()` - التحقق من السعر
- ✅ `validateCode()` - التحقق من الكود
- ✅ `validateName()` - التحقق من الاسم
- ✅ `validateDate()` - التحقق من التاريخ
- ✅ `validateNotes()` - التحقق من الملاحظات
- ✅ `validateStockAvailability()` - التحقق من توفر المخزون
- ✅ `validateUnique()` - التحقق من عدم التكرار (async DB check)
- ✅ `sanitizeInput()` - تنظيف المدخلات
- ✅ `sanitizeNumber()` - تنظيف الأرقام

##### **B) Formatters** (`utils/formatters.util.ts`)
- ✅ `formatDate()` - تنسيق التاريخ (Arabic locale)
- ✅ `formatDateTime()` - تنسيق التاريخ والوقت
- ✅ `formatNumber()` - تنسيق الأرقام (مع فواصل)
- ✅ `formatCurrency()` - تنسيق العملة (جنيه)
- ✅ `getTransactionTypeIcon()` - أيقونة نوع الحركة (📥📤🔄↩️⚖️)
- ✅ `getTransactionTypeLabel()` - تسمية نوع الحركة (عربي)
- ✅ `formatItemInfo()` - تنسيق معلومات الصنف
- ✅ `formatTransactionInfo()` - تنسيق معلومات الحركة
- ✅ `truncateText()` - اختصار النص الطويل
- ✅ `generateTransactionNumber()` - توليد رقم حركة فريد

##### **C) Services** (`services/`)

###### **WarehouseService** (`warehouse.service.ts`)
```typescript
class WarehouseService {
  // إنشاء حركة مخزنية موحدة
  async createTransaction(params: CreateTransactionParams): Promise<Transaction>
  
  // جلب رصيد صنف حسب الموقع
  async getItemStock(itemId: number, locationId?: number): Promise<StockInfo>
  
  // جلب سجل حركات صنف
  async getItemHistory(itemId: number, filters?: FilterOptions): Promise<Transaction[]>
}
```

###### **TransactionService** (`transaction.service.ts`)
```typescript
class TransactionService {
  // إنشاء حركة مع validation كامل
  async createTransaction(params: CreateTransactionParams): Promise<Transaction>
  
  // حركة سريعة (إدخال/إخراج بسيط)
  async quickTransaction(params: QuickTransactionParams): Promise<Transaction>
  
  // تحديث كمية صنف
  async updateItemQuantity(itemId: number, quantity: number): Promise<void>
}
```

###### **AuditService** (`audit.service.ts`)
```typescript
class AuditService {
  // إنشاء جرد جديد
  async createAudit(type: AuditType, scope: AuditScope): Promise<Audit>
  
  // تسجيل فرق جردي
  async recordAuditDifference(auditId: number, itemId: number, difference: number): Promise<void>
  
  // تطبيق تسويات الجرد
  async applyAuditAdjustments(auditId: number): Promise<void>
}
```

###### **NotificationService** (`notification.service.ts`)
```typescript
class NotificationService {
  // إرسال إشعار للمديرين
  async notifyAdmins(data: NotificationData): Promise<void>
  
  // إشعار نقص المخزون
  async notifyLowStock(itemId: number): Promise<void>
}
```

###### **ExcelExportService** (`excel-export.service.ts`)
```typescript
class ExcelExportService {
  // تصدير تقرير جرد
  async exportAuditReport(auditId: number): Promise<Buffer>
  
  // تصدير سجل حركات
  async exportTransactionsReport(filters: FilterOptions): Promise<Buffer>
}
```

##### **D) Types** (`types/warehouse.types.ts`)
```typescript
// أنواع البيانات المشتركة
export enum WarehouseType {
  SPARE_PARTS = 'SPARE_PARTS',
  OILS_GREASES = 'OILS_GREASES',     // 🆕
  FUEL = 'FUEL',
  MATERIALS = 'MATERIALS',
  TOOLS_EQUIPMENT = 'TOOLS_EQUIPMENT'
}

export enum TransactionType {
  IN = 'IN',                           // إدخال
  OUT = 'OUT',                         // إخراج
  TRANSFER = 'TRANSFER',               // نقل
  RETURN = 'RETURN',                   // إرجاع
  ADJUSTMENT = 'ADJUSTMENT',           // تسوية
  PURCHASE = 'PURCHASE',               // شراء
  ISSUE_TO_EMPLOYEE = 'ISSUE_TO_EMPLOYEE',
  ISSUE_TO_EQUIPMENT = 'ISSUE_TO_EQUIPMENT',
  ISSUE_TO_PROJECT = 'ISSUE_TO_PROJECT'
}

export interface BaseItem {
  id: number;
  code: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  quantity: number;
  unit: string;
  // ... الخ
}

export interface BaseTransaction {
  id: number;
  type: TransactionType;
  itemId: number;
  quantity: number;
  userId: number;
  createdAt: Date;
  // ... الخ
}
```

#### 3️⃣ **عدم تكرار الكود - DRY Principle**

**مثال: منطق البحث (مكرر حالياً في 4 handlers)**

```typescript
// ❌ الطريقة القديمة - تكرار في كل handler
// spare-parts-items.handler.ts
sparePartsItemsHandler.callbackQuery('sp:items:search:code', async (ctx) => {
  // 50 سطر من كود البحث بالكود
});

// spare-parts-transactions.handler.ts (IN)
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:search:code', async (ctx) => {
  // نفس الـ 50 سطر مكررة!
});

// spare-parts-transactions.handler.ts (OUT)
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:search:code', async (ctx) => {
  // نفس الـ 50 سطر مكررة مرة ثالثة!
});

// spare-parts-transactions.handler.ts (TRANSFER)
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:search:code', async (ctx) => {
  // نفس الـ 50 سطر مكررة مرة رابعة!
});
```

```typescript
// ✅ الطريقة الجديدة - وظيفة مشتركة واحدة
// shared/search-helpers.ts
export async function searchItemByCode(
  ctx: Context,
  searchTerm: string,
  warehouseType: WarehouseType = WarehouseType.OILS_GREASES
): Promise<Item[]> {
  // منطق البحث مرة واحدة فقط
  const items = await Database.prisma.iNV_Item.findMany({
    where: {
      warehouseType,
      code: { contains: searchTerm }
    }
  });
  return items;
}

// استخدامها في أي handler
import { searchItemByCode } from '../shared/search-helpers.js';

oilsItemsHandler.callbackQuery('og:items:search:code', async (ctx) => {
  const items = await searchItemByCode(ctx, userInput, WarehouseType.OILS_GREASES);
  // عرض النتائج فقط
});
```

---

## 📝 خطة التنفيذ التفصيلية

### المرحلة 1: إعداد البنية الأساسية ✅

#### 1.1 إنشاء هيكل المجلدات
```
handlers/
└── oils-greases/
    ├── items/
    ├── transactions/
    ├── reports/
    ├── settings/
    ├── shared/
    └── oils-greases-main.handler.ts
```

#### 1.2 إنشاء Types للزيوت والشحوم
```typescript
// types/oils-greases.types.ts
export interface OilsGreasesItem extends BaseItem {
  viscosity?: string;        // اللزوجة (SAE 10W-40)
  specification?: string;    // المواصفات (API SN, ACEA A3/B4)
  volume?: number;          // الحجم (باللتر أو الكيلو)
  expiryDate?: Date;        // تاريخ انتهاء الصلاحية
  batchNumber?: string;     // رقم التشغيلة
}
```

### المرحلة 2: بناء وظائف إدارة الأصناف (Items) 🏗️

نبدأ بـ **placeholder handlers** ثم نملأها وظيفة بوظيفة.

#### 2.1 إضافة صنف جديد (`items/add-item.handler.ts`)

**التدفق المطلوب:**
1. عرض خيارات الإضافة (يدوي / باركود)
2. إذا باركود → استدعاء `shared/photo.handler.ts`
3. إذا يدوي → جمع البيانات خطوة بخطوة:
   - الباركود (أو توليد تلقائي)
   - الكود الداخلي (تلقائي حسب التصنيف)
   - الاسم (عربي + إنجليزي)
   - التصنيف (engine oil, hydraulic oil, grease, etc.)
   - الموقع التخزيني
   - الكمية الأولية
   - اللزوجة (اختياري)
   - المواصفات (اختياري)
   - السعر (اختياري)
   - الصور (اختيارية)
4. Validation باستخدام `validators.util.ts`
5. الحفظ في قاعدة البيانات

**الوظائف المستخدمة:**
```typescript
import { validateQuantity, validatePrice, validateCode, validateName } from '../../../utils/validators.util.js';
import { generateInternalCode } from '../shared/code-generator.js';
import { formatCurrency, formatDate } from '../../../utils/formatters.util.js';
```

#### 2.2 البحث عن صنف (`items/search-item.handler.ts`)

**طرق البحث:**
- بالباركود (مسح / إدخال يدوي)
- بالكود الداخلي
- بالاسم (بحث نصي)
- بالتصنيف
- بالموقع التخزيني

**الوظائف المستخدمة:**
```typescript
import { searchItemByCode, searchItemByName, searchItemByCategory } from '../shared/search-helpers.js';
import { formatItemInfo } from '../../../utils/formatters.util.js';
```

#### 2.3 عرض القائمة (`items/list-items.handler.ts`)

**المميزات:**
- Pagination (10 items per page)
- Filters (حسب التصنيف، الموقع، الحالة)
- Sorting (حسب الاسم، الكمية، التاريخ)

#### 2.4 عرض التفاصيل (`items/view-item.handler.ts`)

**المعلومات المعروضة:**
- البيانات الأساسية
- الكمية حسب الحالة (جديد، استيراد، مستعمل)
- الموقع التخزيني
- آخر 5 حركات
- الصور (إن وجدت)

#### 2.5 تعديل صنف (`items/edit-item.handler.ts`)

**الحقول القابلة للتعديل:**
- الاسم
- التصنيف
- الموقع
- الحد الأدنى
- السعر
- الملاحظات

#### 2.6 حذف صنف (`items/delete-item.handler.ts`)

**مع validation:**
- التحقق من عدم وجود حركات مرتبطة
- تأكيد الحذف مرتين
- تسجيل في audit log

### المرحلة 3: بناء الحركات المخزنية (Transactions) 📦

كل نوع حركة في ملف منفصل.

#### 3.1 إدخال كمية (`transactions/in-transaction.handler.ts`)

**التدفق:**
1. اختيار الصنف (بحث / مسح باركود)
2. إدخال الكمية
3. تحديد الحالة (NEW / IMPORT / USED / REFURBISHED)
4. رقم الفاتورة (اختياري)
5. تاريخ الفاتورة (اختياري)
6. السعر (اختياري - أو استخدام السعر الحالي)
7. المورد (اختياري)
8. ملاحظات (اختيارية)
9. التأكيد والحفظ

**استخدام:**
```typescript
import { TransactionService } from '../../../services/transaction.service.js';
import { validateQuantity, validatePrice } from '../../../utils/validators.util.js';

const transactionService = new TransactionService();
await transactionService.createTransaction({
  warehouseType: WarehouseType.OILS_GREASES,
  type: TransactionType.IN,
  itemId: selectedItem.id,
  quantity: enteredQuantity,
  userId: ctx.from!.id,
  // ...
});
```

#### 3.2 إخراج كمية (`transactions/out-transaction.handler.ts`)

**التدفق:**
1. اختيار الصنف
2. اختيار الحالة المراد صرفها
3. إدخال الكمية (مع التحقق من توفرها)
4. تحديد وجهة الصرف:
   - معدة (Equipment)
   - موظف (Employee)
   - مشروع (Project)
   - أخرى
5. ملاحظات
6. التأكيد والحفظ

**استخدام:**
```typescript
import { validateStockAvailability } from '../../../utils/validators.util.js';

const stockCheck = await validateStockAvailability(itemId, requestedQuantity, condition);
if (!stockCheck.isValid) {
  await ctx.reply(stockCheck.error!);
  return;
}
```

#### 3.3 نقل بين مواقع (`transactions/transfer-transaction.handler.ts`)
#### 3.4 إرجاع للمخزن (`transactions/return-transaction.handler.ts`)
#### 3.5 تسوية جرد (`transactions/adjustment-transaction.handler.ts`)
#### 3.6 سجل الحركات (`transactions/transactions-list.handler.ts`)

### المرحلة 4: بناء التقارير (Reports) 📊

كل تقرير في ملف منفصل.

#### 4.1 ملخص المخزون (`reports/summary-report.handler.ts`)
#### 4.2 تنبيهات النقص (`reports/alerts-report.handler.ts`)
#### 4.3 القيمة المالية (`reports/value-report.handler.ts`)
#### 4.4 حركات فترة معينة (`reports/period-report.handler.ts`)
#### 4.5 تقرير حسب التصنيف (`reports/category-report.handler.ts`)
#### 4.6 تقرير حسب الموقع (`reports/location-report.handler.ts`)
#### 4.7 تصدير Excel (`reports/export-excel.handler.ts`)

### المرحلة 5: الإعدادات (Settings) ⚙️

#### 5.1 إدارة التصنيفات (`settings/categories-settings.handler.ts`)

**تصنيفات الزيوت والشحوم:**
- زيوت محركات 🔧
- زيوت هيدروليك 🔄
- زيوت فرامل 🛑
- زيوت ناقل حركة ⚙️
- شحوم عامة 🧴
- سوائل تبريد ❄️
- أخرى 📦

#### 5.2 إدارة المواقع (`settings/locations-settings.handler.ts`)

**أمثلة للمواقع:**
- خزان 1
- خزان 2
- رف الشحوم A
- رف الشحوم B
- غرفة التخزين
- مخزن رئيسي

### المرحلة 6: المعالجات المشتركة (Shared Handlers) 🔧

#### 6.1 معالج الصور (`shared/photo.handler.ts`)
```typescript
export async function handleBarcodePhoto(ctx: Context, sessionKey: string) {
  // استخدام BarcodeScannerService لمسح الباركود
  // إرجاع الباركود المستخرج
  // أو رسالة خطأ
}
```

#### 6.2 معالج النصوص (`shared/text.handler.ts`)
```typescript
export async function handleUserInput(ctx: Context, expectedType: 'quantity' | 'price' | 'code' | 'text') {
  // validation حسب النوع المتوقع
  // إرجاع القيمة النظيفة
  // أو رسالة خطأ
}
```

#### 6.3 وظائف البحث المشتركة (`shared/search-helpers.ts`)
```typescript
export async function searchItemByCode(...);
export async function searchItemByName(...);
export async function searchItemByBarcode(...);
export async function searchItemByCategory(...);
export async function searchItemByLocation(...);
```

#### 6.4 مولدات الأكواد (`shared/code-generator.ts`)
```typescript
export async function generateInternalCode(categoryCode: string, warehouseType: WarehouseType): Promise<string> {
  // OIL-00001, GREASE-00123, etc.
}

export function generateBarcode(): string {
  // توليد باركود EAN-13 فريد
}
```

---

## ✅ الوظائف سابقة الإعداد المتاحة - دليل كامل

### 1. Validators (`utils/validators.util.ts`)

#### `validateQuantity(quantity: string | number): ValidationResult`
```typescript
const result = validateQuantity(userInput);
if (!result.isValid) {
  await ctx.reply(result.error!); // "❌ الكمية يجب أن تكون رقم صحيح موجب"
  return;
}
const qty = parseInt(userInput);
```

#### `validatePrice(price: string | number): ValidationResult`
```typescript
const result = validatePrice(userInput);
if (!result.isValid) {
  await ctx.reply(result.error!); // "❌ السعر يجب أن يكون رقم موجب"
  return;
}
const price = parseFloat(userInput);
```

#### `validateCode(code: string, minLength = 2): ValidationResult`
#### `validateName(name: string, minLength = 2): ValidationResult`
#### `validateDate(dateStr: string): ValidationResult`
#### `validateNotes(notes: string, maxLength = 500): ValidationResult`

#### `validateStockAvailability(itemId: number, requestedQty: number, condition?: string): Promise<ValidationResult>`
```typescript
const check = await validateStockAvailability(itemId, 50, 'NEW');
if (!check.isValid) {
  await ctx.reply(check.error!); // "❌ الكمية المتوفرة: 30 فقط"
  return;
}
```

#### `validateUnique(table: string, field: string, value: any): Promise<ValidationResult>`
```typescript
const unique = await validateUnique('INV_SparePart', 'code', 'OIL-00123');
if (!unique.isValid) {
  await ctx.reply(unique.error!); // "❌ هذا الكود موجود مسبقاً"
  return;
}
```

#### `sanitizeInput(input: string): string`
#### `sanitizeNumber(input: string): string`

---

### 2. Formatters (`utils/formatters.util.ts`)

#### `formatDate(date: Date | string, locale = 'ar-EG'): string`
```typescript
formatDate(new Date()) // "١٢ نوفمبر ٢٠٢٥"
```

#### `formatDateTime(date: Date | string, locale = 'ar-EG'): string`
```typescript
formatDateTime(new Date()) // "١٢ نوفمبر ٢٠٢٥ ١٢:٣٠ م"
```

#### `formatNumber(num: number, locale = 'ar-EG'): string`
```typescript
formatNumber(1234567.89) // "١٬٢٣٤٬٥٦٧٫٨٩"
```

#### `formatCurrency(amount: number, currency = 'EGP', locale = 'ar-EG'): string`
```typescript
formatCurrency(1500.50) // "١٬٥٠٠٫٥٠ جنيه"
```

#### `formatPercentage(value: number, decimals = 1, locale = 'ar-EG'): string`

#### `getTransactionTypeIcon(type: TransactionType): string`
```typescript
getTransactionTypeIcon(TransactionType.IN)        // "📥"
getTransactionTypeIcon(TransactionType.OUT)       // "📤"
getTransactionTypeIcon(TransactionType.TRANSFER)  // "🔄"
getTransactionTypeIcon(TransactionType.RETURN)    // "↩️"
getTransactionTypeIcon(TransactionType.ADJUSTMENT) // "⚖️"
```

#### `getTransactionTypeLabel(type: TransactionType): string`
```typescript
getTransactionTypeLabel(TransactionType.IN)  // "إدخال"
getTransactionTypeLabel(TransactionType.OUT) // "إخراج"
```

#### `formatItemInfo(item: BaseItem): string`
```typescript
const message = formatItemInfo(item);
// "📦 زيت محرك 10W-40
//  🔢 الكود: OIL-00123
//  📊 الكمية: 50 لتر
//  💰 السعر: 150 جنيه"
```

#### `formatTransactionInfo(transaction: BaseTransaction): string`

#### `truncateText(text: string, maxLength: number): string`

#### `formatBulletList(items: string[]): string`

#### `generateTransactionNumber(prefix = 'TXN'): string`
```typescript
generateTransactionNumber('OG-IN')  // "OG-IN-20251112-001234"
```

---

### 3. Services

#### **TransactionService**

```typescript
import { TransactionService } from '../../services/transaction.service.js';

const service = new TransactionService();

// إنشاء حركة إدخال
await service.createTransaction({
  warehouseType: WarehouseType.OILS_GREASES,
  type: TransactionType.IN,
  itemId: 123,
  quantity: 50,
  condition: 'NEW',
  userId: ctx.from!.id,
  invoiceNumber: 'INV-2024-001',
  price: 150.00,
  notes: 'شراء زيت محرك'
});

// حركة سريعة (بدون تفاصيل)
await service.quickTransaction({
  itemId: 123,
  quantity: 10,
  type: TransactionType.OUT,
  userId: ctx.from!.id
});
```

#### **AuditService**

```typescript
import { AuditService } from '../../services/audit.service.js';

const service = new AuditService();

// إنشاء جرد كامل
const audit = await service.createAudit({
  type: AuditType.FULL_AUDIT,
  warehouseType: WarehouseType.OILS_GREASES,
  userId: ctx.from!.id
});

// تسجيل فرق جردي
await service.recordAuditDifference(audit.id, itemId, -5); // نقص 5 وحدات

// تطبيق التسويات
await service.applyAuditAdjustments(audit.id);
```

#### **NotificationService**

```typescript
import { NotificationService } from '../../services/notification.service.js';

const service = new NotificationService();

// إشعار نقص مخزون
await service.notifyLowStock(itemId);

// إشعار مخصص
await service.notifyAdmins({
  title: '⚠️ تنبيه',
  message: 'انخفاض كمية زيت المحرك 10W-40',
  priority: 'HIGH'
});
```

#### **ExcelExportService**

```typescript
import { ExcelExportService } from '../../services/excel-export.service.js';

const service = new ExcelExportService();

// تصدير تقرير جرد
const buffer = await service.exportAuditReport(auditId);
await ctx.replyWithDocument(new InputFile(buffer, 'audit-report.xlsx'));

// تصدير سجل حركات
const buffer = await service.exportTransactionsReport({
  warehouseType: WarehouseType.OILS_GREASES,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
await ctx.replyWithDocument(new InputFile(buffer, 'transactions-2025.xlsx'));
```

---

## 🎯 ملخص المنهجية

### ✅ الفوائد

1. **صيانة أسهل** - كل وظيفة في ملفها الخاص (100-300 سطر)
2. **كود نظيف** - إعادة استخدام الوظائف المشتركة
3. **تطوير أسرع** - يمكن العمل على عدة وظائف بالتوازي
4. **أخطاء أقل** - validation مركزي وموحد
5. **قابلية التوسع** - إضافة مخازن جديدة بسهولة

### ✅ القواعد الذهبية

1. **لا تكرر الكود** - استخدم utils و services
2. **ملف واحد = وظيفة واحدة** - فصل كامل للمسؤوليات
3. **validation دائماً** - استخدم validators قبل الحفظ
4. **formatters للعرض** - تنسيق موحد للمستخدم
5. **services للمنطق** - business logic في services فقط

---

## 📋 خطة التنفيذ المرحلية

### الآن - المرحلة الأولى (Placeholder Structure)
```
1. إنشاء هيكل المجلدات ✅
2. إنشاء placeholder handlers فارغة ✅
3. إنشاء index.ts files ✅
4. إنشاء القائمة الرئيسية ✅
5. التأكد من عمل التوجيه (routing) ✅
```

### بعد ذلك - المرحلة الثانية (وظيفة وظيفة)
```
نبني كل وظيفة على حدة:
1. add-item.handler.ts
2. search-item.handler.ts
3. list-items.handler.ts
...إلخ
```

---

## ❓ أسئلة التأكيد

1. ✅ هل فهمت الفرق بين البنية الحالية (ملف ضخم واحد) والبنية الجديدة (ملفات منفصلة)؟
2. ✅ هل واضحة فكرة استخدام utils/services بدلاً من تكرار الكود؟
3. ✅ هل الوظائف المطلوبة (Items, Transactions, Reports, Settings) واضحة؟
4. ✅ هل تريد البدء بإنشاء الـ placeholder structure أولاً؟

---

**ملاحظة:** هذا الـ plan سيكون مرجعنا طوال رحلة التطوير. سنبني وظيفة وظيفة بشكل منهجي ومنظم! 🚀
