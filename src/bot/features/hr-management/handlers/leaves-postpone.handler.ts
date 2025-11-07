/**
 * Handler تأجيل الإجازة
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'

export const leavesPostponeHandler = new Composer<Context>()

// بدء تأجيل الإجازة
leavesPostponeHandler.callbackQuery(/^leaves:postpone:start:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = Number.parseInt(ctx.match[1])
  
  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true, department: true },
    })

    if (!employee || !employee.nextLeaveStartDate) {
      await ctx.editMessageText('❌ العامل غير موجود أو ليس لديه إجازة قادمة.')
      return
    }

    const nextLeaveStart = new Date(employee.nextLeaveStartDate)
    const nextLeaveEnd = employee.nextLeaveEndDate 
      ? new Date(employee.nextLeaveEndDate)
      : new Date(nextLeaveStart.getTime() + ((employee.leaveDaysPerCycle || 7) - 1) * 24 * 60 * 60 * 1000)

    const nickname = employee.nickname || generateNickname(employee.fullName)
    
    let message = `⏸️ **تأجيل الإجازة**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `👤 **العامل:** ${nickname}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n\n`
    message += `📅 **الإجازة القادمة:**\n`
    message += `• من: ${Calendar.formatArabic(nextLeaveStart)}\n`
    message += `• إلى: ${Calendar.formatArabic(nextLeaveEnd)}\n`
    message += `• المدة: ${employee.leaveDaysPerCycle} أيام\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `اختر مدة التأجيل:`

    const keyboard = new InlineKeyboard()
      .text(`⏸️ تأجيل ${employee.leaveDaysPerCycle} أيام`, `leaves:postpone:default:${employeeId}`)
      .row()
      .text('📝 إدخال عدد أيام مخصص', `leaves:postpone:custom:${employeeId}`)
      .row()
      .text('⬅️ رجوع', `leaves:schedule:view:${employeeId}`)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  } catch (error) {
    console.error('Error in postpone start:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل البيانات.')
  }
})

// تأجيل بعدد الأيام الافتراضي
leavesPostponeHandler.callbackQuery(/^leaves:postpone:default:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = Number.parseInt(ctx.match[1])
  
  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee || !employee.nextLeaveStartDate) {
      await ctx.editMessageText('❌ العامل غير موجود أو ليس لديه إجازة قادمة.')
      return
    }

    const postponeDays = employee.leaveDaysPerCycle || 7
    
    const newStartDate = new Date(employee.nextLeaveStartDate)
    newStartDate.setDate(newStartDate.getDate() + postponeDays)
    
    const newEndDate = employee.nextLeaveEndDate 
      ? new Date(employee.nextLeaveEndDate)
      : new Date(employee.nextLeaveStartDate)
    newEndDate.setDate(newEndDate.getDate() + postponeDays)

    await Database.prisma.employee.update({
      where: { id: employeeId },
      data: {
        nextLeaveStartDate: newStartDate,
        nextLeaveEndDate: newEndDate,
      },
    })

    await ctx.editMessageText(
      `✅ **تم تأجيل الإجازة بنجاح**\n\n` +
      `⏸️ تم تأجيل الإجازة ${postponeDays} أيام\n\n` +
      `📅 **الموعد الجديد:**\n` +
      `• من: ${Calendar.formatArabic(newStartDate)}\n` +
      `• إلى: ${Calendar.formatArabic(newEndDate)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👤 عرض تفاصيل العامل', `leaves:schedule:view:${employeeId}`)
          .row()
          .text('⬅️ رجوع للجدول', 'leaves:schedule'),
      }
    )
  } catch (error) {
    console.error('Error in postpone default:', error)
    await ctx.editMessageText('❌ حدث خطأ في تأجيل الإجازة.')
  }
})

// طلب إدخال عدد أيام مخصص
leavesPostponeHandler.callbackQuery(/^leaves:postpone:custom:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = Number.parseInt(ctx.match[1])
  
  ctx.session.awaitingInput = {
    type: 'postpone_days',
    data: { employeeId },
  }

  await ctx.editMessageText(
    `📝 **إدخال عدد أيام التأجيل**\n\n` +
    `أرسل عدد الأيام التي تريد تأجيل الإجازة بها:\n\n` +
    `مثال: 10`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', `leaves:postpone:start:${employeeId}`),
    }
  )
})

// معالجة إدخال عدد الأيام
leavesPostponeHandler.on('message:text', async (ctx, next) => {
  if (!ctx.session.awaitingInput || ctx.session.awaitingInput.type !== 'postpone_days') {
    return next()
  }

  const employeeId = ctx.session.awaitingInput.data.employeeId
  const days = Number.parseInt(ctx.message.text)

  if (isNaN(days) || days <= 0) {
    await ctx.reply('❌ يرجى إدخال رقم صحيح أكبر من صفر.')
    return
  }

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee || !employee.nextLeaveStartDate) {
      await ctx.reply('❌ العامل غير موجود أو ليس لديه إجازة قادمة.')
      delete ctx.session.awaitingInput
      return
    }

    const newStartDate = new Date(employee.nextLeaveStartDate)
    newStartDate.setDate(newStartDate.getDate() + days)
    
    const newEndDate = employee.nextLeaveEndDate 
      ? new Date(employee.nextLeaveEndDate)
      : new Date(employee.nextLeaveStartDate)
    newEndDate.setDate(newEndDate.getDate() + days)

    await Database.prisma.employee.update({
      where: { id: employeeId },
      data: {
        nextLeaveStartDate: newStartDate,
        nextLeaveEndDate: newEndDate,
      },
    })

    delete ctx.session.awaitingInput

    await ctx.reply(
      `✅ **تم تأجيل الإجازة بنجاح**\n\n` +
      `⏸️ تم تأجيل الإجازة ${days} أيام\n\n` +
      `📅 **الموعد الجديد:**\n` +
      `• من: ${Calendar.formatArabic(newStartDate)}\n` +
      `• إلى: ${Calendar.formatArabic(newEndDate)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👤 عرض تفاصيل العامل', `leaves:schedule:view:${employeeId}`)
          .row()
          .text('⬅️ رجوع للجدول', 'leaves:schedule'),
      }
    )
  } catch (error) {
    console.error('Error in postpone custom:', error)
    await ctx.reply('❌ حدث خطأ في تأجيل الإجازة.')
    delete ctx.session.awaitingInput
  }
})
