import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesHandler = new Composer<Context>()

// Pattern من handler name (MenuBuilder يستخدمه)
leavesHandler.callbackQuery('leavesHandler', async (ctx) => {
  await handleLeaves(ctx)
})

// Pattern من MenuBuilder (الصيغة القياسية)
leavesHandler.callbackQuery(/^menu:sub:hr-management:leaves$/, async (ctx) => {
  await handleLeaves(ctx)
})

// Pattern للرجوع من التقارير
leavesHandler.callbackQuery('leaves:menu', async (ctx) => {
  await handleLeaves(ctx)
})

async function handleLeaves(ctx: Context) {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📝 تسجيل إجازة جديدة', 'leaves:add')
    .row()
    .text('↩️ تسجيل عودة', 'leaves:return')
    .row()
    .text('📋 قائمة الإجازات', 'leaves:list')
    .row()
    .text('💰 التسويات النقدية', 'leaves:cash-settlements')
    .row()
    .text('🔄 جدول أدوار الإجازات', 'leaves:schedule')
    .row()
    .text('👤 عرض إجازات عامل', 'leaves:employee')
    .row()
    .text('📊 التقارير والإحصائيات', 'leaves:reports')
    .row()
    .text('✈️ المأموريات', 'missions:main')
    .row()
    .text('⬅️ رجوع', 'menu:feature:hr-management')

  const message = `🏖️ **الإجازات والمأموريات**\n\n`
    + `اختر الوظيفة المطلوبة:`

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}
