import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const transactionsViewHandler = new Composer<Context>()

// تخزين بيانات الفلترة
interface FilterData {
  employeeId?: number
  employeeName?: string
  period?: 'today' | 'week' | 'month' | 'year' | 'custom'
  customStartDate?: Date
  customEndDate?: Date
  transactionType?: 'CASH_ADVANCE' | 'ITEM_WITHDRAWAL' | 'all'
  settlementStatus?: 'settled' | 'unsettled' | 'all'
  page?: number
}

interface EditDeleteData {
  transactionId: number
  action: 'edit' | 'delete'
  step: 'selectField' | 'enterValue' | 'enterReason'
  fieldToEdit?: string
  newValue?: string
  messageIds?: number[]
}

const filterCache = new Map<number, FilterData>()
const editDeleteCache = new Map<number, EditDeleteData>()

// ============================================
// 📊 نقطة البداية - عرض عمليات عامل
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:view', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  // مسح الفلترة السابقة
  filterCache.delete(userId)

  await showEmployeeSelector(ctx)
})

// ============================================
// 👤 عرض قائمة الموظفين للاختيار
// ============================================
async function showEmployeeSelector(ctx: Context, page = 1) {
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const employees = await Database.prisma.employee.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      nickname: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
    orderBy: { fullName: 'asc' },
    skip: offset,
    take: pageSize + 1,
  })

  const hasMore = employees.length > pageSize
  const displayEmployees = hasMore ? employees.slice(0, pageSize) : employees

  const keyboard = new InlineKeyboard()

  if (displayEmployees.length === 0) {
    keyboard.text('⬅️ رجوع', 'advancesHandler')
    await ctx.editMessageText(
      '❌ لا يوجد موظفون.',
      { reply_markup: keyboard },
    )
    return
  }

  displayEmployees.forEach((emp) => {
    const displayName = emp.nickname || emp.fullName
    keyboard
      .text(`${displayName} (${emp.position.titleAr})`, `hr:transactions:view:emp:${emp.id}`)
      .row()
  })

  // أزرار التنقل
  const navRow: any[] = []
  if (page > 1) {
    navRow.push(InlineKeyboard.text('⬅️ السابق', `hr:transactions:view:emppage:${page - 1}`))
  }
  if (hasMore) {
    navRow.push(InlineKeyboard.text('➡️ التالي', `hr:transactions:view:emppage:${page + 1}`))
  }
  if (navRow.length > 0) {
    keyboard.row(...navRow)
  }

  keyboard.text('❌ إلغاء والعودة للقائمة الرئيسية', 'advancesHandler')

  await ctx.editMessageText(
    '👤 **اختر العامل لعرض عملياته:**\n\n'
    + `الصفحة ${page} - عدد الموظفين: ${displayEmployees.length}`,
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
}

// معالجة اختيار الموظف
transactionsViewHandler.callbackQuery(/^hr:transactions:view:emp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match![1])

  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      employeeCode: true,
      position: { select: { titleAr: true } },
    },
  })

  if (!employee) {
    await ctx.answerCallbackQuery({
      text: '❌ الموظف غير موجود',
      show_alert: true,
    })
    return
  }

  // حفظ بيانات الفلترة
  filterCache.set(userId, {
    employeeId: employee.id,
    employeeName: employee.nickname || employee.fullName,
    period: 'all' as any,
    transactionType: 'all',
    settlementStatus: 'unsettled', // افتراضياً نعرض غير المسوّى
    page: 1,
  })

  // عرض التقرير الإجمالي مباشرة
  await showSummaryReport(ctx, employee)
})

// ============================================
// 📊 عرض التقرير الإجمالي للعمليات غير المسوّاة
// ============================================
async function showSummaryReport(ctx: Context, employee: any) {
  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  // جلب العمليات غير المسوّاة فقط
  const where: any = {
    employeeId: filter.employeeId,
    isSettled: false,
  }

  // الإحصائيات
  const stats = await Database.prisma.hR_Transaction.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  })

  const cashSum = await Database.prisma.hR_Transaction.aggregate({
    where: { ...where, transactionType: 'CASH_ADVANCE' },
    _sum: { amount: true },
    _count: true,
  })

  const itemSum = await Database.prisma.hR_Transaction.aggregate({
    where: { ...where, transactionType: 'ITEM_WITHDRAWAL' },
    _sum: { amount: true },
    _count: true,
  })

  // أول وآخر عملية لتحديد الفترة
  const firstTransaction = await Database.prisma.hR_Transaction.findFirst({
    where,
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })

  const displayName = employee.nickname || employee.fullName
  const today = new Date()

  let message = `👤 **العامل:** ${displayName}\n`
  message += `💼 **الوظيفة:** ${employee.position.titleAr}\n`
  message += `🔢 **الكود:** ${employee.employeeCode}\n\n`

  message += `━━━━━━━━━━━━━━━━━━━━\n`
  message += `📊 **تقرير العمليات غير المسوّاة**\n`
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`

  if (firstTransaction) {
    message += `📅 **الفترة:** من ${new Date(firstTransaction.createdAt).toLocaleDateString('ar-EG')}\n`
    message += `📅 **حتى:** ${today.toLocaleDateString('ar-EG')}\n\n`
  }

  message += `📋 **إجمالي العمليات:** ${stats._count || 0} عملية\n\n`

  message += `💵 **المسحوبات النقدية:**\n`
  message += `   ▫️ العدد: ${cashSum._count || 0} عملية\n`
  message += `   ▫️ المبلغ: ${cashSum._sum.amount?.toFixed(2) || 0} جنيه\n\n`

  message += `📦 **المسحوبات العينية:**\n`
  message += `   ▫️ العدد: ${itemSum._count || 0} عملية\n`
  message += `   ▫️ المبلغ: ${itemSum._sum.amount?.toFixed(2) || 0} جنيه\n\n`

  message += `━━━━━━━━━━━━━━━━━━━━\n`
  message += `💰 **الإجمالي الكلي:** ${stats._sum.amount?.toFixed(2) || 0} جنيه\n`
  message += `━━━━━━━━━━━━━━━━━━━━\n`

  const keyboard = new InlineKeyboard()
    .text('📋 عرض التقرير الكامل', 'hr:transactions:view:full')
    .row()
    .text('🔍 خيارات الفلترة', 'hr:transactions:filter:options')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:view')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// ============================================
// 📋 عرض التقرير الكامل بقائمة العمليات
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:view:full', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  filter.page = 1
  await showFullReport(ctx, filter)
})

async function showFullReport(ctx: Context, filter: FilterData, page = 1) {
  filter.page = page

  const pageSize = 20
  const offset = (page - 1) * pageSize

  // بناء شروط الاستعلام
  const where: any = {
    employeeId: filter.employeeId,
    isSettled: filter.settlementStatus === 'all' ? undefined : filter.settlementStatus === 'settled',
  }

  // فلترة بالنوع
  if (filter.transactionType !== 'all') {
    where.transactionType = filter.transactionType
  }

  // فلترة بالفترة الزمنية
  if (filter.period) {
    const now = new Date()

    if (filter.period === 'custom' && filter.customStartDate) {
      where.createdAt = {
        gte: filter.customStartDate,
        lte: filter.customEndDate || new Date(),
      }
    }
    else if (filter.period !== 'custom') {
      let startDate: Date

      if (filter.period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }
      else if (filter.period === 'week') {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
      }
      else if (filter.period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }
      else if (filter.period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1)
      }

      if (startDate!) {
        where.createdAt = { gte: startDate }
      }
    }
  }

  // جلب العمليات
  const transactions = await Database.prisma.hR_Transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: pageSize + 1,
    include: {
      item: true,
    },
  })

  const hasMore = transactions.length > pageSize
  const displayTransactions = hasMore ? transactions.slice(0, pageSize) : transactions

  let message = `👤 **العامل:** ${filter.employeeName}\n\n`
  message += `📋 **قائمة العمليات ${filter.settlementStatus === 'unsettled' ? 'غير المسوّاة' : filter.settlementStatus === 'settled' ? 'المسوّاة' : ''}**\n\n`

  if (displayTransactions.length === 0) {
    message += '❌ لا توجد عمليات'
  }

  const keyboard = new InlineKeyboard()

  // عرض العمليات في عامود واحد (20 صف)
  displayTransactions.forEach((tx) => {
    const icon = tx.transactionType === 'CASH_ADVANCE' ? '💵' : '📦'
    const status = tx.isSettled ? '✅' : '⏳'
    const date = new Date(tx.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })

    keyboard
      .text(
        `${status} ${icon} ${tx.amount} ج - ${date}`,
        `hr:transactions:view:detail:${tx.id}`,
      )
      .row()
  })

  // أزرار التنقل
  const navRow: any[] = []
  if (page > 1) {
    navRow.push(InlineKeyboard.text('⬅️ السابق', `hr:transactions:full:page:${page - 1}`))
  }
  if (hasMore) {
    navRow.push(InlineKeyboard.text('➡️ التالي', `hr:transactions:full:page:${page + 1}`))
  }
  if (navRow.length > 0) {
    keyboard.row(...navRow)
  }

  // الفلاتر والرجوع
  keyboard
    .text('🔍 خيارات الفلترة', 'hr:transactions:filter:options')
    .row()
    .text('⬅️ رجوع للملخص', `hr:transactions:view:emp:${filter.employeeId}`)

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// معالج التنقل بين صفحات التقرير الكامل
transactionsViewHandler.callbackQuery(/^hr:transactions:full:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  const page = Number.parseInt(ctx.match![1])
  await showFullReport(ctx, filter, page)
})

// ============================================
// 🔍 عرض خيارات الفلترة
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:filter:options', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showFilterOptions(ctx)
})

// ============================================
// 🔍 عرض خيارات الفلترة
// ============================================
async function showFilterOptions(ctx: Context) {
  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  const keyboard = new InlineKeyboard()
    .text('📅 تصفية بالفترة', 'hr:transactions:filter:period')
    .row()
    .text('💵 تصفية بالنوع', 'hr:transactions:filter:type')
    .row()
    .text('✅ تصفية بالتسويات', 'hr:transactions:filter:settlement')
    .row()
    .text('� عرض التقرير الكامل', 'hr:transactions:view:full')
    .row()
    .text('⬅️ رجوع للملخص', `hr:transactions:view:emp:${filter.employeeId}`)

  const filterSummary = buildFilterSummary(filter)

  await ctx.editMessageText(
    `👤 **العامل:** ${filter.employeeName}\n\n`
    + `🔍 **خيارات الفلترة:**\n\n${
      filterSummary
    }\n\nاختر خياراً للتصفية أو اعرض التقرير الكامل:`,
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
}

function buildFilterSummary(filter: FilterData): string {
  const lines: string[] = []

  // الفترة الزمنية
  if (filter.period === 'today') {
    lines.push('📅 الفترة: اليوم')
  }
  else if (filter.period === 'week') {
    lines.push('📅 الفترة: هذا الأسبوع')
  }
  else if (filter.period === 'month') {
    lines.push('📅 الفترة: هذا الشهر')
  }
  else if (filter.period === 'year') {
    lines.push('📅 الفترة: هذه السنة')
  }
  else if (filter.period === 'custom' && filter.customStartDate) {
    lines.push(`📅 الفترة: ${filter.customStartDate.toLocaleDateString('ar-EG')} - ${filter.customEndDate?.toLocaleDateString('ar-EG') || 'الآن'}`)
  }
  else {
    lines.push('📅 الفترة: الكل')
  }

  // نوع العملية
  if (filter.transactionType === 'CASH_ADVANCE') {
    lines.push('💵 النوع: سلف نقدية فقط')
  }
  else if (filter.transactionType === 'ITEM_WITHDRAWAL') {
    lines.push('📦 النوع: مسحوبات عينية فقط')
  }
  else {
    lines.push('💰 النوع: الكل')
  }

  // حالة التسوية
  if (filter.settlementStatus === 'settled') {
    lines.push('✅ التسوية: مسوّى فقط')
  }
  else if (filter.settlementStatus === 'unsettled') {
    lines.push('⏳ التسوية: غير مسوّى فقط')
  }
  else {
    lines.push('📋 التسوية: الكل')
  }

  return lines.join('\n')
}

// ============================================
// 📅 فلترة بالفترة الزمنية
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:filter:period', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('اليوم', 'hr:transactions:period:today')
    .text('هذا الأسبوع', 'hr:transactions:period:week')
    .row()
    .text('هذا الشهر', 'hr:transactions:period:month')
    .text('هذه السنة', 'hr:transactions:period:year')
    .row()
    .text('الكل', 'hr:transactions:period:all')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:filter:back')

  await ctx.editMessageText(
    '📅 **اختر الفترة الزمنية:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// معالجة اختيار الفترة
transactionsViewHandler.callbackQuery(/^hr:transactions:period:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  const period = ctx.match![1] as any
  filter.period = period === 'all' ? undefined : period
  filter.page = 1 // إعادة تعيين الصفحة

  // تطبيق الفلتر مباشرة وعرض التقرير الكامل
  await showFullReport(ctx, filter)
})

// ============================================
// 💵 فلترة بنوع العملية
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:filter:type', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('💵 سلف نقدية', 'hr:transactions:type:CASH_ADVANCE')
    .row()
    .text('📦 مسحوبات عينية', 'hr:transactions:type:ITEM_WITHDRAWAL')
    .row()
    .text('💰 الكل', 'hr:transactions:type:all')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:filter:back')

  await ctx.editMessageText(
    '💵 **اختر نوع العملية:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

transactionsViewHandler.callbackQuery(/^hr:transactions:type:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  const type = ctx.match![1]
  filter.transactionType = type === 'all' ? 'all' : type as any
  filter.page = 1

  // تطبيق الفلتر مباشرة وعرض التقرير الكامل
  await showFullReport(ctx, filter)
})

// ============================================
// ✅ فلترة بحالة التسوية
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:filter:settlement', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('✅ مسوّى', 'hr:transactions:settlement:settled')
    .row()
    .text('⏳ غير مسوّى', 'hr:transactions:settlement:unsettled')
    .row()
    .text('📋 الكل', 'hr:transactions:settlement:all')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:filter:back')

  await ctx.editMessageText(
    '✅ **اختر حالة التسوية:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

transactionsViewHandler.callbackQuery(/^hr:transactions:settlement:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  const status = ctx.match![1]
  filter.settlementStatus = status as any
  filter.page = 1

  // تطبيق الفلتر مباشرة وعرض التقرير الكامل
  await showFullReport(ctx, filter)
})

// رجوع للفلترة
transactionsViewHandler.callbackQuery('hr:transactions:filter:back', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showFilterOptions(ctx)
})

// ============================================
// 📊 عرض التقرير مع الإحصائيات
// ============================================
transactionsViewHandler.callbackQuery('hr:transactions:view:report', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter || !filter.employeeId)
    return

  await showReport(ctx, filter)
})

async function showReport(ctx: Context, filter: FilterData) {
  // بناء شروط الاستعلام
  const where: any = {
    employeeId: filter.employeeId,
  }

  // فلترة بالفترة
  if (filter.period) {
    const now = new Date()
    let startDate: Date

    if (filter.period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
    else if (filter.period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    }
    else if (filter.period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    else if (filter.period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }
    else if (filter.period === 'custom' && filter.customStartDate) {
      startDate = filter.customStartDate
    }

    if (startDate!) {
      where.createdAt = { gte: startDate }
      if (filter.customEndDate) {
        where.createdAt.lte = filter.customEndDate
      }
    }
  }

  // فلترة بالنوع
  if (filter.transactionType && filter.transactionType !== 'all') {
    where.transactionType = filter.transactionType
  }

  // فلترة بالتسوية
  if (filter.settlementStatus === 'settled') {
    where.isSettled = true
  }
  else if (filter.settlementStatus === 'unsettled') {
    where.isSettled = false
  }

  // جلب البيانات
  const [transactions, stats] = await Promise.all([
    Database.prisma.hR_Transaction.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 11, // للتحقق من وجود صفحات إضافية
      skip: ((filter.page || 1) - 1) * 10,
    }),
    Database.prisma.hR_Transaction.aggregate({
      where,
      _count: true,
      _sum: {
        amount: true,
      },
    }),
  ])

  const hasMore = transactions.length > 10
  const displayTransactions = hasMore ? transactions.slice(0, 10) : transactions

  // إحصائيات إضافية
  const settledCount = await Database.prisma.hR_Transaction.count({
    where: { ...where, isSettled: true },
  })

  const unsettledCount = await Database.prisma.hR_Transaction.count({
    where: { ...where, isSettled: false },
  })

  const settledSum = await Database.prisma.hR_Transaction.aggregate({
    where: { ...where, isSettled: true },
    _sum: { amount: true },
  })

  const unsettledSum = await Database.prisma.hR_Transaction.aggregate({
    where: { ...where, isSettled: false },
    _sum: { amount: true },
  })

  const cashCount = await Database.prisma.hR_Transaction.count({
    where: { ...where, transactionType: 'CASH_ADVANCE' },
  })

  const itemCount = await Database.prisma.hR_Transaction.count({
    where: { ...where, transactionType: 'ITEM_WITHDRAWAL' },
  })

  // بناء التقرير
  let message = `👤 **تقرير عمليات:** ${filter.employeeName}\n\n`
  message += `📊 **الإحصائيات الإجمالية:**\n`
  message += `━━━━━━━━━━━━━━━━━━━━\n`
  message += `📋 إجمالي العمليات: ${stats._count || 0}\n`
  message += `💰 المبلغ الكلي: ${stats._sum.amount?.toFixed(2) || 0} جنيه\n\n`

  message += `✅ المسوّى: ${settledCount} عملية (${settledSum._sum.amount?.toFixed(2) || 0} ج)\n`
  message += `⏳ غير المسوّى: ${unsettledCount} عملية (${unsettledSum._sum.amount?.toFixed(2) || 0} ج)\n\n`

  message += `💵 سلف نقدية: ${cashCount} عملية\n`
  message += `📦 مسحوبات عينية: ${itemCount} عملية\n`
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`

  if (displayTransactions.length === 0) {
    message += '❌ لا توجد عمليات بالفلترة الحالية.'
  }
  else {
    message += `📝 **آخر ${displayTransactions.length} عملية:**\n\n`
  }

  const keyboard = new InlineKeyboard()

  if (displayTransactions.length > 0) {
    displayTransactions.forEach((tx) => {
      const icon = tx.transactionType === 'CASH_ADVANCE' ? '💵' : '📦'
      const status = tx.isSettled ? '✅' : '⏳'
      const date = new Date(tx.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
      keyboard
        .text(
          `${status} ${icon} ${tx.amount} ج - ${date}`,
          `hr:transactions:view:detail:${tx.id}`,
        )
        .row()
    })

    // أزرار التنقل
    const navRow: any[] = []
    if ((filter.page || 1) > 1) {
      navRow.push(InlineKeyboard.text('⬅️ السابق', `hr:transactions:view:page:${(filter.page || 1) - 1}`))
    }
    if (hasMore) {
      navRow.push(InlineKeyboard.text('➡️ التالي', `hr:transactions:view:page:${(filter.page || 1) + 1}`))
    }
    if (navRow.length > 0) {
      keyboard.row(...navRow)
    }
  }

  keyboard
    .text('🔍 تغيير الفلترة', 'hr:transactions:filter:back')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:view')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// معالجة التنقل بين الصفحات
transactionsViewHandler.callbackQuery(/^hr:transactions:view:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = filterCache.get(userId)
  if (!filter)
    return

  filter.page = Number.parseInt(ctx.match![1])
  await showReport(ctx, filter)
})

// عرض تفاصيل عملية
transactionsViewHandler.callbackQuery(/^hr:transactions:view:detail:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const txId = Number.parseInt(ctx.match![1])

  const tx = await Database.prisma.hR_Transaction.findUnique({
    where: { id: txId },
    include: {
      employee: {
        select: {
          fullName: true,
          nickname: true,
          position: { select: { titleAr: true } },
        },
      },
      item: true,
    },
  })

  if (!tx) {
    await ctx.answerCallbackQuery({
      text: '❌ العملية غير موجودة',
      show_alert: true,
    })
    return
  }

  const employeeName = tx.employee.nickname || tx.employee.fullName

  let message = `📋 **تفاصيل العملية**\n\n`
  message += `🔢 **رقم العملية:** ${tx.transactionNumber}\n`
  message += `👤 **العامل:** ${employeeName} (${tx.employee.position.titleAr})\n`
  message += `📅 **التاريخ:** ${new Date(tx.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`
  message += `⏰ **الوقت:** ${new Date(tx.createdAt).toLocaleTimeString('ar-EG')}\n\n`

  if (tx.transactionType === 'CASH_ADVANCE') {
    message += `💵 **النوع:** سلفة نقدية\n`
    message += `💰 **المبلغ:** ${tx.amount} جنيه\n`
  }
  else {
    message += `📦 **النوع:** مسحوب عيني\n`
    message += `📋 **الصنف:** ${tx.item?.nameAr}\n`
    message += `📊 **الكمية:** ${tx.quantity}\n`
    message += `💵 **سعر الوحدة:** ${tx.unitPrice} جنيه\n`
    message += `💰 **الإجمالي:** ${tx.amount} جنيه\n`
  }

  message += `\n📝 **الوصف:** ${tx.description || 'لا يوجد'}\n`
  message += `\n${tx.isSettled ? '✅ **الحالة:** مسوّى' : '⏳ **الحالة:** غير مسوّى'}\n`

  const keyboard = new InlineKeyboard()
    .text('✏️ تعديل العملية', `hr:transactions:edit:${txId}`)
    .text('🗑️ حذف العملية', `hr:transactions:delete:${txId}`)
    .row()
    .text('📋 سجل التعديلات', `hr:transactions:changelog:${txId}`)
    .row()
    .text('⬅️ رجوع للتقرير', 'hr:transactions:view:report')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// التنقل بين صفحات الموظفين
transactionsViewHandler.callbackQuery(/^hr:transactions:view:emppage:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1])
  await showEmployeeSelector(ctx, page)
})

// ============================================
// 📋 عرض سجل التعديلات
// ============================================
transactionsViewHandler.callbackQuery(/^hr:transactions:changelog:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const txId = Number.parseInt(ctx.match![1])

  const changeLogs = await Database.prisma.hR_TransactionChangeLog.findMany({
    where: { transactionId: txId },
    orderBy: { changedAt: 'desc' },
    take: 20,
  })

  if (changeLogs.length === 0) {
    await ctx.answerCallbackQuery({
      text: '📋 لا يوجد سجل تعديلات لهذه العملية',
      show_alert: true,
    })
    return
  }

  let message = `📋 **سجل التعديلات**\n\n`

  for (const log of changeLogs) {
    const changeIcon = log.changeType === 'EDIT' ? '✏️' : log.changeType === 'DELETE' ? '🗑️' : '♻️'
    const changeText = log.changeType === 'EDIT' ? 'تعديل' : log.changeType === 'DELETE' ? 'حذف' : 'استرجاع'

    message += `${changeIcon} **${changeText}**\n`
    message += `📅 ${new Date(log.changedAt).toLocaleString('ar-EG')}\n`

    if (log.fieldName) {
      message += `🔹 الحقل: ${getFieldNameArabic(log.fieldName)}\n`
      if (log.oldValue)
        message += `❌ القيمة القديمة: ${log.oldValue}\n`
      if (log.newValue)
        message += `✅ القيمة الجديدة: ${log.newValue}\n`
    }

    message += `📝 السبب: ${log.reason}\n`
    message += `━━━━━━━━━━━━━━\n\n`
  }

  const keyboard = new InlineKeyboard()
    .text('⬅️ رجوع للتفاصيل', `hr:transactions:view:detail:${txId}`)

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

function getFieldNameArabic(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    amount: 'المبلغ',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    description: 'الوصف',
    notes: 'الملاحظات',
    itemId: 'الصنف',
  }
  return fieldNames[fieldName] || fieldName
}

// ============================================
// ✏️ تعديل العملية
// ============================================
transactionsViewHandler.callbackQuery(/^hr:transactions:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const txId = Number.parseInt(ctx.match![1])

  const tx = await Database.prisma.hR_Transaction.findUnique({
    where: { id: txId },
    select: {
      id: true,
      transactionType: true,
      amount: true,
      quantity: true,
      unitPrice: true,
      description: true,
      notes: true,
    },
  })

  if (!tx) {
    await ctx.answerCallbackQuery({
      text: '❌ العملية غير موجودة',
      show_alert: true,
    })
    return
  }

  editDeleteCache.set(userId, {
    transactionId: txId,
    action: 'edit',
    step: 'selectField',
    messageIds: [],
  })

  // سجل رسالة القائمة الحالية حتى نتمكن من حذفها لاحقاً عند التنقل في التدفق
  try {
    const currentMsgId = ctx.callbackQuery?.message?.message_id
    if (currentMsgId) {
      const data = editDeleteCache.get(userId)
      if (data)
        data.messageIds!.push(currentMsgId)
    }
  }
  catch {
    // ignore
  }
  const keyboard = new InlineKeyboard()

  if (tx.transactionType === 'CASH_ADVANCE') {
    keyboard
      .text('💰 المبلغ', 'hr:transactions:edit:field:amount')
      .row()
  }
  else {
    keyboard
      .text('📊 الكمية', 'hr:transactions:edit:field:quantity')
      .row()
      .text('💵 سعر الوحدة', 'hr:transactions:edit:field:unitPrice')
      .row()
  }

  keyboard
    .text('📝 الوصف', 'hr:transactions:edit:field:description')
    .row()
    .text('📋 الملاحظات', 'hr:transactions:edit:field:notes')
    .row()
    .text('❌ إلغاء', `hr:transactions:view:detail:${txId}`)

  await ctx.editMessageText(
    '✏️ **تعديل العملية**\n\n'
    + 'اختر الحقل الذي تريد تعديله:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// معالجة اختيار الحقل للتعديل
transactionsViewHandler.callbackQuery(/^hr:transactions:edit:field:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = editDeleteCache.get(userId)
  if (!data || data.action !== 'edit' || data.step !== 'selectField')
    return

  const fieldName = ctx.match![1]
  data.fieldToEdit = fieldName
  data.step = 'enterValue'

  // سجل رسالة الواجهة الحالية (المعدلة) لنتمكن من حذفها بعد استلام القيمة
  try {
    const currentMsgId = ctx.callbackQuery?.message?.message_id
    if (currentMsgId) {
      const d = editDeleteCache.get(userId)
      if (d)
        d.messageIds!.push(currentMsgId)
    }
  }
  catch {
    // ignore
  }
  await ctx.editMessageText(
    `✏️ **تعديل ${getFieldNameArabic(fieldName)}**\n\n`
    + `أدخل القيمة الجديدة لـ **${getFieldNameArabic(fieldName)}**:`,
    { parse_mode: 'Markdown' },
  )
})

// استقبال القيمة الجديدة
transactionsViewHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = editDeleteCache.get(userId)
  if (!data || data.action !== 'edit' || data.step !== 'enterValue')
    return next()

  const newValue = ctx.message.text.trim()
  data.newValue = newValue
  data.step = 'enterReason'

  const msg = await ctx.reply(
    '📝 **سبب التعديل**\n\n'
    + 'أدخل سبب التعديل:',
    { parse_mode: 'Markdown' },
  )
  data.messageIds!.push(ctx.message.message_id, msg.message_id)
})

// استقبال سبب التعديل وتنفيذ التعديل
transactionsViewHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = editDeleteCache.get(userId)
  if (!data || data.action !== 'edit' || data.step !== 'enterReason')
    return next()

  const reason = ctx.message.text.trim()
  data.messageIds!.push(ctx.message.message_id)

  try {
    const tx = await Database.prisma.hR_Transaction.findUnique({
      where: { id: data.transactionId },
      select: {
        id: true,
        amount: true,
        quantity: true,
        unitPrice: true,
        description: true,
        notes: true,
        transactionType: true,
      },
    })

    if (!tx) {
      await ctx.reply('❌ العملية غير موجودة')
      editDeleteCache.delete(userId)
      return
    }

    const fieldName = data.fieldToEdit!
    const oldValue = String((tx as any)[fieldName] || '')
    const newValue = data.newValue!

    // تحديث القيمة
    const updateData: any = {}

    if (fieldName === 'amount' || fieldName === 'quantity' || fieldName === 'unitPrice') {
      const numValue = Number.parseFloat(newValue)
      if (Number.isNaN(numValue) || numValue <= 0) {
        await ctx.reply('❌ القيمة يجب أن تكون رقم صحيح أكبر من صفر')
        editDeleteCache.delete(userId)
        return
      }
      updateData[fieldName] = numValue

      // إعادة حساب المبلغ إذا تم تعديل الكمية أو السعر
      if (tx.transactionType === 'ITEM_WITHDRAWAL') {
        if (fieldName === 'quantity') {
          updateData.amount = numValue * (tx.unitPrice || 0)
        }
        else if (fieldName === 'unitPrice') {
          updateData.amount = (tx.quantity || 0) * numValue
        }
      }
    }
    else {
      updateData[fieldName] = newValue
    }

    // تحديث العملية
    await Database.prisma.hR_Transaction.update({
      where: { id: data.transactionId },
      data: {
        ...updateData,
        updatedBy: BigInt(userId),
        updatedAt: new Date(),
      },
    })

    // تسجيل التعديل
    await Database.prisma.hR_TransactionChangeLog.create({
      data: {
        transactionId: data.transactionId,
        changeType: 'EDIT',
        fieldName,
        oldValue,
        newValue,
        reason,
        changedBy: BigInt(userId),
      },
    })

    // حذف الرسائل
    for (const msgId of data.messageIds!) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, msgId)
      }
      catch {
        // ignore
      }
    }

    // استرجاع العملية المحدثة مع بيانات المرتبطات لبناء تقرير مفصل
    const updatedTx = await Database.prisma.hR_Transaction.findUnique({
      where: { id: data.transactionId },
      include: {
        employee: { select: { fullName: true, nickname: true, position: { select: { titleAr: true } } } },
        item: true,
      },
    })

    // بناء التقرير الكامل بعد التعديل
    let finalReport = `✅ **تم تعديل العملية بنجاح!**\n\n`
    finalReport += `📋 **رقم العملية:** ${updatedTx?.transactionNumber || ''}\n`
    const displayName = updatedTx?.employee?.nickname || updatedTx?.employee?.fullName || ''
    finalReport += `👤 **العامل:** ${displayName} (${updatedTx?.employee?.position?.titleAr || ''})\n`
    finalReport += `📅 **التاريخ:** ${new Date(updatedTx?.createdAt || Date.now()).toLocaleDateString('ar-EG')}\n\n`

    if (updatedTx?.transactionType === 'CASH_ADVANCE') {
      finalReport += `💵 **النوع:** سلفة نقدية\n💰 **المبلغ:** ${updatedTx.amount} جنيه\n\n`
    }
    else {
      finalReport += `📦 **النوع:** مسحوب عيني\n`
        + `📋 **الصنف:** ${updatedTx?.item?.nameAr || ''}\n`
        + `📊 **الكمية:** ${updatedTx?.quantity || 0}\n`
        + `💵 **سعر الوحدة:** ${updatedTx?.unitPrice || 0} جنيه\n`
        + `💰 **الإجمالي:** ${updatedTx?.amount || 0} جنيه\n\n`
    }

    finalReport += `✏️ **التعديل:** ${getFieldNameArabic(fieldName)}\n`
    finalReport += `❌ **القيمة القديمة:** ${oldValue}\n`
    finalReport += `✅ **القيمة الجديدة:** ${newValue}\n`
    finalReport += `📝 **السبب:** ${reason}\n`

    if (updatedTx?.description) {
      finalReport += `\n📝 **الوصف:** ${updatedTx.description}\n`
    }
    if (updatedTx?.notes) {
      finalReport += `\n🗒️ **ملاحظات:** ${updatedTx.notes}\n`
    }

    // زر للعودة لتفاصيل العملية
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع للتقرير', `hr:transactions:view:detail:${data.transactionId}`)

    // إرسال التقرير للمحرر
    await ctx.reply(finalReport, { parse_mode: 'Markdown', reply_markup: keyboard })

    // إرسال التقرير لجميع مدراء HR (ADMIN, SUPER_ADMIN) عدا المحرر
    const hrAdmins = await Database.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        telegramId: { not: userId },
      },
      select: { telegramId: true },
    })

    for (const admin of hrAdmins) {
      try {
        await ctx.api.sendMessage(Number(admin.telegramId), finalReport, { parse_mode: 'Markdown' })
      }
      catch (error) {
        ctx.logger.error({ error, adminId: admin.telegramId }, 'Failed to send edit report to admin')
      }
    }

    editDeleteCache.delete(userId)
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error editing transaction')
    await ctx.reply('❌ حدث خطأ أثناء التعديل')
    editDeleteCache.delete(userId)
  }
})

// ============================================
// 🗑️ حذف العملية
// ============================================
transactionsViewHandler.callbackQuery(/^hr:transactions:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const txId = Number.parseInt(ctx.match![1])

  editDeleteCache.set(userId, {
    transactionId: txId,
    action: 'delete',
    step: 'enterReason',
    messageIds: [],
  })

  // سجل رسالة القائمة الحالية حتى نحذفها لاحقاً
  try {
    const currentMsgId = ctx.callbackQuery?.message?.message_id
    if (currentMsgId) {
      const data = editDeleteCache.get(userId)
      if (data)
        data.messageIds!.push(currentMsgId)
    }
  }
  catch {
    // ignore
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `hr:transactions:view:detail:${txId}`)

  await ctx.editMessageText(
    '🗑️ **حذف العملية**\n\n'
    + '⚠️ **تحذير:** سيتم حذف العملية نهائياً!\n\n'
    + 'أدخل سبب الحذف:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// استقبال سبب الحذف وتنفيذ الحذف
transactionsViewHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = editDeleteCache.get(userId)
  if (!data || data.action !== 'delete' || data.step !== 'enterReason')
    return next()

  const reason = ctx.message.text.trim()
  data.messageIds!.push(ctx.message.message_id)

  try {
    // استرجاع العملية الكاملة قبل الحذف لبناء التقرير
    const tx = await Database.prisma.hR_Transaction.findUnique({
      where: { id: data.transactionId },
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            employeeCode: true,
            position: { select: { titleAr: true } },
          },
        },
        item: true,
      },
    })

    if (!tx) {
      await ctx.reply('❌ العملية غير موجودة')
      editDeleteCache.delete(userId)
      return
    }

    // تسجيل الحذف قبل الحذف الفعلي
    await Database.prisma.hR_TransactionChangeLog.create({
      data: {
        transactionId: data.transactionId,
        changeType: 'DELETE',
        reason,
        changedBy: BigInt(userId),
      },
    })

    // حذف العملية
    await Database.prisma.hR_Transaction.delete({
      where: { id: data.transactionId },
    })

    // حذف رسائل التدفق
    for (const msgId of data.messageIds!) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, msgId)
      }
      catch {
        // ignore
      }
    }

    // بناء التقرير الكامل
    const employeeName = tx.employee.nickname || tx.employee.fullName
    let finalReport = '🗑️ **تم حذف العملية بنجاح!**\n\n'
    finalReport += `📋 **رقم العملية:** ${tx.transactionNumber}\n`
    finalReport += `👤 **العامل:** ${employeeName} (${tx.employee.position.titleAr})\n`
    finalReport += `📅 **التاريخ:** ${new Date(tx.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`
    finalReport += `⏰ **الوقت:** ${new Date(tx.createdAt).toLocaleTimeString('ar-EG')}\n\n`

    if (tx.transactionType === 'CASH_ADVANCE') {
      finalReport += `💵 **النوع:** سلفة نقدية\n`
      finalReport += `💰 **المبلغ:** ${tx.amount} جنيه\n\n`
    }
    else {
      finalReport += `📦 **النوع:** مسحوب عيني\n`
      finalReport += `📋 **الصنف:** ${tx.item?.nameAr}\n`
      finalReport += `� **الكمية:** ${tx.quantity}\n`
      finalReport += `💵 **سعر الوحدة:** ${tx.unitPrice} جنيه\n`
      finalReport += `💰 **الإجمالي:** ${tx.amount} جنيه\n\n`
    }

    if (tx.description) {
      finalReport += `�📝 **الوصف:** ${tx.description}\n`
    }
    if (tx.notes) {
      finalReport += `🗒️ **ملاحظات:** ${tx.notes}\n`
    }

    finalReport += `\n❌ **سبب الحذف:** ${reason}`

    // زر للعودة للقائمة
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع للقائمة الرئيسية', 'advancesHandler')

    // إرسال التقرير للمستخدم الحالي
    await ctx.reply(finalReport, { parse_mode: 'Markdown', reply_markup: keyboard })

    // إرسال التقرير لجميع مدراء HR (ADMIN, SUPER_ADMIN) عدا المحذف
    const hrAdmins = await Database.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        telegramId: { not: userId },
      },
      select: { telegramId: true },
    })

    for (const admin of hrAdmins) {
      try {
        await ctx.api.sendMessage(Number(admin.telegramId), finalReport, { parse_mode: 'Markdown' })
      }
      catch (error) {
        ctx.logger.error({ error, adminId: admin.telegramId }, 'Failed to send delete report to admin')
      }
    }

    editDeleteCache.delete(userId)
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error deleting transaction')
    await ctx.reply('❌ حدث خطأ أثناء الحذف')
    editDeleteCache.delete(userId)
  }
})
