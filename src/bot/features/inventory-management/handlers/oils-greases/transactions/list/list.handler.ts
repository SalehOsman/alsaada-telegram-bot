import { Composer, InlineKeyboard, InputFile } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { PurchaseReportService } from '../purchase/purchase-report.service.js'
import * as fs from 'node:fs/promises'

export const transactionsListHandler = new Composer<Context>()

// Main menu
transactionsListHandler.callbackQuery('og:trans:list', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showReportMenu(ctx)
})

// Export all
transactionsListHandler.callbackQuery('og:trans:report:all', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء التقرير...' })
  await generateAndSendReport(ctx, {})
})

// Filter by item
transactionsListHandler.callbackQuery('og:trans:report:by_item', async (ctx) => {
  await ctx.answerCallbackQuery()
  const items = await PurchaseReportService.getItems()
  
  const keyboard = new InlineKeyboard()
  for (const item of items) {
    keyboard.text(`${item.nameAr} (${item.code})`, `og:trans:report:item:${item.id}`).row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:list')
  
  await ctx.editMessageText(
    '📦 **اختر الصنف:**',
    { reply_markup: keyboard, parse_mode: 'Markdown' },
  )
})

// Generate report for specific item
transactionsListHandler.callbackQuery(/^og:trans:report:item:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء التقرير...' })
  const itemId = Number.parseInt(ctx.match![1], 10)
  await generateAndSendReport(ctx, { itemId })
})

// Filter by date
transactionsListHandler.callbackQuery('og:trans:report:by_date', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '📅 **فلترة حسب الفترة:**',
    {
      reply_markup: new InlineKeyboard()
        .text('📅 آخر 7 أيام', 'og:trans:report:date:7')
        .row()
        .text('📅 آخر 30 يوم', 'og:trans:report:date:30')
        .row()
        .text('📅 آخر 90 يوم', 'og:trans:report:date:90')
        .row()
        .text('📅 هذا الشهر', 'og:trans:report:date:month')
        .row()
        .text('📅 هذه السنة', 'og:trans:report:date:year')
        .row()
        .text('⬅️ رجوع', 'og:trans:list'),
      parse_mode: 'Markdown',
    },
  )
})

// Generate report by date range
transactionsListHandler.callbackQuery(/^og:trans:report:date:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء التقرير...' })
  const period = ctx.match![1]
  
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case '7':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(0)
  }
  
  await generateAndSendReport(ctx, { startDate, endDate: now })
})

async function showReportMenu(ctx: Context) {
  await ctx.editMessageText(
    '📊 **تقرير عمليات الشراء**\n\n'
    + 'اختر نوع التقرير:',
    {
      reply_markup: new InlineKeyboard()
        .text('📊 جميع العمليات', 'og:trans:report:all')
        .row()
        .text('📦 حسب الصنف', 'og:trans:report:by_item')
        .row()
        .text('📅 حسب الفترة', 'og:trans:report:by_date')
        .row()
        .text('⬅️ رجوع', 'og:reports:menu'),
      parse_mode: 'Markdown',
    },
  )
}

async function generateAndSendReport(
  ctx: Context,
  filters: { itemId?: number; startDate?: Date; endDate?: Date },
) {
  try {
    const { filePath, fileName, statistics } = await PurchaseReportService.exportToExcel(filters)
    
    let caption = '✅ **تقرير عمليات الشراء**\n\n'
    caption += `📄 **إحصائيات:**\n`
    caption += `   • عدد العمليات: ${statistics.totalPurchases}\n`
    caption += `   • إجمالي الكمية: ${statistics.totalQuantity}\n`
    caption += `   • إجمالي التكلفة: ${statistics.totalCost.toFixed(2)} جنيه\n`
    caption += `   • عدد الأصناف: ${statistics.uniqueItems}\n`
    caption += `   • عدد الموردين: ${statistics.uniqueSuppliers}\n\n`
    caption += `📂 **الملف يحتوي على:**\n`
    caption += `   • ملخص عام\n`
    caption += `   • جميع العمليات\n`
    caption += `   • تقرير حسب الصنف\n`
    caption += `   • تقرير حسب المورد`
    
    await ctx.replyWithDocument(new InputFile(filePath, fileName), {
      caption,
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📊 تقرير جديد', 'og:trans:list')
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
    })
    
    await fs.unlink(filePath)
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء إنشاء التقرير')
  }
}
