/**
 * Handler قائمة الإجازات الحالية - محدّث حسب المنطق الجديد
 * المنطق: أي إجازة لم يتم تسجيل عودة فعلية لها = إجازة حالية
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'
import { Composer, InlineKeyboard } from 'grammy'

export const leavesListHandler = new Composer<Context>()

// عرض قائمة الإجازات الحالية
leavesListHandler.callbackQuery(/^leaves:list(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  try {
    const prisma = Database.prisma

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // ✅ عرض جميع الإجازات المفتوحة (التي لم يتم تسجيل عودة العامل منها)
    // ⚠️ استبعاد التسويات النقدية (CASH_SETTLEMENT) لأنها ليست إجازات فعلية
    const where: any = {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      actualReturnDate: null, // لم يتم تسجيل العودة
      settlementType: 'ACTUAL_LEAVE', // 🏖️ إجازات فعلية فقط (استبعاد التسويات النقدية)
    }

    const [leaves, total] = await Promise.all([
      prisma.hR_EmployeeLeave.findMany({
        where,
        include: {
          employee: {
            include: {
              position: true,
              department: true,
            },
          },
        },
        orderBy: [
          { startDate: 'asc' }, // الأقرب للبدء أولاً
          { endDate: 'asc' },
        ],
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.hR_EmployeeLeave.count({ where }),
    ])

    if (leaves.length === 0) {
      await ctx.editMessageText(
        '📋 **قائمة الإجازات المفتوحة**\n\n'
        + '✅ لا توجد إجازات مفتوحة (جميع العاملين سجلوا عودتهم).',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
        },
      )
      return
    }

    // بناء الرسالة
    let message = `📋 **قائمة الإجازات المفتوحة**\n\n`
    message += `📋 **إجمالي الإجازات:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر إجازة لعرض التفاصيل:`

    // بناء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // إضافة أزرار الإجازات مع حالة كل إجازة
    leaves.forEach((leave: any) => {
      const nickname = leave.employee?.nickname || generateNickname(leave.employee?.fullName || '')
      const position = leave.employee?.position?.titleAr || 'غير محدد'

      // تحديد حالة الإجازة وتنسيق النص
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      let statusText = ''
      let statusIcon = ''

      if (startDate > today) {
        // إجازة مستقبلية - لم تبدأ بعد
        const startFormatted = Calendar.formatArabic(leave.startDate)
        statusText = `تبدأ في ${startFormatted}`
        statusIcon = '🔵'
      }
      else if (startDate <= today && endDate >= today) {
        // إجازة جارية - العامل في إجازة الآن
        const endFormatted = Calendar.formatArabic(leave.endDate)
        statusText = `جارية تنتهي في ${endFormatted}`
        statusIcon = '🟢'
      }
      else {
        // إجازة متأخرة - انتهت ولم تُسجل عودة
        const delayDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        statusText = `متأخر ${delayDays} يوم`
        statusIcon = '🔴'
      }

      const buttonText = `${statusIcon} ${nickname} (${position}) - ${statusText}`
      keyboard.text(buttonText, `leaves:details:${leave.id}`).row()
    })

    // أزرار التنقل
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `leaves:list:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:list:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `leaves:list:${page + 1}`))
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
    console.error('Error loading leaves list:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة الإجازات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
})

// عرض تفاصيل إجازة
leavesListHandler.callbackQuery(/^leaves:details:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const leaveId = Number.parseInt(ctx.match[1])

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

    // تنسيق التواريخ
    const startDateFormatted = formatDateWithDay(leave.startDate)
    const endDateFormatted = formatDateWithDay(leave.endDate)
    const registrationDate = formatDateWithDay(leave.createdAt)

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب',
    }

    // إنشاء التقرير الكامل
    let report = `📋 **تقرير الإجازة**\n\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`

    // بيانات العامل
    report += `👤 **العامل:** ${leave.employee.fullName}`
    if (leave.employee.nickname) {
      report += ` (${leave.employee.nickname})`
    }
    report += `\n`
    report += `🔢 **كود العامل:** ${leave.employee.employeeCode}\n`
    report += `💼 **الوظيفة:** ${leave.employee.position?.titleAr || 'غير محدد'}\n`
    report += `🏢 **القسم:** ${leave.employee.department?.name || 'غير محدد'}\n\n`

    // بيانات الإجازة
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **رقم الإجازة:** ${leave.leaveNumber}\n`
    report += `📂 **نوع الإجازة:** ${leaveTypeLabels[leave.leaveType]}\n`
    report += `📅 **من:** ${startDateFormatted}\n`
    report += `📅 **إلى:** ${endDateFormatted}\n`
    report += `⏱️ **المدة:** ${leave.totalDays} أيام\n`

    // حالة الإجازة
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(leave.startDate)
    const endDate = new Date(leave.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (startDate > today) {
      report += `\n🔵 **الحالة:** مستقبلية (لم تبدأ بعد)\n`
    }
    else if (startDate <= today && endDate >= today) {
      report += `\n🟢 **الحالة:** جارية (العامل في إجازة الآن)\n`
    }
    else {
      const delayDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
      report += `\n🔴 **الحالة:** متأخرة (${delayDays} يوم)\n`
    }

    if (leave.reason) {
      report += `\n💬 **ملاحظات:**\n${leave.reason}\n`
    }

    // بيانات التسجيل
    report += `\n━━━━━━━━━━━━━━━━━━━━\n`
    report += `📅 **تاريخ التسجيل:** ${registrationDate}\n`
    report += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل', `leaves:edit:${leaveId}`)
      .text('🗑️ حذف', `leaves:delete:confirm:${leaveId}`)
      .row()
      .text('⬅️ رجوع للقائمة', 'leaves:list')
      .row()
      .text('🏠 القائمة الرئيسية', 'leavesHandler')

    await ctx.editMessageText(report, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading leave details:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل تفاصيل الإجازة.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:list'),
      },
    )
  }
})

// دالة لتنسيق التاريخ مع اليوم
function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
