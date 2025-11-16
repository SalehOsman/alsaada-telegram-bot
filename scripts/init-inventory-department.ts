/**
 * Script لتهيئة قسم المخازن في قاعدة البيانات
 * يقوم بإنشاء:
 * 1. سجل DepartmentConfig لقسم المخازن
 * 2. سجلات SubFeatureConfig للوظائف الفرعية
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 بدء تهيئة قسم المخازن...\n')

  try {
    // ════════════════════════════════════════════════════════
    // 1️⃣ إنشاء/تحديث DepartmentConfig
    // ════════════════════════════════════════════════════════
    const department = await prisma.departmentConfig.upsert({
      where: { code: 'inventory-management' },
      update: {
        name: 'المخازن',
        description: 'إدارة المخازن والأصول',
        icon: '📦',
        minRole: 'ADMIN',
        isEnabled: true,
      },
      create: {
        code: 'inventory-management',
        name: 'المخازن',
        description: 'إدارة المخازن والأصول',
        icon: '📦',
        minRole: 'ADMIN',
        isEnabled: true,
      },
    })

    console.log('✅ تم إنشاء/تحديث DepartmentConfig:')
    console.log(`   - القسم: ${department.name}`)
    console.log(`   - الكود: ${department.code}`)
    console.log(`   - الحد الأدنى للرتبة: ${department.minRole}`)
    console.log(`   - الحالة: ${department.isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}\n`)

    // ════════════════════════════════════════════════════════
    // 2️⃣ إنشاء/تحديث SubFeatureConfig
    // ════════════════════════════════════════════════════════
    const subFeatures = [
      {
        code: 'inv:spare-parts',
        name: 'مخزن قطع الغيار',
        description: 'إدارة مخزن قطع الغيار',
        icon: '⚙️',
        minRole: 'ADMIN',
        isEnabled: true,
        superAdminOnly: false,
      },
      {
        code: 'inv:oils-greases',
        name: 'مخزن الزيوت والشحوم',
        description: 'إدارة مخزن الزيوت والشحوم',
        icon: '🛢️',
        minRole: 'ADMIN',
        isEnabled: true,
        superAdminOnly: false,
      },
      {
        code: 'inv:diesel',
        name: 'مخزن السولار',
        description: 'إدارة مخزن السولار',
        icon: '⛽',
        minRole: 'ADMIN',
        isEnabled: true,
        superAdminOnly: false,
      },
      {
        code: 'inv:tools-equipment',
        name: 'مخزن العدد والادوات',
        description: 'إدارة مخزن العدد والادوات',
        icon: '🛠️',
        minRole: 'ADMIN',
        isEnabled: true,
        superAdminOnly: false,
      },
      {
        code: 'inv:section-management',
        name: 'إدارة قسم المخازن',
        description: 'تعيين الأدمن وإدارة صلاحيات القسم والوظائف (SUPER_ADMIN فقط)',
        icon: '⚙️',
        minRole: 'SUPER_ADMIN',
        isEnabled: true,
        superAdminOnly: true,
      },
    ]

    console.log('📝 إنشاء/تحديث الوظائف الفرعية:\n')

    for (const sf of subFeatures) {
      const subFeature = await prisma.subFeatureConfig.upsert({
        where: { code: sf.code },
        update: {
          name: sf.name,
          description: sf.description,
          icon: sf.icon,
          minRole: sf.minRole,
          isEnabled: sf.isEnabled,
          superAdminOnly: sf.superAdminOnly,
          departmentCode: department.code,
        },
        create: {
          code: sf.code,
          name: sf.name,
          description: sf.description,
          icon: sf.icon,
          minRole: sf.minRole,
          isEnabled: sf.isEnabled,
          superAdminOnly: sf.superAdminOnly,
          departmentCode: department.code,
        },
      })

      console.log(`   ✅ ${subFeature.name}`)
      console.log(`      - الكود: ${subFeature.code}`)
      console.log(`      - الحد الأدنى: ${subFeature.minRole}`)
      console.log(`      - الحالة: ${subFeature.isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}`)
      console.log(`      - سوبر أدمن فقط: ${subFeature.superAdminOnly ? '✅ نعم' : '❌ لا'}\n`)
    }

    // ════════════════════════════════════════════════════════
    // 3️⃣ عرض الإحصائيات النهائية
    // ════════════════════════════════════════════════════════
    const totalSubFeatures = await prisma.subFeatureConfig.count({
      where: { departmentCode: department.code },
    })

    const enabledSubFeatures = await prisma.subFeatureConfig.count({
      where: { departmentCode: department.code, isEnabled: true },
    })

    console.log('\n═══════════════════════════════════════════')
    console.log('📊 ملخص التهيئة:')
    console.log('═══════════════════════════════════════════')
    console.log(`✅ القسم: ${department.name} (${department.code})`)
    console.log(`📋 إجمالي الوظائف: ${totalSubFeatures}`)
    console.log(`🟢 الوظائف المفعّلة: ${enabledSubFeatures}`)
    console.log(`🔴 الوظائف المعطّلة: ${totalSubFeatures - enabledSubFeatures}`)
    console.log('═══════════════════════════════════════════\n')

    console.log('✨ تمت التهيئة بنجاح! يمكنك الآن استخدام قسم المخازن.\n')
    console.log('📌 الخطوات التالية:')
    console.log('   1. افتح Prisma Studio: npx prisma studio')
    console.log('   2. تحقق من جدول DepartmentConfig')
    console.log('   3. تحقق من جدول SubFeatureConfig')
    console.log('   4. اختبر النظام من خلال البوت\n')
  }
  catch (error) {
    console.error('❌ خطأ أثناء التهيئة:', error)
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
