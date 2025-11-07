import type { Context } from '#root/bot/context.js'

import { logError } from '#root/bot/helpers/error-logger.js'

import { Database } from '#root/modules/database/index.js'
import { Composer } from 'grammy'

export const positionCyclesHandler = new Composer<Context>()

positionCyclesHandler.callbackQuery('hr:cycle:positions:list', async (ctx) => {
  await ctx.answerCallbackQuery()
  try {
    const positions: any = await Database.prisma.position.findMany({
      where: { isActive: true },
      orderBy: [{ department: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      include: {
        department: { select: { name: true } },
        _count: { select: { employees: { where: { isActive: true, employmentStatus: { in: ['ACTIVE', 'ON_LEAVE', 'ON_MISSION'] } } } } },
      },
    })

    const keyboard: any[][] = []
    for (let i = 0; i < positions.length; i += 2) {
      const row: any[] = []
      for (let j = i; j < Math.min(i + 2, positions.length); j++) {
        const pos = positions[j]
        row.push({
          text: `${pos.titleAr} (${pos.defaultWorkDaysPerCycle || '؟'}/${pos.defaultLeaveDaysPerCycle || '؟'}) [${pos._count.employees}]`,
          callback_data: `hr:cycle:position:view:${pos.id}`,
        })
      }
      keyboard.push(row)
    }
    keyboard.push([{ text: '🔙 رجوع', callback_data: 'hr:work_leave_cycle:main' }])

    await ctx.editMessageText(
      '🏢 *قائمة الوظائف*\n\n'
      + 'اختر وظيفة للتفاصيل:',
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } },
    )
  }
  catch (error) {
    await logError(ctx, error, 'positionCyclesHandler:list')
  }
})

positionCyclesHandler.callbackQuery(/^hr:cycle:position:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const positionId = Number.parseInt(ctx.match[1])
  try {
    const position: any = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        department: { select: { name: true } },
        employees: {
          where: { isActive: true, employmentStatus: { in: ['ACTIVE', 'ON_LEAVE', 'ON_MISSION'] } },
          select: { hasCustomCycle: true },
        },
      },
    })

    const total = position.employees.length
    const custom = position.employees.filter((e: any) => e.hasCustomCycle).length

    await ctx.editMessageText(
      `🏢 *${position.titleAr}*\n\n`
      + `أيام العمل: ${position.defaultWorkDaysPerCycle || 'غير محدد'}\n`
      + `أيام الإجازة: ${position.defaultLeaveDaysPerCycle || 'غير محدد'}\n\n`
      + `👥 الموظفون: ${total} (مخصص: ${custom})`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✏️ تعديل', callback_data: `hr:cycle:position:edit:${positionId}` }],
            [{ text: '🔙 رجوع', callback_data: 'hr:cycle:positions:list' }],
          ],
        },
      },
    )
  }
  catch (error) {
    await logError(ctx, error, 'positionCyclesHandler:view')
  }
})

positionCyclesHandler.callbackQuery(/^hr:cycle:position:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const positionId = Number.parseInt(ctx.match[1])
  await ctx.editMessageText(
    'اختر الحقل:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 أيام العمل', callback_data: `hr:cycle:position:field:${positionId}:work` }],
          [{ text: '🏖️ أيام الإجازة', callback_data: `hr:cycle:position:field:${positionId}:leave` }],
          [{ text: '🔙 رجوع', callback_data: `hr:cycle:position:view:${positionId}` }],
        ],
      },
    },
  )
})

positionCyclesHandler.callbackQuery(/^hr:cycle:position:field:(\d+):(work|leave)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.workLeaveCycle = {
    type: 'position',
    entityId: Number.parseInt(ctx.match[1]),
    fieldType: ctx.match[2] as 'work' | 'leave',
    step: 'awaiting_value',
  }
  await ctx.editMessageText('أرسل القيمة (رقم صحيح موجب):', {
    reply_markup: { inline_keyboard: [[{ text: '❌ إلغاء', callback_data: `hr:cycle:position:view:${ctx.match[1]}` }]] },
  })
})

positionCyclesHandler.on('message:text', async (ctx, next) => {
  const s = ctx.session.workLeaveCycle
  if (!s || s.type !== 'position' || s.step !== 'awaiting_value') {
    return next()
  }

  const value = Number.parseInt(ctx.message.text.trim())
  if (Number.isNaN(value) || value <= 0) {
    await ctx.reply('❌ أدخل رقم صحيح موجب')
    return
  }

  try {
    const position: any = await Database.prisma.position.findUnique({
      where: { id: s.entityId! },
      select: { titleAr: true, defaultWorkDaysPerCycle: true, defaultLeaveDaysPerCycle: true },
    })

    await Database.prisma.position.update({
      where: { id: s.entityId! },
      data: s.fieldType === 'work' ? { defaultWorkDaysPerCycle: value } : { defaultLeaveDaysPerCycle: value },
    })

    await Database.prisma.hR_CycleChangeLog.create({
      data: {
        entityType: 'Position',
        entityId: s.entityId!,
        oldWorkDays: position.defaultWorkDaysPerCycle,
        oldLeaveDays: position.defaultLeaveDaysPerCycle,
        newWorkDays: s.fieldType === 'work' ? value : position.defaultWorkDaysPerCycle,
        newLeaveDays: s.fieldType === 'leave' ? value : position.defaultLeaveDaysPerCycle,
        changedBy: BigInt(ctx.from!.id),
      },
    })

    delete ctx.session.workLeaveCycle
    await ctx.reply(`✅ تم التحديث\n${position.titleAr}`, {
      reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `hr:cycle:position:view:${s.entityId}` }]] },
    })
  }
  catch (error) {
    await logError(ctx, error, 'positionCyclesHandler:text')
    delete ctx.session.workLeaveCycle
  }
})
