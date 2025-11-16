import { Composer, InlineKeyboard, InputFile } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ExcelExportService } from '#root/modules/services/inventory/shared/excel-export.service.js'
import * as fs from 'node:fs/promises'

export const exportReportHandler = new Composer<Context>()

exportReportHandler.callbackQuery('og:reports:export', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري تصدير البيانات...' })
  
  try {
    const { filePath, fileName, count } = await ExcelExportService.exportItems('oils-greases', [])
    
    await ctx.replyWithDocument(new InputFile(filePath, fileName), {
      caption: `✅ تم تصدير ${count} صنف بنجاح\n📄 الملف: ${fileName}`,
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:reports:menu'),
    })
    
    await fs.unlink(filePath)
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء التصدير')
  }
})
