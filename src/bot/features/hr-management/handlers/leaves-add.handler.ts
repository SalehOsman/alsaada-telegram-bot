/**
 * Handler تسجيل إجازة جديدة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { LeaveScheduleService } from '#root/modules/services/leave-schedule.service.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { EmployeeSelector } from '#root/modules/ui/employee-selector.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesAddHandler = new Composer<Context>()

// تخزين مؤقت لبيانات النموذج
interface LeaveFormData {
  step: string
  employeeId?: number
  leaveType?: string
  startDate?: string
  endDate?: string
  notes?: string
}

const formData = new Map<number, LeaveFormData>()

// بدء تسجيل إجازة جديدة
leavesAddHandler.callbackQuery('leaves:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  try {
    const prisma = Database.prisma

    // جلب العاملين النشطين الذين ليس لديهم إجازات مفتوحة (بدون تسجيل عودة)
    // ⚠️ استبعاد التسويات النقدية (CASH_SETTLEMENT) لأنها ليست إجازات فعلية
    // ⚠️ استبعاد الموظفين الموقوفين عن العمل (SUSPENDED)
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        employmentStatus: 'ACTIVE', // ❌ استبعاد الموقوفين (SUSPENDED)
        // ✅ استبعاد العاملين الذين لديهم إجازة فعلية مفتوحة
        NOT: {
          leaves: {
            some: {
              actualReturnDate: null, // لم يتم تسجيل العودة
              status: {
                in: ['PENDING', 'APPROVED'],
              },
              settlementType: 'ACTUAL_LEAVE', // 🏖️ إجازات فعلية فقط
            },
          },
        },
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    if (employees.length === 0) {
      await ctx.editMessageText(
        '❌ لا يوجد عاملين متاحين لتسجيل إجازة.\n\n'
        + 'ℹ️ جميع العاملين النشطين لديهم إجازات فعلية لم يتم تسجيل عودتهم بعد.',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
        },
      )
      return
    }

    // إنشاء قائمة العاملين
    const { keyboard, message } = EmployeeSelector.createWithSearch({
      employees,
      page: 0,
      pageSize: 10,
      callbackPrefix: 'leaves:add:employee',
      pageCallback: 'leaves:add:page',
      searchCallback: 'leaves:add:search',
    })

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'leavesHandler')

    await ctx.editMessageText(
      `📝 **تسجيل إجازة جديدة**\n\n${message}\n\nاختر العامل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    // حفظ الحالة
    formData.set(userId, { step: 'selectEmployee' })
  }
  catch (error) {
    console.error('Error loading employees:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة العاملين.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
})

// التنقل بين صفحات قائمة العاملين
leavesAddHandler.callbackQuery(/^leaves:add:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    // جلب العاملين النشطين الذين ليس لديهم إجازات فعلية (بدون تسجيل عودة)
    // ⚠️ استبعاد التسويات النقدية (CASH_SETTLEMENT) لأنها ليست إجازات فعلية
    // ⚠️ استبعاد الموظفين الموقوفين عن العمل (SUSPENDED)
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        employmentStatus: 'ACTIVE', // ❌ استبعاد الموقوفين (SUSPENDED)
        // ✅ استبعاد العاملين الذين لديهم إجازة فعلية مفتوحة
        NOT: {
          leaves: {
            some: {
              actualReturnDate: null,
              status: {
                in: ['PENDING', 'APPROVED'],
              },
              settlementType: 'ACTUAL_LEAVE', // 🏖️ إجازات فعلية فقط
            },
          },
        },
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    // إنشاء قائمة العاملين بالصفحة المطلوبة
    const { keyboard, message } = EmployeeSelector.createWithSearch({
      employees,
      page,
      pageSize: 10,
      callbackPrefix: 'leaves:add:employee',
      pageCallback: 'leaves:add:page',
      searchCallback: 'leaves:add:search',
    })

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'leavesHandler')

    await ctx.editMessageText(
      `📝 **تسجيل إجازة جديدة**\n\n${message}\n\nاختر العامل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error loading employees page:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ في تحميل الصفحة')
  }
})

// اختيار العامل
leavesAddHandler.callbackQuery(/^leaves:add:employee:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    // جلب معلومات العامل
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
      },
    })

    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    // التحقق من وجود إجازات فعلية نشطة فقط (استبعاد بدل الإجازات والإجازات المستقبلية)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId,
        isActive: true,
        status: { in: ['PENDING', 'APPROVED'] },
        settlementType: 'ACTUAL_LEAVE', // 🏖️ فقط الإجازات الفعلية (ليست تسوية نقدية)
        startDate: { lte: today }, // بدأت بالفعل أو اليوم
        endDate: { gte: today }, // لم تنتهي بعد
      },
      select: {
        id: true,
        leaveNumber: true,
        startDate: true,
        endDate: true,
      },
    })

    if (activeLeaves.length > 0) {
      const leave = activeLeaves[0]
      await ctx.editMessageText(
        `❌ **لا يمكن تسجيل إجازة جديدة**\n\n`
        + `العامل في إجازة فعلية حالياً:\n\n`
        + `📋 **رقم الإجازة:** ${leave.leaveNumber}\n`
        + `📅 **من:** ${Calendar.formatArabic(leave.startDate)}\n`
        + `📅 **إلى:** ${Calendar.formatArabic(leave.endDate)}\n\n`
        + `💡 يجب تسجيل عودته من الإجازة أولاً.\n\n`
        + `ℹ️ ملاحظة: بدل الإجازات المستقبلية لا تمنع تسجيل إجازات جديدة.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('↩️ تسجيل عودة', 'leaves:return')
            .row()
            .text('⬅️ رجوع', 'leaves:add'),
        },
      )
      return
    }

    // عرض معلومات العامل
    let message = `📝 **تسجيل إجازة جديدة**\n\n`
    message += `👤 **العامل:** ${employee.fullName}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    message += `📋 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`

    // معلومات دورة الإجازات
    if (employee.workDaysPerCycle && employee.leaveDaysPerCycle) {
      message += `🔄 **دورة العمل/الإجازة:** ${employee.workDaysPerCycle} يوم عمل + ${employee.leaveDaysPerCycle} يوم إجازة\n`

      if (employee.nextLeaveStartDate) {
        message += `📅 **موعد الإجازة القادمة:** ${Calendar.formatArabic(employee.nextLeaveStartDate)}\n`
      }

      if (employee.lastLeaveEndDate) {
        message += `📅 **آخر إجازة:** ${Calendar.formatArabic(employee.lastLeaveEndDate)}\n`
      }
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `اختر نوع الإجازة:`

    const keyboard = new InlineKeyboard()
      .text('🏖️ اعتيادية', `leaves:add:type:${employeeId}:REGULAR`)
      .row()
      .text('🏥 مرضية', `leaves:add:type:${employeeId}:SICK`)
      .text('🚨 عارضة', `leaves:add:type:${employeeId}:EMERGENCY`)
      .row()
      .text('💼 بدون مرتب', `leaves:add:type:${employeeId}:UNPAID`)
      .row()
      .text('⬅️ رجوع', 'leaves:add')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // حفظ الحالة
    formData.set(userId, {
      step: 'selectType',
      employeeId,
    })
  }
  catch (error) {
    console.error('Error loading employee:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل بيانات العامل.')
  }
})

// اختيار نوع الإجازة
leavesAddHandler.callbackQuery(/^leaves:add:type:(\d+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])
  const leaveType = ctx.match[2]

  const data = formData.get(userId)
  if (!data)
    return

  data.leaveType = leaveType
  data.step = 'selectStartDate'
  formData.set(userId, data)

  const leaveTypeLabels: Record<string, string> = {
    REGULAR: 'اعتيادية',
    SICK: 'مرضية',
    EMERGENCY: 'عارضة',
    UNPAID: 'بدون مرتب',
  }

  const keyboard = Calendar.create({
    callbackPrefix: `leaves:add:startDate:${employeeId}`,
  })
  keyboard.row()
  keyboard.text('⬅️ رجوع', `leaves:add:employee:${employeeId}`)

  await ctx.editMessageText(
    `📝 **تسجيل إجازة جديدة**\n\n`
    + `📋 **نوع الإجازة:** ${leaveTypeLabels[leaveType]}\n\n`
    + `اختر تاريخ بداية الإجازة:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// اختيار تاريخ البداية
leavesAddHandler.callbackQuery(/^leaves:add:startDate:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])
  const dateStr = ctx.match[2]

  const data = formData.get(userId)
  if (!data)
    return

  const startDate = Calendar.parseDate(dateStr)
  if (!startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  data.startDate = dateStr
  data.step = 'selectEndDate'
  formData.set(userId, data)

  try {
    const prisma = Database.prisma
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee)
      return

    // حساب تاريخ النهاية المقترح
    const suggestedEndDate = new Date(startDate)
    if (employee.leaveDaysPerCycle) {
      suggestedEndDate.setDate(suggestedEndDate.getDate() + employee.leaveDaysPerCycle - 1)
    }
    else {
      suggestedEndDate.setDate(suggestedEndDate.getDate() + 9) // 10 أيام افتراضي
    }

    const keyboard = new InlineKeyboard()
      .text(`✅ ${Calendar.formatArabic(suggestedEndDate)}`, `leaves:add:endDate:${employeeId}:${formatDateForCallback(suggestedEndDate)}`)
      .row()
      .text('📅 تاريخ آخر', `leaves:add:customEndDate:${employeeId}`)
      .row()
      .text('⬅️ رجوع', `leaves:add:type:${employeeId}:${data.leaveType}`)

    await ctx.editMessageText(
      `📝 **تسجيل إجازة جديدة**\n\n`
      + `📅 **تاريخ البداية:** ${Calendar.formatArabic(startDate)}\n\n`
      + `📅 **تاريخ النهاية المقترح:** ${Calendar.formatArabic(suggestedEndDate)}\n`
      + `⏱️ **المدة:** ${LeaveScheduleService.calculateTotalDays(startDate, suggestedEndDate)} أيام\n\n`
      + `هل توافق على التاريخ المقترح؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error calculating end date:', error)
  }
})

// اختيار تاريخ نهاية مخصص
leavesAddHandler.callbackQuery(/^leaves:add:customEndDate:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = Calendar.create({
    callbackPrefix: `leaves:add:endDate:${employeeId}`,
  })
  keyboard.row()
  keyboard.text('⬅️ رجوع', `leaves:add:startDate:${employeeId}`)

  await ctx.editMessageText(
    `📝 **تسجيل إجازة جديدة**\n\n`
    + `اختر تاريخ نهاية الإجازة:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تأكيد تاريخ النهاية
leavesAddHandler.callbackQuery(/^leaves:add:endDate:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])
  const dateStr = ctx.match[2]

  const data = formData.get(userId)
  if (!data || !data.startDate)
    return

  const endDate = Calendar.parseDate(dateStr)
  const startDate = Calendar.parseDate(data.startDate)

  if (!endDate || !startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  // التحقق من أن تاريخ النهاية بعد البداية
  if (endDate < startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
    return
  }

  data.endDate = dateStr
  data.step = 'addNotes'
  formData.set(userId, data)

  const totalDays = LeaveScheduleService.calculateTotalDays(startDate, endDate)

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `leaves:add:confirm:${employeeId}`)
    .row()
    .text('⬅️ رجوع', `leaves:add:startDate:${employeeId}`)

  await ctx.editMessageText(
    `📝 **تسجيل إجازة جديدة**\n\n`
    + `📅 **من:** ${Calendar.formatArabic(startDate)}\n`
    + `📅 **إلى:** ${Calendar.formatArabic(endDate)}\n`
    + `⏱️ **المدة:** ${totalDays} أيام\n\n`
    + `💬 أرسل ملاحظات (اختياري) أو اضغط تخطي:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// استقبال الملاحظات
leavesAddHandler.on('message:text', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data || data.step !== 'addNotes')
    return

  data.notes = ctx.message.text.trim()
  formData.set(userId, data)

  await ctx.reply(
    '✅ تم حفظ الملاحظات.\n\nجاري عرض الملخص...',
    {
      reply_markup: new InlineKeyboard()
        .text('📋 عرض الملخص', `leaves:add:confirm:${data.employeeId}`),
    },
  )
})

// عرض ملخص وتأكيد
leavesAddHandler.callbackQuery(/^leaves:add:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])
  const data = formData.get(userId)

  if (!data || !data.startDate || !data.endDate || !data.leaveType) {
    await ctx.editMessageText('❌ بيانات غير مكتملة.')
    return
  }

  try {
    const prisma = Database.prisma
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
      },
    })

    if (!employee)
      return

    const startDate = Calendar.parseDate(data.startDate)
    const endDate = Calendar.parseDate(data.endDate)
    if (!startDate || !endDate)
      return

    // التحقق من عدم وجود تداخل في التواريخ مع إجازات أخرى
    const overlappingLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId,
        isActive: true,
        actualReturnDate: null, // ✅ فقط الإجازات المفتوحة (التي لم يتم تسجيل عودة لها)
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          // الإجازة الجديدة تبدأ خلال إجازة موجودة
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          // الإجازة الجديدة تنتهي خلال إجازة موجودة
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          // الإجازة الجديدة تحيط بإجازة موجودة
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
      select: {
        leaveNumber: true,
        startDate: true,
        endDate: true,
      },
    })

    if (overlappingLeaves.length > 0) {
      const leave = overlappingLeaves[0]
      await ctx.editMessageText(
        `❌ **تعارض في التواريخ!**\n\n`
        + `هناك إجازة مسجلة تتداخل مع الفترة المطلوبة:\n\n`
        + `📋 **الإجازة المتعارضة:** ${leave.leaveNumber}\n`
        + `📅 **من:** ${Calendar.formatArabic(leave.startDate)}\n`
        + `📅 **إلى:** ${Calendar.formatArabic(leave.endDate)}\n\n`
        + `يرجى اختيار تواريخ مختلفة أو حذف الإجازة المتعارضة.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'leaves:add'),
        },
      )
      return
    }

    const totalDays = LeaveScheduleService.calculateTotalDays(startDate, endDate)

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    let message = `📋 **ملخص الإجازة**\n\n`
    message += `👤 **العامل:** ${employee.fullName}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n\n`
    message += `📋 **نوع الإجازة:** ${leaveTypeLabels[data.leaveType]}\n`
    message += `📅 **من:** ${Calendar.formatArabic(startDate)}\n`
    message += `📅 **إلى:** ${Calendar.formatArabic(endDate)}\n`
    message += `⏱️ **المدة:** ${totalDays} أيام\n`

    if (data.notes) {
      message += `\n💬 **ملاحظات:** ${data.notes}\n`
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `هل تريد حفظ هذه الإجازة؟`

    const keyboard = new InlineKeyboard()
      .text('✅ حفظ', `leaves:add:save:${employeeId}`)
      .text('❌ إلغاء', 'leavesHandler')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error showing summary:', error)
  }
})

// حفظ الإجازة
leavesAddHandler.callbackQuery(/^leaves:add:save:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري الحفظ...')

  const userId = ctx.from?.id
  if (!userId)
    return

  const employeeId = Number.parseInt(ctx.match[1])
  const data = formData.get(userId)

  if (!data || !data.startDate || !data.endDate || !data.leaveType) {
    await ctx.editMessageText('❌ بيانات غير مكتملة.')
    return
  }

  try {
    const prisma = Database.prisma

    const startDate = Calendar.parseDate(data.startDate)
    const endDate = Calendar.parseDate(data.endDate)
    if (!startDate || !endDate)
      return

    const totalDays = LeaveScheduleService.calculateTotalDays(startDate, endDate)

    // توليد رقم الإجازة
    const leaveNumber = await LeaveScheduleService.generateLeaveNumber()

    // جلب بيانات العامل الكاملة
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
      },
    })

    if (!employee)
      return

    // حفظ الإجازة
    const leave = await prisma.hR_EmployeeLeave.create({
      data: {
        employeeId,
        leaveNumber,
        leaveType: data.leaveType as any,
        startDate,
        endDate,
        totalDays,
        reason: data.notes || null,
        status: 'PENDING',
        isActive: true,
      },
    })

    // تحديث حالة العامل
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isOnLeave: true,
        currentLeaveId: leave.id,
      },
    })

    // حساب موعد الإجازة القادمة
    await LeaveScheduleService.updateNextLeaveDate(employeeId)

    // جلب بيانات المسجل
    const admin = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    })

    // مسح البيانات المؤقتة
    formData.delete(userId)

    // تنسيق التواريخ مع اليوم
    const startDateFormatted = formatDateWithDay(startDate)
    const endDateFormatted = formatDateWithDay(endDate)
    const registrationDate = formatDateWithDay(new Date())

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    // إنشاء التقرير الكامل
    let report = `✅ **تم تسجيل الإجازة بنجاح!**\n\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **تقرير الإجازة**\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`

    // بيانات العامل
    report += `👤 **العامل:** ${employee.fullName}`
    if (employee.nickname) {
      report += ` (${employee.nickname})`
    }
    report += `\n`
    report += `🔢 **كود العامل:** ${employee.employeeCode}\n`
    report += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    report += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`

    // بيانات الإجازة
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **رقم الإجازة:** ${leaveNumber}\n`
    report += `📂 **نوع الإجازة:** ${leaveTypeLabels[data.leaveType]}\n`
    report += `📅 **من:** ${startDateFormatted}\n`
    report += `📅 **إلى:** ${endDateFormatted}\n`
    report += `⏱️ **المدة:** ${totalDays} أيام\n`

    if (data.notes) {
      report += `\n💬 **ملاحظات:**\n${data.notes}\n`
    }

    // بيانات التسجيل
    report += `\n━━━━━━━━━━━━━━━━━━━━\n`
    report += `👨‍💼 **مسجل الإجازة:** ${admin?.fullName || 'غير معروف'}\n`
    report += `📅 **تاريخ التسجيل:** ${registrationDate}\n`
    report += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('📝 تسجيل إجازة أخرى', 'leaves:add')
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
    console.error('Error saving leave:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في حفظ الإجازة.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
})

// دالة مساعدة لتنسيق التاريخ للـ callback
function formatDateForCallback(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// دالة لتنسيق التاريخ مع اليوم
function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
