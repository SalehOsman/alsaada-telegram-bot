/**
 * Handler حذف إجازة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesDeleteHandler = new Composer<Context>()

// تأكيد الحذف
leavesDeleteHandler.callbackQuery(/^leaves:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
      include: {
        employee: true,
      },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    // التحقق من حالة الإجازة
    if (leave.actualReturnDate) {
      await ctx.editMessageText(
        '⚠️ لا يمكن حذف إجازة تم تسجيل عودة العامل منها.\n\n'
        + `📅 تاريخ العودة المسجل: ${Calendar.formatArabic(leave.actualReturnDate)}`,
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', `leaves:details:${leaveId}`),
        },
      )
      return
    }

    const startDateFormatted = Calendar.formatArabic(leave.startDate)
    const endDateFormatted = Calendar.formatArabic(leave.endDate)

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    const keyboard = new InlineKeyboard()
      .text('✅ نعم، احذف الإجازة', `leaves:delete:execute:${leaveId}`)
      .row()
      .text('❌ لا، تراجع', `leaves:details:${leaveId}`)

    await ctx.editMessageText(
      `⚠️ **تأكيد حذف الإجازة**\n\n`
      + `هل أنت متأكد من حذف هذه الإجازة؟\n\n`
      + `📋 رقم الإجازة: ${leave.leaveNumber}\n`
      + `👤 العامل: ${leave.employee.fullName}\n`
      + `📂 النوع: ${leaveTypeLabels[leave.leaveType]}\n`
      + `📅 من: ${startDateFormatted}\n`
      + `📅 إلى: ${endDateFormatted}\n`
      + `⏱️ المدة: ${leave.totalDays} يوم\n\n`
      + `⚠️ **ملاحظة:** سيتم حذف الإجازة بشكل نهائي (soft delete).`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error loading leave for deletion:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل بيانات الإجازة.')
  }
})

// تنفيذ الحذف
leavesDeleteHandler.callbackQuery(/^leaves:delete:execute:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
      include: {
        employee: true,
      },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    // Soft delete: تعيين isActive = false و status = REJECTED
    await prisma.hR_EmployeeLeave.update({
      where: { id: leaveId },
      data: {
        isActive: false,
        status: 'REJECTED',
      },
    })

    await ctx.editMessageText(
      `✅ **تم حذف الإجازة بنجاح!**\n\n`
      + `📋 رقم الإجازة: ${leave.leaveNumber}\n`
      + `👤 العامل: ${leave.employee.fullName}\n`
      + `📅 من: ${Calendar.formatArabic(leave.startDate)}\n`
      + `📅 إلى: ${Calendar.formatArabic(leave.endDate)}\n\n`
      + `ℹ️ تم وضع علامة الإجازة كمحذوفة (soft delete).`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع لقائمة الإجازات', 'leaves:list')
          .row()
          .text('🏠 القائمة الرئيسية', 'leavesHandler'),
      },
    )
  }
  catch (error) {
    console.error('Error deleting leave:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في حذف الإجازة.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', `leaves:details:${leaveId}`),
      },
    )
  }
})
