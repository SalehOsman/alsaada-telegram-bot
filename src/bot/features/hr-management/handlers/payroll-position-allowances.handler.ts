/**
 * Payroll Position Allowances Handler - بدلات الوظائف
 *
 * تحديد البدلات الافتراضية لكل وظيفة
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const payrollPositionAllowancesHandler = new Composer<Context>()

// ════════════════════════════════════════════════════════
// القائمة الرئيسية - عرض قائمة الوظائف
// ════════════════════════════════════════════════════════

payrollPositionAllowancesHandler.callbackQuery('payroll:settings:position-allowances', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب جميع الوظائف
    const positions = await Database.prisma.position.findMany({
      include: {
        positionAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
        },
      },
      orderBy: { titleAr: 'asc' },
    })

    if (positions.length === 0) {
      await ctx.editMessageText(
        '🏢 **بدلات الوظائف**\n\n'
        + '❌ لا توجد وظائف مُعرّفة في النظام\n\n'
        + '📌 يجب إضافة الوظائف أولاً من قسم "إدارة العاملين"',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'payroll:settings'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    positions.forEach((position) => {
      const allowanceCount = position.positionAllowances.length
      const label = allowanceCount > 0
        ? `${position.titleAr} (${allowanceCount} بدل)`
        : `${position.titleAr} (بدون بدلات)`

      keyboard
        .text(label, `payroll:pos-allowance:view:${position.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', 'payroll:settings')

    await ctx.editMessageText(
      `🏢 **بدلات الوظائف**\n\n`
      + `📊 عدد الوظائف: ${positions.length}\n\n`
      + `📌 اختر وظيفة لعرض أو تعديل البدلات الافتراضية لها:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error loading positions:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء تحميل البيانات')
  }
})

// ════════════════════════════════════════════════════════
// عرض بدلات وظيفة محددة
// ════════════════════════════════════════════════════════

payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match![1], 10)

  try {
    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        positionAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
          orderBy: {
            allowanceType: { orderIndex: 'asc' },
          },
        },
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('❌ الوظيفة غير موجودة')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('➕ إضافة بدل', `payroll:pos-allowance:add:${positionId}`)
      .row()

    let message = `🏢 **${position.titleAr}**\n\n`

    if (position.positionAllowances.length === 0) {
      message += '❌ لا توجد بدلات مُعرّفة لهذه الوظيفة\n\n'
      message += '💡 اضغط "إضافة بدل" لتحديد البدلات الافتراضية'
    }
    else {
      message += `📊 البدلات المُعرّفة (${position.positionAllowances.length}):\n\n`

      position.positionAllowances.forEach((pa) => {
        message += `• **${pa.allowanceType.nameAr}**: ${pa.amount} جنيه\n`
        keyboard
          .text(`✏️ ${pa.allowanceType.nameAr}`, `payroll:pos-allowance:edit:${pa.id}`)
          .text(`🗑️`, `payroll:pos-allowance:delete:${pa.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', 'payroll:settings:position-allowances')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error viewing position allowances:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// إضافة بدل لوظيفة - اختيار نوع البدل
// ════════════════════════════════════════════════════════

payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:add:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match![1], 10)

  try {
    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        positionAllowances: {
          where: { isActive: true },
          select: { allowanceTypeId: true },
        },
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('❌ الوظيفة غير موجودة')
      return
    }

    // جلب أنواع البدلات المُفعّلة
    const allowanceTypes = await Database.prisma.hR_AllowanceType.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    if (allowanceTypes.length === 0) {
      await ctx.editMessageText(
        '❌ **لا توجد أنواع بدلات مُفعّلة**\n\n'
        + 'يجب تفعيل نوع بدل واحد على الأقل من "إدارة أنواع البدلات"',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', `payroll:pos-allowance:view:${positionId}`),
        },
      )
      return
    }

    // استبعاد الأنواع المُضافة بالفعل
    const existingTypeIds = position.positionAllowances.map(pa => pa.allowanceTypeId)
    const availableTypes = allowanceTypes.filter(at => !existingTypeIds.includes(at.id))

    if (availableTypes.length === 0) {
      await ctx.editMessageText(
        '✅ **تم إضافة جميع أنواع البدلات المتاحة**\n\n'
        + 'جميع أنواع البدلات المُفعّلة تم إضافتها بالفعل لهذه الوظيفة',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', `payroll:pos-allowance:view:${positionId}`),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    availableTypes.forEach((type) => {
      keyboard
        .text(type.nameAr, `payroll:pos-allowance:add:select:${positionId}:${type.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', `payroll:pos-allowance:view:${positionId}`)

    await ctx.editMessageText(
      `➕ **إضافة بدل لوظيفة: ${position.titleAr}**\n\n`
      + `📋 اختر نوع البدل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error preparing to add allowance:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// إضافة بدل - طلب إدخال القيمة
// ════════════════════════════════════════════════════════

interface AddPositionAllowanceState {
  positionId: number
  allowanceTypeId: number
  positionName: string
  allowanceTypeName: string
}

const addStates = new Map<number, AddPositionAllowanceState>()

payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:add:select:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match![1], 10)
  const allowanceTypeId = Number.parseInt(ctx.match![2], 10)

  try {
    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
    })

    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!position || !allowanceType) {
      await ctx.answerCallbackQuery('❌ بيانات غير صحيحة')
      return
    }

    // حفظ الحالة
    addStates.set(ctx.from!.id, {
      positionId,
      allowanceTypeId,
      positionName: position.titleAr,
      allowanceTypeName: allowanceType.nameAr,
    })

    await ctx.editMessageText(
      `➕ **إضافة بدل: ${allowanceType.nameAr}**\n\n`
      + `🏢 الوظيفة: ${position.titleAr}\n\n`
      + `💰 أرسل قيمة البدل بالجنيه:\n`
      + `مثال: 500`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('❌ إلغاء', `payroll:pos-allowance:add:cancel:${positionId}`),
      },
    )
  }
  catch (error) {
    console.error('Error preparing amount input:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// إلغاء الإضافة
payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:add:cancel:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match![1], 10)

  // حذف الحالة
  addStates.delete(ctx.from!.id)

  // العودة لقائمة الإضافة
  await ctx.answerCallbackQuery()

  try {
    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        positionAllowances: {
          where: { isActive: true },
          select: { allowanceTypeId: true },
        },
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('❌ الوظيفة غير موجودة')
      return
    }

    // جلب أنواع البدلات المُفعّلة
    const allowanceTypes = await Database.prisma.hR_AllowanceType.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    // استبعاد الأنواع المُضافة بالفعل
    const existingTypeIds = position.positionAllowances.map(pa => pa.allowanceTypeId)
    const availableTypes = allowanceTypes.filter(at => !existingTypeIds.includes(at.id))

    const keyboard = new InlineKeyboard()

    if (availableTypes.length > 0) {
      availableTypes.forEach((type) => {
        keyboard
          .text(type.nameAr, `payroll:pos-allowance:add:select:${positionId}:${type.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', `payroll:pos-allowance:view:${positionId}`)

    await ctx.editMessageText(
      `➕ **إضافة بدل لوظيفة: ${position.titleAr}**\n\n`
      + `📋 اختر نوع البدل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error:', error)
  }
})

// معالج الرسائل النصية للإضافة
payrollPositionAllowancesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id
  const state = addStates.get(userId)

  if (!state) {
    await next()
    return
  }

  const text = ctx.message.text.trim()
  const amount = Number.parseFloat(text)

  if (Number.isNaN(amount) || amount <= 0) {
    await ctx.reply(
      '❌ القيمة يجب أن تكون رقماً موجباً\n\n'
      + 'مثال: 500 أو 1000',
    )
    return
  }

  try {
    // إضافة البدل
    await Database.prisma.hR_PositionAllowance.create({
      data: {
        positionId: state.positionId,
        allowanceTypeId: state.allowanceTypeId,
        amount,
        isActive: true,
      },
    })

    addStates.delete(userId)

    await ctx.reply(
      `✅ **تم إضافة البدل بنجاح**\n\n`
      + `🏢 الوظيفة: ${state.positionName}\n`
      + `💰 البدل: ${state.allowanceTypeName}\n`
      + `💵 القيمة: ${amount} جنيه`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض بدلات الوظيفة', `payroll:pos-allowance:view:${state.positionId}`),
      },
    )
  }
  catch (error) {
    console.error('Error adding position allowance:', error)
    await ctx.reply('❌ حدث خطأ أثناء الإضافة')
    addStates.delete(userId)
  }
})

// ════════════════════════════════════════════════════════
// تعديل قيمة بدل
// ════════════════════════════════════════════════════════

interface EditPositionAllowanceState {
  allowanceId: number
  positionId: number
  allowanceTypeName: string
}

const editStates = new Map<number, EditPositionAllowanceState>()

payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowance = await Database.prisma.hR_PositionAllowance.findUnique({
      where: { id: allowanceId },
      include: {
        position: true,
        allowanceType: true,
      },
    })

    if (!allowance) {
      await ctx.answerCallbackQuery('❌ البدل غير موجود')
      return
    }

    // حفظ الحالة
    editStates.set(ctx.from!.id, {
      allowanceId,
      positionId: allowance.positionId,
      allowanceTypeName: allowance.allowanceType.nameAr,
    })

    await ctx.editMessageText(
      `✏️ **تعديل: ${allowance.allowanceType.nameAr}**\n\n`
      + `🏢 الوظيفة: ${allowance.position.titleAr}\n`
      + `💰 القيمة الحالية: ${allowance.amount} جنيه\n\n`
      + `💵 أرسل القيمة الجديدة:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('❌ إلغاء', `payroll:pos-allowance:edit:cancel:${allowance.positionId}`),
      },
    )
  }
  catch (error) {
    console.error('Error preparing to edit:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// إلغاء التعديل
payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:edit:cancel:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match![1], 10)

  // حذف الحالة
  editStates.delete(ctx.from!.id)

  // العودة لعرض الوظيفة
  try {
    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        positionAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
          orderBy: {
            allowanceType: { orderIndex: 'asc' },
          },
        },
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('❌ الوظيفة غير موجودة')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('➕ إضافة بدل', `payroll:pos-allowance:add:${positionId}`)
      .row()

    let message = `🏢 **${position.titleAr}**\n\n`

    if (position.positionAllowances.length === 0) {
      message += '❌ لا توجد بدلات مُعرّفة لهذه الوظيفة\n\n'
      message += '💡 اضغط "إضافة بدل" لتحديد البدلات الافتراضية'
    }
    else {
      message += `📊 البدلات المُعرّفة (${position.positionAllowances.length}):\n\n`

      position.positionAllowances.forEach((pa) => {
        message += `• **${pa.allowanceType.nameAr}**: ${pa.amount} جنيه\n`
        keyboard
          .text(`✏️ ${pa.allowanceType.nameAr}`, `payroll:pos-allowance:edit:${pa.id}`)
          .text(`🗑️`, `payroll:pos-allowance:delete:${pa.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', 'payroll:settings:position-allowances')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error:', error)
  }
})

// معالج الرسائل النصية للتعديل
payrollPositionAllowancesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id
  const state = editStates.get(userId)

  if (!state) {
    await next()
    return
  }

  const text = ctx.message.text.trim()
  const amount = Number.parseFloat(text)

  if (Number.isNaN(amount) || amount <= 0) {
    await ctx.reply(
      '❌ القيمة يجب أن تكون رقماً موجباً\n\n'
      + 'مثال: 500 أو 1000',
    )
    return
  }

  try {
    // تحديث القيمة
    await Database.prisma.hR_PositionAllowance.update({
      where: { id: state.allowanceId },
      data: { amount },
    })

    editStates.delete(userId)

    await ctx.reply(
      `✅ **تم تحديث القيمة بنجاح**\n\n`
      + `💰 البدل: ${state.allowanceTypeName}\n`
      + `💵 القيمة الجديدة: ${amount} جنيه`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض بدلات الوظيفة', `payroll:pos-allowance:view:${state.positionId}`),
      },
    )
  }
  catch (error) {
    console.error('Error updating allowance:', error)
    await ctx.reply('❌ حدث خطأ أثناء التحديث')
    editStates.delete(userId)
  }
})

// ════════════════════════════════════════════════════════
// حذف بدل
// ════════════════════════════════════════════════════════

payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowance = await Database.prisma.hR_PositionAllowance.findUnique({
      where: { id: allowanceId },
      include: {
        position: true,
        allowanceType: true,
      },
    })

    if (!allowance) {
      await ctx.answerCallbackQuery('❌ البدل غير موجود')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('✅ نعم، احذف', `payroll:pos-allowance:delete:confirm:${allowanceId}`)
      .row()
      .text('❌ إلغاء', `payroll:pos-allowance:view:${allowance.positionId}`)

    await ctx.editMessageText(
      `⚠️ **تأكيد الحذف**\n\n`
      + `🏢 الوظيفة: ${allowance.position.titleAr}\n`
      + `💰 البدل: ${allowance.allowanceType.nameAr}\n`
      + `💵 القيمة: ${allowance.amount} جنيه\n\n`
      + `هل أنت متأكد من الحذف؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error preparing to delete:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تأكيد الحذف
payrollPositionAllowancesHandler.callbackQuery(/^payroll:pos-allowance:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowance = await Database.prisma.hR_PositionAllowance.findUnique({
      where: { id: allowanceId },
      select: { positionId: true },
    })

    if (!allowance) {
      await ctx.answerCallbackQuery('❌ البدل غير موجود')
      return
    }

    // حذف البدل (soft delete)
    await Database.prisma.hR_PositionAllowance.update({
      where: { id: allowanceId },
      data: { isActive: false },
    })

    await ctx.answerCallbackQuery('✅ تم الحذف بنجاح')

    // العودة لعرض الوظيفة
    const position = await Database.prisma.position.findUnique({
      where: { id: allowance.positionId },
      include: {
        positionAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
          orderBy: {
            allowanceType: { orderIndex: 'asc' },
          },
        },
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('❌ الوظيفة غير موجودة')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('➕ إضافة بدل', `payroll:pos-allowance:add:${allowance.positionId}`)
      .row()

    let message = `🏢 **${position.titleAr}**\n\n`

    if (position.positionAllowances.length === 0) {
      message += '❌ لا توجد بدلات مُعرّفة لهذه الوظيفة\n\n'
      message += '💡 اضغط "إضافة بدل" لتحديد البدلات الافتراضية'
    }
    else {
      message += `📊 البدلات المُعرّفة (${position.positionAllowances.length}):\n\n`

      position.positionAllowances.forEach((pa) => {
        message += `• **${pa.allowanceType.nameAr}**: ${pa.amount} جنيه\n`
        keyboard
          .text(`✏️ ${pa.allowanceType.nameAr}`, `payroll:pos-allowance:edit:${pa.id}`)
          .text(`🗑️`, `payroll:pos-allowance:delete:${pa.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', 'payroll:settings:position-allowances')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error deleting allowance:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء الحذف')
  }
})
