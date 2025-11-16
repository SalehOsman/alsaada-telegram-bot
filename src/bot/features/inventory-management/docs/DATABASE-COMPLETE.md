# 📊 قاعدة البيانات الكاملة - نظام المخازن

## 📋 جميع الجداول (17 جدول)

---

## 🔗 الجداول المشتركة (3)

### 1. INV_StorageLocation
**مواقع التخزين - 14 حقل**

| الحقل | النوع | الوصف | القيود |
|------|------|-------|--------|
| id | Int | المعرف | PK, Auto |
| code | String | الكود | Unique |
| nameAr | String | الاسم بالعربية | Required |
| nameEn | String? | الاسم بالإنجليزية | Optional |
| locationType | String | نوع الموقع | Default: "SHELF" |
| locationArea | String? | المنطقة | Optional |
| description | String? | الوصف | Optional |
| capacity | Int? | السعة | Optional |
| notes | String? | ملاحظات | Optional |
| orderIndex | Int | ترتيب العرض | Default: 0 |
| isActive | Boolean | نشط؟ | Default: true |
| createdAt | DateTime | تاريخ الإنشاء | Auto |
| updatedAt | DateTime | تاريخ التحديث | Auto |
| createdBy | BigInt? | من أنشأ | Optional |
| updatedBy | BigInt? | من عدّل | Optional |

**القيم المسموحة لـ locationType:**
- CONTAINER (كرستر)
- SHELF (رف)
- RACK (حامل)
- ROOM (غرفة)
- VEHICLE (مركبة)

**العلاقات:**
- → INV_SparePart (1:N)
- → INV_OilsGreasesItem (1:N)

---

### 2. INV_InventoryAudit
**عمليات الجرد - 16 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| auditNumber | String | رقم الجرد (Unique) |
| warehouseType | String | نوع المخزن |
| auditType | String | نوع الجرد |
| categoryId | Int? | الفئة (اختياري) |
| locationId | Int? | الموقع (اختياري) |
| itemId | Int? | الصنف (اختياري) |
| itemCode | String? | كود الصنف |
| status | String | الحالة |
| totalItems | Int | إجمالي الأصناف |
| itemsChecked | Int | الأصناف المجردة |
| itemsWithDiff | Int | أصناف بها فروقات |
| totalShortage | Int | إجمالي العجز |
| totalSurplus | Int | إجمالي الزيادة |
| auditDate | DateTime | تاريخ الجرد |
| startedAt | DateTime | بداية الجرد |
| completedDate | DateTime? | تاريخ الإكمال |
| notes | String? | ملاحظات |
| createdBy | BigInt | من أنشأ |
| completedBy | BigInt? | من أكمل |

**أنواع المخازن (warehouseType):**
- SPARE_PARTS
- OILS
- FUEL
- MATERIALS

**أنواع الجرد (auditType):**
- FULL (شامل)
- CATEGORY (فئة)
- LOCATION (موقع)
- SINGLE_ITEM (صنف واحد)

**الحالات (status):**
- IN_PROGRESS
- COMPLETED
- CANCELLED

---

### 3. INV_InventoryAuditItem
**عناصر الجرد - 18 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| auditId | Int | معرف الجرد |
| itemId | Int | معرف الصنف |
| itemType | String | نوع الصنف |
| itemCode | String | كود الصنف |
| itemName | String | اسم الصنف |
| systemQuantity | Int | الكمية في النظام |
| actualQuantity | Int | الكمية الفعلية |
| difference | Int | الفرق |
| systemDetails | Json? | تفاصيل النظام |
| actualDetails | Json? | تفاصيل الفعلي |
| locationId | Int? | الموقع |
| locationName | String? | اسم الموقع |
| categoryId | Int? | الفئة |
| categoryName | String? | اسم الفئة |
| unit | String | الوحدة |
| hasDiscrepancy | Boolean | يوجد فرق؟ |
| discrepancyType | String? | نوع الفرق |
| notes | String? | ملاحظات |
| checkedAt | DateTime | تاريخ الجرد |

---

### 4. INV_ItemHistory
**سجل التعديلات - 15 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| itemId | Int | معرف الصنف |
| itemType | String | نوع الصنف |
| action | String | نوع العملية |
| actionDetail | String? | تفاصيل العملية |
| oldData | Json? | البيانات القديمة |
| newData | Json? | البيانات الجديدة |
| changedFields | Json? | الحقول المتغيرة |
| performedBy | BigInt | من قام بالعملية |
| performedAt | DateTime | تاريخ العملية |
| ipAddress | String? | عنوان IP |
| userAgent | String? | معلومات الجهاز |
| notes | String? | ملاحظات |
| reason | String? | السبب |
| isAutomated | Boolean | تلقائي؟ |
| relatedRecordId | Int? | سجل مرتبط |
| relatedRecordType | String? | نوع السجل |

**أنواع العمليات (action):**
- CREATE
- UPDATE
- DELETE
- RESTORE
- STATUS_CHANGE

---

## 🔧 قطع الغيار (10 جداول)

### 5. INV_EquipmentCategory
**تصنيفات المعدات - 11 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| code | String | الكود (Unique) |
| nameAr | String | الاسم بالعربية |
| nameEn | String? | الاسم بالإنجليزية |
| description | String? | الوصف |
| icon | String? | الأيقونة |
| orderIndex | Int | ترتيب العرض |
| isActive | Boolean | نشط؟ |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |
| createdBy | BigInt? | من أنشأ |
| updatedBy | BigInt? | من عدّل |

**أمثلة الأكواد:**
- CAR (سيارات)
- LOADER (لودار)
- BULLDOZER (بلدوزر)
- EXCAVATOR (حفار)
- GENERAL (عام)

---

### 6. INV_SparePart
**قطع الغيار - 45 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| code | String | الكود (Unique) |
| barcode | String | الباركود (Unique) |
| nameAr | String | الاسم بالعربية |
| nameEn | String? | الاسم بالإنجليزية |
| description | String? | الوصف |
| categoryId | Int | الفئة |
| locationId | Int? | الموقع |
| quantity | Int | الكمية الإجمالية |
| quantityNew | Int | كمية جديدة |
| quantityUsed | Int | كمية مستعملة |
| quantityRefurbished | Int | كمية مجددة |
| quantityImport | Int | كمية مستوردة |
| minQuantity | Int | الحد الأدنى |
| maxQuantity | Int? | الحد الأقصى |
| reorderPoint | Int? | نقطة إعادة الطلب |
| unit | String | الوحدة |
| supplierName | String? | اسم المورد |
| supplierContact | String? | جوال المورد |
| lastPurchaseDate | DateTime? | آخر شراء |
| unitPrice | Float | سعر الوحدة |
| totalValue | Float | القيمة الإجمالية |
| currency | String | العملة |
| partNumber | String? | رقم القطعة |
| manufacturer | String? | الشركة المصنعة |
| model | String? | الموديل |
| yearFrom | Int? | من سنة |
| yearTo | Int? | إلى سنة |
| specifications | Json? | مواصفات تقنية |
| imagePath | String? | مسار الصورة |
| images | Json? | صور إضافية |
| documents | Json? | مستندات |
| condition | String | الحالة الفيزيائية |
| status | String | حالة التوفر |
| isDamaged | Boolean | تالفة؟ |
| damageDate | DateTime? | تاريخ التلف |
| damageReason | String? | سبب التلف |
| damageQuantity | Int | الكمية التالفة |
| damageValue | Float | قيمة الهوالك |
| disposalDate | DateTime? | تاريخ التخلص |
| disposalMethod | String? | طريقة التخلص |
| disposalApprovedBy | BigInt? | من وافق |
| compatibleEquipmentTypes | Json? | أنواع معدات متوافقة |
| accountCode | String? | رمز الحساب |
| costCenterId | Int? | مركز التكلفة |
| maintenanceTypeId | Int? | نوع الصيانة |
| averageLifespan | Int? | العمر الافتراضي |
| responsibleEmployeeId | Int? | الموظف المسؤول |
| notes | String? | ملاحظات |
| isActive | Boolean | نشط؟ |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |
| createdBy | BigInt? | من أنشأ |
| updatedBy | BigInt? | من عدّل |

---

### 7. INV_SparePartTransaction
**حركات قطع الغيار - 22 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| transactionNumber | String | رقم الحركة (Unique) |
| sparePartId | Int | معرف القطعة |
| transactionType | String | نوع الحركة |
| quantity | Int | الكمية |
| quantityBefore | Int | الكمية قبل |
| quantityAfter | Int | الكمية بعد |
| fromLocationId | Int? | من موقع |
| toLocationId | Int? | إلى موقع |
| equipmentId | Int? | المعدة |
| projectId | Int? | المشروع |
| employeeId | Int? | الموظف |
| employeeName | String? | اسم الموظف |
| employeeCode | String? | كود الموظف |
| invoiceNumber | String? | رقم الفاتورة |
| supplierName | String? | اسم المورد |
| unitPrice | Float? | سعر الوحدة |
| totalCost | Float? | التكلفة الإجمالية |
| reason | String? | السبب |
| notes | String? | ملاحظات |
| attachments | Json? | مرفقات |
| transactionDate | DateTime | تاريخ الحركة |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |
| approvedBy | BigInt? | من وافق |
| approvedAt | DateTime? | تاريخ الموافقة |

**أنواع الحركات:**
- IN (إدخال)
- OUT (إخراج)
- TRANSFER (نقل)
- ADJUST (تسوية)
- RETURN (إرجاع)

---

### 8. INV_SparePartUsage
**استخدام قطع الغيار - 18 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| sparePartId | Int | معرف القطعة |
| equipmentId | Int? | المعدة |
| equipmentName | String? | اسم المعدة |
| equipmentCode | String? | كود المعدة |
| projectId | Int? | المشروع |
| projectName | String? | اسم المشروع |
| quantity | Int | الكمية |
| installDate | DateTime | تاريخ التركيب |
| expectedLife | Int? | العمر المتوقع |
| status | String | الحالة |
| replacedDate | DateTime? | تاريخ الاستبدال |
| failureReason | String? | سبب الفشل |
| installedBy | BigInt? | من ركّب (User) |
| installedByEmployeeId | Int? | من ركّب (Employee) |
| installedByName | String? | اسم الفني |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |

**الحالات:**
- IN_USE (قيد الاستخدام)
- REPLACED (تم استبداله)
- FAILED (فشل)

---

### 9. INV_StockAlert
**تنبيهات المخزون - 10 حقول**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| sparePartId | Int | معرف القطعة |
| alertType | String | نوع التنبيه |
| alertLevel | String | مستوى التنبيه |
| message | String | الرسالة |
| currentValue | Int? | القيمة الحالية |
| thresholdValue | Int? | القيمة المحددة |
| isResolved | Boolean | تم الحل؟ |
| resolvedAt | DateTime? | تاريخ الحل |
| resolvedBy | BigInt? | من حل |
| createdAt | DateTime | تاريخ الإنشاء |

**أنواع التنبيهات:**
- LOW_STOCK (نقص)
- OUT_OF_STOCK (نفاد)
- EXPIRED (منتهي الصلاحية)
- OVERSTOCK (زيادة)

**مستويات التنبيه:**
- INFO
- WARNING
- CRITICAL

---

### 10. INV_DamageRecord
**سجل التالف - 25 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| recordNumber | String | رقم السجل (Unique) |
| sparePartId | Int | معرف القطعة |
| damageType | String | نوع التلف |
| damageDate | DateTime | تاريخ التلف |
| discoveredBy | BigInt | من اكتشف |
| quantity | Int | الكمية التالفة |
| unitPrice | Float | سعر الوحدة |
| totalValue | Float | القيمة الإجمالية |
| damageReason | String | سبب التلف |
| damageSeverity | String | شدة التلف |
| isRepairable | Boolean | قابلة للإصلاح؟ |
| repairCost | Float? | تكلفة الإصلاح |
| actionTaken | String? | الإجراء المتخذ |
| actionDate | DateTime? | تاريخ الإجراء |
| actionBy | BigInt? | من قام بالإجراء |
| recoveredValue | Float | القيمة المستردة |
| approvalStatus | String | حالة الموافقة |
| approvedBy | BigInt? | من وافق |
| approvedAt | DateTime? | تاريخ الموافقة |
| rejectionReason | String? | سبب الرفض |
| photos | Json? | صور |
| documents | Json? | مستندات |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |

---

## 🛢️ الزيوت والشحوم (7 جداول)

### 11. INV_OilsGreasesCategory
**أنواع الزيوت - 10 حقول**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| code | String | الكود (Unique) |
| nameAr | String | الاسم بالعربية |
| nameEn | String? | الاسم بالإنجليزية |
| description | String? | الوصف |
| prefix | String | البادئة (Unique) |
| isActive | Boolean | نشط؟ |
| displayOrder | Int | ترتيب العرض |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |
| createdBy | BigInt? | من أنشأ |
| updatedBy | BigInt? | من عدّل |

**أمثلة:**
- ENGINE-OIL (زيت محرك) - Prefix: ENG
- GREASE (شحم) - Prefix: GRS
- HYDRAULIC-OIL (زيت هيدروليك) - Prefix: HYD
- GEAR-OIL (زيت تروس) - Prefix: GER

---

### 12. INV_OilsGreasesItem
**أصناف الزيوت - 30 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| code | String | الكود (Unique) |
| barcode | String? | الباركود (Unique) |
| qrCode | String? | QR كود |
| nameAr | String | الاسم بالعربية |
| nameEn | String? | الاسم بالإنجليزية |
| description | String? | الوصف |
| categoryId | Int | الفئة |
| locationId | Int? | الموقع |
| quantity | Float | الكمية |
| minQuantity | Float | الحد الأدنى |
| maxQuantity | Float? | الحد الأقصى |
| reorderPoint | Float? | نقطة إعادة الطلب |
| unit | String | الوحدة |
| unitCapacity | Float? | سعة الوحدة |
| supplierName | String? | اسم المورد |
| supplierContact | String? | جوال المورد |
| lastPurchaseDate | DateTime? | آخر شراء |
| unitPrice | Float | سعر الوحدة |
| totalValue | Float | القيمة الإجمالية |
| currency | String | العملة |
| partNumber | String? | رقم القطعة |
| manufacturer | String? | الشركة المصنعة |
| specifications | Json? | مواصفات تقنية |
| imagePath | String? | مسار الصورة |
| images | Json? | صور إضافية |
| status | String | الحالة |
| expiryDate | DateTime? | تاريخ الصلاحية |
| notes | String? | ملاحظات |
| isActive | Boolean | نشط؟ |
| createdAt | DateTime | تاريخ الإنشاء |
| updatedAt | DateTime | تاريخ التحديث |
| createdBy | BigInt? | من أنشأ |
| updatedBy | BigInt? | من عدّل |

---

### 13. INV_OilsGreasesPurchase
**عمليات الشراء - 13 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| purchaseNumber | String | رقم الشراء (Unique) |
| itemId | Int | معرف الصنف |
| quantity | Float | الكمية |
| unitPrice | Float | سعر الوحدة |
| totalCost | Float | التكلفة الإجمالية |
| supplierName | String? | اسم المورد |
| invoiceNumber | String? | رقم الفاتورة |
| invoiceDate | DateTime? | تاريخ الفاتورة |
| invoiceImagePath | String? | صورة الفاتورة |
| receiptImagePath | String? | صورة الاستلام |
| purchaseDate | DateTime | تاريخ الشراء |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |

---

### 14. INV_OilsGreasesIssuance
**عمليات الصرف - 13 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| issuanceNumber | String | رقم الصرف (Unique) |
| itemId | Int | معرف الصنف |
| quantity | Float | الكمية |
| issuedToEmployeeId | Int? | الموظف المستلم |
| issuedToEmployeeName | String? | اسم الموظف |
| issuedToEquipmentId | Int? | المعدة |
| issuedToEquipmentCode | String? | كود المعدة |
| issuanceDate | DateTime | تاريخ الصرف |
| purpose | String? | الغرض |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |

---

### 15. INV_OilsGreasesTransfer
**عمليات النقل - 10 حقول**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| transferNumber | String | رقم النقل (Unique) |
| itemId | Int | معرف الصنف |
| quantity | Float | الكمية |
| fromLocationId | Int | من موقع |
| toLocationId | Int | إلى موقع |
| transferDate | DateTime | تاريخ النقل |
| reason | String? | السبب |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |

---

### 16. INV_OilsGreasesReturn
**عمليات الإرجاع - 12 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| returnNumber | String | رقم الإرجاع (Unique) |
| itemId | Int | معرف الصنف |
| quantity | Float | الكمية |
| returnedByEmployeeId | Int? | الموظف المُرجِع |
| returnedByEmployeeName | String? | اسم الموظف |
| returnedByEquipmentId | Int? | المعدة |
| returnedByEquipmentCode | String? | كود المعدة |
| returnDate | DateTime | تاريخ الإرجاع |
| reason | String | السبب |
| condition | String | الحالة |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |

---

### 17. INV_OilsGreasesAdjustment
**عمليات التسوية - 12 حقل**

| الحقل | النوع | الوصف |
|------|------|-------|
| id | Int | المعرف |
| adjustmentNumber | String | رقم التسوية (Unique) |
| itemId | Int | معرف الصنف |
| quantityBefore | Float | الكمية قبل |
| quantityAfter | Float | الكمية بعد |
| quantityDifference | Float | الفرق |
| adjustmentType | String | نوع التسوية |
| adjustmentDate | DateTime | تاريخ التسوية |
| reason | String | السبب |
| notes | String? | ملاحظات |
| createdAt | DateTime | تاريخ الإنشاء |
| createdBy | BigInt | من أنشأ |
| approvedBy | BigInt? | من وافق |
| approvedAt | DateTime? | تاريخ الموافقة |

**أنواع التسوية:**
- INCREASE (زيادة)
- DECREASE (نقص)

---

## 📊 ملخص الإحصائيات

| الفئة | عدد الجداول | عدد الحقول |
|------|-------------|------------|
| مشتركة | 4 | 63 |
| قطع الغيار | 6 | 141 |
| الزيوت والشحوم | 7 | 90 |
| **الإجمالي** | **17** | **294** |

---

**آخر تحديث:** 2025-01-17  
**الحالة:** ✅ مكتمل - جميع الجداول موثقة
