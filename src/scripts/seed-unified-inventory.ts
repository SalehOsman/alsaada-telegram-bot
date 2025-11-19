/**
 * Seed Unified Inventory Data
 * إضافة بيانات أساسية للنظام الموحد (V3)
 */

import { Database } from '../modules/database/index.js'

export async function seedUnifiedInventory() {
  try {
    console.log('🌱 بدء إضافة بيانات المخازن الموحدة...\n')

    // ═══════════════════════════════════════════════════════
    // 🏷️ الفئات الموحدة (Unified Categories)
    // ═══════════════════════════════════════════════════════
    const categories = [
      {
        code: 'SPARE_PART',
        nameAr: 'قطع غيار',
        nameEn: 'Spare Parts',
        icon: '⚙️',
        prefix: 'SP',
        description: 'قطع غيار المعدات والسيارات',
        orderIndex: 1,
      },
      {
        code: 'OILS_GREASE',
        nameAr: 'زيوت وشحوم',
        nameEn: 'Oils & Greases',
        icon: '🛢️',
        prefix: 'OG',
        description: 'زيوت محركات، زيوت هيدروليك، شحوم',
        orderIndex: 2,
      },
      {
        code: 'FUEL',
        nameAr: 'سولار ومحروقات',
        nameEn: 'Fuel & Diesel',
        icon: '⛽',
        prefix: 'FL',
        description: 'سولار، بنزين، ومحروقات أخرى',
        orderIndex: 3,
      },
      {
        code: 'TOOLS',
        nameAr: 'عدد وأدوات',
        nameEn: 'Tools & Equipment',
        icon: '🛠️',
        prefix: 'TL',
        description: 'أدوات يدوية، عدد كهربائية',
        orderIndex: 4,
      },
    ]

    console.log('📦 إضافة الفئات الموحدة...')
    for (const cat of categories) {
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
        console.log(`   ✅ ${cat.nameAr} (${cat.code})`)
      } else {
        console.log(`   ⏭️  ${cat.nameAr} موجودة مسبقاً`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 📍 مواقع التخزين (Storage Locations)
    // ═══════════════════════════════════════════════════════
    const locations = [
      {
        code: 'CONT-1',
        nameAr: 'كرستر رقم 1 - كرفان العاملين',
        nameEn: 'Container 1 - Workers Caravan',
        locationType: 'CONTAINER',
        locationArea: 'مخزن رئيسي',
        orderIndex: 1,
      },
      {
        code: 'CONT-2',
        nameAr: 'كرستر رقم 2 - الموقع الشمالي',
        nameEn: 'Container 2 - North Site',
        locationType: 'CONTAINER',
        locationArea: 'موقع العمل',
        orderIndex: 2,
      },
      {
        code: 'SHELF-A1',
        nameAr: 'رف A1 - قطع غيار رئيسية',
        nameEn: 'Shelf A1 - Main Spare Parts',
        locationType: 'SHELF',
        locationArea: 'مخزن رئيسي',
        orderIndex: 3,
      },
      {
        code: 'SHELF-A2',
        nameAr: 'رف A2 - زيوت وشحوم',
        nameEn: 'Shelf A2 - Oils & Greases',
        locationType: 'SHELF',
        locationArea: 'مخزن رئيسي',
        orderIndex: 4,
      },
      {
        code: 'RACK-1',
        nameAr: 'رف معدني 1 - الورشة',
        nameEn: 'Metal Rack 1 - Workshop',
        locationType: 'RACK',
        locationArea: 'ورشة',
        orderIndex: 5,
      },
      {
        code: 'VEHICLE-1',
        nameAr: 'سيارة الخدمة - موبايل',
        nameEn: 'Service Vehicle - Mobile',
        locationType: 'VEHICLE',
        locationArea: 'موقع العمل',
        orderIndex: 6,
      },
    ]

    console.log('\n📍 إضافة مواقع التخزين...')
    for (const loc of locations) {
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
        console.log(`   ✅ ${loc.nameAr} (${loc.code})`)
      } else {
        console.log(`   ⏭️  ${loc.nameAr} موجود مسبقاً`)
      }
    }

    console.log('\n✨ اكتملت إضافة بيانات المخازن الموحدة بنجاح!\n')
    console.log('📊 الملخص:')
    console.log(`   - الفئات: ${categories.length}`)
    console.log(`   - مواقع التخزين: ${locations.length}`)
    console.log('   - النظام جاهز للاستخدام! 🚀\n')
  } catch (error) {
    console.error('❌ خطأ في إضافة بيانات المخازن:', error)
    throw error
  }
}

// تشغيل السكريبت مباشرة إذا تم استدعاؤه
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUnifiedInventory()
    .then(() => {
      console.log('✅ تمت العملية بنجاح!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ فشلت العملية:', error)
      process.exit(1)
    })
}

