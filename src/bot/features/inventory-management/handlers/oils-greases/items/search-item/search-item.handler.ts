import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { SearchItemService } from './search-item.service.js'

export const searchItemHandler = new Composer<Context>()

// Main search menu
searchItemHandler.callbackQuery('og:items:search', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showSearchMenu(ctx)
})

// Search by barcode photo
searchItemHandler.callbackQuery('og:items:search:barcode_photo', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'awaiting_barcode_photo',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '📸 **البحث بصورة الباركود**\n\n'
    + 'أرسل صورة الباركود الآن...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by code
searchItemHandler.callbackQuery('og:items:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'awaiting_code',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '🔢 **البحث بالكود**\n\n'
    + 'أرسل الكود الآن...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by name
searchItemHandler.callbackQuery('og:items:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()
  ctx.session.inventoryForm = {
    action: 'search',
    step: 'awaiting_name',
    warehouse: 'oils-greases',
    data: {},
  }
  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + 'أرسل اسم الصنف (عربي أو إنجليزي)...',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:items:search'),
      parse_mode: 'Markdown',
    },
  )
})

// Search by category
searchItemHandler.callbackQuery('og:items:search:category', async (ctx) => {
  await ctx.answerCallbackQuery()
  const categories = await SearchItemService.getCategories()

  const keyboard = new InlineKeyboard()
  for (const cat of categories) {
    keyboard.text(cat.nameAr, `og:items:search:category:${cat.id}`).row()
  }
  keyboard.text('⬅️ رجوع', 'og:items:search')

  await ctx.editMessageText(
    '📦 **البحث بالفئة**\n\n'
    + 'اختر الفئة:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Search by category ID
searchItemHandler.callbackQuery(/^og:items:search:category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  const items = await SearchItemService.searchByCategory(categoryId)

  if (items.length === 0) {
    await ctx.editMessageText(
      '❌ **لا توجد نتائج**\n\n'
      + 'لم يتم العثور على أصناف في هذه الفئة',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:items:search'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  await showSearchResults(ctx, items)
})

// Photo handler for barcode
searchItemHandler.on('message:photo', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'search') return next()
  if (state.step !== 'awaiting_barcode_photo') return next()

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

    const barcode = result.data.trim()
    const item = await SearchItemService.searchByBarcode(barcode)

    ctx.session.inventoryForm = undefined

    if (!item) {
      await ctx.reply(
        `❌ **لم يتم العثور على الصنف**\n\n`
        + `الباركود: \`${barcode}\``,
        {
          reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'og:items:search'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    await showItemDetails(ctx, item)
  }
  catch (error) {
    console.error('Error processing barcode:', error)
    await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة')
  }
})

// Text handler
searchItemHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'search') return next()

  const text = ctx.message.text

  if (state.step === 'awaiting_code') {
    const item = await SearchItemService.searchByCode(text)
    ctx.session.inventoryForm = undefined

    if (!item) {
      await ctx.reply(
        '❌ **لم يتم العثور على الصنف**',
        {
          reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'og:items:search'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    await showItemDetails(ctx, item)
    return
  }

  if (state.step === 'awaiting_name') {
    const items = await SearchItemService.searchByName(text)
    ctx.session.inventoryForm = undefined

    if (items.length === 0) {
      await ctx.reply(
        '❌ **لا توجد نتائج**',
        {
          reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'og:items:search'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    await showSearchResults(ctx, items)
    return
  }

  return next()
})

function showSearchMenu(ctx: Context) {
  const keyboard = new InlineKeyboard()
    .text('📸 صورة الباركود', 'og:items:search:barcode_photo')
    .row()
    .text('🔢 الكود', 'og:items:search:code')
    .row()
    .text('📝 الاسم', 'og:items:search:name')
    .row()
    .text('📦 الفئة', 'og:items:search:category')
    .row()
    .text('⬅️ رجوع', 'og:items:menu')

  return ctx.editMessageText(
    '🔍 **البحث عن صنف**\n\n'
    + 'اختر طريقة البحث:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
}

function showSearchResults(ctx: Context, items: any[]) {
  let message = '✅ **نتائج البحث**\n\n'
  message += `📊 **عدد النتائج:** ${items.length}\n\n`
  message += '**اختر صنف لعرض التفاصيل:**'

  const keyboard = new InlineKeyboard()

  // Item buttons (2 per row)
  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i]
    const item2 = items[i + 1]
    
    const warning1 = item1.quantity <= item1.minQuantity ? '⚠️ ' : ''
    const warning2 = item2 && item2.quantity <= item2.minQuantity ? '⚠️ ' : ''
    
    keyboard.text(
      `${warning1}${item1.nameAr} (${item1.quantity})`,
      `og:items:search:view:${item1.id}`,
    )
    
    if (item2) {
      keyboard.text(
        `${warning2}${item2.nameAr} (${item2.quantity})`,
        `og:items:search:view:${item2.id}`,
      )
    }
    
    keyboard.row()
  }

  keyboard.text('🔍 بحث جديد', 'og:items:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:items:menu')

  return ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

function showItemDetails(ctx: Context, item: any) {
  let message = '📦 **تفاصيل الصنف**\n\n'
  message += `**الاسم (عربي):** ${item.nameAr}\n`
  if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
  message += `**الكود:** \`${item.code}\`\n`
  if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`
  message += `\n**الفئة:** ${item.category?.nameAr || 'غير محدد'}\n`
  message += `**الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`
  message += `\n**الكمية:** ${item.quantity} ${item.unit}\n`
  if (item.unitCapacity) message += `**سعة الوحدة:** ${item.unitCapacity}\n`
  message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`

  if (item.quantity <= item.minQuantity) {
    message += `\n⚠️ **تحذير:** الكمية أقل من أو تساوي الحد الأدنى\n`
  }

  message += `\n**سعر الوحدة:** ${item.unitPrice} جنيه\n`
  message += `**القيمة الإجمالية:** ${item.totalValue} جنيه\n`

  if (item.supplierName) message += `\n**المورد:** ${item.supplierName}\n`
  if (item.notes) message += `\n**ملاحظات:** ${item.notes}\n`
  
  message += `\n**تاريخ الإضافة:** ${item.createdAt.toLocaleString('ar-EG')}\n`
  if (item.updatedAt) message += `**آخر تحديث:** ${item.updatedAt.toLocaleString('ar-EG')}\n`

  const keyboard = new InlineKeyboard()
    .text('✏️ تعديل', `og:items:edit:${item.id}:page:1`)
    .text('🗑️ حذف', `og:items:delete:${item.id}:page:1`)
    .row()
    .text('🔍 بحث جديد', 'og:items:search')
    .row()
    .text('⬅️ رجوع', 'og:items:menu')

  return ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

// View item from search results
searchItemHandler.callbackQuery(/^og:items:search:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  
  const item = await SearchItemService.searchByCode('')
  const fullItem = await Database.prisma.iNV_OilsGreasesItem.findUnique({
    where: { id: itemId },
    include: { category: true, location: true },
  })

  if (!fullItem) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }

  await showItemDetails(ctx, fullItem)
})

import { Database } from '#root/modules/database/index.js'
