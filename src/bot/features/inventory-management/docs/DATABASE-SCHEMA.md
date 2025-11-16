# 🗄️ جداول قاعدة البيانات - مخزن الزيوت والشحوم

> **التوثيق الدقيق والكامل لجداول قاعدة البيانات المستخدمة**

---

## 📊 الجداول المستخدمة (7 جداول)

### 1. INV_OilsGreasesCategory (الفئات)
### 2. INV_OilsGreasesItem (الأصناف)
### 3. INV_OilsGreasesPurchase (الشراء)
### 4. INV_OilsGreasesIssuance (الصرف)
### 5. INV_OilsGreasesTransfer (النقل)
### 6. INV_OilsGreasesReturn (الإرجاع)
### 7. INV_OilsGreasesAdjustment (التسوية)

---

## 1️⃣ INV_OilsGreasesCategory

**الوصف**: أنواع الزيوت والشحوم (زيت محرك، شحم، زيت هيدروليك، إلخ)

```prisma
model INV_OilsGreasesCategory {
  id           Int      @id @default(autoincrement())
  code         String   @unique
  nameAr       String
  nameEn       String?
  description  String?
  prefix       String   @unique
  isActive     Boolean  @default(true)
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdBy    BigInt?
  updatedBy    BigInt?
  
  items        INV_OilsGreasesItem[]
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `code` | String | الكود الفريد | "ENGINE-OIL" |
| `nameAr` | String | الاسم بالعربية | "زيت محرك" |
| `nameEn` | String? | الاسم بالإنجليزية | "Engine Oil" |
| `description` | String? | الوصف | "زيوت محركات السيارات" |
| `prefix` | String | البادئة للكود | "ENG" |
| `isActive` | Boolean | نشط؟ | true |
| `displayOrder` | Int | ترتيب العرض | 1 |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `updatedAt` | DateTime | تاريخ التحديث | 2025-01-17 |
| `createdBy` | BigInt? | من أنشأ | 7594239391 |
| `updatedBy` | BigInt? | من حدّث | 7594239391 |

---

## 2️⃣ INV_OilsGreasesItem

**الوصف**: أصناف الزيوت والشحوم

```prisma
model INV_OilsGreasesItem {
  id               Int      @id @default(autoincrement())
  code             String   @unique
  barcode          String?  @unique
  qrCode           String?
  nameAr           String
  nameEn           String?
  description      String?
  categoryId       Int
  locationId       Int?
  quantity         Float    @default(0)
  minQuantity      Float    @default(5)
  maxQuantity      Float?
  reorderPoint     Float?
  unit             String   @default("لتر")
  unitCapacity     Float?
  supplierName     String?
  supplierContact  String?
  lastPurchaseDate DateTime?
  unitPrice        Float    @default(0)
  totalValue       Float    @default(0)
  currency         String   @default("EGP")
  partNumber       String?
  manufacturer     String?
  specifications   Json?
  imagePath        String?
  images           Json?
  status           String   @default("AVAILABLE")
  expiryDate       DateTime?
  notes            String?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdBy        BigInt?
  updatedBy        BigInt?
  
  category         INV_OilsGreasesCategory
  location         INV_StorageLocation?
  purchases        INV_OilsGreasesPurchase[]
  issuances        INV_OilsGreasesIssuance[]
}
```

### الحقول الأساسية

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `code` | String | الكود الفريد | "ENG-001" |
| `barcode` | String? | الباركود | "6281234567890" |
| `qrCode` | String? | QR كود | "..." |
| `nameAr` | String | الاسم بالعربية | "زيت محرك 10W-40" |
| `nameEn` | String? | الاسم بالإنجليزية | "Engine Oil 10W-40" |
| `description` | String? | الوصف | "زيت محرك عالي الجودة" |

### الحقول التصنيفية

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `categoryId` | Int | معرف الفئة | 1 |
| `locationId` | Int? | معرف الموقع | 1 |

### حقول الكميات

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `quantity` | Float | الكمية الحالية | 50.0 |
| `minQuantity` | Float | الحد الأدنى | 10.0 |
| `maxQuantity` | Float? | الحد الأقصى | 100.0 |
| `reorderPoint` | Float? | نقطة إعادة الطلب | 15.0 |
| `unit` | String | الوحدة | "لتر" |
| `unitCapacity` | Float? | سعة الوحدة | 1.0 |

### حقول التكلفة

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `unitPrice` | Float | سعر الوحدة | 100.0 |
| `totalValue` | Float | القيمة الإجمالية | 5000.0 |
| `currency` | String | العملة | "EGP" |

### حقول الموّرد

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `supplierName` | String? | اسم المورد | "شركة الزيوت" |
| `supplierContact` | String? | جوال المورد | "01234567890" |
| `lastPurchaseDate` | DateTime? | آخر شراء | 2025-01-15 |

### حقول تقنية

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `partNumber` | String? | رقم القطعة | "ABC-123" |
| `manufacturer` | String? | الشركة المصنعة | "Shell" |
| `specifications` | Json? | مواصفات | {"viscosity": "10W-40"} |

### حقول الحالة

| الحقل | النوع | الوصف | القيم الممكنة |
|-------|------|-------|---------------|
| `status` | String | الحالة | "AVAILABLE", "OUT_OF_STOCK", "RESERVED", "DISCONTINUED" |
| `isActive` | Boolean | نشط؟ | true, false |

---

## 3️⃣ INV_OilsGreasesPurchase

**الوصف**: عمليات الشراء (إدخال كميات)

```prisma
model INV_OilsGreasesPurchase {
  id                Int      @id @default(autoincrement())
  purchaseNumber    String   @unique
  itemId            Int
  quantity          Float
  unitPrice         Float
  totalCost         Float
  supplierName      String?
  invoiceNumber     String?
  invoiceDate       DateTime?
  invoiceImagePath  String?
  receiptImagePath  String?
  purchaseDate      DateTime @default(now())
  notes             String?
  createdAt         DateTime @default(now())
  createdBy         BigInt
  
  item              INV_OilsGreasesItem
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `purchaseNumber` | String | رقم العملية | "PUR-OILS-20250117-001" |
| `itemId` | Int | معرف الصنف | 1 |
| `quantity` | Float | الكمية | 50.0 |
| `unitPrice` | Float | سعر الوحدة | 100.0 |
| `totalCost` | Float | التكلفة الإجمالية | 5000.0 |
| `supplierName` | String? | اسم المورد | "شركة الزيوت" |
| `invoiceNumber` | String? | رقم الفاتورة | "INV-001" |
| `invoiceDate` | DateTime? | تاريخ الفاتورة | 2025-01-17 |
| `invoiceImagePath` | String? | صورة الفاتورة | "/uploads/..." |
| `receiptImagePath` | String? | صورة الإيصال | "/uploads/..." |
| `purchaseDate` | DateTime | تاريخ الشراء | 2025-01-17 |
| `notes` | String? | ملاحظات | "شراء دفعة جديدة" |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `createdBy` | BigInt | من أنشأ | 7594239391 |

---

## 4️⃣ INV_OilsGreasesIssuance

**الوصف**: عمليات الصرف (إخراج كميات)

```prisma
model INV_OilsGreasesIssuance {
  id                     Int      @id @default(autoincrement())
  issuanceNumber         String   @unique
  itemId                 Int
  quantity               Float
  issuedToEmployeeId     Int?
  issuedToEmployeeName   String?
  issuedToEquipmentId    Int?
  issuedToEquipmentCode  String?
  issuanceDate           DateTime @default(now())
  purpose                String?
  notes                  String?
  createdAt              DateTime @default(now())
  createdBy              BigInt
  
  item                   INV_OilsGreasesItem
  employee               Employee?
  equipment              Equipment?
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `issuanceNumber` | String | رقم العملية | "ISS-OILS-20250117-001" |
| `itemId` | Int | معرف الصنف | 1 |
| `quantity` | Float | الكمية | 10.0 |
| `issuedToEmployeeId` | Int? | معرف الموظف | 5 |
| `issuedToEmployeeName` | String? | اسم الموظف | "محمد أحمد" |
| `issuedToEquipmentId` | Int? | معرف المعدة | 3 |
| `issuedToEquipmentCode` | String? | كود المعدة | "EQ-001" |
| `issuanceDate` | DateTime | تاريخ الصرف | 2025-01-17 |
| `purpose` | String? | الغرض | "صيانة دورية" |
| `notes` | String? | ملاحظات | "صرف للصيانة" |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `createdBy` | BigInt | من أنشأ | 7594239391 |

---

## 5️⃣ INV_OilsGreasesTransfer

**الوصف**: عمليات النقل بين المواقع

```prisma
model INV_OilsGreasesTransfer {
  id              Int      @id @default(autoincrement())
  transferNumber  String   @unique
  itemId          Int
  quantity        Float
  fromLocationId  Int
  toLocationId    Int
  transferDate    DateTime @default(now())
  reason          String?
  notes           String?
  createdAt       DateTime @default(now())
  createdBy       BigInt
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `transferNumber` | String | رقم العملية | "TRF-OILS-20250117-001" |
| `itemId` | Int | معرف الصنف | 1 |
| `quantity` | Float | الكمية | 20.0 |
| `fromLocationId` | Int | من موقع | 1 |
| `toLocationId` | Int | إلى موقع | 2 |
| `transferDate` | DateTime | تاريخ النقل | 2025-01-17 |
| `reason` | String? | السبب | "نقل للمخزن الفرعي" |
| `notes` | String? | ملاحظات | "نقل عاجل" |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `createdBy` | BigInt | من أنشأ | 7594239391 |

---

## 6️⃣ INV_OilsGreasesReturn

**الوصف**: عمليات الإرجاع

```prisma
model INV_OilsGreasesReturn {
  id                       Int      @id @default(autoincrement())
  returnNumber             String   @unique
  itemId                   Int
  quantity                 Float
  returnedByEmployeeId     Int?
  returnedByEmployeeName   String?
  returnedByEquipmentId    Int?
  returnedByEquipmentCode  String?
  returnDate               DateTime @default(now())
  reason                   String
  condition                String   @default("GOOD")
  notes                    String?
  createdAt                DateTime @default(now())
  createdBy                BigInt
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `returnNumber` | String | رقم العملية | "RET-OILS-20250117-001" |
| `itemId` | Int | معرف الصنف | 1 |
| `quantity` | Float | الكمية | 5.0 |
| `returnedByEmployeeId` | Int? | معرف الموظف | 5 |
| `returnedByEmployeeName` | String? | اسم الموظف | "محمد أحمد" |
| `returnedByEquipmentId` | Int? | معرف المعدة | 3 |
| `returnedByEquipmentCode` | String? | كود المعدة | "EQ-001" |
| `returnDate` | DateTime | تاريخ الإرجاع | 2025-01-17 |
| `reason` | String | السبب | "فائض عن الحاجة" |
| `condition` | String | الحالة | "GOOD", "DAMAGED", "EXPIRED" |
| `notes` | String? | ملاحظات | "إرجاع فائض" |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `createdBy` | BigInt | من أنشأ | 7594239391 |

---

## 7️⃣ INV_OilsGreasesAdjustment

**الوصف**: عمليات التسوية والجرد

```prisma
model INV_OilsGreasesAdjustment {
  id                 Int      @id @default(autoincrement())
  adjustmentNumber   String   @unique
  itemId             Int
  quantityBefore     Float
  quantityAfter      Float
  quantityDifference Float
  adjustmentType     String
  adjustmentDate     DateTime @default(now())
  reason             String
  notes              String?
  createdAt          DateTime @default(now())
  createdBy          BigInt
  approvedBy         BigInt?
  approvedAt         DateTime?
}
```

### الحقول

| الحقل | النوع | الوصف | مثال |
|-------|------|-------|------|
| `id` | Int | المعرف الفريد | 1 |
| `adjustmentNumber` | String | رقم العملية | "ADJ-OILS-20250117-001" |
| `itemId` | Int | معرف الصنف | 1 |
| `quantityBefore` | Float | الكمية قبل | 50.0 |
| `quantityAfter` | Float | الكمية بعد | 53.0 |
| `quantityDifference` | Float | الفرق | 3.0 |
| `adjustmentType` | String | النوع | "INCREASE", "DECREASE" |
| `adjustmentDate` | DateTime | تاريخ التسوية | 2025-01-17 |
| `reason` | String | السبب | "جرد دوري" |
| `notes` | String? | ملاحظات | "فرق في الجرد" |
| `createdAt` | DateTime | تاريخ الإنشاء | 2025-01-17 |
| `createdBy` | BigInt | من أنشأ | 7594239391 |
| `approvedBy` | BigInt? | من وافق | 7594239391 |
| `approvedAt` | DateTime? | تاريخ الموافقة | 2025-01-17 |

---

## 🔗 العلاقات بين الجداول

```
INV_OilsGreasesCategory (1) ──→ (N) INV_OilsGreasesItem
INV_StorageLocation (1) ──→ (N) INV_OilsGreasesItem
INV_OilsGreasesItem (1) ──→ (N) INV_OilsGreasesPurchase
INV_OilsGreasesItem (1) ──→ (N) INV_OilsGreasesIssuance
Employee (1) ──→ (N) INV_OilsGreasesIssuance
Equipment (1) ──→ (N) INV_OilsGreasesIssuance
```

---

## 📝 ملاحظات هامة

### 1. أنواع البيانات
- `Int`: أرقام صحيحة
- `Float`: أرقام عشرية (للكميات والأسعار)
- `String`: نصوص
- `DateTime`: تاريخ ووقت
- `BigInt`: أرقام كبيرة (Telegram User IDs)
- `Boolean`: true/false
- `Json`: بيانات JSON

### 2. القيم الافتراضية
- `@default(now())`: التاريخ الحالي
- `@default(0)`: صفر
- `@default(true)`: صحيح
- `@default("AVAILABLE")`: قيمة نصية

### 3. القيود
- `@unique`: قيمة فريدة
- `@id`: المفتاح الأساسي
- `@default(autoincrement())`: رقم تلقائي متزايد

### 4. العلاقات
- `INV_OilsGreasesItem`: علاقة واحد لمتعدد
- `Employee?`: علاقة اختيارية
- `Equipment?`: علاقة اختيارية

---

**آخر تحديث**: 2025-01-17  
**الإصدار**: 1.0  
**الحالة**: مكتمل ودقيق
