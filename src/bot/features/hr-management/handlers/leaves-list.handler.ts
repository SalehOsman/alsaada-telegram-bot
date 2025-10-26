/**
 * Handler قائمة الإجازات
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'

export const leavesListHandler = new Composer<Context>()

// عرض قائمة الإجازات
leavesListHandler.callbackQuery(/^leaves:list(?::(\w+))?(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const filter = ctx.match[1] || 'all'
  const page = Number.parseInt(ctx.match[2] || '0')

  try {
    const prisma = Database.prisma
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // بناء الفلتر
    let where: any = {}

    switch (filter) {
      case 'active':
        where = { status: 'APPROVED', isActive: true }
        break
      case 'upcoming':
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)
        where = { startDate: { gte: today, lte: nextWeek } }
        break
      case 'completed':
        where = { status: 'APPROVED', isActive: false }
        break
      case 'overdue':
        where = { status: 'APPROVED', isActive: true, endDate: { lt: today } }
        break
      default:
        where = {}
    }

    // جلب الإجازات
    const pageSize = 10
    const leaves = await prisma.hR_EmployeeLeave.findMany({
      where,
      include: {
        employee: {
          include: {
            position: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    })

    const total = await prisma.hR_EmployeeLeave.count({ where })

    if (leaves.length === 0) {
      await ctx.editMessageText(
        '📋 **قائمة الإجازات**\n\n❌ لا توجد إجازات.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔄 تحديث', `leaves:list:${filter}:${page}`)
            .row()
            .text('⬅️ رجوع', 'leavesHandler'),
        }
      )
      return
    }

    // بناء الرسالة
    const filterLabels: Record<string, string> = {
      all: 'الكل',
      active: 'نشطة',
      upcoming: 'قادمة',
      completed: 'منتهية',
      overdue: 'متأخرة',
    }

    let message = `📋 **قائمة الإجازات**\n\n`
    message += `🔍 **الفلتر:** ${filterLabels[filter]}\n`
    message += `📊 **الإجمالي:** ${total} إجازة\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    // عرض الإجازات
    for (const leave of leaves) {
      const leaveTypeLabels: Record<string, string> = {
        REGULAR: '🏖️ اعتيادية',
        SICK: '🏥 مرضية',
        EMERGENCY: '🚨 عارضة',
        UNPAID: '💼 بدون مرتب',
      }

      message += `📋 **${leave.leaveNumber}**\n`
      message += `👤 ${leave.employee.nickname || leave.employee.fullName}\n`
      message += `${leaveTypeLabels[leave.leaveType]} | ${Calendar.formatShort(leave.startDate)} → ${Calendar.formatShort(leave.endDate)}\n`
      message += `⏱️ ${leave.totalDays} أيام\n\n`
    }

    // أزرار الفلاتر
    const keyboard = new InlineKeyboard()
      .text(filter === 'all' ? '✅ الكل' : 'الكل', 'leaves:list:all:0')
      .text(filter === 'active' ? '✅ نشطة' : 'نشطة', 'leaves:list:active:0')
      .row()
      .text(filter === 'upcoming' ? '✅ قادمة' : 'قادمة', 'leaves:list:upcoming:0')
      .text(filter === 'completed' ? '✅ منتهية' : 'منتهية', 'leaves:list:completed:0')
      .row()
      .text(filter === 'overdue' ? '✅ متأخرة' : 'متأخرة', 'leaves:list:overdue:0')
      .row()

    // أزرار التنقل
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      if (page > 0) {
        keyboard.text('◀️', `leaves:list:${filter}:${page - 1}`)
      }
      keyboard.text(`${page + 1}/${totalPages}`, 'noop')
      if (page < totalPages - 1) {
        keyboard.text('▶️', `leaves:list:${filter}:${page + 1}`)
      }
      keyboard.row()
    }

    keyboard.text('⬅️ رجوع', 'leavesHandler')

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
      }
    )
  }
})
