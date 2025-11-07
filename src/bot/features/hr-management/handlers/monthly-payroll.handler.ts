/**
 * Monthly Payroll Handler - نظام الرواتب الشهرية الجماعي
 *
 * النظام المتكامل لحساب رواتب جميع العاملين شهرياً
 * باستخدام نفس منهجية النظام الفردي
 *
 * الميزات:
 * 1. حساب تلقائي لجميع الموظفين
 * 2. تقرير Excel احترافي شامل
 * 3. تسوية جماعية للمعاملات
 * 4. إحصائيات ومقارنات
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { Composer, InlineKeyboard, InputFile } from 'grammy'

export const monthlyPayrollHandler = new Composer<Context>()

// ==================== Helper Functions ====================

const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function getMonthName(month: number): string {
  return monthNames[month - 1] || 'غير معروف'
}

function formatCurrency(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount
  return `${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')} ج.م`
}

function formatArabicNumber(num: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().split('').map(d => /\d/.test(d) ? arabicNumerals[Number.parseInt(d)] : d).join('')
}

// ==================== Main Menu ====================

monthlyPayrollHandler.callbackQuery('hr:monthly-payroll:main', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📅 الشهر الحالي', 'hr:monthly-payroll:current')
    .row()
    .text('📊 الأشهر السابقة', 'hr:monthly-payroll:history')
    .row()
    .text('➕ حساب رواتب شهر جديد', 'hr:monthly-payroll:calculate')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:payroll')

  await ctx.editMessageText(
    '💰 **نظام معالجة الرواتب الشهرية**\n\n'
    + '📋 **اختر الإجراء المطلوب:**\n\n'
    + '📅 **الشهر الحالي** - عرض وإدارة رواتب هذا الشهر\n'
    + '📊 **الأشهر السابقة** - الاطلاع على السجلات السابقة\n'
    + '➕ **حساب رواتب** - حساب تلقائي لجميع العاملين',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// ==================== Current Month ====================

monthlyPayrollHandler.callbackQuery('hr:monthly-payroll:current', async (ctx) => {
  await ctx.answerCallbackQuery()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  try {
    const prisma = Database.prisma

    const count = await prisma.hR_MonthlyPayroll.count({
      where: { month: currentMonth, year: currentYear },
    })

    if (count === 0) {
      const keyboard = new InlineKeyboard()
        .text('➕ حساب رواتب الشهر', 'hr:monthly-payroll:calculate')
        .row()
        .text('⬅️ رجوع', 'hr:monthly-payroll:main')

      await ctx.editMessageText(
        `📅 **${getMonthName(currentMonth)} ${formatArabicNumber(currentYear)}**\n\n`
        + `❌ لا توجد رواتب محسوبة لهذا الشهر.\n\n`
        + `💡 يمكنك حساب الرواتب الآن.`,
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      return
    }

    const keyboard = new InlineKeyboard()
      .text('👁️ عرض النتائج', `hr:monthly-payroll:view:${currentMonth}:${currentYear}`)
      .row()
      .text('📥 تصدير Excel', `hr:monthly-payroll:export:${currentMonth}:${currentYear}`)
      .row()
      .text('🔄 إعادة الحساب', `hr:monthly-payroll:calc:force:${currentMonth}:${currentYear}`)
      .row()
      .text('⬅️ رجوع', 'hr:monthly-payroll:main')

    await ctx.editMessageText(
      `📅 **${getMonthName(currentMonth)} ${formatArabicNumber(currentYear)}**\n\n`
      + `✅ تم حساب الرواتب\n`
      + `📊 عدد الموظفين: ${formatArabicNumber(count)}\n\n`
      + `**الإجراءات المتاحة:**`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in current month:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==================== History ====================

monthlyPayrollHandler.callbackQuery('hr:monthly-payroll:history', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma

    // جلب آخر 12 شهر
    const months = await prisma.hR_MonthlyPayroll.groupBy({
      by: ['month', 'year'],
      _count: { id: true },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      take: 12,
    })

    if (months.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('➕ حساب رواتب جديد', 'hr:monthly-payroll:calculate')
        .row()
        .text('⬅️ رجوع', 'hr:monthly-payroll:main')

      await ctx.editMessageText(
        '📊 **الأشهر السابقة**\n\n'
        + '❌ لا توجد سجلات رواتب سابقة.',
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    for (const m of months) {
      keyboard
        .text(
          `${getMonthName(m.month)} ${formatArabicNumber(m.year)} (${formatArabicNumber(m._count.id)})`,
          `hr:monthly-payroll:view:${m.month}:${m.year}`,
        )
        .row()
    }

    keyboard.text('⬅️ رجوع', 'hr:monthly-payroll:main')

    await ctx.editMessageText(
      '📊 **الأشهر السابقة**\n\n'
      + 'اختر الشهر المطلوب:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in history:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==================== Calculate New Month ====================

monthlyPayrollHandler.callbackQuery('hr:monthly-payroll:calculate', async (ctx) => {
  await ctx.answerCallbackQuery()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // السماح باختيار الشهر السابق أو الحالي
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const keyboard = new InlineKeyboard()
    .text(`📅 ${getMonthName(currentMonth)} ${formatArabicNumber(currentYear)}`, `hr:monthly-payroll:calc:confirm:${currentMonth}:${currentYear}`)
    .row()
    .text(`📅 ${getMonthName(prevMonth)} ${formatArabicNumber(prevYear)}`, `hr:monthly-payroll:calc:confirm:${prevMonth}:${prevYear}`)
    .row()
    .text('⬅️ رجوع', 'hr:monthly-payroll:main')

  await ctx.editMessageText(
    '➕ **حساب رواتب شهر جديد**\n\n'
    + '📅 **اختر الشهر المطلوب:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// ==================== Confirm Calculate ====================

monthlyPayrollHandler.callbackQuery(/^hr:monthly-payroll:calc:confirm:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const month = Number.parseInt(ctx.match[1], 10)
  const year = Number.parseInt(ctx.match[2], 10)

  try {
    const prisma = Database.prisma

    // التحقق من وجود رواتب محسوبة مسبقاً
    const existingCount = await prisma.hR_MonthlyPayroll.count({
      where: { month, year },
    })

    if (existingCount > 0) {
      const keyboard = new InlineKeyboard()
        .text('🔄 حساب من جديد (حذف القديم)', `hr:monthly-payroll:calc:force:${month}:${year}`)
        .row()
        .text('⬅️ رجوع', 'hr:monthly-payroll:calculate')

      await ctx.editMessageText(
        `⚠️ **تنبيه: رواتب موجودة مسبقاً**\n\n`
        + `📅 الشهر: ${getMonthName(month)} ${formatArabicNumber(year)}\n`
        + `📊 عدد السجلات: ${formatArabicNumber(existingCount)}\n\n`
        + `❓ هل تريد حذف السجلات القديمة وإعادة الحساب؟`,
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      return
    }

    // عرض رسالة التأكيد
    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد الحساب', `hr:monthly-payroll:calc:execute:${month}:${year}`)
      .row()
      .text('❌ إلغاء', 'hr:monthly-payroll:calculate')

    await ctx.editMessageText(
      `✨ **حساب رواتب ${getMonthName(month)} ${formatArabicNumber(year)}**\n\n`
      + `📋 **سيتم حساب الرواتب لجميع العاملين النشطين**\n\n`
      + `📊 **البنود المشمولة:**\n`
      + `• الراتب الأساسي (بالنسبة والتناسب)\n`
      + `• جميع البدلات (وظيفة + موظف)\n`
      + `• بدل المسحوبات العينية (حسب الفعلي)\n`
      + `• المكافآت\n`
      + `• بدل الإجازات غير المصروفة\n`
      + `• خصم السلف والمسحوبات\n`
      + `• غرامات التأخير\n\n`
      + `⚡ **ملاحظة:** العملية قد تستغرق بعض الوقت`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in calc:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
  }
})

// ==================== Force Recalculate (Delete Old) ====================

monthlyPayrollHandler.callbackQuery(/^hr:monthly-payroll:calc:force:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const month = Number.parseInt(ctx.match[1], 10)
  const year = Number.parseInt(ctx.match[2], 10)

  try {
    const prisma = Database.prisma

    // إعادة تعيين العقوبات المطبقة في هذا الشهر (لكي يمكن تطبيقها مرة أخرى)
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

    await prisma.hR_AppliedPenalty.updateMany({
      where: {
        isAppliedToPayroll: true,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      data: {
        isAppliedToPayroll: false,
      },
    })

    // حذف السجلات القديمة
    await prisma.hR_MonthlyPayroll.deleteMany({
      where: { month, year },
    })

    // الانتقال للحساب
    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد الحساب', `hr:monthly-payroll:calc:execute:${month}:${year}`)
      .row()
      .text('❌ إلغاء', 'hr:monthly-payroll:calculate')

    await ctx.editMessageText(
      `✅ تم حذف السجلات القديمة\n\n`
      + `📅 **حساب رواتب ${getMonthName(month)} ${formatArabicNumber(year)}**\n\n`
      + `هل تريد المتابعة؟`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in calc:force:', error)
    await ctx.editMessageText('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
  }
})

// ==================== Execute Calculation ====================

monthlyPayrollHandler.callbackQuery(/^hr:monthly-payroll:calc:execute:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري الحساب...')

  const month = Number.parseInt(ctx.match[1], 10)
  const year = Number.parseInt(ctx.match[2], 10)
  const userId = ctx.from?.id || 0

  try {
    const prisma = Database.prisma

    // جلب جميع الموظفين النشطين
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        // يمكن إضافة شروط إضافية مثل: تاريخ التعيين قبل نهاية الشهر
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        nickname: true,
      },
    })

    if (employees.length === 0) {
      await ctx.editMessageText('❌ لا يوجد موظفون نشطون للحساب.')
      return
    }

    // رسالة البداية
    const startMessage = await ctx.editMessageText(
      `⏳ **جاري حساب الرواتب...**\n\n`
      + `📅 الشهر: ${getMonthName(month)} ${formatArabicNumber(year)}\n`
      + `👥 عدد الموظفين: ${formatArabicNumber(employees.length)}\n\n`
      + `⌛ الرجاء الانتظار...`,
      { parse_mode: 'Markdown' },
    )

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ name: string, error: string }> = []

    // حساب كل موظف
    for (const employee of employees) {
      try {
        await calculateAndSaveEmployeePayroll(employee.id, month, year, userId)
        successCount++
      }
      catch (error) {
        errorCount++
        errors.push({
          name: employee.nickname || employee.fullName,
          error: error instanceof Error ? error.message : 'خطأ غير معروف',
        })
        console.error(`Error calculating payroll for ${employee.fullName}:`, error)
      }
    }

    // رسالة النهاية
    let resultText = `✅ **تم إكمال حساب الرواتب**\n\n`
    resultText += `📅 الشهر: ${getMonthName(month)} ${formatArabicNumber(year)}\n`
    resultText += `✅ نجح: ${formatArabicNumber(successCount)} موظف\n`

    if (errorCount > 0) {
      resultText += `❌ فشل: ${formatArabicNumber(errorCount)} موظف\n\n`
      resultText += `📋 **الأخطاء:**\n`
      errors.slice(0, 5).forEach((e) => {
        resultText += `├ ${e.name}: ${e.error}\n`
      })
      if (errors.length > 5) {
        resultText += `└ ... و ${formatArabicNumber(errors.length - 5)} خطأ آخر\n`
      }
    }

    const keyboard = new InlineKeyboard()
      .text('📊 عرض النتائج', `hr:monthly-payroll:view:${month}:${year}`)
      .row()
      .text('📥 تصدير Excel', `hr:monthly-payroll:export:${month}:${year}`)
      .row()
      .text('⬅️ رجوع', 'hr:monthly-payroll:main')

    await ctx.api.editMessageText(
      ctx.chat!.id,
      (startMessage as { message_id: number }).message_id,
      resultText,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in calc:execute:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ أثناء حساب الرواتب.\n\n'
      + 'الرجاء المحاولة مرة أخرى.',
    )
  }
})

// ==================== Core Calculation Function ====================

/**
 * حساب راتب موظف واحد وحفظه في HR_MonthlyPayroll
 * باستخدام نفس منهجية النظام الفردي
 */
async function calculateAndSaveEmployeePayroll(
  employeeId: number,
  month: number,
  year: number,
  userId: number,
): Promise<void> {
  const prisma = Database.prisma

  // === جلب بيانات الموظف ===
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      position: true,
      department: true,
    },
  })

  if (!employee) {
    throw new Error('الموظف غير موجود')
  }

  // === حساب الفترة ===
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfPeriod = new Date(year, month, 0, 23, 59, 59) // آخر يوم في الشهر
  const daysInMonth = new Date(year, month, 0).getDate()
  const periodDays = daysInMonth

  let daysBeforeHire = 0
  let daysAfterTermination = 0

  // خصم الأيام قبل التعيين
  if (employee.hireDate > startOfMonth && employee.hireDate <= endOfPeriod) {
    const hireDay = new Date(employee.hireDate).getDate()
    daysBeforeHire = hireDay - 1
  }

  // خصم الأيام بعد إنهاء الخدمة
  const terminationDate = employee.terminationDate || employee.resignationDate
  if (terminationDate && terminationDate < endOfPeriod) {
    const termDay = new Date(terminationDate).getDate()
    const endDay = endOfPeriod.getDate()
    daysAfterTermination = endDay - termDay
  }

  // === حساب الإجازات ===
  const allLeaves = await prisma.hR_EmployeeLeave.findMany({
    where: {
      employeeId: employee.id,
      status: 'APPROVED',
      isActive: true,
      OR: [
        { startDate: { gte: startOfMonth, lte: endOfPeriod } },
        { endDate: { gte: startOfMonth, lte: endOfPeriod } },
        {
          AND: [
            { startDate: { lte: startOfMonth } },
            { endDate: { gte: endOfPeriod } },
          ],
        },
      ],
    },
  })

  let unpaidLeaveDays = 0
  let paidLeaveDays = 0

  for (const leave of allLeaves) {
    const leaveStart = leave.startDate > startOfMonth ? leave.startDate : startOfMonth
    const leaveEnd = leave.endDate < endOfPeriod ? leave.endDate : endOfPeriod
    const originalLeaveDays = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    if (leave.leaveType === 'UNPAID') {
      unpaidLeaveDays += originalLeaveDays
    }
    else {
      paidLeaveDays += originalLeaveDays
    }
  }

  // === أيام التأخير ===
  const allDelayPenalties = await prisma.hR_AppliedPenalty.findMany({
    where: {
      employeeId: employee.id,
      isCancelled: false,
      penaltyType: 'DEDUCTION',
      createdAt: { gte: startOfMonth, lte: endOfPeriod },
    },
    include: {
      leave: { select: { leaveNumber: true } },
    },
  })

  let totalDelayDays = 0
  for (const penalty of allDelayPenalties) {
    totalDelayDays += penalty.delayDays || 0
  }

  // === أيام العمل ===
  const leaveDays = unpaidLeaveDays
  const actualWorkDays = periodDays - daysBeforeHire - daysAfterTermination - leaveDays
  const workDaysForAllowances = periodDays - daysBeforeHire - daysAfterTermination

  // حساب أيام التواجد الفعلي
  const totalLeaveDaysForDisplay = paidLeaveDays + unpaidLeaveDays
  const actualPresenceDays = periodDays - daysBeforeHire - daysAfterTermination - totalLeaveDaysForDisplay - totalDelayDays

  // === بدل الإجازات ===
  const leaveAllowancesInMonth = await prisma.hR_EmployeeLeave.findMany({
    where: {
      employeeId: employee.id,
      status: 'APPROVED',
      settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية (بدل إجازة)
      allowanceAmount: { gt: 0 },
      allowanceSettled: false,
      startDate: { gte: startOfMonth, lte: endOfPeriod },
    },
  })

  let leaveAllowanceDays = 0
  for (const leave of leaveAllowancesInMonth) {
    leaveAllowanceDays += leave.totalDays
  }

  const actualPresenceWithAllowance = actualPresenceDays + leaveAllowanceDays

  // ⚙️ التحقق من نوع حساب الراتب (شهري أو يومي)
  const isMonthlyCalculation = employee.salaryCalculationType === 'MONTHLY'

  // === الراتب الأساسي ===
  let proratedSalary: number

  if (isMonthlyCalculation) {
    // 📅 نظام شهري: الراتب ثابت بغض النظر عن أيام العمل
    proratedSalary = employee.basicSalary
  }
  else {
    // 📊 نظام يومي: الراتب بالنسبة والتناسب
    const dailyRate = employee.basicSalary / 30
    proratedSalary = dailyRate * actualWorkDays
  }

  // === البدلات ===
  const positionAllowances = await prisma.hR_PositionAllowance.findMany({
    where: { positionId: employee.positionId, isActive: true },
    include: { allowanceType: true },
  })

  const employeeAllowances = await prisma.hR_EmployeeAllowance.findMany({
    where: { employeeId: employee.id, isActive: true },
    include: { allowanceType: true },
  })

  let totalAllowances = 0
  const posAllowancesArray: Array<{ name: string, monthly: number, actual: number }> = []
  const empAllowancesArray: Array<{ name: string, monthly: number, actual: number }> = []

  for (const pa of positionAllowances) {
    let actualAllowance: number

    if (isMonthlyCalculation) {
      // نظام شهري: البدل كامل
      actualAllowance = pa.amount
    }
    else {
      // نظام يومي: البدلات بالنسبة والتناسب
      const dailyAllowance = pa.amount / 30
      actualAllowance = dailyAllowance * workDaysForAllowances
    }

    totalAllowances += actualAllowance
    posAllowancesArray.push({
      name: pa.allowanceType.nameAr,
      monthly: pa.amount,
      actual: actualAllowance,
    })
  }

  for (const ea of employeeAllowances) {
    let actualAllowance: number

    if (isMonthlyCalculation) {
      // نظام شهري: البدل كامل
      actualAllowance = ea.amount
    }
    else {
      // نظام يومي: البدلات بالنسبة والتناسب
      const dailyAllowance = ea.amount / 30
      actualAllowance = dailyAllowance * workDaysForAllowances
    }

    totalAllowances += actualAllowance
    empAllowancesArray.push({
      name: ea.allowanceType.nameAr,
      monthly: ea.amount,
      actual: actualAllowance,
    })
  }

  // === بدل المادة ===
  const materialWithdrawals = await prisma.hR_Transaction.findMany({
    where: {
      employeeId: employee.id,
      transactionType: 'ITEM_WITHDRAWAL',
      status: 'APPROVED',
      createdAt: { gte: startOfMonth, lte: endOfPeriod },
    },
    include: { item: true },
  })

  const materialEntitlements = await prisma.hR_MaterialEntitlement.findMany({
    where: {
      targetType: 'EMPLOYEE',
      targetId: employee.id,
      isActive: true,
    },
    include: { item: true },
  })

  const withdrawalsByItem = new Map<number, number>()
  for (const withdrawal of materialWithdrawals) {
    if (withdrawal.itemId) {
      const currentQty = withdrawalsByItem.get(withdrawal.itemId) || 0
      withdrawalsByItem.set(withdrawal.itemId, currentQty + (withdrawal.quantity || 0))
    }
  }

  let totalMaterialAllowance = 0
  const materialItems: Array<{ name: string, withdrawn: number, entitled: number, qty: number, price: number, amount: number }> = []

  for (const ent of materialEntitlements) {
    const itemId = ent.itemId
    const actualWithdrawn = withdrawalsByItem.get(itemId) || 0

    if (actualWithdrawn > 0) {
      const entitledQty = ent.dailyQuantity * actualPresenceWithAllowance
      const allowanceQty = Math.min(actualWithdrawn, entitledQty)
      const allowanceAmount = allowanceQty * (ent.item?.price || 0)
      totalMaterialAllowance += allowanceAmount

      materialItems.push({
        name: ent.item?.nameAr || 'صنف',
        withdrawn: actualWithdrawn,
        entitled: entitledQty,
        qty: allowanceQty,
        price: ent.item?.price || 0,
        amount: allowanceAmount,
      })
    }
  }

  // ⚠️ البدل العيني منفصل ولا يُضاف لـ totalAllowances
  // totalAllowances فقط للبدلات (الوظيفة + الموظف)

  // === المكافآت ===
  const bonuses = await prisma.hR_Bonus.findMany({
    where: {
      OR: [
        { bonusType: 'INDIVIDUAL', targetId: employee.id },
        { bonusType: 'POSITION', targetId: employee.positionId },
        { bonusType: 'ALL' },
      ],
      isActive: true,
    },
  })

  let totalBonuses = 0
  const bonusesArray: Array<{ name: string, type: string, monthly: number, actual: number }> = []

  for (const bonus of bonuses) {
    const dailyBonus = bonus.amount / 30
    const actualBonus = dailyBonus * workDaysForAllowances
    totalBonuses += actualBonus
    bonusesArray.push({
      name: bonus.bonusName,
      type: bonus.bonusType,
      monthly: bonus.amount,
      actual: actualBonus,
    })
  }

  // === بدل الإجازات ===
  const leaveAllowances = await prisma.hR_EmployeeLeave.findMany({
    where: {
      employeeId: employee.id,
      status: 'APPROVED',
      settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية (بدل إجازة)
      allowanceAmount: { gt: 0 },
      allowanceSettled: false,
      createdAt: { lte: endOfPeriod },
    },
  })

  let totalLeaveAllowances = 0
  const leaveAllowancesArray: Array<{ leaveNumber: string, days: number, amount: number, startDate: Date, endDate: Date }> = []
  const leaveAllowanceIds: number[] = []

  for (const leave of leaveAllowances) {
    totalLeaveAllowances += leave.allowanceAmount || 0
    leaveAllowancesArray.push({
      leaveNumber: leave.leaveNumber,
      days: leave.totalDays,
      amount: leave.allowanceAmount || 0,
      startDate: leave.startDate,
      endDate: leave.endDate,
    })
    leaveAllowanceIds.push(leave.id)
  }

  // === الخصومات ===
  const endOfMonthFull = new Date(year, month, 0, 23, 59, 59)
  const transactions = await prisma.hR_Transaction.findMany({
    where: {
      employeeId: employee.id,
      isSettled: false,
      isManuallySettled: false,
      OR: [
        {
          transactionType: { in: ['CASH_ADVANCE', 'ITEM_WITHDRAWAL'] },
          status: 'APPROVED',
          createdAt: { gte: startOfMonth, lte: endOfPeriod },
        },
        {
          transactionType: 'EMPLOYEE_DEBT',
          status: 'PENDING',
          createdAt: { lte: endOfMonthFull },
        },
      ],
    },
    include: { item: true },
  })

  let totalAdvances = 0
  let totalWithdrawals = 0
  let totalDebts = 0
  const cashAdvances: Array<{ date: Date, amount: number, description: string }> = []
  const itemWithdrawals: Array<{ date: Date, item: string, qty: number, unitPrice: number, amount: number }> = []
  const debts: Array<{ date: Date, amount: number, notes: string }> = []
  const transactionIds: number[] = []

  for (const trans of transactions) {
    const amount = trans.amount || 0
    transactionIds.push(trans.id)

    if (trans.transactionType === 'CASH_ADVANCE') {
      totalAdvances += amount
      cashAdvances.push({
        date: trans.createdAt,
        amount,
        description: trans.description || '',
      })
    }
    else if (trans.transactionType === 'ITEM_WITHDRAWAL') {
      totalWithdrawals += amount
      itemWithdrawals.push({
        date: trans.createdAt,
        item: trans.item?.nameAr || 'صنف',
        qty: trans.quantity || 0,
        unitPrice: trans.unitPrice || 0,
        amount,
      })
    }
    else if (trans.transactionType === 'EMPLOYEE_DEBT') {
      totalDebts += amount
      debts.push({
        date: trans.createdAt,
        amount,
        notes: trans.notes || '',
      })
    }
  }

  const totalDeductions = totalAdvances + totalWithdrawals + totalDebts

  // === عقوبات التأخير ===
  const delayPenalties = await prisma.hR_AppliedPenalty.findMany({
    where: {
      employeeId: employee.id,
      status: 'APPROVED',
      isAppliedToPayroll: false,
      isCancelled: false,
      penaltyType: 'DEDUCTION',
      createdAt: { gte: startOfMonth, lte: endOfPeriod },
    },
    include: {
      leave: { select: { leaveNumber: true } },
    },
  })

  let totalDelayPenalties = 0
  const delayPenaltiesArray: Array<{ leaveNumber: string, delayDays: number, deductionDays: number, amount: number }> = []
  const penaltyIds: number[] = []

  const dailyWage = employee.basicSalary / 30

  for (const penalty of delayPenalties) {
    const deductionDays = penalty.deductionDays || 0
    const deductionAmount = dailyWage * deductionDays
    totalDelayPenalties += deductionAmount
    penaltyIds.push(penalty.id)

    delayPenaltiesArray.push({
      leaveNumber: penalty.leave.leaveNumber,
      delayDays: penalty.delayDays || 0,
      deductionDays,
      amount: deductionAmount,
    })
  }

  // === الإجماليات النهائية ===
  const totalEarnings = proratedSalary + totalAllowances + totalMaterialAllowance + totalBonuses + totalLeaveAllowances
  const netSalary = totalEarnings - totalDeductions - totalDelayPenalties

  // === الحفظ في قاعدة البيانات ===
  await prisma.hR_MonthlyPayroll.create({
    data: {
      employeeId: employee.id,
      month,
      year,
      periodDays,
      actualWorkDays,
      workDaysForAllowances,
      daysBeforeHire,
      daysAfterTermination,
      unpaidLeaveDays,
      paidLeaveDays,
      delayDays: totalDelayDays,
      actualPresenceDays: actualPresenceWithAllowance,
      basicSalary: employee.basicSalary,
      proratedSalary,
      // البدلات - نحفظ الإجماليات فقط (التفاصيل في JSON)
      housingAllowance: 0,
      transportAllowance: 0,
      foodAllowance: 0,
      fieldAllowance: 0,
      materialAllowance: totalMaterialAllowance,
      totalAllowances,
      totalBonuses,
      totalLeaveAllowances,
      totalAdvances,
      totalWithdrawals,
      totalDebts,
      totalDeductions,
      totalDelayPenalties,
      totalEarnings,
      netSalary,
      // حفظ التفاصيل كـ JSON
      allowancesDetails: JSON.stringify({
        position: posAllowancesArray,
        employee: empAllowancesArray,
        material: materialItems,
      }),
      bonusesDetails: JSON.stringify(bonusesArray),
      leaveAllowancesDetails: JSON.stringify(leaveAllowancesArray),
      deductionsDetails: JSON.stringify({
        cashAdvances,
        itemWithdrawals,
        debts,
      }),
      penaltiesDetails: JSON.stringify(delayPenaltiesArray),
      paymentStatus: 'PENDING',
      settlementStatus: 'PENDING',
      createdByUserId: BigInt(userId),
    },
  })

  // === تحديث حالة البنود ===
  // تحديث المعاملات لتكون مُسواة
  if (transactionIds.length > 0) {
    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: { isSettled: true, settledAt: new Date() },
    })
  }

  // تحديث بدل الإجازات لتكون مُسواة
  if (leaveAllowanceIds.length > 0) {
    await prisma.hR_EmployeeLeave.updateMany({
      where: { id: { in: leaveAllowanceIds } },
      data: { allowanceSettled: true },
    })
  }

  // تحديث العقوبات لتكون مُطبقة
  if (penaltyIds.length > 0) {
    await prisma.hR_AppliedPenalty.updateMany({
      where: { id: { in: penaltyIds } },
      data: { isAppliedToPayroll: true },
    })
  }
}

// ==================== View Results ====================

monthlyPayrollHandler.callbackQuery(/^hr:monthly-payroll:view:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const month = Number.parseInt(ctx.match[1], 10)
  const year = Number.parseInt(ctx.match[2], 10)

  try {
    const prisma = Database.prisma

    const payrolls = await prisma.hR_MonthlyPayroll.findMany({
      where: { month, year },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            nickname: true,
            department: { select: { name: true } },
            position: { select: { titleAr: true } },
          },
        },
      },
      orderBy: { netSalary: 'desc' },
      take: 10,
    })

    if (payrolls.length === 0) {
      await ctx.editMessageText('❌ لا توجد بيانات لعرضها.')
      return
    }

    const totalCount = await prisma.hR_MonthlyPayroll.count({
      where: { month, year },
    })

    // حساب الإحصائيات
    const stats = await prisma.hR_MonthlyPayroll.aggregate({
      where: { month, year },
      _sum: {
        proratedSalary: true,
        totalAllowances: true,
        totalBonuses: true,
        totalLeaveAllowances: true,
        totalDeductions: true,
        totalDelayPenalties: true,
        netSalary: true,
      },
    })

    let text = `📊 **رواتب ${getMonthName(month)} ${formatArabicNumber(year)}**\n\n`
    text += `👥 **عدد الموظفين:** ${formatArabicNumber(totalCount)}\n\n`
    text += `💰 **الإحصائيات:**\n`
    text += `├ الرواتب: ${formatCurrency(stats._sum.proratedSalary || 0)}\n`
    text += `├ البدلات: ${formatCurrency(stats._sum.totalAllowances || 0)}\n`
    text += `├ المكافآت: ${formatCurrency(stats._sum.totalBonuses || 0)}\n`
    text += `├ بدل إجازات: ${formatCurrency(stats._sum.totalLeaveAllowances || 0)}\n`
    text += `├ الخصومات: ${formatCurrency(stats._sum.totalDeductions || 0)}\n`
    text += `├ الغرامات: ${formatCurrency(stats._sum.totalDelayPenalties || 0)}\n`
    text += `└ **الصافي:** ${formatCurrency(stats._sum.netSalary || 0)}\n\n`

    text += `📋 **أعلى ${Math.min(10, totalCount)} رواتب:**\n\n`

    payrolls.forEach((p, i) => {
      const name = p.employee.nickname || p.employee.fullName
      text += `${formatArabicNumber(i + 1)}. ${name}\n`
      text += `   💰 ${formatCurrency(p.netSalary)}\n`
    })

    const keyboard = new InlineKeyboard()
      .text('📥 تصدير Excel', `hr:monthly-payroll:export:${month}:${year}`)
      .row()
      .text('⬅️ رجوع', 'hr:monthly-payroll:main')

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error in view:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء عرض البيانات.')
  }
})

// ==================== Export Excel ====================

monthlyPayrollHandler.callbackQuery(/^hr:monthly-payroll:export:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري إنشاء التقرير...')

  const month = Number.parseInt(ctx.match[1], 10)
  const year = Number.parseInt(ctx.match[2], 10)

  try {
    const prisma = Database.prisma

    const payrolls = await prisma.hR_MonthlyPayroll.findMany({
      where: { month, year },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            nickname: true,
            department: { select: { name: true } },
            position: { select: { titleAr: true } },
          },
        },
      },
      orderBy: { netSalary: 'desc' },
    })

    if (payrolls.length === 0) {
      await ctx.reply('❌ لا توجد بيانات للتصدير.')
      return
    }

    // إنشاء ملف Excel احترافي
    const { createMonthlyPayrollExcel } = await import('../utils/monthly-payroll-excel-generator.js')
    const filePath = await createMonthlyPayrollExcel(payrolls, month, year)

    // حساب الإحصائيات
    const totalBasicSalary = payrolls.reduce((sum, p) => sum + Number(p.proratedSalary), 0)
    const totalAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalAllowances), 0)
    const totalMaterial = payrolls.reduce((sum, p) => sum + Number(p.materialAllowance), 0)
    const totalBonuses = payrolls.reduce((sum, p) => sum + Number(p.totalBonuses), 0)
    const totalLeaveAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalLeaveAllowances), 0)
    const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalAdvances) + Number(p.totalWithdrawals) + Number(p.totalDebts), 0)
    const totalPenalties = payrolls.reduce((sum, p) => sum + Number(p.totalDelayPenalties), 0)
    const totalEarnings = totalBasicSalary + totalAllowances + totalMaterial + totalBonuses + totalLeaveAllowances
    const netPayments = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0)

    // إرسال الملف
    await ctx.replyWithDocument(
      new InputFile(filePath, `monthly_payroll_${year}_${month.toString().padStart(2, '0')}.xlsx`),
      {
        caption:
          `✅ **كشف رواتب ${getMonthName(month)} ${formatArabicNumber(year)}**\n\n`
          + `� **الإحصائيات الرئيسية:**\n\n`
          + `�👥 عدد الموظفين: ${formatArabicNumber(payrolls.length)}\n`
          + `� إجمالي الرواتب الأساسية: ${formatCurrency(totalBasicSalary)}\n`
          + `📋 إجمالي البدلات: ${formatCurrency(totalAllowances)}\n`
          + `📦 إجمالي بدل المسحوبات: ${formatCurrency(totalMaterial)}\n`
          + `🎁 إجمالي المكافآت: ${formatCurrency(totalBonuses)}\n`
          + `🏖️ إجمالي بدل الإجازات: ${formatCurrency(totalLeaveAllowances)}\n`
          + `➖ إجمالي الخصومات: ${formatCurrency(totalDeductions)}\n`
          + `🚨 إجمالي الغرامات: ${formatCurrency(totalPenalties)}\n`
          + `━━━━━━━━━━━━━━━━━\n`
          + `💵 إجمالي المستحقات: ${formatCurrency(totalEarnings)}\n`
          + `✨ **صافي المدفوعات: ${formatCurrency(netPayments)}**`,
        parse_mode: 'Markdown',
      },
    )

    // حذف الملف المؤقت
    const fs = await import('node:fs/promises')
    await fs.unlink(filePath)
  }
  catch (error) {
    console.error('Error in export:', error)
    await ctx.reply('❌ حدث خطأ أثناء تصدير البيانات.')
  }
})
