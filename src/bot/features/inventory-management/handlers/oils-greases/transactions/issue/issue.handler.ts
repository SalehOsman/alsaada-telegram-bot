import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { IssueService } from './issue.service.js'
import { Database } from '#root/modules/database/index.js'

export const issueHandler = new Composer<Context>()

// Start: Choose issuance type
issueHandler.callbackQuery('og:trans:issue', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('🚜 صرف لمعدة', 'og:issue:type:equipment')
    .row()
    .text('📦 صرف عام', 'og:issue:type:general')
    .row()
    .text('⬅️ رجوع', 'og:trans:menu')
  
  await ctx.editMessageText(
    '➖ **صرف/إخراج كمية**\n\n'
    + '📋 **اختر نوع الصرف:**\n\n'
    + '🚜 **صرف لمعدة**\n'
    + '└ صرف مرتبط بمعدة محددة\n\n'
    + '📦 **صرف عام**\n'
    + '└ صرف غير مرتبط بمعدة',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Select issuance type
issueHandler.callbackQuery(/^og:issue:type:(equipment|general)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const type = ctx.match![1] as 'equipment' | 'general'
  
  ctx.session.inventoryForm = {
    action: 'issue',
    step: 'select_item',
    warehouse: 'oils-greases',
    data: { issuanceType: type },
  }
  
  await showItemsList(ctx, 1)
})

// Pagination
issueHandler.callbackQuery(/^og:issue:items:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showItemsList(ctx, page)
})

// Search menu
issueHandler.callbackQuery('og:issue:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  await ctx.editMessageText(
    '🔍 **البحث عن صنف**\n\nاختر طريقة البحث:',
    {
      reply_markup: new InlineKeyboard()
        .text('🔢 الكود', 'og:issue:search:code')
        .row()
        .text('📝 الاسم', 'og:issue:search:name')
        .row()
        .text('⬅️ رجوع', 'og:trans:issue'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by code
issueHandler.callbackQuery('og:issue:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'search_code',
  }
  await ctx.editMessageText(
    '🔢 **البحث بالكود**\n\nأرسل الكود...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:issue'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by name
issueHandler.callbackQuery('og:issue:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'search_name',
  }
  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\nأرسل اسم الصنف...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:issue'),
      parse_mode: 'Markdown',
    },
  )
})

// Select item
issueHandler.callbackQuery(/^og:issue:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const item = await IssueService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'awaiting_quantity',
    data: {
      ...ctx.session.inventoryForm!.data,
      itemId: item.id,
      itemName: item.nameAr,
      itemCode: item.code,
      itemBarcode: item.barcode,
      currentQuantity: item.quantity,
      unit: item.unit,
    },
  }
  
  await ctx.editMessageText(
    `📦 **الصنف المختار:**\n${item.nameAr}\n\n`
    + `**الكمية الحالية:** ${item.quantity} ${item.unit}\n\n`
    + '📊 **أدخل الكمية المراد صرفها:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// Select employee - pagination
issueHandler.callbackQuery(/^og:issue:employee:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showEmployeesList(ctx, page)
})

// Search employee
issueHandler.callbackQuery('og:issue:employee:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'search_employee',
  }
  await ctx.editMessageText(
    '🔍 **البحث عن موظف**\n\nأرسل اسم أو كود الموظف...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:issue'),
      parse_mode: 'Markdown',
    },
  )
})

// Select employee
issueHandler.callbackQuery(/^og:issue:employee:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const employeeId = Number.parseInt(ctx.match![1], 10)
  const emp = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
  })
  
  if (!emp) {
    await ctx.answerCallbackQuery({ text: '❌ الموظف غير موجود' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    data: {
      ...ctx.session.inventoryForm!.data,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
    },
  }
  
  const issuanceType = ctx.session.inventoryForm!.data.issuanceType as string
  
  if (issuanceType === 'equipment') {
    ctx.session.inventoryForm!.step = 'select_equipment'
    await showEquipmentList(ctx, 1)
  } else {
    ctx.session.inventoryForm!.step = 'awaiting_purpose'
    await ctx.reply(
      '📝 **الغرض من الصرف**\n\nأدخل الغرض من الصرف:',
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// Select equipment - pagination
issueHandler.callbackQuery(/^og:issue:equipment:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showEquipmentList(ctx, page)
})

// Search equipment
issueHandler.callbackQuery('og:issue:equipment:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'search_equipment',
  }
  await ctx.editMessageText(
    '🔍 **البحث عن معدة**\n\nأرسل رقم أو اسم المعدة...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:issue'),
      parse_mode: 'Markdown',
    },
  )
})

// Select equipment
issueHandler.callbackQuery(/^og:issue:equipment:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const equipmentId = Number.parseInt(ctx.match![1], 10)
  const eq = await Database.prisma.equipment.findUnique({
    where: { id: equipmentId },
  })
  
  if (!eq) {
    await ctx.answerCallbackQuery({ text: '❌ المعدة غير موجودة' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'awaiting_notes',
    data: {
      ...ctx.session.inventoryForm!.data,
      equipmentId: eq.id,
      equipmentName: eq.nameAr,
      equipmentCode: eq.code,
    },
  }
  
  await ctx.reply(
    '📝 **ملاحظات**\n\nأدخل ملاحظات (اختياري):',
    {
      reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:issue:skip_notes'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip notes
issueHandler.callbackQuery('og:issue:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showConfirmation(ctx)
})

// Confirm
issueHandler.callbackQuery('og:issue:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state || !ctx.dbUser) return
  
  try {
    await IssueService.createIssuance({
      itemId: state.data.itemId as number,
      quantity: state.data.quantity as number,
      issuanceType: state.data.issuanceType as 'EQUIPMENT' | 'GENERAL',
      equipmentId: state.data.equipmentId as number | undefined,
      employeeId: state.data.employeeId as number,
      purpose: state.data.purpose as string | undefined,
      notes: state.data.notes as string | undefined,
      userId: ctx.dbUser.userId,
    })
    
    ctx.session.inventoryForm = undefined
    
    const successMessage = '═══════════════════\n'
      + '✅ **تمت عملية الصرف بنجاح**\n'
      + '═══════════════════\n\n'
      + `📦 **الصنف:** ${state.data.itemName}\n`
      + `🔢 **الكود:** \`${state.data.itemCode}\`\n`
      + (state.data.itemBarcode ? `📋 **الباركود:** \`${state.data.itemBarcode}\`\n` : '')
      + '\n'
      + '📊 **الكميات:**\n'
      + `   • السابقة: ${state.data.currentQuantity} ${state.data.unit}\n`
      + `   • المصروفة: -${state.data.quantity} ${state.data.unit}\n`
      + `   • الجديدة: ${(state.data.currentQuantity as number) - (state.data.quantity as number)} ${state.data.unit}\n\n`
      + '👤 **المستلم:**\n'
      + `   • الاسم: ${state.data.employeeName}\n`
      + `   • الكود: ${state.data.employeeCode}\n\n`
      + (state.data.equipmentId ? `🚜 **المعدة:** ${state.data.equipmentName} (${state.data.equipmentCode})\n\n` : '')
      + (state.data.purpose ? `📝 **الغرض:** ${state.data.purpose}\n\n` : '')
      + (state.data.notes ? `📝 **ملاحظات:** ${state.data.notes}\n\n` : '')
      + `⏰ **التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`
      + `👤 **المستخدم:** ${ctx.from?.first_name || 'غير معروف'}`
    
    await ctx.editMessageText(successMessage, {
      reply_markup: new InlineKeyboard()
        .text('➕ عملية جديدة', 'og:trans:issue')
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    })
    
    // إرسال تقرير للأدمن
    try {
      const admins = await Database.prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          isActive: true,
        },
      })
      
      const notificationMessage = '🔔 **إشعار: عملية صرف جديدة**\n\n' + successMessage
      
      for (const admin of admins) {
        if (admin.telegramId && admin.telegramId.toString() !== ctx.from?.id.toString()) {
          try {
            await ctx.api.sendMessage(admin.telegramId.toString(), notificationMessage, { parse_mode: 'Markdown' })
          } catch (e) {
            // تجاهل إذا حظر الأدمن البوت
          }
        }
      }
    } catch (error) {
      // تجاهل أخطاء الإشعارات
    }
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء حفظ العملية')
  }
})

// Text handler
issueHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'issue') return next()
  
  const text = ctx.message.text
  
  if (state.step === 'search_code' || state.step === 'search_name') {
    const items = await IssueService.searchItems(text)
    ctx.session.inventoryForm = { ...state, step: 'select_item' }
    
    if (items.length === 0) {
      await ctx.reply('❌ لم يتم العثور على نتائج')
      return
    }
    
    if (items.length === 1) {
      await selectItem(ctx, items[0].id)
      return
    }
    
    await showSearchResults(ctx, items)
    return
  }
  
  if (state.step === 'awaiting_quantity') {
    const quantity = Number.parseFloat(text)
    if (Number.isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ يجب إدخال رقم صحيح أكبر من صفر')
      return
    }
    
    if (quantity > (state.data.currentQuantity as number)) {
      await ctx.reply('❌ الكمية المطلوبة أكبر من الكمية المتاحة')
      return
    }
    
    ctx.session.inventoryForm = {
      ...state,
      step: 'select_employee',
      data: { ...state.data, quantity },
    }
    
    await showEmployeesList(ctx, 1)
    return
  }
  
  if (state.step === 'search_employee') {
    const employees = await IssueService.searchEmployees(text)
    ctx.session.inventoryForm = { ...state, step: 'select_employee' }
    
    if (employees.length === 0) {
      await ctx.reply('❌ لم يتم العثور على موظف')
      return
    }
    
    await showEmployeesSearchResults(ctx, employees)
    return
  }
  
  if (state.step === 'search_equipment') {
    const equipment = await IssueService.searchEquipment(text)
    ctx.session.inventoryForm = { ...state, step: 'select_equipment' }
    
    if (equipment.length === 0) {
      await ctx.reply('❌ لم يتم العثور على معدة')
      return
    }
    
    await showEquipmentSearchResults(ctx, equipment)
    return
  }
  
  if (state.step === 'awaiting_purpose') {
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_notes',
      data: { ...state.data, purpose: text },
    }
    
    await ctx.reply(
      '📝 **ملاحظات**\n\nأدخل ملاحظات (اختياري):',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:issue:skip_notes'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
  if (state.step === 'awaiting_notes') {
    ctx.session.inventoryForm = {
      ...state,
      data: { ...state.data, notes: text },
    }
    
    await showConfirmation(ctx)
    return
  }
  
  return next()
})

// Helper functions
async function showItemsList(ctx: Context, page: number) {
  const result = await IssueService.getItems(page, 8)
  
  if (result.total === 0) {
    await ctx.editMessageText('❌ لا توجد أصناف', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:trans:menu'),
    })
    return
  }
  
  let message = '➖ **صرف/إخراج كمية**\n\n'
  message += `📦 إجمالي الأصناف: ${result.total}\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر الصنف:**'
  
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < result.items.length; i += 2) {
    const item1 = result.items[i]
    const item2 = result.items[i + 1]
    
    keyboard.text(`${item1.nameAr} (${item1.quantity})`, `og:issue:select:${item1.id}`)
    if (item2) keyboard.text(`${item2.nameAr} (${item2.quantity})`, `og:issue:select:${item2.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:issue:items:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:issue:items:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('🔍 بحث', 'og:issue:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showSearchResults(ctx: Context, items: any[]) {
  let message = '🔍 **نتائج البحث**\n\n'
  message += `📊 عدد النتائج: ${items.length}\n\n`
  message += '👇 **اختر الصنف:**'
  
  const keyboard = new InlineKeyboard()
  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i]
    const item2 = items[i + 1]
    
    keyboard.text(`${item1.nameAr} (${item1.quantity})`, `og:issue:select:${item1.id}`)
    if (item2) keyboard.text(`${item2.nameAr} (${item2.quantity})`, `og:issue:select:${item2.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function selectItem(ctx: Context, itemId: number) {
  const item = await IssueService.getItemById(itemId)
  if (!item) return
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'awaiting_quantity',
    data: {
      ...ctx.session.inventoryForm!.data,
      itemId: item.id,
      itemName: item.nameAr,
      itemCode: item.code,
      itemBarcode: item.barcode,
      currentQuantity: item.quantity,
      unit: item.unit,
    },
  }
  
  await ctx.reply(
    `📦 **الصنف المختار:**\n${item.nameAr}\n\n`
    + `**الكمية الحالية:** ${item.quantity} ${item.unit}\n\n`
    + '📊 **أدخل الكمية المراد صرفها:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
}

async function showEmployeesList(ctx: Context, page: number) {
  const result = await IssueService.getEmployees(page, 8)
  
  let message = '👤 **اختر الموظف المستلم**\n\n'
  message += `📊 إجمالي الموظفين: ${result.total}\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر الموظف:**'
  
  const keyboard = new InlineKeyboard()
  
  for (const emp of result.employees) {
    keyboard.text(`${emp.fullName} (${emp.employeeCode})`, `og:issue:employee:select:${emp.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:issue:employee:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:issue:employee:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('🔍 بحث', 'og:issue:employee:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showEmployeesSearchResults(ctx: Context, employees: any[]) {
  let message = '🔍 **نتائج البحث**\n\n'
  message += `📊 عدد النتائج: ${employees.length}\n\n`
  message += '👇 **اختر الموظف:**'
  
  const keyboard = new InlineKeyboard()
  for (const emp of employees) {
    keyboard.text(`${emp.fullName} (${emp.employeeCode})`, `og:issue:employee:select:${emp.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showEquipmentList(ctx: Context, page: number) {
  const result = await IssueService.getEquipment(page, 8)
  
  let message = '🚜 **اختر المعدة**\n\n'
  message += `📊 إجمالي المعدات: ${result.total}\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر المعدة:**'
  
  const keyboard = new InlineKeyboard()
  
  for (const eq of result.equipment) {
    keyboard.text(`${eq.nameAr} (${eq.code})`, `og:issue:equipment:select:${eq.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:issue:equipment:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:issue:equipment:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('🔍 بحث', 'og:issue:equipment:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showEquipmentSearchResults(ctx: Context, equipment: any[]) {
  let message = '🔍 **نتائج البحث**\n\n'
  message += `📊 عدد النتائج: ${equipment.length}\n\n`
  message += '👇 **اختر المعدة:**'
  
  const keyboard = new InlineKeyboard()
  for (const eq of equipment) {
    keyboard.text(`${eq.nameAr} (${eq.code})`, `og:issue:equipment:select:${eq.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:issue')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showConfirmation(ctx: Context) {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  let message = '═════════════════\n'
  message += '📋 **مراجعة عملية الصرف**\n'
  message += '═════════════════\n\n'
  
  message += `📦 **الصنف:** ${state.data.itemName}\n`
  message += `🔢 **الكود:** \`${state.data.itemCode}\`\n`
  if (state.data.itemBarcode) message += `📋 **الباركود:** \`${state.data.itemBarcode}\`\n`
  message += '\n'
  
  message += '📈 **الكميات:**\n'
  message += `   • الحالية: ${state.data.currentQuantity} ${state.data.unit}\n`
  message += `   • المصروفة: -${state.data.quantity} ${state.data.unit}\n`
  message += `   • الجديدة: ${(state.data.currentQuantity as number) - (state.data.quantity as number)} ${state.data.unit}\n\n`
  
  message += '👤 **المستلم:**\n'
  message += `   • الاسم: ${state.data.employeeName}\n`
  message += `   • الكود: ${state.data.employeeCode}\n\n`
  
  if (state.data.equipmentId) {
    message += '🚜 **المعدة:**\n'
    message += `   • الاسم: ${state.data.equipmentName}\n`
    message += `   • الكود: ${state.data.equipmentCode}\n\n`
  }
  
  if (state.data.purpose) {
    message += `📝 **الغرض:** ${state.data.purpose}\n\n`
  }
  
  if (state.data.notes) {
    message += `📝 **ملاحظات:** ${state.data.notes}\n\n`
  }
  
  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('✅ تأكيد العملية', 'og:issue:confirm')
      .row()
      .text('❌ إلغاء', 'og:trans:menu'),
    parse_mode: 'Markdown',
  })
}
