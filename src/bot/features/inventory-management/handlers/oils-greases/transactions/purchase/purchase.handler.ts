import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { PurchaseService } from './purchase.service.js'
import { Database } from '#root/modules/database/index.js'

export const purchaseHandler = new Composer<Context>()

// Start purchase
purchaseHandler.callbackQuery('og:trans:purchase', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showItemsList(ctx, 1)
})

// Pagination
purchaseHandler.callbackQuery(/^og:trans:purchase:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showItemsList(ctx, page)
})

// Search menu
purchaseHandler.callbackQuery('og:trans:purchase:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showSearchMenu(ctx)
})

// Search by barcode photo
purchaseHandler.callbackQuery('og:trans:purchase:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'purchase',
    step: 'search_barcode_photo',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '📸 **البحث بصورة الباركود**\n\nأرسل صورة الباركود...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:purchase'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by code
purchaseHandler.callbackQuery('og:trans:purchase:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'purchase',
    step: 'search_code',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '🔢 **البحث بالكود**\n\nأرسل الكود...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:purchase'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by name
purchaseHandler.callbackQuery('og:trans:purchase:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'purchase',
    step: 'search_name',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\nأرسل اسم الصنف...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:purchase'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by category
purchaseHandler.callbackQuery('og:trans:purchase:search:category', async (ctx) => {
  await ctx.answerCallbackQuery()
  const categories = await PurchaseService.getCategories()
  
  const keyboard = new InlineKeyboard()
  for (const cat of categories) {
    keyboard.text(cat.nameAr, `og:trans:purchase:category:${cat.id}`).row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:purchase')
  
  await ctx.editMessageText(
    '📦 **البحث بالفئة**\n\nاختر الفئة:',
    { reply_markup: keyboard, parse_mode: 'Markdown' },
  )
})

// Filter by category
purchaseHandler.callbackQuery(/^og:trans:purchase:category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  await showItemsList(ctx, 1, categoryId)
})

// Select item
purchaseHandler.callbackQuery(/^og:trans:purchase:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const item = await PurchaseService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }
  
  ctx.session.inventoryForm = {
    action: 'purchase',
    step: 'awaiting_quantity',
    warehouse: 'oils-greases',
    data: { 
      itemId: item.id, 
      itemName: item.nameAr, 
      itemCode: item.code,
      itemBarcode: item.barcode,
      itemLocation: item.location?.nameAr,
      currentQuantity: item.quantity,
      unit: item.unit,
    },
  }
  
  await ctx.editMessageText(
    `📦 **الصنف المختار:**\n${item.nameAr}\n\n`
    + `**الكمية الحالية:** ${item.quantity} ${item.unit}\n\n`
    + '📊 **أدخل الكمية المراد إضافتها:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip unit price
purchaseHandler.callbackQuery('og:trans:purchase:skip_price', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state) return
  
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_supplier',
  }
  
  await ctx.reply(
    '🏢 **أدخل اسم المورد:**\n\n'
    + '(اختياري - يمكنك التخطي)',
    {
      reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_supplier'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip supplier
purchaseHandler.callbackQuery('og:trans:purchase:skip_supplier', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state) return
  
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_invoice',
  }
  
  await ctx.reply(
    '📄 **أدخل رقم الفاتورة:**\n\n'
    + '(اختياري - يمكنك التخطي)',
    {
      reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_invoice'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip invoice
purchaseHandler.callbackQuery('og:trans:purchase:skip_invoice', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state) return
  
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_notes',
  }
  
  await ctx.reply(
    '📝 **أدخل ملاحظات:**\n\n'
    + '(اختياري - يمكنك التخطي)',
    {
      reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_notes'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip notes and confirm
purchaseHandler.callbackQuery('og:trans:purchase:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showPurchaseConfirmation(ctx)
})

// Confirm purchase
purchaseHandler.callbackQuery('og:trans:purchase:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state || !ctx.dbUser) return
  
  try {
    await PurchaseService.createPurchase({
      itemId: state.data.itemId as number,
      quantity: state.data.quantity as number,
      unitPrice: state.data.unitPrice as number,
      supplierName: state.data.supplierName as string,
      invoiceNumber: state.data.invoiceNumber as string,
      notes: state.data.notes as string,
      userId: ctx.dbUser.userId,
    })
    
    ctx.session.inventoryForm = undefined
    
    const successMessage = '═══════════════════\n'
      + '✅ **تمت عملية الشراء بنجاح**\n'
      + '═══════════════════\n\n'
      + `📦 **الصنف:** ${state.data.itemName}\n`
      + `🔢 **الكود:** \`${state.data.itemCode || 'غير محدد'}\`\n`
      + (state.data.itemBarcode ? `📋 **الباركود:** \`${state.data.itemBarcode}\`\n` : '')
      + (state.data.itemLocation ? `📍 **الموقع:** ${state.data.itemLocation}\n` : '')
      + '\n'
      + '📊 **الكميات:**\n'
      + `   • السابقة: ${state.data.currentQuantity} ${state.data.unit}\n`
      + `   • المضافة: +${state.data.quantity} ${state.data.unit}\n`
      + `   • الجديدة: ${(state.data.currentQuantity as number) + (state.data.quantity as number)} ${state.data.unit}\n\n`
      + '💰 **المالية:**\n'
      + `   • سعر الوحدة: ${state.data.unitPrice} جنيه\n`
      + `   • الإجمالي: ${((state.data.quantity as number) * (state.data.unitPrice as number)).toFixed(2)} جنيه\n\n`
      + (state.data.supplierName ? `🏢 **المورد:** ${state.data.supplierName}\n` : '')
      + (state.data.invoiceNumber ? `📄 **رقم الفاتورة:** ${state.data.invoiceNumber}\n` : '')
      + (state.data.notes ? `📝 **ملاحظات:** ${state.data.notes}\n` : '')
      + `\n⏰ **التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`
      + `👤 **المستخدم:** ${ctx.from?.first_name || 'غير معروف'}`
    
    await ctx.editMessageText(successMessage, {
      reply_markup: new InlineKeyboard()
        .text('➕ عملية جديدة', 'og:trans:purchase')
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    })
    
    // Send notification to admins
    try {
      const admins = await Database.prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          isActive: true,
        },
      })
      
      const notificationMessage = '🔔 **إشعار: عملية شراء جديدة**\n\n' + successMessage
      
      for (const admin of admins) {
        if (admin.telegramId && admin.telegramId.toString() !== ctx.from?.id.toString()) {
          try {
            await ctx.api.sendMessage(admin.telegramId.toString(), notificationMessage, { parse_mode: 'Markdown' })
          } catch (e) {
            // Ignore if admin blocked the bot
          }
        }
      }
    } catch (error) {
      // Ignore notification errors
    }
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء حفظ العملية')
  }
})

// Photo handler for barcode
purchaseHandler.on('message:photo', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'purchase') return next()
  if (state.step !== 'search_barcode_photo') return next()
  
  try {
    const { BarcodeScannerService } = await import('#root/modules/services/barcode-scanner/index.js')
    const { Buffer } = await import('node:buffer')
    
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const file = await ctx.api.getFile(photo.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
    const response = await fetch(fileUrl)
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    
    await ctx.reply('🔎 جاري قراءة الباركود...')
    
    const result = await BarcodeScannerService.scanBarcode(imageBuffer)
    
    if (!result || !result.data) {
      await ctx.reply('❌ لم يتم التعرف على الباركود')
      return
    }
    
    const items = await PurchaseService.searchItems(result.data.trim())
    ctx.session.inventoryForm = undefined
    
    if (items.length === 0) {
      await ctx.reply('❌ لم يتم العثور على الصنف')
      return
    }
    
    const item = items[0]
    await selectItem(ctx, item.id)
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة')
  }
})

// Text handler
purchaseHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'purchase') return next()
  
  const text = ctx.message.text
  
  if (state.step === 'search_code' || state.step === 'search_name') {
    const items = await PurchaseService.searchItems(text)
    ctx.session.inventoryForm = undefined
    
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
    
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_price',
      data: { ...state.data, quantity },
    }
    
    await ctx.reply(
      '💰 **سعر الوحدة**\n\n'
      + 'أدخل سعر الوحدة بالجنيه:\n'
      + '🔹 اختياري - يمكنك التخطي',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_price'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
  if (state.step === 'awaiting_price') {
    const price = Number.parseFloat(text)
    if (Number.isNaN(price) || price <= 0) {
      await ctx.reply('❌ يجب إدخال رقم صحيح أكبر من صفر')
      return
    }
    
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_supplier',
      data: { ...state.data, unitPrice: price },
    }
    
    await ctx.reply(
      '🏢 **اسم المورد**\n\n'
      + 'أدخل اسم المورد أو الشركة:\n'
      + '🔹 اختياري - يمكنك التخطي',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_supplier'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
  if (state.step === 'awaiting_supplier') {
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_invoice',
      data: { ...state.data, supplierName: text },
    }
    
    await ctx.reply(
      '📄 **رقم الفاتورة**\n\n'
      + 'أدخل رقم فاتورة الشراء:\n'
      + '🔹 اختياري - يمكنك التخطي',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_invoice'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
  if (state.step === 'awaiting_invoice') {
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_notes',
      data: { ...state.data, invoiceNumber: text },
    }
    
    await ctx.reply(
      '📝 **ملاحظات**\n\n'
      + 'أدخل أي ملاحظات إضافية:\n'
      + '🔹 اختياري - يمكنك التخطي',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:trans:purchase:skip_notes'),
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
    
    await showPurchaseConfirmation(ctx)
    return
  }
  
  return next()
})

async function showPurchaseConfirmation(ctx: Context) {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  let message = '═════════════════\n'
  message += '📋 **مراجعة عملية الشراء**\n'
  message += '═════════════════\n\n'
  
  message += `📦 **الصنف:** ${state.data.itemName}\n`
  message += `🔢 **الكود:** \`${state.data.itemCode || 'غير محدد'}\`\n`
  if (state.data.itemBarcode) message += `📋 **الباركود:** \`${state.data.itemBarcode}\`\n`
  if (state.data.itemLocation) message += `📍 **الموقع:** ${state.data.itemLocation}\n`
  message += '\n'
  
  message += '📈 **الكميات:**\n'
  message += `   • الحالية: ${state.data.currentQuantity} ${state.data.unit}\n`
  message += `   • المضافة: +${state.data.quantity} ${state.data.unit}\n`
  message += `   • الجديدة: ${(state.data.currentQuantity as number) + (state.data.quantity as number)} ${state.data.unit}\n\n`
  
  message += '💰 **المالية:**\n'
  message += `   • سعر الوحدة: ${state.data.unitPrice || 'غير محدد'} جنيه\n`
  message += `   • الإجمالي: ${state.data.unitPrice ? ((state.data.quantity as number) * (state.data.unitPrice as number)).toFixed(2) : 'غير محدد'} جنيه\n\n`
  
  if (state.data.supplierName || state.data.invoiceNumber || state.data.notes) {
    message += '📝 **بيانات إضافية:**\n'
    if (state.data.supplierName) message += `   • المورد: ${state.data.supplierName}\n`
    if (state.data.invoiceNumber) message += `   • رقم الفاتورة: ${state.data.invoiceNumber}\n`
    if (state.data.notes) message += `   • ملاحظات: ${state.data.notes}\n`
  }
  
  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('✅ تأكيد العملية', 'og:trans:purchase:confirm')
      .row()
      .text('❌ إلغاء', 'og:trans:menu'),
    parse_mode: 'Markdown',
  })
}

async function showItemsList(ctx: Context, page: number, categoryId?: number) {
  const { ListItemsService } = await import('../../items/list-items/list-items.service.js')
  const result = await ListItemsService.getItems(page, 8, categoryId)
  
  if (result.total === 0) {
    await ctx.editMessageText('❌ لا توجد أصناف', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:trans:menu'),
    })
    return
  }
  
  let message = '➕ **شراء/إدخال كمية**\n\n'
  message += `📦 إجمالي الأصناف: ${result.total}\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر الصنف:**'
  
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < result.items.length; i += 2) {
    const item1 = result.items[i]
    const item2 = result.items[i + 1]
    
    keyboard.text(`${item1.nameAr} (${item1.quantity})`, `og:trans:purchase:select:${item1.id}`)
    if (item2) keyboard.text(`${item2.nameAr} (${item2.quantity})`, `og:trans:purchase:select:${item2.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:trans:purchase:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:trans:purchase:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('🔍 بحث', 'og:trans:purchase:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:trans:menu')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showSearchMenu(ctx: Context) {
  await ctx.editMessageText(
    '🔍 **البحث عن صنف**\n\nاختر طريقة البحث:',
    {
      reply_markup: new InlineKeyboard()
        .text('📸 صورة الباركود', 'og:trans:purchase:search:barcode')
        .row()
        .text('🔢 الكود', 'og:trans:purchase:search:code')
        .row()
        .text('📝 الاسم', 'og:trans:purchase:search:name')
        .row()
        .text('📦 الفئة', 'og:trans:purchase:search:category')
        .row()
        .text('⬅️ رجوع', 'og:trans:purchase'),
      parse_mode: 'Markdown',
    },
  )
}

async function showSearchResults(ctx: Context, items: any[]) {
  let message = '🔍 **نتائج البحث**\n\n'
  message += `📊 عدد النتائج: ${items.length}\n\n`
  message += '👇 **اختر الصنف:**'
  
  const keyboard = new InlineKeyboard()
  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i]
    const item2 = items[i + 1]
    
    keyboard.text(`${item1.nameAr} (${item1.quantity})`, `og:trans:purchase:select:${item1.id}`)
    if (item2) keyboard.text(`${item2.nameAr} (${item2.quantity})`, `og:trans:purchase:select:${item2.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:purchase')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function selectItem(ctx: Context, itemId: number) {
  const item = await PurchaseService.getItemById(itemId)
  if (!item) return
  
  ctx.session.inventoryForm = {
    action: 'purchase',
    step: 'awaiting_quantity',
    warehouse: 'oils-greases',
    data: { 
      itemId: item.id, 
      itemName: item.nameAr, 
      itemCode: item.code,
      itemBarcode: item.barcode,
      itemLocation: item.location?.nameAr,
      currentQuantity: item.quantity,
      unit: item.unit,
    },
  }
  
  await ctx.reply(
    `═════════════════\n`
    + `📦 **الصنف المختار**\n`
    + `═════════════════\n\n`
    + `**الاسم:** ${item.nameAr}\n`
    + `**الكود:** \`${item.code}\`\n`
    + `**الكمية الحالية:** ${item.quantity} ${item.unit}\n\n`
    + '📊 **أدخل الكمية المراد إضافتها:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
}
