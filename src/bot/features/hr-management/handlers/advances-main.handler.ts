import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const advancesHandler = new Composer<Context>()

// Pattern من handler name (MenuBuilder يستخدمه)
advancesHandler.callbackQuery('advancesHandler', async (ctx) => {
  await handleAdvances(ctx)
})

// Pattern من MenuBuilder (الصيغة القياسية)
advancesHandler.callbackQuery(/^menu:sub:hr-management:advances$/, async (ctx) => {
  await handleAdvances(ctx)
})

async function handleAdvances(ctx: Context) {
  await ctx.answerCallbackQuery()

  const isSuperAdmin = ctx.dbUser?.role === 'SUPER_ADMIN'

  const keyboard = new InlineKeyboard()
    .text('➕ تسجيل عملية جديدة', 'hr:transactions:new')
    .row()
    .text('📊 عرض عمليات عامل', 'hr:transactions:view')
    .row()
    .text('📈 تقارير العمليات', 'hr:transactions:reports')
    .row()

  // خيارات السوبر أدمين فقط
  if (isSuperAdmin) {
    keyboard
      .text('⚙️ إدارة الأصناف العينية', 'hr:transactions:items')
      .row()
      .text('✅ التسويات', 'hr:transactions:settlements')
      .row()
  }

  keyboard.text('⬅️ رجوع', 'menu:feature:hr-management')

  await ctx.editMessageText(
    '💰 **السلف والمسحوبات**\n\n'
    + 'إدارة السلف المالية والمسحوبات العينية\n\n'
    + 'اختر من الخيارات التالية:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
}
