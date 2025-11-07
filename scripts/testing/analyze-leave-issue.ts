/**
 * تحليل شامل لمشكلة عدم ظهور الإجازات
 */

import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

async function analyzeLeaveProblem() {
  console.log('═══════════════════════════════════════════════════')
  console.log('🔍 تحليل شامل لمشكلة عدم ظهور الإجازات')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. جلب الإجازة الجديدة LV-2025-052
  console.log('📋 المرحلة 1: فحص الإجازة المحفوظة')
  console.log('─────────────────────────────────────────────────────')
  
  const newLeave = await prisma.hR_EmployeeLeave.findFirst({
    where: { leaveNumber: 'LV-2025-052' },
    select: {
      id: true,
      leaveNumber: true,
      startDate: true,
      endDate: true,
      leaveType: true,
      status: true,
      allowanceAmount: true,
      actualReturnDate: true,
      isActive: true,
      employee: {
        select: {
          fullName: true,
          isOnLeave: true,
        },
      },
    },
  })

  if (!newLeave) {
    console.log('❌ الإجازة LV-2025-052 غير موجودة!\n')
    return
  }

  console.log('✅ الإجازة موجودة:')
  console.log(`   ID: ${newLeave.id}`)
  console.log(`   رقم الإجازة: ${newLeave.leaveNumber}`)
  console.log(`   العامل: ${newLeave.employee.fullName}`)
  console.log(`   النوع: ${newLeave.leaveType}`)
  console.log(`   الحالة: ${newLeave.status}`)
  console.log(`   نشط: ${newLeave.isActive}`)
  console.log(`   البدل: ${newLeave.allowanceAmount}`)
  console.log(`   العودة: ${newLeave.actualReturnDate}`)
  console.log(`   العامل في إجازة: ${newLeave.employee.isOnLeave}`)
  console.log()

  // 2. فحص التواريخ المحفوظة
  console.log('📅 المرحلة 2: تحليل التواريخ المحفوظة')
  console.log('─────────────────────────────────────────────────────')
  console.log('تاريخ البداية:')
  console.log(`   كائن Date: ${newLeave.startDate}`)
  console.log(`   ISO String: ${newLeave.startDate.toISOString()}`)
  console.log(`   عربي: ${newLeave.startDate.toLocaleDateString('ar-EG')}`)
  console.log(`   UTC: ${newLeave.startDate.toUTCString()}`)
  console.log()
  console.log('تاريخ النهاية:')
  console.log(`   كائن Date: ${newLeave.endDate}`)
  console.log(`   ISO String: ${newLeave.endDate.toISOString()}`)
  console.log(`   عربي: ${newLeave.endDate.toLocaleDateString('ar-EG')}`)
  console.log(`   UTC: ${newLeave.endDate.toUTCString()}`)
  console.log()

  // 3. فحص التوقيت الحالي
  console.log('⏰ المرحلة 3: تحليل التوقيت الحالي')
  console.log('─────────────────────────────────────────────────────')
  const now = new Date()
  console.log('الآن (Now):')
  console.log(`   Local: ${now.toLocaleString('ar-EG')}`)
  console.log(`   ISO: ${now.toISOString()}`)
  console.log(`   Timezone Offset: ${now.getTimezoneOffset()} دقيقة`)
  console.log()

  const todayLocal = new Date()
  todayLocal.setHours(0, 0, 0, 0)
  console.log('اليوم (Local):')
  console.log(`   Date: ${todayLocal}`)
  console.log(`   ISO: ${todayLocal.toISOString()}`)
  console.log()

  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)
  console.log('اليوم (UTC):')
  console.log(`   Date: ${todayUTC}`)
  console.log(`   ISO: ${todayUTC.toISOString()}`)
  console.log()

  // 4. اختبار شروط الـ query
  console.log('🔍 المرحلة 4: اختبار شروط Query')
  console.log('─────────────────────────────────────────────────────')
  
  const conditions = {
    isActive: newLeave.isActive === true,
    status: ['PENDING', 'APPROVED'].includes(newLeave.status),
    allowanceAmount: newLeave.allowanceAmount === 0,
    actualReturnDate: newLeave.actualReturnDate === null,
    startDate_lte_todayUTC: newLeave.startDate <= todayUTC,
    endDate_gte_todayUTC: newLeave.endDate >= todayUTC,
    startDate_lte_todayLocal: newLeave.startDate <= todayLocal,
    endDate_gte_todayLocal: newLeave.endDate >= todayLocal,
  }

  console.log('الشروط:')
  for (const [key, value] of Object.entries(conditions)) {
    const icon = value ? '✅' : '❌'
    console.log(`   ${icon} ${key}: ${value}`)
  }
  console.log()

  // 5. عرض الفروقات بالأرقام
  console.log('📊 المرحلة 5: الفروقات الرقمية')
  console.log('─────────────────────────────────────────────────────')
  console.log('مقارنة startDate:')
  console.log(`   startDate timestamp: ${newLeave.startDate.getTime()}`)
  console.log(`   todayUTC timestamp:  ${todayUTC.getTime()}`)
  console.log(`   الفرق: ${newLeave.startDate.getTime() - todayUTC.getTime()} ms`)
  console.log(`   الفرق بالأيام: ${(newLeave.startDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)} يوم`)
  console.log()
  console.log('مقارنة endDate:')
  console.log(`   endDate timestamp:  ${newLeave.endDate.getTime()}`)
  console.log(`   todayUTC timestamp: ${todayUTC.getTime()}`)
  console.log(`   الفرق: ${newLeave.endDate.getTime() - todayUTC.getTime()} ms`)
  console.log(`   الفرق بالأيام: ${(newLeave.endDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24)} يوم`)
  console.log()

  // 6. تشغيل الـ query الفعلي
  console.log('🔎 المرحلة 6: تشغيل Query الفعلي')
  console.log('─────────────────────────────────────────────────────')
  
  const queryResult = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      allowanceAmount: 0,
      startDate: { lte: todayUTC },
      endDate: { gte: todayUTC },
      actualReturnDate: null,
    },
    select: {
      leaveNumber: true,
      startDate: true,
      endDate: true,
      employee: {
        select: { fullName: true },
      },
    },
  })

  console.log(`نتيجة Query (UTC): ${queryResult.length} إجازة`)
  if (queryResult.length > 0) {
    queryResult.forEach((leave) => {
      console.log(`   ✅ ${leave.leaveNumber} - ${leave.employee.fullName}`)
      console.log(`      من: ${leave.startDate.toISOString()}`)
      console.log(`      إلى: ${leave.endDate.toISOString()}`)
    })
  }
  else {
    console.log('   ❌ لا توجد إجازات!')
  }
  console.log()

  // 7. الخلاصة
  console.log('═══════════════════════════════════════════════════')
  console.log('📝 الخلاصة والتوصيات')
  console.log('═══════════════════════════════════════════════════')
  
  const allConditionsMet = Object.values(conditions).every(v => v)
  
  if (allConditionsMet && queryResult.length === 0) {
    console.log('❌ المشكلة: جميع الشروط مستوفاة لكن Query لا يعيد نتائج!')
    console.log('🔍 السبب المحتمل: مشكلة في Prisma Client cache أو التواريخ محفوظة بصيغة خاطئة')
    console.log('💡 الحل المقترح:')
    console.log('   1. أعد توليد Prisma Client: npm run prisma:generate')
    console.log('   2. أعد تشغيل البوت')
    console.log('   3. احذف الإجازة وأعد إنشاءها')
  }
  else if (!allConditionsMet) {
    console.log('❌ المشكلة: بعض الشروط غير مستوفاة!')
    const failedConditions = Object.entries(conditions)
      .filter(([, value]) => !value)
      .map(([key]) => key)
    console.log(`🔍 الشروط الفاشلة: ${failedConditions.join(', ')}`)
  }
  else {
    console.log('✅ كل شيء يعمل بشكل صحيح!')
    console.log(`   الإجازة تظهر في Query: ${queryResult.length} إجازة`)
  }
  
  console.log('═══════════════════════════════════════════════════\n')

  await prisma.$disconnect()
}

analyzeLeaveProblem()
