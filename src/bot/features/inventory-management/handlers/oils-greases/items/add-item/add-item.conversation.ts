/**
 * Add Item Conversation - Multi-step flow
 */

import type { Context } from '../../../../../../context.js'
import { InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { AddItemService } from './add-item.service.js'
import type { AddItemData } from './add-item.types.js'

export class AddItemConversation {
  /**
   * Start: Choose input method
   */
  static async start(ctx: Context) {
    const keyboard = new InlineKeyboard()
      .text('📸 مسح الباركود', 'og:items:add:scan')
      .row()
      .text('✍️ إدخال يدوي', 'og:items:add:manual')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

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
   */
  static async scanBarcode(ctx: Context) {
    ctx.session.inventoryForm = {
      action: 'add',
      step: 'awaiting_barcode_image',
      warehouse: 'oils-greases',
      data: {},
    }

    const keyboard = new InlineKeyboard().text('❌ إلغاء', 'og:items:add:start')

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
   */
  static async manualInput(ctx: Context) {
    const barcode = `628${Date.now().toString().slice(-10)}`

    const keyboard = new InlineKeyboard()
      .text('✅ استخدام هذا الباركود', `og:items:add:confirm-barcode:${barcode}`)
      .row()
      .text('🔄 توليد آخر', 'og:items:add:manual')
      .row()
      .text('❌ إلغاء', 'og:items:add:start')

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
   */
  static async confirmBarcode(ctx: Context, barcode: string) {
    // Check duplicate
    const existing = await AddItemService.checkBarcodeExists(barcode)

    if (existing) {
      await ctx.editMessageText(
        '⚠️ **يوجد صنف بهذا الباركود**\n\n'
        + `📝 **الاسم:** ${existing.nameAr}\n`
        + `🔢 **الكود:** \`${existing.code}\`\n`
        + `📦 **الكمية:** ${existing.quantity} ${existing.unit}`,
        {
          reply_markup: new InlineKeyboard()
            .text('🔄 توليد باركود آخر', 'og:items:add:manual')
            .row()
            .text('❌ إلغاء', 'og:items:add:start'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    ctx.session.inventoryForm = {
      action: 'add',
      step: 'awaiting_name_ar',
      warehouse: 'oils-greases',
      data: { barcode },
    }

    await ctx.editMessageText(
      '✅ **الباركود:** \`' + barcode + '\`\n\n'
      + '📝 **أدخل اسم الصنف بالعربية:**\n\n'
      + '**مثال:** زيت محرك 10W-40\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:add:start'),
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle Arabic name input
   */
  static async handleNameInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_name_ar')
      return false

    if (!text || text.length < 2) {
      await ctx.reply('❌ الرجاء إدخال اسم صحيح (حرفين على الأقل)')
      return true
    }

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_name_en',
      warehouse: 'oils-greases',
      data: { ...state.data, nameAr: text },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_name_en')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(
      '✅ تم حفظ الاسم بالعربية\n\n'
      + '🔤 **أدخل الاسم بالإنجليزية (اختياري):**\n\n'
      + '**مثال:** Engine Oil 10W-40',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Handle English name input
   */
  static async handleNameEnInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_name_en')
      return false

    await this.showCategorySelection(ctx, text)
    return true
  }

  /**
   * Skip English name
   */
  static async skipNameEn(ctx: Context) {
    await this.showCategorySelection(ctx)
  }

  /**
   * Show category selection
   */
  static async showCategorySelection(ctx: Context, nameEn?: string) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    const categories = await Database.prisma.iNV_OilsGreasesCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    if (categories.length === 0) {
      await ctx.reply('❌ لا توجد فئات متاحة')
      ctx.session.inventoryForm = undefined
      return
    }

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_category',
      warehouse: 'oils-greases',
      data: { ...state.data, nameEn },
    }

    const keyboard = new InlineKeyboard()
    for (const cat of categories) {
      keyboard.text(cat.nameAr, `og:items:add:select_category:${cat.id}`).row()
    }
    keyboard.text('❌ إلغاء', 'og:items:menu')

    const message = nameEn
      ? `✅ تم حفظ الاسم بالإنجليزية\n\n🛢️ **اختر نوع الزيت/الشحم:**\n\n💡 *سيتم توليد الكود تلقائياً*`
      : `⏭️ تم تخطي الاسم الإنجليزي\n\n🛢️ **اختر نوع الزيت/الشحم:**\n\n💡 *سيتم توليد الكود تلقائياً*`

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }

  /**
   * Handle category selection
   */
  static async selectCategory(ctx: Context, categoryId: number) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_category')
      return

    const category = await Database.prisma.iNV_OilsGreasesCategory.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      await ctx.answerCallbackQuery({ text: '❌ الفئة غير موجودة', show_alert: true })
      return
    }

    const code = await AddItemService.generateCode(categoryId)

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_location',
      warehouse: 'oils-greases',
      data: {
        ...state.data,
        categoryId,
        code,
      },
    }

    const locations = await Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    if (locations.length === 0) {
      await ctx.reply('❌ لا توجد مواقع تخزين')
      ctx.session.inventoryForm = undefined
      return
    }

    const keyboard = new InlineKeyboard()
    for (const loc of locations) {
      keyboard.text(`📍 ${loc.nameAr}`, `og:items:add:select_location:${loc.id}`).row()
    }
    keyboard.text('❌ إلغاء', 'og:items:menu')

    await ctx.editMessageText(
      `✅ **النوع:** ${category.nameAr}\n`
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
   */
  static async selectLocation(ctx: Context, locationId: number) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_location')
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_unit',
      warehouse: 'oils-greases',
      data: { ...state.data, locationId },
    }

    const keyboard = new InlineKeyboard()
      .text('🛢️ لتر', 'og:items:add:select_unit:لتر')
      .text('🪣 جالون', 'og:items:add:select_unit:جالون')
      .row()
      .text('🛢️ برميل', 'og:items:add:select_unit:برميل')
      .text('📦 كرتونة', 'og:items:add:select_unit:كرتونة')
      .row()
      .text('🧴 عبوة', 'og:items:add:select_unit:عبوة')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.editMessageText(
      '📦 **اختر نوع الوحدة:**\n\n'
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
   */
  static async selectUnit(ctx: Context, unit: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_unit')
      return

    // If unit is جالون or برميل, ask for capacity
    if (unit === 'جالون' || unit === 'برميل') {
      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_unit_capacity',
        warehouse: 'oils-greases',
        data: { ...state.data, unit },
      }

      const defaultCapacity = unit === 'جالون' ? 20 : 200
      const keyboard = new InlineKeyboard()
        .text(`✅ استخدام ${defaultCapacity} لتر`, `og:items:add:confirm_capacity:${defaultCapacity}`)
        .row()
        .text('❌ إلغاء', 'og:items:menu')

      await ctx.editMessageText(
        `✅ **الوحدة:** ${unit}\n\n`
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
      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_quantity',
        warehouse: 'oils-greases',
        data: { ...state.data, unit, unitCapacity: null },
      }

      await ctx.editMessageText(
        `✅ **الوحدة:** ${unit}\n\n`
        + '📦 **أدخل الكمية:**\n\n'
        + '**مثال:** 50\n\n'
        + '⏳ **في انتظار الإدخال...**',
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:menu'),
          parse_mode: 'Markdown',
        },
      )
    }
  }

  /**
   * Handle unit capacity input
   */
  static async handleUnitCapacityInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_unit_capacity')
      return false

    const capacity = Number.parseFloat(text)

    if (Number.isNaN(capacity) || capacity <= 0) {
      await ctx.reply('❌ السعة غير صحيحة')
      return true
    }

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_quantity',
      warehouse: 'oils-greases',
      data: { ...state.data, unitCapacity: capacity },
    }

    await ctx.reply(
      `✅ **سعة ${state.data.unit}:** ${capacity} لتر\n\n`
      + '📦 **أدخل الكمية:**\n\n'
      + '**مثال:** 50\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:menu'),
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Confirm default capacity
   */
  static async confirmCapacity(ctx: Context, capacity: number) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_unit_capacity')
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_quantity',
      warehouse: 'oils-greases',
      data: { ...state.data, unitCapacity: capacity },
    }

    await ctx.editMessageText(
      `✅ **سعة ${state.data.unit}:** ${capacity} لتر\n\n`
      + '📦 **أدخل الكمية:**\n\n'
      + '**مثال:** 50\n\n'
      + '⏳ **في انتظار الإدخال...**',
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Handle quantity input
   */
  static async handleQuantityInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_quantity')
      return false

    const quantity = Number.parseFloat(text)

    if (Number.isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ الكمية غير صحيحة')
      return true
    }

    // للبرميل: نحسب السعة الإجمالية باللتر
    const totalLiters = (state.data.unit === 'برميل' && state.data.unitCapacity) 
      ? quantity * state.data.unitCapacity 
      : null
    
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_min_quantity',
      warehouse: 'oils-greases',
      data: { ...state.data, quantity, totalLiters },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_min_quantity')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

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
    
    await ctx.reply(
      message,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Handle min quantity input
   */
  static async handleMinQuantityInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_min_quantity')
      return false

    const minQuantity = Number.parseFloat(text)

    if (Number.isNaN(minQuantity) || minQuantity < 0) {
      await ctx.reply('❌ الحد الأدنى غير صحيح')
      return true
    }

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_price',
      warehouse: 'oils-greases',
      data: { ...state.data, minQuantity },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_price')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(
      `✅ **الحد الأدنى:** ${minQuantity} ${state.data.unit}\n\n`
      + '💰 **أدخل سعر الوحدة (اختياري):**\n\n'
      + '**مثال:** 150.50',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Skip min quantity
   */
  static async skipMinQuantity(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_price',
      warehouse: 'oils-greases',
      data: { ...state.data, minQuantity: 5 },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_price')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

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
   */
  static async handlePriceInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_price')
      return false

    const unitPrice = Number.parseFloat(text)

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      await ctx.reply('❌ السعر غير صحيح')
      return true
    }

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_supplier',
      warehouse: 'oils-greases',
      data: { ...state.data, unitPrice },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_supplier')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(
      `✅ **السعر:** ${unitPrice.toFixed(2)} جنيه\n\n`
      + '🏭 **أدخل اسم المورد (اختياري):**\n\n'
      + '**مثال:** شركة الزيوت المتحدة',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Handle notes input
   */
  static async handleNotesInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_notes')
      return false

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_images',
      warehouse: 'oils-greases',
      data: { ...state.data, notes: text },
    }

    const keyboard = new InlineKeyboard()
      .text('✅ إنهاء وحفظ', 'og:items:add:skip_images')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(
      '✅ **تم حفظ الملاحظات**\n\n'
      + '📸 **أرسل صور المنتج (اختياري):**\n\n'
      + '📷 يمكنك إرسال صورة أو أكثر',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )

    return true
  }

  /**
   * Handle supplier input
   */
  static async handleSupplierInput(ctx: Context, text: string) {
    const state = ctx.session.inventoryForm
    if (!state || state.step !== 'awaiting_supplier')
      return false

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_notes',
      warehouse: 'oils-greases',
      data: { ...state.data, supplierName: text },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_notes')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(
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

    return true
  }

  /**
   * Skip price
   */
  static async skipPrice(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_supplier',
      warehouse: 'oils-greases',
      data: { ...state.data, unitPrice: 0 },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_supplier')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.editMessageText(
      '⏭️ **تم تخطي السعر**\n\n'
      + '🏭 **أدخل اسم المورد (اختياري):**\n\n'
      + '**مثال:** شركة الزيوت المتحدة',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Skip supplier
   */
  static async skipSupplier(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_notes',
      warehouse: 'oils-greases',
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي', 'og:items:add:skip_notes')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.editMessageText(
      '⏭️ **تم تخطي المورد**\n\n'
      + '📝 **أدخل ملاحظات إضافية (اختياري):**\n\n'
      + '✅ رقم الموديل\n'
      + '✅ الشركة المصنعة\n'
      + '✅ أي معلومات أخرى',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Skip notes
   */
  static async skipNotes(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_images',
      warehouse: 'oils-greases',
    }

    const keyboard = new InlineKeyboard()
      .text('✅ إنهاء وحفظ', 'og:items:add:skip_images')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.editMessageText(
      '⏭️ **تم تخطي الملاحظات**\n\n'
      + '📸 **أرسل صور المنتج (اختياري):**\n\n'
      + '📷 يمكنك إرسال صورة أو أكثر',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }

  /**
   * Skip images and save
   */
  static async skipImages(ctx: Context) {
    await this.showFinalReview(ctx)
  }

  /**
   * Show final review
   */
  static async showFinalReview(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    const data = state.data as AddItemData
    const [category, location] = await Promise.all([
      Database.prisma.iNV_OilsGreasesCategory.findUnique({ where: { id: data.categoryId } }),
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
    message += `• سعر الوحدة: ${data.unitPrice.toFixed(2)} جنيه\n`
    message += `• القيمة الإجمالية: ${totalValue.toFixed(2)} جنيه\n`
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

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد الحفظ', 'og:items:add:confirm_save')
      .row()
      .text('❌ إلغاء', 'og:items:menu')

    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }

  /**
   * Confirm and save
   */
  static async confirmSave(ctx: Context) {
    const state = ctx.session.inventoryForm
    if (!state)
      return

    const data = state.data as AddItemData

    try {
      const item = await AddItemService.saveItem(data, BigInt(ctx.from!.id))

      const [category, location] = await Promise.all([
        Database.prisma.iNV_OilsGreasesCategory.findUnique({ where: { id: data.categoryId } }),
        data.locationId ? Database.prisma.iNV_StorageLocation.findUnique({ where: { id: data.locationId } }) : null,
      ])

      ctx.session.inventoryForm = undefined

      AddItemService.sendReportToAdmins(ctx, item, category, location).catch(console.error)

      const images = item.images ? JSON.parse(item.images as string) : []

      let message = '✅ **تم حفظ الصنف بنجاح!**\n\n'
      message += '═══════════════════\n\n'
      
      message += '📝 **معلومات الصنف:**\n'
      message += '─────────────────────\n'
      message += `• الباركود: \`${item.barcode}\`\n`
      message += `• الكود: \`${item.code}\`\n`
      message += `• الاسم (عربي): **${item.nameAr}**\n`
      if (item.nameEn) message += `• الاسم (إنجليزي): ${item.nameEn}\n`
      message += '\n'
      
      message += '🏷️ **التصنيف:**\n'
      message += '─────────────────────\n'
      message += `• الفئة: ${category?.nameAr || 'غير محدد'}\n`
      message += `• الموقع: ${location?.nameAr || 'غير محدد'}\n`
      message += '\n'
      
      message += '📦 **الكميات:**\n'
      message += '─────────────────────\n'
      message += `• الوحدة: ${item.unit}\n`
      message += `• الكمية: **${item.quantity}** ${item.unit}\n`
      message += `• الحد الأدنى: ${item.minQuantity} ${item.unit}\n`
      message += '\n'
      
      message += '💰 **المعلومات المالية:**\n'
      message += '─────────────────────\n'
      message += `• سعر الوحدة: ${item.unitPrice.toFixed(2)} جنيه\n`
      message += `• القيمة الإجمالية: **${item.totalValue.toFixed(2)}** جنيه\n`
      message += '\n'
      
      if (item.supplierName) {
        message += `🏭 **المورد:** ${item.supplierName}\n\n`
      }
      
      if (images.length > 0) {
        message += `📸 **الصور:** ${images.length} صورة\n\n`
      }
      
      if (item.notes) {
        message += `📝 **ملاحظات:** ${item.notes}\n\n`
      }
      
      message += '═══════════════════\n'
      message += '📨 **تم إرسال تقرير للمسؤولين**'

      await ctx.editMessageText(message, {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة صنف آخر', 'og:items:add:start')
          .row()
          .text('⬅️ القائمة الرئيسية', 'og:items:menu'),
        parse_mode: 'Markdown',
      })
    }
    catch (error) {
      console.error('Error saving item:', error)
      await ctx.editMessageText('❌ حدث خطأ أثناء الحفظ')
      ctx.session.inventoryForm = undefined
    }
  }
}
