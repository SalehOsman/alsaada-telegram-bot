/**
 * Reorganize Categories - إعادة تنظيم التصنيفات
 * 
 * الزيوت والشحوم: حسب نوع الزيت
 * قطع الغيار: حسب نوع المعدة
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 إعادة تنظيم التصنيفات...\n')

  try {
    // ═══════════════════════════════════════════════════════════
    // 1️⃣ تصنيفات الزيوت والشحوم (حسب نوع الزيت)
    // ═══════════════════════════════════════════════════════════
    console.log('🛢️ تحديث تصنيفات الزيوت والشحوم...')
    
    const oilsCategories = [
      { code: 'ENGINE-OIL', nameAr: 'زيت محرك', prefix: 'ENG' },
      { code: 'HYDRAULIC-OIL', nameAr: 'زيت هيدروليك', prefix: 'HYD' },
      { code: 'GEAR-OIL', nameAr: 'زيت تروس', prefix: 'GER' },
      { code: 'TRANSMISSION-OIL', nameAr: 'زيت ناقل حركة', prefix: 'TRN' },
      { code: 'BRAKE-FLUID', nameAr: 'زيت فرامل', prefix: 'BRK' },
      { code: 'GREASE', nameAr: 'شحم', prefix: 'GRS' },
      { code: 'COOLANT', nameAr: 'سائل تبريد', prefix: 'COL' },
      { code: 'OILS_GREASE', nameAr: 'زيوت وشحوم', prefix: 'OG' },
      { code: 'GENERAL', nameAr: 'عام', prefix: 'GEN' },
      { code: 'OTHER', nameAr: 'أخرى', prefix: 'OTH' },
    ]

    for (const category of oilsCategories) {
      const updated = await prisma.iNV_Category.updateMany({
        where: { code: category.code },
        data: { warehouseType: 'oils-greases' },
      })
      if (updated.count > 0) {
        console.log(`   ✅ ${category.nameAr} → oils-greases`)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 2️⃣ تصنيفات قطع الغيار (حسب نوع المعدة)
    // ═══════════════════════════════════════════════════════════
    console.log('\n⚙️ تحديث تصنيفات قطع الغيار...')
    
    const sparePartsCategories = [
      { code: 'CAR', nameAr: 'قطع غيار سيارات', prefix: 'CAR' },
      { code: 'LOADER', nameAr: 'قطع غيار لوادر', prefix: 'LDR' },
      { code: 'BULLDOZER', nameAr: 'قطع غيار بلدوزر', prefix: 'BUL' },
      { code: 'EXCAVATOR', nameAr: 'قطع غيار حفارات', prefix: 'EXC' },
      { code: 'SPARE_PART', nameAr: 'قطع غيار عامة', prefix: 'SP' },
    ]

    for (const category of sparePartsCategories) {
      const updated = await prisma.iNV_Category.updateMany({
        where: { code: category.code },
        data: { 
          warehouseType: 'spare-parts',
          nameAr: category.nameAr, // تحديث الاسم أيضاً
        },
      })
      if (updated.count > 0) {
        console.log(`   ✅ ${category.nameAr} → spare-parts`)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3️⃣ عرض الملخص النهائي
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60))
    console.log('📊 الملخص النهائي')
    console.log('═'.repeat(60))
    
    const categoriesByWarehouse = await prisma.iNV_Category.groupBy({
      by: ['warehouseType'],
      _count: true,
      where: { isActive: true },
    })

    for (const group of categoriesByWarehouse) {
      const warehouseNames: Record<string, string> = {
        'oils-greases': '🛢️ الزيوت والشحوم',
        'spare-parts': '⚙️ قطع الغيار',
        'diesel': '⛽ السولار',
        'tools': '🛠️ العدد والأدوات',
      }
      console.log(`${warehouseNames[group.warehouseType] || group.warehouseType}: ${group._count} تصنيف`)
    }

    // ═══════════════════════════════════════════════════════════
    // 4️⃣ عرض التصنيفات التفصيلية
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60))
    console.log('📋 التصنيفات التفصيلية')
    console.log('═'.repeat(60))

    // الزيوت والشحوم
    console.log('\n🛢️ مخزن الزيوت والشحوم (حسب نوع الزيت):')
    console.log('─'.repeat(60))
    const oilsCategoriesList = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'oils-greases',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    oilsCategoriesList.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nameAr}`)
      console.log(`      Code: ${cat.code} | Prefix: ${cat.prefix || 'N/A'} | ID: ${cat.id}`)
    })

    // قطع الغيار
    console.log('\n⚙️ مخزن قطع الغيار (حسب نوع المعدة):')
    console.log('─'.repeat(60))
    const sparePartsCategoriesList = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'spare-parts',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    sparePartsCategoriesList.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nameAr}`)
      console.log(`      Code: ${cat.code} | Prefix: ${cat.prefix || 'N/A'} | ID: ${cat.id}`)
    })

    // السولار
    console.log('\n⛽ مخزن السولار:')
    console.log('─'.repeat(60))
    const dieselCategoriesList = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'diesel',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    dieselCategoriesList.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nameAr}`)
      console.log(`      Code: ${cat.code} | Prefix: ${cat.prefix || 'N/A'} | ID: ${cat.id}`)
    })

    // العدد والأدوات
    console.log('\n🛠️ مخزن العدد والأدوات:')
    console.log('─'.repeat(60))
    const toolsCategoriesList = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'tools',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    toolsCategoriesList.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nameAr}`)
      console.log(`      Code: ${cat.code} | Prefix: ${cat.prefix || 'N/A'} | ID: ${cat.id}`)
    })

    console.log('\n' + '═'.repeat(60))
    console.log('✅ تم إعادة التنظيم بنجاح!')
    console.log('═'.repeat(60))
    
    console.log('\n💡 يمكنك الآن:')
    console.log('   • إضافة تصنيفات جديدة من إعدادات البوت')
    console.log('   • تعديل أو حذف التصنيفات الموجودة')
    console.log('   • كل مخزن سيعرض تصنيفاته الخاصة فقط')
  }
  catch (error) {
    console.error('❌ حدث خطأ:', error)
    throw error
  }
  finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

