import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export const summaryReportHandler = new Composer<Context>()

summaryReportHandler.callbackQuery('og:reports:summary', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const summary = await ReportsService.getInventorySummary('oils-greases')
  
  let message = '📊 **ملخص المخزون**\n\n'
  message += '📦 **إحصائيات عامة:**\n'
  message += `   • إجمالي الأصناف: **${summary.totalItems}** صنف\n`
  message += `   • القيمة الإجمالية: **${summary.totalValue.toFixed(2)}** جنيه\n\n`
  
  message += '⚠️ **التنبيهات:**\n'
  message += `   • نفدت الكمية: ${summary.outOfStock} صنف\n`
  message += `   • أقل من الحد الأدنى: ${summary.lowStock} صنف\n`
  
  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard()
      .text('⚠️ عرض التنبيهات', 'og:reports:alerts')
      .row()
      .text('💰 تقرير القيمة', 'og:reports:value')
      .row()
      .text('⬅️ رجوع', 'og:reports:menu'),
    parse_mode: 'Markdown',
  })
})
