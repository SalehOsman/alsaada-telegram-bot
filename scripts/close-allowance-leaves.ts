/**
 * إغلاق إجازات البدل (allowanceAmount > 0) تلقائياً
 * 
 * إجازات البدل ليست إجازات فعلية - العامل لم يتغيب
 * يجب إغلاقها تلقائياً بتسجيل تاريخ العودة = تاريخ انتهاء الإجازة
 */

import { Database } from '../src/modules/database/index.js'

async function closeAllowanceLeaves() {
  await Database.connect()
  const prisma = Database.prisma

  console.log('🔄 إغلاق إجازات البدل المفتوحة...\n')

  // جلب جميع إجازات البدل المفتوحة
  const allowanceLeaves = await prisma.hR_EmployeeLeave.findMany({
    where: {
      actualReturnDate: null, // مفتوحة
      allowanceAmount: {
        gt: 0, // إجازة ببدل
      },
      status: {
        in: ['PENDING', 'APPROVED'],
      },
      isActive: true,
    },
    include: {
      employee: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: {
      endDate: 'asc',
    },
  })

  console.log(`📊 عدد إجازات البدل المفتوحة: ${allowanceLeaves.length}\n`)

  if (allowanceLeaves.length === 0) {
    console.log('✅ لا توجد إجازات بدل مفتوحة تحتاج إلى إغلاق.')
    await prisma.$disconnect()
    return
  }

  console.log('📋 قائمة إجازات البدل التي سيتم إغلاقها:\n')

  for (const leave of allowanceLeaves) {
    console.log(`  - ${leave.employee.fullName}`)
    console.log(`    من: ${leave.startDate.toISOString().split('T')[0]}`)
    console.log(`    إلى: ${leave.endDate.toISOString().split('T')[0]}`)
    console.log(`    بدل الإجازة: ${leave.allowanceAmount} جنيه`)
    console.log(`    سيتم تسجيل العودة في: ${leave.endDate.toISOString().split('T')[0]}`)
    console.log('')
  }

  // تأكيد قبل التنفيذ
  console.log('⚠️  هل تريد إغلاق هذه الإجازات؟')
  console.log('   سيتم تسجيل actualReturnDate = endDate لكل إجازة\n')

  // تنفيذ الإغلاق
  let closedCount = 0

  for (const leave of allowanceLeaves) {
    try {
      await prisma.hR_EmployeeLeave.update({
        where: { id: leave.id },
        data: {
          actualReturnDate: leave.endDate, // ✅ تاريخ العودة = تاريخ انتهاء الإجازة
        },
      })

      closedCount++
      console.log(`✅ تم إغلاق إجازة: ${leave.employee.fullName} (${leave.leaveNumber})`)
    }
    catch (error) {
      console.error(`❌ خطأ في إغلاق إجازة ${leave.leaveNumber}:`, error)
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ تم إغلاق ${closedCount} من ${allowanceLeaves.length} إجازة بدل`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await prisma.$disconnect()
}

closeAllowanceLeaves().catch(console.error)
