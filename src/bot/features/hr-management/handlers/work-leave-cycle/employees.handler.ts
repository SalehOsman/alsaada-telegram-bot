import type { Context } from '#root/bot/context.js'

import { logError } from '#root/bot/helpers/error-logger.js'

import { Database } from '#root/modules/database/index.js'
import { Composer } from 'grammy'

export const employeeCyclesHandler = new Composer<Context>()

employeeCyclesHandler.callbackQuery(/^hr:cycle:employees:(all|default|custom|none)(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const filter = ctx.match[1]
  const page = Number.parseInt(ctx.match[2] || '1')
  const limit = 8

  try {
    const where: any = { isActive: true }
    if (filter === 'default') {
      where.hasCustomCycle = false
    }
    else if (filter === 'custom') {
      where.hasCustomCycle = true
    }
    else if (filter === 'none') {
      where.OR = [
        { workDaysPerCycle: null },
        { leaveDaysPerCycle: null },
      ]
    }

    const [total, employees]: any = await Promise.all([
      Database.prisma.employee.count({ where }),
      Database.prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: {
          position: { select: { titleAr: true, defaultWorkDaysPerCycle: true, defaultLeaveDaysPerCycle: true } },
        },
      }),
    ])

    const keyboard: any[][] = []
    for (const emp of employees) {
      const cycle = `${emp.workDaysPerCycle ?? '؟'}/${emp.leaveDaysPerCycle ?? '؟'}`
      const customIcon = emp.hasCustomCycle ? ' 🔧' : ''
      keyboard.push([{
        text: `${emp.fullName} - ${emp.position.titleAr} (${cycle})${customIcon}`,
        callback_data: `hr:cycle:employee:view:${emp.id}`,
      }])
    }

    const navRow: any[] = []
    if (page > 1) {
      navRow.push({ text: '⬅️', callback_data: `hr:cycle:employees:${filter}:${page - 1}` })
    }
    if (total > page * limit) {
      navRow.push({ text: '➡️', callback_data: `hr:cycle:employees:${filter}:${page + 1}` })
    }
    if (navRow.length) {
      keyboard.push(navRow)
    }

    keyboard.push([{ text: '🔙 رجوع', callback_data: 'hr:work_leave_cycle:main' }])

    await ctx.editMessageText(
      `👥 *الموظفون (${filter})*\n\n`
      + `الصفحة ${page} من ${Math.ceil(total / limit)}`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } },
    )
  }
  catch (error) {
    await logError(ctx, error, 'employeeCyclesHandler:list')
  }
})

employeeCyclesHandler.callbackQuery(/^hr:cycle:employee:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const employeeId = Number.parseInt(ctx.match[1])
  try {
    const employee: any = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: { select: { titleAr: true, defaultWorkDaysPerCycle: true, defaultLeaveDaysPerCycle: true } },
      },
    })

    await ctx.editMessageText(
      `👤 *${employee.fullName}*\n\n`
      + `الوظيفة: ${employee.position.titleAr}\n`
      + `أيام العمل: ${employee.workDaysPerCycle ?? 'غير محدد'}\n`
      + `أيام الإجازة: ${employee.leaveDaysPerCycle ?? 'غير محدد'}\n`
      + `مخصص: ${employee.hasCustomCycle ? 'نعم 🔧' : 'لا'}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✏️ تعديل', callback_data: `hr:cycle:employee:edit:${employeeId}` }],
            [{ text: '🔄 استعادة الافتراضي', callback_data: `hr:cycle:employee:reset:${employeeId}` }],
            [{ text: '🔙 رجوع', callback_data: 'hr:cycle:employees:all' }],
          ],
        },
      },
    )
  }
  catch (error) {
    await logError(ctx, error, 'employeeCyclesHandler:view')
  }
})

employeeCyclesHandler.callbackQuery(/^hr:cycle:employee:reset:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const employeeId = Number.parseInt(ctx.match[1])
  try {
    const employee: any = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: { select: { titleAr: true, defaultWorkDaysPerCycle: true, defaultLeaveDaysPerCycle: true } } },
    })

    if (!employee) {
      await ctx.editMessageText('❌ الموظف غير موجود')
      return
    }

    // Check if position has default values
    const hasDefaults = employee.position.defaultWorkDaysPerCycle !== null
      || employee.position.defaultLeaveDaysPerCycle !== null

    if (!hasDefaults) {
      await ctx.editMessageText(
        `⚠️ *الوظيفة لا تحتوي على قيم افتراضية*\n\n`
        + `الوظيفة: ${employee.position.titleAr}\n\n`
        + `يجب أولاً تحديد القيم الافتراضية للوظيفة من قائمة "إدارة دورات الوظائف"`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 رجوع', callback_data: `hr:cycle:employee:view:${employeeId}` }],
            ],
          },
        },
      )
      return
    }

    await Database.prisma.employee.update({
      where: { id: employeeId },
      data: {
        workDaysPerCycle: employee.position.defaultWorkDaysPerCycle,
        leaveDaysPerCycle: employee.position.defaultLeaveDaysPerCycle,
        hasCustomCycle: false,
      },
    })

    await Database.prisma.hR_CycleChangeLog.create({
      data: {
        entityType: 'Employee',
        entityId: employeeId,
        oldWorkDays: employee.workDaysPerCycle,
        oldLeaveDays: employee.leaveDaysPerCycle,
        newWorkDays: employee.position.defaultWorkDaysPerCycle,
        newLeaveDays: employee.position.defaultLeaveDaysPerCycle,
        changedBy: BigInt(ctx.from!.id),
        reason: 'Reset to position defaults',
      },
    })

    await ctx.editMessageText(
      `✅ *تمت استعادة الإعدادات الافتراضية*\n\n`
      + `أيام العمل: ${employee.position.defaultWorkDaysPerCycle ?? 'غير محدد'}\n`
      + `أيام الإجازة: ${employee.position.defaultLeaveDaysPerCycle ?? 'غير محدد'}`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `hr:cycle:employee:view:${employeeId}` }]] },
      },
    )
  }
  catch (error) {
    await logError(ctx, error, 'employeeCyclesHandler:reset')
  }
})
