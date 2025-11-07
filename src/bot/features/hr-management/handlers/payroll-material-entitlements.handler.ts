/**
 * Payroll Material Entitlements Handler
 *
 * Manages daily material entitlements for positions and employees
 * استحقاقات المواد اليومية للوظائف والموظفين
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const payrollMaterialEntitlementsHandler = new Composer<Context>()

// ==================== State Management ====================

interface AddEntitlementState {
  step: 'select_type' | 'select_target' | 'select_item' | 'waiting_quantity'
  targetType?: 'POSITION' | 'EMPLOYEE'
  targetId?: number
  targetName?: string
  itemId?: number
  itemName?: string
  quantity?: number
}

interface EditEntitlementState {
  entitlementId: number
  step: 'waiting_quantity'
}

const addStates = new Map<number, AddEntitlementState>()
const editStates = new Map<number, EditEntitlementState>()

// ==================== Main Menu ====================

payrollMaterialEntitlementsHandler.callbackQuery('payroll:settings:material-entitlements', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب عدد الاستحقاقات
    const positionCount = await Database.prisma.hR_MaterialEntitlement.count({
      where: { targetType: 'POSITION', isActive: true },
    })

    const employeeCount = await Database.prisma.hR_MaterialEntitlement.count({
      where: { targetType: 'EMPLOYEE', isActive: true },
    })

    const keyboard = new InlineKeyboard()
      .text('🏢 استحقاقات الوظائف', 'payroll:material:list:position')
      .row()
      .text('👤 استحقاقات الموظفين', 'payroll:material:list:employee')
      .row()
      .text('➕ إضافة استحقاق جديد', 'payroll:material:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings')

    await ctx.editMessageText(
      `📦 **استحقاقات المواد اليومية**\n\n`
      + `💡 **نظام الاستحقاقات:**\n`
      + `يمكنك تحديد استحقاق يومي من المواد لكل وظيفة أو موظف\n\n`
      + `📊 **الإحصائيات:**\n`
      + `• استحقاقات الوظائف: ${positionCount}\n`
      + `• استحقاقات الموظفين: ${employeeCount}\n\n`
      + `🔹 اختر القسم المطلوب:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in material entitlements menu:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== List Entitlements ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:list:(position|employee)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const targetType = ctx.match![1].toUpperCase() as 'POSITION' | 'EMPLOYEE'

  try {
    const entitlements = await Database.prisma.hR_MaterialEntitlement.findMany({
      where: { targetType, isActive: true },
      include: {
        item: true,
      },
      orderBy: { targetId: 'asc' },
    })

    if (entitlements.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('➕ إضافة استحقاق', 'payroll:material:add:start')
        .row()
        .text('⬅️ رجوع', 'payroll:settings:material-entitlements')

      const typeLabel = targetType === 'POSITION' ? 'الوظائف' : 'الموظفين'

      await ctx.editMessageText(
        `📦 **استحقاقات ${typeLabel}**\n\n`
        + `❌ لا توجد استحقاقات حالياً\n\n`
        + `💡 يمكنك إضافة استحقاق جديد`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
      return
    }

    // جلب معلومات الوظائف/الموظفين
    const targetIds = [...new Set(entitlements.map(e => e.targetId))]
    let targetsMap = new Map<number, string>()

    if (targetType === 'POSITION') {
      const positions = await Database.prisma.position.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, titleAr: true },
      })
      targetsMap = new Map(positions.map(p => [p.id, p.titleAr]))
    }
    else {
      const employees = await Database.prisma.employee.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, fullName: true },
      })
      targetsMap = new Map(employees.map(e => [e.id, e.fullName]))
    }

    // تجميع الاستحقاقات حسب الهدف
    const groupedEntitlements = new Map<number, typeof entitlements>()
    for (const ent of entitlements) {
      if (!groupedEntitlements.has(ent.targetId)) {
        groupedEntitlements.set(ent.targetId, [])
      }
      groupedEntitlements.get(ent.targetId)!.push(ent)
    }

    const keyboard = new InlineKeyboard()

    for (const [targetId, ents] of groupedEntitlements) {
      const targetName = targetsMap.get(targetId) || `غير معروف`
      keyboard.text(
        `${targetName} (${ents.length} صنف)`,
        `payroll:material:view:${targetType.toLowerCase()}:${targetId}`,
      ).row()
    }

    keyboard.text('➕ إضافة استحقاق', 'payroll:material:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:material-entitlements')

    const typeLabel = targetType === 'POSITION' ? 'الوظائف' : 'الموظفين'

    await ctx.editMessageText(
      `📦 **استحقاقات ${typeLabel}**\n\n`
      + `📊 العدد: ${groupedEntitlements.size}\n\n`
      + `💡 اختر ${targetType === 'POSITION' ? 'وظيفة' : 'موظف'} لعرض استحقاقاته:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error listing material entitlements:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== View Target Entitlements ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:view:(position|employee):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const targetType = ctx.match![1].toUpperCase() as 'POSITION' | 'EMPLOYEE'
  const targetId = Number.parseInt(ctx.match![2], 10)

  try {
    const entitlements = await Database.prisma.hR_MaterialEntitlement.findMany({
      where: { targetType, targetId, isActive: true },
      include: {
        item: true,
      },
      orderBy: { item: { nameAr: 'asc' } },
    })

    // جلب اسم الوظيفة/الموظف
    let targetName = 'غير معروف'
    if (targetType === 'POSITION') {
      const position = await Database.prisma.position.findUnique({
        where: { id: targetId },
        select: { titleAr: true },
      })
      targetName = position?.titleAr || 'غير معروف'
    }
    else {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      })
      targetName = employee?.fullName || 'غير معروف'
    }

    let message = `📦 **استحقاقات: ${targetName}**\n\n`
    message += `📊 عدد الأصناف: ${entitlements.length}\n\n`

    if (entitlements.length > 0) {
      message += `📋 **الأصناف المستحقة:**\n\n`
      for (const ent of entitlements) {
        message += `• **${ent.item.nameAr}**\n`
        message += `  📦 الكمية اليومية: ${ent.dailyQuantity} ${ent.item.unit}\n`
        if (ent.notes) {
          message += `  📝 ملاحظات: ${ent.notes}\n`
        }
        message += `\n`
      }
    }

    const keyboard = new InlineKeyboard()

    // أزرار الأصناف
    for (const ent of entitlements) {
      keyboard
        .text(`✏️ ${ent.item.nameAr}`, `payroll:material:edit:${ent.id}`)
        .text('🗑️', `payroll:material:delete:confirm:${ent.id}`)
        .row()
    }

    keyboard
      .text('➕ إضافة صنف', `payroll:material:add:direct:${targetType.toLowerCase()}:${targetId}`)
      .row()
      .text('⬅️ رجوع', `payroll:material:list:${targetType.toLowerCase()}`)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error viewing target entitlements:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Add Entitlement - Start ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:add:(start|direct:(position|employee):(\d+))$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id

  // إذا كان إضافة مباشرة لهدف معين
  if (ctx.match![1].startsWith('direct:')) {
    const targetType = ctx.match![2].toUpperCase() as 'POSITION' | 'EMPLOYEE'
    const targetId = Number.parseInt(ctx.match![3], 10)

    // جلب اسم الهدف
    let targetName = 'غير معروف'
    if (targetType === 'POSITION') {
      const position = await Database.prisma.position.findUnique({
        where: { id: targetId },
        select: { titleAr: true },
      })
      targetName = position?.titleAr || 'غير معروف'
    }
    else {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      })
      targetName = employee?.fullName || 'غير معروف'
    }

    addStates.set(userId, {
      step: 'select_item',
      targetType,
      targetId,
      targetName,
    })

    await showItemSelection(ctx, targetType, targetId, targetName)
  }
  else {
    // اختيار نوع الهدف (وظيفة أو موظف)
    addStates.set(userId, {
      step: 'select_type',
    })

    const keyboard = new InlineKeyboard()
      .text('🏢 وظيفة', 'payroll:material:add:type:position')
      .row()
      .text('👤 موظف', 'payroll:material:add:type:employee')
      .row()
      .text('❌ إلغاء', 'payroll:settings:material-entitlements')

    await ctx.editMessageText(
      `➕ **إضافة استحقاق جديد**\n\n`
      + `🔹 **الخطوة 1/4:** اختر نوع الاستحقاق:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
})

// ==================== Select Target Type ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:add:type:(position|employee)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)
  if (!state)
    return

  const targetType = ctx.match![1].toUpperCase() as 'POSITION' | 'EMPLOYEE'
  state.targetType = targetType
  state.step = 'select_target'
  addStates.set(userId, state)

  try {
    if (targetType === 'POSITION') {
      await showPositionSelection(ctx)
    }
    else {
      await showEmployeeSelection(ctx)
    }
  }
  catch (error) {
    console.error('Error in target type selection:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Show Position Selection ====================

async function showPositionSelection(ctx: Context) {
  const positions = await Database.prisma.position.findMany({
    where: { isActive: true },
    select: { id: true, titleAr: true },
    orderBy: { titleAr: 'asc' },
  })

  if (positions.length === 0) {
    await ctx.editMessageText(
      `❌ لا توجد وظائف نشطة\n\n`
      + `يجب إضافة وظائف أولاً`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:settings:material-entitlements'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const position of positions) {
    keyboard
      .text(position.titleAr, `payroll:material:add:target:position:${position.id}`)
      .row()
  }

  keyboard.text('❌ إلغاء', 'payroll:settings:material-entitlements')

  await ctx.editMessageText(
    `🏢 **الخطوة 2/4:** اختر الوظيفة:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Show Employee Selection ====================

async function showEmployeeSelection(ctx: Context) {
  const employees = await Database.prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
    take: 20, // حد أقصى للعرض
  })

  if (employees.length === 0) {
    await ctx.editMessageText(
      `❌ لا يوجد موظفون نشطون`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:settings:material-entitlements'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const employee of employees) {
    keyboard
      .text(employee.fullName, `payroll:material:add:target:employee:${employee.id}`)
      .row()
  }

  keyboard.text('❌ إلغاء', 'payroll:settings:material-entitlements')

  await ctx.editMessageText(
    `👤 **الخطوة 2/4:** اختر الموظف:\n\n`
    + `💡 عرض أول 20 موظف`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Select Target ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:add:target:(position|employee):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)
  if (!state)
    return

  const targetType = ctx.match![1].toUpperCase() as 'POSITION' | 'EMPLOYEE'
  const targetId = Number.parseInt(ctx.match![2], 10)

  try {
    // جلب اسم الهدف
    let targetName = 'غير معروف'
    if (targetType === 'POSITION') {
      const position = await Database.prisma.position.findUnique({
        where: { id: targetId },
        select: { titleAr: true },
      })
      targetName = position?.titleAr || 'غير معروف'
    }
    else {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      })
      targetName = employee?.fullName || 'غير معروف'
    }

    state.targetId = targetId
    state.targetName = targetName
    state.step = 'select_item'
    addStates.set(userId, state)

    await showItemSelection(ctx, targetType, targetId, targetName)
  }
  catch (error) {
    console.error('Error in target selection:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Show Item Selection ====================

async function showItemSelection(ctx: Context, targetType: string, targetId: number, targetName: string) {
  // جلب الأصناف النشطة
  const items = await Database.prisma.hR_AdvanceItem.findMany({
    where: { isActive: true },
    select: { id: true, nameAr: true, unit: true },
    orderBy: { nameAr: 'asc' },
  })

  // جلب الأصناف المستخدمة مسبقاً لهذا الهدف
  const existingEntitlements = await Database.prisma.hR_MaterialEntitlement.findMany({
    where: { targetType: targetType as any, targetId, isActive: true },
    select: { itemId: true },
  })

  const usedItemIds = new Set(existingEntitlements.map(e => e.itemId))
  const availableItems = items.filter(item => !usedItemIds.has(item.id))

  if (availableItems.length === 0) {
    await ctx.editMessageText(
      `❌ **لا توجد أصناف متاحة**\n\n`
      + `جميع الأصناف مستخدمة بالفعل لـ: ${targetName}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:settings:material-entitlements'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const item of availableItems.slice(0, 15)) { // حد أقصى 15 صنف
    keyboard
      .text(`${item.nameAr} (${item.unit})`, `payroll:material:add:item:${item.id}`)
      .row()
  }

  keyboard.text('❌ إلغاء', 'payroll:settings:material-entitlements')

  await ctx.editMessageText(
    `📦 **الخطوة 3/4:** اختر الصنف\n\n`
    + `👤 ${targetType === 'POSITION' ? 'الوظيفة' : 'الموظف'}: ${targetName}\n\n`
    + `💡 عرض أول ${Math.min(availableItems.length, 15)} صنف متاح`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Select Item ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:add:item:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)
  if (!state)
    return

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const item = await Database.prisma.hR_AdvanceItem.findUnique({
      where: { id: itemId },
      select: { id: true, nameAr: true, unit: true },
    })

    if (!item) {
      await ctx.answerCallbackQuery('❌ صنف غير موجود')
      return
    }

    state.itemId = itemId
    state.itemName = item.nameAr
    state.step = 'waiting_quantity'
    addStates.set(userId, state)

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'payroll:material:add:cancel')

    await ctx.editMessageText(
      `💰 **الخطوة 4/4:** أرسل الكمية اليومية\n\n`
      + `👤 ${state.targetType === 'POSITION' ? 'الوظيفة' : 'الموظف'}: ${state.targetName}\n`
      + `📦 الصنف: ${item.nameAr}\n`
      + `📏 الوحدة: ${item.unit}\n\n`
      + `مثال: 2 أو 1.5`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in item selection:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Message Handler - Add Quantity ====================

payrollMaterialEntitlementsHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id
  const addState = addStates.get(userId)

  if (addState && addState.step === 'waiting_quantity') {
    const text = ctx.message.text.trim()
    const quantity = Number.parseFloat(text)

    if (Number.isNaN(quantity) || quantity <= 0) {
      await ctx.reply(
        '❌ الكمية يجب أن تكون رقماً موجباً\n\n'
        + 'مثال: 2 أو 1.5',
      )
      return
    }

    try {
      // إنشاء الاستحقاق
      const entitlement = await Database.prisma.hR_MaterialEntitlement.create({
        data: {
          targetType: addState.targetType!,
          targetId: addState.targetId!,
          itemId: addState.itemId!,
          dailyQuantity: quantity,
          createdBy: BigInt(userId),
        },
        include: {
          item: true,
        },
      })

      addStates.delete(userId)

      const keyboard = new InlineKeyboard()
        .text('👁️ عرض الاستحقاقات', `payroll:material:view:${addState.targetType!.toLowerCase()}:${addState.targetId}`)
        .row()
        .text('➕ إضافة استحقاق آخر', 'payroll:material:add:start')
        .row()
        .text('⬅️ رجوع', 'payroll:settings:material-entitlements')

      await ctx.reply(
        `✅ **تم إضافة الاستحقاق بنجاح**\n\n`
        + `👤 ${addState.targetType === 'POSITION' ? 'الوظيفة' : 'الموظف'}: ${addState.targetName}\n`
        + `📦 الصنف: ${addState.itemName}\n`
        + `💰 الكمية اليومية: ${quantity} ${entitlement.item.unit}`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
    }
    catch (error) {
      console.error('Error creating entitlement:', error)
      await ctx.reply('❌ حدث خطأ أثناء إضافة الاستحقاق')
    }
    return
  }

  // معالج التعديل
  const editState = editStates.get(userId)
  if (editState && editState.step === 'waiting_quantity') {
    const text = ctx.message.text.trim()
    const quantity = Number.parseFloat(text)

    if (Number.isNaN(quantity) || quantity <= 0) {
      await ctx.reply(
        '❌ الكمية يجب أن تكون رقماً موجباً\n\n'
        + 'مثال: 2 أو 1.5',
      )
      return
    }

    try {
      const entitlement = await Database.prisma.hR_MaterialEntitlement.update({
        where: { id: editState.entitlementId },
        data: {
          dailyQuantity: quantity,
          updatedBy: BigInt(userId),
        },
        include: {
          item: true,
        },
      })

      editStates.delete(userId)

      const keyboard = new InlineKeyboard()
        .text('👁️ عرض التفاصيل', `payroll:material:view:${entitlement.targetType.toLowerCase()}:${entitlement.targetId}`)
        .row()
        .text('⬅️ رجوع', 'payroll:settings:material-entitlements')

      await ctx.reply(
        `✅ **تم تعديل الاستحقاق بنجاح**\n\n`
        + `📦 الصنف: ${entitlement.item.nameAr}\n`
        + `💰 الكمية الجديدة: ${quantity} ${entitlement.item.unit}`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
    }
    catch (error) {
      console.error('Error updating entitlement:', error)
      await ctx.reply('❌ حدث خطأ أثناء تعديل الاستحقاق')
    }
    return
  }

  await next()
})

// ==================== Edit Entitlement ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const entitlementId = Number.parseInt(ctx.match![1], 10)

  try {
    const entitlement = await Database.prisma.hR_MaterialEntitlement.findUnique({
      where: { id: entitlementId },
      include: {
        item: true,
      },
    })

    if (!entitlement) {
      await ctx.answerCallbackQuery('❌ استحقاق غير موجود')
      return
    }

    editStates.set(userId, {
      entitlementId,
      step: 'waiting_quantity',
    })

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', `payroll:material:view:${entitlement.targetType.toLowerCase()}:${entitlement.targetId}`)

    await ctx.editMessageText(
      `✏️ **تعديل الاستحقاق**\n\n`
      + `📦 الصنف: ${entitlement.item.nameAr}\n`
      + `💰 الكمية الحالية: ${entitlement.dailyQuantity} ${entitlement.item.unit}\n\n`
      + `🔹 أرسل الكمية اليومية الجديدة:\n`
      + `مثال: 2 أو 1.5`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in edit entitlement:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Delete Confirmation ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const entitlementId = Number.parseInt(ctx.match![1], 10)

  try {
    const entitlement = await Database.prisma.hR_MaterialEntitlement.findUnique({
      where: { id: entitlementId },
      include: {
        item: true,
      },
    })

    if (!entitlement) {
      await ctx.answerCallbackQuery('❌ استحقاق غير موجود')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('✅ نعم، احذف', `payroll:material:delete:execute:${entitlementId}`)
      .text('❌ إلغاء', `payroll:material:view:${entitlement.targetType.toLowerCase()}:${entitlement.targetId}`)

    await ctx.editMessageText(
      `⚠️ **تأكيد الحذف**\n\n`
      + `📦 الصنف: ${entitlement.item.nameAr}\n`
      + `💰 الكمية اليومية: ${entitlement.dailyQuantity} ${entitlement.item.unit}\n\n`
      + `❓ هل أنت متأكد من حذف هذا الاستحقاق؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in delete confirmation:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ==================== Execute Delete ====================

payrollMaterialEntitlementsHandler.callbackQuery(/^payroll:material:delete:execute:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const entitlementId = Number.parseInt(ctx.match![1], 10)

  try {
    const entitlement = await Database.prisma.hR_MaterialEntitlement.findUnique({
      where: { id: entitlementId },
      select: { targetType: true, targetId: true },
    })

    if (!entitlement) {
      await ctx.answerCallbackQuery('❌ استحقاق غير موجود')
      return
    }

    await Database.prisma.hR_MaterialEntitlement.update({
      where: { id: entitlementId },
      data: {
        isActive: false,
        updatedBy: BigInt(userId),
      },
    })

    await ctx.editMessageText(
      `✅ **تم حذف الاستحقاق بنجاح**`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض الاستحقاقات', `payroll:material:view:${entitlement.targetType.toLowerCase()}:${entitlement.targetId}`)
          .row()
          .text('⬅️ رجوع', 'payroll:settings:material-entitlements'),
      },
    )
  }
  catch (error) {
    console.error('Error deleting entitlement:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء الحذف')
  }
})

// ==================== Cancel Operations ====================

payrollMaterialEntitlementsHandler.callbackQuery('payroll:material:add:cancel', async (ctx) => {
  await ctx.answerCallbackQuery()
  const userId = ctx.from!.id
  addStates.delete(userId)

  await ctx.editMessageText(
    `❌ تم إلغاء العملية`,
    {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'payroll:settings:material-entitlements'),
    },
  )
})
