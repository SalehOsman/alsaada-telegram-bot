/**
 * Seed Default Inventory Data
 * إنشاء بيانات افتراضية للتصنيفات والمواقع عند البدء
 */

import { Database } from '../modules/database/index.js'

export async function seedInventoryDefaults() {
  try {
    // ═══════════════════════════════════════════════════════
    // 🏷️ إنشاء التصنيفات الافتراضية
    // ═══════════════════════════════════════════════════════
    const defaultCategories = [
      { code: 'CAR', nameAr: 'سيارات', nameEn: 'Cars', icon: '🚗', prefix: 'CAR', orderIndex: 1 },
      { code: 'LOADER', nameAr: 'لوادر', nameEn: 'Loaders', icon: '🚜', prefix: 'LDR', orderIndex: 2 },
      { code: 'BULLDOZER', nameAr: 'بلدوزر', nameEn: 'Bulldozers', icon: '🔶', prefix: 'BUL', orderIndex: 3 },
      { code: 'EXCAVATOR', nameAr: 'حفارات', nameEn: 'Excavators', icon: '🏗️', prefix: 'EXC', orderIndex: 4 },
      { code: 'GENERAL', nameAr: 'عام', nameEn: 'General', icon: '🔧', prefix: 'GEN', orderIndex: 5 },
    ]

    for (const cat of defaultCategories) {
      const existing = await Database.prisma.iNV_Category.findUnique({
        where: { code: cat.code },
      })

      if (!existing) {
        await Database.prisma.iNV_Category.create({
          data: {
            ...cat,
            isActive: true,
            createdBy: BigInt(0), // System user
          },
        })
        console.log(`✅ Created category: ${cat.nameAr}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 📍 إنشاء المواقع الافتراضية
    // ═══════════════════════════════════════════════════════
    const defaultLocations = [
      {
        code: 'CONT-1',
        nameAr: 'كرستر رقم 1 - كرفان العاملين',
        nameEn: 'Container 1 - Workers Caravan',
        locationType: 'CONTAINER',
        orderIndex: 1,
      },
      {
        code: 'SHELF-A1',
        nameAr: 'رف A1 - المخزن الرئيسي',
        nameEn: 'Shelf A1 - Main Warehouse',
        locationType: 'SHELF',
        orderIndex: 2,
      },
      {
        code: 'RACK-5',
        nameAr: 'كرفان قطع الغيار رقم 5',
        nameEn: 'Spare Parts Rack 5',
        locationType: 'RACK',
        orderIndex: 3,
      },
    ]

    for (const loc of defaultLocations) {
      const existing = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { code: loc.code },
      })

      if (!existing) {
        await Database.prisma.iNV_StorageLocation.create({
          data: {
            ...loc,
            isActive: true,
            createdBy: BigInt(0), // System user
          },
        })
        console.log(`✅ Created location: ${loc.nameAr}`)
      }
    }

    console.log('✅ Inventory defaults seeding completed')
  }
  catch (error) {
    console.error('❌ Error seeding inventory defaults:', error)
  }
}

/**
 * Seed Default Oils & Greases Categories
 * إنشاء بيانات افتراضية لأنواع الزيوت والشحوم
 */
export async function seedOilsGreasesCategories() {
  try {
    // ═══════════════════════════════════════════════════════
    // 🛢️ إنشاء أنواع الزيوت والشحوم الافتراضية
    // ═══════════════════════════════════════════════════════
    const defaultCategories = [
      {
        code: 'ENGINE-OIL',
        nameAr: 'زيت محرك',
        nameEn: 'Engine Oil',
        prefix: 'ENG',
        description: 'زيوت المحركات بجميع أنواعها ودرجات اللزوجة',
        orderIndex: 1,
      },
      {
        code: 'GREASE',
        nameAr: 'شحم',
        nameEn: 'Grease',
        prefix: 'GRS',
        description: 'الشحوم الصناعية للتشحيم',
        orderIndex: 2,
      },
      {
        code: 'HYDRAULIC-OIL',
        nameAr: 'زيت هيدروليك',
        nameEn: 'Hydraulic Oil',
        prefix: 'HYD',
        description: 'زيوت الهيدروليك للمعدات الثقيلة',
        orderIndex: 3,
      },
      {
        code: 'GEAR-OIL',
        nameAr: 'زيت تروس',
        nameEn: 'Gear Oil',
        prefix: 'GER',
        description: 'زيوت علب التروس والجير',
        orderIndex: 4,
      },
      {
        code: 'TRANSMISSION-OIL',
        nameAr: 'زيت ناقل حركة',
        nameEn: 'Transmission Oil',
        prefix: 'TRN',
        description: 'زيوت ناقل الحركة (ATF)',
        orderIndex: 5,
      },
      {
        code: 'BRAKE-FLUID',
        nameAr: 'زيت فرامل',
        nameEn: 'Brake Fluid',
        prefix: 'BRK',
        description: 'سوائل الفرامل',
        orderIndex: 6,
      },
      {
        code: 'COOLANT',
        nameAr: 'سائل تبريد',
        nameEn: 'Coolant',
        prefix: 'COL',
        description: 'سوائل التبريد (مياه رديتر)',
        orderIndex: 7,
      },
      {
        code: 'OTHER',
        nameAr: 'أخرى',
        nameEn: 'Other',
        prefix: 'OTH',
        description: 'زيوت وشحوم أخرى',
        orderIndex: 99,
      },
    ]

    for (const cat of defaultCategories) {
      const existing = await Database.prisma.iNV_Category.findUnique({
        where: { code: cat.code },
      })

      if (!existing) {
        await Database.prisma.iNV_Category.create({
          data: {
            ...cat,
            isActive: true,
            createdBy: BigInt(0), // System user
          },
        })
        console.log(`✅ 🛢️ Created oils/greases category: ${cat.nameAr} (${cat.prefix})`)
      }
    }

    console.log('✅ Oils & Greases categories seeding completed')
  }
  catch (error) {
    console.error('❌ Error seeding oils & greases categories:', error)
  }
}
