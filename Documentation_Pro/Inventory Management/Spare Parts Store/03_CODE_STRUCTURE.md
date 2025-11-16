# 🏗️ مخزن قطع الغيار - بنية الكود

**النسخة:** 2.0  
**آخر تحديث:** نوفمبر 2025

---

## 📁 هيكل المجلدات

```
src/bot/features/inventory-management/
├── handlers/
│   ├── spare-parts-main.handler.ts           # القائمة الرئيسية (200 سطر)
│   ├── spare-parts-items.handler.ts          # إدارة القطع (3034 سطر)
│   ├── spare-parts-transactions.handler.ts   # الحركات (قيد التطوير)
│   ├── spare-parts-reports.handler.ts        # التقارير (قيد التطوير)
│   └── spare-parts-settings.handler.ts       # الإعدادات (قيد التطوير)
│
├── utils/
│   ├── barcode-generator.ts                  # توليد الباركود
│   ├── code-generator.ts                     # توليد الأكواد الداخلية
│   └── validators.ts                         # التحقق من المدخلات
│
└── types/
    └── spare-parts.types.ts                  # أنواع TypeScript

modules/
├── database/
│   └── prisma/
│       └── schema.prisma                     # مخطط قاعدة البيانات
│
└── services/
    └── barcode-scanner/
        └── index.ts                          # خدمة مسح الباركود
```

---

## 📄 الملفات الرئيسية

### 1️⃣ `spare-parts-main.handler.ts`

**الوظيفة:** القائمة الرئيسية والتنقل بين الأقسام

**Callback Patterns:**
```typescript
// القائمة الرئيسية
menu:sub:inventory-management:spare_parts

// الأقسام
sp:items:menu          // إدارة قطع الغيار
sp:transactions:menu   // الحركات والمعاملات
sp:reports:menu        // التقارير والإحصائيات
sp:settings:menu       // الإعدادات
```

**الكود:**
```typescript
import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../context.js'

export const sparePartsMainHandler = new Composer<Context>()

// القائمة الرئيسية
sparePartsMainHandler.callbackQuery(
  /^menu:sub:inventory-management:spare_parts$/,
  async (ctx) => {
    await ctx.answerCallbackQuery()
    
    const keyboard = new InlineKeyboard()
      .text('📦 إدارة قطع الغيار', 'sp:items:menu')
      .row()
      .text('📊 الحركات والمعاملات', 'sp:transactions:menu')
      .row()
      .text('📈 التقارير والإحصائيات', 'sp:reports:menu')
      .row()
      .text('⚙️ الإعدادات', 'sp:settings:menu')
      .row()
      .text('⬅️ رجوع للمخازن', 'menu:feature:inventory-management')
    
    await ctx.editMessageText(
      '📦 **مخزن قطع الغيار**\n\n' +
      '🎯 **الأقسام المتاحة:**\n\n' +
      '📦 **إدارة قطع الغيار**\n' +
      '└ إضافة، بحث، عرض، تعديل القطع\n\n' +
      // ... بقية النص
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      }
    )
  }
)

// قسم إدارة القطع
sparePartsMainHandler.callbackQuery('sp:items:menu', async (ctx) => {
  // ... الكود
})

// الأقسام الأخرى...
```

---

### 2️⃣ `spare-parts-items.handler.ts`

**الوظيفة:** إدارة قطع الغيار (إضافة، بحث، عرض، تعديل، حذف)

**الحجم:** 3034 سطر

**Callback Patterns:**
```typescript
// إضافة قطعة
sp:items:add:start             // بدء الإضافة
sp:items:add:scan              // مسح باركود
sp:items:add:manual            // إدخال يدوي
sp:items:add:auto-barcode      // توليد باركود تلقائي
sp:items:add:confirm_barcode   // تأكيد الباركود
sp:items:add:skip_*            // تخطي خطوة
sp:items:add:confirm_save      // تأكيد الحفظ

// البحث
sp:items:search                // بدء البحث
sp:items:search:barcode-scan   // مسح باركود
sp:items:search:barcode-manual // إدخال باركود يدوي
sp:items:search:code           // البحث بالكود
sp:items:search:name           // البحث بالاسم

// العرض والتعديل
sp:items:list                  // عرض الكل
sp:items:view:{id}             // عرض قطعة
sp:items:edit:{id}             // تعديل قطعة
sp:items:delete:{id}           // حذف قطعة
```

**الهيكل:**
```typescript
export const sparePartsItemsHandler = new Composer<Context>()

// ═══ دالة توليد الكود التلقائي ═══
async function generateInternalCode(categoryCode: string): Promise<string> {
  // جلب آخر رقم مستخدم
  const lastItem = await Database.prisma.iNV_SparePart.findFirst({
    where: { code: { startsWith: `${categoryCode}-` } },
    orderBy: { code: 'desc' },
  })
  
  let nextNumber = 1
  if (lastItem) {
    const match = lastItem.code.match(/-(\d+)$/)
    if (match) nextNumber = parseInt(match[1]) + 1
  }
  
  return `${categoryCode}-${nextNumber.toString().padStart(5, '0')}`
}

// ═══ إضافة قطعة غيار جديدة ═══
sparePartsItemsHandler.callbackQuery('sp:items:add:start', async (ctx) => {
  // عرض خيارات الإضافة (مسح باركود / إدخال يدوي)
})

sparePartsItemsHandler.callbackQuery('sp:items:add:scan', async (ctx) => {
  // طلب صورة الباركود
  ctx.session.inventoryForm = {
    action: 'add',
    step: 'awaiting_barcode_image',
    data: {},
  }
})

sparePartsItemsHandler.callbackQuery('sp:items:add:manual', async (ctx) => {
  // عرض خيارات الإدخال اليدوي
})

// ═══ معالجة الصور (مسح الباركود) ═══
sparePartsItemsHandler.on('message:photo', async (ctx) => {
  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_barcode_image') return
  
  // معالجة الصورة
  const photo = ctx.message.photo[ctx.message.photo.length - 1]
  const file = await ctx.api.getFile(photo.file_id)
  const buffer = await fetch(`https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`)
    .then(res => res.arrayBuffer())
    .then(buf => Buffer.from(buf))
  
  // مسح الباركود
  const result = await BarcodeScannerService.scan(buffer)
  
  if (result.success && result.barcode) {
    // التحقق من وجود الباركود
    const existing = await Database.prisma.iNV_SparePart.findUnique({
      where: { barcode: result.barcode },
    })
    
    if (existing) {
      // عرض تحذير بوجود الباركود
    } else {
      // متابعة عملية الإضافة
    }
  }
})

// ═══ معالجة النصوص ═══
sparePartsItemsHandler.on('message:text', async (ctx) => {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  const text = ctx.message.text.trim()
  
  // معالجة حسب الخطوة
  switch (state.step) {
    case 'awaiting_name_ar':
      // حفظ الاسم العربي
      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_category',
        data: { ...state.data, nameAr: text },
      }
      // عرض قائمة التصنيفات
      break
    
    case 'awaiting_quantity':
      // التحقق من الرقم
      const quantity = parseInt(text)
      if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply('❌ الكمية يجب أن تكون رقماً موجباً')
        return
      }
      // حفظ الكمية
      break
    
    // ... بقية الخطوات
  }
})

// ═══ البحث ═══
sparePartsItemsHandler.callbackQuery('sp:items:search', async (ctx) => {
  // عرض خيارات البحث
})

sparePartsItemsHandler.callbackQuery('sp:items:search:code', async (ctx) => {
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'search_by_code',
    data: {},
  }
  await ctx.editMessageText('🔢 أدخل الكود الداخلي...')
})

// ═══ دالة إرسال التقرير للأدمن ═══
async function sendReportToAdmins(ctx, item, category, location) {
  // جلب قسم المخازن
  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })
  
  // جلب المسؤولين
  const admins = await Database.prisma.departmentAdmin.findMany({
    where: { departmentId: dept.id, isActive: true },
  })
  
  // إعداد التقرير
  const report = `
🆕 **تقرير: تسجيل قطعة غيار جديدة**

**📦 معلومات القطعة:**
🔢 **الباركود:** \`${item.barcode}\`
📝 **الاسم:** ${item.nameAr}
🔢 **الكود:** \`${item.code}\`
// ... بقية التفاصيل
  `
  
  // إرسال للمسؤولين
  for (const admin of admins) {
    if (admin.telegramId && admin.telegramId !== ctx.from.id) {
      await ctx.api.sendMessage(admin.telegramId, report, {
        parse_mode: 'Markdown',
      })
    }
  }
}
```

**Session Structure:**
```typescript
interface InventoryForm {
  action: 'add' | 'edit' | 'search'
  step: string  // الخطوة الحالية
  data?: {
    barcode?: string
    code?: string
    nameAr?: string
    nameEn?: string
    categoryId?: number
    locationId?: number
    condition?: string
    quantity?: number
    unit?: string
    unitPrice?: number
    minQuantity?: number
    notes?: string
    images?: string[]
  }
}
```

---

### 3️⃣ `spare-parts-transactions.handler.ts`

**الوظيفة:** إدارة حركات المخزون

**الحالة:** قيد التطوير

**Callback Patterns:**
```typescript
sp:trans:in          // إدخال كمية
sp:trans:out         // إخراج كمية
sp:trans:transfer    // نقل بين مواقع
sp:trans:return      // إرجاع
sp:trans:adjust      // تسوية جرد
sp:trans:list        // سجل الحركات
```

---

### 4️⃣ `spare-parts-reports.handler.ts`

**الوظيفة:** توليد التقارير والإحصائيات

**الحالة:** قيد التطوير

**Callback Patterns:**
```typescript
sp:reports:summary     // ملخص المخزون
sp:reports:alerts      // تنبيهات النقص
sp:reports:value       // القيمة المالية
sp:reports:period      // حركات فترة
sp:reports:category    // حسب التصنيف
sp:reports:location    // حسب الموقع
sp:reports:export      // تصدير Excel
```

---

### 5️⃣ `spare-parts-settings.handler.ts`

**الوظيفة:** إدارة الإعدادات

**الحالة:** قيد التطوير

**Callback Patterns:**
```typescript
sp:categories:menu     // إدارة التصنيفات
sp:locations:menu      // إدارة المواقع
sp:settings:alerts     // إعدادات التنبيهات
sp:settings:print      // إعدادات الطباعة
```

---

## 🔧 الأدوات المساعدة (Utils)

### `barcode-generator.ts`
```typescript
export class BarcodeGenerator {
  /**
   * توليد باركود EAN-13
   */
  static generate(): string {
    // توليد 12 رقم عشوائي
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10)
    }
    
    // حساب رقم التحقق
    const checkDigit = this.calculateCheckDigit(code)
    return code + checkDigit
  }
  
  private static calculateCheckDigit(code: string): number {
    let sum = 0
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i])
      sum += (i % 2 === 0) ? digit : digit * 3
    }
    return (10 - (sum % 10)) % 10
  }
}
```

### `code-generator.ts`
```typescript
export class CodeGenerator {
  /**
   * توليد الكود الداخلي
   * @param categoryCode كود التصنيف
   * @returns الكود المولّد (مثل: CAR-00001)
   */
  static async generate(categoryCode: string): Promise<string> {
    const lastItem = await Database.prisma.iNV_SparePart.findFirst({
      where: { code: { startsWith: `${categoryCode}-` } },
      orderBy: { code: 'desc' },
    })
    
    let nextNumber = 1
    if (lastItem) {
      const match = lastItem.code.match(/-(\d+)$/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }
    
    return `${categoryCode}-${nextNumber.toString().padStart(5, '0')}`
  }
}
```

### `validators.ts`
```typescript
export class Validators {
  /**
   * التحقق من صحة الباركود
   */
  static isValidBarcode(barcode: string): boolean {
    return /^\d{13}$/.test(barcode)
  }
  
  /**
   * التحقق من صحة الكود
   */
  static isValidCode(code: string): boolean {
    return /^[A-Z]+-\d{5}$/.test(code)
  }
  
  /**
   * التحقق من صحة الكمية
   */
  static isValidQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity >= 0
  }
  
  /**
   * التحقق من صحة السعر
   */
  static isValidPrice(price: number): boolean {
    return !isNaN(price) && price >= 0
  }
}
```

---

## 📝 الأنواع (Types)

### `spare-parts.types.ts`
```typescript
// حالة القطعة
export enum SparePartCondition {
  NEW = 'NEW',           // جديدة
  USED = 'USED',         // مستعملة
  REFURBISHED = 'REFURBISHED',  // مُجدّدة
  IMPORT = 'IMPORT',     // استيراد
}

// نوع الحركة
export enum TransactionType {
  IN = 'IN',             // إدخال
  OUT = 'OUT',           // إخراج
  TRANSFER = 'TRANSFER', // نقل
  RETURN = 'RETURN',     // إرجاع
  ADJUST = 'ADJUST',     // تسوية
}

// بيانات القطعة
export interface SparePartData {
  barcode: string
  code: string
  nameAr: string
  nameEn?: string
  categoryId: number
  locationId: number
  condition: SparePartCondition
  quantity: number
  unit: string
  unitPrice: number
  totalValue: number
  minQuantity: number
  images?: string[]
  notes?: string
}

// بيانات الحركة
export interface TransactionData {
  type: TransactionType
  referenceNumber: string
  date: Date
  description?: string
  fromLocationId?: number
  toLocationId?: number
  items: TransactionItemData[]
}

export interface TransactionItemData {
  sparePartId: number
  quantity: number
  unitPrice: number
  notes?: string
}
```

---

## 🎯 أفضل الممارسات

### 1. معالجة الأخطاء
```typescript
try {
  const part = await Database.prisma.iNV_SparePart.create({ data })
  await ctx.reply('✅ تم الحفظ بنجاح')
} catch (error) {
  console.error('Error creating spare part:', error)
  await ctx.reply('❌ حدث خطأ أثناء الحفظ')
}
```

### 2. التحقق من الصلاحيات
```typescript
const hasPermission = await checkPermission(ctx.from.id, 'sp:items:add')
if (!hasPermission) {
  await ctx.answerCallbackQuery({ text: '❌ ليس لديك صلاحية' })
  return
}
```

### 3. تنظيف Session
```typescript
// بعد إكمال العملية
delete ctx.session.inventoryForm
```

### 4. استخدام Transactions
```typescript
await Database.prisma.$transaction(async (tx) => {
  // إنشاء الحركة
  const transaction = await tx.iNV_Transaction.create({ data: transactionData })
  
  // تحديث الكمية
  await tx.iNV_SparePart.update({
    where: { id: partId },
    data: { quantity: { increment: qty } },
  })
})
```

---

## 📊 مقاييس الأداء

### حجم الكود
- **إجمالي الأسطر:** ~3500 سطر
- **الدوال:** ~50 دالة
- **Handlers:** ~40 handler

### التعقيد
- **Cyclomatic Complexity:** متوسط 3.2
- **Cognitive Complexity:** متوسط 5.1

### التغطية بالاختبارات
- **Unit Tests:** 0% (قيد الإضافة)
- **Integration Tests:** 0% (قيد الإضافة)

---

**📝 ملاحظة:** هذه البنية قابلة للتطور. راجع الكود المصدري للحصول على أحدث نسخة.
