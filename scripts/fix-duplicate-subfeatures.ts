/**
 * Script لحذف السجلات المكررة في SubFeatureConfig
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 البحث عن السجلات المكررة...\n')

  // جلب جميع سجلات قسم المخازن
  const allSubFeatures = await prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`📊 إجمالي السجلات الموجودة: ${allSubFeatures.length}\n`)

  // تجميع حسب code
  const grouped = new Map<string, typeof allSubFeatures>()
  for (const sf of allSubFeatures) {
    if (!grouped.has(sf.code)) {
      grouped.set(sf.code, [])
    }
    grouped.get(sf.code)!.push(sf)
  }

  console.log('📋 السجلات حسب الكود:\n')
  let totalDuplicates = 0

  for (const [code, records] of grouped.entries()) {
    console.log(`   ${code}: ${records.length} سجل`)
    if (records.length > 1) {
      console.log(`      ⚠️  مكرر! سيتم الاحتفاظ بالأول وحذف الباقي`)
      totalDuplicates += records.length - 1
    }
  }

  if (totalDuplicates === 0) {
    console.log('\n✅ لا توجد سجلات مكررة!')
    return
  }

  console.log(`\n⚠️  إجمالي السجلات المكررة: ${totalDuplicates}`)
  console.log('\n🗑️  حذف السجلات المكررة...\n')

  // حذف المكررات (الاحتفاظ بالأول فقط)
  for (const [code, records] of grouped.entries()) {
    if (records.length > 1) {
      // الاحتفاظ بالأول، حذف الباقي
      const toDelete = records.slice(1)
      for (const record of toDelete) {
        await prisma.subFeatureConfig.delete({
          where: { id: record.id },
        })
        console.log(`   ✅ تم حذف: ${record.name} (ID: ${record.id})`)
      }
    }
  }

  // عرض النتيجة النهائية
  const remainingCount = await prisma.subFeatureConfig.count({
    where: { departmentCode: 'inventory-management' },
  })

  console.log('\n═══════════════════════════════════════════')
  console.log('✨ تم الانتهاء!')
  console.log('═══════════════════════════════════════════')
  console.log(`📊 السجلات المتبقية: ${remainingCount}`)
  console.log('═══════════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
