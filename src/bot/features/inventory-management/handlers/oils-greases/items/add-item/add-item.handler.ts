import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { AddItemConversation } from './add-item.conversation.js'

export const addItemHandler = new Composer<Context>()

// Start
addItemHandler.callbackQuery('og:items:add:start', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.start(ctx)
})

// Scan barcode
addItemHandler.callbackQuery('og:items:add:scan', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.scanBarcode(ctx)
})

// Manual input
addItemHandler.callbackQuery('og:items:add:manual', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.manualInput(ctx)
})

// Confirm barcode
addItemHandler.callbackQuery(/^og:items:add:confirm-barcode:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const barcode = ctx.match![1]
  await AddItemConversation.confirmBarcode(ctx, barcode)
})

// Select category
addItemHandler.callbackQuery(/^og:items:add:select_category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  await AddItemConversation.selectCategory(ctx, categoryId)
})

// Select location
addItemHandler.callbackQuery(/^og:items:add:select_location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const locationId = Number.parseInt(ctx.match![1], 10)
  await AddItemConversation.selectLocation(ctx, locationId)
})



// Cancel flow - clear session
addItemHandler.callbackQuery('og:items:menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = undefined
  
  const keyboard = new InlineKeyboard()
    .text('➕ إضافة صنف جديد', 'og:items:add:start')
    .row()
    .text('🔍 البحث عن صنف', 'og:items:search')
    .row()
    .text('📊 عرض جميع الأصناف', 'og:items:list')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:oils_greases')

  await ctx.editMessageText(
    '🛢️ **إدارة الزيوت والشحوم**\n\n'
    + '📋 **الوظائف المتاحة:**\n\n'
    + '➕ **إضافة صنف جديد**\n'
    + '└ إدخال يدوي أو مسح باركود\n\n'
    + '🔍 **البحث عن صنف**\n'
    + '└ بالباركود، الكود، الاسم\n\n'
    + '📊 **عرض جميع الأصناف**\n'
    + '└ قائمة كاملة مع فلاتر',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Skip name_en
addItemHandler.callbackQuery('og:items:add:skip_name_en', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipNameEn(ctx)
})

// Select unit
addItemHandler.callbackQuery(/^og:items:add:select_unit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const unit = ctx.match![1]
  await AddItemConversation.selectUnit(ctx, unit)
})

// Confirm capacity
addItemHandler.callbackQuery(/^og:items:add:confirm_capacity:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const capacity = Number.parseInt(ctx.match![1], 10)
  await AddItemConversation.confirmCapacity(ctx, capacity)
})

// Skip min quantity
addItemHandler.callbackQuery('og:items:add:skip_min_quantity', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipMinQuantity(ctx)
})

// Skip price
addItemHandler.callbackQuery('og:items:add:skip_price', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipPrice(ctx)
})

// Skip supplier
addItemHandler.callbackQuery('og:items:add:skip_supplier', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipSupplier(ctx)
})

// Skip notes
addItemHandler.callbackQuery('og:items:add:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipNotes(ctx)
})

// Skip images
addItemHandler.callbackQuery('og:items:add:skip_images', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.skipImages(ctx)
})

// Continue images
addItemHandler.callbackQuery('og:items:add:continue_images', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '📸 أرسل الصورة التالية...' })
})

// Confirm save
addItemHandler.callbackQuery('og:items:add:confirm_save', async (ctx) => {
  await ctx.answerCallbackQuery()
  await AddItemConversation.confirmSave(ctx)
})

// Photo handler for barcode scanning AND product images
addItemHandler.on('message:photo', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases') return next()
  
  // Handle barcode scanning
  if (state.step === 'awaiting_barcode_image') {

  try {
    const { BarcodeScannerService } = await import('#root/modules/services/barcode-scanner/index.js')
    const { Buffer } = await import('node:buffer')
    
    const photos = ctx.message.photo
    if (!photos || photos.length === 0) {
      await ctx.reply('❌ لم يتم العثور على صورة')
      return
    }

    const photo = photos[photos.length - 1]
    const file = await ctx.api.getFile(photo.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
    const response = await fetch(fileUrl)
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

    const result = await BarcodeScannerService.scanBarcode(imageBuffer)

    if (!result || !result.data) {
      await ctx.reply('❌ لم يتم التعرف على الباركود. حاول مرة أخرى أو استخدم الإدخال اليدوي.')
      return
    }

    const barcode = result.data.trim()
    await ctx.reply(`✅ تم قراءة الباركود: \`${barcode}\``, { parse_mode: 'Markdown' })
    
    // Update session
    ctx.session.inventoryForm = {
      action: 'add',
      step: 'awaiting_name_ar',
      warehouse: 'oils-greases',
      data: { barcode },
    }

    await ctx.reply(
      '📝 **أدخل اسم الصنف بالعربية:**\n\n'
      + '**مثال:** زيت محرك 10W-40\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error processing barcode:', error)
    await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة')
    return
  }
  }
  
  // Handle product images
  if (state.step === 'awaiting_images') {
    try {
      const { Buffer } = await import('node:buffer')
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const process = await import('node:process')
      
      const photo = ctx.message.photo[ctx.message.photo.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const photoPath = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(photoPath)
      const buffer = await response.arrayBuffer()
      
      const uploadDir = path.join(process.cwd(), 'uploads', 'inventory', 'products')
      await fs.mkdir(uploadDir, { recursive: true })
      
      const currentImages = (state.data.images as string[]) || []
      const imageIndex = currentImages.length
      const fileName = `${state.data.barcode}-${imageIndex}.jpg`
      const filePath = path.join(uploadDir, fileName)
      
      await fs.writeFile(filePath, Buffer.from(buffer))
      
      const relativePath = `uploads/inventory/products/${fileName}`
      const updatedImages = [...currentImages, relativePath]
      
      ctx.session.inventoryForm = {
        ...state,
        data: { ...state.data, images: updatedImages },
      }
      
      const keyboard = new InlineKeyboard()
        .text('➕ إضافة صورة أخرى', 'og:items:add:continue_images')
        .row()
        .text('✅ إنهاء وحفظ', 'og:items:add:skip_images')
        .row()
        .text('❌ إلغاء', 'og:items:menu')
      
      await ctx.reply(
        `✅ **تم حفظ الصورة ${imageIndex + 1}**\n\n`
        + `📸 **إجمالي الصور:** ${updatedImages.length}\n\n`
        + '**ماذا تريد أن تفعل؟**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }
    catch (error) {
      console.error('Error handling product photo:', error)
      await ctx.reply('❌ حدث خطأ أثناء حفظ الصورة')
      return
    }
  }
  
  return next()
})

// Text handler - MUST check warehouse first
addItemHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  
  // Only handle if this is oils-greases warehouse
  if (!state || state.warehouse !== 'oils-greases') return next()
  if (state.action !== 'add') return next()

  const text = ctx.message.text

  if (state.step === 'awaiting_name_ar') {
    const handled = await AddItemConversation.handleNameInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_name_en') {
    const handled = await AddItemConversation.handleNameEnInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_unit_capacity') {
    const handled = await AddItemConversation.handleUnitCapacityInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_quantity') {
    const handled = await AddItemConversation.handleQuantityInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_min_quantity') {
    const handled = await AddItemConversation.handleMinQuantityInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_price') {
    const handled = await AddItemConversation.handlePriceInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_supplier') {
    const handled = await AddItemConversation.handleSupplierInput(ctx, text)
    if (handled) return
  }

  if (state.step === 'awaiting_notes') {
    const handled = await AddItemConversation.handleNotesInput(ctx, text)
    if (handled) return
  }

  return next()
})
