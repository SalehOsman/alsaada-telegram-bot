/**
 * Script to update warehouse types for existing categories
 * تحديث أنواع المخازن للتصنيفات الموجودة
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 بدء تحديث أنواع المخازن للتصنيفات...\n')

  try {
    // 1️⃣ تصنيفات الزيوت والشحوم (Oils & Greases)
    const oilsCategories = await prisma.iNV_Category.updateMany({
      where: {
        OR: [
          { prefix: 'OG' },
          { code: { contains: 'OIL' } },
          { code: { contains: 'GREASE' } },
          { nameAr: { contains: 'زيت' } },
          { nameAr: { contains: 'شحم' } },
        ],
      },
      data: {
        warehouseType: 'oils-greases',
      },
    })
    console.log(`✅ تم تحديث ${oilsCategories.count} تصنيف للزيوت والشحوم`)

    // 2️⃣ تصنيفات قطع الغيار (Spare Parts)
    const sparePartsCategories = await prisma.iNV_Category.updateMany({
      where: {
        OR: [
          { prefix: 'SP' },
          { code: { contains: 'SPARE' } },
          { code: { contains: 'PART' } },
          { nameAr: { contains: 'قطع غيار' } },
          { nameAr: { contains: 'فلتر' } },
          { nameAr: { contains: 'محرك' } },
        ],
      },
      data: {
        warehouseType: 'spare-parts',
      },
    })
    console.log(`✅ تم تحديث ${sparePartsCategories.count} تصنيف لقطع الغيار`)

    // 3️⃣ تصنيفات السولار (Diesel/Fuel)
    const dieselCategories = await prisma.iNV_Category.updateMany({
      where: {
        OR: [
          { prefix: 'FL' },
          { prefix: 'DS' },
          { code: { contains: 'FUEL' } },
          { code: { contains: 'DIESEL' } },
          { nameAr: { contains: 'سولار' } },
          { nameAr: { contains: 'وقود' } },
        ],
      },
      data: {
        warehouseType: 'diesel',
      },
    })
    console.log(`✅ تم تحديث ${dieselCategories.count} تصنيف للسولار`)

    // 4️⃣ تصنيفات العدد والأدوات (Tools)
    const toolsCategories = await prisma.iNV_Category.updateMany({
      where: {
        OR: [
          { prefix: 'TL' },
          { code: { contains: 'TOOL' } },
          { code: { contains: 'EQUIPMENT' } },
          { nameAr: { contains: 'عدد' } },
          { nameAr: { contains: 'أدوات' } },
        ],
      },
      data: {
        warehouseType: 'tools',
      },
    })
    console.log(`✅ تم تحديث ${toolsCategories.count} تصنيف للعدد والأدوات`)

    // 5️⃣ عرض جميع التصنيفات بعد التحديث
    console.log('\n📊 ملخص التصنيفات حسب نوع المخزن:')
    
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
      console.log(`   ${warehouseNames[group.warehouseType] || group.warehouseType}: ${group._count} تصنيف`)
    }

    // 6️⃣ عرض قائمة تفصيلية بكل تصنيف
    console.log('\n📋 قائمة التصنيفات التفصيلية:')
    const allCategories = await prisma.iNV_Category.findMany({
      where: { isActive: true },
      orderBy: [{ warehouseType: 'asc' }, { orderIndex: 'asc' }],
      select: {
        id: true,
        code: true,
        nameAr: true,
        prefix: true,
        warehouseType: true,
      },
    })

    let currentWarehouse = ''
    for (const cat of allCategories) {
      if (cat.warehouseType !== currentWarehouse) {
        currentWarehouse = cat.warehouseType
        const warehouseNames: Record<string, string> = {
          'oils-greases': '\n🛢️ الزيوت والشحوم',
          'spare-parts': '\n⚙️ قطع الغيار',
          'diesel': '\n⛽ السولار',
          'tools': '\n🛠️ العدد والأدوات',
        }
        console.log(warehouseNames[currentWarehouse] || `\n${currentWarehouse}`)
      }
      console.log(`   • ${cat.nameAr} (${cat.code}) - Prefix: ${cat.prefix || 'N/A'}`)
    }

    console.log('\n✅ تم التحديث بنجاح!')
  }
  catch (error) {
    console.error('❌ حدث خطأ أثناء التحديث:', error)
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

