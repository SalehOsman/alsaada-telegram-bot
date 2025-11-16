# مقترحات Utils إضافية

## 📋 نظرة عامة

بعد تحليل الأنماط المكررة في handlers، إليك **6 Utils إضافية** يمكن أن تحسن الكود بشكل كبير.

---

## 🆕 Utils المقترحة

### 1️⃣ **step-flow.util.ts** ⭐ (عالية الأهمية)

#### المشكلة
إدارة خطوات conversations يدوياً مع if/else متعددة:

```typescript
// ❌ مكرر في كل conversation
if (state.step === 'awaiting_name_ar') {
  // handle...
}
if (state.step === 'awaiting_name_en') {
  // handle...
}
if (state.step === 'awaiting_unit_capacity') {
  // handle...
}
// ... 10+ خطوات
```

#### الحل

```typescript
// ✅ step-flow.util.ts
export class StepFlow {
  private steps: string[]
  private currentIndex: number = 0
  
  constructor(steps: string[]) {
    this.steps = steps
  }
  
  getCurrentStep(): string {
    return this.steps[this.currentIndex]
  }
  
  getNextStep(): string | null {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++
      return this.steps[this.currentIndex]
    }
    return null
  }
  
  getPreviousStep(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.steps[this.currentIndex]
    }
    return null
  }
  
  isLastStep(): boolean {
    return this.currentIndex === this.steps.length - 1
  }
  
  canSkip(step: string): boolean {
    const skippableSteps = ['awaiting_name_en', 'awaiting_min_quantity', 'awaiting_price', 'awaiting_supplier', 'awaiting_notes', 'awaiting_images']
    return skippableSteps.includes(step)
  }
  
  goToStep(step: string): boolean {
    const index = this.steps.indexOf(step)
    if (index !== -1) {
      this.currentIndex = index
      return true
    }
    return false
  }
}

// الاستخدام
const addItemFlow = new StepFlow([
  'awaiting_barcode',
  'awaiting_name_ar',
  'awaiting_name_en',
  'awaiting_category',
  'awaiting_location',
  'awaiting_unit',
  'awaiting_unit_capacity',
  'awaiting_quantity',
  'awaiting_min_quantity',
  'awaiting_price',
  'awaiting_supplier',
  'awaiting_notes',
  'awaiting_images',
  'confirm_save'
])

// في handler
const currentStep = addItemFlow.getCurrentStep()
const nextStep = addItemFlow.getNextStep()
if (addItemFlow.isLastStep()) {
  // save
}
```

**التوفير:** 80 سطر  
**الملفات المتأثرة:** 2 conversations

---

### 2️⃣ **photo-handler.util.ts** ⭐ (عالية الأهمية)

#### المشكلة
معالجة الصور مكررة (barcode scanning + product images):

```typescript
// ❌ مكرر في add-item.handler.ts (100+ سطر)
addItemHandler.on('message:photo', async (ctx, next) => {
  const photos = ctx.message.photo
  const photo = photos[photos.length - 1]
  const file = await ctx.api.getFile(photo.file_id)
  const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
  const response = await fetch(fileUrl)
  const imageBuffer = Buffer.from(await response.arrayBuffer())
  // ... معالجة
})
```

#### الحل

```typescript
// ✅ photo-handler.util.ts
export class PhotoHandler {
  /**
   * تحميل صورة من Telegram
   */
  static async downloadPhoto(ctx: Context): Promise<Buffer | null> {
    try {
      const photos = ctx.message?.photo
      if (!photos || photos.length === 0) return null
      
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('Error downloading photo:', error)
      return null
    }
  }
  
  /**
   * حفظ صورة في المجلد
   */
  static async savePhoto(
    buffer: Buffer,
    directory: string,
    fileName: string
  ): Promise<string> {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const process = await import('node:process')
    
    const uploadDir = path.join(process.cwd(), 'uploads', directory)
    await fs.mkdir(uploadDir, { recursive: true })
    
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)
    
    return `uploads/${directory}/${fileName}`
  }
  
  /**
   * مسح باركود من صورة
   */
  static async scanBarcode(buffer: Buffer): Promise<string | null> {
    try {
      const { BarcodeScannerService } = await import('#root/modules/services/barcode-scanner/index.js')
      const result = await BarcodeScannerService.scanBarcode(buffer)
      return result?.data?.trim() || null
    } catch (error) {
      console.error('Error scanning barcode:', error)
      return null
    }
  }
  
  /**
   * معالجة صورة منتج
   */
  static async handleProductPhoto(
    ctx: Context,
    barcode: string,
    existingImages: string[] = []
  ): Promise<string[] | null> {
    const buffer = await this.downloadPhoto(ctx)
    if (!buffer) return null
    
    const imageIndex = existingImages.length
    const fileName = `${barcode}-${imageIndex}.jpg`
    const relativePath = await this.savePhoto(buffer, 'inventory/products', fileName)
    
    return [...existingImages, relativePath]
  }
}

// الاستخدام
// في handler
const buffer = await PhotoHandler.downloadPhoto(ctx)
if (!buffer) {
  await ctx.reply('❌ لم يتم العثور على صورة')
  return
}

const barcode = await PhotoHandler.scanBarcode(buffer)
if (!barcode) {
  await ctx.reply('❌ لم يتم التعرف على الباركود')
  return
}

// حفظ صورة منتج
const updatedImages = await PhotoHandler.handleProductPhoto(ctx, barcode, currentImages)
```

**التوفير:** 100 سطر  
**الملفات المتأثرة:** add-item.handler.ts

---

### 3️⃣ **skip-handler.util.ts** 🟡 (متوسطة الأهمية)

#### المشكلة
أزرار "تخطي" مكررة في كل خطوة:

```typescript
// ❌ مكرر 7 مرات
addItemHandler.callbackQuery('og:items:add:skip_name_en', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipNameEn(ctx)
})

addItemHandler.callbackQuery('og:items:add:skip_min_quantity', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipMinQuantity(ctx)
})
// ... 5 مرات أخرى
```

#### الحل

```typescript
// ✅ skip-handler.util.ts
export class SkipHandler {
  /**
   * إنشاء زر تخطي
   */
  static createSkipButton(callbackData: string, text: string = '⏭️ تخطي'): InlineKeyboard {
    return new InlineKeyboard().text(text, callbackData)
  }
  
  /**
   * معالجة تخطي خطوة
   */
  static async handleSkip(
    ctx: Context,
    currentStep: string,
    nextStep: string,
    nextMessage: string
  ): Promise<void> {
    await ctx.answerCallbackQuery({ text: '⏭️ تم التخطي' })
    
    updateSessionStep(ctx, nextStep)
    
    await ctx.editMessageText(nextMessage, {
      reply_markup: this.createSkipButton(`skip_${nextStep}`),
      parse_mode: 'Markdown'
    })
  }
  
  /**
   * التحقق من إمكانية التخطي
   */
  static canSkip(step: string): boolean {
    const skippableSteps = [
      'awaiting_name_en',
      'awaiting_min_quantity',
      'awaiting_price',
      'awaiting_supplier',
      'awaiting_notes',
      'awaiting_images'
    ]
    return skippableSteps.includes(step)
  }
}

// الاستخدام
// بدلاً من 7 handlers منفصلة
const skippableSteps = ['name_en', 'min_quantity', 'price', 'supplier', 'notes', 'images']

for (const step of skippableSteps) {
  addItemHandler.callbackQuery(`og:items:add:skip_${step}`, async (ctx) => {
    await SkipHandler.handleSkip(ctx, `awaiting_${step}`, getNextStep(step), getNextMessage(step))
  })
}
```

**التوفير:** 50 سطر  
**الملفات المتأثرة:** add-item.handler.ts

---

### 4️⃣ **detail-formatter.util.ts** 🟡 (متوسطة الأهمية)

#### المشكلة
عرض تفاصيل الصنف مكرر:

```typescript
// ❌ مكرر في view-item, list-items
let message = '📦 **تفاصيل الصنف**\n\n'
message += `**الاسم (عربي):** ${item.nameAr}\n`
if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
message += `**الكود:** \`${item.code}\`\n`
if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`
// ... 20+ سطر
```

#### الحل

```typescript
// ✅ detail-formatter.util.ts
export class DetailFormatter {
  /**
   * تنسيق تفاصيل صنف كاملة
   */
  static formatItemDetails(item: any, options?: {
    showHeader?: boolean
    showWarnings?: boolean
    showTimestamps?: boolean
  }): string {
    const opts = { showHeader: true, showWarnings: true, showTimestamps: true, ...options }
    
    let message = ''
    
    if (opts.showHeader) {
      message += '📦 **تفاصيل الصنف**\n\n'
    }
    
    // معلومات أساسية
    message += `**الاسم (عربي):** ${item.nameAr}\n`
    if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
    message += `**الكود:** \`${item.code}\`\n`
    if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`
    
    // التصنيف والموقع
    message += `\n**الفئة:** ${item.category?.nameAr || 'غير محدد'}\n`
    message += `**الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`
    
    // الكميات
    message += `\n**الكمية:** ${toArabicNumerals(item.quantity)} ${item.unit}\n`
    message += `**الحد الأدنى:** ${toArabicNumerals(item.minQuantity)} ${item.unit}\n`
    
    // تحذيرات
    if (opts.showWarnings && item.quantity <= item.minQuantity) {
      message += `\n⚠️ **تحذير:** الكمية أقل من أو تساوي الحد الأدنى\n`
    }
    
    // الأسعار
    message += `\n**سعر الوحدة:** ${formatArabicCurrency(item.unitPrice)}\n`
    message += `**القيمة الإجمالية:** ${formatArabicCurrency(item.totalValue)}\n`
    
    // معلومات إضافية
    if (item.supplierName) message += `\n**المورد:** ${item.supplierName}\n`
    if (item.notes) message += `\n**ملاحظات:** ${item.notes}\n`
    
    // التواريخ
    if (opts.showTimestamps) {
      message += `\n**تاريخ الإضافة:** ${formatArabicDateTime(item.createdAt)}\n`
      if (item.updatedAt) message += `**آخر تحديث:** ${formatArabicDateTime(item.updatedAt)}\n`
    }
    
    return message
  }
  
  /**
   * تنسيق ملخص صنف (للقوائم)
   */
  static formatItemSummary(item: any): string {
    const warning = item.quantity <= item.minQuantity ? '⚠️ ' : ''
    return `${warning}${item.nameAr} (${toArabicNumerals(item.quantity)} ${item.unit})`
  }
  
  /**
   * تنسيق معلومات معاملة
   */
  static formatTransactionDetails(transaction: any, type: string): string {
    let message = `📋 **تفاصيل ${type}**\n\n`
    message += `**رقم العملية:** \`${transaction.number}\`\n`
    message += `**الصنف:** ${transaction.item.nameAr}\n`
    message += `**الكمية:** ${toArabicNumerals(transaction.quantity)} ${transaction.item.unit}\n`
    
    if (transaction.unitPrice) {
      message += `**السعر:** ${formatArabicCurrency(transaction.unitPrice)}\n`
      message += `**الإجمالي:** ${formatArabicCurrency(transaction.totalPrice)}\n`
    }
    
    if (transaction.notes) message += `\n**ملاحظات:** ${transaction.notes}\n`
    
    message += `\n**التاريخ:** ${formatArabicDateTime(transaction.createdAt)}\n`
    message += `**المستخدم:** ${transaction.createdByUser?.fullName || 'غير محدد'}\n`
    
    return message
  }
}

// الاستخدام
const message = DetailFormatter.formatItemDetails(item)
await ctx.editMessageText(message, { parse_mode: 'Markdown' })

// ملخص للقوائم
const summary = DetailFormatter.formatItemSummary(item)
keyboard.text(summary, `og:items:view:${item.id}`)
```

**التوفير:** 60 سطر  
**الملفات المتأثرة:** view-item, list-items, transactions

---

### 5️⃣ **filter-builder.util.ts** 🟢 (منخفضة الأهمية)

#### المشكلة
بناء filters menu يدوياً:

```typescript
// ❌ مكرر
async function showFiltersMenu(ctx: Context) {
  const categories = await ListItemsService.getCategories()
  let message = '🔍 **فلترة الأصناف**\n\n'
  message += '📋 **اختر الفئة:**'
  const keyboard = new InlineKeyboard()
  for (const cat of categories) {
    keyboard.text(cat.nameAr, `og:items:list:category:${cat.id}`).row()
  }
  keyboard.text('⬅️ رجوع', 'og:items:list')
  // ...
}
```

#### الحل

```typescript
// ✅ filter-builder.util.ts
export class FilterBuilder {
  /**
   * بناء قائمة فلاتر
   */
  static buildFilterMenu(
    title: string,
    filters: Array<{ id: number; name: string }>,
    callbackPrefix: string,
    backCallback: string
  ): { message: string; keyboard: InlineKeyboard } {
    let message = `🔍 **${title}**\n\n`
    message += '📋 **اختر الفلتر:**'
    
    const keyboard = new InlineKeyboard()
    
    for (const filter of filters) {
      keyboard.text(filter.name, `${callbackPrefix}:${filter.id}`).row()
    }
    
    keyboard.text('⬅️ رجوع', backCallback)
    
    return { message, keyboard }
  }
  
  /**
   * بناء شريط فلاتر نشطة
   */
  static buildActiveFilters(filters: Record<string, any>): string {
    const active = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
    
    if (active.length === 0) return ''
    
    return `\n🔍 **الفلاتر النشطة:**\n${active.join('\n')}\n`
  }
}

// الاستخدام
const categories = await CategoryService.getCategories('oils-greases')
const { message, keyboard } = FilterBuilder.buildFilterMenu(
  'فلترة الأصناف',
  categories.map(c => ({ id: c.id, name: c.nameAr })),
  'og:items:list:category',
  'og:items:list'
)

await ctx.editMessageText(message, { reply_markup: keyboard })
```

**التوفير:** 40 سطر  
**الملفات المتأثرة:** list-items, reports

---

### 6️⃣ **unit-selector.util.ts** 🟢 (منخفضة الأهمية)

#### المشكلة
اختيار الوحدات مكرر:

```typescript
// ❌ مكرر
const units = ['لتر', 'جالون', 'كيلو', 'طن', 'قطعة', 'علبة', 'كرتونة']
const keyboard = new InlineKeyboard()
for (const unit of units) {
  keyboard.text(unit, `og:items:add:select_unit:${unit}`)
}
```

#### الحل

```typescript
// ✅ unit-selector.util.ts
export class UnitSelector {
  private static readonly UNITS = {
    volume: ['لتر', 'جالون', 'برميل'],
    weight: ['كيلو', 'طن', 'جرام'],
    count: ['قطعة', 'علبة', 'كرتونة', 'صندوق']
  }
  
  /**
   * الحصول على جميع الوحدات
   */
  static getAllUnits(): string[] {
    return Object.values(this.UNITS).flat()
  }
  
  /**
   * الحصول على وحدات حسب النوع
   */
  static getUnitsByType(type: 'volume' | 'weight' | 'count'): string[] {
    return this.UNITS[type]
  }
  
  /**
   * بناء keyboard اختيار الوحدة
   */
  static buildUnitKeyboard(
    callbackPrefix: string,
    type?: 'volume' | 'weight' | 'count'
  ): InlineKeyboard {
    const units = type ? this.getUnitsByType(type) : this.getAllUnits()
    const keyboard = new InlineKeyboard()
    
    for (let i = 0; i < units.length; i += 3) {
      const row = units.slice(i, i + 3)
      for (const unit of row) {
        keyboard.text(unit, `${callbackPrefix}:${unit}`)
      }
      keyboard.row()
    }
    
    return keyboard
  }
  
  /**
   * التحقق من صحة الوحدة
   */
  static isValidUnit(unit: string): boolean {
    return this.getAllUnits().includes(unit)
  }
}

// الاستخدام
const keyboard = UnitSelector.buildUnitKeyboard('og:items:add:select_unit', 'volume')
await ctx.editMessageText('اختر الوحدة:', { reply_markup: keyboard })
```

**التوفير:** 30 سطر  
**الملفات المتأثرة:** add-item, edit-item

---

## 📊 ملخص Utils الإضافية

| # | Util | الأولوية | التوفير | الملفات |
|---|------|----------|---------|---------|
| 1 | **step-flow.util** | 🔴 عالية | 80 سطر | 2 |
| 2 | **photo-handler.util** | 🔴 عالية | 100 سطر | 1 |
| 3 | **skip-handler.util** | 🟡 متوسطة | 50 سطر | 1 |
| 4 | **detail-formatter.util** | 🟡 متوسطة | 60 سطر | 3 |
| 5 | **filter-builder.util** | 🟢 منخفضة | 40 سطر | 2 |
| 6 | **unit-selector.util** | 🟢 منخفضة | 30 سطر | 2 |

**الإجمالي:** 360 سطر إضافية

---

## 🎯 التوفير الإجمالي المحدث

### Utils الأساسية (14):
- التوفير: 880 سطر

### Utils الإضافية (6):
- التوفير: 360 سطر

### **الإجمالي الكلي: 1,240 سطر** 🎉

---

## ✅ التوصية

**إنشاء Utils حسب الأولوية:**

### 🔴 أولوية عالية (180 سطر):
1. step-flow.util.ts
2. photo-handler.util.ts

### 🟡 أولوية متوسطة (110 سطر):
3. skip-handler.util.ts
4. detail-formatter.util.ts

### 🟢 أولوية منخفضة (70 سطر):
5. filter-builder.util.ts
6. unit-selector.util.ts

---

**آخر تحديث:** 2025-01-17  
**الحالة:** جاهز للتنفيذ
