/**
 * Handler القائمة الرئيسية للمأموريات
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { missionsAddHandler } from './missions-add.handler.js'
import { missionsListHandler } from './missions-list.handler.js'
import { missionsReturnHandler } from './missions-return.handler.js'
import { missionsEmployeeHandler } from './missions-employee.handler.js'

export const missionsHandler = new Composer<Context>()

// تسجيل الـ handlers الفرعية
missionsHandler.use(missionsAddHandler)
missionsHandler.use(missionsListHandler)
missionsHandler.use(missionsReturnHandler)
missionsHandler.use(missionsEmployeeHandler)

missionsHandler.callbackQuery('missions:main', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('📝 تسجيل مأمورية جديدة', 'missions:add')
    .row()
    .text('📋 قائمة المأموريات', 'missions:list')
    .text('↩️ تسجيل عودة', 'missions:return')
    .row()
    .text('👤 عرض مأموريات عامل', 'missions:employee')
    .row()
    .text('⬅️ رجوع', 'leavesHandler')

  await ctx.editMessageText(
    '✈️ **المأموريات والعمل من الخارج**\n\n' +
    'اختر الوظيفة المطلوبة:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  )
})

// تم إزالة الـ handlers المؤقتة لأن كل الوظائف أصبحت جاهزة
