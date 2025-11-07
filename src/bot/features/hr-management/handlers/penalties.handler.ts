/**
 * Handler إدارة عقوبات التأخير
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'

import { DelayPenaltyService } from '#root/modules/services/delay-penalty.service.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { Composer, InlineKeyboard, InputFile } from 'grammy'

export const penaltiesHandler = new Composer<Context>()

const penaltyData = new Map<number, any>()

// القائمة الرئيسية لإدارة العقوبات
penaltiesHandler.callbackQuery('penalties:main', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('⚖️ مراجعة العقوبات المعلقة', 'penalties:pending')
    .row()
    .text('📊 سجل العقوبات', 'penalties:history')
    .row()
    .text('🔓 رفع الإيقافات', 'penalties:lift-suspensions')
    .row()
    .text('⚙️ إدارة سياسات العقوبات', 'penalties:policies')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

  await ctx.editMessageText(
    '🚨 **إدارة عقوبات التأخير**\n\nاختر العملية المطلوبة:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// عرض العقوبات المعلقة
penaltiesHandler.callbackQuery(/^penalties:pending(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 10

  try {
    const penalties = await DelayPenaltyService.getPendingPenalties(pageSize, page * pageSize)

    if (penalties.length === 0) {
      await ctx.editMessageText(
        '⚖️ **العقوبات المعلقة**\n\n✅ لا توجد عقوبات معلقة للمراجعة.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
        },
      )
      return
    }

    let message = `⚖️ **العقوبات المعلقة للمراجعة**\n\n`
    message += `📊 العدد: ${penalties.length}\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    const keyboard = new InlineKeyboard()

    for (const penalty of penalties) {
      const delayDays = penalty.delayDays
      const penaltyValue = penalty.penaltyType === 'DEDUCTION'
        ? `خصم ${penalty.deductionDays} يوم`
        : 'إيقاف عن العمل'

      message += `👤 **${penalty.employee.fullName}**\n`
      message += `📋 إجازة: ${penalty.leave.leaveNumber}\n`
      message += `⏱️ تأخير: ${delayDays} يوم\n`
      message += `💰 العقوبة: ${penaltyValue}\n`
      message += `\n`

      keyboard.text(`${penalty.employee.nickname || penalty.employee.fullName}`, `penalties:review:${penalty.id}`).row()
    }

    keyboard.text('⬅️ رجوع', 'penalties:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading pending penalties:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل العقوبات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
      },
    )
  }
})

// عرض سجل العقوبات
penaltiesHandler.callbackQuery(/^penalties:history(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0')
  const pageSize = 10

  try {
    const prisma = Database.prisma

    // جلب جميع العقوبات (معتمدة أو ملغاة)
    const total = await prisma.hR_AppliedPenalty.count({
      where: {
        status: { in: ['APPROVED', 'CANCELLED'] },
      },
    })

    const penalties = await prisma.hR_AppliedPenalty.findMany({
      where: {
        status: { in: ['APPROVED', 'CANCELLED'] },
      },
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            employeeCode: true,
          },
        },
        leave: {
          select: {
            leaveNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * pageSize,
      take: pageSize,
    })

    if (penalties.length === 0) {
      await ctx.editMessageText(
        '📊 **سجل العقوبات**\n\n📋 لا توجد عقوبات في السجل.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
        },
      )
      return
    }

    let message = `📊 **سجل العقوبات**\n\n`
    message += `📈 إجمالي: ${total} عقوبة\n`
    message += `📄 الصفحة: ${page + 1}/${Math.ceil(total / pageSize)}\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    for (const penalty of penalties) {
      const statusIcon = penalty.status === 'APPROVED' ? '✅' : '❌'
      const statusText = penalty.status === 'APPROVED' ? 'معتمدة' : 'ملغاة'

      let penaltyValue = ''
      if (penalty.penaltyType === 'DEDUCTION') {
        penaltyValue = `خصم ${penalty.deductionDays} يوم`
      }
      else {
        penaltyValue = 'إيقاف عن العمل'
      }

      message += `${statusIcon} **${penalty.employee.nickname || penalty.employee.fullName}**\n`
      message += `├ إجازة: ${penalty.leave.leaveNumber}\n`
      message += `├ تأخير: ${penalty.delayDays} يوم\n`
      message += `├ العقوبة: ${penaltyValue}\n`
      message += `├ الحالة: ${statusText}\n`

      if (penalty.isAppliedToPayroll) {
        message += `└ ✅ مطبقة على الراتب\n`
      }
      else if (penalty.status === 'APPROVED') {
        message += `└ ⏳ قيد الانتظار للتطبيق\n`
      }
      else {
        message += `└ ❌ ملغاة\n`
      }

      message += `\n`
    }

    const keyboard = new InlineKeyboard()

    const totalPages = Math.ceil(total / pageSize)
    if (totalPages > 1) {
      const navButtons = []
      if (page > 0) {
        navButtons.push(InlineKeyboard.text('◀️ السابق', `penalties:history:${page - 1}`))
      }
      navButtons.push(InlineKeyboard.text(`${page + 1}/${totalPages}`, 'penalties:history:0'))
      if (page < totalPages - 1) {
        navButtons.push(InlineKeyboard.text('التالي ▶️', `penalties:history:${page + 1}`))
      }
      keyboard.row(...navButtons)
    }

    keyboard.row()
      .text('📥 تصدير إلى Excel', 'penalties:export:menu')
    keyboard.row()
      .text('⬅️ رجوع', 'penalties:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading penalty history:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل السجل.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
      },
    )
  }
})

// مراجعة عقوبة معينة
penaltiesHandler.callbackQuery(/^penalties:review:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma

    const penalty = await prisma.hR_AppliedPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            employeeCode: true,
            position: {
              select: {
                titleAr: true,
              },
            },
          },
        },
        leave: {
          select: {
            leaveNumber: true,
            startDate: true,
            endDate: true,
            actualReturnDate: true,
          },
        },
        policy: true,
      },
    })

    if (!penalty) {
      await ctx.editMessageText('❌ العقوبة غير موجودة.')
      return
    }

    let message = `⚖️ **مراجعة عقوبة تأخير**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    message += `👤 **العامل:** ${penalty.employee.fullName}\n`
    if (penalty.employee.nickname) {
      message += `🏷️ **اللقب:** ${penalty.employee.nickname}\n`
    }
    message += `🔢 **الكود:** ${penalty.employee.employeeCode}\n`
    message += `💼 **الوظيفة:** ${penalty.employee.position?.titleAr || 'غير محدد'}\n\n`

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📋 **رقم الإجازة:** ${penalty.leave.leaveNumber}\n`
    message += `📅 **بداية الإجازة:** ${Calendar.formatArabic(penalty.leave.startDate)}\n`
    message += `📅 **نهاية الإجازة:** ${Calendar.formatArabic(penalty.leave.endDate)}\n`
    if (penalty.leave.actualReturnDate) {
      message += `📅 **العودة الفعلية:** ${Calendar.formatArabic(penalty.leave.actualReturnDate)}\n`
    }
    message += `⏱️ **أيام التأخير:** ${penalty.delayDays} يوم\n\n`

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📜 **السياسة المطبقة:** ${penalty.policy?.name || 'غير محدد'}\n`

    if (penalty.penaltyType === 'DEDUCTION') {
      message += `💰 **نوع العقوبة:** خصم من الراتب\n`
      message += `📊 **قيمة الخصم:** ${penalty.deductionDays} يوم\n`
    }
    else if (penalty.penaltyType === 'SUSPENSION') {
      message += `🚫 **نوع العقوبة:** إيقاف عن العمل\n`
      if (penalty.suspensionDays) {
        message += `📊 **مدة الإيقاف:** ${penalty.suspensionDays} يوم\n`
      }
      else {
        message += `📊 **مدة الإيقاف:** لحين تحديد الموقف\n`
      }
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`
    message += `\n**ماذا تريد أن تفعل؟**`

    const keyboard = new InlineKeyboard()
      .text('✅ اعتماد العقوبة', `penalties:approve:${penaltyId}`)
      .row()
      .text('❌ إلغاء مع عذر', `penalties:cancel:${penaltyId}`)
      .row()
      .text('⬅️ رجوع', 'penalties:pending')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading penalty:', error)
  }
})

// اعتماد العقوبة
penaltiesHandler.callbackQuery(/^penalties:approve:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري الاعتماد...')

  const penaltyId = Number.parseInt(ctx.match[1])

  try {
    // التحقق من حالة العقوبة قبل الاعتماد
    const penalty = await Database.prisma.hR_AppliedPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        employee: { select: { fullName: true, nickname: true } },
        leave: { select: { leaveNumber: true } },
      },
    })

    if (!penalty) {
      await ctx.editMessageText(
        '❌ **العقوبة غير موجودة**\n\nلم يتم العثور على العقوبة في النظام.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⚖️ العقوبات المعلقة', 'penalties:pending')
            .row()
            .text('🏠 القائمة الرئيسية', 'penalties:main'),
        },
      )
      return
    }

    // التحقق: هل العقوبة معتمدة بالفعل؟
    if (penalty.status === 'APPROVED') {
      const employeeName = penalty.employee.nickname || penalty.employee.fullName
      await ctx.editMessageText(
        '⚠️ **العقوبة معتمدة مسبقاً!**\n\n'
        + `👤 الموظف: ${employeeName}\n`
        + `📋 رقم الإجازة: ${penalty.leave.leaveNumber}\n`
        + `⏰ أيام التأخير: ${penalty.delayDays} يوم\n`
        + `📉 أيام الخصم: ${penalty.deductionDays} يوم\n\n`
        + '✅ هذه العقوبة تم اعتمادها من قبل.\n'
        + 'لا يمكن اعتمادها مرة أخرى.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('📊 سجل العقوبات', 'penalties:history')
            .row()
            .text('⚖️ العقوبات المعلقة', 'penalties:pending')
            .row()
            .text('🏠 القائمة الرئيسية', 'penalties:main'),
        },
      )
      return
    }

    // التحقق: هل العقوبة ملغاة؟
    if (penalty.isCancelled) {
      await ctx.editMessageText(
        '❌ **العقوبة ملغاة!**\n\n'
        + 'هذه العقوبة تم إلغاؤها مسبقاً.\n'
        + 'لا يمكن اعتمادها.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⚖️ العقوبات المعلقة', 'penalties:pending')
            .row()
            .text('🏠 القائمة الرئيسية', 'penalties:main'),
        },
      )
      return
    }

    // الاعتماد
    await DelayPenaltyService.approvePenalty(penaltyId)

    await ctx.editMessageText(
      '✅ **تم اعتماد العقوبة بنجاح!**\n\nسيتم تطبيق العقوبة على الراتب تلقائياً.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⚖️ العقوبات المعلقة', 'penalties:pending')
          .row()
          .text('🏠 القائمة الرئيسية', 'penalties:main'),
      },
    )
  }
  catch (error) {
    console.error('Error approving penalty:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ في اعتماد العقوبة')
  }
})

// طلب سبب الإلغاء
penaltiesHandler.callbackQuery(/^penalties:cancel:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match[1])
  const userId = ctx.from?.id
  if (!userId)
    return

  // تخزين البيانات في session بدلاً من Map
  ctx.session.penaltyCancel = {
    penaltyId,
    step: 'waiting_reason',
  }

  await ctx.editMessageText(
    '❌ **إلغاء عقوبة التأخير**\n\n✍️ أرسل سبب الإلغاء (العذر):',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ إلغاء', `penalties:review:${penaltyId}`),
    },
  )
})

// استقبال سبب الإلغاء - يجب أن يكون handler محدد
penaltiesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId) {
    return next()
  }

  // التحقق من وجود عملية إلغاء نشطة
  const cancelData = ctx.session.penaltyCancel
  if (!cancelData || cancelData.step !== 'waiting_reason') {
    return next() // تمرير للمعالج التالي
  }

  const cancelReason = ctx.message.text.trim()

  // التحقق من طول العذر
  if (cancelReason.length < 5) {
    await ctx.reply('⚠️ العذر قصير جداً! أدخل سبباً واضحاً (5 أحرف على الأقل).')
    return
  }

  try {
    await DelayPenaltyService.cancelPenalty({
      penaltyId: cancelData.penaltyId,
      cancelReason,
      cancelledBy: BigInt(userId),
    })

    // مسح بيانات الإلغاء
    delete ctx.session.penaltyCancel

    await ctx.reply(
      '✅ **تم إلغاء العقوبة بنجاح!**\n\n' +
      `📝 العذر: ${cancelReason}\n\n` +
      'تم تسجيل العذر في النظام.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⚖️ العقوبات المعلقة', 'penalties:pending')
          .row()
          .text('🏠 القائمة الرئيسية', 'penalties:main'),
      },
    )
  }
  catch (error) {
    console.error('Error cancelling penalty:', error)
    await ctx.reply('❌ حدث خطأ في إلغاء العقوبة')
  }
})

// إلغاء عملية الإلغاء
penaltiesHandler.callbackQuery(/^penalties:cancel_operation:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('تم الإلغاء')
  
  const penaltyId = Number.parseInt(ctx.match[1])
  delete ctx.session.penaltyCancel
  
  // العودة لصفحة المراجعة
  await ctx.editMessageText('جاري التحميل...')
  
  // إعادة توجيه لصفحة المراجعة
  ctx.callbackQuery.data = `penalties:review:${penaltyId}`
  return
})

// تجاهل إشعار العقوبات المعلقة
penaltiesHandler.callbackQuery('penalties:dismiss_notification', async (ctx) => {
  await ctx.answerCallbackQuery('تم التجاهل')
  await ctx.deleteMessage()
})

// إدارة السياسات
penaltiesHandler.callbackQuery('penalties:policies', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const policies = await DelayPenaltyService.getAllPolicies()

    let message = `⚙️ **سياسات عقوبات التأخير**\n\n`
    message += `📊 عدد السياسات: ${policies.length}\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    for (const policy of policies) {
      message += `${policy.delayDays === 5 ? '🚫' : '💰'} **${policy.name}**\n`
      message += `📌 التأخير: ${policy.delayDays} ${policy.delayDays === 5 ? 'أيام فأكثر' : policy.delayDays === 1 ? 'يوم' : 'أيام'}\n`

      if (policy.penaltyType === 'DEDUCTION') {
        message += `💰 الخصم: ${policy.deductionDays} يوم\n`
      }
      else if (policy.penaltyType === 'SUSPENSION') {
        message += `🚫 إيقاف عن العمل\n`
      }

      message += `\n`
    }

    const keyboard = new InlineKeyboard()

    for (const policy of policies) {
      keyboard.text(`✏️ ${policy.name}`, `penalties:policy:edit:${policy.id}`).row()
    }

    keyboard.text('⬅️ رجوع', 'penalties:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading policies:', error)
  }
})

// تعديل سياسة
penaltiesHandler.callbackQuery(/^penalties:policy:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const policyId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma
    const policy = await prisma.hR_DelayPenaltyPolicy.findUnique({
      where: { id: policyId },
    })

    if (!policy) {
      await ctx.editMessageText('❌ السياسة غير موجودة.')
      return
    }

    let message = `✏️ **تعديل سياسة عقوبة**\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📌 **السياسة:** ${policy.name}\n`
    message += `📊 **التأخير:** ${policy.delayDays} ${policy.delayDays === 1 ? 'يوم' : 'أيام'}\n\n`

    if (policy.penaltyType === 'DEDUCTION') {
      message += `💰 **الخصم الحالي:** ${policy.deductionDays} يوم\n\n`
      message += `✍️ أرسل عدد أيام الخصم الجديدة:`
    }
    else {
      message += `🚫 **إيقاف عن العمل**\n\n`
      message += `ℹ️ لا يمكن تعديل هذه السياسة`
    }

    const userId = ctx.from?.id
    if (userId && policy.penaltyType === 'DEDUCTION') {
      penaltyData.set(userId, { policyId, action: 'edit' })
    }

    const keyboard = new InlineKeyboard().text('⬅️ رجوع', 'penalties:policies')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading policy:', error)
  }
})

// استقبال قيمة الخصم الجديدة
penaltiesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = penaltyData.get(userId)
  if (!data || data.action !== 'edit')
    return next()

  const newValue = Number.parseFloat(ctx.message.text.trim())

  if (Number.isNaN(newValue) || newValue <= 0) {
    await ctx.reply('❌ قيمة غير صحيحة. يرجى إدخال رقم صحيح.')
    return
  }

  try {
    await DelayPenaltyService.updatePolicy({
      policyId: data.policyId,
      deductionDays: newValue,
      updatedBy: BigInt(userId),
    })

    penaltyData.delete(userId)

    await ctx.reply(
      '✅ **تم تحديث السياسة بنجاح!**',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⚙️ السياسات', 'penalties:policies')
          .row()
          .text('🏠 القائمة الرئيسية', 'penalties:main'),
      },
    )
  }
  catch (error) {
    console.error('Error updating policy:', error)
    await ctx.reply('❌ حدث خطأ في تحديث السياسة')
  }
})

// ==================== التصدير إلى Excel ====================

// قائمة خيارات التصدير
penaltiesHandler.callbackQuery('penalties:export:menu', async (ctx) => {
  await ctx.answerCallbackQuery()

  const message = `📥 **تصدير سجل العقوبات**\n\n`
    + `اختر طريقة التصدير:\n\n`
    + `📊 **تصدير الكل:** جميع العقوبات المسجلة\n`
    + `🔍 **تصدير مخصص:** اختيار فلاتر محددة`

  const keyboard = new InlineKeyboard()
    .text('📊 تصدير الكل', 'penalties:export:all')
    .row()
    .text('🔍 تصدير مخصص', 'penalties:export:filtered')
    .row()
    .text('⬅️ رجوع', 'penalties:history:0')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// تصدير جميع العقوبات
penaltiesHandler.callbackQuery('penalties:export:all', async (ctx) => {
  await ctx.answerCallbackQuery('جاري تجهيز الملف...')

  try {
    await ctx.editMessageText('⏳ **جاري تصدير البيانات...**\n\nالرجاء الانتظار...', {
      parse_mode: 'Markdown',
    })

    const { PenaltiesExportService } = await import('../services/penalties-export.service.js')
    const result = await PenaltiesExportService.exportPenalties(ctx)

    const { fileName, stats } = result

    // بناء رسالة الإحصائيات
    let caption = '📥 **تقرير سجل العقوبات**\n\n'
    caption += '━━━━━━━━━━━━━━━━━━━━\n'
    caption += '📊 **ملخص الإحصائيات:**\n\n'
    caption += `📈 إجمالي العقوبات: **${stats.total}**\n`
    caption += `✅ معتمدة: **${stats.approved}**\n`
    caption += `❌ ملغاة: **${stats.cancelled}**\n\n`
    caption += `💰 عقوبات خصم: **${stats.deduction}**\n`
    caption += `� عقوبات إيقاف: **${stats.suspension}**\n\n`
    caption += `✔️ مطبقة على الراتب: **${stats.appliedToPayroll}**\n`
    caption += `⏳ قيد الانتظار: **${stats.pending}**\n\n`
    caption += `📉 إجمالي أيام الخصم: **${stats.totalDeductionDays}** يوم\n`
    caption += `👥 عدد الموظفين: **${stats.employeeCount}**\n\n`
    caption += '━━━━━━━━━━━━━━━━━━━━\n'
    caption += '📄 الملف يحتوي على 3 أوراق:\n'
    caption += '• سجل العقوبات الكامل\n'
    caption += '• إحصائيات تفصيلية\n'
    caption += '• ملخص حسب الموظفين'

    await ctx.replyWithDocument(new InputFile(`uploads/${fileName}`), {
      caption,
      parse_mode: 'Markdown',
    })

    await ctx.deleteMessage()
  }
  catch (error) {
    console.error('Error exporting penalties:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تصدير البيانات',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:export:menu'),
      },
    )
  }
})

// قائمة الفلاتر للتصدير المخصص
penaltiesHandler.callbackQuery('penalties:export:filtered', async (ctx) => {
  await ctx.answerCallbackQuery()

  const message = `🔍 **تصدير مخصص**\n\n`
    + `اختر الفلتر المطلوب:\n\n`
    + `• **حسب الحالة:** معتمدة، ملغاة\n`
    + `• **حسب نوع العقوبة:** خصم، إيقاف\n`
    + `• **حسب التطبيق:** مطبقة، غير مطبقة`

  const keyboard = new InlineKeyboard()
    .text('✅ معتمدة فقط', 'penalties:export:status:APPROVED')
    .text('❌ ملغاة فقط', 'penalties:export:status:CANCELLED')
    .row()
    .text('💰 خصم فقط', 'penalties:export:type:DEDUCTION')
    .text('🚫 إيقاف فقط', 'penalties:export:type:SUSPENSION')
    .row()
    .text('✅ مطبقة على الراتب', 'penalties:export:applied:true')
    .row()
    .text('⏳ غير مطبقة', 'penalties:export:applied:false')
    .row()
    .text('⬅️ رجوع', 'penalties:export:menu')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// تصدير حسب الحالة
penaltiesHandler.callbackQuery(/^penalties:export:status:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري تجهيز الملف...')

  const status = ctx.match[1] as 'APPROVED' | 'CANCELLED'

  try {
    await ctx.editMessageText('⏳ **جاري تصدير البيانات...**\n\nالرجاء الانتظار...', {
      parse_mode: 'Markdown',
    })

    const { PenaltiesExportService } = await import('../services/penalties-export.service.js')
    const result = await PenaltiesExportService.exportPenalties(ctx, { status })

    const { fileName, stats } = result
    const statusText = status === 'APPROVED' ? 'المعتمدة' : 'الملغاة'

    let caption = `📥 **تقرير العقوبات ${statusText}**\n\n`
    caption += '━━━━━━━━━━━━━━━━━━━━\n'
    caption += `🔍 **الفلتر:** ${statusText} فقط\n\n`
    caption += '📊 **الإحصائيات:**\n'
    caption += `📈 إجمالي: **${stats.total}**\n`
    caption += `💰 خصم: **${stats.deduction}**\n`
    caption += `🚫 إيقاف: **${stats.suspension}**\n`
    if (status === 'APPROVED') {
      caption += `✔️ مطبقة: **${stats.appliedToPayroll}**\n`
      caption += `⏳ معلقة: **${stats.pending}**\n`
      caption += `📉 أيام الخصم: **${stats.totalDeductionDays}**\n`
    }
    caption += `� الموظفين: **${stats.employeeCount}**`

    await ctx.replyWithDocument(new InputFile(`uploads/${fileName}`), {
      caption,
      parse_mode: 'Markdown',
    })

    await ctx.deleteMessage()
  }
  catch (error) {
    console.error('Error exporting penalties:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تصدير البيانات',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:export:filtered'),
      },
    )
  }
})

// تصدير حسب نوع العقوبة
penaltiesHandler.callbackQuery(/^penalties:export:type:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري تجهيز الملف...')

  const penaltyType = ctx.match[1] as 'DEDUCTION' | 'SUSPENSION'

  try {
    await ctx.editMessageText('⏳ **جاري تصدير البيانات...**\n\nالرجاء الانتظار...', {
      parse_mode: 'Markdown',
    })

    const { PenaltiesExportService } = await import('../services/penalties-export.service.js')
    const result = await PenaltiesExportService.exportPenalties(ctx, { penaltyType })

    const { fileName, stats } = result
    const typeText = penaltyType === 'DEDUCTION' ? 'الخصم' : 'الإيقاف'

    let caption = `📥 **تقرير عقوبات ${typeText}**\n\n`
    caption += '━━━━━━━━━━━━━━━━━━━━\n'
    caption += `🔍 **الفلتر:** ${typeText} فقط\n\n`
    caption += '📊 **الإحصائيات:**\n'
    caption += `📈 إجمالي: **${stats.total}**\n`
    caption += `✅ معتمدة: **${stats.approved}**\n`
    caption += `❌ ملغاة: **${stats.cancelled}**\n`
    if (penaltyType === 'DEDUCTION') {
      caption += `✔️ مطبقة: **${stats.appliedToPayroll}**\n`
      caption += `📉 أيام الخصم: **${stats.totalDeductionDays}**\n`
    }
    caption += `� الموظفين: **${stats.employeeCount}**`

    await ctx.replyWithDocument(new InputFile(`uploads/${fileName}`), {
      caption,
      parse_mode: 'Markdown',
    })

    await ctx.deleteMessage()
  }
  catch (error) {
    console.error('Error exporting penalties:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تصدير البيانات',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:export:filtered'),
      },
    )
  }
})

// تصدير حسب التطبيق على الراتب
penaltiesHandler.callbackQuery(/^penalties:export:applied:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري تجهيز الملف...')

  const isApplied = ctx.match[1] === 'true'

  try {
    await ctx.editMessageText('⏳ **جاري تصدير البيانات...**\n\nالرجاء الانتظار...', {
      parse_mode: 'Markdown',
    })

    const { PenaltiesExportService } = await import('../services/penalties-export.service.js')
    const result = await PenaltiesExportService.exportPenalties(ctx, {
      isAppliedToPayroll: isApplied,
      status: 'APPROVED', // فقط المعتمدة
    })

    const { fileName, stats } = result
    const appliedText = isApplied ? 'المطبقة على الراتب' : 'غير المطبقة'

    let caption = `📥 **تقرير العقوبات ${appliedText}**\n\n`
    caption += '━━━━━━━━━━━━━━━━━━━━\n'
    caption += `� **الفلتر:** ${appliedText}\n\n`
    caption += '📊 **الإحصائيات:**\n'
    caption += `📈 إجمالي: **${stats.total}**\n`
    caption += `💰 خصم: **${stats.deduction}**\n`
    caption += `🚫 إيقاف: **${stats.suspension}**\n`
    caption += `📉 أيام الخصم: **${stats.totalDeductionDays}**\n`
    caption += `� الموظفين: **${stats.employeeCount}**`

    await ctx.replyWithDocument(new InputFile(`uploads/${fileName}`), {
      caption,
      parse_mode: 'Markdown',
    })

    await ctx.deleteMessage()
  }
  catch (error) {
    console.error('Error exporting penalties:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تصدير البيانات',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:export:filtered'),
      },
    )
  }
})
