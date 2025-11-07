import type { Context } from '#root/bot/context.js'

import { logError } from '#root/bot/helpers/error-logger.js'

import { Database } from '#root/modules/database/index.js'
import { Composer } from 'grammy'

export const employeeSearchHandler = new Composer<Context>()

employeeSearchHandler.callbackQuery('hr:cycle:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.workLeaveCycle = { type: 'search', step: 'awaiting_name' }
  await ctx.editMessageText('أرسل اسم الموظف للبحث:', {
    reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: 'hr:work_leave_cycle:main' }]] },
  })
})

employeeSearchHandler.on('message:text', async (ctx, next) => {
  const s = ctx.session.workLeaveCycle
  if (!s || s.type !== 'search' || s.step !== 'awaiting_name') {
    return next()
  }

  const query = ctx.message.text.trim()
  if (!query) {
    await ctx.reply('❌ أدخل اسم صحيح')
    return
  }

  try {
    const employees: any = await Database.prisma.employee.findMany({
      where: {
        isActive: true,
        fullName: { contains: query },
      },
      take: 15,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        workDaysPerCycle: true,
        leaveDaysPerCycle: true,
        hasCustomCycle: true,
        position: { select: { titleAr: true } },
      },
    })

    if (employees.length === 0) {
      await ctx.reply('❌ لم يتم العثور على موظفين')
      delete ctx.session.workLeaveCycle
      return
    }

    const keyboard: any[][] = []
    for (const emp of employees) {
      const cycle = `${emp.workDaysPerCycle ?? '؟'}/${emp.leaveDaysPerCycle ?? '؟'}`
      const customIcon = emp.hasCustomCycle ? ' 🔧' : ''
      keyboard.push([{
        text: `${emp.fullName} - ${emp.position.titleAr} (${cycle})${customIcon}`,
        callback_data: `hr:cycle:employee:view:${emp.id}`,
      }])
    }
    keyboard.push([{ text: '🔙 رجوع', callback_data: 'hr:work_leave_cycle:main' }])

    delete ctx.session.workLeaveCycle
    await ctx.reply(`✅ نتائج البحث (${employees.length}):`, {
      reply_markup: { inline_keyboard: keyboard },
    })
  }
  catch (error) {
    await logError(ctx, error, 'employeeSearchHandler:text')
    delete ctx.session.workLeaveCycle
  }
})
