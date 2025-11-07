/**
 * Handler تسجيل العودة من مأمورية
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { generateNickname } from '#root/modules/utils/nickname-generator.js'

export const missionsReturnHandler = new Composer<Context>()

const returnData = new Map<number, any>()

// عرض قائمة العاملين في مأمورية
missionsReturnHandler.callbackQuery(/^missions:return(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 20

  try {
    const prisma = Database.prisma

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // جلب العاملين في مأمورية حالياً
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
        '↩️ **تسجيل عودة من مأمورية**\n\n❌ لا يوجد عاملين في مأمورية حالياً.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
        }
      )
      return
    }

    let message = `↩️ **تسجيل عودة من مأمورية**\n\n`
    message += `👥 **عدد العاملين في مأمورية:** ${total}\n`
    message += `📄 **الصفحة:** ${page + 1}/${Math.ceil(total / pageSize)}\n\n`
    message += `اختر العامل لتسجيل عودته:`

    const keyboard = new InlineKeyboard()

    missions.forEach((mission: any) => {
      const nickname = mission.employee?.nickname || generateNickname(mission.employee?.fullName || '')
      const position = mission.employee?.position?.titleAr || 'غير محدد'
      
      // تحقق من المأمورية المفتوحة
      const isOpenEnded = mission.endDate.getFullYear() === 2099
      const returnDate = isOpenEnded ? 'مفتوحة' : Calendar.formatArabic(mission.endDate)
      
      const missionIcon = mission.missionType === 'TASK_EXECUTION' ? '🎯' : '🏠'
      const buttonText = `${missionIcon} ${nickname} (${position}) - ${returnDate}`
      keyboard.text(buttonText, `missions:return:confirm:${mission.id}`).row()
    })

    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `missions:return:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'missions:return:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `missions:return:${page + 1}`))
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
    console.error('Error loading employees on mission:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة العاملين.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
      }
    )
  }
})

// اختيار تاريخ العودة
missionsReturnHandler.callbackQuery(/^missions:return:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionId = Number.parseInt(ctx.match[1])

  const keyboard = Calendar.create({
    callbackPrefix: `missions:return:date:${missionId}`,
  })
  keyboard.row().text('⬅️ رجوع', 'missions:return')

  await ctx.editMessageText(
    `↩️ **تسجيل عودة من مأمورية**\n\nاختر تاريخ العودة الفعلي:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  )
})

// تأكيد تاريخ العودة
missionsReturnHandler.callbackQuery(/^missions:return:date:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionId = Number.parseInt(ctx.match[1])
  const dateStr = ctx.match[2]
  const userId = ctx.from?.id

  if (!userId) return

  const returnDate = Calendar.parseDate(dateStr)
  if (!returnDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  // حفظ التاريخ مؤقتاً
  returnData.set(userId, { missionId, returnDate: dateStr })

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `missions:return:notes:${missionId}`)
    .row()
    .text('⬅️ رجوع', `missions:return:confirm:${missionId}`)

  await ctx.editMessageText(
    `↩️ **تسجيل عودة من مأمورية**\n\n`
    + `━━━━━━━━━━━━━━━━━━━━\n\n`
    + `📅 **تاريخ العودة:** ${Calendar.formatArabic(returnDate)}\n\n`
    + `💬 **أدخل ملاحظات العودة:**\n`
    + `(اختياري - أو اضغط تخطي)`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  )
})

// استقبال الملاحظات
missionsReturnHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId) return next()

  const tempData = returnData.get(userId)
  if (!tempData) return next()

  tempData.notes = ctx.message.text.trim()
  returnData.set(userId, tempData)

  await ctx.reply('✅ **تم حفظ الملاحظات بنجاح**', {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('📋 عرض الملخص', `missions:return:notes:${tempData.missionId}`),
  })
})

// عرض ملخص وتأكيد
missionsReturnHandler.callbackQuery(/^missions:return:notes:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionId = Number.parseInt(ctx.match[1])
  const userId = ctx.from?.id
  if (!userId) return

  const tempData = returnData.get(userId)
  if (!tempData) return

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

    const returnDate = Calendar.parseDate(tempData.returnDate)
    if (!returnDate) return

    const endDate = new Date(mission.endDate)
    endDate.setHours(0, 0, 0, 0)
    returnDate.setHours(0, 0, 0, 0)

    const missionTypeLabel = mission.missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'
    
    // تحقق من المأمورية المفتوحة
    const isOpenEnded = mission.endDate.getFullYear() === 2099

    let daysDiff = 0
    if (!isOpenEnded) {
      const expectedReturnDate = new Date(endDate)
      expectedReturnDate.setDate(expectedReturnDate.getDate() + 1)
      daysDiff = Math.floor((returnDate.getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    let message = `↩️ **ملخص تسجيل العودة**\n\n`
    message += `👤 **العامل:** ${mission.employee.fullName}\n`
    message += `💼 **الوظيفة:** ${mission.employee.position?.titleAr || 'غير محدد'}\n`
    message += `📋 **رقم المأمورية:** ${mission.missionNumber}\n`
    message += `📂 **النوع:** ${missionTypeLabel}\n\n`
    
    if (isOpenEnded) {
      message += `⏳ **المأمورية:** مفتوحة (بدون تاريخ نهاية محدد)\n`
    }
    else {
      message += `📅 **تاريخ نهاية المأمورية:** ${Calendar.formatArabic(mission.endDate)}\n`
    }
    
    message += `📅 **تاريخ العودة:** ${Calendar.formatArabic(returnDate)}\n`

    if (!isOpenEnded) {
      if (daysDiff > 0) {
        message += `\n⚠️ **تأخير:** ${daysDiff} يوم\n`
      }
      else if (daysDiff < 0) {
        message += `\n✅ **عودة قبل الموعد بـ** ${Math.abs(daysDiff)} يوم\n`
      }
      else {
        message += `\n✅ **عودة في الموعد**\n`
      }
    }

    if (tempData.notes) {
      message += `\n💬 **ملاحظات:** ${tempData.notes}\n`
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `⚠️ **تأكيد نهائي:**\n`
    message += `هل أنت متأكد من تسجيل العودة؟\n\n`
    message += `✅ سيتم تغيير حالة العامل إلى "نشط"\n`
    message += `✅ سيتم إرسال تقرير للمسؤولين`

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد التسجيل', `missions:return:save:${missionId}`)
      .row()
      .text('❌ إلغاء', 'missions:return')

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
missionsReturnHandler.callbackQuery(/^missions:return:save:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسجيل...')

  const missionId = Number.parseInt(ctx.match[1])
  const userId = ctx.from?.id
  if (!userId) return

  const tempData = returnData.get(userId)
  if (!tempData) return

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

    const returnDate = Calendar.parseDate(tempData.returnDate)
    if (!returnDate) return

    const endDate = new Date(mission.endDate)
    endDate.setHours(0, 0, 0, 0)
    returnDate.setHours(0, 0, 0, 0)

    const isOpenEnded = mission.endDate.getFullYear() === 2099

    let daysDiff = 0
    if (!isOpenEnded) {
      const expectedReturnDate = new Date(endDate)
      expectedReturnDate.setDate(expectedReturnDate.getDate() + 1)
      daysDiff = Math.floor((returnDate.getTime() - expectedReturnDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // تحديث حالة المأمورية
    await prisma.hR_EmployeeMission.update({
      where: { id: missionId },
      data: {
        status: 'APPROVED',
        actualReturnDate: returnDate,
        notes: tempData.notes ? `${mission.notes || ''}\n\nملاحظات العودة: ${tempData.notes}` : mission.notes,
      },
    })

    // تحديث حالة العامل
    await prisma.employee.update({
      where: { id: mission.employeeId },
      data: {
        employmentStatus: 'ACTIVE',
      },
    })

    // جلب بيانات المسجل
    const admin: any = await prisma.user.findUnique({ where: { telegramId: BigInt(userId) } })

    // مسح البيانات المؤقتة
    returnData.delete(userId)

    const returnDateFormatted = formatDateWithDay(returnDate)
    const missionTypeLabel = mission.missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

    let report = `✅ **تم تسجيل العودة بنجاح!**\n\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **تقرير العودة**\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`
    
    report += `👤 **العامل:** ${mission.employee.fullName}`
    if (mission.employee.nickname) {
      report += ` (${mission.employee.nickname})`
    }
    report += `\n`
    report += `🔢 **كود العامل:** ${mission.employee.employeeCode}\n`
    report += `💼 **الوظيفة:** ${mission.employee.position?.titleAr || 'غير محدد'}\n`
    report += `🏢 **القسم:** ${mission.employee.department?.name || 'غير محدد'}\n\n`
    
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **رقم المأمورية:** ${mission.missionNumber}\n`
    report += `📂 **نوع المأمورية:** ${missionTypeLabel}\n`
    report += `📅 **تاريخ بداية المأمورية:** ${formatDateWithDay(mission.startDate)}\n`
    
    if (isOpenEnded) {
      report += `⏳ **المأمورية:** مفتوحة (بدون تاريخ نهاية محدد)\n`
    }
    else {
      report += `📅 **تاريخ نهاية المأمورية:** ${formatDateWithDay(mission.endDate)}\n`
      report += `⏱️ **مدة المأمورية:** ${mission.totalDays} أيام\n`
    }
    
    report += `📅 **تاريخ العودة:** ${returnDateFormatted}\n`
    report += `📍 **الموقع:** ${mission.location}\n`
    report += `🎯 **الغرض:** ${mission.purpose}\n`

    if (!isOpenEnded) {
      if (daysDiff > 0) {
        report += `\n⚠️ **تأخير:** ${daysDiff} يوم\n`
      }
      else if (daysDiff < 0) {
        report += `\n✅ **عودة قبل الموعد بـ** ${Math.abs(daysDiff)} يوم\n`
      }
      else {
        report += `\n✅ **عودة في الموعد**\n`
      }
    }

    if (tempData.notes) {
      report += `\n💬 **ملاحظات العودة:**\n${tempData.notes}\n`
    }
    
    report += `\n━━━━━━━━━━━━━━━━━━━━\n`
    report += `👨‍💼 **مسجل العودة:** ${admin?.fullName || 'غير معروف'}\n`
    report += `📅 **تاريخ التسجيل:** ${formatDateWithDay(new Date())}\n`
    report += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('↩️ تسجيل عودة أخرى', 'missions:return')
      .row()
      .text('📋 قائمة المأموريات', 'missions:list')
      .row()
      .text('🏠 القائمة الرئيسية', 'missions:main')

    // إرسال التقرير للمستخدم الحالي
    await ctx.editMessageText(report, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // إرسال التقرير لجميع المسؤولين في مجموعة الموارد البشرية
    try {
      const hrGroupSetting = await prisma.setting.findFirst({
        where: { 
          key: 'hr_group_chat_id',
          scope: 'GLOBAL',
        },
      })

      if (hrGroupSetting && hrGroupSetting.value) {
        const hrGroupId = hrGroupSetting.value
        
        await ctx.api.sendMessage(hrGroupId, report, {
          parse_mode: 'Markdown',
        })
      }
    }
    catch (error) {
      console.error('Error sending report to HR group:', error)
    }
  }
  catch (error) {
    console.error('Error saving return:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تسجيل العودة.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:return'),
      }
    )
  }
})

function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
