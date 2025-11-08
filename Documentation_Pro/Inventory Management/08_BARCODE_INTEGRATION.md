# 📱 دمج الباركود في نظام المخازن

**التاريخ:** 2025-01-XX  
**الإصدار:** 1.0

---

## 📋 تحليل الوضع الحالي

### ✅ ما هو موجود:

#### 1. **BarcodeScannerService** (`src/modules/services/barcode-scanner/index.ts`)
```typescript
// الوظائف المتاحة:
- scanBarcode(imageBuffer: Buffer): Promise<BarcodeResult | null>
- scanQRCode(imageBuffer: Buffer): Promise<BarcodeResult | null>
- generateQRCode(options): Promise<Buffer>

// النتيجة:
interface BarcodeResult {
  type: 'QR' | 'BARCODE' | 'UNKNOWN'
  data: string  // ← هذا هو SKU/الباركود المقروء
  format?: string
  confidence?: number
}
```

**المزايا:**
- ✅ جاهز للاستخدام
- ✅ يدعم QR Code والباركود
- ✅ معالجة تلقائية للصور (resize, grayscale, normalize)
- ✅ Timeout protection (5 ثواني)

**القيود:**
- ⚠️ حالياً يستخدم QR scanner للباركود أيضاً (قد يحتاج تحسين لاحقاً)

#### 2. **Barcode Scanner Handler** (`src/bot/features/barcode-scanner/handlers/scanner.ts`)
```typescript
// الوضع الحالي:
- معطل مؤقتاً لتجنب التداخل مع إضافة الموظفين
- Handler بسيط يعرض رسالة "أرسل صورة"
```

#### 3. **Inventory Service** (`src/modules/services/inventory/index.ts`)
```typescript
// موجود لكن:
- In-Memory فقط (ليس مربوط بقاعدة البيانات)
- لا يستخدم جداول Prisma الجديدة
- يحتاج إعادة كتابة لربطه بقاعدة البيانات
```

---

## 🎯 التدفقات المطلوبة

### **التدفق 1: مسح الباركود للبحث عن صنف**

**السيناريو:** أمين المخزن يريد البحث عن صنف بسرعة

```
1. المستخدم: يضغط "📱 مسح باركود" في قائمة المخزن
2. البوت: يطلب إرسال صورة الباركود
3. المستخدم: يرسل صورة الباركود
4. النظام:
   - يقرأ الباركود من الصورة (BarcodeScannerService.scanBarcode)
   - يبحث في جدول Item عن sku مطابق
   - يجلب الأرصدة من جميع المخازن (Stock)
5. البوت: يعرض:
   📦 الصنف: فلتر زيت CAT 1R-0739
   
   📊 الأرصدة المتاحة:
   • ⚙️ مخزن قطع الغيار: 20 قطعة (تكلفة: 450 جنيه)
   • 🏢 مخزن الموقع A: 5 قطع (تكلفة: 450 جنيه)
   
   اختر إجراء:
   [📥 استلام] [📤 صرف] [🔐 عهدة] [↩️ إرجاع]
```

### **التدفق 2: مسح الباركود أثناء الاستلام**

**السيناريو:** أثناء عملية استلام مشتريات

```
1. المستخدم: في عملية "استلام مشتريات"
2. البوت: يطلب "أرسل صورة الباركود أو أدخل SKU يدوياً"
3. المستخدم: يرسل صورة الباركود
4. النظام:
   - يقرأ الباركود
   - يبحث عن الصنف
   - إذا وُجد: يعرض بياناته ويسأل عن الكمية والسعر
   - إذا لم يُوجد: يسأل "الصنف غير موجود. هل تريد إضافته؟"
5. البوت: يستكمل عملية الاستلام
```

### **التدفق 3: مسح الباركود أثناء الصرف**

**السيناريو:** أثناء عملية صرف للاستهلاك

```
1. المستخدم: في عملية "صرف للاستهلاك"
2. البوت: يطلب "أرسل صورة الباركود"
3. المستخدم: يرسل صورة الباركود
4. النظام:
   - يقرأ الباركود
   - يبحث عن الصنف
   - يعرض الأرصدة المتاحة في المخزن المحدد
   - يسأل عن الكمية
5. البوت: يستكمل عملية الصرف
```

### **التدفق 4: مسح الباركود للإرجاع**

**السيناريو:** إرجاع صنف للمخزن

```
1. المستخدم: في عملية "إرجاع للمخزن"
2. البوت: يطلب "أرسل صورة الباركود"
3. المستخدم: يرسل صورة الباركود
4. النظام:
   - يقرأ الباركود
   - يبحث عن الصنف
   - يسأل عن المخزن المراد الإرجاع إليه
   - يسأل عن الكمية
5. البوت: يستكمل عملية الإرجاع
```

---

## 🏗️ التصميم المقترح

### **1. خدمة البحث بالباركود (Barcode Search Service)**

```typescript
// services/inventory-barcode.service.ts
export class InventoryBarcodeService {
  /**
   * البحث عن صنف بالباركود (SKU)
   */
  static async findItemByBarcode(sku: string): Promise<Item | null> {
    return await Database.prisma.item.findUnique({
      where: { sku },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    })
  }

  /**
   * البحث عن صنف بالباركود مع عرض الأرصدة
   */
  static async findItemWithStocks(sku: string): Promise<{
    item: Item
    stocks: Array<{
      warehouse: Warehouse
      quantity: number
      averageCost: number
    }>
  } | null> {
    const item = await this.findItemByBarcode(sku)
    if (!item) return null

    return {
      item,
      stocks: item.stocks.map(stock => ({
        warehouse: stock.warehouse,
        quantity: stock.quantity,
        averageCost: stock.averageCost,
      })),
    }
  }
}
```

### **2. Handler لمسح الباركود**

```typescript
// handlers/barcode-scan.handler.ts
export const inventoryBarcodeHandler = new Composer<Context>()

// حالة المستخدم (Session State)
interface BarcodeScanState {
  action: 'search' | 'receiving' | 'dispensing' | 'return'
  warehouseId?: number
  purchaseOrderId?: number
}

// زر "مسح باركود" في قائمة المخزن
inventoryBarcodeHandler.callbackQuery(/^inv:warehouse:(\d+):scan$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  
  await ctx.answerCallbackQuery()
  
  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.barcodeScan = {
    action: 'search',
    warehouseId,
  }
  
  await ctx.editMessageText(
    '📱 **مسح الباركود**\n\n' +
    '📸 أرسل صورة الباركود الآن\n\n' +
    '💡 **نصائح:**\n' +
    '• تأكد من وضوح الصورة\n' +
    '• اجعل الباركود في المنتصف\n' +
    '• تجنب الظلال والانعكاسات',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', `inv:warehouse:${warehouseId}`),
    },
  )
})

// معالج الصور (عند إرسال صورة)
inventoryBarcodeHandler.on('message:photo', async (ctx) => {
  // التحقق من وجود حالة مسح نشطة
  if (!ctx.session?.barcodeScan) {
    return // ليس في وضع مسح باركود
  }

  const state = ctx.session.barcodeScan as BarcodeScanState

  try {
    // جلب الصورة
    const photo = ctx.message.photo[ctx.message.photo.length - 1] // أكبر صورة
    const file = await ctx.api.getFile(photo.file_id)
    const fileUrl = await ctx.api.getFileLink(file.file_id)
    
    // تحميل الصورة
    const response = await fetch(fileUrl.href)
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    
    // قراءة الباركود
    await ctx.reply('🔍 جاري قراءة الباركود...')
    const result = await BarcodeScannerService.scanBarcode(imageBuffer)
    
    if (!result || !result.data) {
      await ctx.reply('❌ لم يتم العثور على باركود في الصورة. حاول مرة أخرى.')
      return
    }

    const sku = result.data.trim()
    
    // البحث عن الصنف
    const itemData = await InventoryBarcodeService.findItemWithStocks(sku)
    
    if (!itemData) {
      // الصنف غير موجود
      await ctx.reply(
        `❌ **الصنف غير موجود**\n\n` +
        `الباركود المقروء: \`${sku}\`\n\n` +
        `هل تريد إضافة هذا الصنف؟`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('➕ إضافة صنف جديد', `inv:item:add:${sku}`)
            .row()
            .text('🔄 إعادة المحاولة', `inv:warehouse:${state.warehouseId}:scan`),
        },
      )
      return
    }

    // الصنف موجود - عرض البيانات
    await handleBarcodeScanResult(ctx, itemData, state)
    
  } catch (error) {
    logger.error({ error }, 'Error scanning barcode')
    await ctx.reply('❌ حدث خطأ أثناء قراءة الباركود. حاول مرة أخرى.')
  }
})

// معالج عرض نتيجة المسح
async function handleBarcodeScanResult(
  ctx: Context,
  itemData: { item: Item; stocks: Array<{ warehouse: Warehouse; quantity: number; averageCost: number }> },
  state: BarcodeScanState,
) {
  const { item, stocks } = itemData

  // بناء رسالة العرض
  let message = `📦 **${item.name}**\n\n`
  message += `🏷️ **SKU:** \`${item.sku}\`\n`
  message += `📊 **الفئة:** ${item.category.name}\n`
  message += `📏 **الوحدة:** ${item.unit}\n\n`

  if (stocks.length > 0) {
    message += `📊 **الأرصدة المتاحة:**\n`
    stocks.forEach(stock => {
      const icon = getWarehouseIcon(stock.warehouse.type)
      message += `• ${icon} ${stock.warehouse.name}: ${stock.quantity} ${item.unit} (${stock.averageCost} جنيه)\n`
    })
  } else {
    message += `⚠️ **لا يوجد رصيد في أي مخزن**\n`
  }

  // بناء الأزرار حسب الإجراء
  const keyboard = new InlineKeyboard()

  if (state.action === 'search') {
    // عرض جميع الخيارات
    keyboard
      .text('📥 استلام', `inv:receiving:start:${item.id}`)
      .text('📤 صرف', `inv:dispensing:start:${item.id}`)
      .row()
      .text('🔐 عهدة', `inv:custody:issue:${item.id}`)
      .text('↩️ إرجاع', `inv:return:start:${item.id}`)
      .row()
      .text('📋 تفاصيل الصنف', `inv:item:details:${item.id}`)
      .row()
      .text('⬅️ رجوع', `inv:warehouse:${state.warehouseId}`)
  } else if (state.action === 'receiving') {
    // أثناء الاستلام
    keyboard
      .text('✅ استخدام هذا الصنف', `inv:receiving:add-item:${item.id}:${state.purchaseOrderId}`)
      .row()
      .text('🔄 مسح آخر', `inv:warehouse:${state.warehouseId}:scan`)
      .row()
      .text('❌ إلغاء', `inv:receiving:cancel:${state.purchaseOrderId}`)
  } else if (state.action === 'dispensing') {
    // أثناء الصرف
    keyboard
      .text('✅ صرف هذا الصنف', `inv:dispensing:add-item:${item.id}:${state.warehouseId}`)
      .row()
      .text('🔄 مسح آخر', `inv:warehouse:${state.warehouseId}:scan`)
      .row()
      .text('❌ إلغاء', `inv:warehouse:${state.warehouseId}`)
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })

  // مسح الحالة
  delete ctx.session.barcodeScan
}
```

### **3. دمج الباركود في عمليات الاستلام**

```typescript
// handlers/receiving.handler.ts
receivingHandler.callbackQuery(/^inv:receiving:scan$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.barcodeScan = {
    action: 'receiving',
    purchaseOrderId: ctx.session.currentPurchaseOrder?.id,
  }
  
  await ctx.editMessageText(
    '📱 **مسح الباركود للاستلام**\n\n' +
    '📸 أرسل صورة الباركود أو أدخل SKU يدوياً',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⌨️ إدخال يدوي', 'inv:receiving:manual-sku')
        .row()
        .text('❌ إلغاء', 'inv:receiving:cancel'),
    },
  )
})
```

### **4. دعم الإدخال اليدوي (Fallback)**

```typescript
// إذا فشل المسح أو المستخدم يفضل الإدخال اليدوي
receivingHandler.callbackQuery('inv:receiving:manual-sku', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  ctx.session = ctx.session || {}
  ctx.session.waitingForSku = true
  
  await ctx.editMessageText(
    '⌨️ **إدخال SKU يدوياً**\n\n' +
    '📝 أرسل رقم الباركود (SKU) الآن:',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', 'inv:receiving:cancel'),
    },
  )
})

// معالج الرسائل النصية (SKU)
receivingHandler.on('message:text', async (ctx) => {
  if (!ctx.session?.waitingForSku) {
    return // ليس في وضع انتظار SKU
  }

  const sku = ctx.message.text.trim()
  
  // البحث عن الصنف
  const itemData = await InventoryBarcodeService.findItemWithStocks(sku)
  
  if (!itemData) {
    await ctx.reply('❌ الصنف غير موجود. حاول مرة أخرى أو أرسل "إلغاء"')
    return
  }

  // نفس منطق عرض النتيجة
  await handleBarcodeScanResult(ctx, itemData, {
    action: 'receiving',
    purchaseOrderId: ctx.session.currentPurchaseOrder?.id,
  })

  delete ctx.session.waitingForSku
})
```

---

## 📊 خريطة التدفقات

### **السيناريو 1: البحث السريع**
```
قائمة المخزن
  ↓
[📱 مسح باركود]
  ↓
أرسل صورة
  ↓
قراءة الباركود
  ↓
البحث في قاعدة البيانات
  ↓
عرض النتائج + خيارات
```

### **السيناريو 2: الاستلام**
```
قائمة الاستلام
  ↓
[➕ إضافة صنف]
  ↓
[📱 مسح باركود] أو [⌨️ إدخال يدوي]
  ↓
قراءة/إدخال SKU
  ↓
البحث عن الصنف
  ↓
إذا وُجد: إدخال الكمية والسعر
إذا لم يُوجد: إضافة صنف جديد
```

### **السيناريو 3: الصرف**
```
قائمة الصرف
  ↓
[📱 مسح باركود]
  ↓
قراءة الباركود
  ↓
البحث عن الصنف
  ↓
عرض الرصيد المتاح
  ↓
إدخال الكمية + ربط بالمعدة/الموظف
```

---

## ✅ التوصيات

### **1. استخدام BarcodeScannerService مباشرة**
- ✅ لا حاجة لتعديل الخدمة
- ✅ استخدام `scanBarcode(imageBuffer)` مباشرة
- ✅ معالجة الأخطاء (null إذا فشل)

### **2. إنشاء خدمة منفصلة للبحث**
- ✅ `InventoryBarcodeService.findItemByBarcode(sku)`
- ✅ فصل منطق البحث عن منطق المسح
- ✅ قابل للاختبار

### **3. استخدام Session State**
- ✅ حفظ حالة المسح في `ctx.session`
- ✅ تتبع الإجراء الحالي (search, receiving, dispensing)
- ✅ ربط بالعملية الجارية (warehouseId, purchaseOrderId)

### **4. دعم الإدخال اليدوي**
- ✅ Fallback إذا فشل المسح
- ✅ خيار "إدخال يدوي" دائماً متاح
- ✅ نفس المنطق للبحث

### **5. معالجة الأخطاء**
- ✅ إذا لم يُوجد باركود في الصورة
- ✅ إذا لم يُوجد الصنف في قاعدة البيانات
- ✅ إذا فشلت قراءة الصورة

---

## 🚀 خطة التنفيذ

### **المرحلة 1: الخدمة الأساسية**
1. ✅ إنشاء `InventoryBarcodeService`
2. ✅ دالة `findItemByBarcode(sku)`
3. ✅ دالة `findItemWithStocks(sku)`

### **المرحلة 2: Handler المسح**
1. ✅ إنشاء `inventory-barcode.handler.ts`
2. ✅ زر "مسح باركود" في قائمة المخزن
3. ✅ معالج الصور (message:photo)
4. ✅ عرض النتائج

### **المرحلة 3: الدمج في العمليات**
1. ✅ دمج في الاستلام (receiving)
2. ✅ دمج في الصرف (dispensing)
3. ✅ دعم الإدخال اليدوي

### **المرحلة 4: التحسينات**
1. ⏳ تحسين دقة قراءة الباركود (مكتبة متخصصة)
2. ⏳ دعم أنواع باركود متعددة
3. ⏳ سجل المسح (Scan History)

---

## 📝 ملاحظات

### **القيود الحالية:**
- ⚠️ BarcodeScannerService يستخدم QR scanner للباركود (قد يحتاج تحسين)
- ⚠️ Handler معطل حالياً (يجب تفعيله بشكل انتقائي)

### **التحسينات المستقبلية:**
- 🔮 استخدام مكتبة متخصصة للباركود (مثل `jsbarcode` أو `barcode-detector`)
- 🔮 دعم أنواع باركود متعددة (EAN-13, UPC-A, Code 128)
- 🔮 تحسين دقة القراءة
- 🔮 دعم المسح المتعدد (Multiple scans)

---

**تم إعداد هذا التحليل بواسطة:** AI Assistant  
**آخر تحديث:** 2025-01-XX

