import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const employeesListHandler = new Composer<Context>()

// Pattern من handler name (MenuBuilder يستخدمه)
employeesListHandler.callbackQuery('employeesListHandler', async (ctx) => {
  await handleEmployeesList(ctx)
})

// Pattern من MenuBuilder (الصيغة القياسية)
employeesListHandler.callbackQuery(/^menu:sub:hr-management:employees-list$/, async (ctx) => {
  await handleEmployeesList(ctx)
})

async function handleEmployeesList(ctx: Context) {
  await ctx.answerCallbackQuery()

  // معالجة MODERATOR
  const dbRole = ctx.dbUser?.role ?? 'GUEST'
  const userRole = dbRole === 'MODERATOR' ? 'USER' : dbRole

  const keyboard = new InlineKeyboard()

  // Main filter options
  keyboard
    .text('🏢 حسب القسم', 'filter:by-department')
    .text('📍 حسب المحافظة', 'filter:by-governorate')
    .row()
    .text('💼 حسب الوظيفة', 'filter:by-position')
    .text('📊 حسب حالة العمل', 'filter:by-status')
    .row()
    .text('👥 عرض جميع العاملين', 'filter:all')
    .row()
    .text('📥 تصدير الكل Excel', 'export:all-employees')
    .row()

  // خيار إضافة عامل جديد (ADMIN و SUPER_ADMIN فقط)
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    keyboard.text('➕ إضافة عامل جديد', 'hr:employees:add').row()
  }

  // خيار عرض العاملين السابقين (ADMIN و SUPER_ADMIN فقط)
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    keyboard.text('📂 عرض العاملين السابقين', 'hr:employees:view-previous').row()
  }

  keyboard.text('⬅️ رجوع', 'menu:feature:hr-management')

  await ctx.editMessageText(
    '📋 **قوائم العاملين**\n\n'
    + '🔍 **تصفية وعرض العاملين:**\n\n'
    + '• **حسب القسم** - عرض العاملين حسب القسم مع الإحصائيات\n'
    + '• **حسب المحافظة** - عرض العاملين حسب الموقع الجغرافي\n'
    + '• **حسب الوظيفة** - عرض العاملين حسب المسمى الوظيفي\n'
    + '• **حسب حالة العمل** - نشط، في إجازة، موقوف، إلخ\n'
    + '• **الكل** - عرض جميع العاملين النشطين\n\n'
    + '📥 **تصدير البيانات:** يمكنك تصدير أي قائمة إلى Excel',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
}
