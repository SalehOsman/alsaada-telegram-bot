/**
 * تنظيف الإجازات المتداخلة
 * المشكلة: عامل واحد لديه إجازتين في نفس الفترة
 */

import { Database } from '../src/modules/database/index.js'

async function fixOverlappingLeaves() {
  await Database.connect()
  const prisma = Database.prisma

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 البحث عن الإجازات المتداخلة')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // جلب جميع الإجازات النشطة بدون عودة مسجلة
  const activeLeaves = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      actualReturnDate: null,
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
        },
      },
    },
    orderBy: [
      { employeeId: 'asc' },
      { startDate: 'asc' },
    ],
  })

  console.log(`📊 إجمالي الإجازات النشطة: ${activeLeaves.length}\n`)

  // تجميع حسب العامل
  const employeeLeaves = new Map<number, any[]>()
  for (const leave of activeLeaves) {
    if (!employeeLeaves.has(leave.employeeId)) {
      employeeLeaves.set(leave.employeeId, [])
    }
    employeeLeaves.get(leave.employeeId)!.push(leave)
  }

  // البحث عن التداخلات
  const overlaps = []

  for (const [employeeId, leaves] of employeeLeaves) {
    if (leaves.length > 1) {
      console.log(`⚠️ عامل ${leaves[0].employee.fullName} لديه ${leaves.length} إجازات نشطة:`)
      
      for (let i = 0; i < leaves.length; i++) {
        const leave = leaves[i]
        console.log(`  ${i + 1}. إجازة #${leave.id} (${leave.leaveNumber})`)
        console.log(`     من: ${leave.startDate.toISOString().split('T')[0]}`)
        console.log(`     إلى: ${leave.endDate.toISOString().split('T')[0]}`)
        console.log(`     الحالة: ${leave.status}`)
        console.log(`     تاريخ الإنشاء: ${leave.createdAt.toISOString()}`)
        
        // فحص التداخل مع الإجازات الأخرى
        for (let j = i + 1; j < leaves.length; j++) {
          const otherLeave = leaves[j]
          const overlap = checkOverlap(leave, otherLeave)
          if (overlap) {
            overlaps.push({
              employee: leave.employee,
              leave1: leave,
              leave2: otherLeave,
            })
            console.log(`     🔴 تتداخل مع إجازة #${otherLeave.id}!`)
          }
        }
      }
      console.log()
    }
  }

  if (overlaps.length === 0) {
    console.log('✅ لا توجد إجازات متداخلة!')
    return
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔴 وُجد ${overlaps.length} حالة تداخل`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 الحلول المقترحة:\n')
  console.log('1. حذف الإجازة الأقدم (تاريخ إنشاء أقدم)')
  console.log('2. حذف الإجازة الأحدث')
  console.log('3. دمج الإجازتين في إجازة واحدة')
  console.log('4. تعديل التواريخ يدوياً\n')

  // الحل الآلي: حذف الإجازة الأحدث (الأكثر أماناً)
  console.log('💡 الحل الآلي: سيتم الاحتفاظ بالإجازة الأقدم وحذف الأحدث\n')

  for (const overlap of overlaps) {
    const older = overlap.leave1.createdAt < overlap.leave2.createdAt ? overlap.leave1 : overlap.leave2
    const newer = overlap.leave1.createdAt < overlap.leave2.createdAt ? overlap.leave2 : overlap.leave1

    console.log(`✅ سيتم الاحتفاظ بـ: إجازة #${older.id} (${older.leaveNumber})`)
    console.log(`   تاريخ الإنشاء: ${older.createdAt.toISOString()}`)
    console.log(`❌ سيتم حذف: إجازة #${newer.id} (${newer.leaveNumber})`)
    console.log(`   تاريخ الإنشاء: ${newer.createdAt.toISOString()}`)
    console.log()

    // الحذف الناعم
    await prisma.hR_EmployeeLeave.update({
      where: { id: newer.id },
      data: {
        isActive: false,
        status: 'REJECTED',
      },
    })

    console.log(`✅ تم حذف إجازة #${newer.id} بنجاح\n`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ انتهى التنظيف')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

function checkOverlap(leave1: any, leave2: any): boolean {
  const start1 = new Date(leave1.startDate).getTime()
  const end1 = new Date(leave1.endDate).getTime()
  const start2 = new Date(leave2.startDate).getTime()
  const end2 = new Date(leave2.endDate).getTime()

  return (start1 <= end2 && end1 >= start2)
}

fixOverlappingLeaves()
  .then(() => {
    console.log('🎉 تم التنظيف بنجاح!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ خطأ:', error)
    process.exit(1)
  })
