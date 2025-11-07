/**
 * Leaves Reports Handler
 * معالج تقارير الإجازات - إنشاء تقارير Excel احترافية مع فلاتر متقدمة
 */

import { Composer, InlineKeyboard, InputFile } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { LeavesReportsService, type LeavesReportFilters } from '#root/modules/services/leaves-reports-service.js'

export const composer = new Composer<Context>()

const feature = composer.chatType('private')

// تصدير باسم leavesReportsHandler
export const leavesReportsHandler = composer

// الحالة المؤقتة للفلاتر
const filterStates = new Map<number, LeavesReportFilters>()

/**
 * عرض قائمة التقارير الرئيسية
 */
feature.callbackQuery('leaves:reports', logHandle('leaves-reports'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('📊 تقرير شامل (بدون فلاتر)', 'leaves:reports:generate:all').row()
    .text('🔍 تقرير مخصص (مع فلاتر)', 'leaves:reports:filters:start').row()
    .text('📅 تقارير سريعة', 'leaves:reports:quick').row()
    .text('🔙 رجوع', 'leaves:menu')
  
  await ctx.editMessageText(
    '📊 **تقارير الإجازات**\n\n' +
    'اختر نوع التقرير المطلوب:\n\n' +
    '• **تقرير شامل:** جميع الإجازات بدون فلاتر\n' +
    '• **تقرير مخصص:** اختيار فلاتر محددة\n' +
    '• **تقارير سريعة:** تقارير جاهزة للحالات الشائعة',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

/**
 * التقارير السريعة
 */
feature.callbackQuery('leaves:reports:quick', logHandle('leaves-reports-quick'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('📅 إجازات الشهر الحالي', 'leaves:reports:quick:current-month').row()
    .text('⏰ الإجازات المتأخرة', 'leaves:reports:quick:delayed').row()
    .text('💰 التسويات النقدية', 'leaves:reports:quick:cash').row()
    .text('⏳ قيد الموافقة', 'leaves:reports:quick:pending').row()
    .text('🔓 الإجازات المفتوحة', 'leaves:reports:quick:open').row()
    .text('🔙 رجوع', 'leaves:reports')
  
  await ctx.editMessageText(
    '📅 **التقارير السريعة**\n\n' +
    'اختر التقرير السريع المطلوب:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

/**
 * معالجة التقارير السريعة
 */
feature.callbackQuery(/^leaves:reports:quick:(.+)$/, logHandle('leaves-reports-quick-type'), async (ctx) => {
  const quickType = ctx.match[1]
  
  await ctx.answerCallbackQuery('⏳ جاري إنشاء التقرير...')
  await ctx.editMessageText('⏳ جاري إنشاء التقرير، الرجاء الانتظار...')
  
  const filters: LeavesReportFilters = {}
  
  // تحديد الفلاتر حسب النوع
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  switch (quickType) {
    case 'current-month':
      filters.startDate = startOfMonth
      filters.endDate = endOfMonth
      break
    
    case 'delayed':
      filters.hasDelay = true
      break
    
    case 'cash':
      filters.settlementType = 'CASH_SETTLEMENT'
      break
    
    case 'pending':
      filters.status = 'PENDING'
      break
    
    case 'open':
      filters.hasReturned = false
      filters.settlementType = 'ACTUAL_LEAVE'
      break
  }
  
  // إنشاء التقرير
  await generateReport(ctx, filters)
})

/**
 * بدء إنشاء تقرير مخصص
 */
feature.callbackQuery('leaves:reports:filters:start', logHandle('leaves-reports-filters-start'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const userId = ctx.from.id
  filterStates.set(userId, {})
  
  await showFiltersMenu(ctx)
})

/**
 * عرض قائمة الفلاتر
 */
async function showFiltersMenu(ctx: Context) {
  const userId = ctx.from!.id
  const filters = filterStates.get(userId) || {}
  
  let message = '🔍 **الفلاتر المحددة:**\n\n'
  
  // عرض الفلاتر النشطة
  const activeFilters: string[] = []
  
  if (filters.startDate) {
    activeFilters.push(`📅 من: ${Calendar.formatArabic(filters.startDate)}`)
  }
  
  if (filters.endDate) {
    activeFilters.push(`📅 إلى: ${Calendar.formatArabic(filters.endDate)}`)
  }
  
  if (filters.employeeId) {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: filters.employeeId },
      select: { nickname: true, fullName: true }
    })
    activeFilters.push(`👤 موظف: ${employee?.nickname || employee?.fullName}`)
  }
  
  if (filters.positionId) {
    const position = await Database.prisma.position.findUnique({
      where: { id: filters.positionId },
      select: { title: true }
    })
    activeFilters.push(`💼 وظيفة: ${position?.title}`)
  }
  
  if (filters.departmentId) {
    const department = await Database.prisma.department.findUnique({
      where: { id: filters.departmentId },
      select: { name: true }
    })
    activeFilters.push(`🏢 قسم: ${department?.name}`)
  }
  
  if (filters.leaveType) {
    const typeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب'
    }
    activeFilters.push(`📋 نوع الإجازة: ${typeLabels[filters.leaveType]}`)
  }
  
  if (filters.settlementType) {
    const typeLabels: Record<string, string> = {
      ACTUAL_LEAVE: '🏖️ فعلية',
      CASH_SETTLEMENT: '💰 نقدية',
      POSTPONED: '⏸️ مؤجلة'
    }
    activeFilters.push(`🔄 نوع التسوية: ${typeLabels[filters.settlementType]}`)
  }
  
  if (filters.status) {
    const statusLabels: Record<string, string> = {
      PENDING: '⏳ قيد الموافقة',
      APPROVED: '✅ موافق',
      REJECTED: '❌ مرفوض'
    }
    activeFilters.push(`✅ الحالة: ${statusLabels[filters.status]}`)
  }
  
  if (filters.hasDelay) {
    activeFilters.push(`⏰ فقط المتأخرة`)
  }
  
  if (filters.minDelayDays) {
    activeFilters.push(`⏰ حد أدنى للتأخير: ${filters.minDelayDays} يوم`)
  }
  
  if (filters.hasReturned !== undefined) {
    activeFilters.push(filters.hasReturned ? `✅ تم تسجيل العودة` : `🔓 لم يعد`)
  }
  
  if (filters.hasAllowance) {
    activeFilters.push(`💰 لها بدل نقدي`)
  }
  
  if (filters.allowanceSettled !== undefined) {
    activeFilters.push(filters.allowanceSettled ? `💵 مسواة` : `⏳ غير مسواة`)
  }
  
  if (activeFilters.length > 0) {
    message += activeFilters.join('\n') + '\n\n'
  } else {
    message += '_لا توجد فلاتر محددة_\n\n'
  }
  
  message += 'اختر فلتر للإضافة أو التعديل:'
  
  const keyboard = new InlineKeyboard()
    .text('📅 الفترة الزمنية', 'leaves:reports:filter:date').row()
    .text('👤 موظف محدد', 'leaves:reports:filter:employee').row()
    .text('💼 وظيفة', 'leaves:reports:filter:position').row()
    .text('🏢 قسم', 'leaves:reports:filter:department').row()
    .text('📋 نوع الإجازة', 'leaves:reports:filter:leave-type').row()
    .text('🔄 نوع التسوية', 'leaves:reports:filter:settlement-type').row()
    .text('✅ الحالة', 'leaves:reports:filter:status').row()
    .text('⏰ أيام التأخير', 'leaves:reports:filter:delay').row()
    .text('🔓 حالة العودة', 'leaves:reports:filter:return').row()
    .text('💰 التسويات النقدية', 'leaves:reports:filter:allowance').row()
  
  if (Object.keys(filters).length > 0) {
    keyboard.text('🗑️ مسح الفلاتر', 'leaves:reports:filters:clear').row()
  }
  
  keyboard
    .text('✅ إنشاء التقرير', 'leaves:reports:generate:custom').row()
    .text('🔙 رجوع', 'leaves:reports')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  })
}

/**
 * فلتر نوع التسوية
 */
feature.callbackQuery('leaves:reports:filter:settlement-type', logHandle('leaves-reports-filter-settlement'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('🏖️ فعلية', 'leaves:reports:filter:settlement:ACTUAL_LEAVE').row()
    .text('💰 نقدية', 'leaves:reports:filter:settlement:CASH_SETTLEMENT').row()
    .text('⏸️ مؤجلة', 'leaves:reports:filter:settlement:POSTPONED').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '🔄 **اختر نوع التسوية:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:settlement:(.+)$/, logHandle('leaves-reports-filter-settlement-select'), async (ctx) => {
  const type = ctx.match[1]
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  filters.settlementType = type
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد نوع التسوية')
  await showFiltersMenu(ctx)
})

/**
 * فلتر نوع الإجازة
 */
feature.callbackQuery('leaves:reports:filter:leave-type', logHandle('leaves-reports-filter-leave-type'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('اعتيادية', 'leaves:reports:filter:leavetype:REGULAR').row()
    .text('مرضية', 'leaves:reports:filter:leavetype:SICK').row()
    .text('عارضة', 'leaves:reports:filter:leavetype:EMERGENCY').row()
    .text('بدون مرتب', 'leaves:reports:filter:leavetype:UNPAID').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '📋 **اختر نوع الإجازة:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:leavetype:(.+)$/, logHandle('leaves-reports-filter-leavetype-select'), async (ctx) => {
  const type = ctx.match[1]
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  filters.leaveType = type
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد نوع الإجازة')
  await showFiltersMenu(ctx)
})

/**
 * فلتر الحالة
 */
feature.callbackQuery('leaves:reports:filter:status', logHandle('leaves-reports-filter-status'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('⏳ قيد الموافقة', 'leaves:reports:filter:stat:PENDING').row()
    .text('✅ موافق عليها', 'leaves:reports:filter:stat:APPROVED').row()
    .text('❌ مرفوضة', 'leaves:reports:filter:stat:REJECTED').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '✅ **اختر الحالة:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:stat:(.+)$/, logHandle('leaves-reports-filter-stat-select'), async (ctx) => {
  const status = ctx.match[1]
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  filters.status = status
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد الحالة')
  await showFiltersMenu(ctx)
})

/**
 * فلتر أيام التأخير
 */
feature.callbackQuery('leaves:reports:filter:delay', logHandle('leaves-reports-filter-delay'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('⏰ فقط المتأخرة', 'leaves:reports:filter:delay:any').row()
    .text('التأخير > يوم', 'leaves:reports:filter:delay:1').row()
    .text('التأخير > يومين', 'leaves:reports:filter:delay:2').row()
    .text('التأخير > 3 أيام', 'leaves:reports:filter:delay:3').row()
    .text('التأخير > 5 أيام', 'leaves:reports:filter:delay:5').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '⏰ **اختر فلتر التأخير:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:delay:(.+)$/, logHandle('leaves-reports-filter-delay-select'), async (ctx) => {
  const delay = ctx.match[1]
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  if (delay === 'any') {
    filters.hasDelay = true
    delete filters.minDelayDays
  } else {
    filters.hasDelay = true
    filters.minDelayDays = parseInt(delay)
  }
  
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد فلتر التأخير')
  await showFiltersMenu(ctx)
})

/**
 * فلتر حالة العودة
 */
feature.callbackQuery('leaves:reports:filter:return', logHandle('leaves-reports-filter-return'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('✅ تم تسجيل العودة', 'leaves:reports:filter:ret:true').row()
    .text('🔓 لم يعد', 'leaves:reports:filter:ret:false').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '🔓 **اختر حالة العودة:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:ret:(.+)$/, logHandle('leaves-reports-filter-ret-select'), async (ctx) => {
  const hasReturned = ctx.match[1] === 'true'
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  filters.hasReturned = hasReturned
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد حالة العودة')
  await showFiltersMenu(ctx)
})

/**
 * فلتر التسويات النقدية
 */
feature.callbackQuery('leaves:reports:filter:allowance', logHandle('leaves-reports-filter-allowance'), async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('💰 لها بدل نقدي', 'leaves:reports:filter:allow:has').row()
    .text('💵 المسواة فقط', 'leaves:reports:filter:allow:settled').row()
    .text('⏳ غير مسواة فقط', 'leaves:reports:filter:allow:unsettled').row()
    .text('🔙 رجوع', 'leaves:reports:filters:start')
  
  await ctx.editMessageText(
    '💰 **فلتر التسويات النقدية:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  )
})

feature.callbackQuery(/^leaves:reports:filter:allow:(.+)$/, logHandle('leaves-reports-filter-allow-select'), async (ctx) => {
  const allowanceType = ctx.match[1]
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  if (allowanceType === 'has') {
    filters.hasAllowance = true
    delete filters.allowanceSettled
  } else if (allowanceType === 'settled') {
    filters.hasAllowance = true
    filters.allowanceSettled = true
  } else if (allowanceType === 'unsettled') {
    filters.hasAllowance = true
    filters.allowanceSettled = false
  }
  
  filterStates.set(userId, filters)
  
  await ctx.answerCallbackQuery('✅ تم تحديد فلتر التسويات')
  await showFiltersMenu(ctx)
})

/**
 * مسح الفلاتر
 */
feature.callbackQuery('leaves:reports:filters:clear', logHandle('leaves-reports-filters-clear'), async (ctx) => {
  const userId = ctx.from.id
  filterStates.set(userId, {})
  
  await ctx.answerCallbackQuery('🗑️ تم مسح جميع الفلاتر')
  await showFiltersMenu(ctx)
})

/**
 * إنشاء تقرير شامل
 */
feature.callbackQuery('leaves:reports:generate:all', logHandle('leaves-reports-generate-all'), async (ctx) => {
  await ctx.answerCallbackQuery('⏳ جاري إنشاء التقرير...')
  await ctx.editMessageText('⏳ جاري إنشاء التقرير الشامل، الرجاء الانتظار...')
  
  await generateReport(ctx, {})
})

/**
 * إنشاء تقرير مخصص
 */
feature.callbackQuery('leaves:reports:generate:custom', logHandle('leaves-reports-generate-custom'), async (ctx) => {
  const userId = ctx.from.id
  const filters = filterStates.get(userId) || {}
  
  if (Object.keys(filters).length === 0) {
    await ctx.answerCallbackQuery({
      text: '⚠️ لم تحدد أي فلاتر!',
      show_alert: true
    })
    return
  }
  
  await ctx.answerCallbackQuery('⏳ جاري إنشاء التقرير...')
  await ctx.editMessageText('⏳ جاري إنشاء التقرير المخصص، الرجاء الانتظار...')
  
  await generateReport(ctx, filters)
})

/**
 * توليد التقرير وإرساله
 */
async function generateReport(ctx: Context, filters: LeavesReportFilters) {
  try {
    // جلب البيانات
    const leaves = await LeavesReportsService.getFilteredLeaves(filters)
    
    if (leaves.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'leaves:reports')
      
      await ctx.editMessageText(
        '⚠️ **لا توجد إجازات تطابق الفلاتر المحددة**\n\n' +
        'جرب تعديل الفلاتر أو اختيار فترة زمنية مختلفة.',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        }
      )
      return
    }
    
    // حساب الملخص
    const summary = LeavesReportsService.calculateSummary(leaves, filters)
    
    // إنشاء ملف Excel
    const buffer = await LeavesReportsService.generateExcelReport(leaves, summary, filters)
    
    // تنسيق الملخص للبوت
    const summaryMessage = LeavesReportsService.formatSummaryForBot(summary, filters)
    
    // إرسال الملخص
    await ctx.reply(summaryMessage, { parse_mode: 'Markdown' })
    
    // إرسال الملف
    const now = new Date()
    const filename = `تقرير_الإجازات_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`
    
    await ctx.replyWithDocument(
      new InputFile(buffer, filename),
      {
        caption: '📊 تقرير الإجازات الشامل\n\n' +
                 `📅 التاريخ: ${Calendar.formatArabic(now)}\n` +
                 `📋 عدد الإجازات: ${leaves.length}\n` +
                 `📄 عدد الصفحات: ${getSheetCount(summary)}`
      }
    )
    
    // مسح الفلاتر المؤقتة
    filterStates.delete(ctx.from!.id)
    
    // العودة للقائمة
    const keyboard = new InlineKeyboard()
      .text('📊 تقرير جديد', 'leaves:reports').row()
      .text('🔙 رجوع للإجازات', 'leaves:menu')
    
    await ctx.reply(
      '✅ **تم إنشاء التقرير بنجاح!**\n\n' +
      'هل تريد إنشاء تقرير آخر؟',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      }
    )
    
  } catch (error) {
    console.error('Error generating leaves report:', error)
    
    const keyboard = new InlineKeyboard()
      .text('🔄 إعادة المحاولة', 'leaves:reports').row()
      .text('🔙 رجوع', 'leaves:menu')
    
    await ctx.editMessageText(
      '❌ **حدث خطأ أثناء إنشاء التقرير**\n\n' +
      'الرجاء المحاولة مرة أخرى.',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      }
    )
  }
}

/**
 * حساب عدد الصفحات في التقرير
 */
function getSheetCount(summary: any): number {
  let count = 3 // الملخص + التفصيلية + التحليلات
  
  if (summary.actualLeaves > 0) count++
  if (summary.cashSettlements > 0) count++
  if (summary.leavesWithDelay > 0) count++
  
  return count
}
