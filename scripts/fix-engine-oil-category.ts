/**
 * Fix ENGINE-OIL category - should be oils-greases not spare-parts
 * إصلاح تصنيف زيت المحرك
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 إصلاح تصنيف زيت المحرك...\n')

  try {
    // نقل "زيت محرك" من قطع غيار إلى زيوت وشحوم
    const result = await prisma.iNV_Category.updateMany({
      where: {
        OR: [
          { code: 'ENGINE-OIL' },
          { prefix: 'ENG' },
          { nameAr: 'زيت محرك' },
        ],
      },
      data: {
        warehouseType: 'oils-greases',
      },
    })

    console.log(`✅ تم تحديث ${result.count} تصنيف`)

    // عرض الملخص النهائي
    console.log('\n📊 ملخص التصنيفات النهائي:')
    
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

    // عرض تصنيفات الزيوت والشحوم
    console.log('\n🛢️ تصنيفات الزيوت والشحوم:')
    const oilsCategories = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'oils-greases',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    for (const cat of oilsCategories) {
      console.log(`   • ${cat.nameAr} (${cat.code}) - Prefix: ${cat.prefix || 'N/A'}`)
    }

    // عرض تصنيفات قطع الغيار
    console.log('\n⚙️ تصنيفات قطع الغيار:')
    const sparePartsCategories = await prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'spare-parts',
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        nameAr: true,
        code: true,
        prefix: true,
      },
    })

    for (const cat of sparePartsCategories) {
      console.log(`   • ${cat.nameAr} (${cat.code}) - Prefix: ${cat.prefix || 'N/A'}`)
    }

    console.log('\n✅ تم الإصلاح بنجاح!')
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

