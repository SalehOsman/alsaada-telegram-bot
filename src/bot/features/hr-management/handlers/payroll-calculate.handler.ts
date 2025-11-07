/**
 * Payroll Calculate Handler
 * حساب رواتب الموظفين مع البدلات والمكافآت والخصومات
 */

import type { Context } from 'grammy'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { Calendar } from '../../../../modules/ui/calendar.js'
import { createAuditLog } from '../helpers/audit-log.helper.js'
import { translatePaymentStatus } from '../types/payroll-payment.types.js'

export const payrollCalculateHandler = new Composer<Context>()

// ==================== State Management ====================

interface CalculatePayrollState {
  step: 'select_month' | 'select_year' | 'select_employee' | 'select_settlement_type' | 'confirm'
  month?: number
  year?: number
  employeeId?: number
  settlementType?: 'today' | 'half_first' | 'half_second' | 'full_month' | 'termination' | 'last_leave'
}

interface PayrollData {
  employeeId: number
  employeeCode: string
  employeeName: string
  positionTitle: string | null
  month: number
  year: number
  settlementType: string
  periodStartDate: Date
  periodEndDate: Date
  periodDays: number
  actualWorkDays: number
  leaveDays: number
  proratedSalary: number
  totalAllowances: number
  totalBonuses: number
  materialAllowanceAmount: number
  totalLeaveAllowances: number
  leaveAllowanceIds: number[]
  totalEarnings: number
  totalAdvances: number
  totalWithdrawals: number
  totalDeductions: number
  netSalary: number
  allowancesArray: any[]
  bonusesArray: any[]
  transactionsArray: any[]
}

const calculateStates = new Map<number, CalculatePayrollState>()
const payrollDataCache = new Map<string, PayrollData>()

// ==================== Helper Functions ====================

function formatArabicNumber(num: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().split('').map((digit) => {
    if (digit === '.' || digit === '-')
      return digit
    const numDigit = Number.parseInt(digit, 10)
    return Number.isNaN(numDigit) ? digit : arabicNumerals[numDigit]
  }).join('')
}

function formatCurrency(amount: number): string {
  return `${formatArabicNumber(Number(amount.toFixed(2)))} جنيه`
}

function formatArabicDate(date: Date): string {
  const day = formatArabicNumber(date.getDate())
  const month = formatArabicNumber(date.getMonth() + 1)
  const year = formatArabicNumber(date.getFullYear())
  return `${day}/${month}/${year}`
}

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

// ==================== Main Entry ====================

payrollCalculateHandler.callbackQuery('payroll:create', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id

  calculateStates.set(userId, {
    step: 'select_employee',
  })

  await showEmployeeSelection(ctx)
})

// ==================== Employee Selection ====================

async function showEmployeeSelection(ctx: Context) {
  // جلب جميع الموظفين النشطين والسابقين
  // نستبعد فقط العمال الذين تمت تسوية مستحقاتهم بالكامل (حالة SETTLED)
  // نتجاهل isActive لأن الموظفين السابقين قد يكون لديهم isActive = false
  const employees = await Database.prisma.employee.findMany({
    where: {
      // استبعاد فقط العمال السابقين الذين حالتهم SETTLED (تمت التسوية الكاملة)
      NOT: {
        employmentStatus: 'SETTLED',
      },
    },
    orderBy: [
      { employmentStatus: 'asc' }, // النشطون أولاً (ACTIVE < RESIGNED < TERMINATED)
      { nickname: 'asc' },
    ],
    select: {
      id: true,
      nickname: true,
      employmentStatus: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
  })

  if (employees.length === 0) {
    await ctx.editMessageText(
      '❌ **لا يوجد موظفون**\n\n'
      + 'لا يوجد موظفون نشطون أو موظفون سابقون بمستحقات غير مسواة.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  // تقسيم الموظفين حسب الحالة
  const activeEmployees = employees.filter(e => e.employmentStatus === 'ACTIVE')
  const formerEmployees = employees.filter(e => e.employmentStatus !== 'ACTIVE')

  // عرض الموظفين النشطين أولاً
  for (const emp of activeEmployees) {
    const displayText = `${emp.nickname} (${emp.position?.titleAr || 'غير محدد'})`
    keyboard.text(displayText, `payroll:calc:emp:${emp.id}`).row()
  }

  // ثم عرض العمال السابقين (مع علامة تمييز بسيطة)
  for (const emp of formerEmployees) {
    const displayText = `${emp.nickname} (${emp.position?.titleAr || 'غير محدد'}) 🔴`
    keyboard.text(displayText, `payroll:calc:emp:${emp.id}`).row()
  }

  keyboard.text('⬅️ رجوع', 'menu:sub:hr-management:payroll')

  let messageText = '👤 **اختر الموظف**\n\n'
  messageText += 'اختر الموظف المراد حساب راتبه:\n\n'

  if (formerEmployees.length > 0) {
    messageText += '🔴 = عامل سابق (يمكن تسوية مستحقاته)'
  }

  await ctx.editMessageText(messageText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

payrollCalculateHandler.callbackQuery(/^payroll:calc:emp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const employeeId = Number.parseInt(ctx.match![1])

  const state = calculateStates.get(userId)
  if (!state) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  state.employeeId = employeeId
  state.step = 'select_month'

  await showMonthSelection(ctx)
})

// ==================== Month Selection ====================

async function showMonthSelection(ctx: Context) {
  const keyboard = new InlineKeyboard()

  for (let i = 0; i < 12; i++) {
    if (i % 3 === 0 && i > 0)
      keyboard.row()
    keyboard.text(monthNames[i], `payroll:calc:month:${i + 1}`)
  }

  keyboard.row().text('⬅️ رجوع', 'payroll:create')

  await ctx.editMessageText(
    '📅 **اختر الشهر**\n\n'
    + 'اختر شهر حساب الراتب:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

payrollCalculateHandler.callbackQuery(/^payroll:calc:month:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const month = Number.parseInt(ctx.match![1])

  const state = calculateStates.get(userId)
  if (!state) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  state.month = month
  state.step = 'select_year'

  await showYearSelection(ctx)
})

// ==================== Year Selection ====================

async function showYearSelection(ctx: Context) {
  const currentYear = new Date().getFullYear()
  const keyboard = new InlineKeyboard()

  for (let i = -1; i <= 1; i++) {
    const year = currentYear + i
    keyboard.text(formatArabicNumber(year), `payroll:calc:year:${year}`)
    if (i < 1)
      keyboard.row()
  }

  keyboard.row().text('⬅️ رجوع', 'payroll:create')

  await ctx.editMessageText(
    '📅 **اختر السنة**\n\n'
    + 'اختر سنة حساب الراتب:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

payrollCalculateHandler.callbackQuery(/^payroll:calc:year:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const year = Number.parseInt(ctx.match![1])

  const state = calculateStates.get(userId)
  if (!state || !state.employeeId || !state.month) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  state.year = year
  state.step = 'select_settlement_type'

  // الانتقال لاختيار نوع التسوية
  await showSettlementTypeSelection(ctx, state.employeeId!, state.month!, state.year!)
})

// ==================== Settlement Type Selection ====================

async function showSettlementTypeSelection(ctx: Context, employeeId: number, month: number, year: number) {
  // جلب بيانات الموظف لتحديد الخيارات المتاحة
  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      fullName: true,
      resignationDate: true,
      terminationDate: true,
    },
  })

  if (!employee) {
    await ctx.editMessageText('❌ الموظف غير موجود')
    return
  }

  const keyboard = new InlineKeyboard()
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // حتى اليوم (فقط إذا كان الشهر الحالي)
  if (month === currentMonth && year === currentYear) {
    keyboard.text('📆 حتى اليوم', `payroll:settlement:today:${employeeId}:${month}:${year}`).row()
  }

  // نصف شهري
  keyboard
    .text('📊 النصف الأول (١-١٥)', `payroll:settlement:half_first:${employeeId}:${month}:${year}`)
    .row()
    .text('📊 النصف الثاني (١٦-٣٠)', `payroll:settlement:half_second:${employeeId}:${month}:${year}`)
    .row()

  // شهر كامل
  keyboard.text('📅 الشهر كاملاً', `payroll:settlement:full_month:${employeeId}:${month}:${year}`).row()

  // حتى تاريخ ترك الخدمة
  const terminationDate = employee.terminationDate || employee.resignationDate
  if (terminationDate) {
    const termDate = new Date(terminationDate)
    const termMonth = termDate.getMonth() + 1
    const termYear = termDate.getFullYear()

    if (month === termMonth && year === termYear) {
      keyboard.text('🚪 حتى تاريخ ترك الخدمة', `payroll:settlement:termination:${employeeId}:${month}:${year}`).row()
    }
  }

  // حتى بداية آخر إجازة
  const lastLeave = await Database.prisma.hR_EmployeeLeave.findFirst({
    where: {
      employeeId,
      status: 'APPROVED',
    },
    orderBy: {
      startDate: 'desc',
    },
    select: {
      startDate: true,
    },
  })

  if (lastLeave) {
    const leaveDate = new Date(lastLeave.startDate)
    const leaveMonth = leaveDate.getMonth() + 1
    const leaveYear = leaveDate.getFullYear()

    if (month === leaveMonth && year === leaveYear) {
      keyboard.text('🏖️ حتى بداية آخر إجازة', `payroll:settlement:last_leave:${employeeId}:${month}:${year}`).row()
    }
  }

  keyboard.text('⬅️ رجوع', 'payroll:create')

  await ctx.editMessageText(
    `⚙️ **اختر نوع التسوية**\n\n`
    + `👤 **الموظف:** ${employee.fullName}\n`
    + `📅 **الشهر:** ${monthNames[month - 1]} ${formatArabicNumber(year)}\n\n`
    + `اختر نوع التسوية المطلوبة:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Settlement Type Handler ====================

payrollCalculateHandler.callbackQuery(/^payroll:settlement:(today|half_first|half_second|full_month|termination|last_leave):(\d+):(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const settlementType = ctx.match![1] as 'today' | 'half_first' | 'half_second' | 'full_month' | 'termination' | 'last_leave'
  const employeeId = Number.parseInt(ctx.match![2])
  const month = Number.parseInt(ctx.match![3])
  const year = Number.parseInt(ctx.match![4])

  const state = calculateStates.get(userId)
  if (state) {
    state.settlementType = settlementType
  }

  // حساب الراتب
  await calculateAndShowPayroll(ctx, employeeId, month, year, settlementType)

  // تنظيف الحالة
  calculateStates.delete(userId)
})

// ==================== Calculate Payroll ====================

async function calculateAndShowPayroll(
  ctx: Context,
  employeeId: number,
  month: number,
  year: number,
  settlementType: 'today' | 'half_first' | 'half_second' | 'full_month' | 'termination' | 'last_leave' = 'full_month',
) {
  try {
    // جلب بيانات الموظف
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
      },
    })

    if (!employee) {
      await ctx.editMessageText('❌ الموظف غير موجود')
      return
    }

    // ==================== فحص التكرار: منع حساب نفس الموظف لنفس الشهر ====================
    const existingRecord = await Database.prisma.hR_PayrollRecord.findFirst({
      where: {
        employeeId,
        month,
        year,
        isDeleted: false,
      },
    })

    if (existingRecord) {
      await ctx.editMessageText(
        `⚠️ **تنبيه: سجل موجود مسبقاً**\n\n`
        + `لقد تم حساب راتب **${employee.nickname || employee.fullName}** لشهر **${monthNames[month - 1]} ${formatArabicNumber(year)}** من قبل.\n\n`
        + `📊 **تفاصيل السجل الموجود:**\n`
        + `├ الصافي: ${formatCurrency(existingRecord.netSalary)}\n`
        + `├ حالة الدفع: ${translatePaymentStatus(existingRecord.paymentStatus)}\n`
        + `└ تاريخ الحساب: ${formatArabicDate(existingRecord.createdAt)}\n\n`
        + `يمكنك عرض التفاصيل من قائمة التقارير المالية، أو حذف السجل القديم أولاً إذا كان خاطئاً.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('📊 عرض التقرير المالي', `payroll:financial:show:${employeeId}`)
            .row()
            .text('🗑️ حذف السجل القديم', `payroll:delete:${existingRecord.id}`)
            .row()
            .text('⬅️ رجوع', 'payroll:create'),
        },
      )
      return
    }

    // ==================== التحقق من حالة الإيقاف ====================
    // إذا كان الموظف موقوفاً عن العمل، نحسب الراتب حتى يوم بداية الإجازة التي سببت الإيقاف فقط
    let suspensionLimitDate: Date | null = null
    if (employee.employmentStatus === 'SUSPENDED') {
      // جلب عقوبة الإيقاف النشطة
      const suspensionPenalty = await Database.prisma.hR_AppliedPenalty.findFirst({
        where: {
          employeeId: employee.id,
          penaltyType: 'SUSPENSION',
          status: 'APPROVED',
          isCancelled: false,
        },
        include: {
          leave: {
            select: {
              startDate: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (suspensionPenalty && suspensionPenalty.leave) {
        // الراتب يتوقف عند بداية الإجازة التي سببت الإيقاف
        suspensionLimitDate = new Date(suspensionPenalty.leave.startDate)
        suspensionLimitDate.setDate(suspensionLimitDate.getDate() - 1) // اليوم قبل الإجازة
        suspensionLimitDate.setHours(23, 59, 59)
      }
    }

    // ==================== حساب التاريخ النهائي حسب نوع التسوية ====================
    const startOfMonth = new Date(year, month - 1, 1)
    let endOfPeriod: Date
    let settlementTypeLabel = ''

    switch (settlementType) {
      case 'today': {
        const today = new Date()
        endOfPeriod = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
        settlementTypeLabel = 'تسوية حتى اليوم'
        break
      }
      case 'half_first':
        endOfPeriod = new Date(year, month - 1, 15, 23, 59, 59)
        settlementTypeLabel = 'تسوية النصف الأول (١-١٥)'
        break
      case 'half_second':
        endOfPeriod = new Date(year, month, 0, 23, 59, 59)
        settlementTypeLabel = 'تسوية النصف الثاني (١٦-٣٠)'
        break
      case 'termination': {
        const termDate = employee.terminationDate || employee.resignationDate
        if (termDate) {
          endOfPeriod = new Date(termDate)
          endOfPeriod.setHours(23, 59, 59)
          settlementTypeLabel = 'تسوية حتى تاريخ ترك الخدمة'
        }
        else {
          endOfPeriod = new Date(year, month, 0, 23, 59, 59)
          settlementTypeLabel = 'تسوية الشهر كاملاً'
        }
        break
      }
      case 'last_leave': {
        const lastLeave = await Database.prisma.hR_EmployeeLeave.findFirst({
          where: {
            employeeId: employee.id,
            status: 'APPROVED',
          },
          orderBy: {
            startDate: 'desc',
          },
        })
        if (lastLeave) {
          endOfPeriod = new Date(lastLeave.startDate)
          endOfPeriod.setDate(endOfPeriod.getDate() - 1)
          endOfPeriod.setHours(23, 59, 59)
          settlementTypeLabel = 'تسوية حتى بداية آخر إجازة'
        }
        else {
          endOfPeriod = new Date(year, month, 0, 23, 59, 59)
          settlementTypeLabel = 'تسوية الشهر كاملاً'
        }
        break
      }
      case 'full_month':
      default:
        endOfPeriod = new Date(year, month, 0, 23, 59, 59)
        settlementTypeLabel = 'تسوية الشهر كاملاً'
        break
    }

    // ⚠️ تطبيق حد الإيقاف: إذا كان الموظف موقوفاً والتاريخ النهائي بعد تاريخ الإيقاف
    if (suspensionLimitDate && endOfPeriod > suspensionLimitDate) {
      endOfPeriod = suspensionLimitDate
      settlementTypeLabel += ' (موقوف عن العمل - حتى بداية الإجازة فقط)'
    }

    const daysInMonth = new Date(year, month, 0).getDate()
    // حساب عدد أيام الفترة (من بداية الشهر حتى endOfPeriod)
    // نستخدم رقم اليوم فقط بدلاً من حساب الفرق بالساعات لتجنب مشاكل التقريب
    const periodDays = endOfPeriod.getDate() - startOfMonth.getDate() + 1

    let daysBeforeHire = 0
    let daysAfterTermination = 0
    let leaveDays = 0

    // خصم الأيام قبل التعيين (يوم التعيين = يوم عمل)
    // فقط إذا كان تاريخ التعيين بعد بداية الشهر وقبل نهاية الفترة
    if (employee.hireDate > startOfMonth && employee.hireDate <= endOfPeriod) {
      const hireDay = new Date(employee.hireDate).getDate()
      daysBeforeHire = hireDay - 1 // الأيام من 1 حتى اليوم السابق للتعيين
    }

    // خصم الأيام بعد إنهاء الخدمة (يوم الإنهاء = يوم عمل)
    // فقط إذا كان تاريخ الإنهاء قبل نهاية الفترة
    const terminationDate = employee.terminationDate || employee.resignationDate
    if (terminationDate && terminationDate < endOfPeriod) {
      const termDay = new Date(terminationDate).getDate()
      const endDay = endOfPeriod.getDate()
      daysAfterTermination = endDay - termDay // الأيام من اليوم التالي للإنهاء حتى نهاية الفترة
    }

    // جلب جميع الإجازات المعتمدة ضمن الفترة
    const allLeaves = await Database.prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        isActive: true,
        OR: [
          {
            startDate: { gte: startOfMonth, lte: endOfPeriod },
          },
          {
            endDate: { gte: startOfMonth, lte: endOfPeriod },
          },
          {
            AND: [
              { startDate: { lte: startOfMonth } },
              { endDate: { gte: endOfPeriod } },
            ],
          },
        ],
      },
    })

    // حساب أيام الإجازات حسب النوع (أيام الإجازة الأصلية فقط، بدون التأخير)
    let unpaidLeaveDays = 0 // الإجازات بدون مرتب - تُخصم من الراتب
    let paidLeaveDays = 0 // الإجازات بمرتب - لا تُخصم من الراتب

    for (const leave of allLeaves) {
      const leaveStart = leave.startDate > startOfMonth ? leave.startDate : startOfMonth
      const leaveEnd = leave.endDate < endOfPeriod ? leave.endDate : endOfPeriod

      // حساب أيام الإجازة الأصلية فقط (بدون أيام التأخير)
      const originalLeaveDays = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

      if (leave.leaveType === 'UNPAID') {
        unpaidLeaveDays += originalLeaveDays
      }
      else {
        paidLeaveDays += originalLeaveDays
      }
    }

    // جلب أيام التأخير من جدول العقوبات (جميع العقوبات سواء معتمدة أو قيد المراجعة)
    const allDelayPenalties = await Database.prisma.hR_AppliedPenalty.findMany({
      where: {
        employeeId: employee.id,
        isCancelled: false,
        penaltyType: 'DEDUCTION',
        createdAt: {
          gte: startOfMonth,
          lte: endOfPeriod,
        },
      },
      include: {
        leave: {
          select: {
            leaveNumber: true,
          },
        },
      },
    })

    // حساب إجمالي أيام التأخير
    let totalDelayDays = 0
    for (const penalty of allDelayPenalties) {
      totalDelayDays += penalty.delayDays || 0
    }

    // فقط الإجازات بدون مرتب تُخصم من أيام العمل
    leaveDays = unpaidLeaveDays

    // أيام العمل الفعلية
    const actualWorkDays = periodDays - daysBeforeHire - daysAfterTermination - leaveDays

    // أيام العمل بدون إجازات (لحساب البدلات والمكافآت - الإجازات لا تؤثر عليها)
    const workDaysForAllowances = periodDays - daysBeforeHire - daysAfterTermination

    // ==================== التقرير ====================
    let reportText = '💰 **تقرير حساب الراتب**\n\n'
    reportText += `👤 **الموظف:** ${employee.fullName}\n`
    reportText += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n`
    reportText += `💼 **الوظيفة:** ${employee.position?.titleAr || employee.position?.title || 'غير محدد'}\n`
    reportText += `📅 **الشهر:** ${monthNames[month - 1]} ${formatArabicNumber(year)}\n`
    reportText += `📊 **نوع التسوية:** ${settlementTypeLabel}\n`
    if (settlementType !== 'full_month') {
      reportText += `📆 **الفترة:** ${formatArabicNumber(startOfMonth.getDate())}/${formatArabicNumber(month)} - ${formatArabicNumber(endOfPeriod.getDate())}/${formatArabicNumber(month)}\n`
    }
    reportText += `\n`

    reportText += `━━━━━━━━━━━━━━━━━\n`
    reportText += `📊 **حساب أيام العمل:**\n\n`
    reportText += `📅 أيام ${settlementType === 'full_month' ? 'الشهر' : 'الفترة'}: ${formatArabicNumber(settlementType === 'full_month' ? daysInMonth : periodDays)} يوم\n`

    if (daysBeforeHire > 0) {
      const hireDay = new Date(employee.hireDate).getDate()
      reportText += `📌 تاريخ التعيين: ${formatArabicNumber(hireDay)}/${formatArabicNumber(month)}/${formatArabicNumber(year)}\n`
      reportText += `├ لم يعمل: ${formatArabicNumber(daysBeforeHire)} ${daysBeforeHire === 1 ? 'يوم' : 'أيام'} (قبل التعيين)\n`
    }

    if (daysAfterTermination > 0 && terminationDate && terminationDate < endOfPeriod) {
      const termDay = new Date(terminationDate).getDate()
      reportText += `📌 تاريخ إنهاء الخدمة: ${formatArabicNumber(termDay)}/${formatArabicNumber(month)}/${formatArabicNumber(year)}\n`
      reportText += `├ لم يعمل: ${formatArabicNumber(daysAfterTermination)} ${daysAfterTermination === 1 ? 'يوم' : 'أيام'} (بعد الإنهاء)\n`
    }

    // حساب الإجازات المُستبدلة ببدل نقدي (من جدول الإجازات)
    const leaveAllowancesInMonth = await Database.prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية (بدل إجازة)
        allowanceAmount: { gt: 0 }, // الإجازات التي لها بدل
        allowanceSettled: false,
        startDate: {
          gte: startOfMonth,
          lte: endOfPeriod,
        },
      },
    })

    // حساب أيام الإجازات المُستبدلة ببدل
    let leaveAllowanceDays = 0
    for (const leave of leaveAllowancesInMonth) {
      leaveAllowanceDays += leave.totalDays
    }

    // حساب أيام التواجد الفعلي في الموقع
    const totalLeaveDaysForDisplay = paidLeaveDays + unpaidLeaveDays
    const actualPresenceDays = periodDays - daysBeforeHire - daysAfterTermination - totalLeaveDaysForDisplay - totalDelayDays

    // الإجازات الفعلية (بدون الإجازات المُستبدلة ببدل)
    const actualLeaveDaysWithSalary = paidLeaveDays - leaveAllowanceDays

    // عرض الإجازات الفعلية (بمرتب)
    if (actualLeaveDaysWithSalary > 0) {
      reportText += `🏖️ إجازات فعلية (بمرتب): ${formatArabicNumber(actualLeaveDaysWithSalary)} ${actualLeaveDaysWithSalary === 1 ? 'يوم' : 'أيام'}\n`
    }

    // عرض الإجازات المُستبدلة ببدل نقدي
    if (leaveAllowanceDays > 0) {
      reportText += `💰 إجازات مُستبدلة ببدل نقدي: ${formatArabicNumber(leaveAllowanceDays)} ${leaveAllowanceDays === 1 ? 'يوم' : 'أيام'}\n`
    }

    // عرض الإجازات بدون مرتب
    if (unpaidLeaveDays > 0) {
      reportText += `🏖️ إجازات بدون مرتب: ${formatArabicNumber(unpaidLeaveDays)} ${unpaidLeaveDays === 1 ? 'يوم' : 'أيام'}\n`
    }

    // عرض أيام التأخير
    if (totalDelayDays > 0) {
      reportText += `⏰ أيام التأخير في العودة: ${formatArabicNumber(totalDelayDays)} ${totalDelayDays === 1 ? 'يوم' : 'أيام'}\n`
    }

    // عرض إجمالي الغياب (فقط الإجازات الفعلية + تأخير، بدون الإجازات المستبدلة ببدل)
    const totalAbsenceDays = actualLeaveDaysWithSalary + unpaidLeaveDays + totalDelayDays
    if (totalAbsenceDays > 0) {
      reportText += `📊 إجمالي أيام الغياب الفعلي: ${formatArabicNumber(totalAbsenceDays)} ${totalAbsenceDays === 1 ? 'يوم' : 'أيام'}\n`
    }

    // أيام التواجد الفعلي (شامل أيام الإجازات المُستبدلة ببدل)
    const actualPresenceWithAllowance = actualPresenceDays + leaveAllowanceDays

    reportText += `\n✅ **أيام التواجد الفعلي في الموقع:** ${formatArabicNumber(actualPresenceWithAllowance)} يوم\n`
    reportText += `💰 **أيام العمل المدفوعة:** ${formatArabicNumber(actualWorkDays)} يوم\n`
    reportText += `━━━━━━━━━━━━━━━━━\n\n`

    // ⚙️ التحقق من نوع حساب الراتب (شهري أو يومي)
    const isMonthlyCalculation = employee.salaryCalculationType === 'MONTHLY'

    // الراتب الأساسي (حسب نوع الحساب)
    let actualBasicSalary: number

    if (isMonthlyCalculation) {
      // 📅 نظام شهري: الراتب ثابت، لكن تُخصم الإجازات بدون مرتب
      if (unpaidLeaveDays > 0) {
        const dailyRate = employee.basicSalary / 30
        const unpaidDeduction = dailyRate * unpaidLeaveDays
        actualBasicSalary = employee.basicSalary - unpaidDeduction
      } else {
        actualBasicSalary = employee.basicSalary
      }
    }
    else {
      // 📊 نظام يومي: الراتب بالنسبة والتناسب
      const dailyRate = employee.basicSalary / 30
      actualBasicSalary = dailyRate * actualWorkDays
    }

    reportText += `💵 **الراتب الأساسي:**\n`

    // إذا كان نظام شهري
    if (isMonthlyCalculation) {
      reportText += `├ نظام الحساب: شهري (ثابت)\n`
      if (unpaidLeaveDays > 0) {
        const dailyRate = employee.basicSalary / 30
        const unpaidDeduction = dailyRate * unpaidLeaveDays
        reportText += `├ المسجل: ${formatCurrency(employee.basicSalary)}\n`
        reportText += `├ خصم إجازات بدون مرتب: ${formatArabicNumber(unpaidLeaveDays)} ${unpaidLeaveDays === 1 ? 'يوم' : 'أيام'} = -${formatCurrency(unpaidDeduction)}\n`
        reportText += `└ **المستحق:** ${formatCurrency(actualBasicSalary)}\n\n`
      } else {
        reportText += `└ **المستحق:** ${formatCurrency(actualBasicSalary)}\n\n`
      }
    }
    else {
      // إذا كان نظام يومي
      if (actualWorkDays === daysInMonth && daysBeforeHire === 0 && daysAfterTermination === 0) {
        reportText += `└ **المستحق:** ${formatCurrency(employee.basicSalary)}\n\n`
      }
      else {
        reportText += `├ نظام الحساب: يومي (متغير)\n`
        reportText += `├ المسجل: ${formatCurrency(employee.basicSalary)}/شهر\n`
        reportText += `├ أيام العمل: ${formatArabicNumber(actualWorkDays)} يوم\n`
        reportText += `└ **المستحق:** ${formatCurrency(actualBasicSalary)}\n\n`
      }
    }

    let totalAllowances = 0
    let allowancesDetails = ''

    // البدلات من الوظيفة
    const positionAllowances = await Database.prisma.hR_PositionAllowance.findMany({
      where: {
        positionId: employee.positionId,
        isActive: true,
      },
      include: {
        allowanceType: true,
      },
    })

    if (positionAllowances.length > 0) {
      allowancesDetails += '🏢 **بدلات الوظيفة:**\n'
      for (const pa of positionAllowances) {
        // البدلات حسب نوع الحساب
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

        if (isMonthlyCalculation) {
          allowancesDetails += `├ ${pa.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
        }
        else if (workDaysForAllowances < daysInMonth) {
          allowancesDetails += `├ ${pa.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
          allowancesDetails += `  (${formatCurrency(pa.amount)} ÷ ٣٠ × ${formatArabicNumber(workDaysForAllowances)} يوم)\n`
        }
        else {
          allowancesDetails += `├ ${pa.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
        }
      }
      allowancesDetails += '\n'
    }

    // البدلات الخاصة بالموظف
    const employeeAllowances = await Database.prisma.hR_EmployeeAllowance.findMany({
      where: {
        employeeId: employee.id,
        isActive: true,
      },
      include: {
        allowanceType: true,
      },
    })

    if (employeeAllowances.length > 0) {
      allowancesDetails += '👤 **بدلات الموظف:**\n'
      for (const ea of employeeAllowances) {
        // البدلات حسب نوع الحساب
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

        if (isMonthlyCalculation) {
          allowancesDetails += `├ ${ea.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
        }
        else if (workDaysForAllowances < daysInMonth) {
          allowancesDetails += `├ ${ea.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
          allowancesDetails += `  (${formatCurrency(ea.amount)} ÷ ٣٠ × ${formatArabicNumber(workDaysForAllowances)} يوم)\n`
        }
        else {
          allowancesDetails += `├ ${ea.allowanceType.nameAr}: ${formatCurrency(actualAllowance)}\n`
        }
      }
      allowancesDetails += '\n'
    }

    // ✨ حساب بدل المسحوبات العينية (بناءً على المسحوبات الفعلية)

    // 1. جلب المسحوبات العينية الفعلية من HR_Transaction للفترة المحددة
    const materialWithdrawals = await Database.prisma.hR_Transaction.findMany({
      where: {
        employeeId: employee.id,
        transactionType: 'ITEM_WITHDRAWAL',
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfPeriod,
        },
      },
      include: {
        item: true,
      },
    })

    // 2. جلب الاستحقاقات لمعرفة الحد الأقصى
    const materialEntitlements = await Database.prisma.hR_MaterialEntitlement.findMany({
      where: {
        targetType: 'EMPLOYEE',
        targetId: employee.id,
        isActive: true,
      },
      include: {
        item: true,
      },
    })

    // 3. حساب المسحوبات لكل صنف
    const withdrawalsByItem = new Map<number, number>()
    for (const withdrawal of materialWithdrawals) {
      if (withdrawal.itemId) {
        const currentQty = withdrawalsByItem.get(withdrawal.itemId) || 0
        withdrawalsByItem.set(withdrawal.itemId, currentQty + (withdrawal.quantity || 0))
      }
    }

    // 4. حساب بدل المسحوبات العينية (البدل = أقل قيمة بين المسحوب والمستحق)
    let totalMaterialAllowance = 0

    if (materialEntitlements.length > 0 && withdrawalsByItem.size > 0) {
      allowancesDetails += '📦 **بدل المسحوبات العينية:**\n'

      for (const ent of materialEntitlements) {
        const itemId = ent.itemId
        const actualWithdrawn = withdrawalsByItem.get(itemId) || 0 // المسحوب فعلياً

        if (actualWithdrawn > 0) {
          // الاستحقاق = الكمية اليومية × أيام التواجد الفعلي في الموقع
          const entitledQty = ent.dailyQuantity * actualPresenceWithAllowance

          // البدل = أقل قيمة (المسحوب الفعلي، الاستحقاق)
          const allowanceQty = Math.min(actualWithdrawn, entitledQty)
          const allowanceAmount = allowanceQty * (ent.item?.price || 0)
          totalMaterialAllowance += allowanceAmount

          allowancesDetails += `├ ${ent.item?.nameAr || 'صنف'}: ${formatCurrency(allowanceAmount)}\n`
          allowancesDetails += `  (${formatArabicNumber(allowanceQty)} ${ent.item?.unit || 'علبة'} × ${formatCurrency(ent.item?.price || 0)})\n`
        }
      }
      allowancesDetails += '\n'
    }

    totalAllowances += totalMaterialAllowance

    if (allowancesDetails) {
      reportText += allowancesDetails
    }

    if (totalAllowances > 0) {
      reportText += `✅ **إجمالي البدلات:** ${formatCurrency(totalAllowances)}\n\n`
    }

    // المكافآت
    const bonuses = await Database.prisma.hR_Bonus.findMany({
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
    if (bonuses.length > 0) {
      reportText += '🎁 **المكافآت:**\n'
      for (const bonus of bonuses) {
        // المكافآت بالنسبة والتناسب (الإجازات لا تؤثر)
        const dailyBonus = bonus.amount / 30
        const actualBonus = dailyBonus * workDaysForAllowances
        totalBonuses += actualBonus

        // استخدام الوصف المسجل إذا كان موجوداً، وإلا لا نعرض شيء
        const descriptionLabel = bonus.description ? ` (${bonus.description})` : ''

        if (workDaysForAllowances < daysInMonth) {
          reportText += `├ ${bonus.bonusName}${descriptionLabel}: ${formatCurrency(actualBonus)}\n`
          reportText += `  (${formatCurrency(bonus.amount)} ÷ ٣٠ × ${formatArabicNumber(workDaysForAllowances)} يوم)\n`
        }
        else {
          reportText += `├ ${bonus.bonusName}${descriptionLabel}: ${formatCurrency(actualBonus)}\n`
        }
      }
      reportText += `\n✅ **إجمالي المكافآت:** ${formatCurrency(totalBonuses)}\n\n`
    }

    // 💰 بدل الإجازات (الإجازات التي لم يحصل عليها العامل وتم صرف بدل نقدي)
    const leaveAllowances = await Database.prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية (بدل إجازة)
        allowanceAmount: { gt: 0 }, // الإجازات التي لها بدل
        allowanceSettled: false, // لم يتم تسويتها بعد
        // البدل يُصرف في أي شهر حتى لو كانت الإجازة في المستقبل
        createdAt: {
          lte: endOfPeriod,
        },
      },
    })

    let totalLeaveAllowances = 0
    if (leaveAllowances.length > 0) {
      reportText += '💰 **بدل الإجازات (لم يحصل عليها):**\n'
      for (const leave of leaveAllowances) {
        totalLeaveAllowances += leave.allowanceAmount || 0
        reportText += `├ إجازة ${leave.leaveNumber}: ${formatCurrency(leave.allowanceAmount || 0)}\n`
        reportText += `  (${formatArabicNumber(leave.totalDays)} أيام - ${Calendar.formatArabic(leave.startDate)} إلى ${Calendar.formatArabic(leave.endDate)})\n`
      }
      reportText += `\n✅ **إجمالي بدل الإجازات:** ${formatCurrency(totalLeaveAllowances)}\n\n`
    }

    // الخصومات (السلف والمسحوبات والديون السابقة)
    // فقط المعاملات غير المسواة التي تم إنشاؤها خلال الشهر الحالي أو الديون السابقة
    // تجاهل المعاملات المُسوّاة يدوياً (تم دفعها خارج النظام)
    const endOfMonthFull = new Date(year, month, 0, 23, 59, 59)
    const transactions = await Database.prisma.hR_Transaction.findMany({
      where: {
        employeeId: employee.id,
        isSettled: false,
        isManuallySettled: false, // ← تجاهل المُسوّاة يدوياً
        OR: [
          // المعاملات العادية (سلف ومسحوبات) من الشهر الحالي فقط
          {
            transactionType: { in: ['CASH_ADVANCE', 'ITEM_WITHDRAWAL'] },
            status: 'APPROVED',
            createdAt: {
              gte: startOfMonth,
              lte: endOfPeriod,
            },
          },
          // الديون السابقة (من أي وقت)
          {
            transactionType: 'EMPLOYEE_DEBT',
            status: 'PENDING',
            createdAt: {
              lte: endOfMonthFull,
            },
          },
        ],
      },
      include: {
        item: true,
      },
    })

    let totalDeductions = 0
    if (transactions.length > 0) {
      reportText += '💸 **الخصومات (السلف والمسحوبات):**\n'
      for (const trans of transactions) {
        const amount = trans.amount || 0
        totalDeductions += amount

        // تنسيق التاريخ
        const transDate = new Date(trans.createdAt)
        const dateStr = `${formatArabicNumber(transDate.getDate())}/${formatArabicNumber(transDate.getMonth() + 1)}/${formatArabicNumber(transDate.getFullYear())}`

        if (trans.transactionType === 'CASH_ADVANCE') {
          const description = trans.description ? ` - ${trans.description}` : ''
          reportText += `├ سلفة نقدية${description} (${dateStr}): ${formatCurrency(amount)}\n`
        }
        else if (trans.transactionType === 'ITEM_WITHDRAWAL') {
          const itemName = trans.item?.nameAr || 'صنف'
          const quantity = trans.quantity || 0
          const unitPrice = trans.unitPrice || 0
          const unit = trans.item?.unit || 'علبة'

          reportText += `├ مسحوبات عينية - ${itemName} (${dateStr}):\n`
          reportText += `  ${formatArabicNumber(quantity)} ${unit} × ${formatCurrency(unitPrice)} = ${formatCurrency(amount)}\n`
        }
        else if (trans.transactionType === 'EMPLOYEE_DEBT') {
          const notes = trans.notes ? ` - ${trans.notes}` : ''
          reportText += `├ 🔴 دين سابق${notes} (${dateStr}): ${formatCurrency(amount)}\n`
        }
      }
      reportText += `\n⚠️ **إجمالي الخصومات:** ${formatCurrency(totalDeductions)}\n\n`
    }

    // حساب عقوبات التأخير في الإجازات
    // ملاحظة: الكشف الفردي استعلامي، يعرض جميع العقوبات المعتمدة في الشهر (حتى لو طُبقت في كشف جماعي)
    const delayPenalties = await Database.prisma.hR_AppliedPenalty.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
        isCancelled: false,
        penaltyType: 'DEDUCTION',
        createdAt: {
          gte: startOfMonth,
          lte: endOfPeriod,
        },
      },
      include: {
        leave: {
          select: {
            leaveNumber: true,
          },
        },
      },
    })

    let totalDelayDeduction = 0
    if (delayPenalties.length > 0) {
      reportText += '🚨 **خصومات التأخير في الإجازات:**\n'

      // حساب الأجر اليومي
      const dailyWage = employee.basicSalary / 30

      for (const penalty of delayPenalties) {
        const deductionDays = penalty.deductionDays || 0
        const deductionAmount = dailyWage * deductionDays
        totalDelayDeduction += deductionAmount

        reportText += `├ تأخير ${formatArabicNumber(penalty.delayDays)} أيام (إجازة ${penalty.leave.leaveNumber}): خصم ${formatArabicNumber(deductionDays)} يوم = ${formatCurrency(deductionAmount)}\n`
      }

      totalDeductions += totalDelayDeduction
      reportText += `\n⚠️ **إجمالي خصومات التأخير:** ${formatCurrency(totalDelayDeduction)}\n\n`
    }

    // التحقق من وجود عقوبات قيد المراجعة (لم تعتمد بعد)
    const pendingPenalties = await Database.prisma.hR_AppliedPenalty.findMany({
      where: {
        employeeId: employee.id,
        status: 'PENDING',
        isCancelled: false,
        penaltyType: 'DEDUCTION',
        createdAt: {
          gte: startOfMonth,
          lte: endOfPeriod,
        },
      },
      include: {
        leave: {
          select: {
            leaveNumber: true,
          },
        },
      },
    })

    if (pendingPenalties.length > 0) {
      reportText += `ℹ️ **ملاحظة: عقوبات قيد المراجعة (لم تُطبق بعد):**\n`
      for (const penalty of pendingPenalties) {
        reportText += `├ تأخير ${formatArabicNumber(penalty.delayDays)} أيام (إجازة ${penalty.leave.leaveNumber}): بانتظار موافقة الإدارة\n`
      }
      reportText += `└ يمكن اعتماد العقوبات من قائمة "إدارة عقوبات التأخير"\n\n`
    }

    // الصافي
    const netSalary = actualBasicSalary + totalAllowances + totalBonuses + totalLeaveAllowances - totalDeductions

    // ==================== الملخص النهائي ====================
    reportText += `━━━━━━━━━━━━━━━━━\n`
    reportText += `� **ملخص الراتب:**\n\n`
    
    // الراتب الأساسي المسجل (دائماً)
    reportText += `💰 الراتب الأساسي المسجل: ${formatCurrency(employee.basicSalary)}\n`
    
    // الخصومات من الراتب الأساسي
    let hasDeductionsFromBasic = false
    
    // خصم إجازات بدون مرتب (من الراتب الأساسي)
    if (unpaidLeaveDays > 0) {
      const dailyRate = employee.basicSalary / 30
      const unpaidDeduction = dailyRate * unpaidLeaveDays
      reportText += `➖ خصم إجازة بدون مرتب (${formatArabicNumber(unpaidLeaveDays)} ${unpaidLeaveDays === 1 ? 'يوم' : 'أيام'}): -${formatCurrency(unpaidDeduction)}\n`
      hasDeductionsFromBasic = true
    }
    
    // خصومات التأخير (من الراتب الأساسي)
    if (delayPenalties.length > 0) {
      for (const penalty of delayPenalties) {
        const deductionDays = penalty.deductionDays || 0
        const dailyRate = employee.basicSalary / 30
        const deductionAmount = dailyRate * deductionDays
        reportText += `➖ خصم تأخير ${formatArabicNumber(penalty.delayDays)} ${penalty.delayDays === 1 ? 'يوم' : 'أيام'} (${penalty.leave.leaveNumber}): -${formatCurrency(deductionAmount)}\n`
        hasDeductionsFromBasic = true
      }
    }
    
    // البدلات (إضافات)
    if (totalAllowances > 0)
      reportText += `➕ البدلات: ${formatCurrency(totalAllowances)}\n`
    
    // المكافآت (إضافات)
    if (totalBonuses > 0)
      reportText += `➕ المكافآت: ${formatCurrency(totalBonuses)}\n`
    
    // بدل الإجازات (إضافات)
    if (totalLeaveAllowances > 0)
      reportText += `➕ بدل الإجازات: ${formatCurrency(totalLeaveAllowances)}\n`
    
    reportText += `━━━━━━━━━━━━━━━━━\n`
    reportText += `\n✨ **صافي الراتب المستحق:** ${formatCurrency(netSalary)}\n`

    // تجميع تفاصيل البدلات
    const allowancesArray = []
    for (const pa of positionAllowances) {
      const dailyAllowance = pa.amount / 30
      const actualAllowance = dailyAllowance * workDaysForAllowances
      allowancesArray.push({
        type: 'position',
        name: pa.allowanceType.nameAr,
        amount: actualAllowance,
      })
    }
    for (const ea of employeeAllowances) {
      const dailyAllowance = ea.amount / 30
      const actualAllowance = dailyAllowance * workDaysForAllowances
      allowancesArray.push({
        type: 'employee',
        name: ea.allowanceType.nameAr,
        amount: actualAllowance,
      })
    }
    if (totalMaterialAllowance > 0) {
      allowancesArray.push({
        type: 'material',
        name: 'بدل المسحوبات العينية',
        amount: totalMaterialAllowance,
      })
    }
    // إضافة بدل الإجازات
    for (const leave of leaveAllowances) {
      allowancesArray.push({
        type: 'leave',
        name: `بدل إجازة ${leave.leaveNumber}`,
        amount: leave.allowanceAmount || 0,
      })
    }

    // تجميع تفاصيل المكافآت
    const bonusesArray = []
    for (const bonus of bonuses) {
      const dailyBonus = bonus.amount / 30
      const actualBonus = dailyBonus * workDaysForAllowances
      bonusesArray.push({
        name: bonus.bonusName,
        type: bonus.bonusType,
        amount: actualBonus,
      })
    }

    // تجميع تفاصيل المعاملات
    const transactionsArray = []
    let totalAdvances = 0
    let totalWithdrawals = 0
    for (const trans of transactions) {
      const amount = trans.amount || 0
      if (trans.transactionType === 'CASH_ADVANCE') {
        totalAdvances += amount
      }
      else if (trans.transactionType === 'ITEM_WITHDRAWAL') {
        totalWithdrawals += amount
      }
      transactionsArray.push({
        type: trans.transactionType,
        amount,
        date: trans.createdAt,
        description: trans.description || trans.notes || '',
        itemName: trans.item?.nameAr,
      })
    }

    // حفظ بيانات الراتب للاستخدام عند الحفظ
    const cacheKey = `${employeeId}:${month}:${year}`
    payrollDataCache.set(cacheKey, {
      employeeId,
      employeeCode: employee.employeeCode,
      employeeName: employee.nickname || employee.fullName,
      positionTitle: employee.position?.titleAr || null,
      month,
      year,
      settlementType: settlementTypeLabel,
      periodStartDate: startOfMonth,
      periodEndDate: endOfPeriod,
      periodDays,
      actualWorkDays,
      leaveDays,
      proratedSalary: actualBasicSalary,
      totalAllowances,
      totalBonuses,
      materialAllowanceAmount: totalMaterialAllowance,
      totalLeaveAllowances, // بدل الإجازات
      leaveAllowanceIds: leaveAllowances.map(l => l.id), // IDs للتحديث بعد الحفظ
      totalEarnings: actualBasicSalary + totalAllowances + totalBonuses + totalLeaveAllowances,
      totalAdvances,
      totalWithdrawals,
      totalDeductions,
      netSalary,
      allowancesArray,
      bonusesArray,
      transactionsArray,
    })

    const keyboard = new InlineKeyboard()
      .text('✅ حفظ وتأكيد', `payroll:save:${employeeId}:${month}:${year}`)
      .row()
      .text('🔄 حساب موظف آخر', 'payroll:create')
      .row()
      .text('⬅️ رجوع', 'menu:sub:hr-management:payroll')

    await ctx.editMessageText(reportText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error calculating payroll:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ أثناء حساب الراتب\n\n'
      + 'الرجاء المحاولة مرة أخرى.',
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
      },
    )
  }
}

// ==================== Save Payroll ====================

payrollCalculateHandler.callbackQuery(/^payroll:save:(\d+):(\d+):(\d+)$/, async (ctx) => {
  const employeeId = Number.parseInt(ctx.match![1])
  const month = Number.parseInt(ctx.match![2])
  const year = Number.parseInt(ctx.match![3])

  const cacheKey = `${employeeId}:${month}:${year}`
  const payrollData = payrollDataCache.get(cacheKey)

  if (!payrollData) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة، الرجاء إعادة الحساب')
    return
  }

  // إذا كان الراتب سالب، عرض رسالة تأكيد
  if (payrollData.netSalary < 0) {
    await ctx.answerCallbackQuery()

    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { fullName: true },
    })

    const debtAmount = Math.abs(payrollData.netSalary)

    await ctx.editMessageText(
      `⚠️ **تنبيه: صافي الراتب بالسالب**\n\n`
      + `👤 **العامل:** ${employee?.fullName || 'غير معروف'}\n`
      + `📅 **الشهر:** ${monthNames[month - 1]} ${formatArabicNumber(year)}\n`
      + `💰 **المبلغ المستحق:** ${formatCurrency(payrollData.netSalary)}\n\n`
      + `📌 **العامل مدين للشركة بمبلغ ${formatCurrency(debtAmount)}**\n\n`
      + `كيف تريد المتابعة؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('💾 حفظ وتسجيل الدين', `payroll:confirm-debt:${employeeId}:${month}:${year}`)
          .row()
          .text('❌ إلغاء', 'payroll:create'),
      },
    )
  }
  else {
    // راتب إيجابي - حفظ مباشرة
    await savePayrollNormal(ctx, payrollData)
  }
})

// ==================== Confirm and Save Debt ====================

payrollCalculateHandler.callbackQuery(/^payroll:confirm-debt:(\d+):(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])
  const month = Number.parseInt(ctx.match![2])
  const year = Number.parseInt(ctx.match![3])

  const cacheKey = `${employeeId}:${month}:${year}`
  const payrollData = payrollDataCache.get(cacheKey)

  if (!payrollData) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  try {
    // حفظ الراتب وتسجيل الدين
    await savePayrollWithDebt(ctx, payrollData)

    // تنظيف الـ cache
    payrollDataCache.delete(cacheKey)

    await ctx.editMessageText(
      '✅ **تم حفظ كشف الراتب بنجاح**\n\n'
      + `� **تم تسجيل دين على العامل بمبلغ ${formatCurrency(Math.abs(payrollData.netSalary))}**\n\n`
      + `💡 سيتم خصم هذا المبلغ تلقائيًا من راتب الشهر القادم`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🔄 حساب موظف آخر', 'payroll:create')
          .row()
          .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
      },
    )
  }
  catch (error) {
    console.error('Error saving payroll with debt:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ أثناء حفظ الراتب\n\n'
      + 'الرجاء المحاولة مرة أخرى.',
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:create'),
      },
    )
  }
})

// ==================== Helper: Save Normal Payroll ====================

async function savePayrollNormal(ctx: Context, payrollData: PayrollData) {
  await ctx.answerCallbackQuery('⏳ جاري الحفظ...')

  // 1️⃣ حفظ سجل الراتب في HR_PayrollRecord
  const payrollRecord = await Database.prisma.hR_PayrollRecord.create({
    data: {
      employeeId: payrollData.employeeId,
      employeeCode: payrollData.employeeCode,
      employeeName: payrollData.employeeName,
      positionTitle: payrollData.positionTitle,

      month: payrollData.month,
      year: payrollData.year,
      periodStartDate: payrollData.periodStartDate,
      periodEndDate: payrollData.periodEndDate,
      settlementType: payrollData.settlementType,

      totalDays: payrollData.periodDays,
      workDays: payrollData.actualWorkDays,
      leaveDays: payrollData.leaveDays,

      basicSalary: payrollData.proratedSalary,
      totalAllowances: payrollData.totalAllowances,
      totalBonuses: payrollData.totalBonuses,
      materialAllowance: payrollData.materialAllowanceAmount,
      grossSalary: payrollData.totalEarnings,

      cashAdvances: payrollData.totalAdvances,
      itemWithdrawals: payrollData.totalWithdrawals,
      absenceDeductions: 0, // TODO: إضافة خصم الغياب في المستقبل
      otherDeductions: 0,
      totalDeductions: payrollData.totalDeductions,

      netSalary: payrollData.netSalary,

      allowancesDetails: payrollData.allowancesArray || [],
      bonusesDetails: payrollData.bonusesArray || [],
      deductionsDetails: payrollData.transactionsArray || [],

      createdBy: ctx.from?.id ? BigInt(ctx.from.id) : null,
    },
  })

  // 2️⃣ تسوية جميع المعاملات (السلف والمسحوبات والديون) المستخدمة في الحساب
  // تجاهل المُسوّاة يدوياً (تم دفعها خارج النظام)
  await Database.prisma.hR_Transaction.updateMany({
    where: {
      employeeId: payrollData.employeeId,
      isSettled: false,
      isManuallySettled: false, // ← تجاهل المُسوّاة يدوياً
      OR: [
        { transactionType: 'CASH_ADVANCE', status: 'APPROVED' },
        { transactionType: 'ITEM_WITHDRAWAL', status: 'APPROVED' },
        { transactionType: 'EMPLOYEE_DEBT', status: 'PENDING' },
      ],
    },
    data: {
      isSettled: true,
      settledAt: new Date(),
    },
  })

  // 2.5️⃣ تحديث حالة عقوبات التأخير كمطبقة على الراتب
  await Database.prisma.hR_AppliedPenalty.updateMany({
    where: {
      employeeId: payrollData.employeeId,
      status: 'APPROVED',
      isAppliedToPayroll: false,
      isCancelled: false,
      penaltyType: 'DEDUCTION',
      createdAt: {
        gte: payrollData.periodStartDate,
        lte: payrollData.periodEndDate,
      },
    },
    data: {
      isAppliedToPayroll: true,
      payrollRecordId: payrollRecord.id,
      appliedToPayrollAt: new Date(),
      status: 'APPLIED',
    },
  })

  // 2.6️⃣ تحديث حالة بدل الإجازات كمُسَوّاة (تم الدفع)
  if (payrollData.leaveAllowanceIds.length > 0) {
    await Database.prisma.hR_EmployeeLeave.updateMany({
      where: {
        id: { in: payrollData.leaveAllowanceIds },
      },
      data: {
        allowanceSettled: true,
      },
    })
  }

  // 3️⃣ إنشاء سجل تدقيق
  await createAuditLog({
    payrollRecordId: payrollRecord.id,
    action: 'CREATED' as any,
    actionBy: BigInt(ctx.from!.id),
    newData: {
      netSalary: payrollData.netSalary,
      paymentStatus: 'UNPAID',
    },
    notes: 'تم إنشاء كشف راتب جديد',
  })

  // 4️⃣ عرض رسالة النجاح مع خيار تسجيل السداد
  let successMessage = '✅ **تم حفظ كشف الراتب بنجاح**\n\n'
    + `👤 الموظف: ${payrollData.employeeName}\n`
    + `📅 الشهر: ${monthNames[payrollData.month - 1]} ${formatArabicNumber(payrollData.year)}\n`
    + `💰 الصافي: ${formatCurrency(payrollData.netSalary)}\n\n`
    + '✅ تم حفظ السجل المالي\n'
    + '✅ تم تسوية جميع المعاملات\n'

  if (payrollData.leaveAllowanceIds.length > 0) {
    successMessage += `✅ تم تسوية ${formatArabicNumber(payrollData.leaveAllowanceIds.length)} بدل إجازة\n`
  }

  successMessage += '\n💳 **هل تم سداد المستحقات للموظف؟**'

  await ctx.editMessageText(
    successMessage,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('✅ نعم، تم السداد', `payroll:payment:confirm:${payrollRecord.id}:${payrollData.netSalary}`)
        .row()
        .text('📝 سداد جزئي', `payroll:payment:partial:${payrollRecord.id}`)
        .row()
        .text('⏳ لم يتم السداد بعد', `payroll:payment:skip:${payrollRecord.id}`)
        .row()
        .text('🔄 حساب موظف آخر', 'payroll:create')
        .row()
        .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
    },
  )
}

// ==================== Helper: Save Payroll With Debt ====================

async function savePayrollWithDebt(ctx: Context, payrollData: PayrollData) {
  const debtAmount = Math.abs(payrollData.netSalary)

  // 0️⃣ التحقق من عدم وجود دين غير مُسوى لنفس الموظف في نفس الشهر (منع التكرار)
  const startOfMonth = new Date(payrollData.year, payrollData.month - 1, 1)
  const endOfMonth = new Date(payrollData.year, payrollData.month, 0, 23, 59, 59)

  const existingDebt = await Database.prisma.hR_Transaction.findFirst({
    where: {
      employeeId: payrollData.employeeId,
      transactionType: 'EMPLOYEE_DEBT',
      isSettled: false,
      status: 'PENDING',
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })

  if (existingDebt) {
    await ctx.editMessageText(
      '⚠️ **تحذير: دين موجود مسبقاً**\n\n'
      + `هناك دين غير مُسوى بالفعل لهذا الموظف في نفس الشهر:\n`
      + `├ المبلغ: ${existingDebt.amount.toFixed(2)} جنيه\n`
      + `├ التاريخ: ${existingDebt.createdAt.toLocaleDateString('ar-EG')}\n`
      + `└ الوصف: ${existingDebt.notes || '-'}\n\n`
      + `⚠️ لا يمكن إنشاء دين جديد. يُرجى تسوية الدين القديم أولاً أو حذفه.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
      },
    )
    return
  }

  // 1️⃣ حفظ سجل الراتب في HR_PayrollRecord
  await Database.prisma.hR_PayrollRecord.create({
    data: {
      employeeId: payrollData.employeeId,
      employeeCode: payrollData.employeeCode,
      employeeName: payrollData.employeeName,
      positionTitle: payrollData.positionTitle,

      month: payrollData.month,
      year: payrollData.year,
      periodStartDate: payrollData.periodStartDate,
      periodEndDate: payrollData.periodEndDate,
      settlementType: payrollData.settlementType,

      totalDays: payrollData.periodDays,
      workDays: payrollData.actualWorkDays,
      leaveDays: payrollData.leaveDays,

      basicSalary: payrollData.proratedSalary,
      totalAllowances: payrollData.totalAllowances,
      totalBonuses: payrollData.totalBonuses,
      materialAllowance: payrollData.materialAllowanceAmount,
      grossSalary: payrollData.totalEarnings,

      cashAdvances: payrollData.totalAdvances,
      itemWithdrawals: payrollData.totalWithdrawals,
      absenceDeductions: 0,
      otherDeductions: 0,
      totalDeductions: payrollData.totalDeductions,

      netSalary: payrollData.netSalary,

      allowancesDetails: payrollData.allowancesArray || [],
      bonusesDetails: payrollData.bonusesArray || [],
      deductionsDetails: payrollData.transactionsArray || [],

      createdBy: ctx.from?.id ? BigInt(ctx.from.id) : null,
    },
  })

  // 2️⃣ إنشاء سجل دين في HR_Transaction
  const transactionNumber = `DEBT-${payrollData.employeeId}-${Date.now()}`

  await Database.prisma.hR_Transaction.create({
    data: {
      transactionNumber,
      employeeId: payrollData.employeeId,
      transactionType: 'EMPLOYEE_DEBT',
      amount: debtAmount,
      notes: `دين من راتب ${monthNames[payrollData.month - 1]} ${payrollData.year}`,
      status: 'PENDING',
      isSettled: false,
      createdBy: BigInt(ctx.from!.id),
    },
  })

  // 3️⃣ تسوية جميع المعاملات (السلف والمسحوبات والديون) المستخدمة في الحساب
  await Database.prisma.hR_Transaction.updateMany({
    where: {
      employeeId: payrollData.employeeId,
      isSettled: false,
      OR: [
        { transactionType: 'CASH_ADVANCE', status: 'APPROVED' },
        { transactionType: 'ITEM_WITHDRAWAL', status: 'APPROVED' },
        { transactionType: 'EMPLOYEE_DEBT', status: 'PENDING' },
      ],
    },
    data: {
      isSettled: true,
      settledAt: new Date(),
    },
  })

  // 4️⃣ تحديث حالة بدل الإجازات كمُسَوّاة (تم الدفع)
  if (payrollData.leaveAllowanceIds.length > 0) {
    await Database.prisma.hR_EmployeeLeave.updateMany({
      where: {
        id: { in: payrollData.leaveAllowanceIds },
      },
      data: {
        allowanceSettled: true,
      },
    })
  }
}

// ==================== Payment Confirmation Handlers ====================

// تأكيد السداد الكامل
payrollCalculateHandler.callbackQuery(/^payroll:payment:confirm:(\d+):(-?\d+(?:\.\d+)?)$/, async (ctx) => {
  const payrollRecordId = Number.parseInt(ctx.match![1])
  const amount = Number.parseFloat(ctx.match![2])

  await ctx.answerCallbackQuery('✅ تم تسجيل السداد')

  await Database.prisma.hR_PayrollRecord.update({
    where: { id: payrollRecordId },
    data: {
      paymentStatus: 'PAID',
      amountPaid: amount,
      paymentDate: new Date(),
      updatedBy: BigInt(ctx.from!.id),
    },
  })

  await createAuditLog({
    payrollRecordId,
    action: 'PAYMENT_CONFIRMED' as any,
    actionBy: BigInt(ctx.from!.id),
    newData: {
      paymentStatus: 'PAID',
      amountPaid: amount,
      paymentDate: new Date(),
    },
    notes: 'تم تأكيد السداد الكامل',
  })

  await ctx.editMessageText(
    '✅ **تم تسجيل السداد بنجاح**\n\n'
    + `💰 المبلغ المدفوع: ${formatCurrency(amount)}\n`
    + `📅 تاريخ السداد: ${formatArabicDate(new Date())}\n`
    + `✅ الحالة: مدفوع بالكامل`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔄 حساب موظف آخر', 'payroll:create')
        .row()
        .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
    },
  )
})

// تخطي السداد (غير مدفوع)
payrollCalculateHandler.callbackQuery(/^payroll:payment:skip:(\d+)$/, async (ctx) => {
  const _payrollRecordId = Number.parseInt(ctx.match![1])

  await ctx.answerCallbackQuery('⏳ تم تسجيل: غير مدفوع')

  await ctx.editMessageText(
    '✅ **تم حفظ الراتب**\n\n'
    + `📊 الحالة: ⏳ غير مدفوع\n\n`
    + 'يمكنك تحديث حالة السداد لاحقاً من التقارير المالية.',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔄 حساب موظف آخر', 'payroll:create')
        .row()
        .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
    },
  )
})

// سداد جزئي - طلب المبلغ
payrollCalculateHandler.callbackQuery(/^payroll:payment:partial:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  // TODO: إضافة conversation لطلب المبلغ المدفوع
  // مؤقتاً: نعرض رسالة
  await ctx.editMessageText(
    '📝 **سداد جزئي**\n\n'
    + 'يرجى إرسال المبلغ المدفوع فعلياً:\n\n'
    + '⚠️ ملاحظة: هذه الميزة قيد التطوير حالياً.\n'
    + 'يمكنك تحديث المبلغ لاحقاً من التقارير المالية.',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'payroll:create'),
    },
  )
})

// ==================== Delete Payroll Record ====================

// تأكيد حذف سجل الراتب
payrollCalculateHandler.callbackQuery(/^payroll:delete:(\d+)$/, async (ctx) => {
  const payrollRecordId = Number.parseInt(ctx.match![1])

  await ctx.answerCallbackQuery()

  const record = await Database.prisma.hR_PayrollRecord.findUnique({
    where: { id: payrollRecordId },
  })

  if (!record) {
    await ctx.editMessageText('❌ السجل غير موجود')
    return
  }

  await ctx.editMessageText(
    '⚠️ **تأكيد حذف السجل**\n\n'
    + `👤 الموظف: ${record.employeeName}\n`
    + `📅 الشهر: ${monthNames[record.month - 1]} ${formatArabicNumber(record.year)}\n`
    + `💰 الصافي: ${formatCurrency(record.netSalary)}\n\n`
    + '⚠️ **تحذير:** سيتم حذف السجل نهائياً ولن يمكن استرجاعه.\n'
    + 'هل أنت متأكد؟',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('✅ نعم، احذف السجل', `payroll:delete:confirm:${payrollRecordId}`)
        .row()
        .text('❌ إلغاء', 'payroll:create'),
    },
  )
})

// تنفيذ الحذف
payrollCalculateHandler.callbackQuery(/^payroll:delete:confirm:(\d+)$/, async (ctx) => {
  const payrollRecordId = Number.parseInt(ctx.match![1])

  await ctx.answerCallbackQuery('⏳ جاري الحذف...')

  const record = await Database.prisma.hR_PayrollRecord.findUnique({
    where: { id: payrollRecordId },
  })

  if (!record) {
    await ctx.editMessageText('❌ السجل غير موجود')
    return
  }

  // حذف منطقي (Soft Delete)
  await Database.prisma.hR_PayrollRecord.update({
    where: { id: payrollRecordId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: BigInt(ctx.from!.id),
      deleteReason: 'تم الحذف من قبل المستخدم',
    },
  })

  // سجل التدقيق
  await createAuditLog({
    payrollRecordId,
    action: 'DELETED' as any,
    actionBy: BigInt(ctx.from!.id),
    oldData: {
      netSalary: record.netSalary,
      paymentStatus: record.paymentStatus,
    },
    notes: 'تم حذف سجل الراتب',
  })

  await ctx.editMessageText(
    '✅ **تم حذف السجل بنجاح**\n\n'
    + `👤 الموظف: ${record.employeeName}\n`
    + `📅 الشهر: ${monthNames[record.month - 1]} ${formatArabicNumber(record.year)}\n\n`
    + 'يمكنك الآن حساب راتب جديد لهذا الموظف.',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🔄 حساب راتب جديد', 'payroll:create')
        .row()
        .text('⬅️ رجوع', 'menu:sub:hr-management:payroll'),
    },
  )
})
