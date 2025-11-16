# 🗄️ مخزن قطع الغيار - هيكل قاعدة البيانات

**النسخة:** 2.0  
**آخر تحديث:** نوفمبر 2025

---

## 📊 نظرة عامة على قاعدة البيانات

يستخدم نظام مخزن قطع الغيار **8 جداول رئيسية** مترابطة لتوفير إدارة شاملة ودقيقة للمخزون.

### الجداول الرئيسية
1. **`INV_SparePart`** - قطع الغيار
2. **`INV_Category`** - التصنيفات
3. **`INV_Location`** - مواقع التخزين
4. **`INV_Transaction`** - الحركات والمعاملات
5. **`INV_TransactionItem`** - تفاصيل الحركات
6. **`departmentConfig`** - إعدادات القسم
7. **`departmentAdmin`** - مسؤولو القسم
8. **`Employee`** - الموظفين

---

## 📦 الجدول الرئيسي: `INV_SparePart`

### الوصف
يحتوي على جميع بيانات قطع الغيار المسجلة في النظام.

### الحقول

| الحقل | النوع | المفتاح | الوصف | مثال |
|-------|-------|---------|-------|------|
| **id** | Int | PK, AI | المعرّف الفريد للقطعة | 1, 2, 3 |
| **barcode** | String | Unique | الباركود (فريد) | "6282737348585" |
| **code** | String | Unique | الكود الداخلي (فريد) | "CAR-00001" |
| **nameAr** | String | - | الاسم بالعربي | "فلتر زيت محرك" |
| **nameEn** | String? | - | الاسم بالإنجليزي (اختياري) | "Oil Filter" |
| **categoryId** | Int | FK | معرّف التصنيف | 1 |
| **locationId** | Int | FK | معرّف الموقع | 2 |
| **condition** | Enum | - | الحالة | NEW, USED, IMPORT |
| **quantity** | Int | - | الكمية الحالية | 50 |
| **minQuantity** | Int | - | الحد الأدنى للكمية | 10 |
| **unit** | String | - | الوحدة | "قطعة", "كرتونة" |
| **unitPrice** | Decimal | - | سعر الوحدة | 25.50 |
| **totalValue** | Decimal | - | القيمة الإجمالية | 1275.00 |
| **images** | Json? | - | مصفوفة روابط الصور | ["url1", "url2"] |
| **notes** | String? | - | ملاحظات إضافية | "تحتاج صيانة شهرية" |
| **createdAt** | DateTime | - | تاريخ الإنشاء | 2025-11-10 |
| **updatedAt** | DateTime | - | تاريخ آخر تحديث | 2025-11-10 |
| **createdBy** | BigInt | FK | معرّف المستخدم المُنشئ | 7594239391 |
| **deletedAt** | DateTime? | - | تاريخ الحذف (إن وُجد) | null |
| **isDeleted** | Boolean | - | هل محذوف؟ | false |

### العلاقات (Relations)
```prisma
model INV_SparePart {
  id          Int       @id @default(autoincrement())
  barcode     String    @unique
  code        String    @unique
  
  // العلاقات
  category    INV_Category  @relation(fields: [categoryId], references: [id])
  location    INV_Location  @relation(fields: [locationId], references: [id])
  transactions INV_TransactionItem[]
  creator     Employee?  @relation(fields: [createdBy], references: [telegramId])
}
```

### الفهارس (Indexes)
```sql
-- فهرس على الباركود (فريد)
CREATE UNIQUE INDEX "INV_SparePart_barcode_key" ON "INV_SparePart"("barcode");

-- فهرس على الكود (فريد)
CREATE UNIQUE INDEX "INV_SparePart_code_key" ON "INV_SparePart"("code");

-- فهرس على التصنيف (للبحث السريع)
CREATE INDEX "INV_SparePart_categoryId_idx" ON "INV_SparePart"("categoryId");

-- فهرس على الموقع (للبحث السريع)
CREATE INDEX "INV_SparePart_locationId_idx" ON "INV_SparePart"("locationId");

-- فهرس على الحذف (لتصفية المحذوفات)
CREATE INDEX "INV_SparePart_isDeleted_idx" ON "INV_SparePart"("isDeleted");
```

### القيود (Constraints)
- **barcode:** يجب أن يكون فريداً ولا يمكن تكراره
- **code:** يتم توليده تلقائياً بنمط `{CATEGORY_CODE}-{NUMBER}`
- **quantity:** يجب أن تكون >= 0
- **minQuantity:** القيمة الافتراضية 5
- **unitPrice:** القيمة الافتراضية 0.00
- **totalValue:** محسوبة تلقائياً (quantity × unitPrice)

---

## 🏷️ جدول التصنيفات: `INV_Category`

### الوصف
يحتوي على تصنيفات قطع الغيار (سيارات، معدات ثقيلة، إلخ).

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|-------|-------|------|
| **id** | Int | المعرّف الفريد | 1 |
| **code** | String | كود التصنيف (لتوليد الأكواد) | "CAR" |
| **nameAr** | String | الاسم بالعربي | "سيارات" |
| **nameEn** | String? | الاسم بالإنجليزي | "Cars" |
| **icon** | String | الإيموجي/الأيقونة | "🚗" |
| **description** | String? | الوصف | "قطع غيار السيارات" |
| **isActive** | Boolean | نشط؟ | true |
| **createdAt** | DateTime | تاريخ الإنشاء | 2025-11-10 |

### العلاقات
```prisma
model INV_Category {
  id        Int            @id @default(autoincrement())
  code      String         @unique
  parts     INV_SparePart[]  // قطع الغيار التابعة
}
```

### أمثلة على التصنيفات
```sql
INSERT INTO "INV_Category" (code, nameAr, nameEn, icon, isActive) VALUES
  ('CAR', 'سيارات', 'Cars', '🚗', true),
  ('LOADER', 'لودر', 'Loader', '🚜', true),
  ('BULLDOZER', 'بلدوزر', 'Bulldozer', '🏗️', true),
  ('EXCAVATOR', 'حفار', 'Excavator', '⛏️', true),
  ('GENERAL', 'عام', 'General', '🔧', true);
```

---

## 📍 جدول المواقع: `INV_Location`

### الوصف
يحتوي على مواقع تخزين قطع الغيار (أرفف، كرفانات، مستودعات).

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|-------|-------|------|
| **id** | Int | المعرّف الفريد | 1 |
| **code** | String | كود الموقع | "A1" |
| **nameAr** | String | الاسم بالعربي | "رف A1 - المخزن الرئيسي" |
| **nameEn** | String? | الاسم بالإنجليزي | "Shelf A1 - Main Store" |
| **icon** | String | الإيموجي/الأيقونة | "📍" |
| **description** | String? | الوصف | "الرف الأول في المخزن الرئيسي" |
| **capacity** | Int? | السعة القصوى | 100 |
| **isActive** | Boolean | نشط؟ | true |
| **createdAt** | DateTime | تاريخ الإنشاء | 2025-11-10 |

### العلاقات
```prisma
model INV_Location {
  id        Int            @id @default(autoincrement())
  code      String         @unique
  parts     INV_SparePart[]  // قطع الغيار المخزنة
}
```

### أمثلة على المواقع
```sql
INSERT INTO "INV_Location" (code, nameAr, icon, isActive) VALUES
  ('A1', 'رف A1 - المخزن الرئيسي', '📍', true),
  ('A2', 'رف A2 - المخزن الرئيسي', '📍', true),
  ('C5', 'كرفان قطع الغيار رقم 5', '🏪', true),
  ('W1', 'مستودع 1', '🏭', true);
```

---

## 📊 جدول الحركات: `INV_Transaction`

### الوصف
يسجل جميع حركات المخزون (إدخال، إخراج، نقل، إرجاع، تسوية).

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|-------|-------|------|
| **id** | Int | المعرّف الفريد | 1 |
| **type** | Enum | نوع الحركة | IN, OUT, TRANSFER, RETURN, ADJUST |
| **referenceNumber** | String | رقم المرجع/الفاتورة | "INV-2025-001" |
| **date** | DateTime | تاريخ الحركة | 2025-11-10 |
| **description** | String? | الوصف | "شراء دفعة جديدة" |
| **fromLocationId** | Int? | من موقع (للنقل) | 1 |
| **toLocationId** | Int? | إلى موقع (للنقل) | 2 |
| **totalValue** | Decimal | القيمة الإجمالية | 5000.00 |
| **createdBy** | BigInt | معرّف المنفذ | 7594239391 |
| **createdAt** | DateTime | تاريخ الإنشاء | 2025-11-10 |
| **approvedBy** | BigInt? | معرّف المُعتمد | null |
| **approvedAt** | DateTime? | تاريخ الاعتماد | null |

### أنواع الحركات (Transaction Types)
```typescript
enum TransactionType {
  IN          // إدخال كمية (شراء)
  OUT         // إخراج كمية (صرف)
  TRANSFER    // نقل بين مواقع
  RETURN      // إرجاع للمخزن
  ADJUST      // تسوية جرد
}
```

### العلاقات
```prisma
model INV_Transaction {
  id              Int       @id @default(autoincrement())
  type            TransactionType
  
  items           INV_TransactionItem[]  // تفاصيل القطع
  fromLocation    INV_Location?  @relation("FromLocation")
  toLocation      INV_Location?  @relation("ToLocation")
  creator         Employee?  @relation(fields: [createdBy])
}
```

---

## 📝 جدول تفاصيل الحركات: `INV_TransactionItem`

### الوصف
يحتوي على تفاصيل كل قطعة في الحركة.

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|-------|-------|------|
| **id** | Int | المعرّف الفريد | 1 |
| **transactionId** | Int | معرّف الحركة | 1 |
| **sparePartId** | Int | معرّف القطعة | 5 |
| **quantity** | Int | الكمية | 10 |
| **unitPrice** | Decimal | سعر الوحدة | 25.50 |
| **totalValue** | Decimal | القيمة الإجمالية | 255.00 |
| **notes** | String? | ملاحظات | "حالة جيدة" |

### العلاقات
```prisma
model INV_TransactionItem {
  id            Int              @id @default(autoincrement())
  transaction   INV_Transaction  @relation(fields: [transactionId])
  sparePart     INV_SparePart    @relation(fields: [sparePartId])
}
```

---

## ⚙️ جدول إعدادات القسم: `departmentConfig`

### الوصف
يحتوي على إعدادات قسم إدارة المخازن.

### الحقول المهمة

| الحقل | النوع | الوصف | القيمة |
|-------|-------|-------|--------|
| **id** | Int | المعرّف الفريد | 12 |
| **code** | String | كود القسم | "inventory-management" |
| **name** | String | اسم القسم | "المخازن" |
| **icon** | String | الأيقونة | "📦" |
| **minAccessLevel** | Enum | الحد الأدنى للصلاحية | ADMIN |
| **superAdminOnly** | Boolean | للسوبر أدمن فقط؟ | false |
| **isEnabled** | Boolean | مفعّل؟ | true |

### مثال السجل
```sql
INSERT INTO "departmentConfig" (code, name, icon, minAccessLevel, superAdminOnly, isEnabled)
VALUES ('inventory-management', 'المخازن', '📦', 'ADMIN', false, true);
```

---

## 👥 جدول مسؤولي القسم: `departmentAdmin`

### الوصف
يربط المسؤولين بقسم المخازن لاستقبال الإشعارات.

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|-------|-------|------|
| **id** | Int | المعرّف الفريد | 1 |
| **departmentId** | Int | معرّف القسم | 12 |
| **telegramId** | BigInt | معرّف تيليجرام للمسؤول | 6272758666 |
| **isActive** | Boolean | نشط؟ | true |
| **createdAt** | DateTime | تاريخ الإضافة | 2025-11-10 |

### العلاقات
```prisma
model departmentAdmin {
  id           Int              @id @default(autoincrement())
  department   departmentConfig @relation(fields: [departmentId])
  telegramId   BigInt
  isActive     Boolean          @default(true)
}
```

---

## 🔗 مخطط العلاقات (ER Diagram)

```
┌─────────────────────┐
│  INV_Category       │
│  - id (PK)          │
│  - code (UQ)        │
│  - nameAr           │
└──────┬──────────────┘
       │ 1
       │
       │ N
┌──────▼──────────────┐       N  ┌──────────────────────┐
│  INV_SparePart      │◄─────────┤ INV_TransactionItem  │
│  - id (PK)          │          │  - id (PK)           │
│  - barcode (UQ)     │          │  - transactionId (FK)│
│  - code (UQ)        │          │  - sparePartId (FK)  │
│  - categoryId (FK)  │          │  - quantity          │
│  - locationId (FK)  │          └──────┬───────────────┘
│  - quantity         │                 │ N
│  - unitPrice        │                 │
└──────┬──────────────┘                 │ 1
       │ N                        ┌─────▼──────────────┐
       │                          │ INV_Transaction    │
       │ 1                        │  - id (PK)         │
┌──────▼──────────────┐           │  - type            │
│  INV_Location       │           │  - date            │
│  - id (PK)          │           │  - createdBy (FK)  │
│  - code (UQ)        │           └────────────────────┘
│  - nameAr           │
└─────────────────────┘

┌──────────────────────┐
│ departmentConfig     │
│  - id (PK)           │
│  - code (UQ)         │◄──┐
│  - name              │   │ 1
└──────────────────────┘   │
                           │ N
                    ┌──────┴──────────────┐
                    │ departmentAdmin     │
                    │  - id (PK)          │
                    │  - departmentId (FK)│
                    │  - telegramId       │
                    └─────────────────────┘
```

---

## 📊 استعلامات شائعة (Common Queries)

### 1. الحصول على قطعة بالباركود
```typescript
const part = await prisma.iNV_SparePart.findUnique({
  where: { barcode: '6282737348585' },
  include: {
    category: true,
    location: true,
  },
})
```

### 2. البحث بالاسم
```typescript
const parts = await prisma.iNV_SparePart.findMany({
  where: {
    OR: [
      { nameAr: { contains: 'فلتر' } },
      { nameEn: { contains: 'filter', mode: 'insensitive' } },
    ],
    isDeleted: false,
  },
})
```

### 3. القطع أقل من الحد الأدنى
```typescript
const lowStock = await prisma.iNV_SparePart.findMany({
  where: {
    quantity: { lt: prisma.iNV_SparePart.fields.minQuantity },
    isDeleted: false,
  },
})
```

### 4. إجمالي قيمة المخزون
```typescript
const totalValue = await prisma.iNV_SparePart.aggregate({
  _sum: { totalValue: true },
  where: { isDeleted: false },
})
```

### 5. عدد القطع بكل تصنيف
```typescript
const stats = await prisma.iNV_SparePart.groupBy({
  by: ['categoryId'],
  _count: { id: true },
  _sum: { quantity: true, totalValue: true },
  where: { isDeleted: false },
})
```

---

## 🔒 الأمان والصلاحيات

### Row Level Security (RLS)
- القطع المحذوفة (`isDeleted = true`) لا تظهر في الاستعلامات العادية
- يمكن للسوبر أدمن فقط رؤية القطع المحذوفة

### Audit Trail
- كل عملية إضافة/تعديل/حذف تُسجل مع:
  - معرّف المستخدم (`createdBy`)
  - التاريخ والوقت (`createdAt`, `updatedAt`)
  - البيانات القديمة (في جدول منفصل إن وُجد)

### Soft Delete
- الحذف ناعم (Soft Delete) لجميع السجلات
- السجلات لا تُحذف فعلياً، بل تُعلّم بـ `isDeleted = true`
- يمكن استرجاع السجلات المحذوفة

---

## 📈 الفهارس والأداء

### الفهارس الأساسية
```sql
-- فهرس البحث بالنص
CREATE INDEX "INV_SparePart_nameAr_idx" ON "INV_SparePart" USING gin(to_tsvector('arabic', "nameAr"));
CREATE INDEX "INV_SparePart_nameEn_idx" ON "INV_SparePart" USING gin(to_tsvector('english', "nameEn"));

-- فهرس الكمية (للتنبيهات)
CREATE INDEX "INV_SparePart_quantity_idx" ON "INV_SparePart"("quantity");

-- فهرس التاريخ (للتقارير)
CREATE INDEX "INV_Transaction_date_idx" ON "INV_Transaction"("date" DESC);
```

### نصائح للأداء
- استخدم `include` بحذر لتجنب N+1 queries
- استخدم `select` لتحديد الحقول المطلوبة فقط
- استخدم pagination للقوائم الطويلة
- استخدم caching للبيانات الثابتة (التصنيفات، المواقع)

---

**📝 ملاحظة:** هذا الهيكل يتطور مع تطور النظام. الرجاء مراجعة ملف `schema.prisma` للحصول على أحدث نسخة.
