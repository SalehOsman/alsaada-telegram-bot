/**
 * Handler عرض التسويات النقدية (بدل الإجازات)
 * يعرض جميع الإجازات التي تم صرف بدل نقدي عنها
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { Composer, InlineKeyboard } from 'grammy'

// Helper function لتنسيق العملة
function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} جنيه`
}

export const leavesCashSettlementsHandler = new Composer<Context>()

// عرض قائمة التسويات النقدية
leavesCashSettlementsHandler.callbackQuery(/^leaves:cash-settlements(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 15

  try {
    const prisma = Database.prisma

    // جلب جميع التسويات النقدية
    const where: any = {
      isActive: true,
      settlementType: 'CASH_SETTLEMENT', // 💰 التسويات النقدية فقط
    }

    const [settlements, total] = await Promise.all([
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
          { createdAt: 'desc' }, // الأحدث أولاً
        ],
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.hR_EmployeeLeave.count({ where }),
    ])

    if (settlements.length === 0) {
      await ctx.editMessageText(
        '📋 **التسويات النقدية (بدل الإجازات)**\n\n'
        + '❌ لا توجد تسويات نقدية مسجلة\n\n'
        + 'ℹ️ التسويات النقدية هي الإجازات التي تم صرف بدل نقدي عنها بدلاً من إجازة فعلية.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    // إضافة التسويات النقدية
    for (const settlement of settlements) {
      const employee = settlement.employee
      const employeeName = employee.nickname || employee.fullName
      const position = employee.position?.title || 'بدون وظيفة'
      
      // حساب حالة التسوية
      const isSettled = settlement.allowanceSettled
      const statusIcon = isSettled ? '✅' : '⏳'
      const statusText = isSettled ? 'مسوّى' : 'غير مسوّى'
      
      const amount = settlement.allowanceAmount || 0
      const amountText = formatCurrency(amount)
      
      const startDate = Calendar.formatArabic(settlement.startDate)
      
      keyboard.text(
        `${statusIcon} ${employeeName} (${position}) - ${amountText} - ${startDate}`,
        `leaves:cash-settlement:details:${settlement.id}`,
      )
      keyboard.row()
    }

    // أزرار التنقل بين الصفحات
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      keyboard.row()
      if (page > 0) {
        keyboard.text('⬅️ السابقة', `leaves:cash-settlements:${page - 1}`)
      }
      if (page < totalPages - 1) {
        keyboard.text('➡️ التالية', `leaves:cash-settlements:${page + 1}`)
      }
    }

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'leavesHandler')

    const message = `💰 **التسويات النقدية (بدل الإجازات)**\n\n`
      + `📋 **إجمالي التسويات:** ${total}\n`
      + `📄 **الصفحة:** ${page + 1}/${totalPages}\n\n`
      + `✅ مسوّى في الراتب | ⏳ قيد الانتظار\n\n`
      + `اختر تسوية لعرض التفاصيل:`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error fetching cash settlements:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في جلب التسويات النقدية',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leavesHandler'),
      },
    )
  }
})

// عرض تفاصيل تسوية نقدية محددة
leavesCashSettlementsHandler.callbackQuery(/^leaves:cash-settlement:details:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const settlementId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const settlement = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: settlementId },
      include: {
        employee: {
          include: {
            position: true,
            department: true,
          },
        },
      },
    })

    if (!settlement) {
      await ctx.editMessageText(
        '❌ لم يتم العثور على التسوية',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:cash-settlements'),
        },
      )
      return
    }

    const employee = settlement.employee
    const employeeName = employee.nickname || employee.fullName
    const position = employee.position?.title || 'بدون وظيفة'
    const department = employee.department?.name || 'بدون قسم'

    const isSettled = settlement.allowanceSettled
    const statusIcon = isSettled ? '✅' : '⏳'
    const statusText = isSettled ? 'مسوّى' : 'قيد الانتظار'

    const amount = settlement.allowanceAmount || 0
    const amountText = formatCurrency(amount)

    const startDate = Calendar.formatArabic(settlement.startDate)
    const endDate = Calendar.formatArabic(settlement.endDate)
    const createdDate = Calendar.formatArabic(settlement.createdAt)
    const paidDate = settlement.allowancePaidDate 
      ? Calendar.formatArabic(settlement.allowancePaidDate)
      : 'لم يُصرف بعد'

    let message = `💰 **تفاصيل التسوية النقدية**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `👤 **العامل:** ${employeeName}\n`
    message += `🔢 **كود العامل:** ${employee.employeeCode}\n`
    message += `💼 **الوظيفة:** ${position}\n`
    message += `🏢 **القسم:** ${department}\n\n`

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `🔢 **رقم السجل:** ${settlement.leaveNumber}\n`
    message += `📅 **تاريخ التسجيل:** ${createdDate}\n`
    message += `📅 **من:** ${startDate}\n`
    message += `📅 **إلى:** ${endDate}\n`
    message += `⏱️ **المدة:** ${settlement.totalDays} يوم\n\n`

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `💰 **المبلغ:** ${amountText}\n`
    message += `${statusIcon} **الحالة:** ${statusText}\n`
    if (isSettled && settlement.allowancePaidDate) {
      message += `📅 **تاريخ الصرف:** ${paidDate}\n`
    }
    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `ℹ️ **ملاحظة:** هذه تسوية نقدية (العامل لم يتغيب فعلياً)`

    const keyboard = new InlineKeyboard()
      .text('👤 عرض بيانات العامل', `employee:view:${employee.id}`)
      .row()
      .text('⬅️ رجوع للقائمة', 'leaves:cash-settlements')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error fetching settlement details:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في جلب تفاصيل التسوية',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'leaves:cash-settlements'),
      },
    )
  }
})
