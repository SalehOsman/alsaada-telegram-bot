/**
 * Handler عرض إجازات عامل
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'

export const leavesEmployeeHandler = new Composer<Context>()

// عرض قائمة العاملين
leavesEmployeeHandler.callbackQuery(/^leaves:employee(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  try {
    const prisma = Database.prisma

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: {
          isActive: true,
          employmentStatus: 'ACTIVE',
        },
        include: {
          position: true,
        },
        orderBy: { fullName: 'asc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.employee.count({
        where: {
          isActive: true,
          employmentStatus: 'ACTIVE',
        },
      }),
    ])

    if (employees.length === 0) {
      await ctx.editMessageText(
        '👤 **عرض إجازات عامل**\n\n❌ لا يوجد عاملين.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
        }
      )
      return
    }

    let message = `👤 **عرض إجازات عامل**\n\n`
    message += `👥 **عدد العاملين:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر العامل:`

    const keyboard = new InlineKeyboard()

    employees.forEach((emp: any) => {
      const nickname = emp.nickname || generateNickname(emp.fullName || '')
      const position = emp.position?.titleAr || 'غير محدد'
      
      const buttonText = `${nickname} (${position})`
      keyboard.text(buttonText, `leaves:employee:view:${emp.id}`).row()
    })

    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `leaves:employee:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'leaves:employee:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `leaves:employee:${page + 1}`))
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
    console.error('Error loading employees:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل قائمة العاملين.')
  }
})

// عرض إجازات العامل
leavesEmployeeHandler.callbackQuery(/^leaves:employee:view:(\d+)$/, async (ctx) => {
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

    const [leaves, allowances] = await Promise.all([
      prisma.hR_EmployeeLeave.findMany({
        where: {
          employeeId,
          isActive: true,
        },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),
      prisma.hR_LeaveAllowance.findMany({
        where: {
          employeeId,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const leaveTypeLabels: Record<string, string> = {
      REGULAR: '🏖️ اعتيادية',
      SICK: '🏥 مرضية',
      EMERGENCY: '🚨 عارضة',
      UNPAID: '💼 بدون مرتب',
    }

    // حساب الإحصائيات
    const totalDays = leaves.reduce((sum, l) => sum + l.totalDays, 0)
    const totalDelays = leaves.reduce((sum, l) => {
      if (l.actualReturnDate && l.endDate) {
        const endDate = new Date(l.endDate)
        const returnDate = new Date(l.actualReturnDate)
        endDate.setHours(0, 0, 0, 0)
        returnDate.setHours(0, 0, 0, 0)
        const expectedReturn = new Date(endDate)
        expectedReturn.setDate(expectedReturn.getDate() + 1)
        const diff = Math.floor((returnDate.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (diff > 0 ? diff : 0)
      }
      return sum
    }, 0)

    const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0)
    const monthsSinceHire = employee.hireDate 
      ? Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0
    const avgMonthly = monthsSinceHire > 0 ? (totalDays / monthsSinceHire).toFixed(1) : '0'

    let message = `👤 **إجازات العامل**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `👤 **الاسم:** ${employee.fullName}\n`
    if (employee.nickname) {
      message += `📛 **الشهرة:** ${employee.nickname}\n`
    }
    message += `🔢 **الكود:** ${employee.employeeCode}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    message += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n`
    if (employee.hireDate) {
      message += `📅 **تاريخ بداية العمل:** ${Calendar.formatArabic(employee.hireDate)}\n`
    }
    if (employee.isOnLeave) {
      message += `\n🏖️ **الحالة:** في إجازة حالياً\n`
    }
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي أيام الإجازة: ${totalDays} يوم\n`
    message += `• إجمالي أيام التأخير: ${totalDelays} يوم\n`
    message += `• متوسط الإجازة الشهري: ${avgMonthly} يوم\n`
    message += `• عدد الإجازات: ${leaves.length}\n`
    if (allowances.length > 0) {
      message += `• بدلات الإجازات: ${totalAllowances.toFixed(2)} جنيه\n`
    }
    message += `\n`

    if (leaves.length > 0) {
      message += `📋 **آخر ${leaves.length} إجازة:**\n\n`
      leaves.forEach((leave, index) => {
        const isCashSettlement = leave.settlementType === 'CASH_SETTLEMENT'
        message += `**${index + 1}.** ${isCashSettlement ? '💰 تسوية نقدية' : leaveTypeLabels[leave.leaveType] || leave.leaveType}\n`
        message += `   📅 ${Calendar.formatArabic(leave.startDate)} - ${Calendar.formatArabic(leave.endDate)}\n`
        message += `   ⏱️ ${leave.totalDays} أيام\n`
        if (isCashSettlement && leave.allowanceAmount) {
          message += `   💵 ${leave.allowanceAmount.toFixed(2)} جنيه\n`
        }
        message += `   🔢 ${leave.leaveNumber}\n`
        if (!isCashSettlement && leave.actualReturnDate) {
          const endDate = new Date(leave.endDate)
          const returnDate = new Date(leave.actualReturnDate)
          endDate.setHours(0, 0, 0, 0)
          returnDate.setHours(0, 0, 0, 0)
          const expectedReturn = new Date(endDate)
          expectedReturn.setDate(expectedReturn.getDate() + 1)
          const diff = Math.floor((returnDate.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24))
          if (diff > 0) {
            message += `   ⚠️ تأخير: ${diff} يوم\n`
          }
        }
        message += `\n`
      })
    }



    if (leaves.length === 0 && allowances.length === 0) {
      message += `❌ لا توجد إجازات أو بدلات مسجلة.`
    }

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'leaves:employee')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employee leaves:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل إجازات العامل.')
  }
})
