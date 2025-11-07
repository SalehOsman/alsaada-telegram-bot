/**
 * Handler عرض مأموريات عامل
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'

export const missionsEmployeeHandler = new Composer<Context>()

// عرض قائمة العاملين
missionsEmployeeHandler.callbackQuery(/^missions:employee(?::(\d+))?$/, async (ctx) => {
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
        '👤 **عرض مأموريات عامل**\n\n❌ لا يوجد عاملين.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
        }
      )
      return
    }

    let message = `👤 **عرض مأموريات عامل**\n\n`
    message += `👥 **عدد العاملين:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر العامل:`

    const keyboard = new InlineKeyboard()

    employees.forEach((emp: any) => {
      const nickname = emp.nickname || generateNickname(emp.fullName || '')
      const position = emp.position?.titleAr || 'غير محدد'
      
      const buttonText = `${nickname} (${position})`
      keyboard.text(buttonText, `missions:employee:view:${emp.id}`).row()
    })

    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `missions:employee:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'missions:employee:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `missions:employee:${page + 1}`))
      }
      keyboard.row(...navButtons)
    }

    keyboard.row().text('⬅️ رجوع', 'missions:main')

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

// عرض مأموريات العامل
missionsEmployeeHandler.callbackQuery(/^missions:employee:view:(\d+)$/, async (ctx) => {
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

    const missions = await prisma.hR_EmployeeMission.findMany({
      where: {
        employeeId,
        isActive: true,
      },
      orderBy: { startDate: 'desc' },
      take: 10,
    })

    const missionTypeLabels: Record<string, string> = {
      TASK_EXECUTION: '🎯 مأمورية أداء مهمة',
      EXTERNAL_WORK: '🏠 العمل من الخارج',
    }

    // حساب الإحصائيات
    const totalMissions = missions.length
    const totalDays = missions.reduce((sum, m) => {
      // لا نحسب المأموريات المفتوحة في المجموع
      return m.endDate.getFullYear() === 2099 ? sum : sum + m.totalDays
    }, 0)
    
    const totalDelays = missions.reduce((sum, m) => {
      if (m.actualReturnDate && m.endDate && m.endDate.getFullYear() !== 2099) {
        const endDate = new Date(m.endDate)
        const returnDate = new Date(m.actualReturnDate)
        endDate.setHours(0, 0, 0, 0)
        returnDate.setHours(0, 0, 0, 0)
        const expectedReturn = new Date(endDate)
        expectedReturn.setDate(expectedReturn.getDate() + 1)
        const diff = Math.floor((returnDate.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (diff > 0 ? diff : 0)
      }
      return sum
    }, 0)

    const totalAllowance = missions.reduce((sum, m) => sum + (m.allowanceAmount || 0), 0)

    // بناء الرسالة
    let message = `👤 **تقرير مأموريات العامل**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    
    // بيانات العامل
    message += `👤 **العامل:** ${employee.fullName}`
    if (employee.nickname) {
      message += ` (${employee.nickname})`
    }
    message += `\n`
    message += `🔢 **كود العامل:** ${employee.employeeCode}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    message += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`
    
    // الإحصائيات
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📊 **الإحصائيات**\n\n`
    message += `✈️ **عدد المأموريات:** ${totalMissions}\n`
    message += `📅 **إجمالي الأيام:** ${totalDays} يوم\n`
    
    if (totalAllowance > 0) {
      message += `💰 **إجمالي العهد:** ${totalAllowance} جنيه\n`
    }
    
    if (totalDelays > 0) {
      message += `⚠️ **إجمالي التأخير:** ${totalDelays} يوم\n`
    }

    if (missions.length > 0) {
      message += `\n━━━━━━━━━━━━━━━━━━━━\n`
      message += `📋 **آخر ${missions.length} مأموريات:**\n\n`

      missions.forEach((mission, index) => {
        const isOpenEnded = mission.endDate.getFullYear() === 2099
        const statusIcon = mission.status === 'APPROVED' ? '✅' : mission.status === 'CANCELLED' ? '❌' : '⏳'
        
        message += `${index + 1}. ${missionTypeLabels[mission.missionType]}\n`
        message += `   📋 ${mission.missionNumber}\n`
        message += `   📅 ${Calendar.formatArabic(mission.startDate)}`
        
        if (isOpenEnded) {
          message += ` - مفتوحة\n`
        }
        else {
          message += ` - ${Calendar.formatArabic(mission.endDate)}\n`
          message += `   ⏱️ ${mission.totalDays} أيام\n`
        }
        
        message += `   📍 ${mission.location}\n`
        message += `   ${statusIcon} ${mission.status === 'APPROVED' ? 'مكتملة' : mission.status === 'CANCELLED' ? 'ملغاة' : 'نشطة'}\n`
        
        if (mission.actualReturnDate) {
          message += `   ↩️ ${Calendar.formatArabic(mission.actualReturnDate)}\n`
        }
        
        message += `\n`
      })
    }
    else {
      message += `\n❌ لا يوجد مأموريات مسجلة لهذا العامل.\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع للقائمة', 'missions:employee')
      .row()
      .text('🏠 القائمة الرئيسية', 'missions:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employee missions:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل بيانات المأموريات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:employee'),
      }
    )
  }
})
