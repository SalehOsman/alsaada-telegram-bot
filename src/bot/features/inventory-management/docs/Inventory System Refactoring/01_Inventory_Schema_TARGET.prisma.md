# **📦 ملف Schema الهدف لنظام المخازن الموحد**

# **(TARGET INVENTORY SCHEMA \- V3 Unified)**

# **انسخ هذه النماذج (Models) إلى ملف prisma/schema.prisma الخاص بك**

# **واستبدل بها جميع نماذج INV\_ الحالية.**

# **═══════════════════════════════════════════════════════════**

# **🏛️ 1\. الكيانات الأساسية الموحدة (Unified Core Entities)**

# **═══════════════════════════════════════════════════════════**

# **✅ (مُعدل) فئات المخزون (موحدة)**

# **كان (INV\_EquipmentCategory) و (INV\_OilsGreasesCategory)**

model INV\_Category {  
id Int @id @default(autoincrement())  
code String @unique // "SPARE\_PART", "OILS\_GREASE", "FUEL", "TOOLS"  
nameAr String // "قطع غيار", "زيوت وشحوم", "سولار", "عدد وأدوات"  
nameEn String?  
description String?  
icon String? // ⚙️, 🛢️, ⛽, 🛠️  
prefix String? @unique // "SP", "OG", "FL", "TL" (يستخدم لتوليد كود الصنف)  
orderIndex Int @default(0)  
isActive Boolean @default(true)  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
createdBy BigInt?  
updatedBy BigInt?  
// العلاقات  
items INV\_Item\[\] @relation("CategoryItems")  
@@index(\[code\])  
@@index(\[isActive\])  
@@map("INV\_Category")  
}

# **✅ (جديد) كتالوج الأصناف الموحد**

# **(يستبدل INV\_SparePart و INV\_OilsGreasesItem)**

model INV\_Item {  
id Int @id @default(autoincrement())  
code String @unique // "SP-00123", "OG-0001" (مُولّد تلقائياً)  
barcode String? @unique // "6281234567890" (EAN-13)  
// معلومات أساسية  
nameAr String // "فلتر زيت محرك", "زيت هيدروليك 68"  
nameEn String?  
description String?  
// التصنيف  
categoryId Int // الربط مع INV\_Category  
// الوحدة  
unit String @default("قطعة") // "قطعة", "لتر", "جالون", "برميل"  
unitCapacity Float? // سعة الوحدة باللتر (للجالون والبرميل)  
// معلومات الموّرد  
supplierName String? // اسم المورد  
supplierContact String? // جوال/بريد المورد  
// معلومات تقنية  
partNumber String? // رقم القطعة من الشركة المصنعة  
manufacturer String? // الشركة المصنعة  
specifications Json? // مواصفات تقنية (لزوجة، موديل متوافق، إلخ)  
// الصور والملفات  
imagePath String? // مسار الصورة الرئيسية  
images Json?  
documents Json?  
// 🔗 الربط بالموظفين (اختياري)  
responsibleEmployeeId Int? // الموظف المسؤول عن الصنف  
// معلومات التسجيل  
isActive Boolean @default(true)  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
createdBy BigInt?  
updatedBy BigInt?  
// العلاقات  
category INV\_Category @relation("CategoryItems", fields: \[categoryId\], references: \[id\])  
responsibleEmployee Employee? @relation("SparePartResponsible", fields: \[responsibleEmployeeId\], references: \[id\])  
stockRecords INV\_Stock\[\] @relation("ItemStockRecords")  
transactions INV\_Transaction\[\] @relation("ItemTransactions")  
usageRecords INV\_SparePartUsage\[\] @relation("SparePartUsages")  
damageRecords INV\_DamageRecord\[\] @relation("SparePartDamages")  
auditItems INV\_InventoryAuditItem\[\] @relation("AuditItems")  
@@index(\[code\])  
@@index(\[barcode\])  
@@index(\[categoryId\])  
@@index(\[isActive\])  
@@index(\[nameAr\])  
@@index(\[partNumber\])  
@@index(\[manufacturer\])  
@@index(\[responsibleEmployeeId\])  
@@map("INV\_Item")  
}

# **✅ (جديد) جدول الأرصدة (الفصل بين الصنف ورصيده)**

# **هذا هو الجدول الأهم لحل مشكلة تعدد المواقع**

model INV\_Stock {  
id Int @id @default(autoincrement())  
itemId Int // معرف الصنف  
locationId Int // معرف موقع التخزين  
// الكميات  
quantity Float @default(0) // الكمية الإجمالية الحالية  
quantityNew Float @default(0) // الكمية الجديدة (إذا كنت تريد الفصل)  
quantityUsed Float @default(0) // الكمية المستعملة  
quantityRefurbished Float @default(0) // الكمية المجددة  
// التكلفة (يتم تحديثها آلياً)  
lastUnitPrice Float @default(0) // آخر سعر شراء  
averageCost Float @default(0) // متوسط التكلفة المرجح (WAC) ⭐  
totalValue Float @default(0) // القيمة الإجمالية (quantity \* averageCost)  
// حدود المخزون  
minQuantity Float @default(5) // الحد الأدنى للتنبيه  
maxQuantity Float? // الحد الأقصى (اختياري)  
reorderPoint Float? // نقطة إعادة الطلب  
// الحالة  
status String @default("AVAILABLE") // "AVAILABLE", "OUT\_OF\_STOCK", "RESERVED", "DAMAGED"  
// التواريخ  
lastPurchaseDate DateTime? // آخر تاريخ شراء  
lastUsedDate DateTime? // آخر تاريخ صرف  
expiryDate DateTime? // تاريخ الصلاحية (للزيوت)  
// معلومات التسجيل  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
// العلاقات  
item INV\_Item @relation("ItemStockRecords", fields: \[itemId\], references: \[id\], onDelete: Cascade)  
location INV\_StorageLocation @relation("LocationStockRecords", fields: \[locationId\], references: \[id\])  
@@unique(\[itemId, locationId\]) // لا يمكن تكرار نفس الصنف في نفس الموقع  
@@index(\[itemId\])  
@@index(\[locationId\])  
@@index(\[quantity\])  
@@index(\[status\])  
@@map("INV\_Stock")  
}

# **✅ (مُعدل) جدول الحركات الموحد**

# **(يستبدل INV\_SparePartTransaction و 5 جداول للزيوت)**

model INV\_Transaction {  
id Int @id @default(autoincrement())  
transactionNumber String @unique // "TRX-20251116-001"  
itemId Int // معرف الصنف الموحد  
// نوع الحركة (هام جداً)  
transactionType String // "IN\_PURCHASE", "OUT\_USAGE", "OUT\_CUSTODY", "TRANSFER", "RETURN", "ADJUST\_INCREASE", "ADJUST\_DECREASE", "DAMAGE\_WRITE\_OFF"  
// الكميات  
quantity Float // الكمية المتحركة (دائماً موجبة)  
quantityBefore Float // الكمية قبل الحركة  
quantityAfter Float // الكمية بعد الحركة  
// التكلفة (تُسجل وقت الحركة)  
unitPrice Float? // سعر الشراء (لـ IN\_PURCHASE) أو متوسط التكلفة (لـ OUT\_USAGE)  
totalCost Float? // quantity \* unitPrice  
// المواقع (للنقل)  
fromLocationId Int? // من موقع (لـ TRANSFER, RETURN)  
toLocationId Int? // إلى موقع (لـ IN\_PURCHASE, TRANSFER)  
// معلومات الربط  
equipmentId Int? // المعدة المستخدمة  
projectId Int? // المشروع  
employeeId Int? // الموظف المستلم/المسلم  
supplierName String? // المورد  
// بيانات إضافية  
invoiceNumber String? // رقم الفاتورة  
reason String? // سبب (للتسوية، الإرجاع، الهالك)  
notes String?  
attachments Json?  
// معلومات التسجيل  
transactionDate DateTime @default(now())  
createdAt DateTime @default(now())  
createdBy BigInt  
approvedBy BigInt?  
approvedAt DateTime?  
// العلاقات  
item INV\_Item @relation("ItemTransactions", fields: \[itemId\], references: \[id\])  
equipment Equipment? @relation("SparePartTransactionEquipment", fields: \[equipmentId\], references: \[id\])  
project Project? @relation("SparePartTransactionProject", fields: \[projectId\], references: \[id\])  
employee Employee? @relation("SparePartTransactionEmployee", fields: \[employeeId\], references: \[id\])  
fromLocation INV\_StorageLocation? @relation("FromTransactions", fields: \[fromLocationId\], references: \[id\])  
toLocation INV\_StorageLocation? @relation("ToTransactions", fields: \[toLocationId\], references: \[id\])  
@@index(\[transactionNumber\])  
@@index(\[itemId\])  
@@index(\[transactionType\])  
@@index(\[transactionDate\])  
@@index(\[createdBy\])  
@@index(\[employeeId\])  
@@index(\[equipmentId\])  
@@index(\[projectId\])  
@@index(\[itemId, transactionDate\])  
@@map("INV\_Transaction")  
}

# **═══════════════════════════════════════════════════════════**

# **🗄️ 2\. الكيانات الداعمة (لم تتغير تقريباً)**

# **═══════════════════════════════════════════════════════════**

# **✅ (مُعدل) مواقع التخزين (موحدة)**

# **(كان INV\_StorageLocation \- تم إضافة علاقات)**

model INV\_StorageLocation {  
id Int @id @default(autoincrement())  
code String @unique // "CONT-1", "SHELF-A1", "RACK-5"  
nameAr String // "كرستر رقم 1 \- كرفان العاملين"  
nameEn String?  
locationType String @default("SHELF") // "CONTAINER", "SHELF", "RACK", "ROOM", "VEHICLE"  
locationArea String? // "مخزن رئيسي", "ورشة", "موقع العمل"  
description String?  
notes String?  
orderIndex Int @default(0)  
isActive Boolean @default(true)  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
createdBy BigInt?  
updatedBy BigInt?  
// العلاقات  
stockRecords INV\_Stock\[\] @relation("LocationStockRecords")  
fromTransactions INV\_Transaction\[\] @relation("FromTransactions")  
toTransactions INV\_Transaction\[\] @relation("ToTransactions")  
@@index(\[code\])  
@@index(\[locationType\])  
@@index(\[isActive\])  
@@index(\[orderIndex\])  
@@map("INV\_StorageLocation")  
}

# **✅ (مُعدل) استخدام قطع الغيار**

# **(كان INV\_SparePartUsage \- تم تعديل العلاقات)**

model INV\_SparePartUsage {  
id Int @id @default(autoincrement())  
sparePartId Int // الآن هو itemId  
equipmentId Int?  
equipmentName String?  
equipmentCode String?  
projectId Int?  
projectName String?  
quantity Int  
installDate DateTime @default(now())  
expectedLife Int?  
status String @default("IN\_USE") // "IN\_USE", "REPLACED", "FAILED"  
replacedDate DateTime?  
failureReason String?  
installedByEmployeeId Int?  
installedByName String?  
notes String?  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
// العلاقات  
item INV\_Item @relation("SparePartUsages", fields: \[sparePartId\], references: \[id\])  
equipment Equipment? @relation("SparePartUsageEquipment", fields: \[equipmentId\], references: \[id\])  
project Project? @relation("SparePartUsageProject", fields: \[projectId\], references: \[id\])  
installer Employee? @relation("SparePartUsageInstaller", fields: \[installedByEmployeeId\], references: \[id\])  
@@index(\[sparePartId\])  
@@index(\[equipmentId\])  
@@index(\[projectId\])  
@@index(\[status\])  
@@index(\[installDate\])  
@@index(\[installedByEmployeeId\])  
@@map("INV\_SparePartUsage")  
}

# **✅ (مُعدل) سجل الهوالك/التالف**

# **(كان INV\_DamageRecord \- تم تعديل العلاقات)**

model INV\_DamageRecord {  
id Int @id @default(autoincrement())  
recordNumber String @unique // "DMG-20251109-001"  
sparePartId Int // الآن هو itemId  
damageType String // "EXPIRED", "BROKEN", "DEFECTIVE", "OTHER"  
damageDate DateTime @default(now())  
discoveredBy BigInt  
quantity Int  
unitPrice Float  
totalValue Float  
damageReason String  
damageSeverity String @default("MEDIUM")  
isRepairable Boolean @default(false)  
actionTaken String? // "REPAIR", "DISPOSE", "PENDING"  
actionDate DateTime?  
actionBy BigInt?  
recoveredValue Float @default(0)  
approvalStatus String @default("PENDING")  
approvedBy BigInt?  
approvedAt DateTime?  
photos Json?  
notes String?  
createdAt DateTime @default(now())  
updatedAt DateTime @updatedAt  
// العلاقات  
item INV\_Item @relation("SparePartDamages", fields: \[sparePartId\], references: \[id\])  
@@index(\[recordNumber\])  
@@index(\[sparePartId\])  
@@index(\[damageType\])  
@@index(\[damageDate\])  
@@index(\[approvalStatus\])  
@@index(\[actionTaken\])  
@@index(\[discoveredBy\])  
@@map("INV\_DamageRecord")  
}

# **✅ (مُعدل) الجرد**

# **(كان INV\_InventoryAudit \- لا تغيير تقريباً، جاهز وموحد)**

model INV\_InventoryAudit {  
id Int @id @default(autoincrement())  
auditNumber String @unique // "AUD-20251111-00001"  
warehouseType String // "SPARE\_PARTS", "OILS\_GREASE", "FUEL", "TOOLS"  
auditType String // "FULL", "CATEGORY", "LOCATION", "SINGLE\_ITEM"  
categoryId Int?  
locationId Int?  
itemId Int?  
itemCode String?  
status String @default("IN\_PROGRESS") // "IN\_PROGRESS", "COMPLETED", "CANCELLED"  
totalItems Int @default(0)  
itemsChecked Int @default(0)  
itemsWithDiff Int @default(0)  
totalShortage Int @default(0)  
totalSurplus Int @default(0)  
auditDate DateTime @default(now())  
startedAt DateTime @default(now())  
completedDate DateTime?  
createdBy BigInt  
completedBy BigInt?  
notes String?  
items INV\_InventoryAuditItem\[\]

@@index(\[auditNumber\])  
@@index(\[warehouseType\])  
@@index(\[status\])  
@@index(\[auditType\])  
@@index(\[auditDate\])  
@@index(\[createdBy\])  
@@map("INV\_InventoryAudit")  
}

# **✅ (مُعدل) عناصر الجرد**

# **(كان INV\_InventoryAuditItem \- تم تعديل العلاقات)**

model INV\_InventoryAuditItem {  
id Int @id @default(autoincrement())  
auditId Int  
itemId Int // معرف الصنف الموحد  
itemType String // "SPARE\_PART", "OILS\_GREASE", "FUEL", "TOOL"  
itemCode String  
itemName String  
systemQuantity Float // الكمية في النظام  
actualQuantity Float // الكمية الفعلية المجردة  
difference Float // الفرق (actual \- system)  
systemDetails Json? // تفاصيل (جديد، مستعمل...)  
actualDetails Json? // تفاصيل (جديد، مستعمل...)  
locationId Int?  
locationName String?  
categoryId Int?  
categoryName String?  
unit String @default("قطعة")

hasDiscrepancy Boolean @default(false)  
discrepancyType String? // "SHORTAGE", "SURPLUS", "MATCH"  
notes String?  
checkedAt DateTime @default(now())  
audit INV\_InventoryAudit @relation(fields: \[auditId\], references: \[id\], onDelete: Cascade)  
item INV\_Item @relation("AuditItems", fields: \[itemId\], references: \[id\])  
@@index(\[auditId\])  
@@index(\[itemType\])  
@@index(\[itemId\])  
@@index(\[hasDiscrepancy\])  
@@index(\[discrepancyType\])  
@@map("INV\_InventoryAuditItem")  
}

# **(يُتبع في schema.prisma: تعديل العلاقات في Employee, Project, Equipment لتربط بالجداول الموحدة)**