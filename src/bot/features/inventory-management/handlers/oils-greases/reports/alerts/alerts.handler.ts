import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export const alertsReportHandler = new Composer<Context>()

alertsReportHandler.callbackQuery('og:reports:alerts', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const [lowStock, outOfStock] = await Promise.all([
    ReportsService.getLowStockItems('oils-greases'),
    ReportsService.getOutOfStockItems('oils-greases'),
  ])
  
  let message = '⚠️ **تنبيهات المخزون**\n\n'
  
  if (outOfStock.length > 0) {
    message += '🔴 **نفذت الكمية** (${outOfStock.length} صنف):\n'
    outOfStock.slice(0, 5).forEach(item => {
      message += `   • ${item.nameAr} (${item.code})\n`
    })
    if (outOfStock.length > 5) message += `   ... و ${outOfStock.length - 5} أصناف أخرى\n`
    message += '\n'
  }
  
  if (lowStock.length > 0) {
    message += `🟡 **أقل من الحد الأدنى** (${lowStock.length} صنف):\n`
    lowStock.slice(0, 5).forEach(item => {
      message += `   • ${item.nameAr}: ${item.quantity}/${item.minQuantity} ${item.unit}\n`
    })
    if (lowStock.length > 5) message += `   ... و ${lowStock.length - 5} أصناف أخرى\n`
  }
  
  if (lowStock.length === 0 && outOfStock.length === 0) {
    message += '✅ **لا توجد تنبيهات**\n\nجميع الأصناف ضمن المستوى الطبيعي'
  }
  
  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:reports:menu'),
    parse_mode: 'Markdown',
  })
})
