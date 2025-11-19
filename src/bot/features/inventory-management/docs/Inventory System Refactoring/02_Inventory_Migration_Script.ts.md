# **📦 قالب سكريبت ترحيل البيانات (Data Migration Script Logic)**

# **المسار: scripts/V2\_unify\_inventory\_migration.ts**

# **هام: هذا السكريبت يجب تشغيله *بعد* إنشاء ملف الترحيل (migration)**

# **وقبل تطبيق الترحيل (migrate dev)**

# **npm install \-D @prisma/client (إذا لم يكن مثبتاً)**

# **npx ts-node scripts/V2\_unify\_inventory\_migration.ts**

import { PrismaClient } from '@prisma/client';

// هام: قم باستيراد أنواع Prisma من \*الموقع المؤقت\* الذي يُنشئه Prisma  
// قبل تطبيق الترحيل، ليتعرف على الجداول القديمة والجديدة.  
// أو قم بتعريف الأنواع القديمة (Old Models) يدوياً.

// توضيح: هذا السكريبت هو "شبه كود" (Pseudo-code) يوضح المنطق.  
// قد يحتاج إلى تعديلات ليعمل مباشرة، خصوصاً في أسماء العلاقات  
// ومعالجة الأخطاء.

const prisma \= new PrismaClient();

async function main() {  
  console.log('Starting inventory data migration...');

  // \--- الخطوة 1: ترحيل الفئات \---  
  console.log('Migrating categories...');  
    
  // @ts-ignore (لأن Prisma قد لا يتعرف على الجداول القديمة)  
  const oldSparePartCategories \= await prisma.iNV\_EquipmentCategory.findMany();  
  for (const cat of oldSparePartCategories) {  
    await prisma.iNV\_Category.create({  
      data: {  
        ...cat,  
        inventoryType: 'SPARE\_PART', // إضافة النوع الجديد  
      },  
    });  
  }

  // @ts-ignore  
  const oldOilsCategories \= await prisma.iNV\_OilsGreasesCategory.findMany();  
  for (const cat of oldOilsCategories) {  
    await prisma.iNV\_Category.create({  
      data: {  
        ...cat,  
        inventoryType: 'OILS\_GREASE', // إضافة النوع الجديد  
      },  
    });  
  }  
  console.log('Categories migrated.');

  // \--- الخطوة 2: ترحيل الأصناف والأرصدة (الأكثر تعقيداً) \---  
  console.log('Migrating items and stock records...');

  await prisma.$transaction(async (tx) \=\> {  
    // ترحيل قطع الغيار  
    // @ts-ignore  
    const oldSpareParts \= await tx.iNV\_SparePart.findMany();  
    for (const oldItem of oldSpareParts) {  
        
      // 1\. إنشاء الصنف الموحد (INV\_Item)  
      // @ts-ignore  
      const newItem \= await tx.iNV\_Item.create({  
        data: {  
          code: oldItem.code,  
          barcode: oldItem.barcode,  
          nameAr: oldItem.nameAr,  
          nameEn: oldItem.nameEn,  
          description: oldItem.description,  
          categoryId: oldItem.categoryId, // يجب التأكد أن هذا الـ ID صحيح بعد دمج الفئات  
          unit: oldItem.unit,  
          supplierName: oldItem.supplierName,  
          supplierContact: oldItem.supplierContact,  
          partNumber: oldItem.partNumber,  
          manufacturer: oldItem.manufacturer,  
          specifications: oldItem.specifications,  
          imagePath: oldItem.imagePath,  
          images: oldItem.images,  
          documents: oldItem.documents,  
          responsibleEmployeeId: oldItem.responsibleEmployeeId,  
          isActive: oldItem.isActive,  
          createdAt: oldItem.createdAt,  
          updatedAt: oldItem.updatedAt,  
          createdBy: oldItem.createdBy,  
          updatedBy: oldItem.updatedBy,  
          // ... باقي الحقول التعريفية  
        },  
      });

      // 2\. إنشاء رصيد المخزن (INV\_Stock)  
      if (oldItem.locationId) {  
        // @ts-ignore  
        await tx.iNV\_Stock.create({  
          data: {  
            itemId: newItem.id,  
            locationId: oldItem.locationId,  
            quantity: oldItem.quantity,  
            quantityNew: oldItem.quantityNew,  
            quantityUsed: oldItem.quantityUsed,  
            quantityRefurbished: oldItem.quantityRefurbished,  
            lastUnitPrice: oldItem.unitPrice,  
            averageCost: oldItem.unitPrice, // نفترض أن السعر الحالي هو متوسط التكلفة كبداية  
            totalValue: oldItem.totalValue,  
            minQuantity: oldItem.minQuantity,  
            maxQuantity: oldItem.maxQuantity,  
            reorderPoint: oldItem.reorderPoint,  
            status: oldItem.status,  
            lastPurchaseDate: oldItem.lastPurchaseDate,  
            // ... باقي حقول الرصيد  
          },  
        });  
      }  
    }

    // ترحيل الزيوت والشحوم (تكرار نفس المنطق)  
    // @ts-ignore  
    const oldOilsItems \= await tx.iNV\_OilsGreasesItem.findMany();  
    for (const oldItem of oldOilsItems) {  
      // 1\. إنشاء الصنف الموحد (INV\_Item)  
      // @ts-ignore  
      const newItem \= await tx.iNV\_Item.create({  
        data: {  
          code: oldItem.code,  
          barcode: oldItem.barcode,  
          nameAr: oldItem.nameAr,  
          nameEn: oldItem.nameEn,  
          description: oldItem.description,  
          categoryId: oldItem.categoryId, // تأكد من ID الفئة  
          unit: oldItem.unit,  
          unitCapacity: oldItem.unitCapacity,  
          supplierName: oldItem.supplierName,  
          supplierContact: oldItem.supplierContact,  
          partNumber: oldItem.partNumber,  
          manufacturer: oldItem.manufacturer,  
          specifications: oldItem.specifications,  
          imagePath: oldItem.imagePath,  
          images: oldItem.images,  
          isActive: oldItem.isActive,  
          createdAt: oldItem.createdAt,  
          updatedAt: oldItem.updatedAt,  
          createdBy: oldItem.createdBy,  
          updatedBy: oldItem.updatedBy,  
        },  
      });

      // 2\. إنشاء رصيد المخزن (INV\_Stock)  
      if (oldItem.locationId) {  
        // @ts-ignore  
        await tx.iNV\_Stock.create({  
          data: {  
            itemId: newItem.id,  
            locationId: oldItem.locationId,  
            quantity: oldItem.quantity,  
            lastUnitPrice: oldItem.unitPrice,  
            averageCost: oldItem.unitPrice,  
            totalValue: oldItem.totalValue,  
            minQuantity: oldItem.minQuantity,  
            maxQuantity: oldItem.maxQuantity,  
            reorderPoint: oldItem.reorderPoint,  
            status: oldItem.status,  
            lastPurchaseDate: oldItem.lastPurchaseDate,  
            expiryDate: oldItem.expiryDate,  
          },  
        });  
      }  
    }  
  });  
  console.log('Items and stock records migrated.');

  // \--- الخطوة 3: ترحيل الحركات (Transactions) \---  
  console.log('Migrating transactions... (This is complex)');  
  // ... يجب إضافة منطق لترحيل  
  // 1\. INV\_SparePartTransaction \-\> INV\_Transaction  
  // 2\. INV\_OilsGreasesPurchase \-\> INV\_Transaction (type: 'IN\_PURCHASE')  
  // 3\. INV\_OilsGreasesIssuance \-\> INV\_Transaction (type: 'OUT\_USAGE')  
  // ... إلخ لباقي الجداول الخمسة  
    
  // مثال لترحيل مشتريات الزيوت  
  // @ts-ignore  
  const oldPurchases \= await prisma.iNV\_OilsGreasesPurchase.findMany();  
  for (const purchase of oldPurchases) {  
    // البحث عن الـ ID الجديد للصنف  
    // @ts-ignore  
    const item \= await prisma.iNV\_Item.findUnique({ where: { oldId: purchase.itemId } }); // نفترض أنك أضفت oldId  
      
    if (item) {  
      // @ts-ignore  
      await prisma.iNV\_Transaction.create({  
        data: {  
          // ... ملء بيانات INV\_Transaction الجديدة  
          transactionNumber: purchase.purchaseNumber,  
          itemId: item.id,  
          transactionType: 'IN\_PURCHASE',  
          quantity: purchase.quantity,  
          unitPrice: purchase.unitPrice,  
          totalCost: purchase.totalCost,  
          supplierName: purchase.supplierName,  
          invoiceNumber: purchase.invoiceNumber,  
          transactionDate: purchase.purchaseDate,  
          createdBy: purchase.createdBy,  
          // ...  
        }  
      });  
    }  
  }  
    
  console.log('Transactions migrated.');  
  console.log('--- MIGRATION LOGIC COMPLETE \---');  
  console.log('\!\!\! الآن يمكنك حذف الجداول القديمة وتطبيق الترحيل (prisma migrate dev) \!\!\!');  
}

main()  
  .catch((e) \=\> {  
    console.error('Error during migration:', e);  
    process.exit(1);  
  })  
  .finally(async () \=\> {  
    await prisma.$disconnect();  
  });  
