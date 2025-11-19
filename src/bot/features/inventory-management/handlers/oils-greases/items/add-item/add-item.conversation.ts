/**
 * Add Item Conversation - Multi-step flow
 * ✅ Refactored to use Utils (v2.0)
 */

import type { Context } from '../../../../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { AddItemService } from './add-item.service.js'
import type { AddItemData } from './add-item.types.js'

// ✅ استخدام Utils - من المستوى العام للبوت
import { 
  validateText, 
  validateQuantity, 
  validatePrice,
  validateNumber,
} from '#root/bot/utils/validation/input-validator.util.js'
import { 
  buildActionButtons, 
  buildCategoriesKeyboard,
  addBackButton,
  buildConfirmKeyboard,
} from '#root/bot/utils/ui/keyboard-builder.util.js'
import { formatArabicCurrency } from '#root/bot/utils/formatting/arabic-formatter.util.js'
import { DetailFormatter } from '#root/bot/utils/formatting/detail-formatter.util.js'
import { UnitSelector } from '#root/bot/utils/ui/unit-selector.util.js'
import { extractCategoryId } from '#root/bot/utils/ui/category-selector.util.js'
import { MessageTracker } from '#root/bot/utils/ui/message-tracker.util.js'
import { ConversationStep } from '#root/bot/utils/ui/conversation-step.util.js'
import { EditModeHandler } from '#root/bot/utils/conversation/edit-mode-handler.util.js'
import { BarcodeGenerator } from '#root/bot/utils/data/barcode-generator.util.js'
import { DuplicateChecker } from '#root/bot/utils/data/duplicate-checker.util.js'
import { ProgressIndicator } from '#root/bot/utils/ui/progress-indicator.util.js'
import { NavigationManager } from '#root/bot/utils/core/navigation-manager.util.js'
import { SmartSuggestions } from '#root/bot/utils/data/smart-suggestions.util.js'
import { EditManager } from '#root/bot/utils/core/edit-manager.util.js'

// ✅ Utils خاصة بالمخازن - من مستوى الـ feature
import { 
  updateSessionStep, 
  updateSessionData,
  clearInventorySession,
  isStep,
} from '#root/bot/utils/core/session-manager.util.js'
import { 
  buildSuccessMessage, 
  buildErrorMessage,
} from '../../../../utils/message-builder.util.js'

export class AddItemConversation {
  // ⚡ استبدال trackMessage و deleteAllMessages بـ MessageTracker util

  /**
   * Start: Choose input method
   * ✅ Using buildActionButtons
   */
  static async start(ctx: Context) {
    const keyboard = buildActionButtons([
      { text: '📸 مسح الباركود', callback: 'og:items:add:scan' },
      { text: '✍️ إدخال يدوي', callback: 'og:items:add:manual' },
    ])
    addBackButton(keyboard, 'og:items:menu', '❌ إلغاء')

    await ctx.editMessageText(
      '➕ **إضافة صنف جديد**\n\n'
      + '📋 **اختر طريقة الإضافة:**\n\n'
      + '📸 **مسح الباركود**\n'
      + '└ استخدم الكاميرا\n\n'
      + '✍️ **إدخال يدوي**\n'
      + '└ أدخل البيانات يدوياً',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Scan barcode
   * ✅ No change needed (simple initialization)
   */
  static async scanBarcode(ctx: Context) {
    ctx.session.inventoryForm = {
      action: 'add',
      step: 'awaiting_barcode_image',
      warehouse: 'oils-greases',
      data: {},
      messageIds: ctx.callbackQuery?.message?.message_id ? [ctx.callbackQuery.message.message_id] : [],
    }

    const keyboard = buildActionButtons([
      { text: '❌ إلغاء', callback: 'og:items:add:start' },
    ])

    await ctx.editMessageText(
      '📸 **مسح الباركود**\n\n'
      + '📷 **أرسل صورة الباركود الآن**\n\n'
      + '⏳ **في انتظار الصورة...**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Manual input - generate barcode
   * ⚡ Using BarcodeGenerator (اختصار 3 أسطر + standardization)
   */
  static async manualInput(ctx: Context) {
    // ⚡ استخدام BarcodeGenerator بدلاً من توليد يدوي
    const barcode = BarcodeGenerator.generate('oils-greases')

    // Initialize session with message tracking
    if (!ctx.session.inventoryForm || !ctx.session.inventoryForm.messageIds) {
      ctx.session.inventoryForm = {
        action: 'add',
        step: 'awaiting_barcode_confirmation',
        warehouse: 'oils-greases',
        data: {},
        messageIds: ctx.callbackQuery?.message?.message_id ? [ctx.callbackQuery.message.message_id] : [],
      }
    }

    const keyboard = buildActionButtons([
      { text: '✅ استخدام هذا الباركود', callback: `og:items:add:confirm-barcode:${barcode}` },
      { text: '🔄 توليد آخر', callback: 'og:items:add:manual' },
      { text: '❌ إلغاء', callback: 'og:items:add:start' },
    ])

    await ctx.editMessageText(
      '🔢 **توليد باركود تلقائي**\n\n'
      + `✅ **الباركود:** \`${barcode}\`\n\n`
      + '**هل تريد استخدامه؟**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Confirm barcode and ask for name
   * ⚡ Using DuplicateChecker (اختصار 20 سطر)
   */
  static async confirmBarcode(ctx: Context, barcode: string) {
    // ⚡ استخدام DuplicateChecker بدلاً من الكود اليدوي
    const result = await DuplicateChecker.checkBarcode(ctx, {
      barcode,
      retryCallback: 'og:items:add:manual',
      cancelCallback: 'og:items:add:start',
    })

    if (result.isDuplicate) return // Warning shown automatically

    // ⚡ استخدام ConversationStep.prompt مع ProgressIndicator و NavigationManager
    await ConversationStep.prompt(ctx, {
      nextStep: 'awaiting_name_ar',
      data: { barcode },
      message: '✅ **الباركود:** \`' + barcode + '\`\n\n'
        + '📝 **أدخل اسم الصنف بالعربية:**\n\n'
        + '**مثال:** زيت محرك 10W-40',
      cancelCallback: 'og:items:add:start',
      showProgress: true,
      addBackButton: true,
    })
  }

  /**
   * Handle Arabic name input
   * ⚡ Using ConversationStep.prompt (اختصار 12 أسطر)
   * ✏️ Supports edit mode
   */
  static async handleNameInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_name_ar')) return false

    // ✅ استخدام validator بدلاً من التحقق اليدوي
    const validation = validateText(text, { minLength: 2 })
    if (!validation.valid) {
      await ctx.reply(validation.error!)
      return true
    }

    // Update data
    updateSessionStep(ctx, 'awaiting_name_en', { nameAr: validation.value })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'الاسم بالعربية', AddItemConversation.showFinalReview)) {
      return true
    }

    // ⚡ استخدام ConversationStep.prompt بدلاً من الكود اليدوي
    await ConversationStep.prompt(ctx, {
      nextStep: 'awaiting_name_en',
      data: { nameAr: validation.value },
      message: buildSuccessMessage('حفظ الاسم بالعربية')
        + '\n\n🔤 **أدخل الاسم بالإنجليزية (اختياري):**\n\n'
        + '**مثال:** Engine Oil 10W-40',
      skipCallback: 'og:items:add:skip_name_en',
      cancelCallback: 'og:items:menu',
      showProgress: true,
      addBackButton: true,
    })
    
    return true
  }

  /**
   * Handle English name input
   */
  static async handleNameEnInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_name_en')) return false

    await AddItemConversation.showCategorySelection(ctx, text)
    return true
  }

  /**
   * Skip English name
   */
  static async skipNameEn(ctx: Context) {
    await AddItemConversation.showCategorySelection(ctx)
  }

  /**
   * Show category selection
   * ✅ Using buildCategoriesKeyboard and updateSessionStep
   */
  static async showCategorySelection(ctx: Context, nameEn?: string) {
    const state = ctx.session.inventoryForm
    if (!state) return

    const categories = await Database.prisma.iNV_Category.findMany({
      where: { 
        isActive: true,
        warehouseType: 'oils-greases',
      },
      orderBy: { displayOrder: 'asc' },
    })

    if (categories.length === 0) {
      await ctx.reply(buildErrorMessage('عرض الفئات', 'لا توجد فئات متاحة'))
      clearInventorySession(ctx)
      return
    }

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_category', { nameEn })

    // ✅ استخدام buildCategoriesKeyboard
    const keyboard = buildCategoriesKeyboard(categories, 'og:items:add:select_category', { itemsPerRow: 1 })
    addBackButton(keyboard, 'og:items:menu', '❌ إلغاء')

    // ⚡ إضافة SmartSuggestions
    const itemName = state.data.nameAr || state.data.nameEn
    let message = nameEn
      ? buildSuccessMessage('حفظ الاسم بالإنجليزية')
        + '\n\n🛢️ **اختر نوع الزيت/الشحم:**\n\n💡 *سيتم توليد الكود تلقائياً*'
      : '⏭️ **تم تخطي الاسم الإنجليزي**\n\n🛢️ **اختر نوع الزيت/الشحم:**\n\n💡 *سيتم توليد الكود تلقائياً*'
    
    // ⚡ إضافة اقتراحات ذكية للفئة
    if (itemName) {
      try {
        const suggestions = await SmartSuggestions.suggestCategory(itemName, 'oils-greases')
        console.log('🔍 Smart Suggestions:', { itemName, count: suggestions.length, suggestions })
        if (suggestions.length > 0 && suggestions[0].confidence > 0.6) {
          const topSuggestion = suggestions[0]
          message += `\n\n💡 **اقتراح:** ${topSuggestion.value.nameAr}`
          message += `\n📊 **الثقة:** ${Math.round(topSuggestion.confidence * 100)}%`
          message += `\n✅ ${topSuggestion.reason}`
        }
      } catch (error) {
        console.error('❌ SmartSuggestions error:', error)
      }
    }

    const sentMessage = await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    
    MessageTracker.track(ctx, sentMessage.message_id)
  }

  /**
   * Handle category selection
   * ✅ Using updateSessionStep and buildCategoriesKeyboard for locations
   * ✏️ Supports edit mode
   */
  static async selectCategory(ctx: Context, categoryId: number) {
    if (!isStep(ctx, 'awaiting_category')) return

    const category = await Database.prisma.iNV_Category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      await ctx.answerCallbackQuery({ text: '❌ الفئة غير موجودة', show_alert: true })
      return
    }

    const code = await AddItemService.generateCode(categoryId)

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_location', { categoryId, code, categoryName: category.nameAr })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.completeEdit(ctx, 'الفئة', AddItemConversation.showFinalReview)) {
      return
    }

    const locations = await Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    if (locations.length === 0) {
      await ctx.reply(buildErrorMessage('عرض المواقع', 'لا توجد مواقع تخزين'))
      clearInventorySession(ctx)
      return
    }

    // ✅ استخدام keyboard builder مُبسط
    const keyboard = buildActionButtons(
      locations.map(loc => ({
        text: `📍 ${loc.nameAr}`,
        callback: `og:items:add:select_location:${loc.id}`
      })),
      1 // one per row
    )
    addBackButton(keyboard, 'og:items:menu', '❌ إلغاء')

    // ⚡ إضافة مؤشر التقدم
    const progress = ProgressIndicator.addItemFlow('awaiting_location')
    
    await ctx.editMessageText(
      progress + '\n\n'
      + `✅ **النوع:** ${category.nameAr}\n`
      + `🔢 **الكود:** \`${code}\`\n\n`
      + '📍 **اختر موقع التخزين:**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle location selection
   * ⚡ Using updateSessionStep and UnitSelector.buildUnitKeyboard (اختصار 7 أسطر)
   * ✏️ Supports edit mode
   */
  static async selectLocation(ctx: Context, locationId: number) {
    if (!isStep(ctx, 'awaiting_location')) return

    // Get location name for storage
    const location = await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: locationId },
    })

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_unit', { locationId, locationName: location?.nameAr })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.completeEdit(ctx, 'الموقع', AddItemConversation.showFinalReview)) {
      return
    }

    // ⚡ استخدام UnitSelector بدلاً من buildActionButtons يدوياً
    const keyboard = UnitSelector.buildUnitKeyboard('og:items:add:select_unit', 'volume', 2)
    addBackButton(keyboard, 'og:items:menu', '❌ إلغاء')

    // ⚡ إضافة مؤشر التقدم
    const progress = ProgressIndicator.addItemFlow('awaiting_unit')

    await ctx.editMessageText(
      progress + '\n\n'
      + '📦 **اختر نوع الوحدة:**\n\n'
      + '🛢️ **لتر** - للكميات الصغيرة\n'
      + '🪣 **جالون** - 4 لتر\n'
      + '🛢️ **برميل** - 200 لتر\n'
      + '📦 **كرتونة** - عدة عبوات\n'
      + '🧴 **عبوة** - عبوة واحدة',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle unit selection
   * ✅ Using updateSessionStep
   */
  static async selectUnit(ctx: Context, unit: string) {
    if (!isStep(ctx, 'awaiting_unit')) return

    const state = ctx.session.inventoryForm
    if (!state) return

    // ✏️ Handle edit mode using utility (update data first)
    if (state.editMode) {
      state.data.unit = unit
      if (await EditModeHandler.completeEdit(ctx, 'الوحدة', AddItemConversation.showFinalReview)) {
        return
      }
    }

    // If unit is جالون or برميل, ask for capacity
    if (unit === 'جالون' || unit === 'برميل') {
      updateSessionStep(ctx, 'awaiting_unit_capacity', { unit })

      const defaultCapacity = unit === 'جالون' ? 20 : 200
      const keyboard = buildActionButtons([
        { text: `✅ استخدام ${defaultCapacity} لتر`, callback: `og:items:add:confirm_capacity:${defaultCapacity}` },
        { text: '❌ إلغاء', callback: 'og:items:menu' },
      ])

      // ⚡ إضافة مؤشر التقدم
      const progress = ProgressIndicator.addItemFlow('awaiting_capacity')

      await ctx.editMessageText(
        progress + '\n\n'
        + `✅ **الوحدة:** ${unit}\n\n`
        + '📦 **أدخل سعة الوحدة (باللتر):**\n\n'
        + `**مثال:** ${defaultCapacity}\n\n`
        + `💡 *الافتراضي: ${defaultCapacity} لتر*`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
    else {
      // For other units, go directly to quantity
      updateSessionStep(ctx, 'awaiting_quantity', { unit, unitCapacity: null })

      const keyboard = buildActionButtons([
        { text: '❌ إلغاء', callback: 'og:items:menu' },
      ])

      // ⚡ إضافة مؤشر التقدم
      const progress = ProgressIndicator.addItemFlow('awaiting_quantity')

      await ctx.editMessageText(
        progress + '\n\n'
        + `✅ **الوحدة:** ${unit}\n\n`
        + '📦 **أدخل الكمية:**\n\n'
        + '**مثال:** 50\n\n'
        + '⏳ **في انتظار الإدخال...**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
  }

  /**
   * Handle unit capacity input
   * ✅ Using validateNumber and updateSessionStep
   */
  static async handleUnitCapacityInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_unit_capacity')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    // ✅ استخدام validator
    const validation = validateNumber(text, { min: 0.01 })
    if (!validation.valid) {
      await ctx.reply(validation.error!)
      return true
    }

    const capacity = validation.value!
    
    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_quantity', { unitCapacity: capacity })

    const keyboard = buildActionButtons([
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    const sentMessage = await ctx.reply(
      `✅ **سعة ${state.data.unit}:** ${capacity} لتر\n\n`
      + '📦 **أدخل الكمية:**\n\n'
      + '**مثال:** 50\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Confirm default capacity
   * ✅ Using updateSessionStep
   */
  static async confirmCapacity(ctx: Context, capacity: number) {
    if (!isStep(ctx, 'awaiting_unit_capacity')) return

    const state = ctx.session.inventoryForm
    if (!state) return

    updateSessionStep(ctx, 'awaiting_quantity', { unitCapacity: capacity })

    const keyboard = buildActionButtons([
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    await ctx.editMessageText(
      `✅ **سعة ${state.data.unit}:** ${capacity} لتر\n\n`
      + '📦 **أدخل الكمية:**\n\n'
      + '**مثال:** 50\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle quantity input
   * ✅ Using validateQuantity and updateSessionStep
   */
  static async handleQuantityInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_quantity')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    // ✅ استخدام validateQuantity
    const validation = validateQuantity(text)
    if (!validation.valid) {
      await ctx.reply(validation.error!)
      return true
    }

    const quantity = validation.value!

    // للبرميل: نحسب السعة الإجمالية باللتر
    const totalLiters = (state.data.unit === 'برميل' && state.data.unitCapacity) 
      ? quantity * state.data.unitCapacity 
      : null
    
    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_min_quantity', { quantity, totalLiters })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'الكمية', AddItemConversation.showFinalReview)) {
      return true
    }

    const keyboard = buildActionButtons([
      { text: '⏭️ تخطي', callback: 'og:items:add:skip_min_quantity' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    let message = `✅ **الكمية:** ${quantity} ${state.data.unit}\n`
    if (totalLiters) {
      message += `📦 **السعة الإجمالية:** ${totalLiters} لتر\n`
    }
    if (state.data.unitCapacity && state.data.unit === 'جالون') {
      message += `💡 *سعة الجالون: ${state.data.unitCapacity} لتر*\n`
    }
    message += '\n📊 **أدخل الحد الأدنى للكمية:**\n\n'
    message += '**مثال:** 10\n\n'
    message += '💡 *سيتم تنبيهك عند الوصول لهذا الحد*'
    
    const sentMessage = await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Handle min quantity input
   * ✅ Using validateNumber and updateSessionStep
   * ✏️ Supports edit mode
   */
  static async handleMinQuantityInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_min_quantity')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    // ✅ استخدام validator
    const validation = validateNumber(text, { min: 0 })
    if (!validation.valid) {
      await ctx.reply(validation.error!)
      return true
    }

    const minQuantity = validation.value!

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_price', { minQuantity })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'الحد الأدنى', AddItemConversation.showFinalReview)) {
      return true
    }

    const keyboard = buildActionButtons([
      { text: '⏭️ تخطي', callback: 'og:items:add:skip_price' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    const sentMessage = await ctx.reply(
      `✅ **الحد الأدنى:** ${minQuantity} ${state.data.unit}\n\n`
      + '💰 **أدخل سعر الوحدة (اختياري):**\n\n'
      + '**مثال:** 150.50',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Skip min quantity
   * ✅ Using updateSessionStep
   */
  static async skipMinQuantity(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    updateSessionStep(ctx, 'awaiting_price', { minQuantity: 5 })

    const keyboard = buildActionButtons([
      { text: '⏭️ تخطي', callback: 'og:items:add:skip_price' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    await ctx.editMessageText(
      '⏭️ **تم تعيين الحد الأدنى: 5**\n\n'
      + '💰 **أدخل سعر الوحدة (اختياري):**\n\n'
      + '**مثال:** 150.50',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle price input
   * ✅ Using validatePrice, formatArabicCurrency, updateSessionStep
   */
  static async handlePriceInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_price')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    // ✅ استخدام validatePrice
    const validation = validatePrice(text)
    if (!validation.valid) {
      await ctx.reply(validation.error!)
      return true
    }

    const unitPrice = validation.value!

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_supplier', { unitPrice })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'السعر', AddItemConversation.showFinalReview)) {
      return true
    }

    const keyboard = buildActionButtons([
      { text: '⏭️ تخطي', callback: 'og:items:add:skip_supplier' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    const sentMessage = await ctx.reply(
      // ✅ استخدام formatArabicCurrency
      `✅ **السعر:** ${formatArabicCurrency(unitPrice)}\n\n`
      + '🏭 **أدخل اسم المورد (اختياري):**\n\n'
      + '**مثال:** شركة الزيوت المتحدة',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Handle supplier input
   * ✅ Using updateSessionStep
   */
  static async handleSupplierInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_supplier')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    // ✅ استخدام updateSessionStep
    updateSessionStep(ctx, 'awaiting_notes', { supplierName: text })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'المورد', AddItemConversation.showFinalReview)) {
      return false
    }

    const keyboard = buildActionButtons([
      { text: '⏭️ تخطي', callback: 'og:items:add:skip_notes' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    const sentMessage = await ctx.reply(
      `✅ **المورد:** ${text}\n\n`
      + '📝 **أدخل ملاحظات إضافية (اختياري):**\n\n'
      + '✅ رقم الموديل\n'
      + '✅ الشركة المصنعة\n'
      + '✅ أي معلومات أخرى',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Handle notes input
   * ✅ Using updateSessionStep
   */
  static async handleNotesInput(ctx: Context, text: string) {
    if (!isStep(ctx, 'awaiting_notes')) return false

    const state = ctx.session.inventoryForm
    if (!state) return false

    updateSessionStep(ctx, 'awaiting_images', { notes: text })
    
    // ✏️ Handle edit mode using utility
    if (await EditModeHandler.handleIfEditMode(ctx, 'الملاحظات', AddItemConversation.showFinalReview)) {
      return false
    }

    const keyboard = buildActionButtons([
      { text: '✅ إنهاء وحفظ', callback: 'og:items:add:skip_images' },
      { text: '❌ إلغاء', callback: 'og:items:menu' },
    ])

    const sentMessage = await ctx.reply(
      buildSuccessMessage('حفظ الملاحظات')
      + '\n\n📸 **أرسل صور المنتج (اختياري):**\n\n'
      + '📷 يمكنك إرسال صورة أو أكثر',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
    
    MessageTracker.track(ctx, sentMessage.message_id)
    return true
  }

  /**
   * Skip price
   * ⚡ Using ConversationStep.skip (اختصار 16 أسطر)
   */
  static async skipPrice(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    // ⚡ استخدام ConversationStep.skip بدلاً من الكود اليدوي
    await ConversationStep.skip(ctx, {
      skippedField: 'السعر',
      nextStep: 'awaiting_supplier',
      nextPrompt: '🏭 **أدخل اسم المورد (اختياري):**\n\n**مثال:** شركة الزيوت المتحدة',
      skipCallback: 'og:items:add:skip_supplier',
      cancelCallback: 'og:items:menu',
      defaultValue: 0,
      valueKey: 'unitPrice',
    })
  }

  /**
   * Skip supplier
   * ⚡ Using ConversationStep.skip (اختصار 18 أسطر)
   */
  static async skipSupplier(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    // ⚡ استخدام ConversationStep.skip بدلاً من الكود اليدوي
    await ConversationStep.skip(ctx, {
      skippedField: 'المورد',
      nextStep: 'awaiting_notes',
      nextPrompt: '📝 **أدخل ملاحظات إضافية (اختياري):**\n\n'
        + '✅ رقم الموديل\n'
        + '✅ الشركة المصنعة\n'
        + '✅ أي معلومات أخرى',
      skipCallback: 'og:items:add:skip_notes',
      cancelCallback: 'og:items:menu',
    })
  }

  /**
   * Skip notes
   * ⚡ Using ConversationStep.skip (اختصار 16 أسطر)
   */
  static async skipNotes(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    // ⚡ استخدام ConversationStep.skip بدلاً من الكود اليدوي
    await ConversationStep.skip(ctx, {
      skippedField: 'الملاحظات',
      nextStep: 'awaiting_images',
      nextPrompt: '📸 **أرسل صور المنتج (اختياري):**\n\n📷 يمكنك إرسال صورة أو أكثر',
      skipCallback: 'og:items:add:skip_images',
      skipText: '✅ إنهاء وحفظ',
      cancelCallback: 'og:items:menu',
    })
  }

  /**
   * Skip images and save
   */
  static async skipImages(ctx: Context) {
    await AddItemConversation.showFinalReview(ctx)
  }

  /**
   * Show final review
   * ✅ Using formatArabicCurrency and buildConfirmKeyboard
   */
  static async showFinalReview(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    const data = state.data as AddItemData
    const [category, location] = await Promise.all([
      Database.prisma.iNV_Category.findUnique({ where: { id: data.categoryId } }),
      data.locationId ? Database.prisma.iNV_StorageLocation.findUnique({ where: { id: data.locationId } }) : null,
    ])

    const totalValue = data.quantity * data.unitPrice
    const imagesCount = (data.images || []).length

    let message = '📋 **مراجعة نهائية شاملة**\n\n'
    message += '═══════════════════\n\n'
    
    message += '📝 **معلومات أساسية:**\n\n'
    message += `• الباركود: \`${data.barcode}\`\n`
    message += `• الكود: \`${data.code}\`\n`
    message += `• الاسم (عربي): ${data.nameAr}\n`
    if (data.nameEn) message += `• الاسم (إنجليزي): ${data.nameEn}\n`
    message += '\n'
    
    message += '🏷️ **التصنيف والموقع:**\n\n'
    message += `• الفئة: ${category?.nameAr || 'غير محدد'}\n`
    message += `• الموقع: ${location?.nameAr || 'غير محدد'}\n`
    message += '\n'
    
    message += '📦 **الكميات:**\n\n'
    message += `• الوحدة: ${data.unit}\n`
    if (data.unitCapacity && data.unitCapacity > 1) {
      message += `• سعة الوحدة: ${data.unitCapacity} لتر\n`
    }
    message += `• الكمية: ${data.quantity} ${data.unit}\n`
    if (data.totalLiters && data.totalLiters > data.quantity) {
      message += `• السعة الإجمالية: ${data.totalLiters} لتر\n`
    }
    message += `• الحد الأدنى: ${data.minQuantity || 5} ${data.unit}\n`
    message += '\n'
    
    message += '💰 **الأسعار:**\n\n'
    // ✅ استخدام formatArabicCurrency
    message += `• سعر الوحدة: ${formatArabicCurrency(data.unitPrice)}\n`
    message += `• القيمة الإجمالية: ${formatArabicCurrency(totalValue)}\n`
    message += '\n'
    
    if (data.supplierName) {
      message += '🏭 **معلومات المورد:**\n\n'
      message += `• المورد: ${data.supplierName}\n`
      message += '\n'
    }
    
    if (imagesCount > 0) {
      message += `📸 **الصور:** ${imagesCount} صورة\n\n`
    }
    
    if (data.notes) {
      message += `📝 **ملاحظات:**\n${data.notes}\n\n`
    }
    
    message += '═══════════════════\n\n'
    message += '**هل تريد تأكيد الحفظ？**'

    // ⚡ استخدام EditManager لإضافة قائمة التعديل
    const keyboard = EditManager.buildAddItemEditMenu(data, 'og:items:add')
    
    // إضافة أزرار التأكيد والإلغاء
    keyboard.row(
      { text: '✅ تأكيد الحفظ', callback_data: 'og:items:add:confirm_save' }
    )
    keyboard.row(
      { text: '✏️ تعديل بيان', callback_data: 'og:items:add:edit_menu' }
    )
    keyboard.row(
      { text: '❌ إلغاء', callback_data: 'og:items:menu' }
    )

    const sentMessage = await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    
    MessageTracker.track(ctx, sentMessage.message_id)
  }

  /**
   * Confirm and save
   * ✅ Using buildSuccessMessage, formatArabicCurrency, clearInventorySession
   */
  static async confirmSave(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state) return

    const data = state.data as AddItemData

    try {
      const item = await AddItemService.saveItem(data, BigInt(ctx.from!.id))

      const [category, location] = await Promise.all([
        Database.prisma.iNV_Category.findUnique({ where: { id: data.categoryId } }),
        data.locationId ? Database.prisma.iNV_StorageLocation.findUnique({ where: { id: data.locationId } }) : null,
      ])

      // ⚡ استخدام MessageTracker.deleteAll بدلاً من deleteAllMessages
      await MessageTracker.deleteAll(ctx)
      
      // ✅ استخدام clearInventorySession
      clearInventorySession(ctx)

      AddItemService.sendReportToAdmins(ctx, item, category, location).catch(console.error)

      // ⚡ استخدام DetailFormatter.formatItemDetails (اختصار 45 سطر إلى 8)
      const itemWithRelations = {
        ...item,
        category,
        location,
      }

      let message = buildSuccessMessage('حفظ الصنف') + '\n\n'
      message += DetailFormatter.formatItemDetails(itemWithRelations, {
        showHeader: false,
        showWarnings: false,
        showTimestamps: false,
      })
      
      // إضافة معلومات الصور إذا وجدت
      const imagesCount = (data.images || []).length
      if (imagesCount > 0) {
        message += `\n📸 **الصور:** ${imagesCount} صورة\n`
      }
      
      message += '\n═══════════════════\n'
      message += '📨 **تم إرسال تقرير للمسؤولين**'

      // ✅ استخدام buildActionButtons
      const keyboard = buildActionButtons([
        { text: '➕ إضافة صنف آخر', callback: 'og:items:add:start' },
        { text: '⬅️ القائمة الرئيسية', callback: 'og:items:menu' },
      ])

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
    }
    catch (error) {
      console.error('Error saving item:', error)
      await MessageTracker.deleteAll(ctx)
      // ✅ استخدام buildErrorMessage
      await ctx.reply(buildErrorMessage('الحفظ'))
      clearInventorySession(ctx)
    }
  }
}
