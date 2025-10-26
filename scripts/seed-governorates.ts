import { PrismaClient } from '../generated/prisma/index.js'
import { governorates } from './seeds/governorates.js'

const prisma = new PrismaClient()

async function seedGovernorates() {
  console.log('🌍 بدء إضافة بيانات المحافظات...')

  for (const gov of governorates) {
    await prisma.governorate.upsert({
      where: { code: gov.code },
      update: gov,
      create: gov,
    })
    console.log(`✅ تم إضافة: ${gov.nameAr} (${gov.nameEn})`)
  }

  console.log(`\n✨ تم إضافة ${governorates.length} محافظة بنجاح!`)
  
  // عرض الترتيب النهائي
  const allGovs = await prisma.governorate.findMany({
    orderBy: { orderIndex: 'asc' },
    select: { orderIndex: true, nameAr: true, nameEn: true },
  })
  
  console.log('\n📋 الترتيب النهائي:')
  allGovs.forEach(gov => {
    console.log(`${gov.orderIndex}. ${gov.nameAr} (${gov.nameEn})`)
  })
}

async function main() {
  try {
    await seedGovernorates()
  } catch (error) {
    console.error('❌ خطأ في إضافة المحافظات:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
