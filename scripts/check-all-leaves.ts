/**
 * فحص جميع الإجازات في النظام
 */

import { Database } from '../src/modules/database/index.js'

async function checkAllLeaves() {
  await Database.connect()
  const prisma = Database.prisma
  
  console.log('🔍 فحص جميع الإجازات في النظام...\n')

  // جلب جميع الإجازات
  const allLeaves = await prisma.hR_EmployeeLeave.findMany({
    include: {
      employee: {
        select: {
          fullName: true,
          isActive: true,
          employmentStatus: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`📊 إجمالي الإجازات: ${allLeaves.length}\n`)

  // تصنيف الإجازات
  const activeLeaves = allLeaves.filter(l => l.isActive)
  const inactiveLeaves = allLeaves.filter(l => !l.isActive)
  const withoutReturn = allLeaves.filter(l => !l.actualReturnDate)
  const withReturn = allLeaves.filter(l => l.actualReturnDate)

  console.log('📈 التصنيف حسب الحالة:')
  console.log(`  ✅ نشطة (isActive=true): ${activeLeaves.length}`)
  console.log(`  ❌ غير نشطة (isActive=false): ${inactiveLeaves.length}`)
  console.log(`  📭 بدون تسجيل عودة: ${withoutReturn.length}`)
  console.log(`  📬 تم تسجيل العودة: ${withReturn.length}\n`)

  // تصنيف حسب الحالة
  const byStatus = {
    PENDING: allLeaves.filter(l => l.status === 'PENDING').length,
    APPROVED: allLeaves.filter(l => l.status === 'APPROVED').length,
    REJECTED: allLeaves.filter(l => l.status === 'REJECTED').length,
  }

  console.log('📊 التصنيف حسب Status:')
  console.log(`  ⏳ PENDING: ${byStatus.PENDING}`)
  console.log(`  ✅ APPROVED: ${byStatus.APPROVED}`)
  console.log(`  ❌ REJECTED: ${byStatus.REJECTED}\n`)

  // الإجازات التي تمنع تسجيل إجازة جديدة
  const blockingLeaves = allLeaves.filter(
    l => !l.actualReturnDate && ['PENDING', 'APPROVED'].includes(l.status),
  )

  console.log('🚫 الإجازات التي تمنع تسجيل إجازة جديدة:')
  console.log(`   (actualReturnDate = null AND status IN [PENDING, APPROVED])`)
  console.log(`   العدد: ${blockingLeaves.length}\n`)

  if (blockingLeaves.length > 0) {
    console.log('📋 تفاصيل الإجازات المانعة:\n')
    for (const leave of blockingLeaves) {
      console.log(`  - العامل: ${leave.employee.fullName}`)
      console.log(`    رقم الإجازة: ${leave.leaveNumber}`)
      console.log(`    الحالة: ${leave.status}`)
      console.log(`    isActive: ${leave.isActive}`)
      console.log(`    من: ${leave.startDate.toISOString().split('T')[0]}`)
      console.log(`    إلى: ${leave.endDate.toISOString().split('T')[0]}`)
      console.log(`    تاريخ العودة: ${leave.actualReturnDate ? leave.actualReturnDate.toISOString().split('T')[0] : 'لم يتم التسجيل'}`)
      console.log(`    تاريخ التسجيل: ${leave.createdAt.toISOString()}`)
      console.log('')
    }
  }

  // جمع العاملين الممنوعين
  const blockedEmployeeIds = new Set(blockingLeaves.map(l => l.employeeId))
  console.log(`👥 عدد العاملين الممنوعين من تسجيل إجازة: ${blockedEmployeeIds.size}`)

  // جلب جميع العاملين النشطين
  const allActiveEmployees = await prisma.employee.count({
    where: {
      isActive: true,
      employmentStatus: 'ACTIVE',
    },
  })

  console.log(`👥 إجمالي العاملين النشطين: ${allActiveEmployees}`)
  console.log(`✅ العاملين المتاحين لتسجيل إجازة: ${allActiveEmployees - blockedEmployeeIds.size}`)

  await prisma.$disconnect()
}

checkAllLeaves().catch(console.error)
