import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const viewPreviousEmployeesHandler = new Composer<Context>()

viewPreviousEmployeesHandler.callbackQuery('hr:employees:view-previous', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const keyboard = new InlineKeyboard()
      .text('🏢 حسب القسم', 'filter:prev:by-department')
      .text('📍 حسب المحافظة', 'filter:prev:by-governorate')
      .row()
      .text('💼 حسب الوظيفة', 'filter:prev:by-position')
      .text('📊 حسب سبب الخروج', 'filter:prev:by-exit-reason')
      .row()
      .text('👥 عرض جميع العاملين السابقين', 'filter:prev:all')
      .row()
      .text('📥 تصدير الكل Excel', 'export:previous-all')
      .row()
      .text('⬅️ رجوع', 'employeesListHandler')

    await ctx.editMessageText(
      '📂 **العاملين السابقين**\n\n'
      + '🔍 **تصفية وعرض العاملين السابقين:**\n\n'
      + '• **حسب القسم** - عرض العاملين السابقين حسب القسم\n'
      + '• **حسب المحافظة** - عرض العاملين السابقين حسب الموقع\n'
      + '• **حسب الوظيفة** - عرض العاملين السابقين حسب المسمى الوظيفي\n'
      + '• **حسب سبب الخروج** - استقالة، فصل، تقاعد، إلخ\n'
      + '• **الكل** - عرض جميع العاملين السابقين\n\n'
      + '📥 **تصدير البيانات:** يمكنك تصدير أي قائمة إلى Excel',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})
