/**
 * التحقق من الإجازات الحالية في قاعدة البيانات
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkCurrentLeaves() {
  // استخدام توقيت UTC (مثل التواريخ المخزنة في DB)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  console.log('📅 اليوم:', today.toLocaleDateString('ar-EG'))
  console.log('🕐 اليوم UTC:', today.toISOString())
  console.log('')

  // نفس الـ query المستخدم في handler بعد الإصلاح
  const leaves = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      allowanceAmount: 0, // استبعاد إجازات البدل
      startDate: { lte: today }, // بدأت أو ستبدأ اليوم
      endDate: { gte: today }, // لم تنتهي أو تنتهي اليوم
      actualReturnDate: null, // لم يتم تسجيل عودة
    },
    select: {
      id: true,
      leaveNumber: true,
      leaveType: true,
      startDate: true,
      endDate: true,
      allowanceAmount: true,
      actualReturnDate: true,
      isActive: true,
      status: true,
      employee: {
        select: {
          fullName: true,
          nickname: true,
          isOnLeave: true,
        },
      },
    },
    orderBy: { endDate: 'asc' },
  })

  console.log('🔍 نتائج Query:')
  console.log(`عدد الإجازات المطابقة: ${leaves.length}\n`)

  if (leaves.length === 0) {
    console.log('❌ لا توجد إجازات حالية!')
    console.log('\nدعني أتحقق من جميع الإجازات النشطة...\n')

    // البحث عن جميع الإجازات النشطة
    const allActiveLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        leaveNumber: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        allowanceAmount: true,
        actualReturnDate: true,
        status: true,
        employee: {
          select: {
            fullName: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    console.log(`📋 آخر 10 إجازات نشطة (isActive: true):\n`)
    allActiveLeaves.forEach((leave) => {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)

      console.log(`- ${leave.leaveNumber} (${leave.employee.nickname})`)
      console.log(`  النوع: ${leave.leaveType}`)
      console.log(`  الحالة: ${leave.status}`)
      console.log(`  من: ${startDate.toLocaleDateString('ar-EG')} ${startDate <= today ? '✅' : '❌ مستقبلية'}`)
      console.log(`  إلى: ${endDate.toLocaleDateString('ar-EG')} ${endDate >= today ? '✅' : '❌ منتهية'}`)
      console.log(`  بدل: ${(leave.allowanceAmount || 0) > 0 ? `${leave.allowanceAmount} جنيه ❌` : '0 ✅'}`)
      console.log(`  عودة: ${leave.actualReturnDate ? `${new Date(leave.actualReturnDate).toLocaleDateString('ar-EG')} ❌` : 'null ✅'}`)

      // تحليل لماذا لا تظهر في القائمة
      const reasons = []
      if (leave.status !== 'PENDING' && leave.status !== 'APPROVED')
        reasons.push(`status: ${leave.status}`)
      if ((leave.allowanceAmount || 0) > 0)
        reasons.push('إجازة بدل')
      if (startDate > today)
        reasons.push('لم تبدأ بعد')
      if (endDate < today)
        reasons.push('انتهت')
      if (leave.actualReturnDate)
        reasons.push('تم تسجيل عودة')

      if (reasons.length > 0) {
        console.log(`  ❌ لا تظهر بسبب: ${reasons.join(', ')}`)
      }
      else {
        console.log(`  ✅ يجب أن تظهر!`)
      }

      console.log('')
    })
  }
  else {
    leaves.forEach((leave) => {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)

      console.log(`✅ ${leave.leaveNumber} (${leave.employee.nickname})`)
      console.log(`   النوع: ${leave.leaveType}`)
      console.log(`   الحالة: ${leave.status}`)
      console.log(`   من: ${startDate.toLocaleDateString('ar-EG')}`)
      console.log(`   إلى: ${endDate.toLocaleDateString('ar-EG')}`)
      console.log(`   العامل في إجازة: ${leave.employee.isOnLeave ? 'نعم ✅' : 'لا ❌'}`)
      console.log('')
    })
  }
}

checkCurrentLeaves()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
