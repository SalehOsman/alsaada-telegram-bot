/**
 * Add Item Handler - Event handlers for add item flow
 * ✅ Refactored to use Utils (v2.0)
 */

import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { AddItemConversation } from './add-item.conversation.js'
import { EditModeHandler } from '#root/bot/utils/conversation/edit-mode-handler.util.js'

// ✅ استخدام Utils - من المستوى العام للبوت
import { buildActionButtons, addBackButton } from '#root/bot/utils/ui/keyboard-builder.util.js'
import { scanBarcodeFromImage, buildBarcodeConfirmation } from '#root/bot/utils/data/barcode-handler.util.js'
import { PhotoHandler } from '#root/bot/utils/core/photo-handler.util.js'
import { DuplicateChecker } from '#root/bot/utils/data/duplicate-checker.util.js'
import { MessageTracker } from '#root/bot/utils/ui/message-tracker.util.js'

// ✅ Utils خاصة بالمخازن - من مستوى الـ feature
import { clearInventorySession, isWarehouse, isAction, isStep } from '#root/bot/utils/core/session-manager.util.js'

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



// ⚡ Handle back navigation
addItemHandler.callbackQuery('nav:back', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⬅️ رجوع للخطوة السابقة' })
  
  // Simply show the start screen again for now
  // TODO: Implement full navigation history later
  await AddItemConversation.start(ctx)
})

// Cancel flow - clear session
// ✅ استخدام clearInventorySession و buildActionButtons
addItemHandler.callbackQuery('og:items:menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  // ✅ استخدام clearInventorySession بدلاً من الكود اليدوي
  clearInventorySession(ctx)
  
  // ✅ استخدام buildActionButtons
  const keyboard = buildActionButtons([
    { text: '➕ إضافة صنف جديد', callback: 'og:items:add:start' },
    { text: '🔍 البحث عن صنف', callback: 'og:items:search' },
    { text: '📊 عرض جميع الأصناف', callback: 'og:items:list' },
  ])
  addBackButton(keyboard, 'menu:sub:inventory-management:oils_greases', '⬅️ رجوع')

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

// ⚡ Edit handlers - Handle field edit requests
addItemHandler.callbackQuery(/^og:items:add:edit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '✏️ جاري فتح التعديل...' })
  const field = ctx.match![1]
  
  // Map field to target step
  const fieldStepMapping: Record<string, string> = {
    'barcode': 'awaiting_barcode',
    'nameAr': 'awaiting_name_ar',
    'nameEn': 'awaiting_name_en',
    'category': 'awaiting_category',
    'location': 'awaiting_location',
    'unit': 'awaiting_unit',
    'capacity': 'awaiting_capacity',
    'quantity': 'awaiting_quantity',
    'minQuantity': 'awaiting_min_quantity',
    'price': 'awaiting_price',
    'supplier': 'awaiting_supplier',
    'notes': 'awaiting_notes',
  }
  
  const targetStep = fieldStepMapping[field]
  if (!targetStep) {
    await ctx.reply('❌ حقل غير معروف')
    return
  }
  
  // Set edit mode using utility
  if (!ctx.session.inventoryForm) {
    await ctx.reply('❌ جلسة غير صالحة')
    return
  }
  
  EditModeHandler.startEdit(ctx, field, targetStep, 'awaiting_final_review')
  
  // Send prompt based on field
  const prompts: Record<string, string> = {
    'barcode': '🔢 **أدخل الباركود الجديد:**',
    'nameAr': '📝 **أدخل الاسم الجديد بالعربية:**',
    'nameEn': '🔤 **أدخل الاسم الجديد بالإنجليزية:**',
    'quantity': '📦 **أدخل الكمية الجديدة:**',
    'minQuantity': '📊 **أدخل الحد الأدنى الجديد:**',
    'price': '💰 **أدخل السعر الجديد:**',
    'supplier': '🏭 **أدخل اسم المورد الجديد:**',
    'notes': '📝 **أدخل الملاحظات الجديدة:**',
  }
  
  const promptText = prompts[field]
  if (promptText) {
    await ctx.reply(promptText, { parse_mode: 'Markdown' })
  } else if (field === 'category') {
    // Show category selection (will need to handle edit mode inside)
    await AddItemConversation.showCategorySelection(ctx)
  } else if (field === 'location') {
    // Re-select category to show locations
    const categoryId = ctx.session.inventoryForm.data.categoryId
    if (categoryId) {
      await AddItemConversation.selectCategory(ctx, categoryId)
    }
  } else if (field === 'unit' || field === 'capacity') {
    // Re-select location to show units
    const locationId = ctx.session.inventoryForm.data.locationId
    if (locationId) {
      await AddItemConversation.selectLocation(ctx, locationId)
    }
  }
})

// Edit menu button - just shows the edit options again
addItemHandler.callbackQuery('og:items:add:edit_menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  // The edit menu is already shown, no action needed
})

// Photo handler for barcode scanning AND product images
// ✅ استخدام isWarehouse
addItemHandler.on('message:photo', async (ctx, next) => {
  // ✅ استخدام isWarehouse بدلاً من التحقق اليدوي
  if (!isWarehouse(ctx, 'oils-greases')) return next()
  
  const state = ctx.session?.inventoryForm
  if (!state) return next()
  
  // Handle barcode scanning
  // ⚡ استخدام barcode handler util + DuplicateChecker
  if (isStep(ctx, 'awaiting_barcode_image')) {
    const msg1 = await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')
    
    const result = await scanBarcodeFromImage(ctx)
    
    if (!result.success) {
      await ctx.reply(result.error || '❌ لم يتم التعرف على الباركود. حاول مرة أخرى.')
      return
    }
    
    const barcode = result.barcode!
    const msg2 = await ctx.reply(buildBarcodeConfirmation(result), { parse_mode: 'Markdown' })
    
    // ⚡ استخدام DuplicateChecker للتحقق من التكرار
    const duplicateCheck = await DuplicateChecker.checkBarcode(ctx, {
      barcode,
      retryText: '📸 مسح باركود آخر',
      retryCallback: 'og:items:add:scan',
      cancelCallback: 'og:items:add:start',
    })
    
    if (duplicateCheck.isDuplicate) {
      // Clean up messages
      await ctx.api.deleteMessage(ctx.chat!.id, msg1.message_id).catch(() => {})
      await ctx.api.deleteMessage(ctx.chat!.id, msg2.message_id).catch(() => {})
      return
    }
    
    // Update session with message tracking
    const messageIds = state.messageIds || []
    messageIds.push(msg1.message_id, msg2.message_id)
    
    ctx.session.inventoryForm = {
      action: 'add',
      step: 'awaiting_name_ar',
      warehouse: 'oils-greases',
      data: { barcode },
      messageIds,
    }
    
    const keyboard = buildActionButtons([{ text: '❌ إلغاء', callback: 'og:items:menu' }])
    
    const msg3 = await ctx.reply(
      '📝 **أدخل اسم الصنف بالعربية:**\n\n'
      + '**مثال:** زيت محرك 10W-40\n\n'
      + '⏳ **في انتظار الإدخال...**',
      { reply_markup: keyboard, parse_mode: 'Markdown' },
    )
    
    messageIds.push(msg3.message_id)
    ctx.session.inventoryForm.messageIds = messageIds
    
    return
  }
  
  // Handle product images
  // ⚡ استخدام photo handler util (اختصار 54 سطر إلى 18)
  if (isStep(ctx, 'awaiting_images')) {
    const currentImages = (state.data.images as string[]) || []
    const result = await PhotoHandler.handleProductPhoto(ctx, state.data.barcode, currentImages)
    
    if (!result.success) {
      await ctx.reply(result.error || '❌ حدث خطأ أثناء حفظ الصورة')
      return
    }
    
    ctx.session.inventoryForm = {
      ...state,
      data: { ...state.data, images: result.images },
    }
    
    const keyboard = buildActionButtons([
      { text: '➕ إضافة صورة أخرى', callback: 'og:items:add:continue_images' },
      { text: '✅ إنهاء وحفظ', callback: 'og:items:add:skip_images' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])
    
    const sentMessage = await ctx.reply(
      `✅ **تم حفظ الصورة ${result.images!.length}**\n\n`
      + `📸 **إجمالي الصور:** ${result.images!.length}\n\n`
      + '**ماذا تريد أن تفعل؟**',
      { reply_markup: keyboard, parse_mode: 'Markdown' },
    )
    
    // ⚡ تتبع الرسالة لحذفها لاحقاً
    MessageTracker.track(ctx, sentMessage.message_id)
    return
  }
  
  // Handle photos in steps that expect text input
  const textOnlySteps = [
    'awaiting_name_ar',
    'awaiting_name_en',
    'awaiting_unit_capacity',
    'awaiting_quantity',
    'awaiting_min_quantity',
    'awaiting_price',
    'awaiting_supplier',
    'awaiting_notes',
  ]
  
  if (textOnlySteps.includes(state.step)) {
    console.warn(`⚠️ Photo received but unhandled step: ${state.step}`)
    
    const stepMessages: Record<string, string> = {
      awaiting_name_ar: '📝 **الرجاء إدخال نص (الاسم بالعربية)**',
      awaiting_name_en: '📝 **الرجاء إدخال نص (الاسم بالإنجليزية)**',
      awaiting_unit_capacity: '📝 **الرجاء إدخال رقم (سعة الوحدة)**',
      awaiting_quantity: '📝 **الرجاء إدخال رقم (الكمية)**',
      awaiting_min_quantity: '📝 **الرجاء إدخال رقم (الحد الأدنى)**',
      awaiting_price: '📝 **الرجاء إدخال رقم (السعر)**',
      awaiting_supplier: '📝 **الرجاء إدخال نص (اسم المورد)**',
      awaiting_notes: '📝 **الرجاء إدخال نص (الملاحظات)**',
    }
    
    await ctx.reply(
      `⚠️ **تم استلام صورة، لكن نحتاج نص!**\n\n`
      + `${stepMessages[state.step] || '📝 **الرجاء إدخال نص**'}\n\n`
      + `💡 **الصور يمكن إضافتها لاحقاً في خطوة "صور المنتج"**`,
      { parse_mode: 'Markdown' },
    )
    return
  }
  
  return next()
})

// Text handler - MUST check warehouse first
// ✅ استخدام isWarehouse و isAction
addItemHandler.on('message:text', async (ctx, next) => {
  // ✅ استخدام isWarehouse و isAction بدلاً من التحقق اليدوي
  if (!isWarehouse(ctx, 'oils-greases')) return next()
  if (!isAction(ctx, 'add')) return next()

  const text = ctx.message.text

  // ✅ استخدام map لتبسيط الكود
  const stepHandlers: Record<string, (ctx: Context, text: string) => Promise<boolean>> = {
    'awaiting_name_ar': AddItemConversation.handleNameInput,
    'awaiting_name_en': AddItemConversation.handleNameEnInput,
    'awaiting_unit_capacity': AddItemConversation.handleUnitCapacityInput,
    'awaiting_quantity': AddItemConversation.handleQuantityInput,
    'awaiting_min_quantity': AddItemConversation.handleMinQuantityInput,
    'awaiting_price': AddItemConversation.handlePriceInput,
    'awaiting_supplier': AddItemConversation.handleSupplierInput,
    'awaiting_notes': AddItemConversation.handleNotesInput,
  }

  const currentStep = ctx.session?.inventoryForm?.step
  if (currentStep && stepHandlers[currentStep]) {
    const handled = await stepHandlers[currentStep](ctx, text)
    if (handled) return
  }

  return next()
})
