import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesHandler = new Composer<Context>()

// تسجيل إجازة جديدة
leavesHandler.callbackQuery('leaves:add', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة العاملين...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-add.handler.ts
})

// قائمة الإجازات
leavesHandler.callbackQuery('leaves:list', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة الإجازات...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-list.handler.ts
})

// تسجيل عودة
leavesHandler.callbackQuery('leaves:return', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل الإجازات النشطة...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-return.handler.ts
})

// جدول أدوار الإجازات
leavesHandler.callbackQuery('leaves:schedule', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل جدول الأدوار...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-schedule.handler.ts
})

// عرض إجازات عامل
leavesHandler.callbackQuery('leaves:employee', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة العاملين...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-employee.handler.ts
})

// تأجيل إجازة
leavesHandler.callbackQuery('leaves:postpone', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة العاملين...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-postpone.handler.ts
})

// صرف بدل إجازة
leavesHandler.callbackQuery('leaves:allowance', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة العاملين...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في leaves-allowance.handler.ts
})

// المأموريات
leavesHandler.callbackQuery('missions:main', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏳ جاري تحميل قائمة المأموريات...',
    { parse_mode: 'Markdown' }
  )
  // سيتم التنفيذ في missions.handler.ts
})

// Pattern من handler name (MenuBuilder يستخدمه)
leavesHandler.callbackQuery('leavesHandler', async (ctx) => {
  await handleLeaves(ctx)
})

// Pattern من MenuBuilder (الصيغة القياسية)
leavesHandler.callbackQuery(/^menu:sub:hr-management:leaves$/, async (ctx) => {
  await handleLeaves(ctx)
})

async function handleLeaves(ctx: Context) {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('📝 تسجيل إجازة جديدة', 'leaves:add')
    .row()
    .text('📋 قائمة الإجازات', 'leaves:list')
    .text('↩️ تسجيل عودة', 'leaves:return')
    .row()
    .text('🔄 جدول أدوار الإجازات', 'leaves:schedule')
    .row()
    .text('👤 عرض إجازات عامل', 'leaves:employee')
    .row()
    .text('⏸️ تأجيل إجازة', 'leaves:postpone')
    .text('💰 صرف بدل إجازة', 'leaves:allowance')
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
