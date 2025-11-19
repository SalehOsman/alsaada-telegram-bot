/**
 * Spare Parts Items Handler
 * إدارة قطع الغيار - إضافة، بحث، عرض، تعديل
 */

import type { Context } from '../../../context.js'
import { Buffer } from 'node:buffer'
import { BarcodeScannerService } from '#root/modules/services/barcode-scanner/index.js'
import { Composer, InlineKeyboard, InputFile } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sparePartsItemsHandler = new Composer<Context>()

// Startup log to confirm handler is loaded
console.error('🔵 ✅ sparePartsItemsHandler loaded and ready')

// ═══════════════════════════════════════════════════════
// 🔢 دالة عرض الكميات التفصيلية
// ═══════════════════════════════════════════════════════
/**
 * تنسيق عرض الكميات حسب الحالة (جديد، مستعمل، مجدد، استيراد)
 */
function formatQuantityDetails(item: any): string {
  let message = `**الكمية الإجمالية:** ${item.quantity} ${item.unit}\n`
  message += `  └ 🆕 جديد: ${item.quantityNew || 0}\n`
  message += `  └ ♻️ مستعمل: ${item.quantityUsed || 0}\n`
  message += `  └ 🔄 مجدد: ${item.quantityRefurbished || 0}\n`
  message += `  └ 📦 استيراد: ${item.quantityImport || 0}\n`
  return message
}

// ═══════════════════════════════════════════════════════
// 🔢 دالة توليد الكود التلقائي
// ═══════════════════════════════════════════════════════
/**
 * توليد كود داخلي تلقائي للقطعة بناءً على التصنيف
 * @param categoryCode - كود التصنيف (مثل "CAR", "LOADER", "BULLDOZER")
 * @returns الكود المولّد (مثل "CAR-00001", "LOADER-00023")
 */
async function generateInternalCode(categoryCode: string): Promise<string> {
  // جلب آخر رقم مستخدم لهذا التصنيف
  const lastItem = await Database.prisma.iNV_Item.findFirst({
    where: {
      code: {
        startsWith: `${categoryCode}-`,
      },
    },
    orderBy: {
      code: 'desc',
    },
    select: {
      code: true,
    },
  })

  let nextNumber = 1
  if (lastItem) {
    // استخراج الرقم من الكود (مثل: "CAR-00123" → 123)
    const match = lastItem.code.match(/-(\d+)$/)
    if (match) {
      nextNumber = Number.parseInt(match[1], 10) + 1
    }
  }

  // تنسيق الرقم بـ 5 خانات (مع أصفار بادئة)
  const formattedNumber = nextNumber.toString().padStart(5, '0')
  return `${categoryCode}-${formattedNumber}`
}

// ═══════════════════════════════════════════════════════
// إضافة قطعة غيار جديدة - البداية
// ═══════════════════════════════════════════════════════
sparePartsItemsHandler.callbackQuery('sp:items:add:start', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📸 مسح الباركود', 'sp:items:add:scan')
    .row()
    .text('✍️ إدخال يدوي', 'sp:items:add:manual')
    .row()
    .text('❌ إلغاء', 'sp:items:menu')

  await ctx.editMessageText(
    '➕ **إضافة قطعة غيار جديدة**\n\n'
    + '📋 **اختر طريقة الإضافة:**\n\n'
    + '📸 **مسح الباركود**\n'
    + '└ استخدم الكاميرا لمسح الباركود\n\n'
    + '✍️ **إدخال يدوي**\n'
    + '└ أدخل البيانات يدوياً',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// مسح الباركود
sparePartsItemsHandler.callbackQuery('sp:items:add:scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  // حفظ الحالة قبل أي شيء آخر
  ctx.session.inventoryForm = {
    action: 'add',
    step: 'awaiting_barcode_image',
    data: {},
  }

  console.error('✅ Session set in callback handler:', {
    chatId: ctx.chat?.id,
    session: ctx.session.inventoryForm,
  })

  const keyboard = new InlineKeyboard().text('❌ إلغاء', 'sp:items:add:start')

  await ctx.editMessageText(
    '📸 **مسح الباركود**\n\n'
    + '📷 **أرسل صورة الباركود الآن**\n\n'
    + '💡 **تلميحات:**\n'
    + '• تأكد من وضوح الباركود\n'
    + '• استخدم إضاءة جيدة\n'
    + '• يدعم EAN-13 وأنواع أخرى\n\n'
    + '⏳ **في انتظار الصورة...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إدخال يدوي - الخطوة 1: الباركود
sparePartsItemsHandler.callbackQuery('sp:items:add:manual', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔢 توليد تلقائي', 'sp:items:add:auto-barcode')
    .row()
    .text('❌ إلغاء', 'sp:items:add:start')

  await ctx.editMessageText(
    '✍️ **إدخال يدوي - الخطوة 1/6**\n\n'
    + '🔢 **أدخل رقم الباركود (13 رقم):**\n\n'
    + '**مثال:** `6281234567890`\n\n'
    + '**أو اضغط "توليد تلقائي" لإنشاء كود فريد**\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )

  // TODO: set conversation state
})

// توليد باركود تلقائي
sparePartsItemsHandler.callbackQuery('sp:items:add:auto-barcode', async (ctx) => {
  await ctx.answerCallbackQuery()

  // توليد باركود فريد
  const barcode = `628${Date.now().toString().slice(-10)}`

  const keyboard = new InlineKeyboard()
    .text('✅ استخدام هذا الباركود', `sp:items:add:confirm-barcode:${barcode}`)
    .row()
    .text('🔄 توليد آخر', 'sp:items:add:auto-barcode')
    .row()
    .text('❌ إلغاء', 'sp:items:add:start')

  await ctx.editMessageText(
    '🔢 **توليد باركود تلقائي**\n\n'
    + `✅ **تم توليد الباركود:**\n\`${barcode}\`\n\n`
    + '**هل تريد استخدامه؟**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تأكيد الباركود والانتقال للخطوة التالية
sparePartsItemsHandler.callbackQuery(/^sp:items:add:confirm-barcode:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const barcode = ctx.match![1]

  // التحقق من عدم تكرار الباركود
  const existing = await Database.prisma.iNV_Item.findUnique({
    where: { barcode },
    include: { location: true },
  })

  if (existing) {
    await ctx.editMessageText(
      '⚠️ **يوجد بالفعل صنف بهذا الباركود**\n\n'
      + '**📋 معلومات القطعة الموجودة:**\n\n'
      + `• **الاسم:** ${existing.nameAr}\n`
      + `• **الكود:** \`${existing.code}\`\n`
      + `• **الباركود:** \`${existing.barcode}\`\n`
      + `• **الكمية الحالية:** ${existing.quantity} ${existing.unit || 'قطعة'}\n`
      + `• **موقع التخزين:** ${existing.location?.nameAr || 'غير محدد'}\n`
      + `• **القيمة الإجمالية:** ${existing.totalValue.toFixed(2)} جنيه\n\n`
      + '**ماذا تريد أن تفعل؟**',
      {
        reply_markup: new InlineKeyboard()
          .text('📦 عرض التفاصيل', `sp:items:view:${existing.id}`)
          .row()
          .text('🔄 توليد باركود آخر', 'sp:items:add:auto-barcode')
          .row()
          .text('❌ إلغاء', 'sp:items:add:start'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  // حفظ الباركود والانتقال للخطوة 2
  const keyboard = new InlineKeyboard().text('❌ إلغاء', 'sp:items:add:start')

  await ctx.editMessageText(
    '✍️ **الخطوة 2/6: الاسم بالعربية**\n\n'
    + `✅ الباركود: \`${barcode}\`\n\n`
    + '📝 **أدخل اسم القطعة بالعربية:**\n\n'
    + '**مثال:** فلتر زيت محرك\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )

  // حفظ الباركود في Session والانتقال لخطوة إدخال الاسم
  ctx.session.inventoryForm = {
    action: 'add',
    step: 'awaiting_name_ar',
    data: { barcode },
  }
})

// ═══════════════════════════════════════════════════════
// البحث عن قطعة
// ═══════════════════════════════════════════════════════
sparePartsItemsHandler.callbackQuery('sp:items:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📸 بالباركود (مسح)', 'sp:items:search:barcode-scan')
    .row()
    .text('🔢 بالكود الداخلي', 'sp:items:search:code')
    .row()
    .text('📝 بالاسم', 'sp:items:search:name')
    .row()
    .text('🏷️ بالتصنيف', 'sp:items:search:category')
    .row()
    .text('📍 بالموقع', 'sp:items:search:location')
    .row()
    .text('⬅️ رجوع', 'sp:items:menu')

  await ctx.editMessageText(
    '🔍 **البحث عن قطعة غيار**\n\n'
    + '📋 **اختر طريقة البحث:**\n\n'
    + '📸 **بالباركود**\n'
    + '└ مسح سريع بالكاميرا\n\n'
    + '🔢 **بالكود الداخلي**\n'
    + '└ مثال: CAR-ENG-00123\n\n'
    + '📝 **بالاسم**\n'
    + '└ بحث نصي عربي/إنجليزي\n\n'
    + '🏷️ **بالتصنيف**\n'
    + '└ عرض قطع تصنيف معين\n\n'
    + '📍 **بالموقع**\n'
    + '└ محتويات موقع معين',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالباركود - مسح
sparePartsItemsHandler.callbackQuery('sp:items:search:barcode-scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('✍️ إدخال يدوي', 'sp:items:search:barcode-manual')
    .row()
    .text('❌ إلغاء', 'sp:items:search')

  await ctx.editMessageText(
    '📸 **البحث بالباركود**\n\n'
    + '📷 **أرسل صورة الباركود الآن**\n\n'
    + '⏳ **في انتظار الصورة...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'awaiting_barcode_image',
    data: { flow: 'search' },
  }
})

// ════════════════════════════════════════════════════════
// 📸 معالج الصور الموحد (Unified Photo Handler)
// ════════════════════════════════════════════════════════
sparePartsItemsHandler.on('message:photo', async (ctx, next) => {
  console.error('📸 Photo received, chat ID:', ctx.chat?.id)

  const state = ctx.session.inventoryForm
  console.error('📸 Session state:', state)

  // No inventory form - pass to next handler
  if (!state) {
    console.error('❌ Photo received but no session state found')
    return next()
  }

  // ═══ Case 1: Barcode Scanning ═══
  if (state.step === 'awaiting_barcode_image') {
    console.error('✅ Processing barcode image, state:', state)

    try {
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('❌ لم يتم العثور على صورة. الرجاء المحاولة مرة أخرى.')
        return
      }

      // pick the largest photo
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const imageBuffer = Buffer.from(await response.arrayBuffer())

      await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

      const result = await BarcodeScannerService.scanBarcode(imageBuffer)

      if (!result || !result.data) {
        await ctx.reply('❌ لم يتم التعرف على الباركود من الصورة. حاول صورة أو استخدم الإدخال اليدوي.')
        return
      }

      const scanned = result.data.trim()

      if (state.action === 'add') {
        // check duplicate
        const existing = await Database.prisma.iNV_Item.findUnique({
          where: { barcode: scanned },
          include: { location: true },
        })
        if (existing) {
          const keyboard = new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${existing.id}`)
            .row()
            .text('⬅️ رجوع', 'sp:items:menu')

          await ctx.reply(
            `⚠️ **يوجد بالفعل صنف بهذا الباركود**\n\n`
            + '**📋 معلومات القطعة الموجودة:**\n\n'
            + `• **الاسم:** ${existing.nameAr}\n`
            + `• **الكود:** \`${existing.code}\`\n`
            + `• **الباركود:** \`${existing.barcode}\`\n`
            + `• **الكمية الحالية:** ${existing.quantity} ${existing.unit || 'قطعة'}\n`
            + `• **موقع التخزين:** ${existing.location?.nameAr || 'غير محدد'}\n`
            + `• **القيمة الإجمالية:** ${existing.totalValue.toFixed(2)} جنيه\n\n`
            + '**ماذا تريد أن تفعل؟**',
            {
              reply_markup: keyboard,
              parse_mode: 'Markdown',
            },
          )
          // Clear state
          ctx.session.inventoryForm = undefined
          return
        }

        // Save barcode and continue to next step (ask for Arabic name)
        ctx.session.inventoryForm = {
          action: 'add',
          step: 'awaiting_name_ar',
          data: { barcode: scanned },
        }
        await ctx.reply(
          `✅ تم قراءة الباركود: \`${scanned}\`\n\n✍️ الرجاء إدخال اسم القطعة بالعربية:`,
          { parse_mode: 'Markdown' },
        )
        return
      }

      // search flow stored under data.flow === 'search'
      if (state.data && state.data.flow === 'search') {
        const item = await Database.prisma.iNV_Item.findUnique({
          where: { barcode: scanned },
          include: {
            category: true,
            location: true,
          },
        })
        if (!item) {
          // Offer to create new item with scanned barcode
          const keyboard = new InlineKeyboard()
            .text('➕ إضافة كقطعة جديدة', `sp:items:add:manual_from_barcode:${scanned}`)
            .row()
            .text('⬅️ رجوع', 'sp:items:search')

          await ctx.reply(`🔎 لم يتم العثور على قطعة بالباركود: \`${scanned}\``, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          })
          ctx.session.inventoryForm = undefined
          return
        }

        // حساب عدد الصور
        let additionalImages: string[] = []
        if (item.images) {
          if (typeof item.images === 'string') {
            try {
              additionalImages = JSON.parse(item.images)
            }
            catch {
              additionalImages = []
            }
          }
          else if (Array.isArray(item.images)) {
            additionalImages = item.images as string[]
          }
        }
        const totalImages = (item.imagePath ? 1 : 0) + additionalImages.length
        const hasImages = totalImages > 0

        // حساب حالة المخزون
        const stockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= item.minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'

        // تحويل حالة القطعة
        const conditionMap: Record<string, string> = {
          NEW: '🆕 جديدة',
          USED: '♻️ مستعملة',
          REFURBISHED: '🔄 مجدد',
          IMPORT: '📦 استيراد',
        }
        const itemCondition = conditionMap[item.condition] || item.condition

        // عرض تفاصيل القطعة المكتملة
        let message = '✅ **تم العثور على القطعة!**\n\n'
        message += '📦 **تفاصيل القطعة:**\n\n'

        // معلومات أساسية
        message += `• **الاسم:** ${item.nameAr}\n`
        if (item.nameEn) {
          message += `• **Name:** ${item.nameEn}\n`
        }
        message += `• **الكود:** \`${item.code}\`\n`
        message += `• **الباركود:** \`${item.barcode}\`\n\n`

        // التصنيف والموقع
        message += `• **التصنيف:** ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
        message += `• **الموقع:** ${item.location ? `📍 ${item.location.nameAr}` : 'غير محدد'}\n\n`

        // الكميات
        message += `• **الكمية الحالية:** ${item.quantity} ${item.unit}\n`
        message += `• **الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
        message += `• **حالة المخزون:** ${stockStatus}\n`
        message += `• **حالة القطعة:** ${itemCondition}\n\n`

        // الأسعار
        message += `• **سعر الوحدة:** ${item.unitPrice.toFixed(2)} ${item.currency}\n`
        message += `• **القيمة الإجمالية:** ${item.totalValue.toFixed(2)} ${item.currency}\n`

        if (hasImages) {
          message += `\n📸 **الصور:** ${totalImages} صورة\n`
        }

        // بناء لوحة المفاتيح
        const keyboard = new InlineKeyboard()
          .text('📋 عرض التفاصيل الكاملة', `sp:items:view:${item.id}`)
          .row()
          .text('✏️ تعديل البيانات', `sp:items:edit:${item.id}`)

        if (hasImages) {
          keyboard.row().text('📸 عرض الصور', `sp:items:images:${item.id}`)
        }

        keyboard
          .row()
          .text('📊 عرض الحركات', `sp:trans:item:${item.id}`)
          .row()
          .text('⬅️ رجوع', 'sp:items:search')

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        })

        ctx.session.inventoryForm = undefined
      }

      return // Handled barcode scan
    }
    catch (error) {
      console.error('Error processing barcode:', error)
      await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى لاحقاً.')
      ctx.session.inventoryForm = undefined
      return
    }
  }

  // ═══ Case 2: Product Images Upload ═══
  if (state.step === 'awaiting_images') {
    console.error('✅ Processing product image upload')

    try {
      // Get the largest photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1]

      // Download the photo
      const file = await ctx.api.getFile(photo.file_id)
      const photoPath = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`

      // Fetch photo data
      const response = await fetch(photoPath)
      const buffer = await response.arrayBuffer()

      // Create upload directory if it doesn't exist
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const process = await import('node:process')
      const uploadDir = path.join(process.cwd(), 'uploads', 'inventory', 'products')
      await fs.mkdir(uploadDir, { recursive: true })

      // Save photo with barcode name and index
      const currentImages = (state.data.images as string[]) || []
      const imageIndex = currentImages.length
      const fileName = `${state.data.barcode}-${imageIndex}.jpg`
      const filePath = path.join(uploadDir, fileName)

      await fs.writeFile(filePath, Buffer.from(buffer))

      // Update session with new image path
      const relativePath = `uploads/inventory/products/${fileName}`
      const updatedImages = [...currentImages, relativePath]

      ctx.session.inventoryForm = {
        ...state,
        data: { ...state.data, images: updatedImages },
      }

      // Show confirmation with options
      const keyboard = new InlineKeyboard()
        .text('➕ إضافة صورة أخرى', 'sp:items:add:continue_images')
        .row()
        .text('✅ إنهاء وحفظ', 'sp:items:add:skip_images')
        .row()
        .text('❌ إلغاء', 'sp:items:menu')

      await ctx.reply(
        `✅ **تم حفظ الصورة ${imageIndex + 1}**\n\n`
        + `📸 **إجمالي الصور:** ${updatedImages.length}\n\n`
        + '**ماذا تريد أن تفعل؟**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )

      return // Handled image upload
    }
    catch (error) {
      console.error('Error handling product photo:', error)
      await ctx.reply('❌ حدث خطأ أثناء حفظ الصورة. الرجاء المحاولة مرة أخرى.')
      return
    }
  }

  // Unknown step - pass to next handler
  console.error(`⚠️ Photo received but unhandled step: ${state.step}`)
  return next()
})

// ═══════════════════════════════════════════════════════════════
// 📝 معالج النصوص لنماذج قطع الغيار متعددة الخطوات
// ═══════════════════════════════════════════════════════════════
// ✅ الحل المثبت: استخدام middleware عادي مع فحص يدوي (بدون filter)
// 🔗 يتبع منهجية المشكلة #2 (Pattern Matching) + #6 (Handler Priority)
// ═══════════════════════════════════════════════════════════════
sparePartsItemsHandler.on('message:text', async (ctx, next) => {
  console.error('🔵 ======================================')
  console.error('🔵 SPARE PARTS TEXT HANDLER CALLED!')
  console.error('🔵 Chat ID:', ctx.chat?.id)
  console.error('🔵 User ID:', ctx.from?.id)
  console.error('🔵 Has session:', !!ctx.session)
  console.error('🔵 Has inventoryForm:', !!ctx.session?.inventoryForm)
  console.error('🔵 ======================================')

  // ✅ Pattern Matching: فحص دقيق للحالة (من المشكلة #2)
  const state = ctx.session?.inventoryForm
  if (!state) {
    console.error('🔵 No inventoryForm in session, passing to next()')
    return next()
  }

  // ✅ إضافة: فحص أن هذه خطوة من خطواتنا
  const validSteps = [
    'awaiting_name_ar',
    'awaiting_category', // بعد الاسم مباشرة نختار التصنيف (الكود يُولَّد تلقائياً)
    'awaiting_location',
    'awaiting_condition', // حالة القطعة: جديد/استيراد/مستعمل
    'awaiting_quantity', // الكمية
    'awaiting_price', // السعر (اختياري)
    'awaiting_notes', // ملاحظات (اختياري)
    // Edit steps
    'edit_name',
    'edit_quantity',
    'edit_minQuantity',
    'edit_price',
    'edit_notes',
    // Search steps
    'search_by_barcode',
    'search_by_code',
    'search_by_name',
  ]
  if (!validSteps.includes(state.step)) {
    console.error('🔵 Step not handled by spare-parts:', state.step)
    return next()
  }

  console.error('🔵 ✅ PROCESSING TEXT for step:', state.step)
  const text = ctx.message.text.trim()

  try {
    // Step 2: Awaiting Arabic name
    if (state.step === 'awaiting_name_ar') {
      if (!text || text.length < 2) {
        await ctx.reply('❌ الرجاء إدخال اسم صحيح (حرفين على الأقل)')
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_category',
        data: { ...state.data, nameAr: text },
      }

      // Get categories for selection
      const categories = await Database.prisma.equipmentCategory.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      })

      if (categories.length === 0) {
        await ctx.reply('❌ لا توجد تصنيفات متاحة. الرجاء إضافة تصنيف أولاً من قسم الإعدادات.')
        ctx.session.inventoryForm = undefined
        return
      }

      const keyboard = new InlineKeyboard()
      for (const cat of categories) {
        keyboard.text(
          `${cat.icon || '📦'} ${cat.nameAr}`,
          `sp:items:add:select_category:${cat.id}`,
        ).row()
      }
      keyboard.text('❌ إلغاء', 'sp:items:menu')

      await ctx.reply(
        '✅ تم حفظ الاسم بالعربية\n\n'
        + '🏷️ **اختر التصنيف:**\n\n'
        + 'اختر التصنيف المناسب للقطعة:\n'
        + '💡 *سيتم توليد الكود الداخلي تلقائياً بناءً على التصنيف*',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // Step: Awaiting quantity
    if (state.step === 'awaiting_quantity') {
      const quantity = Number.parseInt(text, 10)

      if (Number.isNaN(quantity) || quantity < 0) {
        await ctx.reply('❌ الكمية غير صحيحة. يجب أن تكون رقماً موجباً.\n\n**مثال:** `10`')
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_price',
        data: { ...state.data, quantity },
      }

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي السعر', 'sp:items:add:skip_price')
        .row()
        .text('❌ إلغاء', 'sp:items:menu')

      await ctx.reply(
        `✅ تم حفظ الكمية: **${quantity}**\n\n`
        + '💰 **أدخل سعر الوحدة (اختياري):**\n\n'
        + '📝 **مثال:** `150.50`\n\n'
        + '⏳ **أو اضغط "تخطي" للمتابعة...**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // Step: Awaiting price (optional)
    if (state.step === 'awaiting_price') {
      const unitPrice = Number.parseFloat(text)

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        await ctx.reply(
          '❌ السعر غير صحيح. يجب أن يكون رقماً موجباً.\n\n'
          + '**مثال:** `150.50`\n\n'
          + 'أو اضغط زر "تخطي" للمتابعة بدون سعر',
        )
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_notes',
        data: { ...state.data, unitPrice },
      }

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي الملاحظات', 'sp:items:add:skip_notes')
        .row()
        .text('❌ إلغاء', 'sp:items:menu')

      await ctx.reply(
        `✅ تم حفظ السعر: **${unitPrice.toFixed(2)}** جنيه\n\n`
        + '📝 **أدخل ملاحظات (اختياري):**\n\n'
        + '✍️ أضف أي ملاحظات إضافية عن القطعة\n\n'
        + '⏳ **أو اضغط "تخطي" للمتابعة...**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // Step: Awaiting notes (optional)
    if (state.step === 'awaiting_notes') {
      const notes = text

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_images',
        data: { ...state.data, notes },
      }

      const keyboard = new InlineKeyboard()
        .text('✅ إنهاء وحفظ', 'sp:items:add:skip_images')
        .row()
        .text('❌ إلغاء', 'sp:items:menu')

      await ctx.reply(
        '✅ تم حفظ الملاحظات\n\n'
        + '📸 **أرسل صور المنتج (اختياري):**\n\n'
        + '📷 يمكنك إرسال صورة أو أكثر للقطعة\n\n'
        + '⏳ **أو اضغط "إنهاء وحفظ" للمتابعة بدون صور...**',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // ═══════════════════════════════════════════════════════
    // معالجات التعديل (Edit Handlers)
    // ═══════════════════════════════════════════════════════

    // تعديل الاسم
    if (state.step === 'edit_name') {
      if (!text || text.length < 2) {
        await ctx.reply('❌ الرجاء إدخال اسم صحيح (حرفين على الأقل)')
        return
      }

      const itemId = state.data.itemId
      const oldValue = state.data.currentValue

      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: { nameAr: text },
      })

      ctx.session.inventoryForm = undefined

      await ctx.reply(
        `✅ **تم تحديث الاسم بنجاح**\n\n`
        + `**من:** ${oldValue}\n`
        + `**إلى:** ${text}`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
            .row()
            .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
            .row()
            .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // تعديل الكمية
    if (state.step === 'edit_quantity') {
      const quantity = Number.parseInt(text, 10)
      if (Number.isNaN(quantity) || quantity < 0) {
        await ctx.reply('❌ الرجاء إدخال رقم صحيح للكمية')
        return
      }

      const itemId = state.data.itemId
      const oldValue = state.data.currentValue

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { id: itemId },
      })

      if (!item) {
        await ctx.reply('❌ القطعة غير موجودة')
        return
      }

      const newTotalValue = quantity * item.unitPrice

      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: {
          quantity,
          totalValue: newTotalValue,
        },
      })

      ctx.session.inventoryForm = undefined

      await ctx.reply(
        `✅ **تم تحديث الكمية بنجاح**\n\n`
        + `**من:** ${oldValue} ${item.unit || 'قطعة'}\n`
        + `**إلى:** ${quantity} ${item.unit || 'قطعة'}\n\n`
        + `**القيمة الإجمالية الجديدة:** ${newTotalValue.toFixed(2)} جنيه`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
            .row()
            .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
            .row()
            .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // تعديل الحد الأدنى للكمية
    if (state.step === 'edit_minQuantity') {
      const minQuantity = Number.parseInt(text, 10)
      if (Number.isNaN(minQuantity) || minQuantity < 0) {
        await ctx.reply('❌ الرجاء إدخال رقم صحيح للحد الأدنى')
        return
      }

      const itemId = state.data.itemId
      const oldValue = state.data.currentValue

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { id: itemId },
      })

      if (!item) {
        await ctx.reply('❌ القطعة غير موجودة')
        return
      }

      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: {
          minQuantity,
        },
      })

      ctx.session.inventoryForm = undefined

      // حساب حالة المخزون بعد التحديث
      const newStockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'

      await ctx.reply(
        `✅ **تم تحديث الحد الأدنى بنجاح**\n\n`
        + `**من:** ${oldValue} ${item.unit || 'قطعة'}\n`
        + `**إلى:** ${minQuantity} ${item.unit || 'قطعة'}\n\n`
        + `**حالة المخزون الجديدة:** ${newStockStatus}`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
            .row()
            .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
            .row()
            .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // تعديل السعر
    if (state.step === 'edit_price') {
      const price = Number.parseFloat(text)
      if (Number.isNaN(price) || price < 0) {
        await ctx.reply('❌ الرجاء إدخال رقم صحيح للسعر')
        return
      }

      const itemId = state.data.itemId
      const oldValue = state.data.currentValue

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { id: itemId },
      })

      if (!item) {
        await ctx.reply('❌ القطعة غير موجودة')
        return
      }

      const newTotalValue = item.quantity * price

      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: {
          unitPrice: price,
          totalValue: newTotalValue,
        },
      })

      ctx.session.inventoryForm = undefined

      await ctx.reply(
        `✅ **تم تحديث السعر بنجاح**\n\n`
        + `**من:** ${oldValue.toFixed(2)} جنيه\n`
        + `**إلى:** ${price.toFixed(2)} جنيه\n\n`
        + `**القيمة الإجمالية الجديدة:** ${newTotalValue.toFixed(2)} جنيه`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
            .row()
            .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
            .row()
            .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // تعديل الملاحظات
    if (state.step === 'edit_notes') {
      const itemId = state.data.itemId
      const oldValue = state.data.currentValue

      let newNotes: string | null = text
      if (text === 'حذف' || text === 'delete') {
        newNotes = null
      }

      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: { notes: newNotes },
      })

      ctx.session.inventoryForm = undefined

      await ctx.reply(
        `✅ **تم تحديث الملاحظات بنجاح**\n\n`
        + `**من:** ${oldValue || 'لا توجد'}\n`
        + `**إلى:** ${newNotes || 'لا توجد'}`,
        {
          reply_markup: new InlineKeyboard()
            .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
            .row()
            .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
            .row()
            .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // ═══ البحث بالكود الداخلي ═══
    // ═══════════════════════════════════════════════════════
    // معالجات البحث (Search Handlers)
    // ═══════════════════════════════════════════════════════

    // ═══ البحث بالباركود ═══
    if (state.step === 'search_by_barcode') {
      const barcode = text.trim()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من إدخال الباركود بشكل صحيح\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:items:search')
              .row()
              .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
            parse_mode: 'Markdown',
          },
        )
        ctx.session.inventoryForm = undefined
        return
      }

      // عرض تفاصيل القطعة
      let additionalImages: string[] = []
      if (item.images) {
        if (typeof item.images === 'string') {
          try {
            additionalImages = JSON.parse(item.images)
          }
          catch {
            additionalImages = []
          }
        }
        else if (Array.isArray(item.images)) {
          additionalImages = item.images as string[]
        }
      }
      const totalImages = (item.imagePath ? 1 : 0) + additionalImages.length
      const hasImages = totalImages > 0

      const stockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= item.minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'
      const conditionMap: Record<string, string> = {
        NEW: '🆕 جديدة',
        USED: '♻️ مستعملة',
        REFURBISHED: '🔄 استيراد',
        IMPORT: '📦 استيراد',
      }
      const itemCondition = conditionMap[item.condition] || item.condition

      let message = '✅ **تم العثور على القطعة**\n\n'
      message += `**الاسم:** ${item.nameAr}\n`
      if (item.nameEn) {
        message += `**Name:** ${item.nameEn}\n`
      }
      message += `**الكود:** \`${item.code}\`\n`
      message += `**الباركود:** \`${item.barcode}\`\n\n`
      message += `**التصنيف:** ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
      if (item.location) {
        message += `**الموقع:** 📍 ${item.location.nameAr}\n`
      }
      message += '\n'
      message += `**الكمية الحالية:** ${item.quantity} ${item.unit}\n`
      message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
      message += `**حالة المخزون:** ${stockStatus}\n`
      message += `**حالة القطعة:** ${itemCondition}\n\n`
      message += `**سعر الوحدة:** ${item.unitPrice.toFixed(2)} ${item.currency}\n`
      message += `**القيمة الإجمالية:** ${item.totalValue.toFixed(2)} ${item.currency}\n`

      if (hasImages) {
        message += `\n📸 **الصور:** ${totalImages} صورة\n`
      }

      const keyboard = new InlineKeyboard()
        .text('📦 عرض التفاصيل الكاملة', `sp:items:view:${item.id}`)
        .row()
        .text('✏️ تعديل', `sp:items:edit:${item.id}`)

      if (hasImages) {
        keyboard.row().text('📸 عرض الصور', `sp:items:images:${item.id}`)
      }

      keyboard
        .row()
        .text('🔍 بحث جديد', 'sp:items:search')
        .row()
        .text('⬅️ رجوع للقائمة', 'sp:items:menu')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })

      ctx.session.inventoryForm = undefined
      return
    }

    // ═══ البحث بالكود ═══
    if (state.step === 'search_by_code') {
      const code = text.trim().toUpperCase()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { code },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالكود:** \`${code}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من كتابة الكود بشكل صحيح\n'
          + '• استخدم البحث بالاسم أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:items:search')
              .row()
              .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
            parse_mode: 'Markdown',
          },
        )
        ctx.session.inventoryForm = undefined
        return
      }

      // عرض تفاصيل القطعة
      let additionalImages: string[] = []
      if (item.images) {
        if (typeof item.images === 'string') {
          try {
            additionalImages = JSON.parse(item.images)
          }
          catch {
            additionalImages = []
          }
        }
        else if (Array.isArray(item.images)) {
          additionalImages = item.images as string[]
        }
      }
      const totalImages = (item.imagePath ? 1 : 0) + additionalImages.length
      const hasImages = totalImages > 0

      const stockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= item.minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'
      const conditionMap: Record<string, string> = {
        NEW: '🆕 جديدة',
        USED: '♻️ مستعملة',
        REFURBISHED: '🔄 استيراد',
        IMPORT: '📦 استيراد',
      }
      const itemCondition = conditionMap[item.condition] || item.condition

      let message = '✅ **تم العثور على القطعة**\n\n'
      message += `**الاسم:** ${item.nameAr}\n`
      if (item.nameEn) {
        message += `**Name:** ${item.nameEn}\n`
      }
      message += `**الكود:** \`${item.code}\`\n`
      message += `**الباركود:** \`${item.barcode}\`\n\n`
      message += `**التصنيف:** ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
      if (item.location) {
        message += `**الموقع:** 📍 ${item.location.nameAr}\n`
      }
      message += '\n'
      message += `**الكمية الحالية:** ${item.quantity} ${item.unit}\n`
      message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
      message += `**حالة المخزون:** ${stockStatus}\n`
      message += `**حالة القطعة:** ${itemCondition}\n\n`
      message += `**سعر الوحدة:** ${item.unitPrice.toFixed(2)} ${item.currency}\n`
      message += `**القيمة الإجمالية:** ${item.totalValue.toFixed(2)} ${item.currency}\n`

      if (hasImages) {
        message += `\n📸 **الصور:** ${totalImages} صورة\n`
      }

      const keyboard = new InlineKeyboard()
        .text('📦 عرض التفاصيل الكاملة', `sp:items:view:${item.id}`)
        .row()
        .text('✏️ تعديل', `sp:items:edit:${item.id}`)

      if (hasImages) {
        keyboard.row().text('📸 عرض الصور', `sp:items:images:${item.id}`)
      }

      keyboard
        .row()
        .text('🔍 بحث جديد', 'sp:items:search')
        .row()
        .text('⬅️ رجوع للقائمة', 'sp:items:menu')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })

      ctx.session.inventoryForm = undefined
      return
    }

    // ═══ البحث بالاسم ═══
    if (state.step === 'search_by_name') {
      const searchTerm = text.trim()

      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          OR: [
            { nameAr: { contains: searchTerm } },
            { nameEn: { contains: searchTerm } },
          ],
        },
        include: {
          category: true,
          location: true,
        },
        take: 10, // الحد الأقصى 10 نتائج
      })

      if (items.length === 0) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطع تحتوي على:** "${searchTerm}"\n\n`
          + '**جرب:**\n'
          + '• استخدم كلمات مختلفة\n'
          + '• تأكد من الإملاء\n'
          + '• جرب البحث بالكود أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:items:search')
              .row()
              .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
            parse_mode: 'Markdown',
          },
        )
        ctx.session.inventoryForm = undefined
        return
      }

      if (items.length === 1) {
        // نتيجة واحدة - عرض التفاصيل مباشرة
        const item = items[0]

        let additionalImages: string[] = []
        if (item.images) {
          if (typeof item.images === 'string') {
            try {
              additionalImages = JSON.parse(item.images)
            }
            catch {
              additionalImages = []
            }
          }
          else if (Array.isArray(item.images)) {
            additionalImages = item.images as string[]
          }
        }
        const totalImages = (item.imagePath ? 1 : 0) + additionalImages.length
        const hasImages = totalImages > 0

        const stockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= item.minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'
        const conditionMap: Record<string, string> = {
          NEW: '🆕 جديدة',
          USED: '♻️ مستعملة',
          REFURBISHED: '🔄 استيراد',
          IMPORT: '📦 استيراد',
        }
        const itemCondition = conditionMap[item.condition] || item.condition

        let message = '✅ **تم العثور على القطعة**\n\n'
        message += `**الاسم:** ${item.nameAr}\n`
        if (item.nameEn) {
          message += `**Name:** ${item.nameEn}\n`
        }
        message += `**الكود:** \`${item.code}\`\n`
        message += `**الباركود:** \`${item.barcode}\`\n\n`
        message += `**التصنيف:** ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
        if (item.location) {
          message += `**الموقع:** 📍 ${item.location.nameAr}\n`
        }
        message += '\n'
        message += `**الكمية الحالية:** ${item.quantity} ${item.unit}\n`
        message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
        message += `**حالة المخزون:** ${stockStatus}\n`
        message += `**حالة القطعة:** ${itemCondition}\n\n`
        message += `**سعر الوحدة:** ${item.unitPrice.toFixed(2)} ${item.currency}\n`
        message += `**القيمة الإجمالية:** ${item.totalValue.toFixed(2)} ${item.currency}\n`

        if (hasImages) {
          message += `\n📸 **الصور:** ${totalImages} صورة\n`
        }

        const keyboard = new InlineKeyboard()
          .text('📦 عرض التفاصيل الكاملة', `sp:items:view:${item.id}`)
          .row()
          .text('✏️ تعديل', `sp:items:edit:${item.id}`)

        if (hasImages) {
          keyboard.row().text('📸 عرض الصور', `sp:items:images:${item.id}`)
        }

        keyboard
          .row()
          .text('🔍 بحث جديد', 'sp:items:search')
          .row()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu')

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        })

        ctx.session.inventoryForm = undefined
        return
      }

      // عدة نتائج - عرض قائمة
      let message = `🔎 **نتائج البحث عن:** "${searchTerm}"\n\n`
      message += `**📊 عدد النتائج:** ${items.length}\n\n`
      message += '**👇 اختر قطعة لعرض التفاصيل:**'

      const keyboard = new InlineKeyboard()
      for (const item of items) {
        const status = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'
        keyboard
          .text(`${status} ${item.nameAr} (${item.quantity})`, `sp:items:view:${item.id}`)
          .row()
      }

      keyboard
        .text('🔍 بحث جديد', 'sp:items:search')
        .row()
        .text('⬅️ رجوع للقائمة', 'sp:items:menu')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })

      ctx.session.inventoryForm = undefined
      return
    }

    // If we reach here, unknown step
    console.error('🔵 Unknown step:', state.step)
  }
  catch (error) {
    console.error('Error handling text message:', error)
    await ctx.reply('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
    ctx.session.inventoryForm = undefined
  }
})

// ============================================
// معالج رسائل الصور (Photo Handler)
// ============================================
// معالج زر "إضافة صورة أخرى"
sparePartsItemsHandler.callbackQuery('sp:items:add:continue_images', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '📸 أرسل الصورة التالية...' })
  // User stays in awaiting_images step
})

// Save the spare part to database
sparePartsItemsHandler.callbackQuery('sp:items:add:save', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'confirm_save') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ctx.session.inventoryForm = undefined
    return
  }

  try {
    const data = state.data
    const quantity = data.quantity || 0
    const condition = data.condition || 'NEW'

    // ✅ توزيع الكمية على الحقل المناسب حسب الحالة (متطابق مع كود الشراء)
    const quantityByCondition: any = {
      quantityNew: 0,
      quantityUsed: 0,
      quantityRefurbished: 0,
      quantityImport: 0,
    }

    switch (condition) {
      case 'NEW':
        quantityByCondition.quantityNew = quantity
        break
      case 'USED':
        quantityByCondition.quantityUsed = quantity
        break
      case 'REFURBISHED':
        quantityByCondition.quantityRefurbished = quantity
        break
      case 'IMPORT':
        quantityByCondition.quantityImport = quantity
        break
      default:
        quantityByCondition.quantityNew = quantity
    }

    const sparePart = await Database.prisma.iNV_Item.create({
      data: {
        barcode: data.barcode!,
        code: data.code!,
        nameAr: data.nameAr!,
        nameEn: data.nameEn,
        categoryId: data.categoryId!,
        locationId: data.locationId!,
        quantity, // الكمية الإجمالية
        quantityNew: quantityByCondition.quantityNew,
        quantityUsed: quantityByCondition.quantityUsed,
        quantityRefurbished: quantityByCondition.quantityRefurbished,
        quantityImport: quantityByCondition.quantityImport,
        condition, // حفظ الحالة
        unitPrice: data.unitPrice || 0,
        totalValue: quantity * (data.unitPrice || 0),
        minQuantity: 5, // Default minimum quantity
        isActive: true,
      },
    })

    // Clear session
    ctx.session.inventoryForm = undefined

    const keyboard = new InlineKeyboard()
      .text('📦 عرض القطعة', `sp:items:view:${sparePart.id}`)
      .row()
      .text('➕ إضافة قطعة أخرى', 'sp:items:add:start')
      .row()
      .text('⬅️ القائمة الرئيسية', 'sp:items:menu')

    await ctx.reply(
      '✅ **تم حفظ القطعة بنجاح!**\n\n'
      + `📦 **${data.nameAr}**\n`
      + `🔢 **الكود:** \`${data.code}\`\n`
      + `📊 **الكمية:** ${data.quantity}\n`
      + `💰 **القيمة:** ${(data.quantity! * data.unitPrice!).toFixed(2)} جنيه`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error saving spare part:', error)
    await ctx.reply('❌ حدث خطأ أثناء حفظ القطعة. الرجاء المحاولة مرة أخرى.')
    ctx.session.inventoryForm = undefined
  }
})

// Handle category selection during add flow
sparePartsItemsHandler.callbackQuery(/^sp:items:add:select_category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_category') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ctx.session.inventoryForm = undefined
    return
  }

  const categoryId = Number.parseInt(ctx.match![1], 10)

  // جلب التصنيف المختار لأخذ الكود
  const category = await Database.prisma.equipmentCategory.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    await ctx.reply('❌ التصنيف غير موجود')
    return
  }

  // 🔢 توليد الكود التلقائي
  const generatedCode = await generateInternalCode(category.code)

  // Update session with category and auto-generated code
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_location',
    data: {
      ...state.data,
      categoryId,
      code: generatedCode, // الكود المولَّد تلقائياً
    },
  }

  // Get locations for selection
  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  })

  if (locations.length === 0) {
    await ctx.reply('❌ لا توجد مواقع تخزين متاحة. الرجاء إضافة موقع أولاً من قسم الإعدادات.')
    ctx.session.inventoryForm = undefined
    return
  }

  const keyboard = new InlineKeyboard()
  for (const loc of locations) {
    keyboard.text(
      `📍 ${loc.nameAr}`,
      `sp:items:add:select_location:${loc.id}`,
    ).row()
  }
  keyboard.text('❌ إلغاء', 'sp:items:menu')

  await ctx.reply(
    `✅ تم اختيار التصنيف: **${category.nameAr}**\n`
    + `🔢 الكود المولّد تلقائياً: \`${generatedCode}\`\n\n`
    + '📍 **الآن اختر موقع التخزين:**\n\n'
    + 'اختر المكان الذي سيتم تخزين القطعة فيه:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Handle location selection during add flow
sparePartsItemsHandler.callbackQuery(/^sp:items:add:select_location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_location') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ctx.session.inventoryForm = undefined
    return
  }

  const locationId = Number.parseInt(ctx.match![1], 10)

  // Update session with location and move to condition selection
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_condition',
    data: { ...state.data, locationId },
  }

  // Ask for condition
  const keyboard = new InlineKeyboard()
    .text('🆕 جديد', 'sp:items:add:select_condition:NEW')
    .text('♻️ مستعمل', 'sp:items:add:select_condition:USED')
    .row()
    .text('� مجدد', 'sp:items:add:select_condition:REFURBISHED')
    .text('📦 استيراد', 'sp:items:add:select_condition:IMPORT')
    .row()
    .text('❌ إلغاء', 'sp:items:menu')

  await ctx.reply(
    '🏷️ **حالة القطعة:**\n\n'
    + '📋 **اختر حالة قطعة الغيار:**\n\n'
    + '• 🆕 **جديد** - قطعة جديدة تماماً\n'
    + '• 📦 **استيراد** - قطعة مستوردة جديدة\n'
    + '• � **مجدد** - قطعة تم تجديدها\n'
    + '• ♻️ **مستعمل** - قطعة مستعملة\n\n'
    + '⏳ **اختر من الأزرار أدناه:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج اختيار حالة القطعة
sparePartsItemsHandler.callbackQuery(/^sp:items:add:select_condition:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_condition') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ctx.session.inventoryForm = undefined
    return
  }

  const condition = ctx.match![1]

  // Update session with condition
  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_quantity',
    data: { ...state.data, condition },
  }

  const conditionText = {
    NEW: 'جديد 🆕',
    IMPORT: 'استيراد 📦',
    USED: 'مستعمل ♻️',
    REFURBISHED: 'مجدد �',
  }[condition] || condition

  await ctx.reply(
    `✅ تم اختيار الحالة: **${conditionText}**\n\n`
    + '📊 **أدخل الكمية:**\n\n'
    + '📝 **مثال:** `10`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    { parse_mode: 'Markdown' },
  )
})

// البحث بالباركود - يدوي
sparePartsItemsHandler.callbackQuery('sp:items:search:barcode-manual', async (ctx) => {
  await ctx.answerCallbackQuery()

  // حفظ حالة البحث بالباركود في الجلسة
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'search_by_barcode',
    data: {},
  }

  await ctx.editMessageText(
    '🔢 **البحث بالباركود - إدخال يدوي**\n\n'
    + '📝 **أدخل رقم الباركود:**\n\n'
    + '**مثال:** `6281234567890`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالكود
sparePartsItemsHandler.callbackQuery('sp:items:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  // حفظ حالة البحث بالكود في الجلسة
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'search_by_code',
    data: {},
  }

  await ctx.editMessageText(
    '🔢 **البحث بالكود الداخلي**\n\n'
    + '📝 **أدخل الكود:**\n\n'
    + '**مثال:** `CAR-ENG-00123`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالاسم
sparePartsItemsHandler.callbackQuery('sp:items:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  // حفظ حالة البحث بالاسم في الجلسة
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'search_by_name',
    data: {},
  }

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + '✍️ **أدخل اسم القطعة (عربي أو إنجليزي):**\n\n'
    + '**مثال:** فلتر زيت\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالتصنيف
sparePartsItemsHandler.callbackQuery('sp:items:search:category', async (ctx) => {
  await ctx.answerCallbackQuery()

  // جلب التصنيفات
  const categories = await Database.prisma.equipmentCategory.findMany({
    where: { isActive: true },
    orderBy: { nameAr: 'asc' },
    take: 20,
  })

  if (categories.length === 0) {
    await ctx.editMessageText(
      '❌ **لا توجد تصنيفات**\n\n'
      + 'لا توجد تصنيفات معرفة حالياً.\n'
      + 'يرجى إضافة تصنيفات أولاً.',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة تصنيف', 'sp:categories:add')
          .row()
          .text('⬅️ رجوع', 'sp:items:search'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const category of categories) {
    keyboard.text(`${category.icon || '🏷️'} ${category.nameAr}`, `sp:items:by-category:${category.id}`).row()
  }

  keyboard.text('⬅️ رجوع', 'sp:items:search')

  await ctx.editMessageText(
    '🏷️ **البحث بالتصنيف**\n\n'
    + `📊 **عدد التصنيفات:** ${categories.length}\n\n`
    + '👇 **اختر التصنيف:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض قطع تصنيف معين
sparePartsItemsHandler.callbackQuery(/^sp:items:by-category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const categoryId = Number.parseInt(ctx.match![1], 10)

  const category = await Database.prisma.equipmentCategory.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    await ctx.answerCallbackQuery({ text: '❌ التصنيف غير موجود', show_alert: true })
    return
  }

  const items = await Database.prisma.iNV_Item.findMany({
    where: {
      categoryId,
      isActive: true,
    },
    orderBy: { code: 'asc' },
    take: 20,
  })

  if (items.length === 0) {
    await ctx.editMessageText(
      `🏷️ **${category.nameAr}**\n\n`
      + '❌ **لا توجد قطع في هذا التصنيف**',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة قطعة', 'sp:items:add:start')
          .row()
          .text('⬅️ رجوع', 'sp:items:search:category'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const item of items) {
    const status = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'
    keyboard
      .text(`${status} ${item.nameAr} (${item.quantity})`, `sp:items:view:${item.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', 'sp:items:search:category')

  await ctx.editMessageText(
    `🏷️ **${category.nameAr}**\n\n`
    + `📊 **عدد القطع:** ${items.length}\n\n`
    + '**الحالة:**\n'
    + '🟢 كمية طبيعية\n'
    + '🟡 أقل من الحد الأدنى\n'
    + '🔴 نفذت\n\n'
    + '👇 **اختر قطعة لعرض التفاصيل:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ═══════════════════════════════════════════════════════
// عرض تفاصيل قطعة
// ═══════════════════════════════════════════════════════
sparePartsItemsHandler.callbackQuery(/^sp:items:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      location: true,
    },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // Debug: طباعة قيم الصور
  console.warn('🖼️ Image Debug:', {
    itemId: item.id,
    imagePath: item.imagePath,
    images: item.images,
    imagesType: typeof item.images,
    imagesIsArray: Array.isArray(item.images),
  })

  // عدد الصور المحفوظة (تحقق من imagePath و images)
  let additionalImages: string[] = []
  if (item.images) {
    // إذا كان string، نحوله لـ array
    if (typeof item.images === 'string') {
      try {
        additionalImages = JSON.parse(item.images)
      }
      catch {
        additionalImages = []
      }
    }
    else if (Array.isArray(item.images)) {
      additionalImages = item.images as string[]
    }
  }

  const totalImages = (item.imagePath ? 1 : 0) + additionalImages.length
  const hasImages = totalImages > 0

  console.warn('🖼️ After parsing:', { totalImages, hasImages, additionalImages })

  const stockStatus = item.quantity === 0 ? '🔴 نفذت' : item.quantity <= item.minQuantity ? '🟡 منخفضة' : '🟢 طبيعية'

  // تحويل حالة القطعة من الإنجليزية للعربية (غير مُستخدم الآن - الكميات مُفصّلة حسب الحالة)
  // const conditionMap: Record<string, string> = {
  //   NEW: '🆕 جديدة',
  //   USED: '♻️ مستعملة',
  //   REFURBISHED: '🔄 مجددة',
  //   IMPORT: '📦 استيراد',
  // }

  let message = '📦 **تفاصيل القطعة**\n\n'

  // معلومات أساسية
  message += `**الاسم:** ${item.nameAr}\n`
  if (item.nameEn) {
    message += `**Name:** ${item.nameEn}\n`
  }
  message += `**الكود:** \`${item.code}\`\n`
  message += `**الباركود:** \`${item.barcode}\`\n\n`

  // التصنيف والموقع
  message += `**التصنيف:** ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
  if (item.location) {
    message += `**الموقع:** 📍 ${item.location.nameAr}\n`
  }
  message += '\n'

  // الكميات (استخدام الدالة المساعدة)
  message += formatQuantityDetails(item)
  message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
  message += `**حالة المخزون:** ${stockStatus}\n\n`

  // الأسعار
  message += `**سعر الوحدة:** ${item.unitPrice.toFixed(2)} ${item.currency}\n`
  message += `**القيمة الإجمالية:** ${item.totalValue.toFixed(2)} ${item.currency}\n\n`

  // معلومات إضافية
  if (item.partNumber) {
    message += `**رقم القطعة:** ${item.partNumber}\n`
  }
  if (item.manufacturer) {
    message += `**الشركة المصنعة:** ${item.manufacturer}\n`
  }
  if (item.supplierName) {
    message += `**المورد:** ${item.supplierName}\n`
  }

  if (item.description) {
    message += `\n**الوصف:**\n${item.description}\n`
  }

  if (hasImages) {
    message += `\n📸 **الصور:** ${totalImages} صورة\n`
  }

  const keyboard = new InlineKeyboard()
    .text('✏️ تعديل', `sp:items:edit:${item.id}`)

  // إضافة زر عرض الصور إذا كانت موجودة
  if (hasImages) {
    keyboard.row().text('📸 عرض الصور', `sp:items:images:${item.id}`)
  }

  keyboard
    .row()
    .text('📊 الحركات', `sp:trans:item:${item.id}`)
    .row()
    .text('⬅️ رجوع', 'sp:items:search')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// معالج عرض صور القطعة
sparePartsItemsHandler.callbackQuery(/^sp:items:images:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // جمع كل الصور (الصورة الرئيسية + الصور الإضافية)
  const allImages: string[] = []

  if (item.imagePath) {
    allImages.push(item.imagePath)
  }

  // Parse JSON string إذا لزم الأمر
  if (item.images) {
    let additionalImages: string[] = []
    if (typeof item.images === 'string') {
      try {
        additionalImages = JSON.parse(item.images)
      }
      catch {
        additionalImages = []
      }
    }
    else if (Array.isArray(item.images)) {
      additionalImages = item.images as string[]
    }
    allImages.push(...additionalImages)
  }

  if (allImages.length === 0) {
    await ctx.answerCallbackQuery({ text: '📸 لا توجد صور لهذه القطعة', show_alert: true })
    return
  }

  try {
    // إرسال كل صورة
    for (let i = 0; i < allImages.length; i++) {
      const imagePath = allImages[i]

      // تحقق من وجود الملف
      const fs = await import('node:fs')
      const path = await import('node:path')
      const process = await import('node:process')

      const fullPath = path.join(process.cwd(), imagePath)

      if (!fs.existsSync(fullPath)) {
        await ctx.reply(`⚠️ الصورة ${i + 1} غير موجودة على الخادم`)
        continue
      }

      // إرسال الصورة
      const caption = i === 0 && item.imagePath
        ? `📸 الصورة الرئيسية\n📦 ${item.nameAr}\n🔢 ${item.code}`
        : `📸 صورة ${i + 1} من ${allImages.length}\n📦 ${item.nameAr}\n🔢 ${item.code}`

      await ctx.replyWithPhoto(new InputFile(fullPath), { caption })
    }

    // رسالة نهائية مع أزرار التحكم
    await ctx.reply(
      `✅ **تم عرض جميع الصور (${allImages.length})**\n\n`
      + `**📦 ${item.nameAr}**\n`
      + `**🔢 الكود:** \`${item.code}\``,
      {
        reply_markup: new InlineKeyboard()
          .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
          .row()
          .text('✏️ تعديل', `sp:items:edit:${itemId}`)
          .row()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error displaying images:', error)
    await ctx.reply('❌ حدث خطأ أثناء عرض الصور')
  }
})

// ═══════════════════════════════════════════════════════
// معالجات التعديل والحذف
// ═══════════════════════════════════════════════════════

// معالج تعديل قطعة - عرض القائمة
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      location: true,
    },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // عرض خيارات التعديل
  const keyboard = new InlineKeyboard()
    .text('📝 تعديل الاسم', `sp:items:edit:${item.id}:name`)
    .row()
    .text('📦 تعديل الكمية', `sp:items:edit:${item.id}:quantity`)
    .row()
    .text('� تعديل الحد الأدنى', `sp:items:edit:${item.id}:minQuantity`)
    .row()
    .text('�💰 تعديل السعر', `sp:items:edit:${item.id}:price`)
    .row()
    .text('🏷️ تعديل التصنيف', `sp:items:edit:${item.id}:category`)
    .row()
    .text('📍 تعديل الموقع', `sp:items:edit:${item.id}:location`)
    .row()
    .text('🔍 تعديل الحالة', `sp:items:edit:${item.id}:condition`)
    .row()
    .text('📝 تعديل الملاحظات', `sp:items:edit:${item.id}:notes`)
    .row()
    .text('🗑️ حذف القطعة', `sp:items:delete:${item.id}`)
    .row()
    .text('⬅️ رجوع', `sp:items:view:${item.id}`)

  await ctx.editMessageText(
    `✏️ **تعديل قطعة غيار**\n\n`
    + `**📦 ${item.nameAr}**\n`
    + `**🔢 الكود:** \`${item.code}\`\n\n`
    + '**اختر ما تريد تعديله:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج تعديل الاسم
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):name$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // حفظ حالة التعديل في الجلسة
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'edit_name',
    data: { itemId, currentValue: item.nameAr },
  }

  await ctx.editMessageText(
    `📝 **تعديل اسم القطعة**\n\n`
    + `**الاسم الحالي:** ${item.nameAr}\n\n`
    + '✍️ **أدخل الاسم الجديد (عربي):**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:items:edit:${itemId}`),
      parse_mode: 'Markdown',
    },
  )
})

// معالج تعديل الكمية
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):quantity$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // حفظ حالة التعديل في الجلسة
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'edit_quantity',
    data: { itemId, currentValue: item.quantity },
  }

  await ctx.editMessageText(
    `📦 **تعديل الكمية**\n\n`
    + `**الكمية الحالية:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
    + '✍️ **أدخل الكمية الجديدة:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:items:edit:${itemId}`),
      parse_mode: 'Markdown',
    },
  )
})

// معالج تعديل الحد الأدنى للكمية
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):minQuantity$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // حفظ حالة التعديل في الجلسة
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'edit_minQuantity',
    data: { itemId, currentValue: item.minQuantity },
  }

  await ctx.editMessageText(
    `📊 **تعديل الحد الأدنى للكمية**\n\n`
    + `**الحد الأدنى الحالي:** ${item.minQuantity} ${item.unit || 'قطعة'}\n\n`
    + '✍️ **أدخل الحد الأدنى الجديد:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:items:edit:${itemId}`),
      parse_mode: 'Markdown',
    },
  )
})

// معالج تعديل السعر
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):price$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // حفظ حالة التعديل في الجلسة
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'edit_price',
    data: { itemId, currentValue: item.unitPrice },
  }

  await ctx.editMessageText(
    `💰 **تعديل سعر الوحدة**\n\n`
    + `**السعر الحالي:** ${item.unitPrice.toFixed(2)} جنيه\n\n`
    + '✍️ **أدخل السعر الجديد:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:items:edit:${itemId}`),
      parse_mode: 'Markdown',
    },
  )
})

// معالج تعديل التصنيف
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):category$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
    include: { category: true },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // جلب التصنيفات
  const categories = await Database.prisma.equipmentCategory.findMany({
    where: { isActive: true },
    orderBy: { nameAr: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const category of categories) {
    const isSelected = category.id === item.categoryId
    keyboard.text(
      `${isSelected ? '✅ ' : ''}${category.icon || '🏷️'} ${category.nameAr}`,
      `sp:items:edit:${itemId}:category:${category.id}`,
    ).row()
  }

  keyboard.text('❌ إلغاء', `sp:items:edit:${itemId}`)

  await ctx.editMessageText(
    `🏷️ **تعديل التصنيف**\n\n`
    + `**التصنيف الحالي:** ${item.category?.nameAr || 'غير محدد'}\n\n`
    + '👇 **اختر التصنيف الجديد:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج تأكيد تعديل التصنيف
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري التحديث...' })

  const itemId = Number.parseInt(ctx.match![1], 10)
  const categoryId = Number.parseInt(ctx.match![2], 10)

  try {
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: { category: true },
    })

    const newCategory = await Database.prisma.equipmentCategory.findUnique({
      where: { id: categoryId },
    })

    if (!item || !newCategory) {
      await ctx.answerCallbackQuery({ text: '❌ خطأ في البيانات', show_alert: true })
      return
    }

    // تحديث التصنيف
    await Database.prisma.iNV_Item.update({
      where: { id: itemId },
      data: { categoryId },
    })

    await ctx.editMessageText(
      `✅ **تم تحديث التصنيف بنجاح**\n\n`
      + `**من:** ${item.category?.nameAr || 'غير محدد'}\n`
      + `**إلى:** ${newCategory.nameAr}`,
      {
        reply_markup: new InlineKeyboard()
          .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
          .row()
          .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
          .row()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error updating item category:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ أثناء التحديث', show_alert: true })
  }
})

// معالج تعديل الموقع
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):location$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
    include: { location: true },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // جلب المواقع
  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    where: { isActive: true },
    orderBy: { nameAr: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const location of locations) {
    const isSelected = location.id === item.locationId
    keyboard.text(
      `${isSelected ? '✅ ' : ''}📍 ${location.nameAr}`,
      `sp:items:edit:${itemId}:location:${location.id}`,
    ).row()
  }

  keyboard.text('❌ إلغاء', `sp:items:edit:${itemId}`)

  await ctx.editMessageText(
    `📍 **تعديل الموقع**\n\n`
    + `**الموقع الحالي:** ${item.location?.nameAr || 'غير محدد'}\n\n`
    + '👇 **اختر الموقع الجديد:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج تأكيد تعديل الموقع
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري التحديث...' })

  const itemId = Number.parseInt(ctx.match![1], 10)
  const locationId = Number.parseInt(ctx.match![2], 10)

  try {
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: { location: true },
    })

    const newLocation = await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: locationId },
    })

    if (!item || !newLocation) {
      await ctx.answerCallbackQuery({ text: '❌ خطأ في البيانات', show_alert: true })
      return
    }

    // تحديث الموقع
    await Database.prisma.iNV_Item.update({
      where: { id: itemId },
      data: { locationId },
    })

    await ctx.editMessageText(
      `✅ **تم تحديث الموقع بنجاح**\n\n`
      + `**من:** ${item.location?.nameAr || 'غير محدد'}\n`
      + `**إلى:** ${newLocation.nameAr}`,
      {
        reply_markup: new InlineKeyboard()
          .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
          .row()
          .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
          .row()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error updating item location:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ أثناء التحديث', show_alert: true })
  }
})

// معالج تعديل الحالة
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):condition$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  const conditions = [
    { value: 'NEW', label: '🆕 جديد', emoji: '🆕' },
    { value: 'IMPORT', label: '🌍 مستورد', emoji: '🌍' },
    { value: 'USED', label: '♻️ مستعمل', emoji: '♻️' },
  ]

  const keyboard = new InlineKeyboard()

  for (const condition of conditions) {
    const isSelected = condition.value === item.condition
    keyboard.text(
      `${isSelected ? '✅ ' : ''}${condition.label}`,
      `sp:items:edit:${itemId}:condition:${condition.value}`,
    ).row()
  }

  keyboard.text('❌ إلغاء', `sp:items:edit:${itemId}`)

  const currentCondition = conditions.find(c => c.value === item.condition)

  await ctx.editMessageText(
    `🔍 **تعديل حالة القطعة**\n\n`
    + `**الحالة الحالية:** ${currentCondition?.label || 'غير محدد'}\n\n`
    + '👇 **اختر الحالة الجديدة:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج تأكيد تعديل الحالة
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):condition:(NEW|IMPORT|USED)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري التحديث...' })

  const itemId = Number.parseInt(ctx.match![1], 10)
  const newCondition = ctx.match![2] as 'NEW' | 'IMPORT' | 'USED'

  try {
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
      return
    }

    const conditions = [
      { value: 'NEW', label: '🆕 جديد' },
      { value: 'IMPORT', label: '🌍 مستورد' },
      { value: 'USED', label: '♻️ مستعمل' },
    ]

    const oldCondition = conditions.find(c => c.value === item.condition)
    const newConditionObj = conditions.find(c => c.value === newCondition)

    // تحديث الحالة
    await Database.prisma.iNV_Item.update({
      where: { id: itemId },
      data: { condition: newCondition },
    })

    await ctx.editMessageText(
      `✅ **تم تحديث الحالة بنجاح**\n\n`
      + `**من:** ${oldCondition?.label || 'غير محدد'}\n`
      + `**إلى:** ${newConditionObj?.label}`,
      {
        reply_markup: new InlineKeyboard()
          .text('📦 عرض التفاصيل', `sp:items:view:${itemId}`)
          .row()
          .text('✏️ تعديل آخر', `sp:items:edit:${itemId}`)
          .row()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error updating item condition:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ أثناء التحديث', show_alert: true })
  }
})

// معالج تعديل الملاحظات
sparePartsItemsHandler.callbackQuery(/^sp:items:edit:(\d+):notes$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  // حفظ حالة التعديل في الجلسة
  ctx.session.inventoryForm = {
    action: 'edit',
    step: 'edit_notes',
    data: { itemId, currentValue: item.notes },
  }

  await ctx.editMessageText(
    `📝 **تعديل الملاحظات**\n\n`
    + `**الملاحظات الحالية:**\n${item.notes || 'لا توجد ملاحظات'}\n\n`
    + '✍️ **أدخل الملاحظات الجديدة:**\n'
    + '(أو أرسل "حذف" لإزالة الملاحظات)',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:items:edit:${itemId}`),
      parse_mode: 'Markdown',
    },
  )
})

// معالج تأكيد الحذف
sparePartsItemsHandler.callbackQuery(/^sp:items:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  const item = await Database.prisma.iNV_Item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
    return
  }

  const keyboard = new InlineKeyboard()
    .text('⚠️ نعم، احذف القطعة', `sp:items:delete:confirm:${item.id}`)
    .row()
    .text('❌ إلغاء', `sp:items:view:${item.id}`)

  await ctx.editMessageText(
    `⚠️ **تأكيد حذف القطعة**\n\n`
    + `**📦 ${item.nameAr}**\n`
    + `**🔢 الكود:** \`${item.code}\`\n`
    + `**📊 الكمية:** ${item.quantity} ${item.unit || 'قطعة'}\n`
    + `**💵 القيمة:** ${item.totalValue.toFixed(2)} جنيه\n\n`
    + '⚠️ **تنبيه:** سيتم حذف القطعة بشكل نهائي (حذف ناعم)\n'
    + 'يمكن استرجاعها لاحقاً من قائمة المحذوفات\n\n'
    + '**هل أنت متأكد من الحذف؟**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج تنفيذ الحذف الناعم
sparePartsItemsHandler.callbackQuery(/^sp:items:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري الحذف...' })

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!item) {
      await ctx.editMessageText('❌ القطعة غير موجودة')
      return
    }

    // حذف ناعم - تحديث isActive إلى false
    await Database.prisma.iNV_Item.update({
      where: { id: itemId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // تسجيل عملية الحذف في سجل التعديلات
    // TODO: بعد تشغيل npx prisma generate، قم بإلغاء التعليق عن الكود التالي:
    /*
    await Database.prisma.iNV_ItemHistory.create({
      data: {
        itemId,
        itemType: 'SPARE_PART',
        action: 'DELETE',
        performedBy: BigInt(ctx.from!.id),
        oldData: {
          barcode: item.barcode,
          code: item.code,
          nameAr: item.nameAr,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalValue: item.totalValue,
          categoryId: item.categoryId,
          locationId: item.locationId,
          condition: item.condition,
        },
        notes: 'حذف ناعم للقطعة',
        reason: 'حذف بواسطة المستخدم',
      },
    })
    */

    // إرسال تقرير للأدمن
    sendDeleteReportToAdmins(ctx, item).catch((err) => {
      console.error('Error sending delete report:', err)
    })

    await ctx.editMessageText(
      '✅ **تم حذف القطعة بنجاح**\n\n'
      + `**📦 ${item.nameAr}**\n`
      + `**🔢 الكود:** \`${item.code}\`\n\n`
      + '📝 تم تسجيل عملية الحذف في سجل التعديلات\n'
      + '💡 يمكن استرجاع القطعة من قائمة المحذوفات',
      {
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع للقائمة', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error deleting spare part:', error)
    await ctx.editMessageText(
      '❌ **حدث خطأ أثناء الحذف**\n\n'
      + 'الرجاء المحاولة مرة أخرى.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ═══════════════════════════════════════════════════════
// عرض جميع القطع
// ═══════════════════════════════════════════════════════
sparePartsItemsHandler.callbackQuery(/^sp:items:list(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = ctx.match?.[1] ? Number.parseInt(ctx.match[1], 10) : 1
  const pageSize = 15
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    Database.prisma.iNV_Item.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: { code: 'asc' },
      skip,
      take: pageSize,
    }),
    Database.prisma.iNV_Item.count({
      where: { isActive: true },
    }),
  ])

  if (items.length === 0) {
    await ctx.editMessageText(
      '📊 **جميع قطع الغيار**\n\n'
      + '❌ **لا توجد قطع غيار**\n\n'
      + 'لم يتم إضافة أي قطع بعد',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة قطعة', 'sp:items:add:start')
          .row()
          .text('⬅️ رجوع', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const item of items) {
    const status = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'
    const categoryIcon = item.category.icon || '🏷️'
    keyboard
      .text(
        `${status} ${categoryIcon} ${item.nameAr} (${item.quantity})`,
        `sp:items:view:${item.id}`,
      )
      .row()
  }

  // Pagination
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages > 1) {
    const paginationRow: InlineKeyboard = new InlineKeyboard()
    if (page > 1) {
      paginationRow.text('◀️ السابق', `sp:items:list:${page - 1}`)
    }
    paginationRow.text(`${page}/${totalPages}`, 'sp:items:list:noop')
    if (page < totalPages) {
      paginationRow.text('التالي ▶️', `sp:items:list:${page + 1}`)
    }
    keyboard.row()
    keyboard.append(paginationRow)
  }

  keyboard.row().text('🔍 بحث متقدم', 'sp:items:search').text('⬅️ رجوع', 'sp:items:menu')

  await ctx.editMessageText(
    '📊 **جميع قطع الغيار**\n\n'
    + `📦 **إجمالي القطع:** ${total}\n`
    + `📄 **الصفحة:** ${page}/${totalPages}\n\n`
    + '**الحالة:**\n'
    + '🟢 كمية طبيعية | 🟡 منخفضة | 🔴 نفذت\n\n'
    + '👇 **اختر قطعة:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Pagination noop
sparePartsItemsHandler.callbackQuery('sp:items:list:noop', async (ctx) => {
  await ctx.answerCallbackQuery()
})

// مسح باركود سريع
// ============================================
// معالجات أزرار التخطي
// ============================================

// معالج زر تخطي السعر
sparePartsItemsHandler.callbackQuery('sp:items:add:skip_price', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_price') {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_notes',
    data: { ...state.data, unitPrice: 0 },
  }

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', 'sp:items:add:skip_notes')
    .row()
    .text('❌ إلغاء', 'sp:items:menu')

  await ctx.editMessageText(
    '⏭️ **تم تخطي السعر**\n\n'
    + '📝 **أدخل ملاحظات (اختياري):**\n\n'
    + '✍️ أضف أي ملاحظات إضافية عن القطعة\n\n'
    + '⏳ **أو اضغط "تخطي" للمتابعة...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج زر تخطي الملاحظات
sparePartsItemsHandler.callbackQuery('sp:items:add:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_notes') {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  ctx.session.inventoryForm = {
    ...state,
    step: 'awaiting_images',
    data: { ...state.data, notes: undefined },
  }

  const keyboard = new InlineKeyboard()
    .text('✅ إنهاء وحفظ', 'sp:items:add:skip_images')
    .row()
    .text('❌ إلغاء', 'sp:items:menu')

  await ctx.editMessageText(
    '⏭️ **تم تخطي الملاحظات**\n\n'
    + '📸 **أرسل صور المنتج (اختياري):**\n\n'
    + '📷 يمكنك إرسال صورة أو أكثر للقطعة\n\n'
    + '⏳ **أو اضغط "إنهاء وحفظ" للمتابعة بدون صور...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج زر إنهاء بدون صور
sparePartsItemsHandler.callbackQuery('sp:items:add:skip_images', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = ctx.session.inventoryForm
  if (!state || state.step !== 'awaiting_images') {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  // Move to confirmation
  await showFinalConfirmation(ctx)
})

// ============================================
// دالة عرض التأكيد النهائي
// ============================================
async function showFinalConfirmation(ctx: any) {
  const state = ctx.session.inventoryForm
  if (!state) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  const data = state.data

  // Get category and location details
  const category = await Database.prisma.equipmentCategory.findUnique({
    where: { id: data.categoryId },
  })
  const location = data.locationId
    ? await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: data.locationId },
    })
    : null

  const conditionMap: Record<string, string> = {
    NEW: '🆕 جديدة',
    USED: '♻️ مستعملة',
    REFURBISHED: '🔄 استيراد',
    IMPORT: '📦 استيراد',
  }
  const conditionText = conditionMap[data.condition as string] || data.condition

  const totalValue = (data.quantity || 0) * (data.unitPrice || 0)
  const imagesCount = (data.images || []).length

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد الحفظ', 'sp:items:add:confirm_save')
    .row()
    .text('❌ إلغاء', 'sp:items:menu')

  const message
    = '📋 **مراجعة البيانات النهائية**\n\n'
      + '═══════════════════\n\n'
      + `🔢 **الباركود:** \`${data.barcode}\`\n`
      + `📝 **الاسم (عربي):** ${data.nameAr}\n`
      + `🔢 **الكود:** \`${data.code}\`\n`
      + `🏷️ **التصنيف:** ${category?.nameAr || 'غير محدد'}\n`
      + `📍 **الموقع:** ${location?.nameAr || 'غير محدد'}\n`
      + `🔍 **الحالة:** ${conditionText}\n`
      + `📦 **الكمية:** ${data.quantity || 0}\n`
      + `💰 **سعر الوحدة:** ${data.unitPrice ? `${data.unitPrice.toFixed(2)} جنيه` : 'غير محدد'}\n`
      + `💵 **القيمة الإجمالية:** ${totalValue.toFixed(2)} جنيه\n`
      + `📸 **الصور:** ${imagesCount} صورة\n`
      + `${data.notes ? `📝 **ملاحظات:** ${data.notes}\n` : ''}`
      + '\n═══════════════════\n\n'
      + '**هل تريد تأكيد حفظ هذه البيانات؟**'

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  else {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
}

// معالج تأكيد الحفظ
sparePartsItemsHandler.callbackQuery('sp:items:add:confirm_save', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري الحفظ...' })

  const state = ctx.session.inventoryForm
  if (!state) {
    await ctx.editMessageText('❌ حدث خطأ. لا توجد بيانات للحفظ.')
    return
  }

  const data = state.data

  try {
    // ✅ توزيع الكمية حسب الحالة (مثل كود الشراء)
    const quantity = data.quantity || 0
    const condition = data.condition || 'NEW'

    const quantityByCondition: any = {
      quantityNew: 0,
      quantityUsed: 0,
      quantityRefurbished: 0,
      quantityImport: 0,
    }

    // توزيع الكمية على الحقل المناسب
    switch (condition) {
      case 'NEW':
        quantityByCondition.quantityNew = quantity
        break
      case 'USED':
        quantityByCondition.quantityUsed = quantity
        break
      case 'REFURBISHED':
        quantityByCondition.quantityRefurbished = quantity
        break
      case 'IMPORT':
        quantityByCondition.quantityImport = quantity
        break
      default:
        // إذا كانت الحالة غير معروفة، ضع في "جديد"
        quantityByCondition.quantityNew = quantity
    }

    // Save to database
    const newItem = await Database.prisma.iNV_Item.create({
      data: {
        barcode: data.barcode,
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn || null,
        categoryId: data.categoryId,
        locationId: data.locationId || null,
        condition,
        quantity,
        quantityNew: quantityByCondition.quantityNew,
        quantityUsed: quantityByCondition.quantityUsed,
        quantityRefurbished: quantityByCondition.quantityRefurbished,
        quantityImport: quantityByCondition.quantityImport,
        unitPrice: data.unitPrice || 0,
        totalValue: quantity * (data.unitPrice || 0),
        notes: data.notes || null,
        images: data.images ? JSON.stringify(data.images) : undefined,
        createdBy: BigInt(ctx.from!.id),
        isActive: true,
      },
    })

    // Clear session
    ctx.session.inventoryForm = undefined

    // Get category and location for report
    const category = await Database.prisma.equipmentCategory.findUnique({
      where: { id: data.categoryId },
    })
    const location = data.locationId
      ? await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: data.locationId },
      })
      : null

    // Send report to all inventory admins (silently in background)
    sendReportToAdmins(ctx, newItem, category, location).catch((err) => {
      console.error('Error sending reports to admins:', err)
    })

    // Parse images if exists
    let imagesInfo = ''
    if (newItem.images) {
      try {
        const imagesStr = typeof newItem.images === 'string' ? newItem.images : JSON.stringify(newItem.images)
        const imagesParsed = JSON.parse(imagesStr)
        if (Array.isArray(imagesParsed) && imagesParsed.length > 0) {
          imagesInfo = `📸 **عدد الصور:** ${imagesParsed.length} صورة\n`
        }
      }
      catch {
        // Ignore parse errors
      }
    }

    const conditionMap: Record<string, string> = {
      NEW: '🆕 جديدة',
      USED: '♻️ مستعملة',
      REFURBISHED: '🔄 استيراد',
      IMPORT: '📦 استيراد',
    }
    const conditionText = conditionMap[newItem.condition as string] || newItem.condition

    // Send detailed success message to user
    await ctx.editMessageText(
      '✅ **تم حفظ قطعة الغيار بنجاح!**\n\n'
      + '═══════════════════════════\n\n'
      + '**📦 معلومات القطعة:**\n\n'
      + `🔢 **الباركود:** \`${newItem.barcode}\`\n`
      + `📝 **الاسم العربي:** ${newItem.nameAr}\n`
      + `${newItem.nameEn ? `📝 **الاسم الإنجليزي:** ${newItem.nameEn}\n` : ''}`
      + `🔢 **الكود الداخلي:** \`${newItem.code}\`\n\n`
      + '**🏷️ التصنيف والموقع:**\n\n'
      + `• التصنيف: ${category?.icon || '📦'} ${category?.nameAr || 'غير محدد'}\n`
      + `• موقع التخزين: 📍 ${location?.nameAr || 'غير محدد'}\n`
      + `• الحالة: ${conditionText}\n\n`
      + '**💰 الكميات والأسعار:**\n\n'
      + `• الكمية المضافة: **${newItem.quantity}** ${newItem.unit || 'قطعة'}\n`
      + `• سعر الوحدة: **${newItem.unitPrice.toFixed(2)}** جنيه\n`
      + `• القيمة الإجمالية: **${newItem.totalValue.toFixed(2)}** جنيه\n`
      + `• الحد الأدنى للكمية: ${newItem.minQuantity || 5} ${newItem.unit || 'قطعة'}\n\n`
      + `${imagesInfo}`
      + `${newItem.notes ? `📝 **ملاحظات:**\n${newItem.notes}\n\n` : ''}`
      + '═══════════════════════════\n\n'
      + '📨 **تم إرسال تقرير للمسؤولين**',
      { parse_mode: 'Markdown' },
    )

    // Show options to user
    const keyboard = new InlineKeyboard()
      .text('➕ إضافة قطعة جديدة', 'sp:items:add:start')
      .row()
      .text('📦 إدارة قطع الغيار', 'sp:items:menu')
      .row()
      .text('⬅️ القائمة الرئيسية', 'menu:feature:inventory-management')

    await ctx.reply(
      '✨ **ماذا تريد أن تفعل الآن؟**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error saving spare part:', error)
    await ctx.editMessageText(
      '❌ **حدث خطأ أثناء الحفظ**\n\n'
      + 'الرجاء المحاولة مرة أخرى.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:items:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ============================================
// دالة إرسال التقرير للأدمن
// ============================================
async function sendReportToAdmins(ctx: any, item: any, category: any, location: any) {
  try {
    console.warn('📨 Starting sendReportToAdmins...')

    // Get inventory-management department first
    const dept = await Database.prisma.departmentConfig.findUnique({
      where: { code: 'inventory-management' },
    })

    if (!dept) {
      console.error('❌ Inventory department not found in departmentConfig table')
      return
    }

    console.warn('✅ Department found:', dept.id, dept.name)

    // Get all inventory admins
    const admins = await Database.prisma.departmentAdmin.findMany({
      where: {
        departmentId: dept.id,
        isActive: true,
      },
    })

    console.warn(`📋 Found ${admins.length} active admins for inventory department`)

    if (admins.length === 0) {
      console.warn('⚠️ No admins found for inventory-management department')
      return
    }

    const conditionMap: Record<string, string> = {
      NEW: '🆕 جديدة',
      USED: '♻️ مستعملة',
      REFURBISHED: '🔄 استيراد',
      IMPORT: '📦 استيراد',
    }
    const conditionText = conditionMap[item.condition as string] || item.condition

    // Parse images if exists
    let imagesInfo = ''
    if (item.images) {
      try {
        const imagesParsed = JSON.parse(item.images)
        if (Array.isArray(imagesParsed) && imagesParsed.length > 0) {
          imagesInfo = `📸 **عدد الصور:** ${imagesParsed.length} صورة\n`
        }
      }
      catch {
        // Ignore parse errors
      }
    }

    const report
      = '🆕 **تقرير: تسجيل قطعة غيار جديدة**\n\n'
        + '═══════════════════════════\n\n'
        + '**👤 معلومات المستخدم:**\n'
        + `• الاسم: ${ctx.from?.first_name || 'غير معروف'}${ctx.from?.last_name ? ` ${ctx.from.last_name}` : ''}\n`
        + `• المعرف: @${ctx.from?.username || 'غير متوفر'}\n`
        + `• التاريخ: ${new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}\n\n`
        + '**📦 معلومات القطعة:**\n\n'
        + `🔢 **الباركود:** \`${item.barcode}\`\n`
        + `📝 **الاسم العربي:** ${item.nameAr}\n`
        + `${item.nameEn ? `🔤 **الاسم الإنجليزي:** ${item.nameEn}\n` : ''}`
        + `🔢 **الكود الداخلي:** \`${item.code}\`\n\n`
        + '**🏷️ التصنيف والموقع:**\n\n'
        + `• التصنيف: ${category?.icon || '📦'} ${category?.nameAr || 'غير محدد'}\n`
        + `• موقع التخزين: ${location?.icon || '📍'} ${location?.nameAr || 'غير محدد'}\n`
        + `• الحالة: ${conditionText}\n\n`
        + '**💰 الكميات والأسعار:**\n\n'
        + `• الكمية المضافة: **${item.quantity}** ${item.unit || 'قطعة'}\n`
        + `• سعر الوحدة: **${item.unitPrice.toFixed(2)}** جنيه\n`
        + `• القيمة الإجمالية: **${item.totalValue.toFixed(2)}** جنيه\n`
        + `• الحد الأدنى للكمية: ${item.minQuantity || 5} ${item.unit || 'قطعة'}\n\n`
        + `${imagesInfo}`
        + `${item.notes ? `📝 **ملاحظات:**\n${item.notes}\n\n` : ''}`
        + '═══════════════════════════'

    const keyboard = new InlineKeyboard()
      .text('📦 عرض التفاصيل', `sp:items:view:${item.id}`)
      .row()
      .text('➕ إضافة قطعة جديدة', 'sp:items:add:start')
      .row()
      .text('📦 إدارة قطع الغيار', 'sp:items:menu')

    // Send to all admins
    for (const admin of admins) {
      if (admin.telegramId && Number(admin.telegramId) !== ctx.from?.id) {
        try {
          console.warn(`📤 Sending report to admin: ${admin.telegramId}`)
          await ctx.api.sendMessage(Number(admin.telegramId), report, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          })
          console.warn(`✅ Report sent successfully to admin: ${admin.telegramId}`)
        }
        catch (err) {
          console.error(`❌ Failed to send report to admin ${admin.telegramId}:`, err)
        }
      }
      else {
        console.warn(`⏭️ Skipping admin ${admin.telegramId} (same as sender or no telegramId)`)
      }
    }
  }
  catch (error) {
    console.error('Error sending reports to admins:', error)
  }
}

// ============================================
// دالة إرسال تقرير الحذف للأدمن
// ============================================
async function sendDeleteReportToAdmins(ctx: any, item: any) {
  try {
    // Get inventory-management department first
    const dept = await Database.prisma.departmentConfig.findUnique({
      where: { code: 'inventory-management' },
    })

    if (!dept) {
      console.error('Inventory department not found')
      return
    }

    // Get all inventory admins
    const admins = await Database.prisma.departmentAdmin.findMany({
      where: {
        departmentId: dept.id,
        isActive: true,
      },
    })

    const report
      = '🗑️ **تقرير: حذف قطعة غيار**\n\n'
        + '═══════════════════════════\n\n'
        + '**👤 معلومات المستخدم:**\n'
        + `• الاسم: ${ctx.from?.first_name || 'غير معروف'}${ctx.from?.last_name ? ` ${ctx.from.last_name}` : ''}\n`
        + `• المعرف: @${ctx.from?.username || 'غير متوفر'}\n`
        + `• التاريخ: ${new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}\n\n`
        + '**📦 معلومات القطعة المحذوفة:**\n\n'
        + `🔢 **الباركود:** \`${item.barcode}\`\n`
        + `📝 **الاسم:** ${item.nameAr}\n`
        + `🔢 **الكود:** \`${item.code}\`\n`
        + `📦 **الكمية:** ${item.quantity} ${item.unit || 'قطعة'}\n`
        + `💰 **سعر الوحدة:** ${item.unitPrice.toFixed(2)} جنيه\n`
        + `💵 **القيمة الإجمالية:** ${item.totalValue.toFixed(2)} جنيه\n\n`
        + '⚠️ **نوع الحذف:** حذف ناعم (يمكن الاسترجاع)\n\n'
        + '═══════════════════════════'

    const keyboard = new InlineKeyboard()
      .text('📋 قائمة المحذوفات', 'sp:items:deleted')
      .row()
      .text('📦 إدارة قطع الغيار', 'sp:items:menu')

    // Send to all admins
    for (const admin of admins) {
      if (admin.telegramId && Number(admin.telegramId) !== ctx.from?.id) {
        try {
          await ctx.api.sendMessage(Number(admin.telegramId), report, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          })
        }
        catch (err) {
          console.error(`Failed to send delete report to admin ${admin.telegramId}:`, err)
        }
      }
    }
  }
  catch (error) {
    console.error('Error sending delete reports to admins:', error)
  }
}

export default sparePartsItemsHandler
