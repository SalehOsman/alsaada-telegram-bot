import type { Context } from '#root/bot/context.js'

import { logError } from '#root/bot/helpers/error-logger.js'

import { Database } from '#root/modules/database/index.js'
import { Composer } from 'grammy'

export const employeeCycleEditHandler = new Composer<Context>()

employeeCycleEditHandler.callbackQuery(/^hr:cycle:employee:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const employeeId = Number.parseInt(ctx.match[1])
  await ctx.editMessageText(
    'اختر الحقل:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 أيام العمل', callback_data: `hr:cycle:employee:field:${employeeId}:work` }],
          [{ text: '🏖️ أيام الإجازة', callback_data: `hr:cycle:employee:field:${employeeId}:leave` }],
          [{ text: '🔙 رجوع', callback_data: `hr:cycle:employee:view:${employeeId}` }],
        ],
      },
    },
  )
})

employeeCycleEditHandler.callbackQuery(/^hr:cycle:employee:field:(\d+):(work|leave)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.workLeaveCycle = {
    type: 'employee',
    entityId: Number.parseInt(ctx.match[1]),
    fieldType: ctx.match[2] as 'work' | 'leave',
    step: 'awaiting_value',
  }
  await ctx.editMessageText('أرسل القيمة (رقم صحيح موجب):', {
    reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: `hr:cycle:employee:view:${ctx.match[1]}` }]] },
  })
})

employeeCycleEditHandler.on('message:text', async (ctx, next) => {
  const s = ctx.session.workLeaveCycle
  if (!s || s.type !== 'employee' || s.step !== 'awaiting_value') {
    return next()
  }

  const value = Number.parseInt(ctx.message.text.trim())
  if (Number.isNaN(value) || value <= 0) {
    await ctx.reply('❌ أدخل رقم صحيح موجب')
    return
  }

  try {
    const employee: any = await Database.prisma.employee.findUnique({
      where: { id: s.entityId! },
      select: { fullName: true, workDaysPerCycle: true, leaveDaysPerCycle: true },
    })

    await Database.prisma.employee.update({
      where: { id: s.entityId! },
      data: {
        ...(s.fieldType === 'work' ? { workDaysPerCycle: value } : { leaveDaysPerCycle: value }),
        hasCustomCycle: true,
      },
    })

    await Database.prisma.hR_CycleChangeLog.create({
      data: {
        entityType: 'Employee',
        entityId: s.entityId!,
        oldWorkDays: employee.workDaysPerCycle,
        oldLeaveDays: employee.leaveDaysPerCycle,
        newWorkDays: s.fieldType === 'work' ? value : employee.workDaysPerCycle,
        newLeaveDays: s.fieldType === 'leave' ? value : employee.leaveDaysPerCycle,
        changedBy: BigInt(ctx.from!.id),
      },
    })

    delete ctx.session.workLeaveCycle
    await ctx.reply(`✅ تم التحديث\n${employee.fullName}`, {
      reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `hr:cycle:employee:view:${s.entityId}` }]] },
    })
  }
  catch (error) {
    await logError(ctx, error, 'employeeCycleEditHandler:text')
    delete ctx.session.workLeaveCycle
  }
})
