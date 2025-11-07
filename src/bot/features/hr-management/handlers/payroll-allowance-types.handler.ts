/**
 * Payroll Allowance Types Handler - إدارة أنواع البدلات
 *
 * إدارة أنواع البدلات المختلفة:
 * - بدل مواصلات (Transport)
 * - بدل إجازات (Vacation)
 * - بدل إضافي (Overtime)
 * - بدلات أخرى (Other)
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const payrollAllowanceTypesHandler = new Composer<Context>()

// ════════════════════════════════════════════════════════
// عرض قائمة أنواع البدلات
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery('payroll:settings:allowance-types', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const allowanceTypes = await Database.prisma.hR_AllowanceType.findMany({
      orderBy: { orderIndex: 'asc' },
    })

    const keyboard = new InlineKeyboard()

    if (allowanceTypes.length === 0) {
      keyboard.text('➕ إضافة نوع بدل جديد', 'payroll:allowance-type:add').row()
    }
    else {
      allowanceTypes.forEach((type) => {
        const status = type.isActive ? '✅' : '❌'
        keyboard
          .text(`${status} ${type.nameAr}`, `payroll:allowance-type:view:${type.id}`)
          .row()
      })
      keyboard.text('➕ إضافة نوع جديد', 'payroll:allowance-type:add').row()
    }

    keyboard.text('⬅️ رجوع', 'payroll:settings')

    const message = `💰 **إدارة أنواع البدلات**\n\n${
      allowanceTypes.length === 0
        ? '❌ لا توجد أنواع بدلات مُعرّفة حالياً\n\n'
        : `📊 عدد الأنواع: ${allowanceTypes.length}\n\n`
    }📌 **أنواع البدلات المتاحة:**\n`
    + `• بدل مواصلات (Transport)\n`
    + `• بدل إجازات (Vacation)\n`
    + `• بدل إضافي (Overtime)\n`
    + `• بدلات أخرى (Other)\n\n`
    + `اختر نوعاً لعرض التفاصيل أو إضافة نوع جديد`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading allowance types:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء تحميل البيانات')
  }
})

// ════════════════════════════════════════════════════════
// عرض تفاصيل نوع بدل محدد
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!allowanceType) {
      await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
      return
    }

    // حساب عدد الوظائف والموظفين المرتبطين
    const positionCount = await Database.prisma.hR_PositionAllowance.count({
      where: { allowanceTypeId, isActive: true },
    })

    const employeeCount = await Database.prisma.hR_EmployeeAllowance.count({
      where: { allowanceTypeId, isActive: true },
    })

    const keyboard = new InlineKeyboard()
      .text(
        allowanceType.isActive ? '❌ تعطيل' : '✅ تفعيل',
        `payroll:allowance-type:toggle:${allowanceTypeId}`,
      )
      .row()
      .text('✏️ تعديل', `payroll:allowance-type:edit:${allowanceTypeId}`)
      .row()
      .text('🗑️ حذف', `payroll:allowance-type:delete:${allowanceTypeId}`)
      .row()
      .text('⬅️ رجوع', 'payroll:settings:allowance-types')

    const message = `💰 **تفاصيل نوع البدل**\n\n`
      + `📋 **الاسم بالعربية:** ${allowanceType.nameAr}\n`
      + `📋 **الاسم بالإنجليزية:** ${allowanceType.nameEn}\n`
      + `🔖 **الرمز:** \`${allowanceType.code}\`\n`
      + `📊 **الحالة:** ${allowanceType.isActive ? '✅ نشط' : '❌ معطل'}\n`
      + `🔢 **الترتيب:** ${allowanceType.orderIndex}\n\n`
      + `📈 **الإحصائيات:**\n`
      + `• عدد الوظائف المرتبطة: ${positionCount}\n`
      + `• عدد الموظفين المرتبطين: ${employeeCount}\n\n`
      + `📅 **تاريخ الإنشاء:** ${allowanceType.createdAt.toLocaleDateString('ar-EG')}`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error viewing allowance type:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// تفعيل/تعطيل نوع بدل
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:toggle:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!allowanceType) {
      await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
      return
    }

    // تبديل الحالة
    await Database.prisma.hR_AllowanceType.update({
      where: { id: allowanceTypeId },
      data: { isActive: !allowanceType.isActive },
    })

    await ctx.answerCallbackQuery(
      allowanceType.isActive ? '✅ تم التعطيل' : '✅ تم التفعيل',
    )

    // إعادة عرض التفاصيل
    const updatedType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!updatedType)
      return

    const positionCount = await Database.prisma.hR_PositionAllowance.count({
      where: { allowanceTypeId, isActive: true },
    })

    const employeeCount = await Database.prisma.hR_EmployeeAllowance.count({
      where: { allowanceTypeId, isActive: true },
    })

    const keyboard = new InlineKeyboard()
      .text(
        updatedType.isActive ? '❌ تعطيل' : '✅ تفعيل',
        `payroll:allowance-type:toggle:${allowanceTypeId}`,
      )
      .row()
      .text('✏️ تعديل', `payroll:allowance-type:edit:${allowanceTypeId}`)
      .row()
      .text('🗑️ حذف', `payroll:allowance-type:delete:${allowanceTypeId}`)
      .row()
      .text('⬅️ رجوع', 'payroll:settings:allowance-types')

    const message = `💰 **تفاصيل نوع البدل**\n\n`
      + `📋 **الاسم بالعربية:** ${updatedType.nameAr}\n`
      + `📋 **الاسم بالإنجليزية:** ${updatedType.nameEn}\n`
      + `🔖 **الرمز:** \`${updatedType.code}\`\n`
      + `📊 **الحالة:** ${updatedType.isActive ? '✅ نشط' : '❌ معطل'}\n`
      + `🔢 **الترتيب:** ${updatedType.orderIndex}\n\n`
      + `📈 **الإحصائيات:**\n`
      + `• عدد الوظائف المرتبطة: ${positionCount}\n`
      + `• عدد الموظفين المرتبطين: ${employeeCount}\n\n`
      + `📅 **تاريخ الإنشاء:** ${updatedType.createdAt.toLocaleDateString('ar-EG')}`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error toggling allowance type:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// إضافة نوع بدل جديد - عرض الأنواع المتاحة
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery('payroll:allowance-type:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('✨ إنشاء بدل مخصص جديد', 'payroll:allowance-type:add:CUSTOM')
    .row()
    .text('⬅️ رجوع', 'payroll:settings:allowance-types')

  await ctx.editMessageText(
    '➕ **إضافة بدل مخصص جديد**\n\n'
    + '📋 **البدلات الأساسية:**\n'
    + 'البدلات الأساسية الأربعة (مواصلات، إجازات، إضافي، أخرى) موجودة بالفعل في النظام.\n'
    + 'يمكنك تفعيلها أو تعطيلها من قائمة البدلات.\n\n'
    + '✨ **إنشاء بدل جديد:**\n'
    + 'إذا كنت تريد إضافة نوع بدل جديد بمواصفات خاصة (مثل: بدل سكن، بدل طعام، بدل اتصالات، إلخ)، اضغط على الزر أدناه.',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ════════════════════════════════════════════════════════
// حذف نوع بدل - تأكيد
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!allowanceType) {
      await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
      return
    }

    // التحقق من الارتباطات
    const positionCount = await Database.prisma.hR_PositionAllowance.count({
      where: { allowanceTypeId },
    })

    const employeeCount = await Database.prisma.hR_EmployeeAllowance.count({
      where: { allowanceTypeId },
    })

    if (positionCount > 0 || employeeCount > 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', `payroll:allowance-type:view:${allowanceTypeId}`)

      await ctx.editMessageText(
        `⚠️ **تحذير: لا يمكن الحذف**\n\n`
        + `لا يمكن حذف نوع البدل "${allowanceType.nameAr}" لأنه مرتبط بـ:\n\n`
        + `• ${positionCount} وظيفة\n`
        + `• ${employeeCount} موظف\n\n`
        + `💡 **الحل البديل:**\n`
        + `يمكنك تعطيل هذا النوع بدلاً من حذفه`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
      return
    }

    // تأكيد الحذف
    const keyboard = new InlineKeyboard()
      .text('✅ نعم، احذف', `payroll:allowance-type:delete:confirm:${allowanceTypeId}`)
      .row()
      .text('❌ إلغاء', `payroll:allowance-type:view:${allowanceTypeId}`)

    await ctx.editMessageText(
      `⚠️ **تأكيد الحذف**\n\n`
      + `هل أنت متأكد من حذف نوع البدل:\n`
      + `"${allowanceType.nameAr}"؟\n\n`
      + `⚠️ هذا الإجراء لا يمكن التراجع عنه!`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error checking allowance type for deletion:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// تأكيد الحذف النهائي
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!allowanceType) {
      await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
      return
    }

    // حذف النوع
    await Database.prisma.hR_AllowanceType.delete({
      where: { id: allowanceTypeId },
    })

    await ctx.answerCallbackQuery('✅ تم الحذف بنجاح')

    // العودة للقائمة
    const allowanceTypes = await Database.prisma.hR_AllowanceType.findMany({
      orderBy: { orderIndex: 'asc' },
    })

    const keyboard = new InlineKeyboard()

    if (allowanceTypes.length === 0) {
      keyboard.text('➕ إضافة نوع بدل جديد', 'payroll:allowance-type:add').row()
    }
    else {
      allowanceTypes.forEach((type) => {
        const status = type.isActive ? '✅' : '❌'
        keyboard
          .text(`${status} ${type.nameAr}`, `payroll:allowance-type:view:${type.id}`)
          .row()
      })
      keyboard.text('➕ إضافة نوع جديد', 'payroll:allowance-type:add').row()
    }

    keyboard.text('⬅️ رجوع', 'payroll:settings')

    const message = `✅ **تم حذف نوع البدل "${allowanceType.nameAr}" بنجاح**\n\n`
      + `💰 **إدارة أنواع البدلات**\n\n${
        allowanceTypes.length === 0
          ? '❌ لا توجد أنواع بدلات مُعرّفة حالياً\n\n'
          : `📊 عدد الأنواع: ${allowanceTypes.length}\n\n`
      }اختر نوعاً لعرض التفاصيل أو إضافة نوع جديد`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error deleting allowance type:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء الحذف')
  }
})

// ════════════════════════════════════════════════════════
// تعديل نوع بدل - Conversation State
// ════════════════════════════════════════════════════════

interface EditAllowanceState {
  allowanceTypeId: number
  step: 'waiting_name_ar' | 'waiting_name_en' | 'waiting_code'
}

const editStates = new Map<number, EditAllowanceState>()

// بدء التعديل
payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!allowanceType) {
      await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل الاسم بالعربية', `payroll:allowance-type:edit:name-ar:${allowanceTypeId}`)
      .row()
      .text('✏️ تعديل الاسم بالإنجليزية', `payroll:allowance-type:edit:name-en:${allowanceTypeId}`)
      .row()
      .text('✏️ تعديل الرمز', `payroll:allowance-type:edit:code:${allowanceTypeId}`)
      .row()
      .text('⬅️ رجوع', `payroll:allowance-type:view:${allowanceTypeId}`)

    const message = `✏️ **تعديل نوع البدل**\n\n`
      + `📋 **البيانات الحالية:**\n`
      + `• الاسم بالعربية: ${allowanceType.nameAr}\n`
      + `• الاسم بالإنجليزية: ${allowanceType.nameEn}\n`
      + `• الرمز: \`${allowanceType.code}\`\n\n`
      + `اختر ما تريد تعديله:`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading edit menu:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// تعديل الاسم بالعربية - طلب الإدخال
payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:edit:name-ar:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  // حفظ الحالة
  editStates.set(ctx.from!.id, {
    allowanceTypeId,
    step: 'waiting_name_ar',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `payroll:allowance-type:edit:cancel:${allowanceTypeId}`)

  await ctx.editMessageText(
    '✏️ **تعديل الاسم بالعربية**\n\n'
    + '📝 أرسل الاسم الجديد بالعربية:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تعديل الاسم بالإنجليزية - طلب الإدخال
payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:edit:name-en:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  // حفظ الحالة
  editStates.set(ctx.from!.id, {
    allowanceTypeId,
    step: 'waiting_name_en',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `payroll:allowance-type:edit:cancel:${allowanceTypeId}`)

  await ctx.editMessageText(
    '✏️ **تعديل الاسم بالإنجليزية**\n\n'
    + '📝 أرسل الاسم الجديد بالإنجليزية:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تعديل الرمز - طلب الإدخال
payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:edit:code:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  // حفظ الحالة
  editStates.set(ctx.from!.id, {
    allowanceTypeId,
    step: 'waiting_code',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `payroll:allowance-type:edit:cancel:${allowanceTypeId}`)

  await ctx.editMessageText(
    '✏️ **تعديل الرمز**\n\n'
    + '📝 أرسل الرمز الجديد (بالإنجليزية بدون مسافات):\n\n'
    + '⚠️ مثال: HOUSING, FOOD, MEDICAL',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// إلغاء التعديل
payrollAllowanceTypesHandler.callbackQuery(/^payroll:allowance-type:edit:cancel:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceTypeId = Number.parseInt(ctx.match![1], 10)

  // حذف الحالة
  editStates.delete(ctx.from!.id)

  // العودة لقائمة التعديل
  const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
    where: { id: allowanceTypeId },
  })

  if (!allowanceType) {
    await ctx.answerCallbackQuery('❌ نوع البدل غير موجود')
    return
  }

  const keyboard = new InlineKeyboard()
    .text('✏️ تعديل الاسم بالعربية', `payroll:allowance-type:edit:name-ar:${allowanceTypeId}`)
    .row()
    .text('✏️ تعديل الاسم بالإنجليزية', `payroll:allowance-type:edit:name-en:${allowanceTypeId}`)
    .row()
    .text('✏️ تعديل الرمز', `payroll:allowance-type:edit:code:${allowanceTypeId}`)
    .row()
    .text('⬅️ رجوع', `payroll:allowance-type:view:${allowanceTypeId}`)

  const message = `✏️ **تعديل نوع البدل**\n\n`
    + `📋 **البيانات الحالية:**\n`
    + `• الاسم بالعربية: ${allowanceType.nameAr}\n`
    + `• الاسم بالإنجليزية: ${allowanceType.nameEn}\n`
    + `• الرمز: \`${allowanceType.code}\`\n\n`
    + `اختر ما تريد تعديله:`

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// ════════════════════════════════════════════════════════
// معالج الرسائل النصية الموحد (للتعديل والإضافة)
// ════════════════════════════════════════════════════════

payrollAllowanceTypesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id
  const editState = editStates.get(userId)
  const newState = newAllowanceStates.get(userId)

  // التحقق من حالة التعديل
  if (editState) {
    const text = ctx.message.text.trim()

    try {
      if (editState.step === 'waiting_name_ar') {
        // تحديث الاسم بالعربية
        await Database.prisma.hR_AllowanceType.update({
          where: { id: editState.allowanceTypeId },
          data: { nameAr: text },
        })

        editStates.delete(userId)

        await ctx.reply(
          '✅ تم تحديث الاسم بالعربية بنجاح',
          {
            reply_markup: new InlineKeyboard()
              .text('👁️ عرض التفاصيل', `payroll:allowance-type:view:${editState.allowanceTypeId}`),
          },
        )
      }
      else if (editState.step === 'waiting_name_en') {
        // تحديث الاسم بالإنجليزية
        await Database.prisma.hR_AllowanceType.update({
          where: { id: editState.allowanceTypeId },
          data: { nameEn: text },
        })

        editStates.delete(userId)

        await ctx.reply(
          '✅ تم تحديث الاسم بالإنجليزية بنجاح',
          {
            reply_markup: new InlineKeyboard()
              .text('👁️ عرض التفاصيل', `payroll:allowance-type:view:${editState.allowanceTypeId}`),
          },
        )
      }
      else if (editState.step === 'waiting_code') {
        // التحقق من صحة الرمز
        const codeRegex = /^[A-Z_]+$/
        if (!codeRegex.test(text)) {
          await ctx.reply(
            '❌ الرمز يجب أن يحتوي على أحرف إنجليزية كبيرة وشرطة سفلية فقط\n\n'
            + 'مثال صحيح: HOUSING أو FOOD_ALLOWANCE',
          )
          return
        }

        // التحقق من عدم تكرار الرمز
        const existing = await Database.prisma.hR_AllowanceType.findUnique({
          where: { code: text },
        })

        if (existing && existing.id !== editState.allowanceTypeId) {
          await ctx.reply('❌ هذا الرمز مستخدم بالفعل، اختر رمزاً آخر')
          return
        }

        // تحديث الرمز
        await Database.prisma.hR_AllowanceType.update({
          where: { id: editState.allowanceTypeId },
          data: { code: text },
        })

        editStates.delete(userId)

        await ctx.reply(
          '✅ تم تحديث الرمز بنجاح',
          {
            reply_markup: new InlineKeyboard()
              .text('👁️ عرض التفاصيل', `payroll:allowance-type:view:${editState.allowanceTypeId}`),
          },
        )
      }
    }
    catch (error) {
      console.error('Error updating allowance type:', error)
      await ctx.reply('❌ حدث خطأ أثناء التحديث')
      editStates.delete(userId)
    }
    return
  }

  // التحقق من حالة الإضافة
  if (newState) {
    const text = ctx.message.text.trim()

    try {
      if (newState.step === 'waiting_name_ar') {
        // حفظ الاسم بالعربية
        newState.nameAr = text
        newState.step = 'waiting_name_en'

        await ctx.reply(
          '➕ **إضافة بدل مخصص جديد**\n\n'
          + '📝 **الخطوة 2/3:** أرسل الاسم بالإنجليزية\n\n'
          + 'مثال: Housing Allowance, Food Allowance, Medical Allowance',
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('❌ إلغاء', 'payroll:allowance-type:add'),
          },
        )
      }
      else if (newState.step === 'waiting_name_en') {
        // حفظ الاسم بالإنجليزية
        newState.nameEn = text
        newState.step = 'waiting_code'

        await ctx.reply(
          '➕ **إضافة بدل مخصص جديد**\n\n'
          + '📝 **الخطوة 3/3:** أرسل الرمز (CODE)\n\n'
          + 'يجب أن يكون بأحرف إنجليزية كبيرة فقط\n'
          + 'مثال: HOUSING, FOOD, MEDICAL, PHONE',
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('❌ إلغاء', 'payroll:allowance-type:add'),
          },
        )
      }
      else if (newState.step === 'waiting_code') {
        // التحقق من صحة الرمز
        const codeRegex = /^[A-Z_]+$/
        if (!codeRegex.test(text)) {
          await ctx.reply(
            '❌ الرمز يجب أن يحتوي على أحرف إنجليزية كبيرة وشرطة سفلية فقط\n\n'
            + 'مثال صحيح: HOUSING أو FOOD_ALLOWANCE',
          )
          return
        }

        // التحقق من عدم تكرار الرمز
        const existing = await Database.prisma.hR_AllowanceType.findUnique({
          where: { code: text },
        })

        if (existing) {
          await ctx.reply('❌ هذا الرمز مستخدم بالفعل، اختر رمزاً آخر')
          return
        }

        // الحصول على أكبر orderIndex
        const maxOrder = await Database.prisma.hR_AllowanceType.findFirst({
          orderBy: { orderIndex: 'desc' },
          select: { orderIndex: true },
        })

        // إنشاء البدل الجديد
        const newType = await Database.prisma.hR_AllowanceType.create({
          data: {
            code: text,
            nameAr: newState.nameAr!,
            nameEn: newState.nameEn!,
            isActive: true,
            orderIndex: (maxOrder?.orderIndex || 0) + 1,
          },
        })

        newAllowanceStates.delete(userId)

        await ctx.reply(
          `✅ **تم إضافة البدل المخصص بنجاح**\n\n`
          + `📋 **الاسم بالعربية:** ${newType.nameAr}\n`
          + `📋 **الاسم بالإنجليزية:** ${newType.nameEn}\n`
          + `🔖 **الرمز:** \`${newType.code}\`\n\n`
          + `يمكنك الآن تعيين هذا البدل للوظائف أو الموظفين`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('👁️ عرض التفاصيل', `payroll:allowance-type:view:${newType.id}`)
              .row()
              .text('📋 قائمة البدلات', 'payroll:settings:allowance-types'),
          },
        )
      }
    }
    catch (error) {
      console.error('Error creating custom allowance:', error)
      await ctx.reply('❌ حدث خطأ أثناء الإضافة')
      newAllowanceStates.delete(userId)
    }
    return;
  }

  return next();
})

// ════════════════════════════════════════════════════════
// إضافة بدل مخصص جديد - Conversation State
// ════════════════════════════════════════════════════════

interface NewAllowanceState {
  step: 'waiting_name_ar' | 'waiting_name_en' | 'waiting_code'
  nameAr?: string
  nameEn?: string
  code?: string
}

const newAllowanceStates = new Map<number, NewAllowanceState>()

// إضافة نوع بدل مخصص - خطوة 1: طلب الاسم بالعربية
payrollAllowanceTypesHandler.callbackQuery('payroll:allowance-type:add:CUSTOM', async (ctx) => {
  await ctx.answerCallbackQuery()

  // حفظ الحالة
  newAllowanceStates.set(ctx.from!.id, {
    step: 'waiting_name_ar',
  })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'payroll:allowance-type:add')

  await ctx.editMessageText(
    '➕ **إضافة بدل مخصص جديد**\n\n'
    + '📝 **الخطوة 1/3:** أرسل الاسم بالعربية\n\n'
    + 'مثال: بدل سكن، بدل طعام، بدل علاج',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})
