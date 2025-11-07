/**
 * Payroll Bonuses Handler
 * إدارة المكافآت الشهرية (فردية، للوظيفة، للجميع)
 */

import type { Context } from 'grammy'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const payrollBonusesHandler = new Composer<Context>()

// ==================== State Management ====================

interface AddBonusState {
  step: 'select_type' | 'select_target' | 'enter_name' | 'enter_amount' | 'enter_duration' | 'enter_description'
  bonusType?: 'INDIVIDUAL' | 'POSITION' | 'ALL'
  targetId?: number
  targetName?: string
  bonusName?: string
  amount?: number
  durationMonths?: number | null
  description?: string
}

interface EditBonusState {
  step: 'waiting_amount'
  bonusId: number
  bonusName: string
}

const addStates = new Map<number, AddBonusState>()
const editStates = new Map<number, EditBonusState>()

// ==================== Main Menu ====================

payrollBonusesHandler.callbackQuery('payroll:settings:bonuses', async (ctx) => {
  await ctx.answerCallbackQuery()

  const [individualCount, positionCount, allCount] = await Promise.all([
    Database.prisma.hR_Bonus.count({
      where: { bonusType: 'INDIVIDUAL', isActive: true },
    }),
    Database.prisma.hR_Bonus.count({
      where: { bonusType: 'POSITION', isActive: true },
    }),
    Database.prisma.hR_Bonus.count({
      where: { bonusType: 'ALL', isActive: true },
    }),
  ])

  const keyboard = new InlineKeyboard()
    .text('👤 مكافآت الموظفين', 'payroll:bonus:list:individual')
    .row()
    .text('🏢 مكافآت الوظائف', 'payroll:bonus:list:position')
    .row()
    .text('🌟 مكافآت عامة', 'payroll:bonus:list:all')
    .row()
    .text('➕ إضافة مكافأة جديدة', 'payroll:bonus:add:start')
    .row()
    .text('⬅️ رجوع', 'payroll:settings')

  await ctx.editMessageText(
    `🎁 **إدارة المكافآت**\n\n`
    + `💡 **نظام المكافآت:**\n`
    + `يمكنك إضافة مكافآت للموظفين أو الوظائف أو للجميع\n\n`
    + `📊 **الإحصائيات:**\n`
    + `• مكافآت فردية: ${individualCount}\n`
    + `• مكافآت الوظائف: ${positionCount}\n`
    + `• مكافآت عامة: ${allCount}\n\n`
    + `🔹 اختر القسم المطلوب:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== List Bonuses by Type ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:list:(individual|position|all)$/, async (ctx) => {
  const bonusType = ctx.match![1].toUpperCase() as 'INDIVIDUAL' | 'POSITION' | 'ALL'
  await ctx.answerCallbackQuery()

  const bonuses = await Database.prisma.hR_Bonus.findMany({
    where: {
      bonusType,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const typeLabel = bonusType === 'INDIVIDUAL' ? '👤 الموظفين' : bonusType === 'POSITION' ? '🏢 الوظائف' : '🌟 عامة'

  if (bonuses.length === 0) {
    const keyboard = new InlineKeyboard()
      .text('➕ إضافة مكافأة', 'payroll:bonus:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:bonuses')

    await ctx.editMessageText(
      `🎁 **مكافآت ${typeLabel}**\n\n`
      + `❌ لا توجد مكافآت حالياً\n\n`
      + `💡 يمكنك إضافة مكافأة جديدة`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  // Group by targetId for INDIVIDUAL/POSITION
  if (bonusType !== 'ALL') {
    const targetIds = [...new Set(bonuses.map(b => b.targetId!).filter(Boolean))]
    const targetsMap = new Map<number, string>()

    if (bonusType === 'POSITION') {
      const positions = await Database.prisma.position.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, titleAr: true },
      })
      positions.forEach(p => targetsMap.set(p.id, p.titleAr))
    }
    else {
      const employees = await Database.prisma.employee.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, fullName: true },
      })
      employees.forEach(e => targetsMap.set(e.id, e.fullName))
    }

    // Group bonuses by target
    const groupedBonuses = new Map<number, typeof bonuses>()
    for (const bonus of bonuses) {
      if (!bonus.targetId) {
        continue
      }
      const existing = groupedBonuses.get(bonus.targetId) || []
      existing.push(bonus)
      groupedBonuses.set(bonus.targetId, existing)
    }

    const keyboard = new InlineKeyboard()

    for (const [targetId, targetBonuses] of groupedBonuses.entries()) {
      const targetName = targetsMap.get(targetId) || 'غير معروف'
      const count = targetBonuses.length
      keyboard
        .text(
          `${targetName} (${count} مكافأة)`,
          `payroll:bonus:view:${bonusType.toLowerCase()}:${targetId}`,
        )
        .row()
    }

    keyboard
      .text('➕ إضافة مكافأة', 'payroll:bonus:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:bonuses')

    await ctx.editMessageText(
      `🎁 **مكافآت ${typeLabel}**\n\n`
      + `📊 العدد: ${groupedBonuses.size}\n\n`
      + `💡 اختر ${bonusType === 'POSITION' ? 'وظيفة' : 'موظف'} لعرض مكافآته:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  else {
    // For ALL type, show bonuses directly
    const keyboard = new InlineKeyboard()

    for (const bonus of bonuses) {
      const duration = bonus.durationMonths ? `${bonus.durationMonths} شهر` : 'دائمة'
      keyboard
        .text(
          `${bonus.bonusName} (${bonus.amount} ج - ${duration})`,
          `payroll:bonus:edit:${bonus.id}`,
        )
        .text('🗑️', `payroll:bonus:delete:confirm:${bonus.id}`)
        .row()
    }

    keyboard
      .text('➕ إضافة مكافأة', 'payroll:bonus:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:bonuses')

    await ctx.editMessageText(
      `🎁 **مكافآت عامة (للجميع)**\n\n`
      + `📊 العدد: ${bonuses.length}\n\n`
      + `📋 **القائمة:**`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
})

// ==================== View Target Bonuses ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:view:(individual|position):(\d+)$/, async (ctx) => {
  const bonusType = ctx.match![1].toUpperCase() as 'INDIVIDUAL' | 'POSITION'
  const targetId = Number.parseInt(ctx.match![2], 10)
  await ctx.answerCallbackQuery()

  const bonuses = await Database.prisma.hR_Bonus.findMany({
    where: {
      bonusType,
      targetId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get target name
  let targetName = 'غير معروف'
  if (bonusType === 'POSITION') {
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

  let message = `🎁 **مكافآت: ${targetName}**\n\n`
  message += `📊 عدد المكافآت: ${bonuses.length}\n\n`

  if (bonuses.length > 0) {
    message += `📋 **المكافآت النشطة:**\n\n`
    for (const bonus of bonuses) {
      const duration = bonus.durationMonths ? `${bonus.durationMonths} شهر` : '♾️ دائمة'
      message += `• **${bonus.bonusName}**\n`
      message += `  💰 المبلغ: ${bonus.amount} جنيه\n`
      message += `  ⏱️ المدة: ${duration}\n`
      message += `  📅 تاريخ البداية: ${bonus.startDate.toLocaleDateString('ar-EG')}\n`
      if (bonus.description) {
        message += `  📝 الوصف: ${bonus.description}\n`
      }
      message += `\n`
    }
  }

  const keyboard = new InlineKeyboard()

  for (const bonus of bonuses) {
    keyboard
      .text(`✏️ ${bonus.bonusName}`, `payroll:bonus:edit:${bonus.id}`)
      .text('🗑️', `payroll:bonus:delete:confirm:${bonus.id}`)
      .row()
  }

  keyboard
    .text('➕ إضافة مكافأة', `payroll:bonus:add:direct:${bonusType.toLowerCase()}:${targetId}`)
    .row()
    .text('⬅️ رجوع', `payroll:bonus:list:${bonusType.toLowerCase()}`)

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// ==================== Add Bonus - Start ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:add:(start|direct:(individual|position|all):(\d+))$/, async (ctx) => {
  const userId = ctx.from!.id
  await ctx.answerCallbackQuery()

  // If direct add to specific target
  if (ctx.match![1].startsWith('direct:')) {
    const bonusType = ctx.match![2].toUpperCase() as 'INDIVIDUAL' | 'POSITION' | 'ALL'
    const targetId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined

    // Get target name
    let targetName = 'للجميع'
    if (bonusType === 'POSITION' && targetId) {
      const position = await Database.prisma.position.findUnique({
        where: { id: targetId },
        select: { titleAr: true },
      })
      targetName = position?.titleAr || 'غير معروف'
    }
    else if (bonusType === 'INDIVIDUAL' && targetId) {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: targetId },
        select: { fullName: true },
      })
      targetName = employee?.fullName || 'غير معروف'
    }

    addStates.set(userId, {
      step: 'enter_name',
      bonusType,
      targetId,
      targetName,
    })

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'payroll:bonus:add:cancel')

    await ctx.editMessageText(
      `➕ **إضافة مكافأة جديدة**\n\n`
      + `🎯 الهدف: ${targetName}\n\n`
      + `📝 **الخطوة 1/4:** أرسل اسم المكافأة\n\n`
      + `💡 أمثلة: بدل تميز، مكافأة مجهودات، إضافي شهر رمضان`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  // Start from type selection
  addStates.set(userId, {
    step: 'select_type',
  })

  const keyboard = new InlineKeyboard()
    .text('👤 موظف محدد', 'payroll:bonus:add:type:individual')
    .row()
    .text('🏢 وظيفة', 'payroll:bonus:add:type:position')
    .row()
    .text('🌟 الجميع', 'payroll:bonus:add:type:all')
    .row()
    .text('❌ إلغاء', 'payroll:settings:bonuses')

  await ctx.editMessageText(
    `➕ **إضافة مكافأة جديدة**\n\n`
    + `🔹 **الخطوة 1/5:** اختر نوع المكافأة:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== Add Bonus - Select Type ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:add:type:(individual|position|all)$/, async (ctx) => {
  const userId = ctx.from!.id
  const bonusType = ctx.match![1].toUpperCase() as 'INDIVIDUAL' | 'POSITION' | 'ALL'
  await ctx.answerCallbackQuery()

  const state = addStates.get(userId)
  if (!state) {
    return
  }

  state.bonusType = bonusType

  // If ALL, skip target selection
  if (bonusType === 'ALL') {
    state.step = 'enter_name'
    state.targetName = 'الجميع'
    addStates.set(userId, state)

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'payroll:bonus:add:cancel')

    await ctx.editMessageText(
      `➕ **إضافة مكافأة عامة (للجميع)**\n\n`
      + `📝 **الخطوة 2/4:** أرسل اسم المكافأة\n\n`
      + `💡 أمثلة: بدل عيد الأضحى، مكافأة نهاية العام`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  // Show target selection
  if (bonusType === 'POSITION') {
    await showPositionSelection(ctx)
  }
  else {
    await showEmployeeSelection(ctx)
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
          .text('⬅️ رجوع', 'payroll:settings:bonuses'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const position of positions) {
    keyboard
      .text(position.titleAr, `payroll:bonus:add:target:position:${position.id}`)
      .row()
  }

  keyboard.text('❌ إلغاء', 'payroll:settings:bonuses')

  await ctx.editMessageText(
    `🏢 **الخطوة 2/5:** اختر الوظيفة:`,
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
    take: 20,
  })

  if (employees.length === 0) {
    await ctx.editMessageText(
      `❌ لا يوجد موظفون نشطون\n\n`
      + `يجب إضافة موظفين أولاً`,
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:settings:bonuses'),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const employee of employees) {
    keyboard
      .text(employee.fullName, `payroll:bonus:add:target:employee:${employee.id}`)
      .row()
  }

  keyboard.text('❌ إلغاء', 'payroll:settings:bonuses')

  await ctx.editMessageText(
    `👤 **الخطوة 2/5:** اختر الموظف:\n\n`
    + `💡 عرض أول 20 موظف`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

// ==================== Add Bonus - Select Target ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:add:target:(position|employee):(\d+)$/, async (ctx) => {
  const userId = ctx.from!.id
  const targetType = ctx.match![1]
  const targetId = Number.parseInt(ctx.match![2], 10)
  await ctx.answerCallbackQuery()

  const state = addStates.get(userId)
  if (!state) {
    return
  }

  state.targetId = targetId

  // Get target name
  if (targetType === 'position') {
    const position = await Database.prisma.position.findUnique({
      where: { id: targetId },
      select: { titleAr: true },
    })
    state.targetName = position?.titleAr || 'غير معروف'
  }
  else {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: targetId },
      select: { fullName: true },
    })
    state.targetName = employee?.fullName || 'غير معروف'
  }

  state.step = 'enter_name'
  addStates.set(userId, state)

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'payroll:bonus:add:cancel')

  const stepNumber = state.bonusType === 'ALL' ? '2/4' : '3/5'

  await ctx.editMessageText(
    `➕ **إضافة مكافأة**\n\n`
    + `🎯 الهدف: ${state.targetName}\n\n`
    + `📝 **الخطوة ${stepNumber}:** أرسل اسم المكافأة\n\n`
    + `💡 أمثلة: بدل تميز، مكافأة مجهودات، إضافي`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== Add Bonus - Cancel ====================

payrollBonusesHandler.callbackQuery('payroll:bonus:add:cancel', async (ctx) => {
  const userId = ctx.from!.id
  await ctx.answerCallbackQuery()

  addStates.delete(userId)

  await ctx.editMessageText(
    `❌ تم إلغاء إضافة المكافأة`,
    {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'payroll:settings:bonuses'),
    },
  )
})

// ==================== Message Handler (Name, Amount, Duration, Description) ====================

payrollBonusesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id
  const text = ctx.message.text.trim()

  const addState = addStates.get(userId)

  if (addState) {
    // Handle bonus name
    if (addState.step === 'enter_name') {
      if (text.length < 2) {
        await ctx.reply('❌ اسم المكافأة قصير جداً. أرسل اسماً أطول.')
        return
      }

      addState.bonusName = text
      addState.step = 'enter_amount'
      addStates.set(userId, addState)

      const stepNumber = addState.bonusType === 'ALL' ? '3/4' : '4/5'

      await ctx.reply(
        `💰 **الخطوة ${stepNumber}:** أرسل مبلغ المكافأة بالجنيه\n\n`
        + `🎯 الهدف: ${addState.targetName}\n`
        + `📝 اسم المكافأة: ${addState.bonusName}\n\n`
        + `مثال: 500 أو 1000`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('❌ إلغاء', 'payroll:bonus:add:cancel'),
        },
      )
      return
    }

    // Handle amount
    if (addState.step === 'enter_amount') {
      const amount = Number.parseFloat(text)

      if (Number.isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ مبلغ غير صحيح. أرسل رقماً صحيحاً.')
        return
      }

      addState.amount = amount
      addState.step = 'enter_duration'
      addStates.set(userId, addState)

      const stepNumber = addState.bonusType === 'ALL' ? '4/4' : '5/5'

      const keyboard = new InlineKeyboard()
        .text('1️⃣ شهر واحد', 'payroll:bonus:duration:1')
        .text('2️⃣ شهرين', 'payroll:bonus:duration:2')
        .row()
        .text('3️⃣ 3 أشهر', 'payroll:bonus:duration:3')
        .text('6️⃣ 6 أشهر', 'payroll:bonus:duration:6')
        .row()
        .text('🔟 سنة (12 شهر)', 'payroll:bonus:duration:12')
        .row()
        .text('♾️ دائمة', 'payroll:bonus:duration:null')
        .row()
        .text('❌ إلغاء', 'payroll:bonus:add:cancel')

      await ctx.reply(
        `⏱️ **الخطوة ${stepNumber}:** اختر مدة المكافأة:\n\n`
        + `🎯 الهدف: ${addState.targetName}\n`
        + `📝 اسم المكافأة: ${addState.bonusName}\n`
        + `💰 المبلغ: ${addState.amount} جنيه`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
      return
    }

    // Handle description (optional)
    if (addState.step === 'enter_description') {
      addState.description = text.length > 1 ? text : undefined
      addStates.set(userId, addState)

      // Create bonus
      await createBonus(ctx, addState)
      return
    }
  }

  const editState = editStates.get(userId)

  if (editState && editState.step === 'waiting_amount') {
    const amount = Number.parseFloat(text)

    if (Number.isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ مبلغ غير صحيح. أرسل رقماً صحيحاً.')
      return
    }

    try {
      await Database.prisma.hR_Bonus.update({
        where: { id: editState.bonusId },
        data: { amount },
      })

      editStates.delete(userId)

      await ctx.reply(
        `✅ **تم تحديث المكافأة بنجاح**\n\n`
        + `📝 المكافأة: ${editState.bonusName}\n`
        + `💰 المبلغ الجديد: ${amount} جنيه`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'payroll:settings:bonuses'),
        },
      )
    }
    catch {
      await ctx.reply('❌ حدث خطأ أثناء تحديث المكافأة')
    }

    return
  }

  await next()
})

// ==================== Select Duration ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:duration:(null|\d+)$/, async (ctx) => {
  const userId = ctx.from!.id
  const durationStr = ctx.match![1]
  await ctx.answerCallbackQuery()

  const state = addStates.get(userId)
  if (!state || state.step !== 'enter_duration') {
    return
  }

  state.durationMonths = durationStr === 'null' ? null : Number.parseInt(durationStr, 10)
  state.step = 'enter_description' // Update step to handle description input
  addStates.set(userId, state)

  // Ask for description (optional)
  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', 'payroll:bonus:skip:description')
    .row()
    .text('❌ إلغاء', 'payroll:bonus:add:cancel')

  await ctx.editMessageText(
    `📝 **خطوة إضافية (اختيارية):** أرسل وصف المكافأة\n\n`
    + `🎯 الهدف: ${state.targetName}\n`
    + `📝 اسم المكافأة: ${state.bonusName}\n`
    + `💰 المبلغ: ${state.amount} جنيه\n`
    + `⏱️ المدة: ${state.durationMonths ? `${state.durationMonths} شهر` : 'دائمة'}\n\n`
    + `💡 أو اضغط "تخطي" للمتابعة بدون وصف`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ==================== Skip Description ====================

payrollBonusesHandler.callbackQuery('payroll:bonus:skip:description', async (ctx) => {
  const userId = ctx.from!.id
  await ctx.answerCallbackQuery()

  const state = addStates.get(userId)
  if (!state) {
    return
  }

  await createBonus(ctx, state)
})

// ==================== Create Bonus ====================

async function createBonus(ctx: Context, state: AddBonusState) {
  const userId = ctx.from!.id

  try {
    await Database.prisma.hR_Bonus.create({
      data: {
        bonusType: state.bonusType!,
        targetId: state.targetId,
        bonusName: state.bonusName!,
        amount: state.amount!,
        durationMonths: state.durationMonths,
        description: state.description,
        startDate: new Date(),
        isActive: true,
        createdBy: BigInt(userId),
      },
    })

    addStates.delete(userId)

    const durationText = state.durationMonths ? `${state.durationMonths} شهر` : 'دائمة'

    const keyboard = new InlineKeyboard()

    if (state.bonusType !== 'ALL') {
      keyboard.text('👁️ عرض المكافآت', `payroll:bonus:view:${state.bonusType!.toLowerCase()}:${state.targetId}`).row()
    }

    keyboard
      .text('➕ إضافة مكافأة أخرى', 'payroll:bonus:add:start')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:bonuses')

    const successMessage = [
      '✅ **تم إضافة المكافأة بنجاح**\n',
      `🎯 الهدف: ${state.targetName}`,
      `📝 اسم المكافأة: ${state.bonusName}`,
      `💰 المبلغ: ${state.amount} جنيه`,
      `⏱️ المدة: ${durationText}`,
      state.description ? `📄 الوصف: ${state.description}` : '',
    ].filter(Boolean).join('\n')

    await ctx.reply(successMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch {
    await ctx.reply('❌ حدث خطأ أثناء إضافة المكافأة')
  }
}

// ==================== Edit Bonus ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:edit:(\d+)$/, async (ctx) => {
  const userId = ctx.from!.id
  const bonusId = Number.parseInt(ctx.match![1], 10)
  await ctx.answerCallbackQuery()

  const bonus = await Database.prisma.hR_Bonus.findUnique({
    where: { id: bonusId },
  })

  if (!bonus) {
    await ctx.answerCallbackQuery({ text: '❌ المكافأة غير موجودة', show_alert: true })
    return
  }

  editStates.set(userId, {
    step: 'waiting_amount',
    bonusId,
    bonusName: bonus.bonusName,
  })

  const durationText = bonus.durationMonths ? `${bonus.durationMonths} شهر` : 'دائمة'

  await ctx.editMessageText(
    `✏️ **تعديل المكافأة**\n\n`
    + `📝 الاسم: ${bonus.bonusName}\n`
    + `💰 المبلغ الحالي: ${bonus.amount} جنيه\n`
    + `⏱️ المدة: ${durationText}\n\n`
    + `💡 أرسل المبلغ الجديد:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', 'payroll:bonus:edit:cancel'),
    },
  )
})

// ==================== Cancel Edit ====================

payrollBonusesHandler.callbackQuery('payroll:bonus:edit:cancel', async (ctx) => {
  const userId = ctx.from!.id
  await ctx.answerCallbackQuery()

  editStates.delete(userId)

  await ctx.editMessageText(
    `❌ تم إلغاء التعديل`,
    {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'payroll:settings:bonuses'),
    },
  )
})

// ==================== Delete Bonus - Confirm ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:delete:confirm:(\d+)$/, async (ctx) => {
  const bonusId = Number.parseInt(ctx.match![1], 10)
  await ctx.answerCallbackQuery()

  const bonus = await Database.prisma.hR_Bonus.findUnique({
    where: { id: bonusId },
  })

  if (!bonus) {
    await ctx.answerCallbackQuery({ text: '❌ المكافأة غير موجودة', show_alert: true })
    return
  }

  const durationText = bonus.durationMonths ? `${bonus.durationMonths} شهر` : 'دائمة'

  await ctx.editMessageText(
    `⚠️ **تأكيد الحذف**\n\n`
    + `هل أنت متأكد من حذف المكافأة؟\n\n`
    + `📝 الاسم: ${bonus.bonusName}\n`
    + `💰 المبلغ: ${bonus.amount} جنيه\n`
    + `⏱️ المدة: ${durationText}`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('✅ نعم، احذف', `payroll:bonus:delete:execute:${bonusId}`)
        .text('❌ إلغاء', 'payroll:settings:bonuses')
        .row(),
    },
  )
})

// ==================== Delete Bonus - Execute ====================

payrollBonusesHandler.callbackQuery(/^payroll:bonus:delete:execute:(\d+)$/, async (ctx) => {
  const bonusId = Number.parseInt(ctx.match![1], 10)
  await ctx.answerCallbackQuery()

  try {
    await Database.prisma.hR_Bonus.update({
      where: { id: bonusId },
      data: { isActive: false },
    })

    await ctx.editMessageText(
      `✅ **تم حذف المكافأة بنجاح**`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'payroll:settings:bonuses'),
      },
    )
  }
  catch {
    await ctx.reply('❌ حدث خطأ أثناء حذف المكافأة')
  }
})
