import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesScheduleFiltersHandler = new Composer<Context>()

// فلتر حسب الوظيفة
leavesScheduleFiltersHandler.callbackQuery(/^leaves:schedule:filter:position(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  const positions = await Database.prisma.position.findMany({
    where: { isActive: true },
    orderBy: { titleAr: 'asc' },
    skip: page * pageSize,
    take: pageSize,
  })

  const total = await Database.prisma.position.count({ where: { isActive: true } })

  const keyboard = new InlineKeyboard()
  positions.forEach((pos) => {
    keyboard.text(pos.titleAr, `leaves:schedule:bypos:${pos.id}`).row()
  })

  const totalPages = Math.ceil(total / pageSize)
  if (totalPages > 1) {
    const navButtons = []
    if (page > 0)
      navButtons.push(InlineKeyboard.text('◀️', `leaves:schedule:filter:position:${page - 1}`))
    navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:schedule:filter:position:0'))
    if (page < totalPages - 1)
      navButtons.push(InlineKeyboard.text('▶️', `leaves:schedule:filter:position:${page + 1}`))
    keyboard.row(...navButtons)
  }

  keyboard.row().text('⬅️ رجوع', 'leaves:schedule')

  await ctx.editMessageText('👔 **اختر الوظيفة:**', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// فلتر حسب المحافظة
leavesScheduleFiltersHandler.callbackQuery(/^leaves:schedule:filter:gov(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  const governorates = await Database.prisma.governorate.findMany({
    orderBy: { orderIndex: 'asc' },
    skip: page * pageSize,
    take: pageSize,
  })

  const total = await Database.prisma.governorate.count()

  const keyboard = new InlineKeyboard()
  governorates.forEach((gov) => {
    keyboard.text(gov.nameAr, `leaves:schedule:bygov:${gov.id}`).row()
  })

  const totalPages = Math.ceil(total / pageSize)
  if (totalPages > 1) {
    const navButtons = []
    if (page > 0)
      navButtons.push(InlineKeyboard.text('◀️', `leaves:schedule:filter:gov:${page - 1}`))
    navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:schedule:filter:gov:0'))
    if (page < totalPages - 1)
      navButtons.push(InlineKeyboard.text('▶️', `leaves:schedule:filter:gov:${page + 1}`))
    keyboard.row(...navButtons)
  }

  keyboard.row().text('⬅️ رجوع', 'leaves:schedule')

  await ctx.editMessageText('🌍 **اختر المحافظة:**', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// عرض حسب الوظيفة
leavesScheduleFiltersHandler.callbackQuery(/^leaves:schedule:bypos:(\d+)$/, async (ctx) => {
  const positionId = Number.parseInt(ctx.match[1])

  ctx.session.leavesScheduleFilter = { positionId }
  await ctx.answerCallbackQuery('✅ تم تطبيق الفلتر')

  // استيراد الدالة من leaves-schedule.handler.ts
  const { renderLeaveScheduleView } = await import('./leaves-schedule.handler.js')
  await renderLeaveScheduleView(ctx, 0)
})

// عرض حسب المحافظة
leavesScheduleFiltersHandler.callbackQuery(/^leaves:schedule:bygov:(\d+)$/, async (ctx) => {
  const governorateId = Number.parseInt(ctx.match[1])

  ctx.session.leavesScheduleFilter = { governorateId }
  await ctx.answerCallbackQuery('✅ تم تطبيق الفلتر')

  // استيراد الدالة من leaves-schedule.handler.ts
  const { renderLeaveScheduleView } = await import('./leaves-schedule.handler.js')
  await renderLeaveScheduleView(ctx, 0)
})
