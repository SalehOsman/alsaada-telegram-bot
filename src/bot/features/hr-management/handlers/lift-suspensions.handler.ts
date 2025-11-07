/**
 * Handler رفع الإيقافات عن الموظفين
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { DelayPenaltyService } from '#root/modules/services/delay-penalty.service.js'

export const liftSuspensionsHandler = new Composer<Context>()

// تخزين مؤقت للبيانات
const liftData = new Map<number, any>()

// القائمة الرئيسية لرفع الإيقافات
liftSuspensionsHandler.callbackQuery('penalties:lift-suspensions', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب الموظفين الموقوفين
    const suspendedEmployees = await DelayPenaltyService.getSuspendedEmployees()

    if (suspendedEmployees.length === 0) {
      await ctx.editMessageText(
        '✅ **لا يوجد موظفين موقوفين**\n\n'
        + 'جميع الموظفين في حالة نشطة.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
        },
      )
      return
    }

    let message = `🔓 **رفع الإيقافات**\n\n`
    message += `👥 **عدد الموظفين الموقوفين:** ${suspendedEmployees.length}\n\n`
    message += `اختر الموظف لرفع الإيقاف عنه:`

    const keyboard = new InlineKeyboard()

    for (const emp of suspendedEmployees) {
      const displayText = `${emp.nickname || emp.fullName} - ${emp.position?.titleAr || 'غير محدد'}`
      keyboard.text(displayText, `lift:select:${emp.id}`).row()
    }

    keyboard.text('⬅️ رجوع', 'penalties:main')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading suspended employees:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة الموظفين الموقوفين.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:main'),
      },
    )
  }
})

// اختيار الموظف
liftSuspensionsHandler.callbackQuery(/^lift:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1])

  try {
    // جلب عقوبة الإيقاف النشطة للموظف
    const penalty = await DelayPenaltyService.getActiveSuspensionPenalty(employeeId)

    if (!penalty) {
      await ctx.answerCallbackQuery('❌ لم يتم العثور على عقوبة إيقاف نشطة')
      return
    }

    let message = `🔓 **رفع الإيقاف**\n\n`
    message += `👤 **الموظف:** ${penalty.employee.fullName}\n`
    message += `📋 **رقم الإجازة:** ${penalty.leave.leaveNumber}\n`
    message += `📅 **تاريخ بداية الإجازة:** ${new Date(penalty.leave.startDate).toLocaleDateString('ar-EG')}\n`
    message += `📅 **تاريخ نهاية الإجازة:** ${new Date(penalty.leave.endDate).toLocaleDateString('ar-EG')}\n`
    if (penalty.leave.actualReturnDate) {
      message += `↩️ **تاريخ العودة الفعلي:** ${new Date(penalty.leave.actualReturnDate).toLocaleDateString('ar-EG')}\n`
    }
    message += `⏱️ **أيام التأخير:** ${penalty.delayDays}\n\n`
    message += `⚠️ **اختر نوع رفع الإيقاف:**`

    const keyboard = new InlineKeyboard()
      .text('✅ رفع الإيقاف بدون عقوبة (بعذر)', `lift:without-penalty:${penalty.id}`)
      .row()
      .text('⚖️ رفع الإيقاف مع عقوبة خصم', `lift:with-penalty:${penalty.id}`)
      .row()
      .text('⬅️ رجوع', 'penalties:lift-suspensions')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading suspension penalty:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// رفع الإيقاف بدون عقوبة (بعذر)
liftSuspensionsHandler.callbackQuery(/^lift:without-penalty:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match![1])
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.answerCallbackQuery('❌ خطأ في التعرف على المستخدم')
    return
  }

  // حفظ بيانات مؤقتة
  liftData.set(userId, {
    penaltyId,
    type: 'without-penalty',
    step: 'enter-excuse',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'penalties:lift-suspensions')

  await ctx.editMessageText(
    `📝 **رفع الإيقاف بدون عقوبة**\n\n`
    + `✍️ أدخل العذر المقبول لرفع الإيقاف:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// استقبال العذر (message handler)
liftSuspensionsHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = liftData.get(userId)

  if (!data || data.step !== 'enter-excuse')
    return next()

  const excuse = ctx.message.text.trim()

  if (excuse.length < 5) {
    await ctx.reply(
      '❌ العذر قصير جداً. يرجى إدخال عذر مفصّل (على الأقل 5 أحرف).',
    )
    return
  }

  // حفظ العذر
  data.excuse = excuse
  data.step = 'confirm'
  liftData.set(userId, data)

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد رفع الإيقاف', `lift:confirm-without:${data.penaltyId}`)
    .row()
    .text('❌ إلغاء', 'penalties:lift-suspensions')

  await ctx.reply(
    `📋 **ملخص رفع الإيقاف**\n\n`
    + `✅ رفع الإيقاف بدون عقوبة\n`
    + `📝 **العذر:** ${excuse}\n\n`
    + `⚠️ تأكيد العملية؟`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تأكيد رفع الإيقاف بدون عقوبة
liftSuspensionsHandler.callbackQuery(/^lift:confirm-without:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match![1])
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.answerCallbackQuery('❌ خطأ')
    return
  }

  const data = liftData.get(userId)

  if (!data || !data.excuse) {
    await ctx.answerCallbackQuery('❌ لم يتم العثور على البيانات')
    return
  }

  try {
    // رفع الإيقاف
    const result = await DelayPenaltyService.liftSuspensionWithoutPenalty({
      penaltyId,
      excuse: data.excuse,
      liftedBy: BigInt(userId),
    })

    // حذف البيانات المؤقتة
    liftData.delete(userId)

    const keyboard = new InlineKeyboard()
      .text('🔓 رفع إيقاف آخر', 'penalties:lift-suspensions')
      .row()
      .text('⬅️ رجوع إلى العقوبات', 'penalties:main')

    await ctx.editMessageText(
      `✅ **تم رفع الإيقاف بنجاح!**\n\n`
      + `👤 **الموظف:** ${result.employee.fullName}\n`
      + `✅ **الحالة:** تم رفع الإيقاف بدون عقوبة\n`
      + `📝 **العذر:** ${data.excuse}\n\n`
      + `✔️ الموظف الآن في حالة نشطة ويمكن تسجيل عودته.`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error lifting suspension:', error)
    liftData.delete(userId)

    await ctx.editMessageText(
      '❌ حدث خطأ أثناء رفع الإيقاف.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:lift-suspensions'),
      },
    )
  }
})

// رفع الإيقاف مع عقوبة خصم
liftSuspensionsHandler.callbackQuery(/^lift:with-penalty:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match![1])
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.answerCallbackQuery('❌ خطأ')
    return
  }

  // حفظ بيانات مؤقتة
  liftData.set(userId, {
    penaltyId,
    type: 'with-penalty',
    step: 'enter-deduction-days',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'penalties:lift-suspensions')

  await ctx.editMessageText(
    `⚖️ **رفع الإيقاف مع عقوبة خصم**\n\n`
    + `✍️ أدخل عدد أيام الخصم من الراتب:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// استقبال عدد أيام الخصم (message handler)
liftSuspensionsHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = liftData.get(userId)

  if (!data || data.step !== 'enter-deduction-days')
    return next()

  const text = ctx.message.text.trim()
  const deductionDays = Number.parseFloat(text)

  if (Number.isNaN(deductionDays) || deductionDays <= 0) {
    await ctx.reply(
      '❌ عدد أيام الخصم غير صحيح. يرجى إدخال رقم موجب.',
    )
    return
  }

  if (deductionDays > 30) {
    await ctx.reply(
      '⚠️ عدد أيام الخصم كبير جداً. يجب أن يكون أقل من 30 يوم.',
    )
    return
  }

  // حفظ عدد الأيام
  data.deductionDays = deductionDays
  data.step = 'confirm'
  liftData.set(userId, data)

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد رفع الإيقاف', `lift:confirm-with:${data.penaltyId}`)
    .row()
    .text('❌ إلغاء', 'penalties:lift-suspensions')

  await ctx.reply(
    `📋 **ملخص رفع الإيقاف**\n\n`
    + `⚖️ رفع الإيقاف مع عقوبة خصم\n`
    + `💰 **عدد أيام الخصم:** ${deductionDays} يوم\n\n`
    + `⚠️ سيتم:\n`
    + `1️⃣ إلغاء عقوبة الإيقاف\n`
    + `2️⃣ إنشاء عقوبة خصم جديدة بقيمة ${deductionDays} يوم\n`
    + `3️⃣ تفعيل حالة الموظف إلى نشط\n\n`
    + `✅ تأكيد العملية؟`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تأكيد رفع الإيقاف مع عقوبة
liftSuspensionsHandler.callbackQuery(/^lift:confirm-with:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const penaltyId = Number.parseInt(ctx.match![1])
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.answerCallbackQuery('❌ خطأ')
    return
  }

  const data = liftData.get(userId)

  if (!data || !data.deductionDays) {
    await ctx.answerCallbackQuery('❌ لم يتم العثور على البيانات')
    return
  }

  try {
    // رفع الإيقاف مع عقوبة
    const result = await DelayPenaltyService.liftSuspensionWithPenalty({
      penaltyId,
      deductionDays: data.deductionDays,
      liftedBy: BigInt(userId),
    })

    // حذف البيانات المؤقتة
    liftData.delete(userId)

    const keyboard = new InlineKeyboard()
      .text('🔓 رفع إيقاف آخر', 'penalties:lift-suspensions')
      .row()
      .text('⬅️ رجوع إلى العقوبات', 'penalties:main')

    await ctx.editMessageText(
      `✅ **تم رفع الإيقاف بنجاح!**\n\n`
      + `👤 **الموظف:** ${result.employee.fullName}\n`
      + `✅ **الحالة:** تم رفع الإيقاف مع عقوبة خصم\n`
      + `💰 **عدد أيام الخصم:** ${data.deductionDays} يوم\n\n`
      + `📋 **التفاصيل:**\n`
      + `• تم إلغاء عقوبة الإيقاف\n`
      + `• تم إنشاء عقوبة خصم جديدة معتمدة\n`
      + `• الموظف الآن في حالة نشطة\n`
      + `• يمكن تسجيل عودته\n`
      + `• ستطبق عقوبة الخصم على الراتب القادم`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error lifting suspension with penalty:', error)
    liftData.delete(userId)

    await ctx.editMessageText(
      '❌ حدث خطأ أثناء رفع الإيقاف.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'penalties:lift-suspensions'),
      },
    )
  }
})
