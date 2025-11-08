#!/usr/bin/env tsx
/**
 * Seed Warehouses
 * إضافة المخازن الأربعة الأساسية
 */

import { Database } from '../src/modules/database/index.js'

async function seedWarehouses() {
  console.log('📦 بدء إضافة المخازن...\n')

  try {
    await Database.connect()

    const warehouses = [
      {
        name: 'مخزن قطع الغيار',
        type: 'SPARE_PARTS',
        location: 'المقر الرئيسي',
        description: 'مخزن قطع الغيار للمعدات',
      },
      {
        name: 'مخزن السولار',
        type: 'DIESEL',
        location: 'المقر الرئيسي',
        description: 'مخزن السولار للمعدات',
      },
      {
        name: 'مخزن الزيوت والشحوم',
        type: 'OILS_GREASES',
        location: 'المقر الرئيسي',
        description: 'مخزن الزيوت والشحوم للمعدات',
      },
      {
        name: 'مخزن العدد والأدوات',
        type: 'TOOLS',
        location: 'المقر الرئيسي',
        description: 'مخزن العدد والأدوات',
      },
    ]

    for (const warehouse of warehouses) {
      const existing = await Database.prisma.warehouse.findFirst({
        where: { type: warehouse.type as any },
      })

      if (existing) {
        await Database.prisma.warehouse.update({
          where: { id: existing.id },
          data: warehouse,
        })
        console.log(`✅ تم تحديث: ${warehouse.name}`)
      } else {
        await Database.prisma.warehouse.create({
          data: warehouse,
        })
        console.log(`✅ تم إضافة: ${warehouse.name}`)
      }
    }

    console.log('\n✨ تم إضافة/تحديث جميع المخازن بنجاح!')
  } catch (error) {
    console.error('❌ خطأ في إضافة المخازن:', error)
    throw error
  } finally {
    await Database.disconnect()
  }
}

seedWarehouses()
  .catch((e) => {
    console.error('❌ خطأ:', e)
    process.exit(1)
  })

