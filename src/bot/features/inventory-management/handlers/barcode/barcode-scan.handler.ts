/**
 * Barcode Scan Handler
 * معالج مسح الباركود
 */

import type { Context } from '../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { BarcodeScannerService } from '../../../../../modules/services/barcode-scanner/index.js'
import { InventoryBarcodeService } from '../../services/inventory-barcode.service.js'
import { logger } from '../../../../../modules/services/logger/index.js'

export const inventoryBarcodeHandler = new Composer<Context>()

interface BarcodeScanState {
  action: 'search' | 'receiving' | 'dispensing' | 'return'
  warehouseId?: number
  purchaseOrderId?: number
}

/**
 * زر "مسح باركود" في قائمة المخزن
 */
inventoryBarcodeHandler.callbackQuery(/^inv:warehouse:(\d+):scan$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.barcodeScan = {
    action: 'search',
    warehouseId,
  }

  const keyboard = new InlineKeyboard()
    .text('⌨️ إدخال يدوي', `inv:warehouse:${warehouseId}:search`)
    .row()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  await ctx.editMessageText(
    '📱 **مسح الباركود**\n\n' +
    '📸 **الطريقة 1:** اضغط زر الكاميرا 📷 في Telegram ثم التقط صورة الباركود\n\n' +
    '⌨️ **الطريقة 2:** أدخل رقم الباركود (SKU) يدوياً\n\n' +
    '💡 **نصائح:**\n' +
    '• تأكد من وضوح الصورة\n' +
    '• اجعل الباركود في المنتصف\n' +
    '• تجنب الظلال والانعكاسات',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * معالج الصور (من الكاميرا أو المعرض)
 */
inventoryBarcodeHandler.on('message:photo', async (ctx) => {
  if (!ctx.session?.barcodeScan) {
    return // ليس في وضع مسح باركود
  }

  const state = ctx.session.barcodeScan as BarcodeScanState

  try {
    await ctx.reply('🔍 جاري قراءة الباركود...')

    // جلب الصورة
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const file = await ctx.api.getFile(photo.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`

    // تحميل الصورة
    const response = await fetch(fileUrl)
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    // قراءة الباركود
    const result = await BarcodeScannerService.scanBarcode(imageBuffer)

    if (!result || !result.data) {
      await ctx.reply(
        '❌ **لم يتم العثور على باركود**\n\n' +
        '💡 **حاول:**\n' +
        '• تحسين إضاءة الصورة\n' +
        '• جعل الباركود في المنتصف\n' +
        '• إعادة المحاولة',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔄 إعادة المحاولة', `inv:warehouse:${state.warehouseId}:scan`)
            .row()
            .text('⌨️ إدخال يدوي', `inv:warehouse:${state.warehouseId}:search`),
        },
      )
      return
    }

    const sku = result.data.trim()

    // البحث عن الصنف
    const itemData = await InventoryBarcodeService.findItemByBarcode(sku)

    if (!itemData) {
      await ctx.reply(
        `❌ **الصنف غير موجود**\n\n` +
        `الباركود المقروء: \`${sku}\`\n\n` +
        `هل تريد إضافة هذا الصنف؟`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('➕ إضافة صنف جديد', `inv:item:add:${sku}`)
            .row()
            .text('🔄 إعادة المحاولة', `inv:warehouse:${state.warehouseId}:scan`),
        },
      )
      return
    }

    // عرض النتائج
    await handleBarcodeScanResult(ctx, itemData, state)
    delete ctx.session.barcodeScan
  } catch (error) {
    logger.error({ error }, 'Error scanning barcode')
    await ctx.reply('❌ حدث خطأ أثناء قراءة الباركود. حاول مرة أخرى.')
  }
})

/**
 * معالج عرض نتيجة المسح
 */
async function handleBarcodeScanResult(
  ctx: Context,
  itemData: Awaited<ReturnType<typeof InventoryBarcodeService.findItemByBarcode>>,
  state: BarcodeScanState,
) {
  if (!itemData) return

  const { item, stocks } = itemData

  // بناء رسالة العرض
  let message = `📦 **${item.name}**\n\n`
  message += `🏷️ **SKU:** \`${item.sku}\`\n`
  message += `📊 **الفئة:** ${item.category.name}\n`
  message += `📏 **الوحدة:** ${item.unit}\n\n`

  if (stocks.length > 0) {
    message += `📊 **الأرصدة المتاحة:**\n`
    stocks.forEach(stock => {
      const icon = getWarehouseIcon(stock.warehouse.type)
      message += `• ${icon} ${stock.warehouse.name}: ${stock.quantity} ${item.unit} (${stock.averageCost.toFixed(2)} جنيه)\n`
    })
  } else {
    message += `⚠️ **لا يوجد رصيد في أي مخزن**\n`
  }

  // بناء الأزرار حسب الإجراء
  const keyboard = new InlineKeyboard()

  if (state.action === 'search') {
    // عرض جميع الخيارات
    keyboard
      .text('📥 استلام', `inv:receiving:start:${item.id}`)
      .text('📤 صرف', `inv:dispensing:start:${item.id}`)
      .row()
      .text('🔐 عهدة', `inv:custody:issue:${item.id}`)
      .text('↩️ إرجاع', `inv:return:start:${item.id}`)
      .row()
      .text('📋 تفاصيل الصنف', `inv:item:details:${item.id}`)
      .row()
      .text('⬅️ رجوع', `inv:warehouse:${state.warehouseId}`)
  } else if (state.action === 'receiving') {
    // أثناء الاستلام
    keyboard
      .text('✅ استخدام هذا الصنف', `inv:receiving:add-item:${item.id}:${state.purchaseOrderId}`)
      .row()
      .text('🔄 مسح آخر', `inv:warehouse:${state.warehouseId}:scan`)
      .row()
      .text('❌ إلغاء', `inv:receiving:cancel:${state.purchaseOrderId}`)
  } else if (state.action === 'dispensing') {
    // أثناء الصرف
    keyboard
      .text('✅ صرف هذا الصنف', `inv:dispensing:add-item:${item.id}:${state.warehouseId}`)
      .row()
      .text('🔄 مسح آخر', `inv:warehouse:${state.warehouseId}:scan`)
      .row()
      .text('❌ إلغاء', `inv:warehouse:${state.warehouseId}`)
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

function getWarehouseIcon(type: string): string {
  const icons: Record<string, string> = {
    SPARE_PARTS: '⚙️',
    DIESEL: '⛽',
    OILS_GREASES: '🛢️',
    TOOLS: '🛠️',
  }
  return icons[type] || '📦'
}

