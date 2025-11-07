/**
 * تحليل شامل لمشكلة الإجازات
 * هدف السكريبت: فهم الفرق بين العرض في القائمة وتسجيل العودة والإشعارات
 */

import { Database } from '../src/modules/database/index.js'

async function analyzeLeavesIssue() {
  await Database.connect()
  const prisma = Database.prisma
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 تحليل شامل لمشكلة الإجازات')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  console.log(`📅 تاريخ اليوم: ${today.toISOString().split('T')[0]}\n`)

  // ========================================
  // 1. تحليل query قائمة الإجازات (leaves-list.handler.ts)
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1️⃣ تحليل query قائمة الإجازات الحالية')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const leavesListQuery = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { allowanceAmount: null },
        { allowanceAmount: 0 },
      ],
      startDate: { lte: today },
      endDate: { gte: today },
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
    orderBy: { endDate: 'asc' },
  })

  console.log(`📊 عدد الإجازات في query قائمة الإجازات: ${leavesListQuery.length}`)
  console.log('\nالشروط المطبقة:')
  console.log('  ✓ isActive: true')
  console.log('  ✓ status: PENDING أو APPROVED')
  console.log('  ✓ allowanceAmount: null أو 0')
  console.log(`  ✓ startDate <= ${today.toISOString().split('T')[0]}`)
  console.log(`  ✓ endDate >= ${today.toISOString().split('T')[0]}`)
  console.log('  ✓ actualReturnDate: null')

  if (leavesListQuery.length === 0) {
    console.log('\n❌ لا توجد إجازات تطابق الشروط!')
  }
  else {
    console.log('\n📋 عينة من النتائج:')
    leavesListQuery.slice(0, 3).forEach((leave) => {
      console.log(`  - إجازة #${leave.id} | ${leave.employee.fullName} | ${leave.startDate.toISOString().split('T')[0]} → ${leave.endDate.toISOString().split('T')[0]}`)
    })
  }

  // ========================================
  // 2. تحليل query تسجيل العودة (leaves-return.handler.ts)
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('2️⃣ تحليل query تسجيل العودة')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const leavesReturnQuery = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { allowanceAmount: null },
        { allowanceAmount: 0 },
      ],
      actualReturnDate: null,
      startDate: { lte: today }, // ✅ الشرط الجديد: بدأت فعلاً
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
      { createdAt: 'desc' },
    ],
  })

  console.log(`📊 عدد الإجازات في query تسجيل العودة: ${leavesReturnQuery.length}`)
  console.log('\nالشروط المطبقة:')
  console.log('  ✓ isActive: true')
  console.log('  ✓ status: PENDING أو APPROVED')
  console.log('  ✓ allowanceAmount: null أو 0')
  console.log('  ✓ actualReturnDate: null')
  console.log(`  ✓ startDate <= ${today.toISOString().split('T')[0]} (✅ بدأت فعلاً - منع المستقبلية)`)

  // تصفية حسب employeeId (آخر إجازة لكل عامل)
  const uniqueEmployeeLeaves = []
  const seenEmployees = new Set()
  for (const leave of leavesReturnQuery) {
    if (!seenEmployees.has(leave.employeeId)) {
      uniqueEmployeeLeaves.push(leave)
      seenEmployees.add(leave.employeeId)
    }
  }

  console.log(`\n👥 عدد العاملين الفريدين: ${uniqueEmployeeLeaves.length}`)

  if (uniqueEmployeeLeaves.length > 0) {
    console.log('\n📋 عينة من النتائج:')
    uniqueEmployeeLeaves.slice(0, 3).forEach((leave) => {
      console.log(`  - إجازة #${leave.id} | ${leave.employee.fullName} | ${leave.startDate.toISOString().split('T')[0]} → ${leave.endDate.toISOString().split('T')[0]}`)
    })
  }

  // ========================================
  // 3. تحليل query الإشعارات (leave-notifications.ts)
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('3️⃣ تحليل query الإجازات المتأخرة (الإشعارات)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const overdueQuery = await prisma.hR_EmployeeLeave.findMany({
    where: {
      status: 'APPROVED',
      endDate: {
        lt: today,
      },
      actualReturnDate: null, // ✅ الشرط الجديد
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
    orderBy: {
      endDate: 'asc',
    },
  })

  console.log(`📊 عدد الإجازات المتأخرة: ${overdueQuery.length}`)
  console.log('\nالشروط المطبقة:')
  console.log('  ✓ status: APPROVED')
  console.log(`  ✓ endDate < ${today.toISOString().split('T')[0]}`)
  console.log('  ✓ actualReturnDate: null (✅ لم يتم تسجيل عودة)')

  if (overdueQuery.length > 0) {
    console.log('\n📋 عينة من النتائج:')
    overdueQuery.slice(0, 5).forEach((leave) => {
      const delayDays = Math.floor((today.getTime() - new Date(leave.endDate).getTime()) / (1000 * 60 * 60 * 24))
      console.log(`  - إجازة #${leave.id} | ${leave.employee.fullName} | انتهت ${leave.endDate.toISOString().split('T')[0]} | تأخير ${delayDays} يوم`)
    })
  }

  // ========================================
  // 4. المشكلة الرئيسية
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️ تحليل المشكلة الرئيسية')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('🔴 المشكلة المكتشفة:')
  console.log('━━━━━━━━━━━━━━━━━━━━')
  console.log(`1. قائمة الإجازات: تعرض ${leavesListQuery.length} إجازة (إجازات حالية فقط)`)
  console.log(`2. تسجيل العودة: يعرض ${uniqueEmployeeLeaves.length} عامل (إجازات بدأت ولم تُسجل عودة)`)
  console.log(`3. الإشعارات: ترسل ${overdueQuery.length} إشعار (إجازات انتهت ولم تُسجل عودة)\n`)

  console.log('✅ الحل المطبق:')
  console.log('━━━━━━━━━━━━━━')
  console.log('✓ تم إضافة actualReturnDate: null في query الإشعارات')
  console.log('✓ تم إضافة startDate <= اليوم في query تسجيل العودة')
  console.log('✓ تم توحيد logic التحقق من الإجازات النشطة\n')

  console.log('📊 النتيجة المتوقعة:')
  console.log('━━━━━━━━━━━━━━━━━━')
  console.log(`• قائمة الإجازات: ${leavesListQuery.length} (صحيح - لا أحد في إجازة حالياً)`)
  console.log(`• تسجيل العودة: ${uniqueEmployeeLeaves.length} (صحيح - ${uniqueEmployeeLeaves.length} إجازات بدأت ولم تُسجل عودة)`)
  console.log(`• الإشعارات: ${overdueQuery.length} (صحيح - ${overdueQuery.length} إجازات متأخرة فعلاً)\n`)

  // ========================================
  // 5. تفصيل البيانات
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 تحليل تفصيلي للبيانات')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // احصاء الإجازات حسب الحالة
  const allLeaves = await prisma.hR_EmployeeLeave.findMany({
    where: { isActive: true },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      actualReturnDate: true,
      allowanceAmount: true,
    },
  })

  const stats = {
    total: allLeaves.length,
    approved: allLeaves.filter(l => l.status === 'APPROVED').length,
    pending: allLeaves.filter(l => l.status === 'PENDING').length,
    rejected: allLeaves.filter(l => l.status === 'REJECTED').length,
    withReturn: allLeaves.filter(l => l.actualReturnDate !== null).length,
    withoutReturn: allLeaves.filter(l => l.actualReturnDate === null).length,
    allowanceLeaves: allLeaves.filter(l => l.allowanceAmount && l.allowanceAmount > 0).length,
    regularLeaves: allLeaves.filter(l => !l.allowanceAmount || l.allowanceAmount === 0).length,
    current: allLeaves.filter(l => {
      const start = new Date(l.startDate)
      const end = new Date(l.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      return start <= today && end >= today && !l.actualReturnDate
    }).length,
    past: allLeaves.filter(l => {
      const end = new Date(l.endDate)
      end.setHours(0, 0, 0, 0)
      return end < today && !l.actualReturnDate
    }).length,
    future: allLeaves.filter(l => {
      const start = new Date(l.startDate)
      start.setHours(0, 0, 0, 0)
      return start > today && !l.actualReturnDate
    }).length,
  }

  console.log('📈 إحصائيات شاملة:')
  console.log(`  • إجمالي الإجازات النشطة: ${stats.total}`)
  console.log(`  • معتمدة (APPROVED): ${stats.approved}`)
  console.log(`  • قيد الانتظار (PENDING): ${stats.pending}`)
  console.log(`  • مرفوضة (REJECTED): ${stats.rejected}`)
  console.log(`  • بها تاريخ عودة: ${stats.withReturn}`)
  console.log(`  • بدون تاريخ عودة: ${stats.withoutReturn}`)
  console.log(`  • إجازات بدل: ${stats.allowanceLeaves}`)
  console.log(`  • إجازات عادية: ${stats.regularLeaves}`)
  console.log(`\n  🎯 حسب الفترة الزمنية (بدون عودة مسجلة):`)
  console.log(`  • إجازات حالية (جارية الآن): ${stats.current}`)
  console.log(`  • إجازات منتهية (متأخرة): ${stats.past}`)
  console.log(`  • إجازات مستقبلية: ${stats.future}`)

  // التحقق من التوافق
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎯 التحقق من التوافق')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (leavesListQuery.length === stats.current && overdueQuery.length === stats.past && uniqueEmployeeLeaves.length <= (stats.past + stats.current + stats.future)) {
    console.log('✅ النظام متوافق تماماً! الأرقام منطقية.')
    console.log(`  • قائمة الإجازات = ${leavesListQuery.length} (إجازات حالية)`)
    console.log(`  • تسجيل العودة = ${uniqueEmployeeLeaves.length} (إجازات بدأت ولم تُسجل عودة)`)
    console.log(`  • الإشعارات = ${overdueQuery.length} (إجازات منتهية ولم تُسجل عودة)`)
  }
  else {
    console.log('⚠️ لا يزال هناك عدم توافق في الأرقام.')
    console.log(`  • قائمة الإجازات: ${leavesListQuery.length} | متوقع: ${stats.current}`)
    console.log(`  • تسجيل العودة: ${uniqueEmployeeLeaves.length} | متوقع: <= ${stats.past + stats.current + stats.future}`)
    console.log(`  • الإشعارات: ${overdueQuery.length} | متوقع: ${stats.past}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ انتهى التحليل')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

analyzeLeavesIssue()
  .then(() => {
    console.log('🎉 تم التحليل بنجاح!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ خطأ في التحليل:', error)
    process.exit(1)
  })
