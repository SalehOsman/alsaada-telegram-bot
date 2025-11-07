/**
 * Work & Leave Cycle Management Feature
 * إدارة دورة العمل والإجازات
 */

import type { Context } from '#root/bot/context.js'
import { Composer } from 'grammy'
import { checkHRAccess } from '../../middleware/permissions.middleware.js'

import { employeeCycleEditHandler } from './employee-edit.handler.js'
import { employeeCyclesHandler } from './employees.handler.js'
import { exportCyclesHandler } from './export.handler.js'
// Import sub-handlers
import { positionCyclesHandler } from './positions.handler.js'
import { employeeSearchHandler } from './search.handler.js'

export const workLeaveCycleHandler = new Composer<Context>()

// Apply HR access middleware
workLeaveCycleHandler.use(checkHRAccess)

/**
 * Main Menu Handler
 */
workLeaveCycleHandler.callbackQuery('hr:work_leave_cycle:main', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = {
    inline_keyboard: [
      [{ text: '🏢 إدارة دورات الوظائف', callback_data: 'hr:cycle:positions:list' }],
      [{ text: '👤 إدارة دورات الموظفين', callback_data: 'hr:cycle:employees:menu' }],
      [{ text: '📊 تصدير تقرير Excel', callback_data: 'hr:cycle:export' }],
      [{ text: '🔙 رجوع', callback_data: 'hr:section:manage' }],
    ],
  }

  await ctx.editMessageText(
    '📋 *إدارة دورة العمل والإجازات*\n\n'
    + '🏢 *الوظائف*: تعديل القيم الافتراضية (للموظفين الجدد فقط)\n'
    + '👤 *الموظفين*: تعديل دورات موظف معين (يمكن أن تختلف)\n'
    + '📊 *التقارير*: تصدير بيانات جميع الموظفين',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

/**
 * Employees Menu Handler
 */
workLeaveCycleHandler.callbackQuery('hr:cycle:employees:menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText(
    '👤 *إدارة دورات الموظفين*\n\n'
    + 'اختر طريقة العرض:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 جميع الموظفين', callback_data: 'hr:cycle:employees:all' }],
          [{ text: '✅ افتراضي فقط', callback_data: 'hr:cycle:employees:default' }],
          [{ text: '🔧 مخصص فقط', callback_data: 'hr:cycle:employees:custom' }],
          [{ text: '❌ غير محدد', callback_data: 'hr:cycle:employees:none' }],
          [{ text: '🔍 بحث بالاسم', callback_data: 'hr:cycle:search' }],
          [{ text: '🔙 رجوع', callback_data: 'hr:work_leave_cycle:main' }],
        ],
      },
    },
  )
})

// Register sub-handlers (text handlers first!)
workLeaveCycleHandler.use(positionCyclesHandler)
workLeaveCycleHandler.use(employeeCycleEditHandler)
workLeaveCycleHandler.use(employeeSearchHandler)
workLeaveCycleHandler.use(employeeCyclesHandler)
workLeaveCycleHandler.use(exportCyclesHandler)
