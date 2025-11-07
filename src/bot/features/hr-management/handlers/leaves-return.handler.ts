/**
 * Handler تسجيل العودة من إجازة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'

import { DelayPenaltyService } from '#root/modules/services/delay-penalty.service.js'
import { LeaveScheduleService } from '#root/modules/services/leave-schedule.service.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesReturnHandler = new Composer<Context>()

const returnData = new Map<number, any>()

// عرض قائمة العاملين في إجازة
leavesReturnHandler.callbackQuery(/^leaves:return(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  try {
    const prisma = Database.prisma

    // استخدام توقيت UTC للمقارنة الصحيحة
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // جلب جميع الإجازات التي لم يتم تسجيل عودة فعلية لها
    // الشروط:
    // 1. isActive: true
    // 2. status: PENDING أو APPROVED
    // 3. allowanceAmount: null أو 0 (ليست إجازة بدل)
    // 4. actualReturnDate: null (لم يتم تسجيل عودة فعلية)
    // 5. startDate <= اليوم (بدأت فعلاً - منع الإجازات المستقبلية)
    const allLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        isActive: true,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { allowanceAmount: null }, // إجازة بدون بدل
          { allowanceAmount: 0 }, // إجازة بدل 0
        ],
        actualReturnDate: null, // لم يتم تسجيل عودة فعلية
        startDate: { lte: today }, // ✅ بدأت فعلاً (منع الإجازات المستقبلية)
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
      },
      orderBy: [
        { employeeId: 'asc' },
        { createdAt: 'desc' }, // أحدث إجازة أولاً
      ],
    })

    // تصفية لإظهار أحدث إجازة فقط لكل عامل
    const uniqueLeaves = []
    const seenEmployees = new Set()

    for (const leave of allLeaves) {
      if (!seenEmployees.has(leave.employeeId)) {
        uniqueLeaves.push(leave)
        seenEmployees.add(leave.employeeId)
      }
    }

    const total = uniqueLeaves.length
    const leaves = uniqueLeaves.slice(page * pageSize, (page + 1) * pageSize)

    if (leaves.length === 0) {
      await ctx.editMessageText(
        '↩️ **تسجيل عودة من إجازة**\n\n❌ لا يوجد عاملين في إجازة حالياً.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
        },
      )
      return
    }

    let message = `↩️ **تسجيل عودة من إجازة**\n\n`
    message += `👥 **عدد العاملين في إجازة:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر العامل لتسجيل عودته:`

    const keyboard = new InlineKeyboard()

    leaves.forEach((leave: any) => {
      const nickname = leave.employee?.nickname || generateNickname(leave.employee?.fullName || '')
      const position = leave.employee?.position?.titleAr || 'غير محدد'
      const returnDate = Calendar.formatArabic(leave.endDate)

      // إضافة علامة 🚫 موقوف إذا كان الموظف موقوفاً عن العمل
      const isSuspended = leave.employee?.employmentStatus === 'SUSPENDED'
      const suspensionMark = isSuspended ? ' 🚫 موقوف' : ''

      const buttonText = `${nickname} (${position}) - ${returnDate}${suspensionMark}`
      keyboard.text(buttonText, `leaves:return:confirm:${leave.id}`).row()
    })

    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `leaves:return:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:return:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `leaves:return:${page + 1}`))
      }
      keyboard.row(...navButtons)
    }

    keyboard.row().text('⬅️ رجوع', 'leavesHandler')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employees on leave:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة العاملين.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
})

// اختيار تاريخ العودة
leavesReturnHandler.callbackQuery(/^leaves:return:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    // جلب معلومات الإجازة والموظف
    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            employmentStatus: true,
          },
        },
      },
    })

    if (!leave) {
      await ctx.answerCallbackQuery('❌ الإجازة غير موجودة')
      return
    }

    // ⚠️ التحقق من حالة الإيقاف: لا يمكن تسجيل عودة الموظف الموقوف
    if (leave.employee.employmentStatus === 'SUSPENDED') {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'leaves:return')
        .row()
        .text('🔓 رفع الإيقافات', 'penalties:lift-suspensions')

      await ctx.editMessageText(
        `🚫 **لا يمكن تسجيل عودة الموظف**\n\n`
        + `👤 **الموظف:** ${leave.employee.nickname || leave.employee.fullName}\n`
        + `📛 **الحالة:** موقوف عن العمل\n\n`
        + `⚠️ **يجب رفع الإيقاف أولاً قبل تسجيل العودة.**\n\n`
        + `انتقل إلى "رفع الإيقافات" من قائمة إدارة العقوبات.`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
      return
    }

    // المتابعة لتسجيل العودة
    const keyboard = Calendar.create({
      callbackPrefix: `leaves:return:date:${leaveId}`,
    })
    keyboard.row().text('⬅️ رجوع', 'leaves:return')

    await ctx.editMessageText(
      `↩️ **تسجيل عودة من إجازة**\n\nاختر تاريخ العودة الفعلي:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in leaves:return:confirm:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تأكيد تاريخ العودة
leavesReturnHandler.callbackQuery(/^leaves:return:date:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])
  const dateStr = ctx.match[2]
  const userId = ctx.from?.id

  if (!userId)
    return

  const returnDate = Calendar.parseDate(dateStr)
  if (!returnDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  // حفظ التاريخ مؤقتاً
  returnData.set(userId, { leaveId, returnDate: dateStr })

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `leaves:return:notes:${leaveId}`)
    .row()
    .text('⬅️ رجوع', `leaves:return:confirm:${leaveId}`)

  await ctx.editMessageText(
    `↩️ **تسجيل عودة من إجازة**\n\n`
    + `📅 **تاريخ العودة:** ${Calendar.formatArabic(returnDate)}\n\n`
    + `💬 أرسل ملاحظات (اختياري) أو اضغط تخطي:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// استقبال الملاحظات
leavesReturnHandler.on('message:text', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId)
    return

  const tempData = returnData.get(userId)
  if (!tempData)
    return

  tempData.notes = ctx.message.text.trim()
  returnData.set(userId, tempData)

  await ctx.reply('✅ تم حفظ الملاحظات.', {
    reply_markup: new InlineKeyboard()
      .text('📋 عرض الملخص', `leaves:return:notes:${tempData.leaveId}`),
  })
})

// عرض ملخص وتأكيد
leavesReturnHandler.callbackQuery(/^leaves:return:notes:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])
  const userId = ctx.from?.id
  if (!userId)
    return

  const tempData = returnData.get(userId)
  if (!tempData)
    return

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: {
            position: true,
            department: true,
          },
        },
      },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    const returnDate = Calendar.parseDate(tempData.returnDate)
    if (!returnDate)
      return

    const endDate = new Date(leave.endDate)
    endDate.setHours(0, 0, 0, 0)
    returnDate.setHours(0, 0, 0, 0)

    const expectedReturnDate = new Date(endDate)
    expectedReturnDate.setDate(expectedReturnDate.getDate() + 1)
    const daysDiff = Math.floor((returnDate.getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24))

    let message = `↩️ **ملخص تسجيل العودة**\n\n`
    message += `👤 **العامل:** ${leave.employee.fullName}\n`
    message += `💼 **الوظيفة:** ${leave.employee.position?.titleAr || 'غير محدد'}\n`
    message += `📋 **رقم الإجازة:** ${leave.leaveNumber}\n\n`
    message += `📅 **تاريخ نهاية الإجازة:** ${Calendar.formatArabic(leave.endDate)}\n`
    message += `📅 **تاريخ العودة:** ${Calendar.formatArabic(returnDate)}\n`

    if (daysDiff > 0) {
      message += `\n⚠️ **تأخير:** ${daysDiff} يوم\n`
    }
    else if (daysDiff < 0) {
      message += `\n✅ **عودة قبل الموعد بـ** ${Math.abs(daysDiff)} يوم\n`
    }
    else {
      message += `\n✅ **عودة في الموعد**\n`
    }

    if (tempData.notes) {
      message += `\n💬 **ملاحظات:** ${tempData.notes}\n`
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `هل تريد تسجيل العودة؟`

    const keyboard = new InlineKeyboard()
      .text('✅ حفظ', `leaves:return:save:${leaveId}`)
      .text('❌ إلغاء', 'leaves:return')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error showing summary:', error)
  }
})

// حفظ تسجيل العودة
leavesReturnHandler.callbackQuery(/^leaves:return:save:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسجيل...')

  const leaveId = Number.parseInt(ctx.match[1])
  const userId = ctx.from?.id
  if (!userId)
    return

  const tempData = returnData.get(userId)
  if (!tempData)
    return

  try {
    const prisma = Database.prisma

    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: {
            position: true,
            department: true,
          },
        },
      },
    })

    if (!leave) {
      await ctx.editMessageText('❌ الإجازة غير موجودة.')
      return
    }

    const returnDate = Calendar.parseDate(tempData.returnDate)
    if (!returnDate)
      return

    const endDate = new Date(leave.endDate)
    endDate.setHours(0, 0, 0, 0)
    returnDate.setHours(0, 0, 0, 0)

    const expectedReturnDate = new Date(endDate)
    expectedReturnDate.setDate(expectedReturnDate.getDate() + 1)
    const daysDiff = Math.floor((returnDate.getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24))

    // تحديث حالة الإجازة
    await prisma.hR_EmployeeLeave.update({
      where: { id: leaveId },
      data: {
        status: 'APPROVED',
        actualReturnDate: returnDate,
        delayDays: daysDiff > 0 ? daysDiff : 0,
        reason: tempData.notes ? `${leave.reason || ''}\n\nملاحظات العودة: ${tempData.notes}` : leave.reason,
      },
    })

    // إنشاء عقوبة تلقائياً إذا كان هناك تأخير
    let penalty = null
    if (daysDiff > 0) {
      penalty = await DelayPenaltyService.createPenaltyForLeave({
        leaveId,
        employeeId: leave.employeeId,
        delayDays: daysDiff,
        createdBy: BigInt(userId),
        api: ctx.api, // تمرير api لإرسال الإشعارات
      })
    }

    // التحقق من وجود إجازات أخرى حالية للعامل
    const todayCheck = new Date()
    todayCheck.setUTCHours(0, 0, 0, 0)

    const otherActiveLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId: leave.employeeId,
        id: { not: leaveId }, // استبعاد الإجازة الحالية
        isActive: true,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { allowanceAmount: null },
          { allowanceAmount: 0 },
        ],
        startDate: { lte: todayCheck },
        endDate: { gte: todayCheck },
        actualReturnDate: null,
      },
    })

    // تحديث حالة العامل
    // isOnLeave = false فقط إذا لم يكن لديه إجازات أخرى حالية
    const shouldEndLeave = otherActiveLeaves.length === 0

    await prisma.employee.update({
      where: { id: leave.employeeId },
      data: {
        isOnLeave: !shouldEndLeave,
        currentLeaveId: shouldEndLeave ? null : otherActiveLeaves[0].id,
        lastLeaveStartDate: leave.startDate,
        lastLeaveEndDate: leave.endDate,
        totalDelayDays: {
          increment: daysDiff > 0 ? daysDiff : 0,
        },
      },
    })

    // حساب موعد الإجازة القادمة
    await LeaveScheduleService.updateNextLeaveDate(leave.employeeId)

    // جلب بيانات المسجل
    const admin: any = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) } })

    // مسح البيانات المؤقتة
    returnData.delete(userId)

    const returnDateFormatted = formatDateWithDay(returnDate)

    let report = `✅ **تم تسجيل العودة بنجاح!**\n\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **تقرير العودة**\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`

    report += `👤 **العامل:** ${leave.employee.fullName}`
    if (leave.employee.nickname) {
      report += ` (${leave.employee.nickname})`
    }
    report += `\n`
    report += `🔢 **كود العامل:** ${leave.employee.employeeCode}\n`
    report += `💼 **الوظيفة:** ${leave.employee.position?.titleAr || 'غير محدد'}\n`
    report += `🏢 **القسم:** ${leave.employee.department?.name || 'غير محدد'}\n\n`

    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **رقم الإجازة:** ${leave.leaveNumber}\n`
    report += `📅 **تاريخ بداية الإجازة:** ${formatDateWithDay(leave.startDate)}\n`
    report += `📅 **تاريخ نهاية الإجازة:** ${formatDateWithDay(leave.endDate)}\n`
    report += `📅 **تاريخ العودة:** ${returnDateFormatted}\n`
    report += `⏱️ **مدة الإجازة:** ${leave.totalDays} أيام\n`

    if (daysDiff > 0) {
      report += `\n⚠️ **تأخير:** ${daysDiff} يوم\n`

      // إضافة معلومات العقوبة
      if (penalty) {
        report += `\n🚨 **تم إنشاء عقوبة تلقائية:**\n`
        if (penalty.penaltyType === 'DEDUCTION') {
          report += `💰 **نوع العقوبة:** خصم من الراتب\n`
          report += `📊 **قيمة الخصم:** ${penalty.deductionDays} يوم\n`
          report += `⏳ **الحالة:** قيد المراجعة\n`
        }
        else if (penalty.penaltyType === 'SUSPENSION') {
          report += `🚫 **نوع العقوبة:** إيقاف عن العمل\n`
          report += `⏳ **الحالة:** يتطلب مراجعة الإدارة\n`
        }
      }
    }
    else if (daysDiff < 0) {
      report += `\n✅ **عودة قبل الموعد بـ** ${Math.abs(daysDiff)} يوم\n`
    }
    else {
      report += `\n✅ **عودة في الموعد**\n`
    }

    // إضافة تنبيه إذا كان لدى العامل إجازات أخرى مستمرة
    if (!shouldEndLeave) {
      report += `\n📌 **ملاحظة:** العامل لديه إجازة أخرى مستمرة (${otherActiveLeaves.length})\n`
    }

    if (tempData.notes) {
      report += `\n💬 **ملاحظات العودة:**\n${tempData.notes}\n`
    }

    report += `\n━━━━━━━━━━━━━━━━━━━━\n`
    report += `👨💼 **مسجل العودة:** ${admin?.fullName || 'غير معروف'}\n`
    report += `📅 **تاريخ التسجيل:** ${formatDateWithDay(new Date())}\n`
    report += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('↩️ تسجيل عودة أخرى', 'leaves:return')
      .row()
      .text('📋 قائمة الإجازات', 'leaves:list')
      .row()
      .text('🏠 القائمة الرئيسية', 'leavesHandler')

    await ctx.editMessageText(report, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error saving return:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تسجيل العودة.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:return'),
      },
    )
  }
})

function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
