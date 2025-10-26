import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesHandler = new Composer<Context>()

// قائمة الإجازات
leavesHandler.callbackQuery('leaves:list', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '📋 **قائمة الإجازات**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// تسجيل عودة
leavesHandler.callbackQuery('leaves:return', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '↩️ **تسجيل عودة من إجازة**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// جدول أدوار الإجازات
leavesHandler.callbackQuery('leaves:schedule', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '🔄 **جدول أدوار الإجازات**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// عرض إجازات عامل
leavesHandler.callbackQuery('leaves:employee', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '👤 **عرض إجازات عامل**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// تأجيل إجازة
leavesHandler.callbackQuery('leaves:postpone', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '⏸️ **تأجيل إجازة**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// صرف بدل إجازة
leavesHandler.callbackQuery('leaves:allowance', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '💰 **صرف بدل إجازة**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
})

// المأموريات
leavesHandler.callbackQuery('missions:main', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '✈️ **المأموريات**\n\n⏳ الوظيفة قيد التطوير...',
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler')
    }
  )
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
