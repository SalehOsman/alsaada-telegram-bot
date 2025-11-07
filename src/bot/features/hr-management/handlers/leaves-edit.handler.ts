/**
 * Handler تعديل إجازة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesEditHandler = new Composer<Context>()

// تخزين مؤقت لبيانات التعديل
interface EditFormData {
  step: string
  leaveId: number
  employeeId?: number
  leaveType?: string
  startDate?: string
  endDate?: string
  notes?: string
}

const editData = new Map<number, EditFormData>()

// بدء تعديل إجازة
leavesEditHandler.callbackQuery(/^leaves:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

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

    // التحقق من حالة الإجازة - لا يمكن تعديل إجازة تم تسجيل عودتها
    if (leave.actualReturnDate) {
      await ctx.editMessageText(
        '⚠️ لا يمكن تعديل إجازة تم تسجيل عودة العامل منها.\n\n'
        + `📅 تاريخ العودة المسجل: ${Calendar.formatArabic(leave.actualReturnDate)}`,
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', `leaves:details:${leaveId}`),
        },
      )
      return
    }

    // عرض قائمة خيارات التعديل
    const keyboard = new InlineKeyboard()
      .text('📅 تعديل تاريخ البداية', `leaves:edit:startDate:${leaveId}`)
      .row()
      .text('📅 تعديل تاريخ النهاية', `leaves:edit:endDate:${leaveId}`)
      .row()
      .text('📂 تعديل نوع الإجازة', `leaves:edit:type:${leaveId}`)
      .row()
      .text('💬 تعديل الملاحظات', `leaves:edit:notes:${leaveId}`)
      .row()
      .text('⬅️ رجوع', `leaves:details:${leaveId}`)

    const startDateFormatted = Calendar.formatArabic(leave.startDate)
    const endDateFormatted = Calendar.formatArabic(leave.endDate)

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    await ctx.editMessageText(
      `✏️ **تعديل إجازة**\n\n`
      + `👤 العامل: ${leave.employee.fullName}\n`
      + `📂 النوع: ${leaveTypeLabels[leave.leaveType]}\n`
      + `📅 من: ${startDateFormatted}\n`
      + `📅 إلى: ${endDateFormatted}\n`
      + `⏱️ المدة: ${leave.totalDays} يوم\n\n`
      + `اختر ما تريد تعديله:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    // حفظ بيانات الإجازة للتعديل
    editData.set(userId, {
      step: 'selectField',
      leaveId,
      employeeId: leave.employeeId,
    })
  }
  catch (error) {
    console.error('Error loading leave for edit:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل بيانات الإجازة.')
  }
})

// تعديل تاريخ البداية
leavesEditHandler.callbackQuery(/^leaves:edit:startDate:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    const calendar = Calendar.create({
      callbackPrefix: 'leaves:edit:startDate:select',
    })

    calendar.row().text('❌ إلغاء', `leaves:edit:${leaveId}`)

    await ctx.editMessageText(
      `📅 **تعديل تاريخ بداية الإجازة**\n\n`
      + `التاريخ الحالي: ${Calendar.formatArabic(leave.startDate)}\n\n`
      + `اختر التاريخ الجديد:`,
      {
        parse_mode: 'Markdown',
        reply_markup: calendar,
      },
    )

    editData.set(userId, {
      step: 'editStartDate',
      leaveId,
      employeeId: leave.employeeId,
      endDate: leave.endDate.toISOString().split('T')[0],
    })
  }
  catch (error) {
    console.error('Error in edit start date:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تنقل في التقويم لتاريخ البداية (removed - Calendar.create doesn't support navigation)
// leavesEditHandler.callbackQuery(/^leaves:edit:startDate:select:nav:(.+)$/, ...)

// اختيار تاريخ البداية
leavesEditHandler.callbackQuery(/^leaves:edit:startDate:select:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = editData.get(userId)
  if (!data) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة، الرجاء البدء من جديد')
    return
  }

  const newStartDate = ctx.match[1]

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: data.leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    // التحقق من صحة التاريخ (يجب أن يكون قبل أو يساوي تاريخ النهاية)
    const startDate = new Date(newStartDate)
    const endDate = new Date(leave.endDate)

    if (startDate > endDate) {
      await ctx.answerCallbackQuery('❌ تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو يساويه')
      return
    }

    // حساب عدد الأيام الجديد
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // تحديث الإجازة
    await prisma.hR_EmployeeLeave.update({
      where: { id: data.leaveId },
      data: {
        startDate: new Date(newStartDate),
        totalDays,
      },
    })

    await ctx.editMessageText(
      `✅ تم تعديل تاريخ البداية بنجاح!\n\n`
      + `📅 التاريخ الجديد: ${Calendar.formatArabic(new Date(newStartDate))}\n`
      + `⏱️ المدة الجديدة: ${totalDays} يوم`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع لتفاصيل الإجازة', `leaves:details:${data.leaveId}`),
      },
    )

    editData.delete(userId)
  }
  catch (error) {
    console.error('Error updating start date:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحديث تاريخ البداية.')
  }
})

// تعديل تاريخ النهاية - نفس المنطق
leavesEditHandler.callbackQuery(/^leaves:edit:endDate:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    const calendar = Calendar.create({
      callbackPrefix: 'leaves:edit:endDate:select',
    })

    calendar.row().text('❌ إلغاء', `leaves:edit:${leaveId}`)

    await ctx.editMessageText(
      `📅 **تعديل تاريخ نهاية الإجازة**\n\n`
      + `التاريخ الحالي: ${Calendar.formatArabic(leave.endDate)}\n\n`
      + `اختر التاريخ الجديد:`,
      {
        parse_mode: 'Markdown',
        reply_markup: calendar,
      },
    )

    editData.set(userId, {
      step: 'editEndDate',
      leaveId,
      employeeId: leave.employeeId,
      startDate: leave.startDate.toISOString().split('T')[0],
    })
  }
  catch (error) {
    console.error('Error in edit end date:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تنقل في التقويم لتاريخ النهاية (removed - Calendar.create doesn't support navigation)
// leavesEditHandler.callbackQuery(/^leaves:edit:endDate:select:nav:(.+)$/, ...)

// اختيار تاريخ النهاية
leavesEditHandler.callbackQuery(/^leaves:edit:endDate:select:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = editData.get(userId)
  if (!data) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة، الرجاء البدء من جديد')
    return
  }

  const newEndDate = ctx.match[1]

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: data.leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    // التحقق من صحة التاريخ
    const startDate = new Date(leave.startDate)
    const endDate = new Date(newEndDate)

    if (endDate < startDate) {
      await ctx.answerCallbackQuery('❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو يساويه')
      return
    }

    // حساب عدد الأيام الجديد
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // تحديث الإجازة
    await prisma.hR_EmployeeLeave.update({
      where: { id: data.leaveId },
      data: {
        endDate: new Date(newEndDate),
        totalDays,
      },
    })

    await ctx.editMessageText(
      `✅ تم تعديل تاريخ النهاية بنجاح!\n\n`
      + `📅 التاريخ الجديد: ${Calendar.formatArabic(new Date(newEndDate))}\n`
      + `⏱️ المدة الجديدة: ${totalDays} يوم`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع لتفاصيل الإجازة', `leaves:details:${data.leaveId}`),
      },
    )

    editData.delete(userId)
  }
  catch (error) {
    console.error('Error updating end date:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحديث تاريخ النهاية.')
  }
})

// تعديل نوع الإجازة
leavesEditHandler.callbackQuery(/^leaves:edit:type:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('📅 اعتيادية', `leaves:edit:type:select:${leaveId}:REGULAR`)
      .row()
      .text('🏥 مرضية', `leaves:edit:type:select:${leaveId}:SICK`)
      .row()
      .text('⚡ عارضة', `leaves:edit:type:select:${leaveId}:EMERGENCY`)
      .row()
      .text('💰 بدون مرتب', `leaves:edit:type:select:${leaveId}:UNPAID`)
      .row()
      .text('❌ إلغاء', `leaves:edit:${leaveId}`)

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    await ctx.editMessageText(
      `📂 **تعديل نوع الإجازة**\n\n`
      + `النوع الحالي: ${leaveTypeLabels[leave.leaveType]}\n\n`
      + `اختر النوع الجديد:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    editData.set(userId, {
      step: 'editType',
      leaveId,
      employeeId: leave.employeeId,
    })
  }
  catch (error) {
    console.error('Error in edit type:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تحديد نوع الإجازة الجديد
leavesEditHandler.callbackQuery(/^leaves:edit:type:select:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])
  const newType = ctx.match[2] as 'REGULAR' | 'SICK' | 'EMERGENCY' | 'UNPAID'

  try {
    const prisma = Database.prisma

    await prisma.hR_EmployeeLeave.update({
      where: { id: leaveId },
      data: {
        leaveType: newType,
      },
    })

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    await ctx.editMessageText(
      `✅ تم تعديل نوع الإجازة بنجاح!\n\n`
      + `📂 النوع الجديد: ${leaveTypeLabels[newType]}`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع لتفاصيل الإجازة', `leaves:details:${leaveId}`),
      },
    )
  }
  catch (error) {
    console.error('Error updating leave type:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحديث نوع الإجازة.')
  }
})

// تعديل الملاحظات
leavesEditHandler.callbackQuery(/^leaves:edit:notes:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    await ctx.editMessageText(
      `💬 **تعديل الملاحظات**\n\n`
      + `الملاحظات الحالية: ${leave.reason || 'لا توجد ملاحظات'}\n\n`
      + `أرسل الملاحظات الجديدة (أو أرسل "حذف" لحذف الملاحظات):`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('❌ إلغاء', `leaves:edit:${leaveId}`),
      },
    )

    editData.set(userId, {
      step: 'editNotes',
      leaveId,
      employeeId: leave.employeeId,
    })
  }
  catch (error) {
    console.error('Error in edit notes:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// استقبال الملاحظات الجديدة
leavesEditHandler.on('message:text', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId)
    return

  const data = editData.get(userId)
  if (!data || data.step !== 'editNotes')
    return

  const notes = ctx.message.text.trim()

  try {
    const prisma = Database.prisma

    await prisma.hR_EmployeeLeave.update({
      where: { id: data.leaveId },
      data: {
        reason: notes === 'حذف' ? null : notes,
      },
    })

    await ctx.reply(
      `✅ تم تعديل الملاحظات بنجاح!`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع لتفاصيل الإجازة', `leaves:details:${data.leaveId}`),
      },
    )

    editData.delete(userId)
  }
  catch (error) {
    console.error('Error updating notes:', error)
    await ctx.reply('❌ حدث خطأ في تحديث الملاحظات.')
  }
})
