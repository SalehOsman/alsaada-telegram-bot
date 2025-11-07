/**
 * Handler جدول أدوار الإجازات
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesScheduleHandler = new Composer<Context>()

// عرض جدول أدوار الإجازات - محدّث ومحسّن
leavesScheduleHandler.callbackQuery(/^leaves:schedule(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  await renderLeaveScheduleView(ctx, page)
})

// عرض تفاصيل إجازة عامل - محدّث
leavesScheduleHandler.callbackQuery(/^leaves:schedule:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

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

    // التحقق من وجود دورة محددة
    if (!employee.workDaysPerCycle || !employee.leaveDaysPerCycle) {
      await ctx.editMessageText(
        `❌ العامل **${employee.fullName}** لا يملك دورة عمل وإجازة محددة.\n\n`
        + `يرجى تحديد الدورة من:\n`
        + `إدارة شئون العاملين ← إدارة قسم شئون العاملين ← إدارة دورة العمل والإجازات`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:schedule'),
        },
      )
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // حساب موعد الإجازة القادمة
    let nextLeaveStart: Date
    let nextLeaveEnd: Date

    // إذا كان لديه موعد محدد في المستقبل
    if (employee.nextLeaveStartDate) {
      const dateObj = new Date(employee.nextLeaveStartDate)
      if (dateObj >= today) {
        nextLeaveStart = dateObj
      }
      else {
        // الموعد في الماضي، نحسب من جديد
        const baseDate = employee.lastLeaveEndDate ? new Date(employee.lastLeaveEndDate) : new Date(employee.hireDate)
        nextLeaveStart = new Date(baseDate)
        nextLeaveStart.setDate(nextLeaveStart.getDate() + employee.workDaysPerCycle)

        if (nextLeaveStart < today) {
          nextLeaveStart = new Date(today)
          nextLeaveStart.setDate(nextLeaveStart.getDate() + employee.workDaysPerCycle)
        }
      }
    }
    else {
      // لا يوجد موعد محدد، نحسبه
      const baseDate = employee.lastLeaveEndDate ? new Date(employee.lastLeaveEndDate) : new Date(employee.hireDate)
      baseDate.setHours(0, 0, 0, 0)

      nextLeaveStart = new Date(baseDate)
      nextLeaveStart.setDate(nextLeaveStart.getDate() + employee.workDaysPerCycle)

      if (nextLeaveStart < today) {
        nextLeaveStart = new Date(today)
        nextLeaveStart.setDate(nextLeaveStart.getDate() + employee.workDaysPerCycle)
      }
    }

    nextLeaveStart.setHours(0, 0, 0, 0)

    // حساب تاريخ النهاية
    if (employee.nextLeaveEndDate && employee.nextLeaveStartDate && new Date(employee.nextLeaveStartDate) >= today) {
      nextLeaveEnd = new Date(employee.nextLeaveEndDate)
    }
    else {
      nextLeaveEnd = new Date(nextLeaveStart)
      nextLeaveEnd.setDate(nextLeaveEnd.getDate() + employee.leaveDaysPerCycle - 1)
    }
    nextLeaveEnd.setHours(0, 0, 0, 0)

    const daysUntilLeave = Math.floor((nextLeaveStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let message = `📋 **تفاصيل الإجازة القادمة**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `👤 **العامل:** ${employee.fullName}\n`
    if (employee.nickname) {
      message += `🏷️ **اسم الشهرة:** ${employee.nickname}\n`
    }
    message += `🔢 **كود العامل:** ${employee.employeeCode}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    message += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📅 **تاريخ بداية الإجازة:** ${formatDateWithDay(nextLeaveStart)}\n`
    message += `📅 **تاريخ نهاية الإجازة:** ${formatDateWithDay(nextLeaveEnd)}\n`
    message += `⏱️ **مدة الإجازة:** ${employee.leaveDaysPerCycle} أيام\n`
    message += `⏳ **المتبقي على الإجازة:** ${daysUntilLeave} يوم\n\n`

    if (daysUntilLeave <= 3) {
      message += `🔴 **تنبيه:** الإجازة خلال 3 أيام!\n\n`
    }
    else if (daysUntilLeave <= 7) {
      message += `🟡 **ملاحظة:** الإجازة خلال أسبوع\n\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 **دورة العمل:** ${employee.workDaysPerCycle} يوم\n`
    message += `🏖️ **دورة الإجازة:** ${employee.leaveDaysPerCycle} يوم\n`

    if (employee.lastLeaveStartDate) {
      message += `\n📅 **آخر إجازة:** ${Calendar.formatArabic(employee.lastLeaveStartDate)}\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('⏸️ تأجيل الإجازة', `leaves:postpone:start:${employeeId}`)
      .row()
      .text('💰 صرف بدل إجازة', `leaves:allowance:start:${employeeId}`)
      .row()
      .text('⬅️ رجوع', 'leaves:schedule')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employee details:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل التفاصيل.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:schedule'),
      },
    )
  }
})

// إزالة الفلتر
leavesScheduleHandler.callbackQuery('leaves:schedule:clearfilter', async (ctx) => {
  ctx.session.leavesScheduleFilter = {}
  await ctx.answerCallbackQuery('✅ تم إزالة الفلتر')

  // إعادة تحميل القائمة مباشرة
  await renderLeaveScheduleView(ctx, 0)
})

/**
 * دالة مشتركة لعرض جدول أدوار الإجازات
 * تستخدم من قبل عدة handlers لتجنب تكرار الكود
 */
export async function renderLeaveScheduleView(ctx: Context, page: number = 0): Promise<void> {
  const pageSize = 20
  const prisma = Database.prisma
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const filter = ctx.session.leavesScheduleFilter || {}
    const where: any = {
      isActive: true,
      isOnLeave: false,
    }

    if (filter.positionId)
      where.positionId = filter.positionId
    if (filter.governorateId)
      where.governorateId = filter.governorateId

    // جلب الموظفين مع حساب موعد الإجازة القادمة لكل موظف
    const allEmployees = await prisma.employee.findMany({
      where,
      include: {
        position: true,
        department: true,
      },
    })

    // حساب موعد الإجازة لكل موظف باستخدام الخدمة المحدّثة
    const employeesWithDates = []
    for (const emp of allEmployees) {
      // التحقق من وجود دورة محددة
      if (!emp.workDaysPerCycle || !emp.leaveDaysPerCycle) {
        continue
      }

      let nextLeaveDate: Date | null = null

      // إذا كان لديه موعد محدد في المستقبل، نستخدمه
      if (emp.nextLeaveStartDate) {
        const dateObj = new Date(emp.nextLeaveStartDate)
        if (dateObj >= today) {
          nextLeaveDate = dateObj
        }
      }

      // إذا لم يكن هناك موعد أو الموعد في الماضي، نحسبه
      if (!nextLeaveDate) {
        const baseDate = emp.lastLeaveEndDate ? new Date(emp.lastLeaveEndDate) : new Date(emp.hireDate)
        baseDate.setHours(0, 0, 0, 0)

        nextLeaveDate = new Date(baseDate)
        nextLeaveDate.setDate(nextLeaveDate.getDate() + emp.workDaysPerCycle)

        // إذا كان في الماضي، نبدأ من اليوم
        if (nextLeaveDate < today) {
          nextLeaveDate = new Date(today)
          nextLeaveDate.setDate(nextLeaveDate.getDate() + emp.workDaysPerCycle)
        }
      }

      employeesWithDates.push({
        ...emp,
        calculatedNextLeave: nextLeaveDate,
      })
    }

    // ترتيب حسب موعد الإجازة
    employeesWithDates.sort((a, b) => {
      if (!a.calculatedNextLeave)
        return 1
      if (!b.calculatedNextLeave)
        return -1
      return a.calculatedNextLeave.getTime() - b.calculatedNextLeave.getTime()
    })

    const total = employeesWithDates.length
    const employees = employeesWithDates.slice(page * pageSize, (page + 1) * pageSize)

    // حساب الإحصائيات
    const onLeaveCount = await prisma.employee.count({ where: { isActive: true, isOnLeave: true } })

    let within3Days = 0
    let within7Days = 0
    let within30Days = 0

    employeesWithDates.forEach((emp: any) => {
      if (emp.calculatedNextLeave) {
        const nextDate = new Date(emp.calculatedNextLeave)
        nextDate.setHours(0, 0, 0, 0)
        const days = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (days <= 3)
          within3Days++
        else if (days <= 7)
          within7Days++
        if (days <= 30)
          within30Days++
      }
    })

    // معالجة حالة عدم وجود موظفين
    if (employees.length === 0) {
      const keyboard = new InlineKeyboard()

      // التحقق من وجود موظفين بدون دورة محددة
      const employeesWithoutCycle = await prisma.employee.count({
        where: {
          isActive: true,
          isOnLeave: false,
          OR: [
            { workDaysPerCycle: null },
            { leaveDaysPerCycle: null },
          ],
        },
      })

      let message = '🔄 **جدول أدوار الإجازات**\n\n'
      if (employeesWithoutCycle > 0) {
        message += `⚠️ يوجد ${employeesWithoutCycle} موظف يحتاج إلى إعداد دورة عمل وإجازة.\n\n`
        message += `يرجى الذهاب إلى:\n`
        message += `إدارة شئون العاملين ← إدارة قسم شئون العاملين ← إدارة دورة العمل والإجازات`
      }
      else {
        message += '❌ لا يوجد موظفين مؤهلين لعرضهم.'
      }

      keyboard.row().text('⬅️ رجوع', 'leavesHandler')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // بناء الرسالة
    let message = `🔄 **جدول أدوار الإجازات**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• في إجازة حالياً: ${onLeaveCount}\n`
    message += `• خلال 3 أيام: ${within3Days}\n`
    message += `• خلال أسبوع: ${within7Days}\n`
    message += `• خلال شهر: ${within30Days}\n\n`
    message += `👥 **عدد العاملين:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `🔴 خلال 3 أيام | 🟡 خلال أسبوع | 🟢 أكثر من أسبوع\n\n`
    message += `اختر عامل لعرض التفاصيل:`

    const keyboard = new InlineKeyboard()

    employees.forEach((employee: any) => {
      const nickname = employee.nickname || generateNickname(employee.fullName)
      const position = employee.position?.titleAr || 'غير محدد'

      const nextLeaveDate = employee.calculatedNextLeave
      if (!nextLeaveDate)
        return

      nextLeaveDate.setHours(0, 0, 0, 0)
      const daysUntilLeave = Math.floor((nextLeaveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let emoji = '🟢'
      if (daysUntilLeave <= 3)
        emoji = '🔴'
      else if (daysUntilLeave <= 7)
        emoji = '🟡'

      const dateFormatted = Calendar.formatArabic(nextLeaveDate)
      const buttonText = `${emoji} ${nickname} (${position}) - ${dateFormatted}`

      keyboard.text(buttonText, `leaves:schedule:view:${employee.id}`).row()
    })

    // أزرار التنقل بين الصفحات
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0)
        navButtons.push(InlineKeyboard.text('◀️ السابق', `leaves:schedule:${page - 1}`))
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:schedule:0'))
      if (page < totalPages - 1)
        navButtons.push(InlineKeyboard.text('التالي ▶️', `leaves:schedule:${page + 1}`))
      keyboard.row(...navButtons)
    }

    // أزرار الفلاتر
    keyboard.row()
      .text('👔 حسب الوظيفة', 'leaves:schedule:filter:position')
      .text('🌍 حسب المحافظة', 'leaves:schedule:filter:gov')

    if (filter.positionId || filter.governorateId)
      keyboard.row().text('🔄 إزالة الفلتر', 'leaves:schedule:clearfilter')

    keyboard.row().text('⬅️ رجوع', 'leavesHandler')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading leave schedule:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل جدول الأدوار.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
}

function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
