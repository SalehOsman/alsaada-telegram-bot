/**
 * فحص تواريخ إجازة معينة
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkLeaveDates() {
  const leave = await prisma.hR_EmployeeLeave.findUnique({
    where: { id: 51 },
    select: {
      leaveNumber: true,
      startDate: true,
      endDate: true,
      employee: {
        select: { fullName: true },
      },
    },
  })

  if (!leave) {
    console.log('❌ الإجازة غير موجودة!')
    return
  }

  console.log('📋 بيانات الإجازة:')
  console.log('رقم الإجازة:', leave.leaveNumber)
  console.log('العامل:', leave.employee.fullName)
  console.log('')
  console.log('📅 تاريخ البداية:')
  console.log('  DB:', leave.startDate)
  console.log('  ISO:', leave.startDate.toISOString())
  console.log('  عربي:', leave.startDate.toLocaleDateString('ar-EG'))
  console.log('')
  console.log('📅 تاريخ النهاية:')
  console.log('  DB:', leave.endDate)
  console.log('  ISO:', leave.endDate.toISOString())
  console.log('  عربي:', leave.endDate.toLocaleDateString('ar-EG'))
  console.log('')

  // اليوم
  const now = new Date()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  console.log('⏰ الوقت الحالي:')
  console.log('  الآن:', now)
  console.log('  Local:', now.toLocaleString('ar-EG'))
  console.log('  ISO:', now.toISOString())
  console.log('')
  console.log('  اليوم UTC 00:00:', today.toISOString())
  console.log('  اليوم عربي:', today.toLocaleDateString('ar-EG'))
  console.log('')

  // المقارنات
  console.log('🔍 المقارنات:')
  console.log('  startDate <= today?', leave.startDate <= today, `(${leave.startDate.toISOString()} <= ${today.toISOString()})`)
  console.log('  endDate >= today?', leave.endDate >= today, `(${leave.endDate.toISOString()} >= ${today.toISOString()})`)
  console.log('')

  if (leave.startDate <= today && leave.endDate >= today) {
    console.log('✅ الإجازة يجب أن تظهر!')
  }
  else {
    console.log('❌ الإجازة لن تظهر!')
    if (leave.startDate > today) {
      console.log('   السبب: لم تبدأ بعد')
    }
    if (leave.endDate < today) {
      console.log('   السبب: انتهت')
    }
  }

  await prisma.$disconnect()
}

checkLeaveDates()
