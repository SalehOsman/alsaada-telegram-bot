/**
 * Script لحذف السجلات القديمة بأكواد خاطئة
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  حذف السجلات القديمة بأكواد خاطئة...\n')

  // حذف السجلات القديمة التي لا تبدأ بـ "inv:"
  const oldCodes = [
    'spare_parts',
    'oils_greases',
    'diesel',
    'tools_equipment',
    'management',
  ]

  for (const code of oldCodes) {
    const deleted = await prisma.subFeatureConfig.deleteMany({
      where: {
        code,
        departmentCode: 'inventory-management',
      },
    })

    if (deleted.count > 0) {
      console.log(`   ✅ تم حذف: ${code} (${deleted.count} سجل)`)
    }
  }

  // عرض السجلات المتبقية
  const remaining = await prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { code: true, name: true },
  })

  console.log('\n═══════════════════════════════════════════')
  console.log('📊 السجلات المتبقية:')
  console.log('═══════════════════════════════════════════')
  for (const sf of remaining) {
    console.log(`   • ${sf.code}: ${sf.name}`)
  }
  console.log(`\n📋 الإجمالي: ${remaining.length} سجل`)
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
