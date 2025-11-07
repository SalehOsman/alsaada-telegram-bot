/**
 * Handler قائمة المأموريات الحالية
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'

export const missionsListHandler = new Composer<Context>()

// عرض قائمة المأموريات الحالية
missionsListHandler.callbackQuery(/^missions:list(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  try {
    const prisma = Database.prisma

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // جلب المأموريات الحالية فقط (النشطة الآن)
    const where: any = {
      isActive: true,
      status: 'PENDING',
      startDate: { lte: today },
      endDate: { gte: today },
    }

    const [missions, total] = await Promise.all([
      prisma.hR_EmployeeMission.findMany({
        where,
        include: {
          employee: {
            include: {
              position: true,
              department: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.hR_EmployeeMission.count({ where }),
    ])

    if (missions.length === 0) {
      await ctx.editMessageText(
        '📋 **قائمة المأموريات الحالية**\n\n❌ لا يوجد عاملين في مأمورية حالياً.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
        }
      )
      return
    }

    // بناء الرسالة
    let message = `📋 **قائمة المأموريات الحالية**\n\n`
    message += `👥 **عدد العاملين في مأمورية:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر عامل لعرض تفاصيل مأموريته:`

    // بناء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // إضافة أزرار العاملين (20 صف في عمود واحد)
    missions.forEach((mission: any) => {
      const nickname = mission.employee?.nickname || generateNickname(mission.employee?.fullName || '')
      const position = mission.employee?.position?.titleAr || 'غير محدد'
      
      // تحقق من المأمورية المفتوحة
      const isOpenEnded = mission.endDate.getFullYear() === 2099
      const returnDate = isOpenEnded ? 'مفتوحة' : Calendar.formatArabic(mission.endDate)
      
      const missionIcon = mission.missionType === 'TASK_EXECUTION' ? '🎯' : '🏠'
      const buttonText = `${missionIcon} ${nickname} (${position}) - ${returnDate}`
      keyboard.text(buttonText, `missions:details:${mission.id}`).row()
    })

    // أزرار التنقل
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `missions:list:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'missions:list:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `missions:list:${page + 1}`))
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
    console.error('Error loading missions list:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة المأموريات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
      }
    )
  }
})

// عرض تفاصيل مأمورية
missionsListHandler.callbackQuery(/^missions:details:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const mission = await prisma.hR_EmployeeMission.findUnique({
      where: { id: missionId },
      include: {
        employee: {
          include: {
            position: true,
            department: true,
          },
        },
      },
    })

    if (!mission) {
      await ctx.editMessageText('❌ المأمورية غير موجودة.')
      return
    }

    // تنسيق التواريخ مع اليوم
    const isOpenEnded = mission.endDate.getFullYear() === 2099
    const startDateFormatted = formatDateWithDay(mission.startDate)
    const endDateFormatted = isOpenEnded ? 'مفتوحة (بدون تاريخ نهاية محدد)' : formatDateWithDay(mission.endDate)
    const registrationDate = formatDateWithDay(mission.createdAt)

    const missionTypeLabels: Record<string, string> = {
      TASK_EXECUTION: '🎯 مأمورية أداء مهمة',
      EXTERNAL_WORK: '🏠 العمل من الخارج',
    }

    const statusLabels: Record<string, string> = {
      PENDING: '⏳ نشطة',
      APPROVED: '✅ مكتملة',
      CANCELLED: '❌ ملغاة',
    }

    // إنشاء التقرير
    let message = `📋 **تفاصيل المأمورية**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    
    // بيانات العامل
    message += `👤 **العامل:** ${mission.employee?.fullName}`
    if (mission.employee?.nickname) {
      message += ` (${mission.employee.nickname})`
    }
    message += `\n`
    message += `🔢 **كود العامل:** ${mission.employee?.employeeCode}\n`
    message += `💼 **الوظيفة:** ${mission.employee?.position?.titleAr || 'غير محدد'}\n`
    message += `🏢 **القسم:** ${mission.employee?.department?.name || 'غير محدد'}\n\n`
    
    // بيانات المأمورية
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📋 **رقم المأمورية:** ${mission.missionNumber}\n`
    message += `📂 **نوع المأمورية:** ${missionTypeLabels[mission.missionType]}\n`
    message += `📅 **من:** ${startDateFormatted}\n`
    
    if (isOpenEnded) {
      message += `⏳ **إلى:** ${endDateFormatted}\n`
    }
    else {
      message += `📅 **إلى:** ${endDateFormatted}\n`
      message += `⏱️ **المدة:** ${mission.totalDays} أيام\n`
    }
    
    message += `📍 **الموقع:** ${mission.location}\n`
    message += `🎯 **الغرض:** ${mission.purpose}\n`
    
    if (mission.allowanceAmount && mission.allowanceAmount > 0) {
      message += `💰 **العهدة:** ${mission.allowanceAmount} جنيه\n`
    }
    
    message += `📊 **الحالة:** ${statusLabels[mission.status]}\n`
    
    if (mission.notes) {
      message += `\n💬 **ملاحظات:**\n${mission.notes}\n`
    }
    
    // بيانات التسجيل
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`
    message += `📅 **تاريخ التسجيل:** ${registrationDate}\n`
    
    if (mission.actualReturnDate) {
      const actualReturnFormatted = formatDateWithDay(mission.actualReturnDate)
      message += `↩️ **تاريخ العودة الفعلي:** ${actualReturnFormatted}\n`
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع للقائمة', 'missions:list')
      .row()
      .text('🏠 القائمة الرئيسية', 'missions:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading mission details:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل تفاصيل المأمورية.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:list'),
      }
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
