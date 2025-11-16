# 📦 قالب نظام المخازن - Template System
## نموذج موحد لجميع المخازن (قطع الغيار، زيوت، سولار، عدد وأدوات)

---

## 🎯 الفلسفة العامة للقالب

**هذا القالب مصمم ليكون:**
- ✅ **مرن**: يتكيف مع أي نوع مخزن
- ✅ **موحّد**: نفس التجربة في جميع المخازن
- ✅ **قابل للتوسع**: إضافة ميزات جديدة بسهولة
- ✅ **احترافي**: يغطي جميع احتياجات الإدارة

---

## 📊 الهيكل الموحد (Unified Structure)

### **القوائم الرئيسية (4 مستويات)**

```
المستوى 1: المخازن
├── المستوى 2: المخزن المحدد (قطع الغيار)
    ├── المستوى 3: الوظيفة (إدارة الأصناف)
        └── المستوى 4: العملية (إضافة صنف)
```

---

## 🗂️ **الوظائف الأساسية (Core Features) - 7 أقسام**

### ✅ جميع المخازن تحتوي على نفس الأقسام السبعة:

---

## 1️⃣ **إدارة الأصناف** 📦

### **الوظائف الفرعية:**

```
📦 إدارة الأصناف

┌─────────────────────────────────────┐
│  ➕ إضافة صنف جديد                  │
│  ✏️ تعديل صنف                       │
│  🗑️ حذف/إيقاف صنف                  │
│  🔍 البحث عن صنف                   │
│  📊 عرض جميع الأصناف                │
│  📸 مسح باركود                      │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

#### **التدفق الموحد: إضافة صنف جديد**

```typescript
interface AddItemWorkflow {
  // خطوة 1: الباركود
  step1_Barcode: {
    options: ['📸 مسح صورة', '✍️ إدخال يدوي', '🎲 توليد تلقائي']
    validation: 'EAN-13 (13 رقم)'
  }
  
  // خطوة 2: المعلومات الأساسية
  step2_BasicInfo: {
    nameAr: string          // إجباري
    nameEn?: string         // اختياري
    description?: string    // اختياري
  }
  
  // خطوة 3: التصنيف
  step3_Category: {
    categoryId: number      // من القائمة المعرفة مسبقاً
    subcategory?: string    // اختياري (يعتمد على المخزن)
  }
  
  // خطوة 4: الموقع
  step4_Location: {
    locationId: number      // من القائمة المعرفة
    options: ['➕ إضافة موقع جديد']
  }
  
  // خطوة 5: الكميات والأسعار
  step5_QuantityPrice: {
    quantity: number        // إجباري
    unit: string           // قطعة، لتر، كجم، إلخ
    unitPrice: number      // إجباري
    minQuantity: number    // الحد الأدنى
    maxQuantity?: number   // اختياري
  }
  
  // خطوة 6: الحالة والمواصفات (مرنة حسب المخزن)
  step6_ConditionSpecs: {
    condition: 'NEW' | 'USED' | 'REFURBISHED'
    // حقول مخصصة لكل مخزن:
    customFields: Record<string, any>
  }
  
  // خطوة 7: الصور والمرفقات
  step7_MediaAttachments: {
    mainImage?: Buffer      // الصورة الرئيسية
    additionalImages?: Buffer[]  // صور إضافية (حتى 5)
    documents?: Buffer[]    // مستندات PDF
  }
  
  // خطوة 8: المراجعة والتأكيد
  step8_ReviewConfirm: {
    summary: ItemSummary
    actions: ['✅ حفظ', '✏️ تعديل', '❌ إلغاء']
  }
}
```

---

## 2️⃣ **الحركات والمعاملات** 📊

### **الوظائف الفرعية:**

```
📊 الحركات والمعاملات

┌─────────────────────────────────────┐
│  ➕ إدخال كمية (شراء/إضافة)         │
│  ➖ إخراج كمية (استخدام/صرف)       │
│  🔄 نقل بين مواقع                   │
│  ↩️ إرجاع                           │
│  ⚖️ تسوية جرد                       │
│  🔍 استعلام عن حركة                 │
│  📋 سجل الحركات                     │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

#### **التدفق الموحد: إدخال كمية**

```typescript
interface InboundTransactionWorkflow {
  // خطوة 1: اختيار الصنف
  step1_SelectItem: {
    method: '📸 مسح باركود' | '🔍 بحث' | '📋 من القائمة'
    itemId: number
  }
  
  // خطوة 2: الكمية
  step2_Quantity: {
    quantity: number
    unit: string  // يُملأ تلقائياً من بيانات الصنف
    validation: 'يجب أن تكون > 0'
  }
  
  // خطوة 3: بيانات الفاتورة
  step3_InvoiceData: {
    invoiceNumber: string
    supplierName: string
    unitPrice: number
    totalCost: number  // حساب تلقائي
    invoiceDate: Date
  }
  
  // خطوة 4: الموقع
  step4_Location: {
    toLocationId: number
    note: 'سيتم تحديث موقع الصنف'
  }
  
  // خطوة 5: المرفقات
  step5_Attachments: {
    invoicePhoto?: Buffer
    deliveryNote?: Buffer
    qualityCertificate?: Buffer
  }
  
  // خطوة 6: ملاحظات
  step6_Notes: {
    notes?: string
    reason?: string
  }
  
  // خطوة 7: المراجعة والتأكيد
  step7_Confirm: {
    summary: {
      item: ItemInfo
      quantityBefore: number
      quantityAdded: number
      quantityAfter: number
      valueBefore: number
      valueAfter: number
    }
    actions: ['✅ تأكيد', '❌ إلغاء']
  }
}
```

#### **التدفق الموحد: إخراج كمية**

```typescript
interface OutboundTransactionWorkflow {
  // خطوة 1: اختيار الصنف
  step1_SelectItem: {
    method: '📸 مسح باركود' | '🔍 بحث'
    itemId: number
    checkAvailability: true  // تحقق من الكمية المتاحة
  }
  
  // خطوة 2: الكمية
  step2_Quantity: {
    quantity: number
    availableQuantity: number  // للتحقق
    validation: 'quantity <= availableQuantity'
  }
  
  // خطوة 3: تفاصيل الاستخدام
  step3_UsageDetails: {
    purpose: 'PROJECT' | 'MAINTENANCE' | 'SALE' | 'OTHER'
    projectId?: number       // إذا كان للمشروع
    equipmentId?: number     // إذا كان للمعدة
    employeeId?: number      // المستلم
    customerName?: string    // إذا كان بيع
  }
  
  // خطوة 4: تأكيد الإخراج
  step4_Confirm: {
    requiresApproval: boolean  // حسب الصلاحيات
    summary: TransactionSummary
    actions: ['✅ تأكيد', '❌ إلغاء']
  }
}
```

---

## 3️⃣ **إدارة الهوالك/التالف** 🗑️

### **الوظائف الفرعية:**

```
🗑️ إدارة الهوالك

┌─────────────────────────────────────┐
│  ⚠️ تسجيل صنف تالف                  │
│  📋 عرض سجل الهوالك                 │
│  ✅ الموافقة على التخلص              │
│  💰 تقييم قيمة الهوالك              │
│  📊 تقرير الهوالك الشهري            │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

#### **التدفق الموحد: تسجيل صنف تالف**

```typescript
interface DamageRecordWorkflow {
  // خطوة 1: اختيار الصنف التالف
  step1_SelectItem: {
    method: '📸 مسح باركود' | '🔍 بحث'
    itemId: number
    currentQuantity: number  // للمعلومات
  }
  
  // خطوة 2: تفاصيل التلف
  step2_DamageDetails: {
    damageType: 'EXPIRED' | 'BROKEN' | 'DEFECTIVE' | 'WATER_DAMAGE' | 'CORROSION' | 'OTHER'
    damageDate: Date
    discoveredBy: number  // User ID
    quantity: number
    damageSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'TOTAL_LOSS'
  }
  
  // خطوة 3: سبب التلف
  step3_DamageReason: {
    reason: string  // نص حر
    isRepairable: boolean
    repairCost?: number  // إذا كان قابل للإصلاح
  }
  
  // خطوة 4: صور التلف
  step4_Photos: {
    photos: Buffer[]  // حتى 5 صور
    note: 'صور توثيقية للتلف'
  }
  
  // خطوة 5: الإجراء المقترح
  step5_ProposedAction: {
    actionTaken: 'REPAIR' | 'RECYCLE' | 'SELL_SCRAP' | 'DISPOSE' | 'PENDING'
    recoveredValue?: number  // القيمة المتوقع استردادها
    notes?: string
  }
  
  // خطوة 6: المراجعة
  step6_Review: {
    summary: {
      item: ItemInfo
      damageQuantity: number
      totalValue: number  // قيمة الهالك
      proposedAction: string
    }
    needsApproval: boolean  // إذا تجاوزت قيمة معينة
    actions: ['✅ تسجيل', '📤 إرسال للموافقة', '❌ إلغاء']
  }
}
```

---

## 4️⃣ **التقارير والإحصائيات** 📈

### **الوظائف الفرعية:**

```
📈 التقارير

┌─────────────────────────────────────┐
│  📊 ملخص المخزون                    │
│  ⚠️ تنبيهات النقص                   │
│  💰 تقرير القيمة المالية           │
│  📉 حركات فترة معينة                │
│  🏷️ تقرير حسب التصنيف               │
│  📍 تقرير حسب الموقع                │
│  🗑️ تقرير الهوالك                   │
│  📤 تصدير Excel                     │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

#### **التقارير الموحدة:**

```typescript
interface ReportTemplates {
  // 1. ملخص المخزون
  stockSummary: {
    totalItems: number
    totalQuantity: number
    totalValue: number
    byCategory: CategoryBreakdown[]
    byLocation: LocationBreakdown[]
    byCondition: ConditionBreakdown[]
  }
  
  // 2. تنبيهات النقص
  lowStockAlerts: {
    criticalItems: Item[]  // نفذت
    warningItems: Item[]   // أقل من الحد
    okItems: number        // طبيعي
  }
  
  // 3. تقرير مالي
  financialReport: {
    period: DateRange
    totalPurchases: number
    totalWithdrawals: number
    totalDamages: number
    currentValue: number
    changePercent: number
  }
  
  // 4. حركات الفترة
  periodTransactions: {
    period: DateRange
    inbound: Transaction[]
    outbound: Transaction[]
    transfers: Transaction[]
    adjustments: Transaction[]
    summary: TransactionSummary
  }
  
  // 5. تقرير الهوالك
  damageReport: {
    period: DateRange
    totalDamages: number
    totalValue: number
    byType: DamageTypeBreakdown[]
    topDamagedItems: Item[]
    recoveredValue: number
  }
}
```

---

## 5️⃣ **الإعدادات** ⚙️

### **الوظائف الفرعية:**

```
⚙️ الإعدادات

┌─────────────────────────────────────┐
│  🏷️ إدارة التصنيفات                 │
│  📍 إدارة المواقع                   │
│  📏 إدارة الوحدات                   │
│  🔔 إعدادات التنبيهات               │
│  🖨️ إعدادات الطباعة                 │
│  📤 إعدادات التصدير                 │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

---

## 6️⃣ **البحث المتقدم** 🔍

```
🔍 البحث المتقدم

┌─────────────────────────────────────┐
│  📸 مسح باركود                      │
│  🔢 بالكود                          │
│  📝 بالاسم                          │
│  🏷️ بالتصنيف                        │
│  📍 بالموقع                         │
│  💰 نطاق سعري                       │
│  📊 بالكمية                         │
│  📅 بالتاريخ                        │
│  🎯 بحث متعدد المعايير               │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

---

## 7️⃣ **الأدوات المساعدة** 🛠️

```
🛠️ أدوات إضافية

┌─────────────────────────────────────┐
│  🖨️ طباعة باركود                    │
│  📦 جرد سريع                        │
│  🔄 مزامنة البيانات                 │
│  📋 نسخ احتياطي                     │
│  📊 تحليلات متقدمة                  │
│  ⬅️ رجوع                           │
└─────────────────────────────────────┘
```

---

## 🎨 **الحقول المخصصة لكل مخزن**

### **نموذج المرونة:**

```typescript
interface InventoryTemplate {
  // الحقول المشتركة (جميع المخازن)
  commonFields: {
    id: number
    code: string
    barcode: string
    nameAr: string
    nameEn?: string
    categoryId: number
    locationId: number
    quantity: number
    unit: string
    unitPrice: number
    condition: 'NEW' | 'USED' | 'REFURBISHED'
    status: string
    // ... إلخ
  }
  
  // الحقول المخصصة (تختلف حسب المخزن)
  customFields: Record<string, CustomField>
}

// مثال: قطع الغيار
const sparePartsCustomFields = {
  partNumber: { type: 'string', label: 'رقم القطعة', required: false },
  manufacturer: { type: 'string', label: 'الشركة المصنعة', required: false },
  model: { type: 'string', label: 'الموديل', required: false },
  yearFrom: { type: 'number', label: 'من سنة', required: false },
  yearTo: { type: 'number', label: 'إلى سنة', required: false }
}

// مثال: الزيوت والشحوم
const oilsCustomFields = {
  viscosity: { type: 'string', label: 'اللزوجة', required: true },
  oilType: { type: 'enum', label: 'نوع الزيت', options: ['محرك', 'هيدروليك', 'شحم'], required: true },
  volume: { type: 'number', label: 'الحجم (لتر)', required: true },
  expiryDate: { type: 'date', label: 'تاريخ الانتهاء', required: false }
}

// مثال: السولار
const dieselCustomFields = {
  octaneRating: { type: 'number', label: 'رقم الأوكتان', required: false },
  density: { type: 'number', label: 'الكثافة', required: false },
  storageTemp: { type: 'string', label: 'درجة حرارة التخزين', required: false }
}

// مثال: العدد والأدوات
const toolsCustomFields = {
  brand: { type: 'string', label: 'الماركة', required: false },
  warrantyPeriod: { type: 'number', label: 'فترة الضمان (شهر)', required: false },
  calibrationDate: { type: 'date', label: 'تاريخ المعايرة', required: false },
  nextCalibrationDate: { type: 'date', label: 'موعد المعايرة القادم', required: false }
}
```

---

## 📱 **نموذج رسالة موحد**

### **قالب عرض الصنف:**

```typescript
function formatItemDisplay(item: InventoryItem, template: InventoryTemplate) {
  return `
🖼️ ${item.imagePath ? '[صورة المنتج]' : '📦'}

📦 **${item.nameAr}**
${item.nameEn ? `🔤 ${item.nameEn}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **معلومات أساسية:**
🔢 الكود: \`${item.code}\`
📊 الباركود: \`${item.barcode}\`
🏷️ التصنيف: ${item.category.nameAr}
📍 الموقع: ${item.location.nameAr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **المخزون:**
📊 الكمية: ${item.quantity} ${item.unit}
⚠️ الحد الأدنى: ${item.minQuantity} ${item.unit}
${item.quantity < item.minQuantity ? '🔴 تحذير: أقل من الحد الأدنى!' : '🟢 الكمية طبيعية'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **القيمة:**
💵 سعر الوحدة: ${item.unitPrice.toLocaleString()} جنيه
💎 القيمة الإجمالية: ${(item.quantity * item.unitPrice).toLocaleString()} جنيه

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 **الحالة:**
${getConditionIcon(item.condition)} ${getConditionText(item.condition)}
${getStatusIcon(item.status)} ${getStatusText(item.status)}
${item.isDamaged ? '⚠️ يوجد كميات تالفة: ' + item.damageQuantity : ''}

${template.customFields ? formatCustomFields(item, template.customFields) : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 آخر تحديث: ${formatDate(item.updatedAt)}
👤 بواسطة: ${item.updatedByName}

${item.notes ? `📝 ملاحظات: ${item.notes}` : ''}
`
}
```

---

## 🔄 **نموذج معالجة الباركود الموحد**

```typescript
interface BarcodeHandler {
  async scanBarcode(photo: Buffer): Promise<BarcodeResult | null>
  async generateBarcode(prefix: string): Promise<string>
  async validateBarcode(barcode: string): Promise<boolean>
  async printBarcodeLabel(item: InventoryItem): Promise<Buffer>
}

// مثال: توليد باركود ذكي
async function generateSmartBarcode(
  warehouseCode: string,  // "SP" = Spare Parts, "OL" = Oils, "DS" = Diesel, "TL" = Tools
  categoryCode: string,   // "CAR", "LOADER", etc.
  sequence: number
): Promise<string> {
  // نظام EAN-13
  // 628 (Egypt) + 2 digits (warehouse) + 2 digits (category) + 5 digits (sequence) + 1 check digit
  
  const country = '628'  // مصر
  const warehouse = getWarehouseDigits(warehouseCode)  // "01" = قطع غيار
  const category = getCategoryDigits(categoryCode)     // "01" = سيارات
  const seq = sequence.toString().padStart(5, '0')
  
  const barcode12 = country + warehouse + category + seq
  const checkDigit = calculateEAN13CheckDigit(barcode12)
  
  return barcode12 + checkDigit
}

// مثال: 6280101000123
// 628: مصر
// 01: قطع الغيار
// 01: سيارات
// 00012: رقم تسلسلي
// 3: رقم تحقق
```

---

## 📂 **نموذج حفظ الصور الموحد**

```typescript
interface MediaHandler {
  async saveItemImage(
    warehouseType: string,  // 'spare-parts', 'oils-greases', 'diesel', 'tools-equipment'
    barcode: string,
    imageBuffer: Buffer,
    imageIndex: number = 0  // 0 = main, 1-5 = additional
  ): Promise<string>  // Returns: path
  
  async deleteItemImage(path: string): Promise<boolean>
  async getItemImages(barcode: string): Promise<string[]>
}

// مثال: المسار المتولد
// uploads/inventory/spare-parts/6280101000123.jpg (الرئيسية)
// uploads/inventory/spare-parts/6280101000123_1.jpg (إضافية 1)
// uploads/inventory/spare-parts/6280101000123_2.jpg (إضافية 2)
```

---

## 🎯 **الخلاصة: كيفية استخدام القالب**

### **لإنشاء مخزن جديد:**

1. **نسخ Schema** من `inventory-spare-parts.prisma`
2. **تعديل الأسماء**: `INV_SparePart` → `INV_Oil`
3. **إضافة/حذف حقول مخصصة** حسب الحاجة
4. **نسخ Handlers** من مخزن قطع الغيار
5. **تعديل Callback Patterns**: `inv:spare-parts` → `inv:oils`
6. **تخصيص التصنيفات** حسب المخزن الجديد
7. **تشغيل Migration**: `npx prisma migrate dev`

---

## 📊 **جدول مقارنة المخازن**

| الميزة | قطع الغيار | الزيوت | السولار | العدد |
|--------|-----------|--------|---------|-------|
| الباركود | ✅ | ✅ | ✅ | ✅ |
| التصنيفات | حسب المعدة | حسب النوع | حسب الدرجة | حسب الاستخدام |
| الوحدات | قطعة، طقم | لتر، برميل | لتر، جالون | قطعة، عبوة |
| تاريخ الانتهاء | ❌ | ✅ | ✅ | ❌ |
| المعايرة | ❌ | ❌ | ❌ | ✅ (للأدوات الدقيقة) |
| الهوالك | ✅ | ✅ | ⚠️ نادر | ✅ |
| الصور | ✅ | ✅ | ✅ | ✅ |

---

**📅 آخر تحديث:** 9 نوفمبر 2025  
**📝 الحالة:** قالب جاهز للتطبيق على جميع المخازن  
**🎯 الهدف:** توحيد تجربة المستخدم عبر جميع المخازن
