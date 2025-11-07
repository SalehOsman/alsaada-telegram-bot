import type { Context } from 'grammy'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Composer, InlineKeyboard, InputFile } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

const payrollFinancialHistoryHandler = new Composer<Context>()

// ==================== Helper Functions (Arabic Formatting) ====================

function formatArabicNumber(num: number | string): string {
  const numStr = typeof num === 'number' ? num.toString() : num
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return numStr.replace(/\d/g, d => arabicNumerals[Number.parseInt(d)])
}

function formatArabicDate(date: Date): string {
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${formatArabicNumber(day)}/${formatArabicNumber(month)}/${formatArabicNumber(year)}`
}

// ==================== Types ====================

interface FilterPeriod {
  label: string
  value: string
  months?: number // عدد الشهور للرجوع للخلف
  startDate?: Date
  endDate?: Date
}

const FILTER_PERIODS: FilterPeriod[] = [
  { label: '📅 كل المدة', value: 'all' },
  { label: '📊 الشهر الحالي', value: 'current_month', months: 0 },
  { label: ' الشهر السابق', value: 'previous_month', months: 1 },
  { label: '�📈 آخر 3 شهور', value: 'last_3_months', months: 3 },
  { label: '📉 آخر 6 شهور', value: 'last_6_months', months: 6 },
  { label: '🗓️ آخر سنة', value: 'last_year', months: 12 },
  { label: '🎯 شهر معين', value: 'specific_month' },
]

// Session storage for filter states
const financialHistoryStates = new Map<number, {
  employeeId?: number
  filterPeriod?: string
  selectedYear?: number
  selectedMonth?: number
}>()

// Cache for last report data (for Excel export)
const lastReportCache = new Map<number, {
  employeeName: string
  employeeCode: string
  positionTitle: string
  employmentStatus: string
  periodLabel: string
  payrollRecords: any[]
  totals: any
  filterValue: string
}>()

// ==================== Main Menu ====================

payrollFinancialHistoryHandler.callbackQuery('payroll:reports', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📊 السجل المالي لموظف', 'payroll:financial:select_employee')
    .row()
    .text(' تقرير العاملين الحاليين', 'payroll:financial:active_employees')
    .row()
    .text(' تقرير العمال السابقين', 'payroll:financial:former_employees')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:payroll')

  await ctx.editMessageText(
    '📊 **التقارير المالية**\n\n'
    + '📌 **الخيارات المتاحة:**\n\n'
    + '📊 **السجل المالي لموظف**\n'
    + '└ عرض السجل المالي الكامل لموظف محدد\n'
    + '└ الرواتب، البدلات، المكافآت، السلف، الديون\n'
    + '└ فلترة حسب الفترة الزمنية\n'
    + '└ تصدير Excel\n\n'
    + '👥 **تقرير العاملين الحاليين**\n'
    + '└ ملخص مالي جماعي للعاملين النشطين\n'
    + '└ مقارنة الرواتب والتكاليف\n'
    + '└ إحصائيات شاملة\n\n'
    + '📋 **تقرير العمال السابقين**\n'
    + '└ عرض جميع العمال السابقين\n'
    + '└ حالة المستحقات والتسويات\n'
    + '└ ملخص إجمالي',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== Employee Selection ====================

payrollFinancialHistoryHandler.callbackQuery('payroll:financial:select_employee', async (ctx) => {
  await ctx.answerCallbackQuery()

  // Get all employees (active and former, except SETTLED)
  const employees = await Database.prisma.employee.findMany({
    where: {
      NOT: {
        employmentStatus: 'SETTLED',
      },
    },
    orderBy: [
      { employmentStatus: 'asc' },
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
      + 'لا يوجد موظفون في النظام.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:reports'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  const activeEmployees = employees.filter(e => e.employmentStatus === 'ACTIVE')
  const formerEmployees = employees.filter(e => e.employmentStatus !== 'ACTIVE')

  // Active employees first
  for (const emp of activeEmployees) {
    const displayText = `${emp.nickname} (${emp.position?.titleAr || 'غير محدد'})`
    keyboard.text(displayText, `payroll:financial:emp:${emp.id}`).row()
  }

  // Former employees
  for (const emp of formerEmployees) {
    const displayText = `${emp.nickname} (${emp.position?.titleAr || 'غير محدد'}) 🔴`
    keyboard.text(displayText, `payroll:financial:emp:${emp.id}`).row()
  }

  keyboard.text('⬅️ رجوع', 'payroll:reports')

  await ctx.editMessageText(
    '👤 **اختر الموظف**\n\n'
    + 'اختر الموظف لعرض سجله المالي:\n\n'
    + '🔴 = عامل سابق',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== Show Specific Record ====================

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:show:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])

  // Redirect to employee's financial records
  await showFilterOptions(ctx, employeeId)
})

// ==================== Filter Period Selection ====================

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:emp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const employeeId = Number.parseInt(ctx.match![1])

  // Store employee ID in state
  financialHistoryStates.set(userId, { employeeId })

  // Show filter options
  await showFilterOptions(ctx, employeeId)
})

async function showFilterOptions(ctx: Context, employeeId: number) {
  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      nickname: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
  })

  if (!employee) {
    await ctx.editMessageText('❌ الموظف غير موجود')
    return
  }

  const keyboard = new InlineKeyboard()

  for (const period of FILTER_PERIODS) {
    keyboard.text(period.label, `payroll:financial:filter:${employeeId}:${period.value}`).row()
  }

  keyboard.text('⬅️ رجوع', 'payroll:financial:select_employee')

  await ctx.editMessageText(
    `📊 **فلترة السجل المالي**\n\n`
    + `👤 **الموظف:** ${employee.nickname} (${employee.position?.titleAr || 'غير محدد'})\n\n`
    + `📅 **اختر الفترة الزمنية:**`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Handle Filter Selection ====================

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:filter:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])
  const filterValue = ctx.match![2]
  const userId = ctx.from!.id

  // Update state
  const state = financialHistoryStates.get(userId) || {}
  state.employeeId = employeeId
  state.filterPeriod = filterValue
  financialHistoryStates.set(userId, state)

  if (filterValue === 'specific_month') {
    // Show year selection
    await showYearSelection(ctx, employeeId)
  }
  else {
    // Show report directly
    await showFinancialReport(ctx, employeeId, filterValue)
  }
})

// ==================== Year Selection ====================

async function showYearSelection(ctx: Context, employeeId: number) {
  const currentYear = new Date().getFullYear()
  const years = []

  // Get employee hire date
  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: { hireDate: true },
  })

  const startYear = employee?.hireDate ? employee.hireDate.getFullYear() : currentYear - 5

  // Generate years from hire date to current
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year)
  }

  const keyboard = new InlineKeyboard()

  for (const year of years) {
    keyboard.text(
      formatArabicNumber(year.toString()),
      `payroll:financial:year:${employeeId}:${year}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', `payroll:financial:emp:${employeeId}`)

  await ctx.editMessageText(
    '📅 **اختر السنة**',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Month Selection ====================

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:year:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])
  const year = Number.parseInt(ctx.match![2])
  const userId = ctx.from!.id

  // Update state
  const state = financialHistoryStates.get(userId) || {}
  state.selectedYear = year
  financialHistoryStates.set(userId, state)

  await showMonthSelection(ctx, employeeId, year)
})

async function showMonthSelection(ctx: Context, employeeId: number, year: number) {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'إبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ]

  const keyboard = new InlineKeyboard()

  for (let i = 0; i < 12; i++) {
    keyboard.text(
      `${formatArabicNumber((i + 1).toString())} - ${months[i]}`,
      `payroll:financial:month:${employeeId}:${year}:${i + 1}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', `payroll:financial:emp:${employeeId}`)

  await ctx.editMessageText(
    `📅 **اختر الشهر**\n\n`
    + `السنة: ${formatArabicNumber(year.toString())}`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:month:(\d+):(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])
  const year = Number.parseInt(ctx.match![2])
  const month = Number.parseInt(ctx.match![3])
  const userId = ctx.from!.id

  // Update state
  const state = financialHistoryStates.get(userId) || {}
  state.selectedMonth = month
  financialHistoryStates.set(userId, state)

  // Show report for specific month
  await showFinancialReport(ctx, employeeId, 'specific_month', year, month)
})

// ==================== Financial Report ====================

async function showFinancialReport(
  ctx: Context,
  employeeId: number,
  filterValue: string,
  year?: number,
  month?: number,
) {
  await ctx.editMessageText('⏳ جاري تحضير التقرير...')

  // Calculate date range based on filter
  const { startDate, endDate, periodLabel } = calculateDateRange(filterValue, year, month)

  // Get employee details
  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      nickname: true,
      fullName: true,
      employeeCode: true,
      employmentStatus: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
  })

  if (!employee) {
    await ctx.editMessageText('❌ الموظف غير موجود')
    return
  }

  // ==================== Get Payroll Records ====================

  const payrollRecords = await Database.prisma.hR_PayrollRecord.findMany({
    where: {
      employeeId,
      ...(startDate && endDate
        ? {
            periodStartDate: { gte: startDate },
            periodEndDate: { lte: endDate },
          }
        : {}),
    },
    orderBy: { periodStartDate: 'desc' },
  })

  // Calculate totals
  const totals = {
    totalGrossSalary: payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0),
    totalNetSalary: payrollRecords.reduce((sum, r) => sum + r.netSalary, 0),
    totalDeductions: payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0),
    totalBasicSalary: payrollRecords.reduce((sum, r) => sum + r.basicSalary, 0),
    totalAllowances: payrollRecords.reduce((sum, r) => sum + r.totalAllowances, 0),
    totalBonuses: payrollRecords.reduce((sum, r) => sum + r.totalBonuses, 0),
    recordsCount: payrollRecords.length,
  }

  // Build report message
  let reportMessage = `📊 **السجل المالي الشهري**\n\n`
  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
  reportMessage += `👤 **بيانات الموظف:**\n`
  reportMessage += `├ الاسم: ${employee.nickname}\n`
  reportMessage += `├ الوظيفة: ${employee.position?.titleAr || 'غير محدد'}\n`
  reportMessage += `├ الكود: ${employee.employeeCode}\n`
  reportMessage += `└ الحالة: ${translateEmploymentStatus(employee.employmentStatus)}\n\n`

  reportMessage += `📅 **الفترة:** ${periodLabel}\n\n`
  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`

  // Summary
  if (payrollRecords.length > 0) {
    reportMessage += `� **إجمالي الفترة:**\n\n`
    reportMessage += `├ عدد السجلات: ${formatArabicNumber(totals.recordsCount.toString())}\n`
    reportMessage += `├ إجمالي الراتب الأساسي: ${formatArabicNumber(totals.totalBasicSalary.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي البدلات: ${formatArabicNumber(totals.totalAllowances.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي المكافآت: ${formatArabicNumber(totals.totalBonuses.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي المستحقات: ${formatArabicNumber(totals.totalGrossSalary.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي الخصومات: ${formatArabicNumber(totals.totalDeductions.toFixed(2))} جنيه\n`
    reportMessage += `└ الصافي المدفوع: ${formatArabicNumber(totals.totalNetSalary.toFixed(2))} جنيه\n\n`

    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
    reportMessage += `📋 **تفصيل شهري:**\n\n`

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

    // عرض أحدث 6 سجلات كحد أقصى
    const recordsToShow = payrollRecords.slice(0, 6)

    for (const record of recordsToShow) {
      const monthName = monthNames[record.month - 1]
      reportMessage += `📅 **${monthName} ${formatArabicNumber(record.year.toString())}**\n`
      reportMessage += `├ راتب أساسي: ${formatArabicNumber(record.basicSalary.toFixed(2))} ج\n`

      if (record.totalAllowances > 0) {
        reportMessage += `├ بدلات: ${formatArabicNumber(record.totalAllowances.toFixed(2))} ج\n`
      }
      if (record.totalBonuses > 0) {
        reportMessage += `├ مكافآت: ${formatArabicNumber(record.totalBonuses.toFixed(2))} ج\n`
      }
      if (record.materialAllowance > 0) {
        reportMessage += `├ بدل مستلزمات: ${formatArabicNumber(record.materialAllowance.toFixed(2))} ج\n`
      }

      reportMessage += `├ إجمالي المستحقات: ${formatArabicNumber(record.grossSalary.toFixed(2))} ج\n`

      if (record.cashAdvances > 0) {
        reportMessage += `├ سلف: -${formatArabicNumber(record.cashAdvances.toFixed(2))} ج\n`
      }
      if (record.itemWithdrawals > 0) {
        reportMessage += `├ مسحوبات: -${formatArabicNumber(record.itemWithdrawals.toFixed(2))} ج\n`
      }
      if (record.totalDeductions > 0) {
        reportMessage += `├ إجمالي الخصومات: -${formatArabicNumber(record.totalDeductions.toFixed(2))} ج\n`
      }

      reportMessage += `└ **الصافي: ${formatArabicNumber(record.netSalary.toFixed(2))} جنيه**\n\n`
    }

    if (payrollRecords.length > 6) {
      reportMessage += `... و ${formatArabicNumber((payrollRecords.length - 6).toString())} سجل شهري آخر\n\n`
    }
  }
  else {
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
    reportMessage += `ℹ️ لا توجد سجلات رواتب في هذه الفترة\n\n`
  }

  // Cache report data for Excel export
  if (payrollRecords.length > 0 && ctx.from) {
    lastReportCache.set(employeeId, {
      employeeName: employee.nickname || employee.fullName,
      employeeCode: employee.employeeCode,
      positionTitle: employee.position?.titleAr || 'غير محدد',
      employmentStatus: translateEmploymentStatus(employee.employmentStatus),
      periodLabel,
      payrollRecords,
      totals,
      filterValue,
    })
  }

  // Keyboard
  const keyboard = new InlineKeyboard()

  if (payrollRecords.length > 0) {
    keyboard.text('📊 تصدير Excel', `payroll:financial:excel:${employeeId}`)
    keyboard.row()
  }

  keyboard
    .text('🔄 تغيير الفترة', `payroll:financial:emp:${employeeId}`)
    .row()
    .text('👥 اختيار موظف آخر', 'payroll:financial:select_employee')
    .row()
    .text('⬅️ رجوع', 'payroll:reports')

  await ctx.editMessageText(reportMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// ==================== Export to Excel Handler ====================

payrollFinancialHistoryHandler.callbackQuery(/^payroll:financial:excel:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('⏳ جاري تحضير ملف Excel...')

  const employeeId = Number.parseInt(ctx.match![1])
  const reportData = lastReportCache.get(employeeId)

  if (!reportData) {
    await ctx.answerCallbackQuery({
      text: '❌ لم يتم العثور على بيانات التقرير. الرجاء إعادة عرض التقرير أولاً.',
      show_alert: true,
    })
    return
  }

  try {
    const filepath = await exportPayrollToExcel(
      reportData.employeeName,
      reportData.employeeCode,
      reportData.positionTitle,
      reportData.employmentStatus,
      reportData.periodLabel,
      reportData.payrollRecords,
      reportData.totals,
    )

    // Send file
    await ctx.replyWithDocument(new InputFile(filepath), {
      caption: `📊 السجل المالي لـ ${reportData.employeeName}\n📅 ${reportData.periodLabel}`,
    })

    // Clean up file
    fs.unlinkSync(filepath)

    await ctx.answerCallbackQuery('✅ تم تصدير التقرير بنجاح')
  }
  catch (error) {
    console.error('Error exporting to Excel:', error)
    await ctx.answerCallbackQuery({
      text: '❌ حدث خطأ أثناء تصدير التقرير',
      show_alert: true,
    })
  }
})

// ==================== Active Employees Report ====================

payrollFinancialHistoryHandler.callbackQuery('payroll:financial:active_employees', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText('⏳ جاري تحضير تقرير العاملين الحاليين...')

  // Get active employees
  const activeEmployees = await Database.prisma.employee.findMany({
    where: {
      employmentStatus: { in: ['ACTIVE', 'ON_LEAVE', 'ON_MISSION'] },
    },
    select: {
      id: true,
      nickname: true,
      employeeCode: true,
      basicSalary: true,
      position: { select: { titleAr: true } },
      department: { select: { name: true } },
    },
  })

  // Get latest payroll records for each employee (last 3 months)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const payrollRecords = await Database.prisma.hR_PayrollRecord.findMany({
    where: {
      employeeId: { in: activeEmployees.map(e => e.id) },
      periodStartDate: { gte: threeMonthsAgo },
    },
    orderBy: { periodStartDate: 'desc' },
  })

  // Calculate statistics
  const stats = {
    totalEmployees: activeEmployees.length,
    totalBasicSalaries: activeEmployees.reduce((sum, e) => sum + e.basicSalary, 0),
    totalPaidLastMonth: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    recordsCount: payrollRecords.length,
    avgSalary: 0,
    maxSalary: 0,
    minSalary: 0,
  }

  if (payrollRecords.length > 0) {
    stats.totalPaidLastMonth = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0)
    stats.totalAllowances = payrollRecords.reduce((sum, r) => sum + r.totalAllowances, 0)
    stats.totalDeductions = payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0)

    const salaries = payrollRecords.map(r => r.netSalary)
    stats.avgSalary = stats.totalPaidLastMonth / payrollRecords.length
    stats.maxSalary = Math.max(...salaries)
    stats.minSalary = Math.min(...salaries)
  }

  // Build report
  let reportMessage = '👥 **تقرير العاملين الحاليين**\n\n'
  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`

  reportMessage += `📊 **الإحصائيات العامة:**\n\n`
  reportMessage += `├ عدد العاملين: ${formatArabicNumber(stats.totalEmployees.toString())}\n`
  reportMessage += `├ إجمالي الرواتب الأساسية: ${formatArabicNumber(stats.totalBasicSalaries.toFixed(2))} جنيه\n`
  reportMessage += `├ عدد سجلات الرواتب (آخر 3 شهور): ${formatArabicNumber(stats.recordsCount.toString())}\n\n`

  if (payrollRecords.length > 0) {
    reportMessage += `💰 **المدفوعات (آخر 3 شهور):**\n\n`
    reportMessage += `├ إجمالي المدفوع: ${formatArabicNumber(stats.totalPaidLastMonth.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي البدلات: ${formatArabicNumber(stats.totalAllowances.toFixed(2))} جنيه\n`
    reportMessage += `├ إجمالي الخصومات: ${formatArabicNumber(stats.totalDeductions.toFixed(2))} جنيه\n\n`

    reportMessage += `📈 **متوسط الرواتب:**\n\n`
    reportMessage += `├ المتوسط: ${formatArabicNumber(stats.avgSalary.toFixed(2))} جنيه\n`
    reportMessage += `├ الأعلى: ${formatArabicNumber(stats.maxSalary.toFixed(2))} جنيه\n`
    reportMessage += `└ الأدنى: ${formatArabicNumber(stats.minSalary.toFixed(2))} جنيه\n\n`
  }
  else {
    reportMessage += `\nℹ️ لا توجد سجلات رواتب في آخر 3 شهور\n\n`
  }

  // Group by department
  const byDepartment = new Map<string, number>()
  activeEmployees.forEach((emp) => {
    const dept = emp.department?.name || 'غير محدد'
    byDepartment.set(dept, (byDepartment.get(dept) || 0) + 1)
  })

  if (byDepartment.size > 0) {
    reportMessage += `🏢 **التوزيع حسب القسم:**\n\n`
    Array.from(byDepartment.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        reportMessage += `├ ${dept}: ${formatArabicNumber(count.toString())} موظف\n`
      })
    reportMessage += `\n`
  }

  const keyboard = new InlineKeyboard()
    .text('📊 عرض تفاصيل موظف', 'payroll:financial:select_employee')
    .row()
    .text('⬅️ رجوع', 'payroll:reports')

  await ctx.editMessageText(reportMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// ==================== Former Employees Report ====================

payrollFinancialHistoryHandler.callbackQuery('payroll:financial:former_employees', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText('⏳ جاري تحضير التقرير...')

  // Get all former employees (not SETTLED)
  const formerEmployees = await Database.prisma.employee.findMany({
    where: {
      employmentStatus: { in: ['RESIGNED', 'TERMINATED', 'RETIRED'] },
    },
    orderBy: [
      { employmentStatus: 'asc' },
      { nickname: 'asc' },
    ],
    select: {
      id: true,
      nickname: true,
      fullName: true,
      employeeCode: true,
      employmentStatus: true,
      resignationDate: true,
      terminationDate: true,
      positionId: true,
    },
  })

  // Get position details for all employees
  const positionIds = [...new Set(formerEmployees.map((e: any) => e.positionId).filter(Boolean))]
  const positions = await Database.prisma.position.findMany({
    where: { id: { in: positionIds as number[] } },
    select: { id: true, titleAr: true },
  })
  const positionMap = new Map(positions.map((p: any) => [p.id, p.titleAr]))

  // Get payroll records for former employees
  const employeeIds = formerEmployees.map((e: any) => e.id)
  const payrollRecords = await Database.prisma.hR_PayrollRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
    },
  })

  // Get pending transactions (unpaid debts, etc.)
  const pendingTransactions = await Database.prisma.hR_Transaction.findMany({
    where: {
      employeeId: { in: employeeIds },
      isSettled: false,
    },
    select: { employeeId: true, amount: true, transactionType: true },
  })

  if (formerEmployees.length === 0) {
    await ctx.editMessageText(
      '📋 **تقرير العمال السابقين**\n\n'
      + 'لا يوجد عمال سابقين في النظام.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:reports'),
      },
    )
    return
  }

  let reportMessage = `📋 **تقرير العمال السابقين**\n\n`
  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
  reportMessage += `📊 **الإحصائيات العامة:**\n\n`
  reportMessage += `├ عدد العمال السابقين: ${formatArabicNumber(formerEmployees.length.toString())}\n`
  reportMessage += `├ مستقيلين: ${formatArabicNumber(formerEmployees.filter(e => e.employmentStatus === 'RESIGNED').length.toString())}\n`
  reportMessage += `├ منتهي خدمة: ${formatArabicNumber(formerEmployees.filter(e => e.employmentStatus === 'TERMINATED').length.toString())}\n`
  reportMessage += `└ متقاعدين: ${formatArabicNumber(formerEmployees.filter(e => e.employmentStatus === 'RETIRED').length.toString())}\n\n`

  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
  reportMessage += `👥 **قائمة العمال:**\n\n`

  // Calculate totals
  const totalPaid = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0)
  const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

  reportMessage += `📊 **الملخص المالي:**\n\n`
  reportMessage += `├ عدد السجلات: ${formatArabicNumber(payrollRecords.length.toString())}\n`
  reportMessage += `├ إجمالي المدفوع: ${formatArabicNumber(totalPaid.toFixed(2))} جنيه\n`
  reportMessage += `└ ديون معلقة: ${formatArabicNumber(totalPending.toFixed(2))} جنيه\n\n`

  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
  reportMessage += `👥 **قائمة العمال:**\n\n`

  for (const emp of formerEmployees.slice(0, 10)) {
    // Get records for this employee
    const empRecords = payrollRecords.filter(r => r.employeeId === emp.id)
    const empPending = pendingTransactions.filter(t => t.employeeId === emp.id)

    const totalEmpPaid = empRecords.reduce((sum, r) => sum + r.netSalary, 0)
    const totalEmpPending = empPending.reduce((sum, t) => sum + t.amount, 0)

    const exitDate = emp.resignationDate || emp.terminationDate
    const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤' : emp.employmentStatus === 'TERMINATED' ? '🚪' : '🎓'
    const positionTitle = emp.positionId ? positionMap.get(emp.positionId) || 'غير محدد' : 'غير محدد'

    reportMessage += `${statusEmoji} **${emp.nickname}** (${positionTitle})\n`
    reportMessage += `├ الكود: ${emp.employeeCode}\n`
    if (exitDate) {
      reportMessage += `├ تاريخ الترك: ${formatArabicDate(exitDate)}\n`
    }
    reportMessage += `├ سجلات رواتب: ${formatArabicNumber(empRecords.length.toString())}\n`
    reportMessage += `├ إجمالي مدفوع: ${formatArabicNumber(totalEmpPaid.toFixed(2))} ج\n`
    if (totalEmpPending > 0) {
      reportMessage += `└ ⚠️ ديون معلقة: ${formatArabicNumber(totalEmpPending.toFixed(2))} ج\n`
    }
    reportMessage += `\n`
  }

  if (formerEmployees.length > 10) {
    reportMessage += `... و ${formatArabicNumber((formerEmployees.length - 10).toString())} موظف آخر\n\n`
  }

  reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`
  reportMessage += `💰 **الإجمالي:**\n`
  reportMessage += `├ مدفوع: ${formatArabicNumber(totalPaid.toFixed(2))} جنيه\n`
  reportMessage += `└ معلق: ${formatArabicNumber(totalPending.toFixed(2))} جنيه\n`

  const keyboard = new InlineKeyboard()
    .text('🔍 عرض تفاصيل موظف', 'payroll:financial:select_employee')
    .row()
    .text('⬅️ رجوع', 'payroll:reports')

  await ctx.editMessageText(reportMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// ==================== Helper Functions ====================

function calculateDateRange(filterValue: string, year?: number, month?: number) {
  const now = new Date()
  let startDate: Date | undefined
  let endDate: Date | undefined
  let periodLabel: string

  switch (filterValue) {
    case 'all':
      startDate = undefined
      endDate = undefined
      periodLabel = 'كل المدة'
      break

    case 'current_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      periodLabel = `الشهر الحالي (${formatArabicDate(startDate)})`
      break

    case 'previous_month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1)
      endDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59)
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      periodLabel = `الشهر السابق (${months[prevMonth.getMonth()]} ${formatArabicNumber(prevMonth.getFullYear().toString())})`
      break
    }

    case 'last_3_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      periodLabel = 'آخر 3 شهور'
      break

    case 'last_6_months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      periodLabel = 'آخر 6 شهور'
      break

    case 'last_year':
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      periodLabel = 'آخر سنة'
      break

    case 'specific_month':
      if (year && month) {
        startDate = new Date(year, month - 1, 1)
        endDate = new Date(year, month, 0, 23, 59, 59)
        const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        periodLabel = `${months[month - 1]} ${formatArabicNumber(year.toString())}`
      }
      else {
        startDate = undefined
        endDate = undefined
        periodLabel = 'غير محدد'
      }
      break

    default:
      startDate = undefined
      endDate = undefined
      periodLabel = 'غير معروف'
  }

  return { startDate, endDate, periodLabel }
}

// ==================== Export to Excel ====================

async function exportPayrollToExcel(
  employeeName: string,
  employeeCode: string,
  positionTitle: string,
  employmentStatus: string,
  periodLabel: string,
  payrollRecords: any[],
  totals: any,
): Promise<string> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

  // ==================== Sheet 1: الملخص المالي ====================
  const summarySheet = workbook.addWorksheet('الملخص المالي')
  summarySheet.views = [{ rightToLeft: true }]

  // Header
  summarySheet.mergeCells('A1:H1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'السجل المالي الشهري للموظف'
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  summarySheet.getRow(1).height = 30

  // Employee Info
  summarySheet.getCell('A3').value = 'الموظف:'
  summarySheet.getCell('B3').value = employeeName
  summarySheet.getCell('A4').value = 'الكود:'
  summarySheet.getCell('B4').value = employeeCode
  summarySheet.getCell('D3').value = 'الوظيفة:'
  summarySheet.getCell('E3').value = positionTitle
  summarySheet.getCell('D4').value = 'الحالة:'
  summarySheet.getCell('E4').value = employmentStatus

  summarySheet.getCell('A5').value = 'الفترة:'
  summarySheet.getCell('B5').value = periodLabel

  // Totals Section
  summarySheet.getCell('A7').value = 'ملخص الفترة'
  summarySheet.getCell('A7').font = { bold: true, size: 14 }
  summarySheet.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  const totalsData = [
    ['عدد السجلات', totals.recordsCount],
    ['إجمالي الراتب الأساسي', totals.totalBasicSalary],
    ['إجمالي البدلات', totals.totalAllowances],
    ['إجمالي المكافآت', totals.totalBonuses],
    ['إجمالي المستحقات', totals.totalGrossSalary],
    ['إجمالي الخصومات', totals.totalDeductions],
    ['الصافي المدفوع', totals.totalNetSalary],
  ]

  let row = 8
  totalsData.forEach(([label, value]) => {
    summarySheet.getCell(`A${row}`).value = label
    summarySheet.getCell(`B${row}`).value = typeof value === 'number' ? value.toFixed(2) : value
    summarySheet.getCell(`B${row}`).numFmt = '#,##0.00'
    row++
  })

  // Monthly Details Header
  summarySheet.getCell(`A${row + 1}`).value = 'التفصيل الشهري'
  summarySheet.getCell(`A${row + 1}`).font = { bold: true, size: 14 }
  summarySheet.getCell(`A${row + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  row += 2

  // Table Headers
  const headers = ['الشهر', 'تاريخ البدء', 'تاريخ الانتهاء', 'أيام العمل', 'راتب أساسي', 'بدلات', 'مكافآت', 'بدل مستلزمات', 'المستحقات', 'خصومات', 'الصافي']
  headers.forEach((header, idx) => {
    const cell = summarySheet.getCell(row, idx + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  row++

  // Data Rows
  payrollRecords.forEach((record) => {
    const monthName = `${monthNames[record.month - 1]} ${record.year}`
    const startDate = new Date(record.periodStartDate)
    const endDate = new Date(record.periodEndDate)

    summarySheet.getCell(row, 1).value = monthName
    summarySheet.getCell(row, 2).value = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`
    summarySheet.getCell(row, 3).value = `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`
    summarySheet.getCell(row, 4).value = record.workDays
    summarySheet.getCell(row, 5).value = record.basicSalary
    summarySheet.getCell(row, 6).value = record.totalAllowances
    summarySheet.getCell(row, 7).value = record.totalBonuses
    summarySheet.getCell(row, 8).value = record.materialAllowance
    summarySheet.getCell(row, 9).value = record.grossSalary
    summarySheet.getCell(row, 10).value = record.totalDeductions
    summarySheet.getCell(row, 11).value = record.netSalary

    // Number formatting
    for (let col = 5; col <= 11; col++) {
      summarySheet.getCell(row, col).numFmt = '#,##0.00'
    }

    row++
  })

  // Column widths
  summarySheet.columns = [
    { width: 20 }, // الشهر
    { width: 15 }, // تاريخ البدء
    { width: 15 }, // تاريخ الانتهاء
    { width: 12 }, // أيام العمل
    { width: 15 }, // راتب أساسي
    { width: 12 }, // بدلات
    { width: 12 }, // مكافآت
    { width: 15 }, // بدل مستلزمات
    { width: 15 }, // المستحقات
    { width: 12 }, // خصومات
    { width: 15 }, // الصافي
  ]

  // ==================== Sheet 2: تفاصيل البدلات ====================
  const allowancesSheet = workbook.addWorksheet('تفاصيل البدلات')
  allowancesSheet.views = [{ rightToLeft: true }]

  // Header
  allowancesSheet.mergeCells('A1:D1')
  const allowancesTitle = allowancesSheet.getCell('A1')
  allowancesTitle.value = 'تفاصيل البدلات الشهرية'
  allowancesTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  allowancesTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
  allowancesTitle.alignment = { horizontal: 'center', vertical: 'middle' }
  allowancesSheet.getRow(1).height = 25

  // Table Headers
  allowancesSheet.getCell('A3').value = 'الشهر'
  allowancesSheet.getCell('B3').value = 'نوع البدل'
  allowancesSheet.getCell('C3').value = 'اسم البدل'
  allowancesSheet.getCell('D3').value = 'المبلغ (جنيه)'

  for (let col = 1; col <= 4; col++) {
    const cell = allowancesSheet.getCell(3, col)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  let allowancesRow = 4
  payrollRecords.forEach((record) => {
    const monthName = `${monthNames[record.month - 1]} ${record.year}`
    const allowancesDetails = record.allowancesDetails || []

    if (allowancesDetails.length > 0) {
      allowancesDetails.forEach((allowance: any) => {
        allowancesSheet.getCell(allowancesRow, 1).value = monthName

        let typeLabel = 'بدل'
        if (allowance.type === 'position') {
          typeLabel = 'بدل وظيفة'
        }
        else if (allowance.type === 'employee') {
          typeLabel = 'بدل شخصي'
        }
        else if (allowance.type === 'material') {
          typeLabel = 'بدل مستلزمات'
        }

        allowancesSheet.getCell(allowancesRow, 2).value = typeLabel
        allowancesSheet.getCell(allowancesRow, 3).value = allowance.name
        allowancesSheet.getCell(allowancesRow, 4).value = allowance.amount
        allowancesSheet.getCell(allowancesRow, 4).numFmt = '#,##0.00'

        allowancesRow++
      })
    }
    else {
      allowancesSheet.getCell(allowancesRow, 1).value = monthName
      allowancesSheet.getCell(allowancesRow, 2).value = '-'
      allowancesSheet.getCell(allowancesRow, 3).value = 'لا توجد بدلات'
      allowancesSheet.getCell(allowancesRow, 4).value = 0
      allowancesSheet.getCell(allowancesRow, 4).numFmt = '#,##0.00'
      allowancesRow++
    }
  })

  allowancesSheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 30 },
    { width: 15 },
  ]

  // ==================== Sheet 3: تفاصيل المكافآت ====================
  const bonusesSheet = workbook.addWorksheet('تفاصيل المكافآت')
  bonusesSheet.views = [{ rightToLeft: true }]

  // Header
  bonusesSheet.mergeCells('A1:D1')
  const bonusesTitle = bonusesSheet.getCell('A1')
  bonusesTitle.value = 'تفاصيل المكافآت الشهرية'
  bonusesTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  bonusesTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6F00' } }
  bonusesTitle.alignment = { horizontal: 'center', vertical: 'middle' }
  bonusesSheet.getRow(1).height = 25

  // Table Headers
  bonusesSheet.getCell('A3').value = 'الشهر'
  bonusesSheet.getCell('B3').value = 'نوع المكافأة'
  bonusesSheet.getCell('C3').value = 'اسم المكافأة'
  bonusesSheet.getCell('D3').value = 'المبلغ (جنيه)'

  for (let col = 1; col <= 4; col++) {
    const cell = bonusesSheet.getCell(3, col)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6F00' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  let bonusesRow = 4
  payrollRecords.forEach((record) => {
    const monthName = `${monthNames[record.month - 1]} ${record.year}`
    const bonusesDetails = record.bonusesDetails || []

    if (bonusesDetails.length > 0) {
      bonusesDetails.forEach((bonus: any) => {
        bonusesSheet.getCell(bonusesRow, 1).value = monthName

        let typeLabel = 'مكافأة'
        if (bonus.type === 'DAILY') {
          typeLabel = 'مكافأة يومية'
        }
        else if (bonus.type === 'MONTHLY') {
          typeLabel = 'مكافأة شهرية'
        }
        else if (bonus.type === 'FIXED') {
          typeLabel = 'مكافأة ثابتة'
        }

        bonusesSheet.getCell(bonusesRow, 2).value = typeLabel
        bonusesSheet.getCell(bonusesRow, 3).value = bonus.name
        bonusesSheet.getCell(bonusesRow, 4).value = bonus.amount
        bonusesSheet.getCell(bonusesRow, 4).numFmt = '#,##0.00'

        bonusesRow++
      })
    }
    else {
      bonusesSheet.getCell(bonusesRow, 1).value = monthName
      bonusesSheet.getCell(bonusesRow, 2).value = '-'
      bonusesSheet.getCell(bonusesRow, 3).value = 'لا توجد مكافآت'
      bonusesSheet.getCell(bonusesRow, 4).value = 0
      bonusesSheet.getCell(bonusesRow, 4).numFmt = '#,##0.00'
      bonusesRow++
    }
  })

  bonusesSheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 30 },
    { width: 15 },
  ]

  // ==================== Sheet 4: تفاصيل الخصومات ====================
  const deductionsSheet = workbook.addWorksheet('تفاصيل الخصومات')
  deductionsSheet.views = [{ rightToLeft: true }]

  // Header
  deductionsSheet.mergeCells('A1:E1')
  const deductionsTitle = deductionsSheet.getCell('A1')
  deductionsTitle.value = 'تفاصيل الخصومات الشهرية'
  deductionsTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  deductionsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC62828' } }
  deductionsTitle.alignment = { horizontal: 'center', vertical: 'middle' }
  deductionsSheet.getRow(1).height = 25

  // Table Headers
  deductionsSheet.getCell('A3').value = 'الشهر'
  deductionsSheet.getCell('B3').value = 'نوع الخصم'
  deductionsSheet.getCell('C3').value = 'الوصف'
  deductionsSheet.getCell('D3').value = 'التاريخ'
  deductionsSheet.getCell('E3').value = 'المبلغ (جنيه)'

  for (let col = 1; col <= 5; col++) {
    const cell = deductionsSheet.getCell(3, col)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC62828' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  let deductionsRow = 4
  payrollRecords.forEach((record) => {
    const monthName = `${monthNames[record.month - 1]} ${record.year}`
    const deductionsDetails = record.deductionsDetails || []

    if (deductionsDetails.length > 0) {
      deductionsDetails.forEach((deduction: any) => {
        deductionsSheet.getCell(deductionsRow, 1).value = monthName

        let typeLabel = 'خصم'
        if (deduction.type === 'CASH_ADVANCE') {
          typeLabel = 'سلفة'
        }
        else if (deduction.type === 'ITEM_WITHDRAWAL') {
          typeLabel = 'مسحوبات'
        }
        else if (deduction.type === 'EMPLOYEE_DEBT') {
          typeLabel = 'دين سابق'
        }

        deductionsSheet.getCell(deductionsRow, 2).value = typeLabel
        deductionsSheet.getCell(deductionsRow, 3).value = deduction.description || deduction.itemName || '-'

        const transDate = new Date(deduction.date)
        const dateStr = `${transDate.getDate()}/${transDate.getMonth() + 1}/${transDate.getFullYear()}`
        deductionsSheet.getCell(deductionsRow, 4).value = dateStr

        deductionsSheet.getCell(deductionsRow, 5).value = deduction.amount
        deductionsSheet.getCell(deductionsRow, 5).numFmt = '#,##0.00'

        deductionsRow++
      })
    }
    else {
      deductionsSheet.getCell(deductionsRow, 1).value = monthName
      deductionsSheet.getCell(deductionsRow, 2).value = '-'
      deductionsSheet.getCell(deductionsRow, 3).value = 'لا توجد خصومات'
      deductionsSheet.getCell(deductionsRow, 4).value = '-'
      deductionsSheet.getCell(deductionsRow, 5).value = 0
      deductionsSheet.getCell(deductionsRow, 5).numFmt = '#,##0.00'
      deductionsRow++
    }
  })

  deductionsSheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 30 },
    { width: 15 },
    { width: 15 },
  ]

  // Save file
  const uploadsDir = path.join(import.meta.dirname, '../../../../uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const filename = `payroll_${employeeCode}_${Date.now()}.xlsx`
  const filepath = path.join(uploadsDir, filename)

  await workbook.xlsx.writeFile(filepath)
  return filepath
}

function translateEmploymentStatus(status: string): string {
  const translations: Record<string, string> = {
    ACTIVE: 'نشط',
    RESIGNED: 'مستقيل',
    TERMINATED: 'منتهي الخدمة',
    RETIRED: 'متقاعد',
    SETTLED: 'مسوى الحساب',
    ON_LEAVE: 'في إجازة',
    SUSPENDED: 'موقوف',
    ON_MISSION: 'في مهمة',
  }
  return translations[status] || status
}

export default payrollFinancialHistoryHandler
