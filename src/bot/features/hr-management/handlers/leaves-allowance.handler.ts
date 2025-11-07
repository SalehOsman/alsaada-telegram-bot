/**
 * Handler صرف بدل الإجازة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { LeaveScheduleService } from '#root/modules/services/leave-schedule.service.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesAllowanceHandler = new Composer<Context>()

// بدء صرف بدل الإجازة
leavesAllowanceHandler.callbackQuery(/^leaves:allowance:start:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true, department: true },
    })

    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    // التحقق من وجود دورة عمل ودورة إجازة
    if (!employee.workDaysPerCycle || !employee.leaveDaysPerCycle) {
      await ctx.editMessageText('❌ لم يتم تحديد دورة العمل/الإجازة لهذا العامل.')
      return
    }

    // حساب تاريخ الإجازة القادمة ديناميكياً
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let nextLeaveStart: Date

    // إذا كان nextLeaveStartDate موجود وفي المستقبل، استخدمه
    if (employee.nextLeaveStartDate) {
      const storedDate = new Date(employee.nextLeaveStartDate)
      storedDate.setHours(0, 0, 0, 0)

      if (storedDate >= today) {
        nextLeaveStart = storedDate
      }
      else {
        // التاريخ المحفوظ في الماضي، احسب من اليوم
        nextLeaveStart = new Date(today.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)
      }
    }
    else {
      // لا يوجد تاريخ محفوظ، احسب من آخر إجازة أو تاريخ التعيين
      const baseDate = employee.lastLeaveEndDate
        ? new Date(employee.lastLeaveEndDate)
        : employee.hireDate
          ? new Date(employee.hireDate)
          : today

      baseDate.setHours(0, 0, 0, 0)
      nextLeaveStart = new Date(baseDate.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)

      // إذا كان التاريخ المحسوب في الماضي، احسب من اليوم
      if (nextLeaveStart < today) {
        nextLeaveStart = new Date(today.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)
      }
    }

    const nextLeaveEnd = new Date(nextLeaveStart.getTime() + (employee.leaveDaysPerCycle - 1) * 24 * 60 * 60 * 1000)

    const nickname = employee.nickname || generateNickname(employee.fullName)

    let message = `💰 **صرف بدل إجازة**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `👤 **العامل:** ${nickname}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n\n`
    message += `📅 **الإجازة القادمة:**\n`
    message += `• من: ${Calendar.formatArabic(nextLeaveStart)}\n`
    message += `• إلى: ${Calendar.formatArabic(nextLeaveEnd)}\n`
    message += `• المدة: ${employee.leaveDaysPerCycle} أيام\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `أرسل مبلغ البدل المراد صرفه:\n\n`
    message += `مثال: 1000`

    ctx.session.awaitingInput = {
      type: 'allowance_amount',
      data: { employeeId },
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', `leaves:schedule:view:${employeeId}`),
    })
  }
  catch (error) {
    console.error('Error in allowance start:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل البيانات.')
  }
})

// معالجة إدخال المبلغ
leavesAllowanceHandler.on('message:text', async (ctx, next) => {
  if (!ctx.session.awaitingInput || ctx.session.awaitingInput.type !== 'allowance_amount') {
    return next()
  }

  const employeeId = ctx.session.awaitingInput.data.employeeId
  const amount = Number.parseFloat(ctx.message.text)

  if (Number.isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ يرجى إدخال مبلغ صحيح أكبر من صفر.')
    return
  }

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      await ctx.reply('❌ العامل غير موجود.')
      delete ctx.session.awaitingInput
      return
    }

    // التحقق من وجود دورة عمل ودورة إجازة
    if (!employee.workDaysPerCycle || !employee.leaveDaysPerCycle) {
      await ctx.reply('❌ لم يتم تحديد دورة العمل/الإجازة لهذا العامل.')
      delete ctx.session.awaitingInput
      return
    }

    // حساب تاريخ الإجازة القادمة ديناميكياً (نفس المنطق من leaves:schedule:view)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let leaveStartDate: Date

    if (employee.nextLeaveStartDate) {
      const storedDate = new Date(employee.nextLeaveStartDate)
      storedDate.setHours(0, 0, 0, 0)

      if (storedDate >= today) {
        leaveStartDate = storedDate
      }
      else {
        leaveStartDate = new Date(today.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)
      }
    }
    else {
      const baseDate = employee.lastLeaveEndDate
        ? new Date(employee.lastLeaveEndDate)
        : employee.hireDate
          ? new Date(employee.hireDate)
          : today

      baseDate.setHours(0, 0, 0, 0)
      leaveStartDate = new Date(baseDate.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)

      if (leaveStartDate < today) {
        leaveStartDate = new Date(today.getTime() + employee.workDaysPerCycle * 24 * 60 * 60 * 1000)
      }
    }

    const leaveEndDate = new Date(leaveStartDate.getTime() + (employee.leaveDaysPerCycle - 1) * 24 * 60 * 60 * 1000)

    // توليد رقم الإجازة
    const leaveNumber = await LeaveScheduleService.generateLeaveNumber()

    // إنشاء سجل الإجازة كبدل نقدي
    // ✅ نوع التسوية = CASH_SETTLEMENT (تسوية نقدية - لم يتغيب)
    // ✅ تسجيل العودة تلقائياً = تاريخ انتهاء الإجازة (ليست إجازة فعلية)
    await Database.prisma.hR_EmployeeLeave.create({
      data: {
        employeeId,
        leaveNumber,
        leaveType: 'REGULAR',
        settlementType: 'CASH_SETTLEMENT', // 💰 تسوية نقدية
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        totalDays: employee.leaveDaysPerCycle || 7,
        status: 'APPROVED',
        allowanceAmount: amount,
        allowanceSettled: false,
        actualReturnDate: leaveEndDate, // ✅ تسجيل العودة تلقائياً = تاريخ الانتهاء
      },
    })

    // حساب موعد الإجازة القادمة (بعد هذه الدورة)
    const nextLeaveStart = new Date(leaveEndDate)
    nextLeaveStart.setDate(nextLeaveStart.getDate() + (employee.workDaysPerCycle || 30) + 1)

    const nextLeaveEnd = new Date(nextLeaveStart)
    nextLeaveEnd.setDate(nextLeaveEnd.getDate() + (employee.leaveDaysPerCycle || 7) - 1)

    // تحديث بيانات العامل
    await Database.prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLeaveStartDate: leaveStartDate,
        lastLeaveEndDate: leaveEndDate,
        nextLeaveStartDate: nextLeaveStart,
        nextLeaveEndDate: nextLeaveEnd,
        totalLeaveDays: (employee.totalLeaveDays || 0) + (employee.leaveDaysPerCycle || 7),
      },
    })

    delete ctx.session.awaitingInput

    await ctx.reply(
      `✅ **تم صرف بدل الإجازة بنجاح**\n\n`
      + `💰 **المبلغ:** ${amount.toFixed(2)} جنيه\n`
      + `📅 **عن الفترة:** ${Calendar.formatArabic(leaveStartDate)} - ${Calendar.formatArabic(leaveEndDate)}\n`
      + `⏱️ **المدة:** ${employee.leaveDaysPerCycle} أيام\n`
      + `🔢 **رقم السجل:** ${leaveNumber}\n\n`
      + `ℹ️ **ملاحظة:** هذه إجازة ببدل نقدي (ليست إجازة فعلية)\n`
      + `✅ تم تسجيل العودة تلقائياً بتاريخ: ${Calendar.formatArabic(leaveEndDate)}\n\n`
      + `━━━━━━━━━━━━━━━━━━━━\n\n`
      + `📅 **الإجازة القادمة:**\n`
      + `• من: ${Calendar.formatArabic(nextLeaveStart)}\n`
      + `• إلى: ${Calendar.formatArabic(nextLeaveEnd)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👤 عرض تفاصيل العامل', `leaves:schedule:view:${employeeId}`)
          .row()
          .text('⬅️ رجوع للجدول', 'leaves:schedule'),
      },
    )
  }
  catch (error) {
    console.error('Error in allowance payment:', error)
    await ctx.reply('❌ حدث خطأ في صرف البدل.')
    delete ctx.session.awaitingInput
  }
})
