import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export const valueReportHandler = new Composer<Context>()

valueReportHandler.callbackQuery('og:reports:value', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const [byCategory, byLocation, summary] = await Promise.all([
    ReportsService.getValueByCategory('oils-greases'),
    ReportsService.getValueByLocation('oils-greases'),
    ReportsService.getInventorySummary('oils-greases'),
  ])
  
  let message = '💰 **تقرير القيمة المالية**\n\n'
  message += `📊 **القيمة الإجمالية:** ${summary.totalValue.toFixed(2)} جنيه\n\n`
  
  if (byCategory.length > 0) {
    message += '🏷️ **حسب الفئة:**\n'
    byCategory.forEach(cat => {
      message += `   • ${cat.name}: ${cat.value.toFixed(2)} جنيه (${cat.count} صنف)\n`
    })
    message += '\n'
  }
  
  if (byLocation.length > 0) {
    message += '📍 **حسب الموقع:**\n'
    byLocation.forEach(loc => {
      message += `   • ${loc.name}: ${loc.value.toFixed(2)} جنيه (${loc.count} صنف)\n`
    })
  }
  
  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:reports:menu'),
    parse_mode: 'Markdown',
  })
})
