# 📚 التوثيق الكامل - نظام إدارة المخازن

> **الإصدار:** 2.0.0 | **التاريخ:** 2025-01-17 | **الحالة:** ✅ مكتمل

---

## 📖 المحتويات

### [1. قاعدة البيانات](#database)
### [2. تدفقات العمل](#workflows)  
### [3. البنية المعمارية](#architecture)
### [4. الوظائف](#functions)
### [5. API Reference](#api)

---

<a name="database"></a>
## 1️⃣ قاعدة البيانات

### الهيكل العام
**17 جدول** موزعة على 3 فئات:

#### الجداول المشتركة (3 جداول)

**INV_StorageLocation** - مواقع التخزين
```prisma
model INV_StorageLocation {
  id           Int     @id @default(autoincrement())
  code         String  @unique
  nameAr       String
  nameEn       String?
  locationType String  @default("SHELF")
  locationArea String?
  capacity     Int?
  orderIndex   Int     @default(0)
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdBy    BigInt?
  updatedBy    BigInt?
}
```

**الحقول الرئيسية:**
- `code`: كود فريد (CONT-1, SHELF-A1)
- `locationType`: نوع الموقع (CONTAINER, SHELF, RACK)
- `capacity`: السعة التخزينية

---

**INV_InventoryAudit** - عمليات الجرد
```prisma
model INV_InventoryAudit {
  id            Int      @id @default(autoincrement())
  auditNumber   String   @unique
  warehouseType String   // SPARE_PARTS, OILS, FUEL
  auditType     String   // FULL, CATEGORY, LOCATION
  status        String   @default("IN_PROGRESS")
  totalItems    Int      @default(0)
  itemsChecked  Int      @default(0)
  auditDate     DateTime @default(now())
  createdBy     BigInt
}
```

**أنواع الجرد:**
- `FULL`: جرد شامل
- `CATEGORY`: جرد فئة محددة
- `LOCATION`: جرد موقع محدد
- `SINGLE_ITEM`: جرد صنف واحد

---

**INV_ItemHistory** - سجل التعديلات
```prisma
model INV_ItemHistory {
  id            Int      @id @default(autoincrement())
  itemId        Int
  itemType      String   @default("SPARE_PART")
  action        String   // CREATE, UPDATE, DELETE
  oldData       Json?
  newData       Json?
  performedBy   BigInt
  performedAt   DateTime @default(now())
}
```

---

#### قطع الغيار (10 جداول)

**INV_SparePart** - قطع الغيار (45 حقل)
```prisma
model INV_SparePart {
  id                    Int     @id @default(autoincrement())
  code                  String  @unique
  barcode               String  @unique
  nameAr                String
  nameEn                String?
  categoryId            Int
  locationId            Int?
  quantity              Int     @default(0)
  quantityNew           Int     @default(0)
  quantityUsed          Int     @default(0)
  quantityRefurbished   Int     @default(0)
  minQuantity           Int     @default(5)
  unit                  String  @default("قطعة")
  unitPrice             Float   @default(0)
  totalValue            Float   @default(0)
  supplierName          String?
  partNumber            String?
  manufacturer          String?
  status                String  @default("AVAILABLE")
  isDamaged             Boolean @default(false)
  responsibleEmployeeId Int?
  isActive              Boolean @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**الحقول الرئيسية:**
- `code`: مُولّد تلقائياً (CAR-ENG-00123)
- `barcode`: EAN-13 فريد
- `quantity*`: 4 أنواع كميات (جديد، مستعمل، مجدد، مستورد)
- `status`: AVAILABLE, OUT_OF_STOCK, RESERVED, DISCONTINUED

---

**INV_SparePartTransaction** - حركات قطع الغيار
```prisma
model INV_SparePartTransaction {
  id                Int      @id @default(autoincrement())
  transactionNumber String   @unique
  sparePartId       Int
  transactionType   String   // IN, OUT, TRANSFER, ADJUST
  quantity          Int
  quantityBefore    Int
  quantityAfter     Int
  equipmentId       Int?
  projectId         Int?
  employeeId        Int?
  invoiceNumber     String?
  supplierName      String?
  unitPrice         Float?
  totalCost         Float?
  transactionDate   DateTime @default(now())
  createdBy         BigInt
}
```

**أنواع الحركات:**
- `IN`: إدخال (شراء)
- `OUT`: إخراج (صرف)
- `TRANSFER`: نقل بين مواقع
- `ADJUST`: تسوية جرد
- `RETURN`: إرجاع

---

#### الزيوت والشحوم (7 جداول)

**INV_OilsGreasesItem** - أصناف الزيوت (30 حقل)
```prisma
model INV_OilsGreasesItem {
  id               Int      @id @default(autoincrement())
  code             String   @unique
  barcode          String?  @unique
  nameAr           String
  nameEn           String?
  categoryId       Int
  locationId       Int?
  quantity         Float    @default(0)
  minQuantity      Float    @default(5)
  unit             String   @default("لتر")
  unitCapacity     Float?
  unitPrice        Float    @default(0)
  totalValue       Float    @default(0)
  supplierName     String?
  manufacturer     String?
  status           String   @default("AVAILABLE")
  expiryDate       DateTime?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**الوحدات المدعومة:**
- لتر (Liter)
- جالون (Gallon)
- برميل (Barrel)
- كيلوجرام (Kilogram)
- علبة (Can)

---

**INV_OilsGreasesPurchase** - عمليات الشراء
```prisma
model INV_OilsGreasesPurchase {
  id               Int      @id @default(autoincrement())
  purchaseNumber   String   @unique
  itemId           Int
  quantity         Float
  unitPrice        Float
  totalCost        Float
  supplierName     String?
  invoiceNumber    String?
  invoiceDate      DateTime?
  purchaseDate     DateTime @default(now())
  createdBy        BigInt
}
```

---

**INV_OilsGreasesIssuance** - عمليات الصرف
```prisma
model INV_OilsGreasesIssuance {
  id                     Int      @id @default(autoincrement())
  issuanceNumber         String   @unique
  itemId                 Int
  quantity               Float
  issuedToEmployeeId     Int?
  issuedToEquipmentId    Int?
  issuanceDate           DateTime @default(now())
  purpose                String?
  createdBy              BigInt
}
```

---

### العلاقات الرئيسية

```
INV_StorageLocation (1) ←→ (N) INV_SparePart
INV_StorageLocation (1) ←→ (N) INV_OilsGreasesItem

Employee (1) ←→ (N) INV_SparePartTransaction
Employee (1) ←→ (N) INV_OilsGreasesIssuance

Equipment (1) ←→ (N) INV_SparePartUsage
Equipment (1) ←→ (N) INV_OilsGreasesIssuance

Project (1) ←→ (N) INV_SparePartTransaction
```

---

<a name="workflows"></a>
## 2️⃣ تدفقات العمل

### قطع الغيار

#### إضافة قطعة غيار
```
1. إدخال الباركود (مسح/يدوي)
2. اختيار الفئة
3. إدخال البيانات الأساسية
4. تحديد الكميات (جديد/مستعمل/مجدد)
5. إدخال معلومات المورد
6. رفع الصور
7. المراجعة والحفظ
```

#### عملية شراء
```
1. اختيار القطعة
2. إدخال الكمية
3. إدخال السعر
4. معلومات المورد والفاتورة
5. رفع صورة الفاتورة
6. التأكيد والحفظ
→ تحديث الكمية تلقائياً
```

#### عملية صرف
```
1. اختيار القطعة
2. إدخال الكمية
3. اختيار المستلم (موظف/معدة)
4. اختيار المشروع
5. إدخال الغرض
6. التأكيد والحفظ
→ خصم الكمية تلقائياً
```

---

### الزيوت والشحوم

#### إضافة صنف
```
1. إدخال الباركود (اختياري)
2. اختيار النوع (محرك/هيدروليك/شحم)
3. إدخال الاسم والوصف
4. اختيار الوحدة والسعة
5. تحديد الموقع
6. إدخال الكمية الأولية
7. معلومات المورد
8. رفع الصور
9. الحفظ
```

#### عملية شراء
```
1. اختيار الصنف
2. إدخال الكمية
3. إدخال السعر
4. معلومات المورد
5. رقم الفاتورة
6. التأكيد
→ زيادة الكمية
```

#### عملية صرف
```
1. اختيار الصنف
2. إدخال الكمية
3. اختيار المستلم (موظف/معدة)
4. الغرض
5. التأكيد
→ خصم الكمية
```

---

<a name="architecture"></a>
## 3️⃣ البنية المعمارية

### Layered Architecture

```
┌─────────────────────────────────┐
│   Presentation Layer            │
│   (Handlers)                    │
├─────────────────────────────────┤
│   Business Logic Layer          │
│   (Services)                    │
├─────────────────────────────────┤
│   Data Access Layer             │
│   (Prisma ORM)                  │
├─────────────────────────────────┤
│   Database Layer                │
│   (SQLite/PostgreSQL)           │
└─────────────────────────────────┘
```

### الخدمات المشتركة (Shared Services)

**InventoryItemsService**
```typescript
- getItems(warehouse, page, limit, filters)
- searchItems(warehouse, query)
- getItemById(warehouse, id)
- checkBarcodeExists(warehouse, barcode)
- softDelete(warehouse, id)
```

**TransactionNumberService**
```typescript
- generate(prefix, model)
// مثال: PUR-OILS-20251117-001
```

**StorageLocationsService**
```typescript
- getLocations()
- getLocationById(id)
- updateLocation(id, data, userId)
- deleteLocation(id)
```

**ExcelExportService**
```typescript
- exportItems(warehouse, items)
- exportTransactions(warehouse, transactions)
// يُرجع: { buffer, fileName, count }
```

**CategoryService**
```typescript
- getCategories(warehouse)
- getCategoryById(warehouse, id)
- createCategory(warehouse, data, userId)
- updateCategory(warehouse, id, data, userId)
- deleteCategory(warehouse, id)
```

---

### خدمات قطع الغيار

**SparePartsItemsService**
```typescript
- generateCode(categoryId)
- createItem(data, userId)
- updateItem(id, data, userId)
- getItemWithDetails(id)
```

**SparePartsTransactionService**
```typescript
- createPurchase(data, userId)
- createIssue(data, userId)
- createTransfer(data, userId)
- createReturn(data, userId)
- createAdjustment(data, userId)
```

---

### خدمات الزيوت والشحوم

**OilsGreasesItemsService**
```typescript
- generateCode(categoryId)
- createItem(data, userId)
- updateItem(id, data, userId)
- getItemWithDetails(id)
```

**OilsGreasesPurchaseService**
```typescript
- createPurchase(data, userId)
```

**OilsGreasesIssueService**
```typescript
- createIssuance(data, userId)
```

**OilsGreasesTransferService**
```typescript
- createTransfer(data, userId)
```

**OilsGreasesReturnService**
```typescript
- createReturn(data, userId)
```

**OilsGreasesAdjustService**
```typescript
- createAdjustment(data, userId)
```

---

<a name="functions"></a>
## 4️⃣ الوظائف

### قطع الغيار (15 وظيفة)

#### إدارة الأصناف (5)
1. إضافة قطعة
2. عرض القائمة
3. تعديل قطعة
4. البحث
5. عرض التفاصيل

#### المعاملات (5)
6. شراء
7. صرف
8. نقل
9. إرجاع
10. تسوية

#### التقارير (3)
11. تنبيهات النقص
12. تصدير Excel
13. ملخص المخزون

#### الإعدادات (2)
14. إدارة الفئات
15. إدارة المواقع

---

### الزيوت والشحوم (12 وظيفة)

#### إدارة الأصناف (5)
1. إضافة صنف
2. عرض القائمة
3. تعديل صنف
4. البحث
5. عرض التفاصيل

#### المعاملات (5)
6. شراء
7. صرف
8. نقل
9. إرجاع
10. تسوية

#### التقارير (2)
11. تنبيهات النقص
12. تصدير Excel

---

<a name="api"></a>
## 5️⃣ API Reference

### Handlers API

**قطع الغيار**
```
og:items:add:start
og:items:list
og:items:edit:{id}
og:items:search
og:items:view:{id}

og:trans:purchase
og:trans:issue
og:trans:transfer
og:trans:return
og:trans:adjust
```

**الزيوت والشحوم**
```
og:items:add:start
og:items:list
og:items:edit:{id}
og:items:search
og:items:view:{id}

og:trans:purchase
og:trans:issue
og:trans:transfer
og:trans:return
og:trans:adjust
```

---

### Services API

**InventoryItemsService**
```typescript
getItems(warehouse: string, page: number, limit: number, filters?: ItemFilters): Promise<PaginatedResult>
searchItems(warehouse: string, query: string): Promise<Item[]>
getItemById(warehouse: string, id: number): Promise<Item | null>
checkBarcodeExists(warehouse: string, barcode: string): Promise<boolean>
softDelete(warehouse: string, id: number): Promise<void>
```

**TransactionNumberService**
```typescript
generate(prefix: string, model: any): Promise<string>
```

---

## 📊 الإحصائيات

| المقياس | القيمة |
|---------|--------|
| إجمالي الجداول | 17 |
| إجمالي الحقول | 294 |
| العلاقات | 45+ |
| الفهارس | 120+ |
| الملفات | 150+ |
| الوظائف | 27 |
| Services | 15 |
| Utils | 14 |
| سطور الكود | 15,000+ |

---

## 🔐 الصلاحيات

| الدور | القراءة | الإضافة | التعديل | الحذف |
|-------|---------|---------|---------|--------|
| OWNER | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ❌ | ❌ | ❌ |

---

## 🎯 أفضل الممارسات

### قاعدة البيانات
- ✅ استخدام Prisma ORM
- ✅ فهارس على Foreign Keys
- ✅ Cascade Delete للعلاقات التابعة
- ✅ حقول التدقيق (createdAt, updatedAt, createdBy)

### الكود
- ✅ Shared Services للوظائف المشتركة
- ✅ Validation قبل الحفظ
- ✅ Error Handling شامل
- ✅ TypeScript Strict Mode

### الأمان
- ✅ Role-Based Access Control
- ✅ Input Validation
- ✅ Audit Logging
- ✅ BigInt لـ User IDs

---

**آخر تحديث:** 2025-01-17  
**الإصدار:** 2.0.0  
**الحالة:** ✅ مكتمل ومُحدّث
