/**
 * Search Handler
 * معالج البحث عن الأصناف
 */

import type { Context } from '../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { InventoryBarcodeService } from '../../services/inventory-barcode.service.js'

export const inventorySearchHandler = new Composer<Context>()

/**
 * زر "بحث" في قائمة المخزن
 */
inventorySearchHandler.callbackQuery(/^inv:warehouse:(\d+):search$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.waitingForSearch = {
    warehouseId,
    action: 'search',
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  await ctx.editMessageText(
    '🔍 **البحث عن منتج**\n\n' +
    '📝 أرسل اسم المنتج أو رقم الباركود (SKU)\n\n' +
    '💡 **مثال:**\n' +
    '• "فلتر"\n' +
    '• "CAT-1R"\n' +
    '• "1R-0739"',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * معالج البحث أثناء الصرف
 */
inventorySearchHandler.callbackQuery(/^inv:warehouse:(\d+):dispense:search$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  ctx.session = ctx.session || {}
  ctx.session.waitingForSearch = {
    warehouseId,
    action: 'dispensing',
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}:dispense`)

  await ctx.editMessageText(
    '🔍 **البحث عن منتج للصرف**\n\n' +
    '📝 أرسل اسم المنتج أو رقم الباركود (SKU)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * معالج الرسائل النصية (البحث)
 */
inventorySearchHandler.on('message:text', async (ctx) => {
  if (!ctx.session?.waitingForSearch) {
    return // ليس في وضع بحث
  }

  const state = ctx.session.waitingForSearch
  const searchTerm = ctx.message.text.trim()

  if (searchTerm.toLowerCase() === 'إلغاء' || searchTerm.toLowerCase() === 'cancel') {
    delete ctx.session.waitingForSearch
    await ctx.reply('❌ تم إلغاء البحث')
    return
  }

  try {
    await ctx.reply('🔍 جاري البحث...')

    // البحث عن الأصناف
    const results = await InventoryBarcodeService.searchItems(searchTerm, 10)

    if (results.length === 0) {
      await ctx.reply(
        `❌ **لم يتم العثور على نتائج**\n\n` +
        `البحث عن: "${searchTerm}"\n\n` +
        `💡 **حاول:**\n` +
        `• استخدام كلمات مختلفة\n` +
        `• البحث برقم الباركود\n` +
        `• التأكد من الإملاء`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔄 إعادة البحث', `inv:warehouse:${state.warehouseId}:search`)
            .row()
            .text('❌ إلغاء', `inv:warehouse:${state.warehouseId}`),
        },
      )
      delete ctx.session.waitingForSearch
      return
    }

    // عرض النتائج
    if (results.length === 1) {
      // نتيجة واحدة - عرض مباشرة
      const itemData = await InventoryBarcodeService.findItemByBarcode(results[0].item.sku)
      if (itemData) {
        await handleSearchResult(ctx, itemData, state)
      }
    } else {
      // نتائج متعددة - عرض قائمة
      await showSearchResults(ctx, results, state)
    }

    delete ctx.session.waitingForSearch
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء البحث. حاول مرة أخرى.')
  }
})

/**
 * عرض نتائج البحث المتعددة
 */
async function showSearchResults(
  ctx: Context,
  results: Awaited<ReturnType<typeof InventoryBarcodeService.searchItems>>,
  state: any,
) {
  let message = `🔍 **نتائج البحث** (${results.length} نتيجة)\n\n`

  const keyboard = new InlineKeyboard()

  results.forEach((result, index) => {
    const totalStock = result.stocks.reduce((sum, stock) => sum + stock.quantity, 0)
    message += `${index + 1}. **${result.item.name}**\n`
    message += `   SKU: \`${result.item.sku}\` | الرصيد: ${totalStock} ${result.item.unit}\n\n`

    if (state.action === 'dispensing') {
      keyboard.text(
        `${index + 1}. ${result.item.name}`,
        `inv:dispensing:select-item:${result.item.id}:${state.warehouseId}`,
      )
    } else {
      keyboard.text(
        `${index + 1}. ${result.item.name}`,
        `inv:item:details:${result.item.id}`,
      )
    }
    keyboard.row()
  })

  keyboard.text('❌ إلغاء', `inv:warehouse:${state.warehouseId}`)

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

/**
 * معالج نتيجة البحث
 */
async function handleSearchResult(
  ctx: Context,
  itemData: Awaited<ReturnType<typeof InventoryBarcodeService.findItemByBarcode>>,
  state: any,
) {
  if (!itemData) return

  const { item, stocks } = itemData

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
  }

  const keyboard = new InlineKeyboard()

  if (state.action === 'dispensing') {
    keyboard.text('✅ صرف هذا الصنف', `inv:dispensing:add-item:${item.id}:${state.warehouseId}`)
  } else {
    keyboard
      .text('📥 استلام', `inv:receiving:start:${item.id}`)
      .text('📤 صرف', `inv:dispensing:start:${item.id}`)
      .row()
      .text('📋 تفاصيل', `inv:item:details:${item.id}`)
  }

  keyboard.row().text('⬅️ رجوع', `inv:warehouse:${state.warehouseId}`)

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

