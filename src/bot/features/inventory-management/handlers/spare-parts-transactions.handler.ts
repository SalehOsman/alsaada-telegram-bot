/**
 * Spare Parts Transactions Handler
 * إدارة حركات قطع الغيار - إدخال، إخراج، نقل، إرجاع، جرد
 */

import type { Context } from '../../../context.js'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { BarcodeScannerService } from '#root/modules/services/barcode-scanner/index.js'
import ExcelJS from 'exceljs'
import { Composer, InlineKeyboard, InputFile } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sparePartsTransactionsHandler = new Composer<Context>()

console.error('🔵 ✅ sparePartsTransactionsHandler loaded and ready')

// (no-op helper removed)

// Handle quick in/out flows (we will ask for quantity and create a transaction)
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:in:quick:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  // set a simple transaction flow in session
  ;(ctx.session as any).transactionForm = {
    action: 'quick_in',
    step: 'awaiting_quantity',
    data: { itemId, transactionType: 'IN' },
  }

  await ctx.editMessageText(
    '➕ **إدخال سريع - أدخل الكمية**\n\n'
    + '✍️ الرجاء إرسال كمية الإضافة (عدد صحيح):',
    { parse_mode: 'Markdown' },
  )
})

sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:quick:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  ;(ctx.session as any).transactionForm = {
    action: 'quick_out',
    step: 'awaiting_quantity',
    data: { itemId, transactionType: 'OUT' },
  }

  await ctx.editMessageText(
    '➖ **سحب سريع - أدخل الكمية**\n\n'
    + '✍️ الرجاء إرسال كمية السحب (عدد صحيح):',
    { parse_mode: 'Markdown' },
  )
})

// Show transactions for a specific item
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:item:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const transactions = await Database.prisma.iNV_Transaction.findMany({
      where: { itemId: itemId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    let message = `📋 **سجل الحركات للقطعة (${itemId})**\n\n`

    if (transactions.length === 0) {
      message += '⚠️ لا توجد حركات لهذه القطعة.'
    }
    else {
      for (const t of transactions) {
        const emoji = t.transactionType === 'IN' ? '➕' : t.transactionType === 'OUT' ? '➖' : '🔄'
        message += `${emoji} ${t.transactionType} — الكمية: ${t.quantity} — ${t.createdAt.toLocaleString('ar-EG')}\n`
        if (t.notes) {
          message += `📝 ${t.notes}\n`
        }
        message += '\n'
      }
    }

    await ctx.editMessageText(message, {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:items:menu'),
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error fetching item transactions:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في جلب الحركات', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 1️⃣ إدخال كمية (شراء)
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:in', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text(' عرض كل المنتجات', 'sp:trans:in:list:1')
    .row()
    .text('🔍 البحث عن قطعة', 'sp:trans:in:search')
    .row()
    .text('📸 مسح باركود', 'sp:trans:in:scan')
    .row()
    .text('🎯 فلترة المنتجات', 'sp:trans:in:filters')
    .row()
    .text('⬅️ رجوع', 'sp:transactions:menu')

  await ctx.editMessageText(
    '➕ **إدخال كمية (شراء)**\n\n'
    + '📋 **اختر طريقة اختيار القطعة:**\n\n'
    + ' **عرض كل المنتجات**\n'
    + '└ عرض جميع قطع الغيار مع التصفح\n\n'
    + '🔍 **البحث عن قطعة**\n'
    + '└ بحث بالكود أو الاسم\n\n'
    + '📸 **مسح باركود**\n'
    + '└ بحث سريع بالباركود\n\n'
    + '🎯 **فلترة المنتجات**\n'
    + '└ فلترة حسب الفئة، الموقع، أو المخزون',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 📋 عرض قائمة المنتجات مع Pagination
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:in:list:(\d+)(?::(.+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match![1], 10)
  const filterType = ctx.match![2] // category:id, location:id, outofstock, lowstock, all

  const itemsPerPage = 10
  const skip = (page - 1) * itemsPerPage

  try {
    // بناء شروط الفلترة
    const where: any = {}

    if (filterType) {
      if (filterType === 'outofstock') {
        where.quantity = 0
      }
      else if (filterType === 'lowstock') {
        where.AND = [
          { quantity: { gt: 0 } },
          { OR: [
            { quantity: { lt: Database.prisma.iNV_Item.fields.minQuantity } },
          ] },
        ]
      }
      else if (filterType.startsWith('category:')) {
        const categoryId = Number.parseInt(filterType.split(':')[1], 10)
        where.categoryId = categoryId
      }
      else if (filterType.startsWith('location:')) {
        const locationId = Number.parseInt(filterType.split(':')[1], 10)
        where.locationId = locationId
      }
    }

    const [items, totalCount] = await Promise.all([
      Database.prisma.iNV_Item.findMany({
        where,
        skip,
        take: itemsPerPage,
        orderBy: { code: 'asc' },
        include: {
          category: { select: { nameAr: true } },
          location: { select: { nameAr: true } },
        },
      }),
      Database.prisma.iNV_Item.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '📋 **قائمة المنتجات للشراء**\n\n'

    if (filterType === 'outofstock') {
      message += '🔴 **الفلتر:** نفذ المخزون\n\n'
    }
    else if (filterType === 'lowstock') {
      message += '🟡 **الفلتر:** مخزون منخفض\n\n'
    }
    else if (filterType?.startsWith('category:')) {
      const cat = await Database.prisma.equipmentCategory.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📂 **الفلتر:** ${cat?.nameAr || 'فئة'}\n\n`
    }
    else if (filterType?.startsWith('location:')) {
      const loc = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📍 **الفلتر:** ${loc?.nameAr || 'موقع'}\n\n`
    }

    if (items.length === 0) {
      message += '⚠️ لا توجد منتجات\n\n'
    }
    else {
      for (const item of items) {
        const stockStatus = item.quantity === 0
          ? '🔴 نفذ'
          : item.minQuantity && item.quantity < item.minQuantity
            ? '🟡 منخفض'
            : '🟢 متوفر'

        message += `📦 **${item.nameAr}**\n`
        message += `🔤 الكود: \`${item.code}\`\n`
        message += `📊 الكمية: ${item.quantity} ${stockStatus}\n`
        message += `📍 الموقع: ${item.location?.nameAr || '-'}\n`
        message += `━━━━━━━━━━━━━━\n`
      }
    }

    message += `\n📄 الصفحة ${page} من ${totalPages || 1} (إجمالي: ${totalCount})`

    // بناء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // أزرار المنتجات (كل صف = منتج واحد)
    for (const item of items) {
      keyboard.text(`➕ ${item.nameAr}`, `sp:trans:in:select:${item.id}`).row()
    }

    // أزرار التصفح
    const navRow: Array<{ text: string, callback_data: string }> = []
    if (page > 1) {
      navRow.push({ text: '⬅️ السابق', callback_data: `sp:trans:in:list:${page - 1}${filterType ? `:${filterType}` : ''}` })
    }
    if (page < totalPages) {
      navRow.push({ text: 'التالي ➡️', callback_data: `sp:trans:in:list:${page + 1}${filterType ? `:${filterType}` : ''}` })
    }
    if (navRow.length > 0) {
      for (const btn of navRow) {
        keyboard.text(btn.text, btn.callback_data)
      }
      keyboard.row()
    }

    keyboard.text('🎯 تغيير الفلتر', 'sp:trans:in:filters').row()
    keyboard.text('⬅️ رجوع', 'sp:trans:in')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error listing products:', error)
    await ctx.editMessageText(
      '❌ **خطأ في جلب المنتجات**\n\nحدث خطأ أثناء جلب قائمة المنتجات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:trans:in'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// 🎯 قائمة الفلاتر
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:filters', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const [categories, locations] = await Promise.all([
      Database.prisma.equipmentCategory.findMany({
        orderBy: { nameAr: 'asc' },
      }),
      Database.prisma.iNV_StorageLocation.findMany({
        orderBy: { nameAr: 'asc' },
      }),
    ])

    let message = '🎯 **فلترة المنتجات**\n\n'
    message += 'اختر طريقة الفلترة:\n\n'

    const keyboard = new InlineKeyboard()

    // فلاتر المخزون
    keyboard.text('🔴 نفذ المخزون', 'sp:trans:in:list:1:outofstock').row()
    keyboard.text('🟡 مخزون منخفض', 'sp:trans:in:list:1:lowstock').row()
    keyboard.text('📋 كل المنتجات', 'sp:trans:in:list:1').row()

    // فلاتر الفئات
    if (categories.length > 0) {
      message += '📂 **الفئات:**\n'
      for (const cat of categories) {
        keyboard.text(`${cat.icon || '📦'} ${cat.nameAr}`, `sp:trans:in:list:1:category:${cat.id}`).row()
      }
    }

    // فلاتر المواقع
    if (locations.length > 0) {
      message += '\n📍 **المواقع:**\n'
      for (const loc of locations) {
        keyboard.text(`📍 ${loc.nameAr}`, `sp:trans:in:list:1:location:${loc.id}`).row()
      }
    }

    keyboard.text('⬅️ رجوع', 'sp:trans:in')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing filters:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في عرض الفلاتر',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:trans:in'),
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// 🔍 البحث عن قطعة للشراء
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔢 بالكود الداخلي', 'sp:trans:in:search:code')
    .row()
    .text('📸 بالباركود', 'sp:trans:in:search:barcode')
    .row()
    .text('📝 بالاسم', 'sp:trans:in:search:name')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    '🔍 **البحث عن قطعة غيار**\n\n'
    + '📋 **اختر طريقة البحث:**\n\n'
    + '🔢 **بالكود الداخلي**\n'
    + '└ مثال: CAR-00001\n\n'
    + '📸 **بالباركود**\n'
    + '└ مثال: 6282773851645\n\n'
    + '📝 **بالاسم**\n'
    + '└ البحث في الاسم العربي أو الإنجليزي',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالجات البحث الفرعية للشراء
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).purchaseForm = {
    step: 'search_by_code',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    '🔢 **البحث بالكود الداخلي**\n\n'
    + '✍️ **أدخل كود القطعة:**\n\n'
    + 'مثال: `CAR-00001`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

sparePartsTransactionsHandler.callbackQuery('sp:trans:in:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).purchaseForm = {
    step: 'search_by_barcode',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    '📸 **البحث بالباركود**\n\n'
    + '✍️ **أدخل رقم الباركود:**\n\n'
    + 'مثال: `6282773851645`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

sparePartsTransactionsHandler.callbackQuery('sp:trans:in:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).purchaseForm = {
    step: 'search_by_name',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + '✍️ **أدخل اسم القطعة:**\n\n'
    + '(عربي أو إنجليزي)\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 📸 مسح باركود للشراء
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).purchaseForm = {
    step: 'awaiting_barcode_image',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('✍️ إدخال يدوي', 'sp:trans:in:search:barcode')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    '📸 **مسح الباركود**\n\n'
    + '📷 **أرسل صورة الباركود الآن**\n\n'
    + '💡 تأكد من:\n'
    + '• وضوح الباركود في الصورة\n'
    + '• إضاءة جيدة\n\n'
    + '⏳ **في انتظار الصورة...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// ✅ اختيار منتج وبدء تدفق الشراء
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:in:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: { select: { nameAr: true } },
        location: { select: { nameAr: true } },
      },
    })

    if (!sparePart) {
      await ctx.answerCallbackQuery({ text: '❌ المنتج غير موجود', show_alert: true })
      return
    }

    // بدء session جديد للشراء
    ;(ctx.session as any).purchaseForm = {
      step: 'invoice_number',
      data: {
        itemId,
        sparePartName: sparePart.nameAr,
        sparePartCode: sparePart.code,
        currentQuantity: sparePart.quantity,
        currentUnitPrice: sparePart.unitPrice || 0,
      },
    }

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي (بدون فاتورة)', 'sp:trans:in:skip_invoice')
      .row()
      .text('❌ إلغاء', 'sp:trans:in')

    await ctx.editMessageText(
      `✅ **تم اختيار المنتج:**\n\n`
      + `📦 **الاسم:** ${sparePart.nameAr}\n`
      + `🔤 **الكود:** \`${sparePart.code}\`\n`
      + `📊 **الكمية الحالية:** ${sparePart.quantity}\n`
      + `📍 **الموقع:** ${sparePart.location?.nameAr || '-'}\n\n`
      + `━━━━━━━━━━━━━━\n\n`
      + `📄 **الخطوة 1 من 13:** رقم الفاتورة\n\n`
      + `✍️ الرجاء إرسال **رقم الفاتورة** أو اضغط تخطي:`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error selecting product:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 2️⃣ إخراج كمية (صرف)
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// 2️⃣ إخراج كمية (صرف)
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:out', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text(' عرض كل المنتجات', 'sp:trans:out:list:1')
    .row()
    .text('🔍 البحث عن قطعة', 'sp:trans:out:search')
    .row()
    .text('📸 مسح باركود', 'sp:trans:out:scan')
    .row()
    .text('🎯 فلترة المنتجات', 'sp:trans:out:filters')
    .row()
    .text('⬅️ رجوع', 'sp:transactions:menu')

  await ctx.editMessageText(
    '➖ **إخراج كمية (صرف)**\n\n'
    + '📋 **اختر طريقة اختيار القطعة:**\n\n'
    + ' **عرض كل المنتجات**\n'
    + '└ عرض جميع قطع الغيار مع التصفح\n\n'
    + '🔍 **البحث عن قطعة**\n'
    + '└ بحث بالكود أو الاسم\n\n'
    + '📸 **مسح باركود**\n'
    + '└ بحث سريع بالباركود\n\n'
    + '🎯 **فلترة المنتجات**\n'
    + '└ فلترة حسب الفئة، الموقع، أو المخزون',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 📋 عرض قائمة المنتجات للصرف مع Pagination
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:list:(\d+)(?::(.+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match![1], 10)
  const filterType = ctx.match![2] // category:id, location:id, outofstock, lowstock, all

  const itemsPerPage = 10
  const skip = (page - 1) * itemsPerPage

  try {
    // بناء شروط الفلترة
    const where: any = { isActive: true }

    if (filterType) {
      if (filterType === 'outofstock') {
        where.quantity = 0
      }
      else if (filterType === 'lowstock') {
        where.AND = [
          { quantity: { gt: 0 } },
          { OR: [
            { quantity: { lt: Database.prisma.iNV_Item.fields.minQuantity } },
          ] },
        ]
      }
      else if (filterType.startsWith('category:')) {
        const categoryId = Number.parseInt(filterType.split(':')[1], 10)
        where.categoryId = categoryId
      }
      else if (filterType.startsWith('location:')) {
        const locationId = Number.parseInt(filterType.split(':')[1], 10)
        where.locationId = locationId
      }
    }

    const [items, totalCount] = await Promise.all([
      Database.prisma.iNV_Item.findMany({
        where,
        skip,
        take: itemsPerPage,
        orderBy: { code: 'asc' },
        include: {
          category: { select: { nameAr: true, icon: true } },
          location: { select: { nameAr: true } },
        },
      }),
      Database.prisma.iNV_Item.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '📋 **قائمة المنتجات للصرف**\n\n'

    if (filterType === 'outofstock') {
      message += '🔴 **الفلتر:** نفذ المخزون\n\n'
    }
    else if (filterType === 'lowstock') {
      message += '🟡 **الفلتر:** مخزون منخفض\n\n'
    }
    else if (filterType?.startsWith('category:')) {
      const cat = await Database.prisma.equipmentCategory.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📂 **الفلتر:** ${cat?.nameAr || 'فئة'}\n\n`
    }
    else if (filterType?.startsWith('location:')) {
      const loc = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📍 **الفلتر:** ${loc?.nameAr || 'موقع'}\n\n`
    }

    message += `📄 **الصفحة ${page} من ${totalPages}**\n`
    message += `📊 **إجمالي:** ${totalCount} منتج\n\n`
    message += '━━━━━━━━━━━━━━\n\n'

    if (items.length === 0) {
      message += '⚠️ لا توجد منتجات متاحة.'
    }
    else {
      for (const item of items) {
        const stockStatus = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'

        message += `${stockStatus} **${item.nameAr}**\n`
        message += `   🔤 \`${item.code}\`\n`
        message += `   📂 ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
        if (item.location) {
          message += `   📍 ${item.location.nameAr}\n`
        }
        message += `   📦 الكمية: ${item.quantity} ${item.unit}\n`
        message += `     └ 🆕 ${item.quantityNew || 0} | ♻️ ${item.quantityUsed || 0} | 🔄 ${item.quantityRefurbished || 0} | 📦 ${item.quantityImport || 0}\n`
        message += `   💰 ${item.unitPrice.toFixed(2)} ${item.currency}\n`
        message += '\n'
      }
    }

    // بناء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // أزرار اختيار المنتجات
    if (items.length > 0) {
      for (const item of items) {
        const stockEmoji = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'
        const displayName = item.nameAr.length > 25 ? `${item.nameAr.substring(0, 25)}...` : item.nameAr
        keyboard.text(`${stockEmoji} ${displayName}`, `sp:trans:out:select:${item.id}`).row()
      }
    }

    // أزرار التنقل
    keyboard.row()
    if (page > 1) {
      keyboard.text('⬅️ السابق', `sp:trans:out:list:${page - 1}${filterType ? `:${filterType}` : ''}`)
    }
    if (page < totalPages) {
      keyboard.text('التالي ➡️', `sp:trans:out:list:${page + 1}${filterType ? `:${filterType}` : ''}`)
    }

    keyboard
      .row()
      .text('🎯 الفلاتر', 'sp:trans:out:filters')
      .row()
      .text('🔍 بحث', 'sp:trans:out:search')
      .row()
      .text('⬅️ رجوع', 'sp:trans:out')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error listing products for issue:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في جلب المنتجات', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 🔍 البحث عن قطعة للصرف
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔢 بالكود الداخلي', 'sp:trans:out:search:code')
    .row()
    .text('📸 بالباركود', 'sp:trans:out:search:barcode')
    .row()
    .text('📝 بالاسم', 'sp:trans:out:search:name')
    .row()
    .text('❌ إلغاء', 'sp:trans:out')

  await ctx.editMessageText(
    '🔍 **البحث عن قطعة غيار**\n\n'
    + '📋 **اختر طريقة البحث:**\n\n'
    + '🔢 **بالكود الداخلي**\n'
    + '└ مثال: CAR-00001\n\n'
    + '📸 **بالباركود**\n'
    + '└ مثال: 6282773851645\n\n'
    + '📝 **بالاسم**\n'
    + '└ البحث في الاسم العربي أو الإنجليزي',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالجات البحث الفرعية
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).issueForm = {
    step: 'search_by_code',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:out')

  await ctx.editMessageText(
    '� **البحث بالكود الداخلي**\n\n'
    + '✍️ **أدخل كود القطعة:**\n\n'
    + 'مثال: `CAR-00001`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

sparePartsTransactionsHandler.callbackQuery('sp:trans:out:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).issueForm = {
    step: 'search_by_barcode',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:out')

  await ctx.editMessageText(
    '📸 **البحث بالباركود**\n\n'
    + '✍️ **أدخل رقم الباركود:**\n\n'
    + 'مثال: `6282773851645`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

sparePartsTransactionsHandler.callbackQuery('sp:trans:out:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).issueForm = {
    step: 'search_by_name',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'sp:trans:out')

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + '✍️ **أدخل اسم القطعة:**\n\n'
    + '(عربي أو إنجليزي)\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 📸 مسح باركود للصرف (مسح صورة)
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).issueForm = {
    step: 'awaiting_barcode_image',
    data: {},
  }

  const keyboard = new InlineKeyboard()
    .text('✍️ إدخال يدوي', 'sp:trans:out:search:barcode')
    .row()
    .text('❌ إلغاء', 'sp:trans:out')

  await ctx.editMessageText(
    '📸 **مسح الباركود**\n\n'
    + '📷 **أرسل صورة الباركود الآن**\n\n'
    + '💡 تأكد من:\n'
    + '• وضوح الباركود في الصورة\n'
    + '• إضاءة جيدة\n\n'
    + '⏳ **في انتظار الصورة...**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 🎯 فلاتر الصرف
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:filters', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔴 نفذ المخزون', 'sp:trans:out:filter:outofstock')
    .row()
    .text('🟡 مخزون منخفض', 'sp:trans:out:filter:lowstock')
    .row()
    .text('📂 حسب التصنيف', 'sp:trans:out:filter:category')
    .row()
    .text('📍 حسب الموقع', 'sp:trans:out:filter:location')
    .row()
    .text('🔄 إلغاء الفلتر', 'sp:trans:out:list:1')
    .row()
    .text('⬅️ رجوع', 'sp:trans:out')

  await ctx.editMessageText(
    '🎯 **فلترة المنتجات للصرف**\n\n'
    + '📋 **اختر نوع الفلتر:**\n\n'
    + '🔴 **نفذ المخزون**\n'
    + '└ عرض المنتجات التي نفذت\n\n'
    + '🟡 **مخزون منخفض**\n'
    + '└ عرض المنتجات ذات المخزون المنخفض\n\n'
    + '📂 **حسب التصنيف**\n'
    + '└ فلترة حسب نوع القطعة\n\n'
    + '📍 **حسب الموقع**\n'
    + '└ فلترة حسب موقع التخزين',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالج الفلترة السريعة
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:filter:(outofstock|lowstock)$/, async (ctx) => {
  const filterType = ctx.match![1]
  await ctx.answerCallbackQuery()

  // التوجيه لقائمة المنتجات مع الفلتر
  const keyboard = new InlineKeyboard()
  keyboard.text('📋 عرض النتائج', `sp:trans:out:list:1:${filterType}`)
  keyboard.row().text('⬅️ رجوع', 'sp:trans:out:filters')

  const filterName = filterType === 'outofstock' ? '🔴 نفذ المخزون' : '🟡 مخزون منخفض'

  await ctx.editMessageText(
    `تم اختيار الفلتر: **${filterName}**\n\n`
    + '⬇️ اضغط "عرض النتائج" للمتابعة',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// فلترة حسب التصنيف - عرض قائمة التصنيفات
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:filter:category', async (ctx) => {
  await ctx.answerCallbackQuery()

  const categories = await Database.prisma.equipmentCategory.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const cat of categories) {
    keyboard.text(
      `${cat.icon || '📦'} ${cat.nameAr}`,
      `sp:trans:out:list:1:category:${cat.id}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', 'sp:trans:out:filters')

  await ctx.editMessageText(
    '📂 **اختر التصنيف:**\n\n'
    + 'اختر التصنيف الذي تريد عرض منتجاته:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// فلترة حسب الموقع - عرض قائمة المواقع
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:filter:location', async (ctx) => {
  await ctx.answerCallbackQuery()

  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const loc of locations) {
    keyboard.text(
      `📍 ${loc.nameAr}`,
      `sp:trans:out:list:1:location:${loc.id}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', 'sp:trans:out:filters')

  await ctx.editMessageText(
    '📍 **اختر الموقع:**\n\n'
    + 'اختر موقع التخزين الذي تريد عرض منتجاته:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// دالة مساعدة: عرض حالات القطعة للصرف
// ════════════════════════════════════════════════════════
async function showItemConditionsForIssue(ctx: any, itemId: number) {
  try {
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.reply('❌ القطعة غير موجودة')
      ;(ctx.session as any).issueForm = undefined
      return
    }

    // التحقق من توفر كمية
    if (sparePart.quantity === 0) {
      await ctx.reply(
        '⚠️ **لا توجد كمية متاحة من هذه القطعة**\n\n'
        + `**القطعة:** ${sparePart.nameAr}\n`
        + `**الكود:** \`${sparePart.code}\``,
        {
          reply_markup: new InlineKeyboard()
            .text('🔍 بحث جديد', 'sp:trans:out:search')
            .row()
            .text('❌ إلغاء', 'sp:trans:out'),
          parse_mode: 'Markdown',
        },
      )
      ;(ctx.session as any).issueForm = undefined
      return
    }

    // حفظ بيانات القطعة في session
    ;(ctx.session as any).issueForm = {
      step: 'awaiting_quantity',
      data: {
        itemId: sparePart.id,
        sparePartName: sparePart.nameAr,
        sparePartCode: sparePart.code,
        availableQuantity: sparePart.quantity,
        quantityNew: sparePart.quantityNew,
        quantityUsed: sparePart.quantityUsed,
        quantityRefurbished: sparePart.quantityRefurbished,
        quantityImport: sparePart.quantityImport,
      },
    }

    let message = '📦 **تم اختيار القطعة**\n\n'
    message += `**الاسم:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n`
    message += `**الباركود:** \`${sparePart.barcode}\`\n\n`
    message += `**التصنيف:** ${sparePart.category.icon || '🏷️'} ${sparePart.category.nameAr}\n`
    if (sparePart.location) {
      message += `**الموقع:** 📍 ${sparePart.location.nameAr}\n`
    }
    message += '\n━━━━━━━━━━━━━━\n\n'
    message += `📊 **الكميات المتاحة:**\n`
    message += `   🆕 جديد: ${sparePart.quantityNew || 0}\n`
    message += `   ♻️ مستعمل: ${sparePart.quantityUsed || 0}\n`
    message += `   🔄 مجدد: ${sparePart.quantityRefurbished || 0}\n`
    message += `   📦 استيراد: ${sparePart.quantityImport || 0}\n`
    message += `━━━━━━━━━━━━━━\n`
    message += `📦 **الإجمالي: ${sparePart.quantity} ${sparePart.unit}**\n\n`
    message += '━━━━━━━━━━━━━━\n\n'

    // التحقق من توزيع الكمية على الحالات
    const totalConditionQuantity = (sparePart.quantityNew || 0) + (sparePart.quantityImport || 0)
      + (sparePart.quantityRefurbished || 0) + (sparePart.quantityUsed || 0)

    const conditionKeyboard = new InlineKeyboard()

    // إذا كانت الكميات موزعة على الحالات
    if (totalConditionQuantity > 0) {
      message += '🎯 **اختر الحالة المطلوب الصرف منها:**\n\n'
      message += '⬇️ **اضغط على الحالة المطلوبة**'

      if (sparePart.quantityNew > 0) {
        conditionKeyboard.text(`🆕 جديد (${sparePart.quantityNew} متاح)`, `sp:trans:out:condition:new:${itemId}`).row()
      }
      if (sparePart.quantityImport > 0) {
        conditionKeyboard.text(`📦 استيراد (${sparePart.quantityImport} متاح)`, `sp:trans:out:condition:import:${itemId}`).row()
      }
      if (sparePart.quantityRefurbished > 0) {
        conditionKeyboard.text(`🔄 مجدد (${sparePart.quantityRefurbished} متاح)`, `sp:trans:out:condition:refurbished:${itemId}`).row()
      }
      if (sparePart.quantityUsed > 0) {
        conditionKeyboard.text(`♻️ مستعمل (${sparePart.quantityUsed} متاح)`, `sp:trans:out:condition:used:${itemId}`).row()
      }

      conditionKeyboard.text('❌ إلغاء', 'sp:trans:out')

      await ctx.reply(message, {
        reply_markup: conditionKeyboard,
        parse_mode: 'Markdown',
      })
    }
    else {
      // المنتجات القديمة التي لم يتم توزيع كمياتها على الحالات
      message += '⚠️ **ملاحظة:** هذا المنتج لم يتم تحديد حالته.\n'
      message += 'سيتم الصرف من الكمية الإجمالية.\n\n'
      message += '📊 **أدخل الكمية المطلوب صرفها:**\n\n'
      message += `**مثال:** \`5\`\n\n`
      message += `⚠️ **الحد الأقصى:** ${sparePart.quantity} ${sparePart.unit}\n\n`
      message += '⏳ **في انتظار الإدخال...**'

      // حفظ بيانات للحالة العامة
      ;(ctx.session as any).issueForm.data.selectedCondition = 'GENERAL'
      ;(ctx.session as any).issueForm.data.selectedConditionIcon = '📦'
      ;(ctx.session as any).issueForm.data.selectedConditionNameAr = 'عام'
      ;(ctx.session as any).issueForm.data.availableQuantity = sparePart.quantity

      const keyboard = new InlineKeyboard()
        .text('❌ إلغاء', 'sp:trans:out')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
    }
  }
  catch (error) {
    console.error('Error showing item conditions:', error)
    await ctx.reply('❌ حدث خطأ في عرض بيانات القطعة')
    ;(ctx.session as any).issueForm = undefined
  }
}

// ════════════════════════════════════════════════════════
// 📦 دالة عرض المنتجات للنقل بين المواقع
// ════════════════════════════════════════════════════════
async function showTransferItemsList(ctx: any, page: number) {
  const pageSize = 10
  const skip = (page - 1) * pageSize

  const [spareParts, totalCount] = await Promise.all([
    Database.prisma.iNV_Item.findMany({
      skip,
      take: pageSize,
      orderBy: { code: 'asc' },
      include: {
        category: { select: { nameAr: true, icon: true } },
        location: { select: { nameAr: true } },
      },
    }),
    Database.prisma.iNV_Item.count(),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  let message = `📋 **قائمة المنتجات للنقل بين المواقع**\n\n`
  message += `📄 **الصفحة ${page} من ${totalPages}**\n`
  message += `📊 **إجمالي:** ${totalCount} منتج\n\n`
  message += `━━━━━━━━━━━━━━\n\n`

  const keyboard = new InlineKeyboard()

  for (const item of spareParts) {
    const stockIcon
      = item.quantity === 0 ? '🔴' : item.minQuantity && item.quantity <= item.minQuantity ? '🟡' : '🟢'

    message += `${stockIcon} **${item.nameAr}**\n`
    message += `   🔤 \`${item.code}\`\n`
    message += `   📂 ${item.category?.icon} ${item.category?.nameAr}\n`
    message += `   📍 ${item.location?.nameAr}\n`
    message += `   📦 الكمية: ${item.quantity} ${item.unit || 'قطعة'}\n`

    // عرض توزيع الحالات إذا كانت موجودة
    const hasConditions
      = (item.quantityNew ?? 0) > 0
        || (item.quantityUsed ?? 0) > 0
        || (item.quantityRefurbished ?? 0) > 0
        || (item.quantityImport ?? 0) > 0

    if (hasConditions) {
      message += `     └ 🆕 ${item.quantityNew || 0} | ♻️ ${item.quantityUsed || 0} | 🔄 ${item.quantityRefurbished || 0} | 📦 ${item.quantityImport || 0}\n`
    }

    message += `   💰 ${item.unitPrice.toFixed(2)} EGP\n\n`

    keyboard.text(`${stockIcon} ${item.nameAr}`, `sp:trans:transfer:select:${item.id}`).row()
  }

  // أزرار التنقل بين الصفحات
  const navRow: InlineKeyboard[] = []
  if (page > 1) {
    navRow.push(new InlineKeyboard().text('⏮️ السابق', `sp:trans:transfer:list:${page - 1}`))
  }
  if (page < totalPages) {
    navRow.push(new InlineKeyboard().text('التالي ⏭️', `sp:trans:transfer:list:${page + 1}`))
  }
  if (navRow.length > 0) {
    keyboard.row(...navRow.map(k => k.inline_keyboard[0][0]))
  }

  keyboard.row()
  keyboard.text('🎯 الفلاتر', 'sp:trans:transfer:filters')
  keyboard.row()
  keyboard.text('🔍 بحث', 'sp:trans:transfer:search')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'sp:trans:transfer')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

// ────────────────────────────────────────────────────────
// 🔄 دالة مساعدة: عرض قائمة المنتجات للإرجاع (مع pagination)
// ────────────────────────────────────────────────────────
/**
 * فلترة عمليات الصرف للاحتفاظ فقط بالعمليات التي لديها كمية متاحة للإرجاع
 */
async function filterReturnableTransactions(transactions: any[]) {
  const returnableTransactions = []

  for (const trans of transactions) {
    // حساب الكمية المرجعة من هذه العملية
    const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
      where: {
        transactionType: 'RETURN',
        notes: {
          contains: `#${trans.transactionNumber}`,
        },
      },
      _sum: {
        quantity: true,
      },
    })

    const totalReturned = returnedQuantity._sum.quantity || 0
    const availableToReturn = trans.quantity - totalReturned

    // فقط إضافة العمليات التي لديها كمية متاحة للإرجاع
    if (availableToReturn > 0) {
      returnableTransactions.push({
        ...trans,
        availableToReturn,
      })
    }
  }

  return returnableTransactions
}

// ════════════════════════════════════════════════════════
// 📦 اختيار منتج للصرف
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
      return
    }

    // التحقق من توفر كمية
    if (sparePart.quantity === 0) {
      await ctx.answerCallbackQuery({
        text: '⚠️ لا توجد كمية متاحة من هذه القطعة',
        show_alert: true,
      })
      return
    }

    // حفظ بيانات القطعة في session
    ;(ctx.session as any).issueForm = {
      step: 'awaiting_quantity',
      data: {
        itemId: sparePart.id,
        sparePartName: sparePart.nameAr,
        sparePartCode: sparePart.code,
        availableQuantity: sparePart.quantity,
        quantityNew: sparePart.quantityNew,
        quantityUsed: sparePart.quantityUsed,
        quantityRefurbished: sparePart.quantityRefurbished,
        quantityImport: sparePart.quantityImport,
      },
    }

    let message = '📦 **تم اختيار القطعة**\n\n'
    message += `**الاسم:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n`
    message += `**الباركود:** \`${sparePart.barcode}\`\n\n`
    message += `**التصنيف:** ${sparePart.category.icon || '🏷️'} ${sparePart.category.nameAr}\n`
    if (sparePart.location) {
      message += `**الموقع:** 📍 ${sparePart.location.nameAr}\n`
    }
    message += '\n━━━━━━━━━━━━━━\n\n'
    message += `📊 **الكميات المتاحة:**\n`
    message += `   🆕 جديد: ${sparePart.quantityNew || 0}\n`
    message += `   ♻️ مستعمل: ${sparePart.quantityUsed || 0}\n`
    message += `   🔄 مجدد: ${sparePart.quantityRefurbished || 0}\n`
    message += `   📦 استيراد: ${sparePart.quantityImport || 0}\n`
    message += `━━━━━━━━━━━━━━\n`
    message += `📦 **الإجمالي: ${sparePart.quantity} ${sparePart.unit}**\n\n`
    message += '━━━━━━━━━━━━━━\n\n'

    // التحقق من توزيع الكمية على الحالات
    const totalConditionQuantity = (sparePart.quantityNew || 0) + (sparePart.quantityImport || 0)
      + (sparePart.quantityRefurbished || 0) + (sparePart.quantityUsed || 0)

    const conditionKeyboard = new InlineKeyboard()

    // إذا كانت الكميات موزعة على الحالات
    if (totalConditionQuantity > 0) {
      message += '🎯 **اختر الحالة المطلوب الصرف منها:**\n\n'
      message += '⬇️ **اضغط على الحالة المطلوبة**'

      if (sparePart.quantityNew > 0) {
        conditionKeyboard.text(`🆕 جديد (${sparePart.quantityNew} متاح)`, `sp:trans:out:condition:new:${itemId}`).row()
      }
      if (sparePart.quantityImport > 0) {
        conditionKeyboard.text(`📦 استيراد (${sparePart.quantityImport} متاح)`, `sp:trans:out:condition:import:${itemId}`).row()
      }
      if (sparePart.quantityRefurbished > 0) {
        conditionKeyboard.text(`🔄 مجدد (${sparePart.quantityRefurbished} متاح)`, `sp:trans:out:condition:refurbished:${itemId}`).row()
      }
      if (sparePart.quantityUsed > 0) {
        conditionKeyboard.text(`♻️ مستعمل (${sparePart.quantityUsed} متاح)`, `sp:trans:out:condition:used:${itemId}`).row()
      }

      conditionKeyboard.text('❌ إلغاء', 'sp:trans:out')

      await ctx.editMessageText(message, {
        reply_markup: conditionKeyboard,
        parse_mode: 'Markdown',
      })
    }
    else {
      // المنتجات القديمة التي لم يتم توزيع كمياتها على الحالات
      // استخدام الكمية الإجمالية كحالة "عامة"
      message += '⚠️ **ملاحظة:** هذا المنتج لم يتم تحديد حالته.\n'
      message += 'سيتم الصرف من الكمية الإجمالية.\n\n'
      message += '📊 **أدخل الكمية المطلوب صرفها:**\n\n'
      message += `**مثال:** \`5\`\n\n`
      message += `⚠️ **الحد الأقصى:** ${sparePart.quantity} ${sparePart.unit}\n\n`
      message += '⏳ **في انتظار الإدخال...**'

      // حفظ بيانات مؤقتة للمنتجات القديمة (بدون حالة محددة)
      ;(ctx.session as any).issueForm = {
        step: 'awaiting_quantity',
        data: {
          itemId: sparePart.id,
          sparePartName: sparePart.nameAr,
          sparePartCode: sparePart.code,
          selectedCondition: 'general', // حالة عامة للمنتجات القديمة
          selectedConditionNameAr: 'عام',
          selectedConditionIcon: '📦',
          availableQuantity: sparePart.quantity,
          totalQuantity: sparePart.quantity,
        },
      }

      conditionKeyboard.text('❌ إلغاء', 'sp:trans:out')

      await ctx.editMessageText(message, {
        reply_markup: conditionKeyboard,
        parse_mode: 'Markdown',
      })
    }
  }
  catch (error) {
    console.error('Error selecting spare part for issue:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 📦 اختيار حالة المنتج للصرف
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:condition:(new|import|refurbished|used):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const condition = ctx.match![1] as 'new' | 'import' | 'refurbished' | 'used'
  const itemId = Number.parseInt(ctx.match![2], 10)

  try {
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
    })

    if (!sparePart) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
      return
    }

    // تحديد الكمية المتاحة حسب الحالة
    let availableQuantity = 0
    let conditionNameAr = ''
    let conditionIcon = ''

    switch (condition) {
      case 'new':
        availableQuantity = sparePart.quantityNew
        conditionNameAr = 'جديد'
        conditionIcon = '🆕'
        break
      case 'import':
        availableQuantity = sparePart.quantityImport
        conditionNameAr = 'استيراد'
        conditionIcon = '📦'
        break
      case 'refurbished':
        availableQuantity = sparePart.quantityRefurbished
        conditionNameAr = 'مجدد'
        conditionIcon = '🔄'
        break
      case 'used':
        availableQuantity = sparePart.quantityUsed
        conditionNameAr = 'مستعمل'
        conditionIcon = '♻️'
        break
    }

    if (availableQuantity === 0) {
      await ctx.answerCallbackQuery({
        text: `⚠️ لا توجد كمية متاحة من الحالة: ${conditionNameAr}`,
        show_alert: true,
      })
      return
    }

    // حفظ الحالة المختارة في session
    ;(ctx.session as any).issueForm = {
      step: 'awaiting_quantity',
      data: {
        itemId: sparePart.id,
        sparePartName: sparePart.nameAr,
        sparePartCode: sparePart.code,
        selectedCondition: condition,
        selectedConditionNameAr: conditionNameAr,
        selectedConditionIcon: conditionIcon,
        availableQuantity,
        totalQuantity: sparePart.quantity,
      },
    }

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'sp:trans:out')

    let message = '📦 **تم اختيار الحالة**\n\n'
    message += `**المنتج:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n\n`
    message += `**الحالة المختارة:** ${conditionIcon} ${conditionNameAr}\n`
    message += `**الكمية المتاحة:** ${availableQuantity} ${sparePart.unit}\n\n`
    message += '━━━━━━━━━━━━━━\n\n'
    message += '📊 **أدخل الكمية المطلوب صرفها:**\n\n'
    message += `**مثال:** \`5\`\n\n`
    message += `⚠️ **الحد الأقصى:** ${availableQuantity} ${sparePart.unit}\n\n`
    message += '⏳ **في انتظار الإدخال...**'

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error selecting condition:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 3️⃣ نقل بين مواقع
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text(' عرض كل المنتجات', 'sp:trans:transfer:list:1')
    .row()
    .text(' البحث عن قطعة', 'sp:trans:transfer:search')
    .row()
    .text('📸 مسح باركود', 'sp:trans:transfer:scan')
    .row()
    .text('🎯 فلترة المنتجات', 'sp:trans:transfer:filters')
    .row()
    .text('⬅️ رجوع', 'sp:transactions:menu')

  await ctx.editMessageText(
    '🔄 **نقل بين مواقع**\n\n'
    + '📋 **اختر طريقة اختيار القطعة:**\n\n'
    + ' **عرض كل المنتجات**\n'
    + '└ عرض جميع قطع الغيار مع التصفح\n\n'
    + ' **البحث عن قطعة**\n'
    + '└ بحث بالكود أو الاسم أو الباركود\n\n'
    + '📸 **مسح باركود**\n'
    + '└ بحث سريع بالباركود\n\n'
    + '🎯 **فلترة المنتجات**\n'
    + '└ فلترة حسب الفئة، الموقع، أو المخزون',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// معالجات النقل بين المواقع - عرض المنتجات
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:transfer:list:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match[1], 10)

  try {
    await showTransferItemsList(ctx, page)
  }
  catch (error) {
    console.error('Error showing transfer items list:', error)
    await ctx.reply('❌ حدث خطأ أثناء عرض المنتجات')
  }
})

// معالج البحث - النقل بين المواقع
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔤 البحث بالكود', 'sp:trans:transfer:search:code')
    .row()
    .text('📊 البحث بالباركود', 'sp:trans:transfer:search:barcode')
    .row()
    .text('📝 البحث بالاسم', 'sp:trans:transfer:search:name')
    .row()
    .text('⬅️ رجوع', 'sp:trans:transfer')

  await ctx.editMessageText(
    '🔍 **البحث عن قطعة للنقل**\n\n'
    + '📋 **اختر طريقة البحث:**\n\n'
    + '🔤 **بالكود**\n'
    + '└ أدخل كود المنتج\n\n'
    + '📊 **بالباركود**\n'
    + '└ أدخل رقم الباركود\n\n'
    + '📝 **بالاسم**\n'
    + '└ ابحث بالاسم العربي أو الإنجليزي',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالكود
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()
  ;(ctx.session as any).transferState = { searchMode: 'search_by_code' }

  await ctx.editMessageText(
    '🔤 **البحث بالكود**\n\n'
    + '📝 أدخل كود المنتج:\n\n'
    + '**مثال:** `CAR-00001`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالباركود
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()
  ;(ctx.session as any).transferState = { searchMode: 'search_by_barcode' }

  await ctx.editMessageText(
    '📊 **البحث بالباركود**\n\n'
    + '📝 أدخل رقم الباركود:\n\n'
    + '**مثال:** `6282736894501`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالاسم
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()
  ;(ctx.session as any).transferState = { searchMode: 'search_by_name' }

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + '✍️ أدخل اسم المنتج (عربي أو إنجليزي):\n\n'
    + '**مثال:** `فلتر زيت`\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
      parse_mode: 'Markdown',
    },
  )
})

// مسح الباركود بالصورة
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:scan', async (ctx) => {
  await ctx.answerCallbackQuery()
  ;(ctx.session as any).transferState = { searchMode: 'awaiting_barcode_image' }

  await ctx.editMessageText(
    '📸 **مسح باركود المنتج**\n\n'
    + '📷 **أرسل صورة الباركود الآن**\n\n'
    + '⚠️ **ملاحظات:**\n'
    + '  • تأكد من وضوح الباركود في الصورة\n'
    + '  • يفضل التصوير في إضاءة جيدة\n'
    + '  • تجنب الانعكاسات على الباركود\n\n'
    + '⏳ **في انتظار الصورة...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
      parse_mode: 'Markdown',
    },
  )
})

// الفلاتر
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:filters', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📂 حسب الفئة', 'sp:trans:transfer:filter:category')
    .row()
    .text('📍 حسب الموقع', 'sp:trans:transfer:filter:location')
    .row()
    .text('📊 حسب المخزون', 'sp:trans:transfer:filter:stock')
    .row()
    .text('⬅️ رجوع', 'sp:trans:transfer')

  await ctx.editMessageText(
    '🎯 **فلترة المنتجات للنقل**\n\n'
    + '📋 **اختر نوع الفلتر:**\n\n'
    + '📂 **حسب الفئة**\n'
    + '└ فلترة حسب فئة المنتج\n\n'
    + '📍 **حسب الموقع**\n'
    + '└ فلترة حسب موقع التخزين\n\n'
    + '📊 **حسب المخزون**\n'
    + '└ منتجات متوفرة، منخفضة، نفذت',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// معالج اختيار المنتج للنقل
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:transfer:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart || !sparePart.location) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة أو موقعها غير موجود', show_alert: true })
      return
    }

    // التحقق من توفر كمية
    if (sparePart.quantity === 0) {
      await ctx.answerCallbackQuery({
        text: '⚠️ لا توجد كمية متاحة من هذه القطعة للنقل',
        show_alert: true,
      })
      return
    }

    // حفظ بيانات القطعة في session
    ;(ctx.session as any).transferState = {
      step: 'awaiting_quantity',
      itemId: sparePart.id,
      sparePartName: sparePart.nameAr,
      sparePartCode: sparePart.code,
      currentLocationId: sparePart.locationId,
      currentLocationName: sparePart.location.nameAr,
      availableQuantity: sparePart.quantity,
    }

    // رسالة طلب الكمية
    let message = `📦 **تم اختيار القطعة**\n\n`
    message += `**الاسم:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n`
    if (sparePart.barcode) {
      message += `**الباركود:** \`${sparePart.barcode}\`\n`
    }
    message += `\n**التصنيف:** ${sparePart.category?.icon} ${sparePart.category?.nameAr}\n`
    message += `**الموقع الحالي:** 📍 ${sparePart.location.nameAr}\n`
    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `📦 **الكمية المتاحة: ${sparePart.quantity} ${sparePart.unit || 'قطعة'}**\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
    message += `📊 **أدخل الكمية للتأكيد:**\n\n`
    message += `**الكمية المطلوبة:** \`${sparePart.quantity}\`\n\n`
    message += `💡 **ملاحظة:** لا يمكن نقل جزء من الكمية.\n`
    message += `إذا كنت تريد نقل جزء، قم بإصدار الكمية غير المطلوبة أولاً.\n\n`
    message += `⏳ **في انتظار الإدخال...**`

    await ctx.editMessageText(message, {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error selecting item for transfer:', error)
    await ctx.reply('❌ حدث خطأ في اختيار القطعة')
  }
})

// ─────────────────────────────────────────────────────────
// معالج اختيار الموقع الجديد للنقل
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:transfer:location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const newLocationId = Number.parseInt(ctx.match![1], 10)
  const transferState = (ctx.session as any).transferState

  if (!transferState || transferState.step !== 'awaiting_new_location') {
    await ctx.reply('❌ حدث خطأ. الرجاء البدء من جديد.')
    ;(ctx.session as any).transferState = undefined
    return
  }

  try {
    const newLocation = await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: newLocationId },
    })

    if (!newLocation) {
      await ctx.reply('❌ الموقع غير موجود')
      return
    }

    // حفظ الموقع الجديد
    ;(ctx.session as any).transferState = {
      ...transferState,
      step: 'confirm',
      newLocationId,
      newLocationName: newLocation.nameAr,
    }

    // عرض ملخص عملية النقل للمراجعة
    let message = `🔍 **مراجعة عملية النقل**\n\n`
    message += `📦 **القطعة:** ${transferState.itemName}\n`
    message += `🔤 **الكود:** \`${transferState.itemCode}\`\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📊 **الكمية المنقولة:** ${transferState.quantity}\n`
    message += `📍 **من:** ${transferState.currentLocationName}\n`
    message += `📍 **إلى:** ${newLocation.nameAr}\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `⚠️ **هل تريد تأكيد عملية النقل؟**`

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد النقل', 'sp:trans:transfer:confirm')
      .row()
      .text('❌ إلغاء', 'sp:trans:transfer')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error selecting location:', error)
    await ctx.reply('❌ حدث خطأ في اختيار الموقع')
  }
})

// ─────────────────────────────────────────────────────────
// معالج تأكيد النقل
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:trans:transfer:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()

  const transferState = (ctx.session as any).transferState

  if (!transferState || transferState.step !== 'confirm') {
    await ctx.reply('❌ حدث خطأ. الرجاء البدء من جديد.')
    ;(ctx.session as any).transferState = undefined
    return
  }

  try {
    // تحديث موقع القطعة
    await Database.prisma.iNV_Item.update({
      where: { id: transferState.itemId },
      data: {
        locationId: transferState.newLocationId,
      },
    })

    // إنشاء سجل الحركة
    const user = await Database.prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from!.id) },
    })

    if (!user) {
      await ctx.reply('❌ لم يتم العثور على بيانات المستخدم')
      ;(ctx.session as any).transferState = undefined
      return
    }

    const transactionNumber = `TRANS-${Date.now()}`

    await Database.prisma.iNV_Transaction.create({
      data: {
        transactionNumber,
        transactionType: 'TRANSFER',
        itemId: transferState.itemId,
        quantity: transferState.quantity,
        quantityBefore: transferState.availableQuantity,
        quantityAfter: transferState.availableQuantity,
        notes: `نقل ${transferState.quantity} من ${transferState.currentLocationName} إلى ${transferState.newLocationName}`,
        fromLocationId: transferState.currentLocationId,
        toLocationId: transferState.newLocationId,
        transactionDate: new Date(),
        createdBy: BigInt(ctx.from!.id),
      },
    })

    // مسح session
    ;(ctx.session as any).transferState = undefined

    // رسالة نجاح
    let message = `✅ **تم إتمام النقل بنجاح!**\n\n`
    message += `📦 **المنتج:** ${transferState.itemName}\n`
    message += `🔤 **الكود:** \`${transferState.itemCode}\`\n`
    message += `🔢 **رقم الحركة:** \`${transactionNumber}\`\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📊 **الكمية المنقولة:** ${transferState.quantity}\n`
    message += `📍 **من:** ${transferState.currentLocationName}\n`
    message += `📍 **إلى:** ${transferState.newLocationName}\n\n`
    message += `━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('🔄 عملية نقل جديدة', 'sp:trans:transfer')
      .row()
      .text('📋 القائمة الرئيسية', 'menu:back')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error confirming transfer:', error)
    await ctx.reply('❌ حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.')
  }
})

// ════════════════════════════════════════════════════════
// 4️⃣ إرجاع للمخزن
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:return', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text(' عرض كل المنتجات', 'sp:trans:return:list:1')
    .row()
    .text(' البحث عن قطعة', 'sp:trans:return:search')
    .row()
    .text('📸 مسح باركود', 'sp:trans:return:scan')
    .row()
    .text('🎯 فلترة المنتجات', 'sp:trans:return:filters')
    .row()
    .text('⬅️ رجوع', 'sp:transactions:menu')

  await ctx.editMessageText(
    '↩️ **إرجاع للمخزن**\n\n'
    + '📋 **اختر طريقة اختيار القطعة:**\n\n'
    + ' **عرض كل المنتجات**\n'
    + '└ عرض جميع قطع الغيار مع التصفح\n\n'
    + ' **البحث عن قطعة**\n'
    + '└ بحث بالكود أو الاسم أو الباركود\n\n'
    + '📸 **مسح باركود**\n'
    + '└ بحث سريع بالباركود\n\n'
    + '🎯 **فلترة المنتجات**\n'
    + '└ فلترة حسب الفئة، الموقع، أو المخزون',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// معالجات البحث والفلاتر للإرجاع
// ─────────────────────────────────────────────────────────

// عرض كل المنتجات (pagination)
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:list:(\d+)(?::(.+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match![1], 10)
  const filterType = ctx.match![2] // category:id, location:id, outofstock, lowstock, available

  const itemsPerPage = 10
  const skip = (page - 1) * itemsPerPage

  try {
    // بناء شروط الفلترة
    const where: any = { isActive: true }

    if (filterType) {
      if (filterType === 'outofstock') {
        where.quantity = 0
      }
      else if (filterType === 'lowstock') {
        where.AND = [
          { quantity: { gt: 0 } },
          { OR: [
            { quantity: { lt: Database.prisma.iNV_Item.fields.minQuantity } },
          ] },
        ]
      }
      else if (filterType === 'available') {
        where.quantity = { gt: 0 }
      }
      else if (filterType.startsWith('category:')) {
        const categoryId = Number.parseInt(filterType.split(':')[1], 10)
        where.categoryId = categoryId
      }
      else if (filterType.startsWith('location:')) {
        const locationId = Number.parseInt(filterType.split(':')[1], 10)
        where.locationId = locationId
      }
    }

    const [items, totalCount] = await Promise.all([
      Database.prisma.iNV_Item.findMany({
        where,
        skip,
        take: itemsPerPage,
        orderBy: { code: 'asc' },
        include: {
          category: { select: { nameAr: true, icon: true } },
          location: { select: { nameAr: true } },
        },
      }),
      Database.prisma.iNV_Item.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '📋 **قائمة المنتجات للإرجاع**\n\n'

    if (filterType === 'outofstock') {
      message += '🔴 **الفلتر:** نفذ المخزون\n\n'
    }
    else if (filterType === 'lowstock') {
      message += '🟡 **الفلتر:** مخزون منخفض\n\n'
    }
    else if (filterType === 'available') {
      message += '🟢 **الفلتر:** متوفر\n\n'
    }
    else if (filterType?.startsWith('category:')) {
      const cat = await Database.prisma.equipmentCategory.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📂 **الفلتر:** ${cat?.nameAr || 'فئة'}\n\n`
    }
    else if (filterType?.startsWith('location:')) {
      const loc = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: Number.parseInt(filterType.split(':')[1], 10) },
      })
      message += `📍 **الفلتر:** ${loc?.nameAr || 'موقع'}\n\n`
    }

    message += `📄 **الصفحة ${page} من ${totalPages}**\n`
    message += `📊 **إجمالي:** ${totalCount} منتج\n\n`
    message += '━━━━━━━━━━━━━━\n\n'

    if (items.length === 0) {
      message += '⚠️ لا توجد منتجات متاحة.'
    }
    else {
      for (const item of items) {
        const stockStatus = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'

        message += `${stockStatus} **${item.nameAr}**\n`
        message += `   🔤 \`${item.code}\`\n`
        message += `   📂 ${item.category.icon || '🏷️'} ${item.category.nameAr}\n`
        if (item.location) {
          message += `   📍 ${item.location.nameAr}\n`
        }
        message += `   📦 الكمية: ${item.quantity} ${item.unit}\n`
        message += `     └ 🆕 ${item.quantityNew || 0} | ♻️ ${item.quantityUsed || 0} | 🔄 ${item.quantityRefurbished || 0}\n`
        message += `   💰 ${item.unitPrice.toFixed(2)} ${item.currency}\n`
        message += '\n'
      }
    }

    // بناء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // أزرار اختيار المنتجات
    if (items.length > 0) {
      for (const item of items) {
        const stockEmoji = item.quantity === 0 ? '🔴' : item.quantity <= item.minQuantity ? '🟡' : '🟢'
        const displayName = item.nameAr.length > 25 ? `${item.nameAr.substring(0, 25)}...` : item.nameAr
        keyboard.text(`${stockEmoji} ${displayName}`, `sp:trans:return:select:${item.id}`).row()
      }
    }

    // أزرار التنقل
    keyboard.row()
    if (page > 1) {
      keyboard.text('⬅️ السابق', `sp:trans:return:list:${page - 1}${filterType ? `:${filterType}` : ''}`)
    }
    if (page < totalPages) {
      keyboard.text('التالي ➡️', `sp:trans:return:list:${page + 1}${filterType ? `:${filterType}` : ''}`)
    }

    keyboard
      .row()
      .text('🎯 الفلاتر', 'sp:trans:return:filters')
      .row()
      .text('🔍 بحث', 'sp:trans:return:search')
      .row()
      .text('⬅️ رجوع', 'sp:trans:return')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error listing products for return:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في جلب المنتجات', show_alert: true })
  }
})

// قائمة البحث
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔤 بحث بالكود', 'sp:trans:return:search:code')
    .row()
    .text('📊 بحث بالباركود', 'sp:trans:return:search:barcode')
    .row()
    .text('📝 بحث بالاسم', 'sp:trans:return:search:name')
    .row()
    .text('⬅️ رجوع', 'sp:trans:return')

  await ctx.editMessageText(
    '🔍 **البحث عن قطعة**\n\n' + 'اختر طريقة البحث:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالكود
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).returnState = {
    searchMode: 'search_by_code',
  }

  await ctx.editMessageText(
    '🔤 **البحث بالكود**\n\n' + 'أدخل كود القطعة:\n\n' + '**مثال:** `CAR-ENG-00123`',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:return'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالباركود
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).returnState = {
    searchMode: 'search_by_barcode',
  }

  await ctx.editMessageText(
    '📊 **البحث بالباركود**\n\n' + 'أدخل رقم الباركود:\n\n' + '**مثال:** `6281234567890`',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:return'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالاسم
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).returnState = {
    searchMode: 'search_by_name',
  }

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n' + 'أدخل اسم القطعة أو جزء منه:\n\n' + '**مثال:** `فلتر زيت`',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:return'),
      parse_mode: 'Markdown',
    },
  )
})

// مسح باركود (صورة)
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  ;(ctx.session as any).returnState = {
    searchMode: 'awaiting_barcode_image',
  }

  await ctx.editMessageText(
    '📸 **مسح باركود**\n\n'
    + '📷 قم بإرسال صورة للباركود الآن\n\n'
    + '💡 **ملاحظة:** تأكد من وضوح الصورة والإضاءة الجيدة',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:return'),
      parse_mode: 'Markdown',
    },
  )
})

// الفلاتر
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:filters', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📂 حسب الفئة', 'sp:trans:return:filter:category')
    .row()
    .text('📍 حسب الموقع', 'sp:trans:return:filter:location')
    .row()
    .text('📊 حسب المخزون', 'sp:trans:return:filter:stock')
    .row()
    .text('⬅️ رجوع', 'sp:trans:return')

  await ctx.editMessageText('🎯 **فلترة المنتجات**\n\n' + 'اختر نوع الفلتر:', {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// معالجات الفلترة - حسب الفئة
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:filter:category', async (ctx) => {
  await ctx.answerCallbackQuery()

  const categories = await Database.prisma.equipmentCategory.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const cat of categories) {
    keyboard.text(
      `${cat.icon || '📦'} ${cat.nameAr}`,
      `sp:trans:return:list:1:category:${cat.id}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', 'sp:trans:return:filters')

  await ctx.editMessageText(
    '� **اختر التصنيف:**\n\n'
    + 'اختر التصنيف الذي تريد عرض منتجاته:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالجات الفلترة - حسب الموقع
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:filter:location', async (ctx) => {
  await ctx.answerCallbackQuery()

  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  for (const loc of locations) {
    keyboard.text(
      `📍 ${loc.nameAr}`,
      `sp:trans:return:list:1:location:${loc.id}`,
    ).row()
  }

  keyboard.text('⬅️ رجوع', 'sp:trans:return:filters')

  await ctx.editMessageText(
    '� **اختر الموقع:**\n\n'
    + 'اختر موقع التخزين الذي تريد عرض منتجاته:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// معالجات الفلترة - حسب المخزون
sparePartsTransactionsHandler.callbackQuery('sp:trans:return:filter:stock', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('� نفذ المخزون', 'sp:trans:return:list:1:outofstock')
    .row()
    .text('🟡 مخزون منخفض', 'sp:trans:return:list:1:lowstock')
    .row()
    .text('🟢 متوفر', 'sp:trans:return:list:1:available')
    .row()
    .text('⬅️ رجوع', 'sp:trans:return:filters')

  await ctx.editMessageText(
    '📊 **فلترة حسب المخزون:**\n\n'
    + 'اختر حالة المخزون:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// معالج اختيار الصنف للإرجاع (عرض آخر 5 عمليات صرف)
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1], 10)

  try {
    // جلب بيانات الصنف
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
      return
    }

    // جلب آخر 10 عمليات صرف (OUT) لهذا الصنف
    const allIssueTransactions = await Database.prisma.iNV_Transaction.findMany({
      where: {
        itemId,
        transactionType: 'OUT',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    if (allIssueTransactions.length === 0) {
      await ctx.editMessageText(
        '⚠️ **لا توجد عمليات صرف سابقة لهذا الصنف**\n\n'
        + `📦 **${sparePart.nameAr}**\n`
        + `🔤 **الكود:** \`${sparePart.code}\`\n\n`
        + 'لا يمكن إرجاع صنف لم يتم صرفه من قبل.',
        {
          reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // فلترة العمليات التي لها كمية متاحة للإرجاع
    const availableTransactions = []
    for (const trans of allIssueTransactions) {
      // حساب مجموع الكميات المرجعة من هذه العملية
      const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
        where: {
          transactionType: 'RETURN',
          notes: {
            contains: `#${trans.transactionNumber}`,
          },
        },
        _sum: {
          quantity: true,
        },
      })

      const totalReturned = returnedQuantity._sum.quantity || 0
      const availableForReturn = trans.quantity - totalReturned

      if (availableForReturn > 0) {
        availableTransactions.push({
          ...trans,
          availableForReturn,
        })
      }
    }

    // الاحتفاظ بأول 5 عمليات فقط
    const issueTransactions = availableTransactions.slice(0, 5)

    if (issueTransactions.length === 0) {
      await ctx.editMessageText(
        '⚠️ **لا توجد عمليات صرف متاحة للإرجاع**\n\n'
        + `📦 **${sparePart.nameAr}**\n`
        + `🔤 **الكود:** \`${sparePart.code}\`\n\n`
        + 'جميع عمليات الصرف السابقة تم إرجاعها بالكامل.',
        {
          reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // عرض القائمة
    let message = `↩️ **اختر عملية الصرف للإرجاع**\n\n`
    message += `📦 **${sparePart.nameAr}**\n`
    message += `🔤 **الكود:** \`${sparePart.code}\`\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📋 **آخر ${issueTransactions.length} عمليات صرف:**\n\n`

    const keyboard = new InlineKeyboard()

    for (const trans of issueTransactions) {
      const date = trans.createdAt.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const time = trans.createdAt.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })

      message += `🔢 **#${trans.transactionNumber}**\n`
      message += `   📊 الكمية الأصلية: ${trans.quantity} ${sparePart.unit || 'قطعة'}\n`
      message += `   ✅ المتاح للإرجاع: ${trans.availableForReturn} ${sparePart.unit || 'قطعة'}\n`
      message += `   📅 ${date} - ⏰ ${time}\n`
      if (trans.notes) {
        message += `   📝 ${trans.notes}\n`
      }
      message += `\n`

      keyboard
        .text(`#${trans.transactionNumber} - ${trans.availableForReturn} ${sparePart.unit || 'قطعة'}`, `sp:trans:return:quantity:${trans.id}`)
        .row()
    }

    keyboard.text('🔙 رجوع', 'sp:trans:return')

    message += `━━━━━━━━━━━━━━\n\n`
    message += `💡 اختر عملية الصرف التي تريد إرجاعها`

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error selecting spare part for return:', error)
    await ctx.reply('❌ حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// معالج اختيار الكمية المُرجعة
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:quantity:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)

  try {
    // جلب عملية الصرف الأصلية
    const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
      where: { id: transactionId },
      include: { recipientEmployee: true },
    })

    if (!originalTransaction || originalTransaction.transactionType !== 'OUT') {
      await ctx.answerCallbackQuery({ text: '❌ عملية الصرف غير موجودة', show_alert: true })
      return
    }

    // جلب بيانات الصنف
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: originalTransaction.itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.answerCallbackQuery({ text: '❌ القطعة غير موجودة', show_alert: true })
      return
    }

    // حساب الكمية المتاحة للإرجاع
    const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
      where: {
        transactionType: 'RETURN',
        notes: {
          contains: `#${originalTransaction.transactionNumber}`,
        },
      },
      _sum: {
        quantity: true,
      },
    })

    const totalReturned = returnedQuantity._sum.quantity || 0
    const maxQuantity = originalTransaction.quantity - totalReturned

    if (maxQuantity <= 0) {
      await ctx.answerCallbackQuery({
        text: '❌ تم إرجاع جميع الكميات من هذه العملية',
        show_alert: true,
      })
      return
    }

    const unit = sparePart.unit || 'قطعة'

    // عرض خيارات الكمية
    let message = `📊 **اختر الكمية المُرجعة**\n\n`
    message += `📦 **${sparePart.nameAr}**\n`
    message += `🔢 **رقم العملية:** #${originalTransaction.transactionNumber}\n`
    message += `📊 **الكمية الأصلية:** ${originalTransaction.quantity} ${unit}\n`
    if (totalReturned > 0) {
      message += `↩️ **المُرجع سابقاً:** ${totalReturned} ${unit}\n`
    }
    message += `✅ **المتاح للإرجاع:** ${maxQuantity} ${unit}\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `💡 اختر الكمية التي تريد إرجاعها:`

    const keyboard = new InlineKeyboard()

    // إنشاء أزرار للكميات (من 1 إلى الكمية المتاحة)
    if (maxQuantity <= 10) {
      // إذا كانت الكمية 10 أو أقل، نعرض كل الأرقام
      for (let i = 1; i <= maxQuantity; i++) {
        keyboard.text(`${i} ${unit}`, `sp:trans:return:confirm:${transactionId}:${i}`)
        if (i % 3 === 0 || i === maxQuantity) {
          keyboard.row()
        }
      }
    }
    else {
      // إذا كانت الكمية أكبر من 10، نعرض خيارات محددة + إدخال يدوي
      const options = [1, 5, 10, Math.floor(maxQuantity / 2), maxQuantity]
      const uniqueOptions = [...new Set(options)].sort((a, b) => a - b)

      for (const qty of uniqueOptions) {
        keyboard.text(`${qty} ${unit}`, `sp:trans:return:confirm:${transactionId}:${qty}`)
        if (uniqueOptions.indexOf(qty) % 3 === 2 || qty === maxQuantity) {
          keyboard.row()
        }
      }

      // زر لإدخال كمية مخصصة
      keyboard.text('✏️ إدخال كمية مخصصة', `sp:trans:return:custom:${transactionId}`).row()
    }

    keyboard.text('🔙 رجوع', `sp:trans:return:select:${sparePart.id}`)

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing quantity selection:', error)
    await ctx.reply('❌ حدث خطأ أثناء عرض خيارات الكمية. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// معالج إدخال كمية مخصصة
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:custom:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)

  try {
    // حفظ معرف العملية في الجلسة
    ;(ctx.session as any).returnState = {
      step: 'awaiting_custom_quantity',
      transactionId,
    }

    const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
      where: { id: transactionId },
    })

    if (!originalTransaction) {
      await ctx.answerCallbackQuery({ text: '❌ عملية الصرف غير موجودة', show_alert: true })
      return
    }

    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: originalTransaction.itemId },
    })

    // حساب الكمية المتاحة للإرجاع
    const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
      where: {
        transactionType: 'RETURN',
        notes: {
          contains: `#${originalTransaction.transactionNumber}`,
        },
      },
      _sum: {
        quantity: true,
      },
    })

    const totalReturned = returnedQuantity._sum.quantity || 0
    const maxQuantity = originalTransaction.quantity - totalReturned

    const messageText = [
      `✏️ **إدخال كمية مخصصة**\n`,
      `📦 **${sparePart?.nameAr}**`,
      `🔢 **رقم العملية:** #${originalTransaction.transactionNumber}`,
      `📊 **الكمية الأصلية:** ${originalTransaction.quantity} ${sparePart?.unit || 'قطعة'}`,
      (totalReturned > 0 ? `↩️ **المُرجع سابقاً:** ${totalReturned} ${sparePart?.unit || 'قطعة'}` : ''),
      `✅ **المتاح للإرجاع:** ${maxQuantity} ${sparePart?.unit || 'قطعة'}\n`,
      `━━━━━━━━━━━━━━\n`,
      `💡 أدخل الكمية المُرجعة (من 1 إلى ${maxQuantity}):`,
    ].filter(Boolean).join('\n')

    await ctx.editMessageText(
      messageText,
      {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:trans:return:quantity:${transactionId}`),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error showing custom quantity input:', error)
    await ctx.reply('❌ حدث خطأ. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// معالج تأكيد الإرجاع (عرض بيانات عملية الصرف الأصلية)
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:confirm:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)
  const returnQuantity = Number.parseInt(ctx.match![2], 10)

  try {
    // جلب عملية الصرف الأصلية
    const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
      where: { id: transactionId },
      include: { recipientEmployee: true },
    })

    if (!originalTransaction || originalTransaction.transactionType !== 'OUT') {
      await ctx.answerCallbackQuery({ text: '❌ عملية الصرف غير موجودة', show_alert: true })
      return
    }

    // حساب الكمية المتاحة للإرجاع
    const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
      where: {
        transactionType: 'RETURN',
        notes: {
          contains: `#${originalTransaction.transactionNumber}`,
        },
      },
      _sum: {
        quantity: true,
      },
    })

    const totalReturned = returnedQuantity._sum.quantity || 0
    const maxQuantity = originalTransaction.quantity - totalReturned

    // التحقق من صحة الكمية
    if (returnQuantity < 1 || returnQuantity > maxQuantity) {
      await ctx.answerCallbackQuery({
        text: `❌ الكمية غير صحيحة. المتاح للإرجاع: ${maxQuantity}`,
        show_alert: true,
      })
      return
    }

    // جلب بيانات الصنف
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: originalTransaction.itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.reply('❌ لم يتم العثور على بيانات القطعة')
      return
    }

    // عرض رسالة التأكيد
    let message = `↩️ **تأكيد إرجاع قطعة للمخزن**\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📋 **بيانات عملية الصرف الأصلية:**\n\n`
    message += `🔢 **رقم العملية:** \`${originalTransaction.transactionNumber}\`\n`
    message += `📅 **تاريخ الصرف:** ${originalTransaction.createdAt.toLocaleDateString('ar-EG')}\n`
    message += `⏰ **الوقت:** ${originalTransaction.createdAt.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}\n`

    // عرض اسم المستلم إن وجد
    if (originalTransaction.recipientEmployee) {
      message += `👤 **المستلم:** ${originalTransaction.recipientEmployee.fullName}`
      if (originalTransaction.recipientEmployee.employeeCode) {
        message += ` (${originalTransaction.recipientEmployee.employeeCode})`
      }
      message += `\n`
    }

    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `📦 **معلومات القطعة:**\n\n`
    message += `**الاسم:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n`
    if (sparePart.barcode) {
      message += `**الباركود:** \`${sparePart.barcode}\`\n`
    }
    message += `**التصنيف:** ${sparePart.category?.icon} ${sparePart.category?.nameAr}\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📊 **تفاصيل الكمية:**\n\n`
    message += `**الكمية المصروفة الأصلية:** ${originalTransaction.quantity} ${sparePart.unit || 'قطعة'}\n`
    message += `**الكمية المُرجعة:** ${returnQuantity} ${sparePart.unit || 'قطعة'}\n`
    if (originalTransaction.unitPrice) {
      const originalTotalValue = originalTransaction.quantity * originalTransaction.unitPrice
      const returnValue = returnQuantity * originalTransaction.unitPrice
      message += `**سعر الوحدة:** ${originalTransaction.unitPrice} ${sparePart.currency || 'EGP'}\n`
      message += `**القيمة الإجمالية المصروفة:** ${originalTotalValue} ${sparePart.currency || 'EGP'}\n`
      message += `**قيمة المُرجع:** ${returnValue} ${sparePart.currency || 'EGP'}\n`
    }
    if (originalTransaction.notes) {
      message += `\n**ملاحظات الصرف الأصلية:** ${originalTransaction.notes}\n`
    }
    
    // عرض ملاحظات الإرجاع إن وجدت
    const returnNotes = (ctx.session as any).returnNotes
    if (returnNotes) {
      message += `\n📝 **ملاحظات الإرجاع:** ${returnNotes}\n`
    }
    
    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `⚠️ **هل تريد إرجاع ${returnQuantity} ${sparePart.unit || 'قطعة'} للمخزن؟**`

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد الإرجاع', `sp:trans:return:execute:${transactionId}:${returnQuantity}`)
      .row()
      .text('📝 إضافة ملاحظات', `sp:trans:return:notes:${transactionId}:${returnQuantity}`)
      .row()
      .text('🔙 تعديل الكمية', `sp:trans:return:quantity:${transactionId}`)
      .text('❌ إلغاء', 'sp:trans:return')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing return confirmation:', error)
    await ctx.reply('❌ حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// معالج إضافة ملاحظات للإرجاع
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:notes:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)
  const returnQuantity = Number.parseInt(ctx.match![2], 10)

  try {
    // حفظ البيانات في الجلسة
    ;(ctx.session as any).returnState = {
      step: 'awaiting_notes',
      transactionId,
      returnQuantity,
    }

    await ctx.editMessageText(
      `📝 **إضافة ملاحظات للإرجاع**\n\n`
      + `💡 اكتب ملاحظاتك عن سبب الإرجاع أو حالة القطعة:\n\n`
      + `مثال:\n`
      + `• قطعة تالفة\n`
      + `• فائض عن الحاجة\n`
      + `• تم الاستبدال بقطعة أخرى\n`
      + `• إلخ...\n\n`
      + `━━━━━━━━━━━━━━\n\n`
      + `✍️ اكتب ملاحظاتك الآن:`,
      {
        reply_markup: new InlineKeyboard()
          .text('⏭️ تخطي (بدون ملاحظات)', `sp:trans:return:skip_notes:${transactionId}:${returnQuantity}`)
          .row()
          .text('❌ إلغاء', 'sp:trans:return'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error showing notes input:', error)
    await ctx.reply('❌ حدث خطأ. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// معالج تخطي الملاحظات
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:skip_notes:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)
  const returnQuantity = Number.parseInt(ctx.match![2], 10)

  // مسح أي ملاحظات محفوظة
  ;(ctx.session as any).returnNotes = undefined
  ;(ctx.session as any).returnState = undefined

  // العودة لصفحة التأكيد
  try {
    const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
      where: { id: transactionId },
      include: { recipientEmployee: true },
    })

    if (!originalTransaction) {
      await ctx.reply('❌ عملية الصرف غير موجودة')
      return
    }

    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: originalTransaction.itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.reply('❌ لم يتم العثور على بيانات القطعة')
      return
    }

    // عرض رسالة التأكيد
    let message = `↩️ **تأكيد إرجاع قطعة للمخزن**\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📋 **بيانات عملية الصرف الأصلية:**\n\n`
    message += `🔢 **رقم العملية:** \`${originalTransaction.transactionNumber}\`\n`
    message += `📅 **تاريخ الصرف:** ${originalTransaction.createdAt.toLocaleDateString('ar-EG')}\n`
    message += `⏰ **الوقت:** ${originalTransaction.createdAt.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}\n`
    
    // عرض اسم المستلم إن وجد
    if (originalTransaction.recipientEmployee) {
      message += `👤 **المستلم:** ${originalTransaction.recipientEmployee.fullName}`
      if (originalTransaction.recipientEmployee.employeeCode) {
        message += ` (${originalTransaction.recipientEmployee.employeeCode})`
      }
      message += `\n`
    }
    
    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `📦 **معلومات القطعة:**\n\n`
    message += `**الاسم:** ${sparePart.nameAr}\n`
    message += `**الكود:** \`${sparePart.code}\`\n`
    if (sparePart.barcode) {
      message += `**الباركود:** \`${sparePart.barcode}\`\n`
    }
    message += `**التصنيف:** ${sparePart.category?.icon} ${sparePart.category?.nameAr}\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📊 **تفاصيل الكمية:**\n\n`
    message += `**الكمية المصروفة الأصلية:** ${originalTransaction.quantity} ${sparePart.unit || 'قطعة'}\n`
    message += `**الكمية المُرجعة:** ${returnQuantity} ${sparePart.unit || 'قطعة'}\n`
    if (originalTransaction.unitPrice) {
      const originalTotalValue = originalTransaction.quantity * originalTransaction.unitPrice
      const returnValue = returnQuantity * originalTransaction.unitPrice
      message += `**سعر الوحدة:** ${originalTransaction.unitPrice} ${sparePart.currency || 'EGP'}\n`
      message += `**القيمة الإجمالية المصروفة:** ${originalTotalValue} ${sparePart.currency || 'EGP'}\n`
      message += `**قيمة المُرجع:** ${returnValue} ${sparePart.currency || 'EGP'}\n`
    }
    if (originalTransaction.notes) {
      message += `\n**ملاحظات الصرف الأصلية:** ${originalTransaction.notes}\n`
    }
    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `⚠️ **هل تريد إرجاع ${returnQuantity} ${sparePart.unit || 'قطعة'} للمخزن؟**`

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد الإرجاع', `sp:trans:return:execute:${transactionId}:${returnQuantity}`)
      .row()
      .text('📝 إضافة ملاحظات', `sp:trans:return:notes:${transactionId}:${returnQuantity}`)
      .row()
      .text('🔙 تعديل الكمية', `sp:trans:return:quantity:${transactionId}`)
      .text('❌ إلغاء', 'sp:trans:return')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing confirmation:', error)
    await ctx.reply('❌ حدث خطأ. حاول مرة أخرى.')
  }
})

// ─────────────────────────────────────────────────────────
// تنفيذ عملية الإرجاع
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:return:execute:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const originalTransactionId = Number.parseInt(ctx.match![1], 10)
  const returnQuantity = Number.parseInt(ctx.match![2], 10)

  try {
    // جلب عملية الصرف الأصلية
    const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
      where: { id: originalTransactionId },
      include: { recipientEmployee: true },
    })

    if (!originalTransaction) {
      await ctx.reply('❌ عملية الصرف غير موجودة')
      return
    }

    // التحقق من صحة الكمية
    if (returnQuantity < 1 || returnQuantity > originalTransaction.quantity) {
      await ctx.answerCallbackQuery({
        text: `❌ الكمية غير صحيحة. يجب أن تكون من 1 إلى ${originalTransaction.quantity}`,
        show_alert: true,
      })
      return
    }

    // جلب بيانات الصنف
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: originalTransaction.itemId },
      include: {
        category: true,
        location: true,
      },
    })

    if (!sparePart) {
      await ctx.reply('❌ لم يتم العثور على بيانات القطعة')
      return
    }

    // تحديث الكمية (إضافة الكمية المرجعة)
    await Database.prisma.iNV_Item.update({
      where: { id: sparePart.id },
      data: {
        quantity: sparePart.quantity + returnQuantity,
      },
    })

    // إنشاء سجل الإرجاع
    const returnTransactionNumber = `RET-${Date.now()}`
    
    // جلب الملاحظات من الجلسة
    const returnNotes = (ctx.session as any).returnNotes || ''
    
    // بناء نص الملاحظات
    let notesText = `إرجاع ${returnQuantity} من ${originalTransaction.quantity} من العملية #${originalTransaction.transactionNumber}`
    if (returnNotes) {
      notesText += ` | ${returnNotes}`
    }

    await Database.prisma.iNV_Transaction.create({
      data: {
        transactionNumber: returnTransactionNumber,
        transactionType: 'RETURN',
        itemId: sparePart.id,
        quantity: returnQuantity,
        quantityBefore: sparePart.quantity,
        quantityAfter: sparePart.quantity + returnQuantity,
        unitPrice: originalTransaction.unitPrice,
        notes: notesText,
        toLocationId: originalTransaction.fromLocationId, // إرجاع لنفس الموقع
        transactionDate: new Date(),
        createdBy: BigInt(ctx.from!.id),
      },
    })
    
    // مسح الملاحظات من الجلسة
    ;(ctx.session as any).returnNotes = undefined

    // رسالة النجاح مع الإرشادات
    let message = `✅ **تم إرجاع القطعة بنجاح!**\n\n`
    message += `🔢 **رقم عملية الإرجاع:** \`${returnTransactionNumber}\`\n`
    message += `🔗 **عملية الصرف الأصلية:** \`${originalTransaction.transactionNumber}\`\n`
    
    // عرض اسم المستلم إن وجد
    if (originalTransaction.recipientEmployee) {
      message += `👤 **المستلم الأصلي:** ${originalTransaction.recipientEmployee.fullName}`
      if (originalTransaction.recipientEmployee.employeeCode) {
        message += ` (${originalTransaction.recipientEmployee.employeeCode})`
      }
      message += `\n`
    }
    
    message += `📅 **التاريخ:** ${new Date().toLocaleDateString('ar-EG')}\n`
    message += `⏰ **الوقت:** ${new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `📦 **المنتج:** ${sparePart.nameAr}\n`
    message += `🔤 **الكود:** \`${sparePart.code}\`\n`
    message += `📊 **الكمية المرجعة:** ${returnQuantity} ${sparePart.unit || 'قطعة'}\n`
    if (returnQuantity < originalTransaction.quantity) {
      message += `📊 **الكمية الأصلية المصروفة:** ${originalTransaction.quantity} ${sparePart.unit || 'قطعة'}\n`
      message += `📊 **الكمية المتبقية خارج المخزن:** ${originalTransaction.quantity - returnQuantity} ${sparePart.unit || 'قطعة'}\n`
    }
    if (returnNotes) {
      message += `📝 **ملاحظات الإرجاع:** ${returnNotes}\n`
    }
    message += `\n━━━━━━━━━━━━━━\n\n`
    message += `📍 **إرشادات التخزين:**\n\n`
    message += `✅ **الموقع المخصص:** ${sparePart.location?.nameAr || 'غير محدد'}\n\n`
    message += `⚠️ **يرجى القيام بما يلي:**\n\n`
    message += `1️⃣ إعادة القطعة إلى موقع التخزين المحدد أعلاه\n`
    message += `2️⃣ التأكد من وضع القطعة في المكان الصحيح\n`
    message += `3️⃣ التحقق من حالة القطعة وتسجيل أي ملاحظات\n`
    message += `4️⃣ تحديث بطاقة الصنف إذا لزم الأمر\n\n`
    message += `━━━━━━━━━━━━━━\n\n`
    message += `💡 **الكمية الحالية في المخزن:** ${sparePart.quantity + returnQuantity} ${sparePart.unit || 'قطعة'}`

    const keyboard = new InlineKeyboard()
      .text('↩️ إرجاع قطعة أخرى', 'sp:trans:return')
      .row()
      .text('📋 القائمة الرئيسية', 'menu:back')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error executing return:', error)
    await ctx.reply('❌ حدث خطأ أثناء تنفيذ الإرجاع. حاول مرة أخرى.')
  }
})

// ════════════════════════════════════════════════════════
// 5️⃣ تسوية جرد
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// ⚖️ نظام الجرد الاحترافي - Inventory Audit System
// ════════════════════════════════════════════════════════

sparePartsTransactionsHandler.callbackQuery('sp:trans:adjust', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🏢 جرد شامل', 'sp:audit:full')
    .row()
    .text(' جرد حسب الفئة', 'sp:audit:category')
    .row()
    .text('📍 جرد حسب الموقع', 'sp:audit:location')
    .row()
    .text(' جرد صنف واحد', 'sp:audit:single')
    .row()
    .text('📋 عمليات الجرد السابقة', 'sp:audit:list')
    .row()
    .text('⬅️ رجوع', 'sp:transactions:menu')

  await ctx.editMessageText(
    '⚖️ **نظام الجرد**\n\n'
    + '📋 **اختر نوع الجرد:**\n\n'
    + '🏢 **جرد شامل**\n'
    + '└ جرد جميع الأصناف في المخزن\n\n'
    + '📂 **جرد حسب الفئة**\n'
    + '└ جرد فئة محددة (سيارات، حفارات، إلخ)\n\n'
    + '📍 **جرد حسب الموقع**\n'
    + '└ جرد موقع تخزين محدد\n\n'
    + '🔍 **جرد صنف واحد**\n'
    + '└ جرد صنف محدد فقط\n\n'
    + '📋 **عمليات الجرد السابقة**\n'
    + '└ عرض سجل عمليات الجرد',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// 🏢 جرد شامل - Full Audit
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:full', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // عد الأصناف
    const totalItems = await Database.prisma.iNV_Item.count({
      where: { isActive: true },
    })

    const keyboard = new InlineKeyboard()
      .text('✅ بدء الجرد الشامل', 'sp:audit:create:full')
      .row()
      .text('⬅️ رجوع', 'sp:trans:adjust')

    await ctx.editMessageText(
      '🏢 **جرد شامل**\n\n'
      + ` **إجمالي الأصناف:** ${totalItems} صنف\n\n`
      + '━━━━━━━━━━━━━━\n\n'
      + '⚠️ **ملاحظة:**\n'
      + 'سيتم جرد جميع الأصناف النشطة في المخزن\n'
      + 'يُنصح بإجراء الجرد الشامل خارج أوقات العمل\n\n'
      + '💡 **المدة المتوقعة:**\n'
      + `└ حوالي ${Math.ceil(totalItems / 10)} - ${Math.ceil(totalItems / 5)} دقيقة`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error in full audit:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// 📂 جرد حسب الفئة - Category Audit
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:category', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const categories = await Database.prisma.iNV_Category.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    const keyboard = new InlineKeyboard()

    for (const cat of categories) {
      keyboard.text(
        `${cat.icon || '📦'} ${cat.nameAr} (${cat._count.items})`,
        `sp:audit:create:category:${cat.id}`,
      ).row()
    }

    keyboard.text('⬅️ رجوع', 'sp:trans:adjust')

    await ctx.editMessageText(
      '📂 **جرد حسب الفئة**\n\n'
      + '📋 **اختر الفئة:**\n\n'
      + 'اختر الفئة التي تريد جردها:',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error in category audit:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// 📍 جرد حسب الموقع - Location Audit
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:location', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const locations = await Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { stockRecords: true },
        },
      },
    })

    const keyboard = new InlineKeyboard()

    for (const loc of locations) {
      keyboard.text(
        `📍 ${loc.nameAr} (${loc._count.stockRecords})`,
        `sp:audit:create:location:${loc.id}`,
      ).row()
    }

    keyboard.text('⬅️ رجوع', 'sp:trans:adjust')

    await ctx.editMessageText(
      '📍 **جرد حسب الموقع**\n\n'
      + ' **اختر الموقع:**\n\n'
      + 'اختر موقع التخزين الذي تريد جرده:',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error in location audit:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// 🔍 جرد صنف واحد - Single Item Audit
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:single', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔤 بحث بالكود', 'sp:audit:single:search:code')
    .row()
    .text('📊 بحث بالباركود', 'sp:audit:single:search:barcode')
    .row()
    .text('📝 بحث بالاسم', 'sp:audit:single:search:name')
    .row()
    .text('📸 مسح باركود', 'sp:audit:single:scan')
    .row()
    .text('⬅️ رجوع', 'sp:trans:adjust')

  await ctx.editMessageText(
    '🔍 **جرد صنف واحد**\n\n'
    + '📋 **اختر طريقة البحث:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ─────────────────────────────────────────────────────────
// � جرد صنف واحد - معالجات البحث
// ─────────────────────────────────────────────────────────

// البحث بالكود
sparePartsTransactionsHandler.callbackQuery('sp:audit:single:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.waitingForSingleAuditCode = true

  await ctx.editMessageText(
    '🔤 **البحث بالكود**\n\n'
    + '📝 أدخل كود الصنف المراد جرده:',
    {
      reply_markup: new InlineKeyboard().text('⬅️ إلغاء', 'sp:audit:single'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالباركود
sparePartsTransactionsHandler.callbackQuery('sp:audit:single:search:barcode', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.waitingForSingleAuditBarcode = true

  await ctx.editMessageText(
    '📊 **البحث بالباركود**\n\n'
    + '📝 أدخل الباركود أو امسحه:',
    {
      reply_markup: new InlineKeyboard().text('⬅️ إلغاء', 'sp:audit:single'),
      parse_mode: 'Markdown',
    },
  )
})

// البحث بالاسم
sparePartsTransactionsHandler.callbackQuery('sp:audit:single:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.waitingForSingleAuditName = true

  await ctx.editMessageText(
    '📝 **البحث بالاسم**\n\n'
    + '✍️ أدخل اسم الصنف أو جزء منه:',
    {
      reply_markup: new InlineKeyboard().text('⬅️ إلغاء', 'sp:audit:single'),
      parse_mode: 'Markdown',
    },
  )
})

// المسح بالباركود (نفس البحث بالباركود)
sparePartsTransactionsHandler.callbackQuery('sp:audit:single:scan', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.waitingForSingleAuditBarcode = true

  await ctx.editMessageText(
    '📸 **مسح الباركود**\n\n'
    + '📱 امسح الباركود أو أدخله يدوياً:',
    {
      reply_markup: new InlineKeyboard().text('⬅️ إلغاء', 'sp:audit:single'),
      parse_mode: 'Markdown',
    },
  )
})

// معالج البحث بالكود من الرسائل النصية
sparePartsTransactionsHandler.on('message:text', async (ctx, next) => {
  // جرد صنف واحد - بحث بالكود
  if (ctx.session.waitingForSingleAuditCode) {
    const code = ctx.message.text.trim().toUpperCase()
    delete ctx.session.waitingForSingleAuditCode

    try {
      const item = await Database.prisma.iNV_Item.findFirst({
        where: {
          code,
          isActive: true,
        },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        await ctx.reply(
          '❌ **لم يتم العثور على الصنف**\n\n'
          + `الكود: \`${code}\`\n\n`
          + '💡 تأكد من صحة الكود وأن الصنف نشط.',
          {
            reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'sp:audit:single'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // إنشاء عملية جرد لهذا الصنف
      const auditNumber = await generateAuditNumber()
      const audit = await Database.prisma.iNV_InventoryAudit.create({
        data: {
          auditNumber,
          warehouseType: 'SPARE_PARTS',
          auditType: 'SINGLE_ITEM',
          itemId: item.id,
          status: 'IN_PROGRESS',
          totalItems: 1,
          createdBy: BigInt(ctx.from!.id),
        },
      })

      ctx.session.currentAuditId = audit.id
      await startAuditProcess(ctx, audit.id)
    }
    catch (error) {
      console.error('Error searching by code:', error)
      await ctx.reply('❌ حدث خطأ أثناء البحث. حاول مرة أخرى.')
    }
    return
  }

  // جرد صنف واحد - بحث بالباركود
  if (ctx.session.waitingForSingleAuditBarcode) {
    const barcode = ctx.message.text.trim()
    delete ctx.session.waitingForSingleAuditBarcode

    try {
      const item = await Database.prisma.iNV_Item.findFirst({
        where: {
          barcode,
          isActive: true,
        },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        await ctx.reply(
          '❌ **لم يتم العثور على الصنف**\n\n'
          + `الباركود: \`${barcode}\`\n\n`
          + '💡 تأكد من صحة الباركود وأن الصنف نشط.',
          {
            reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'sp:audit:single'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // إنشاء عملية جرد لهذا الصنف
      const auditNumber = await generateAuditNumber()
      const audit = await Database.prisma.iNV_InventoryAudit.create({
        data: {
          auditNumber,
          warehouseType: 'SPARE_PARTS',
          auditType: 'SINGLE_ITEM',
          itemId: item.id,
          status: 'IN_PROGRESS',
          totalItems: 1,
          createdBy: BigInt(ctx.from!.id),
        },
      })

      ctx.session.currentAuditId = audit.id
      await startAuditProcess(ctx, audit.id)
    }
    catch (error) {
      console.error('Error searching by barcode:', error)
      await ctx.reply('❌ حدث خطأ أثناء البحث. حاول مرة أخرى.')
    }
    return
  }

  // جرد صنف واحد - بحث بالاسم
  if (ctx.session.waitingForSingleAuditName) {
    const searchName = ctx.message.text.trim()
    delete ctx.session.waitingForSingleAuditName

    try {
      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          isActive: true,
          OR: [
            { nameAr: { contains: searchName } },
            { nameEn: { contains: searchName } },
          ],
        },
        include: {
          category: true,
          location: true,
        },
        take: 10,
      })

      if (items.length === 0) {
        await ctx.reply(
          '❌ **لم يتم العثور على أصناف**\n\n'
          + `البحث: "${searchName}"\n\n`
          + '💡 حاول البحث بكلمات أخرى.',
          {
            reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'sp:audit:single'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      if (items.length === 1) {
        // صنف واحد فقط - ابدأ الجرد مباشرة
        const auditNumber = await generateAuditNumber()
        const audit = await Database.prisma.iNV_InventoryAudit.create({
          data: {
            auditNumber,
            warehouseType: 'SPARE_PARTS',
            auditType: 'SINGLE_ITEM',
            itemId: items[0].id,
            status: 'IN_PROGRESS',
            totalItems: 1,
            createdBy: BigInt(ctx.from!.id),
          },
        })

        ctx.session.currentAuditId = audit.id
        await startAuditProcess(ctx, audit.id)
      }
      else {
        // عدة أصناف - اعرض قائمة للاختيار
        const keyboard = new InlineKeyboard()

        for (const item of items) {
          keyboard
            .text(
              `${item.nameAr} (${item.code})`,
              `sp:audit:single:select:${item.id}`,
            )
            .row()
        }

        keyboard.text('⬅️ رجوع', 'sp:audit:single')

        await ctx.reply(
          '🔍 **نتائج البحث**\n\n'
          + `تم العثور على ${items.length} صنف:\n\n`
          + 'اختر الصنف المراد جرده:',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
      }
    }
    catch (error) {
      console.error('Error searching by name:', error)
      await ctx.reply('❌ حدث خطأ أثناء البحث. حاول مرة أخرى.')
    }
    return
  }

  await next()
})

// معالج الصور - مسح باركود من صورة
sparePartsTransactionsHandler.on('message:photo', async (ctx, next) => {
  if (ctx.session.waitingForSingleAuditBarcode) {
    delete ctx.session.waitingForSingleAuditBarcode

    try {
      await ctx.reply('⏳ جاري قراءة الباركود من الصورة...')

      // الحصول على أكبر حجم للصورة
      const photo = ctx.message.photo[ctx.message.photo.length - 1]
      const file = await ctx.api.getFile(photo.file_id)

      if (!file.file_path) {
        await ctx.reply('❌ لم يتم العثور على مسار الملف')
        return
      }

      // تنزيل الصورة
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const buffer = Buffer.from(await response.arrayBuffer())

      // محاولة قراءة الباركود
      const barcodeResult = await BarcodeScannerService.scanBarcode(buffer)

      if (!barcodeResult || !barcodeResult.data) {
        await ctx.reply(
          '❌ **لم يتم العثور على باركود في الصورة**\n\n'
          + '💡 تأكد من:\n'
          + '• وضوح الباركود في الصورة\n'
          + '• عدم وجود انعكاسات أو ظلال\n'
          + '• التقاط الصورة من زاوية مباشرة',
          {
            reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'sp:audit:single'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      const barcode = barcodeResult.data

      // البحث عن الصنف بالباركود
      const item = await Database.prisma.iNV_Item.findFirst({
        where: {
          barcode,
          isActive: true,
        },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        await ctx.reply(
          '❌ **لم يتم العثور على الصنف**\n\n'
          + `📊 الباركود المقروء: \`${barcode}\`\n\n`
          + '💡 تأكد من أن الصنف مسجل في النظام.',
          {
            reply_markup: new InlineKeyboard().text('🔍 بحث جديد', 'sp:audit:single'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // إنشاء عملية جرد لهذا الصنف
      const auditNumber = await generateAuditNumber()
      const audit = await Database.prisma.iNV_InventoryAudit.create({
        data: {
          auditNumber,
          warehouseType: 'SPARE_PARTS',
          auditType: 'SINGLE_ITEM',
          itemId: item.id,
          status: 'IN_PROGRESS',
          totalItems: 1,
          createdBy: BigInt(ctx.from!.id),
        },
      })

      ctx.session.currentAuditId = audit.id
      await startAuditProcess(ctx, audit.id)
    }
    catch (error) {
      console.error('Error scanning barcode from photo:', error)
      await ctx.reply('❌ حدث خطأ أثناء قراءة الباركود. حاول مرة أخرى.')
    }
    return
  }

  await next()
})

// اختيار صنف من نتائج البحث بالاسم
sparePartsTransactionsHandler.callbackQuery(/^sp:audit:single:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء عملية الجرد...' })

  try {
    const itemId = Number.parseInt(ctx.match![1], 10)

    // إنشاء عملية جرد لهذا الصنف
    const auditNumber = await generateAuditNumber()
    const audit = await Database.prisma.iNV_InventoryAudit.create({
      data: {
        auditNumber,
        warehouseType: 'SPARE_PARTS',
        auditType: 'SINGLE_ITEM',
        itemId,
        status: 'IN_PROGRESS',
        totalItems: 1,
        createdBy: BigInt(ctx.from!.id),
      },
    })

    ctx.session.currentAuditId = audit.id
    await startAuditProcess(ctx, audit.id)
  }
  catch (error) {
    console.error('Error creating single item audit:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// �📋 عرض عمليات الجرد السابقة
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:audit:list(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const page = Number.parseInt(ctx.match![1] || '1', 10)
    const pageSize = 10

    const [audits, totalCount] = await Promise.all([
      Database.prisma.iNV_InventoryAudit.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { auditDate: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      }),
      Database.prisma.iNV_InventoryAudit.count(),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    let message = '📋 **عمليات الجرد السابقة**\n\n'

    if (audits.length === 0) {
      message += '⚠️ لا توجد عمليات جرد مسجلة.'
    }
    else {
      for (const audit of audits) {
        const statusIcon = audit.status === 'COMPLETED' ? '✅' : audit.status === 'CANCELLED' ? '❌' : '🔄'
        const typeText
          = audit.auditType === 'FULL'
            ? 'جرد شامل'
            : audit.auditType === 'CATEGORY'
              ? 'جرد فئة'
              : audit.auditType === 'LOCATION'
                ? 'جرد موقع'
                : 'جرد صنف'

        message += `${statusIcon} **${audit.auditNumber}**\n`
        message += `📂 ${typeText}\n`
        message += `📅 ${new Date(audit.auditDate).toLocaleString('ar-EG')}\n`
        message += `📊 ${audit.itemsChecked}/${audit.totalItems} صنف\n`
        message += `⚠️ ${audit.itemsWithDiff} اختلاف\n`
        message += '━━━━━━━━━━━━━━\n\n'
      }

      message += `📄 الصفحة ${page} من ${totalPages}`
    }

    const keyboard = new InlineKeyboard()

    // أزرار التنقل
    if (page > 1) {
      keyboard.text('⏮️ السابق', `sp:audit:list:${page - 1}`)
    }
    if (page < totalPages) {
      keyboard.text('التالي ⏭️', `sp:audit:list:${page + 1}`)
    }
    keyboard.row()
    keyboard.text('⬅️ رجوع', 'sp:trans:adjust')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error in audit list:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 🔧 معالجات إنشاء الجرد - Create Audit Handlers
// ════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// إنشاء جرد شامل
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:create:full', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء عملية الجرد...' })

  try {
    // إنشاء رقم جرد
    const auditNumber = await generateAuditNumber()

    // إنشاء سجل الجرد
    const audit = await Database.prisma.iNV_InventoryAudit.create({
      data: {
        auditNumber,
        warehouseType: 'SPARE_PARTS',
        auditType: 'FULL',
        status: 'IN_PROGRESS',
        createdBy: BigInt(ctx.from!.id),
      },
    })

    // حفظ ID الجرد في الجلسة
    ctx.session.currentAuditId = audit.id

    // بدء عملية الجرد
    await startAuditProcess(ctx, audit.id)
  }
  catch (error) {
    console.error('Error creating full audit:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء إنشاء عملية الجرد')
  }
})

// ─────────────────────────────────────────────────────────
// إنشاء جرد حسب الفئة
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:audit:create:category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء عملية الجرد...' })

  try {
    const categoryId = Number.parseInt(ctx.match![1], 10)

    // جلب معلومات الفئة
    const category = await Database.prisma.equipmentCategory.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      await ctx.answerCallbackQuery({ text: '❌ الفئة غير موجودة', show_alert: true })
      return
    }

    // إنشاء رقم جرد
    const auditNumber = await generateAuditNumber()

    // إنشاء سجل الجرد
    const audit = await Database.prisma.iNV_InventoryAudit.create({
      data: {
        auditNumber,
        warehouseType: 'SPARE_PARTS',
        auditType: 'CATEGORY',
        categoryId,
        status: 'IN_PROGRESS',
        createdBy: BigInt(ctx.from!.id),
      },
    })

    ctx.session.currentAuditId = audit.id
    await startAuditProcess(ctx, audit.id)
  }
  catch (error) {
    console.error('Error creating category audit:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء إنشاء عملية الجرد')
  }
})

// ─────────────────────────────────────────────────────────
// إنشاء جرد حسب الموقع
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:audit:create:location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء عملية الجرد...' })

  try {
    const locationId = Number.parseInt(ctx.match![1], 10)

    // جلب معلومات الموقع
    const location = await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: locationId },
    })

    if (!location) {
      await ctx.answerCallbackQuery({ text: '❌ الموقع غير موجود', show_alert: true })
      return
    }

    // إنشاء رقم جرد
    const auditNumber = await generateAuditNumber()

    // إنشاء سجل الجرد
    const audit = await Database.prisma.iNV_InventoryAudit.create({
      data: {
        auditNumber,
        warehouseType: 'SPARE_PARTS',
        auditType: 'LOCATION',
        locationId,
        status: 'IN_PROGRESS',
        createdBy: BigInt(ctx.from!.id),
      },
    })

    ctx.session.currentAuditId = audit.id
    await startAuditProcess(ctx, audit.id)
  }
  catch (error) {
    console.error('Error creating location audit:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء إنشاء عملية الجرد')
  }
})

// ════════════════════════════════════════════════════════
// 🔧 Helper Functions for Audit
// ════════════════════════════════════════════════════════

/**
 * توليد رقم جرد فريد
 */
async function generateAuditNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  // عد عمليات الجرد اليوم
  const startOfDay = new Date(year, now.getMonth(), now.getDate())
  const endOfDay = new Date(year, now.getMonth(), now.getDate() + 1)

  const count = await Database.prisma.iNV_InventoryAudit.count({
    where: {
      auditDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  })

  const sequence = String(count + 1).padStart(5, '0')
  return `AUD-${year}${month}${day}-${sequence}`
}

/**
 * بدء عملية الجرد
 */
async function startAuditProcess(ctx: any, auditId: number): Promise<void> {
  try {
    // جلب معلومات الجرد
    const audit = await Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
    })

    if (!audit) {
      throw new Error('Audit not found')
    }

    // جلب الأصناف حسب نوع الجرد
    const where: any = { isActive: true }

    if (audit.auditType === 'CATEGORY' && audit.categoryId) {
      where.categoryId = audit.categoryId
    }
    else if (audit.auditType === 'LOCATION' && audit.locationId) {
      where.locationId = audit.locationId
    }
    else if (audit.auditType === 'SINGLE_ITEM' && audit.itemId) {
      where.id = audit.itemId
    }

    const items = await Database.prisma.iNV_Item.findMany({
      where,
      orderBy: { code: 'asc' },
    })

    // تحديث إجمالي الأصناف
    await Database.prisma.iNV_InventoryAudit.update({
      where: { id: auditId },
      data: { totalItems: items.length },
    })

    // حفظ قائمة الأصناف في الجلسة
    ctx.session.auditItems = items.map((item: any) => item.id)
    ctx.session.currentAuditIndex = 0

    // بدء جرد الصنف الأول
    await auditNextItem(ctx, auditId)
  }
  catch (error) {
    console.error('Error starting audit process:', error)
    throw error
  }
}

/**
 * جرد الصنف التالي
 */
async function auditNextItem(ctx: any, auditId: number): Promise<void> {
  try {
    const itemIds = ctx.session.auditItems as number[]
    const currentIndex = ctx.session.currentAuditIndex as number

    if (!itemIds || currentIndex >= itemIds.length) {
      // انتهى الجرد - عرض الملخص
      await showAuditSummary(ctx, auditId)
      return
    }

    const itemId = itemIds[currentIndex]
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: itemId },
      include: {
        category: { select: { nameAr: true, icon: true } },
        location: { select: { nameAr: true } },
      },
    })

    if (!item) {
      // تخطي هذا الصنف
      ctx.session.currentAuditIndex = currentIndex + 1
      await auditNextItem(ctx, auditId)
      return
    }

    // حفظ الصنف الحالي
    ctx.session.currentAuditItem = item

    // عرض معلومات الصنف وطلب الكمية الفعلية
    const progress = `${currentIndex + 1}/${itemIds.length}`

    const keyboard = new InlineKeyboard()

    // أزرار اختيار الكمية
    if (item.quantity <= 10) {
      for (let i = 0; i <= item.quantity + 5; i++) {
        keyboard.text(`${i}`, `sp:audit:qty:${i}`)
        if ((i + 1) % 5 === 0) {
          keyboard.row()
        }
      }
    }
    else {
      // خيارات سريعة
      keyboard.text('0', 'sp:audit:qty:0')
      keyboard.text(`${Math.floor(item.quantity / 2)}`, `sp:audit:qty:${Math.floor(item.quantity / 2)}`)
      keyboard.text(`${item.quantity}`, `sp:audit:qty:${item.quantity}`)
      keyboard.row()
      keyboard.text('➕ زيادة', `sp:audit:qty:${item.quantity + 1}`)
      keyboard.text('➖ نقص', `sp:audit:qty:${Math.max(0, item.quantity - 1)}`)
      keyboard.row()
    }

    keyboard.text('✏️ إدخال يدوي', 'sp:audit:qty:manual').row()
    keyboard.text('⏭️ تخطي', 'sp:audit:skip').row()
    keyboard.text('❌ إلغاء الجرد', 'sp:audit:cancel')

    const message
      = `⚖️ **جرد الأصناف** [${progress}]\n\n`
        + '━━━━━━━━━━━━━━\n\n'
        + `${item.category?.icon || '📦'} **${item.nameAr}**\n`
        + `🔤 الكود: \`${item.code}\`\n`
        + `📂 الفئة: ${item.category?.nameAr || 'غير محدد'}\n`
        + `📍 الموقع: ${item.location?.nameAr || 'غير محدد'}\n\n`
        + '━━━━━━━━━━━━━━\n\n'
        + `📊 **الكمية بالنظام:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
        + '⚡ **أدخل الكمية الفعلية:**'

    // عرض الصورة إذا كانت موجودة
    if (item.imagePath) {
      try {
        await ctx.editMessageMedia(
          {
            type: 'photo',
            media: item.imagePath,
            caption: message,
            parse_mode: 'Markdown',
          },
          {
            reply_markup: keyboard,
          },
        )
      }
      catch (imgError) {
        console.error('Error displaying image, falling back to text:', imgError)
        // في حال فشل عرض الصورة، استخدم النص فقط
        await ctx.editMessageText(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        })
      }
    }
    else {
      // لا توجد صورة - عرض نصي فقط
      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
    }
  }
  catch (error) {
    console.error('Error in audit next item:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────
// معالج تسجيل الكمية
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery(/^sp:audit:qty:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const qtyParam = ctx.match![1]

    if (qtyParam === 'manual') {
      // طلب إدخال يدوي
      await ctx.editMessageText(
        '✏️ **إدخال الكمية يدوياً**\n\n'
        + '🔢 **أرسل الكمية الفعلية:**\n\n'
        + '⚠️ يجب إدخال رقم صحيح فقط',
        {
          parse_mode: 'Markdown',
        },
      )

      ctx.session.waitingForAuditQuantity = true
      return
    }

    const actualQuantity = Number.parseInt(qtyParam, 10)
    await recordAuditItem(ctx, actualQuantity)
  }
  catch (error) {
    console.error('Error in audit quantity:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// معالج تخطي الصنف
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:skip', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏭️ تم التخطي' })

  try {
    const currentIndex = ctx.session.currentAuditIndex as number
    ctx.session.currentAuditIndex = currentIndex + 1

    const auditId = ctx.session.currentAuditId as number
    await auditNextItem(ctx, auditId)
  }
  catch (error) {
    console.error('Error in skip audit:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ─────────────────────────────────────────────────────────
// معالج إلغاء الجرد
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:cancel', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('✅ نعم، إلغاء الجرد', 'sp:audit:cancel:confirm')
    .row()
    .text('❌ لا، متابعة الجرد', 'sp:audit:cancel:back')

  await ctx.editMessageText(
    '⚠️ **تأكيد الإلغاء**\n\n'
    + '❓ هل أنت متأكد من إلغاء عملية الجرد؟\n\n'
    + '⚠️ سيتم فقد جميع البيانات المدخلة.',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

sparePartsTransactionsHandler.callbackQuery('sp:audit:cancel:confirm', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '❌ تم إلغاء الجرد' })

  try {
    const auditId = ctx.session.currentAuditId as number

    if (auditId) {
      await Database.prisma.iNV_InventoryAudit.update({
        where: { id: auditId },
        data: { status: 'CANCELLED' },
      })
    }

    // مسح بيانات الجلسة
    delete ctx.session.currentAuditId
    delete ctx.session.auditItems
    delete ctx.session.currentAuditIndex
    delete ctx.session.currentAuditItem

    await ctx.editMessageText(
      '❌ **تم إلغاء عملية الجرد**\n\n'
      + 'تم إلغاء العملية بنجاح.',
      {
        parse_mode: 'Markdown',
      },
    )

    // العودة للقائمة الرئيسية بعد 3 ثواني
    setTimeout(() => {
      ctx.reply('اختر عملية', {
        reply_markup: new InlineKeyboard().text('📋 قائمة العمليات', 'sp:transactions:menu'),
      })
    }, 3000)
  }
  catch (error) {
    console.error('Error canceling audit:', error)
  }
})

sparePartsTransactionsHandler.callbackQuery('sp:audit:cancel:back', async (ctx) => {
  await ctx.answerCallbackQuery()

  const auditId = ctx.session.currentAuditId as number
  await auditNextItem(ctx, auditId)
})

/**
 * تسجيل صنف في الجرد
 */
async function recordAuditItem(ctx: any, actualQuantity: number): Promise<void> {
  try {
    const auditId = ctx.session.currentAuditId as number
    const item = ctx.session.currentAuditItem as any

    if (!auditId || !item) {
      throw new Error('Missing audit data')
    }

    const systemQuantity = item.quantity
    const difference = actualQuantity - systemQuantity
    const hasDiscrepancy = difference !== 0
    const discrepancyType
      = difference > 0
        ? 'SURPLUS'
        : difference < 0
          ? 'SHORTAGE'
          : 'MATCH'

    // حفظ الصنف في جدول الجرد
    await Database.prisma.iNV_InventoryAuditItem.create({
      data: {
        auditId,
        itemId: item.id,
        itemType: 'SPARE_PART',
        itemCode: item.code,
        itemName: item.nameAr,
        systemQuantity,
        actualQuantity,
        difference,
        hasDiscrepancy,
        discrepancyType,
        systemDetails: {
          categoryId: item.categoryId,
          locationId: item.locationId,
          unit: item.unit,
        },
      },
    })

    // تحديث إحصائيات الجرد
    const audit = await Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
    })

    if (audit) {
      await Database.prisma.iNV_InventoryAudit.update({
        where: { id: auditId },
        data: {
          itemsChecked: audit.itemsChecked + 1,
          itemsWithDiff: hasDiscrepancy ? audit.itemsWithDiff + 1 : audit.itemsWithDiff,
          totalShortage: difference < 0 ? audit.totalShortage + Math.abs(difference) : audit.totalShortage,
          totalSurplus: difference > 0 ? audit.totalSurplus + difference : audit.totalSurplus,
        },
      })
    }

    // الانتقال للصنف التالي
    const currentIndex = ctx.session.currentAuditIndex as number
    ctx.session.currentAuditIndex = currentIndex + 1
    await auditNextItem(ctx, auditId)
  }
  catch (error) {
    console.error('Error recording audit item:', error)
    throw error
  }
}

/**
 * عرض ملخص الجرد
 */
async function showAuditSummary(ctx: any, auditId: number): Promise<void> {
  try {
    const audit = await Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
      include: {
        items: {
          where: { hasDiscrepancy: true },
          orderBy: { difference: 'asc' },
        },
      },
    })

    if (!audit) {
      throw new Error('Audit not found')
    }

    let message = '✅ **اكتمل الجرد**\n\n'
    message += '━━━━━━━━━━━━━━\n\n'
    message += `📋 **رقم الجرد:** ${audit.auditNumber}\n\n`
    message += '📊 **الإحصائيات:**\n'
    message += `└ إجمالي الأصناف: ${audit.totalItems}\n`
    message += `└ تم جردها: ${audit.itemsChecked}\n`
    message += `└ بها اختلاف: ${audit.itemsWithDiff}\n\n`

    if (audit.itemsWithDiff > 0) {
      message += '⚠️ **ملخص الاختلافات:**\n'
      message += `└ 📉 نقص: ${audit.totalShortage} قطعة\n`
      message += `└ 📈 زيادة: ${audit.totalSurplus} قطعة\n\n`

      message += '━━━━━━━━━━━━━━\n\n'
      message += '📝 **تفاصيل الاختلافات:**\n\n'

      for (const item of audit.items.slice(0, 10)) {
        const icon = item.discrepancyType === 'SHORTAGE' ? '📉' : '📈'
        message += `${icon} **${item.itemName}**\n`
        message += `└ النظام: ${item.systemQuantity} | الفعلي: ${item.actualQuantity}\n`
        message += `└ الفرق: ${item.difference > 0 ? '+' : ''}${item.difference}\n\n`
      }

      if (audit.items.length > 10) {
        message += `... و ${audit.items.length - 10} اختلاف آخر\n\n`
      }
    }
    else {
      message += '✅ **لا توجد اختلافات**\n'
      message += 'جميع الأصناف مطابقة للنظام!\n\n'
    }

    const keyboard = new InlineKeyboard()

    if (audit.itemsWithDiff > 0) {
      keyboard.text('✅ تأكيد وتطبيق التعديلات', 'sp:audit:apply')
      keyboard.row()
    }

    keyboard.text('📄 تصدير تقرير', 'sp:audit:export')
    keyboard.row()
    keyboard.text('🏠 العودة للقائمة', 'sp:transactions:menu')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing audit summary:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────
// تصدير تقرير الجرد كـ Excel
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:export', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري إنشاء ملف Excel...' })

  try {
    const auditId = ctx.session.currentAuditId

    if (!auditId) {
      await ctx.reply('❌ لم يتم العثور على عملية الجرد')
      return
    }

    const audit = await Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
      include: {
        items: {
          orderBy: { itemName: 'asc' },
        },
      },
    })

    if (!audit) {
      await ctx.reply('❌ لم يتم العثور على عملية الجرد')
      return
    }

    // جلب التفاصيل الكاملة للأصناف
    const itemIds = audit.items.map(item => item.itemId)
    const fullItems = await Database.prisma.iNV_Item.findMany({
      where: { id: { in: itemIds } },
      include: {
        category: true,
        location: true,
      },
    })

    // جلب معلومات الفئة والموقع إذا كانت موجودة
    const category = audit.categoryId
      ? await Database.prisma.equipmentCategory.findUnique({
        where: { id: audit.categoryId },
      })
      : null

    const location = audit.locationId
      ? await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: audit.locationId },
      })
      : null

    // إنشاء ملف Excel
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Alsaada Bot'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('تقرير الجرد', {
      views: [{ rightToLeft: true }],
      properties: { defaultRowHeight: 20 },
    })

    // ═══════════════════════════════════════════════════════
    // العنوان الرئيسي
    // ═══════════════════════════════════════════════════════
    worksheet.mergeCells('A1:M1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = '� تقرير الجرد التفصيلي'
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 35

    // ═══════════════════════════════════════════════════════
    // معلومات الجرد
    // ═══════════════════════════════════════════════════════
    let currentRow = 3

    const auditTypeNames: Record<string, string> = {
      FULL: '🌐 جرد شامل',
      CATEGORY: '📂 جرد حسب الفئة',
      LOCATION: '📍 جرد حسب الموقع',
      SINGLE_ITEM: '📦 جرد صنف واحد',
    }

    const statusNames: Record<string, string> = {
      IN_PROGRESS: '🔄 جارٍ',
      COMPLETED: '✅ مكتمل',
      CANCELLED: '❌ ملغي',
    }

    const infoData = [
      ['📋 رقم الجرد:', audit.auditNumber],
      ['� التاريخ:', new Date(audit.auditDate || Date.now()).toLocaleString('ar-EG')],
      ['🔖 نوع الجرد:', auditTypeNames[audit.auditType] || audit.auditType],
      ['📌 الحالة:', statusNames[audit.status] || audit.status],
    ]

    if (category) {
      infoData.push(['📂 الفئة:', category.nameAr])
    }
    if (location) {
      infoData.push(['📍 الموقع:', location.nameAr])
    }

    for (const [label, value] of infoData) {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 }
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' },
      }

      worksheet.getCell(`B${currentRow}`).value = value
      worksheet.mergeCells(`B${currentRow}:D${currentRow}`)
      currentRow++
    }

    currentRow++

    // ═══════════════════════════════════════════════════════
    // إحصائيات الجرد
    // ═══════════════════════════════════════════════════════
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`)
    const statsHeaderCell = worksheet.getCell(`A${currentRow}`)
    statsHeaderCell.value = '📊 الإحصائيات'
    statsHeaderCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    statsHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44546A' } }
    statsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
    currentRow++

    const statsData = [
      ['📦 إجمالي الأصناف:', audit.totalItems],
      ['✅ تم جردها:', audit.itemsChecked],
      ['⚠️ بها اختلاف:', audit.itemsWithDiff],
      ['📉 إجمالي النقص:', audit.totalShortage],
      ['📈 إجمالي الزيادة:', audit.totalSurplus],
    ]

    for (const [label, value] of statsData) {
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      worksheet.getCell(`B${currentRow}`).value = value
      worksheet.getCell(`B${currentRow}`).font = { bold: true, color: { argb: 'FF0070C0' } }
      currentRow++
    }

    currentRow += 2

    // ═══════════════════════════════════════════════════════
    // رأس جدول الأصناف
    // ═══════════════════════════════════════════════════════
    const headers = [
      '#',
      'الكود',
      'الباركود',
      'اسم الصنف',
      'الفئة',
      'الموقع',
      'الكمية بالنظام',
      'الكمية الفعلية',
      'الفرق',
      'الوحدة',
      'سعر الوحدة',
      'القيمة الإجمالية',
      'ملاحظات',
    ]

    const headerRow = worksheet.getRow(currentRow)
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
    headerRow.height = 25
    currentRow++

    // ═══════════════════════════════════════════════════════
    // بيانات الأصناف
    // ═══════════════════════════════════════════════════════
    const itemsWithDiff = audit.items.filter(item => item.hasDiscrepancy)
    const itemsWithoutDiff = audit.items.filter(item => !item.hasDiscrepancy)

    let rowNumber = 1

    // الأصناف بها اختلافات
    for (const auditItem of itemsWithDiff) {
      const fullItem = fullItems.find(item => item.id === auditItem.itemId)
      if (!fullItem)
        continue

      const row = worksheet.getRow(currentRow)
      const rowData = [
        rowNumber,
        fullItem.code,
        fullItem.barcode || '-',
        auditItem.itemName,
        fullItem.category?.nameAr || '-',
        fullItem.location?.nameAr || '-',
        auditItem.systemQuantity,
        auditItem.actualQuantity,
        auditItem.difference,
        fullItem.unit || 'قطعة',
        fullItem.unitPrice,
        fullItem.totalValue,
        auditItem.notes || '-',
      ]

      rowData.forEach((value, index) => {
        const cell = row.getCell(index + 1)
        cell.value = value
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }

        // تلوين حسب نوع الاختلاف
        if (index === 8 && auditItem.difference !== 0) {
          // عمود الفرق
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: auditItem.difference < 0 ? 'FFFF6B6B' : 'FF95E1D3' },
          }
          cell.font = { bold: true }
        }
      })

      currentRow++
      rowNumber++
    }

    // الأصناف بدون اختلافات
    for (const auditItem of itemsWithoutDiff) {
      const fullItem = fullItems.find(item => item.id === auditItem.itemId)
      if (!fullItem)
        continue

      const row = worksheet.getRow(currentRow)
      const rowData = [
        rowNumber,
        fullItem.code,
        fullItem.barcode || '-',
        auditItem.itemName,
        fullItem.category?.nameAr || '-',
        fullItem.location?.nameAr || '-',
        auditItem.systemQuantity,
        auditItem.actualQuantity,
        0,
        fullItem.unit || 'قطعة',
        fullItem.unitPrice,
        fullItem.totalValue,
        auditItem.notes || '-',
      ]

      rowData.forEach((value, index) => {
        const cell = row.getCell(index + 1)
        cell.value = value
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      })

      currentRow++
      rowNumber++
    }

    // ═══════════════════════════════════════════════════════
    // تنسيق الأعمدة
    // ═══════════════════════════════════════════════════════
    worksheet.columns = [
      { width: 8 }, // #
      { width: 18 }, // الكود
      { width: 18 }, // الباركود
      { width: 25 }, // اسم الصنف
      { width: 15 }, // الفئة
      { width: 20 }, // الموقع
      { width: 14 }, // الكمية بالنظام
      { width: 14 }, // الكمية الفعلية
      { width: 10 }, // الفرق
      { width: 10 }, // الوحدة
      { width: 12 }, // سعر الوحدة
      { width: 15 }, // القيمة الإجمالية
      { width: 30 }, // ملاحظات
    ]

    // ═══════════════════════════════════════════════════════
    // حفظ وإرسال الملف
    // ═══════════════════════════════════════════════════════
    const fileName = `تقرير_جرد_${audit.auditNumber}_${Date.now()}.xlsx`
    const filePath = path.join(process.cwd(), 'uploads', 'temp', fileName)

    // التأكد من وجود المجلد
    const tempDir = path.join(process.cwd(), 'uploads', 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    await workbook.xlsx.writeFile(filePath)

    // إرسال الملف
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير الجرد: ${audit.auditNumber}**\n\n`
        + `✅ تم إنشاء الملف بنجاح\n`
        + `📦 ${audit.totalItems} صنف\n`
        + `⚠️ ${audit.itemsWithDiff} اختلاف`,
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('🏠 العودة للقائمة', 'sp:transactions:menu'),
    })

    // حذف الملف المؤقت
    fs.unlinkSync(filePath)

    await ctx.answerCallbackQuery({ text: '✅ تم إنشاء ملف Excel بنجاح' })
  }
  catch (error) {
    console.error('Error exporting audit report:', error)
    await ctx.reply('❌ حدث خطأ أثناء إنشاء التقرير')
  }
})

// ─────────────────────────────────────────────────────────
// تطبيق نتائج الجرد
// ─────────────────────────────────────────────────────────
sparePartsTransactionsHandler.callbackQuery('sp:audit:apply', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري تطبيق التعديلات...' })

  try {
    const auditId = ctx.session.currentAuditId as number

    const audit = await Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
      include: {
        items: {
          where: { hasDiscrepancy: true },
        },
      },
    })

    if (!audit) {
      throw new Error('Audit not found')
    }

    // تطبيق التعديلات على كل صنف
    for (const item of audit.items) {
      // الحصول على الكمية الحالية
      const currentItem = await Database.prisma.iNV_Item.findUnique({
        where: { id: item.itemId },
        select: { quantity: true },
      })

      const quantityBefore = currentItem?.quantity || 0

      // تحديث الكمية
      await Database.prisma.iNV_Item.update({
        where: { id: item.itemId },
        data: { quantity: item.actualQuantity },
      })

      // إنشاء معاملة تسوية
      await Database.prisma.iNV_Transaction.create({
        data: {
          itemId: item.itemId,
          transactionType: 'ADJUST',
          quantity: Math.abs(item.difference),
          quantityBefore,
          quantityAfter: item.actualQuantity,
          transactionNumber: `${audit.auditNumber}-${item.itemId}`,
          notes: `جرد - ${item.discrepancyType === 'SHORTAGE' ? 'نقص' : 'زيادة'} ${Math.abs(item.difference)} ${(item.systemDetails as any)?.unit || 'قطعة'}`,
          createdBy: audit.createdBy,
        },
      })
    }

    // تحديث حالة الجرد
    await Database.prisma.iNV_InventoryAudit.update({
      where: { id: auditId },
      data: { status: 'COMPLETED' },
    })

    // مسح بيانات الجلسة
    delete ctx.session.currentAuditId
    delete ctx.session.auditItems
    delete ctx.session.currentAuditIndex
    delete ctx.session.currentAuditItem

    await ctx.editMessageText(
      '✅ **تم تطبيق التعديلات بنجاح**\n\n'
      + `📋 رقم الجرد: ${audit.auditNumber}\n`
      + `📊 عدد التعديلات: ${audit.items.length}\n\n`
      + '✅ تم تحديث الكميات وإنشاء معاملات التسوية.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🏠 العودة', 'sp:transactions:menu'),
      },
    )
  }
  catch (error) {
    console.error('Error applying audit:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء تطبيق التعديلات')
  }
})

// معالج الإدخال اليدوي للكمية
sparePartsTransactionsHandler.on('message:text', async (ctx, next) => {
  const waitingForAuditQuantity = ctx.session.waitingForAuditQuantity

  if (waitingForAuditQuantity) {
    const text = ctx.message.text.trim()
    const quantity = Number.parseInt(text, 10)

    if (Number.isNaN(quantity) || quantity < 0) {
      await ctx.reply('❌ يجب إدخال رقم صحيح غير سالب')
      return
    }

    delete ctx.session.waitingForAuditQuantity
    await recordAuditItem(ctx, quantity)
    return
  }

  await next()
})

// ════════════════════════════════════════════════════════
// 6️⃣ سجل الحركات
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.callbackQuery('sp:trans:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب آخر 10 حركات
    const transactions = await Database.prisma.iNV_Transaction.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        item: {
          select: {
            nameAr: true,
            code: true,
          },
        },
      },
    })

    let message = '📋 **سجل الحركات** (آخر 10 معاملات)\n\n'

    if (transactions.length === 0) {
      message += '⚠️ لا توجد حركات مسجلة حتى الآن.'
    }
    else {
      for (const trans of transactions) {
        const typeEmoji = trans.transactionType === 'IN' ? '➕' : trans.transactionType === 'OUT' ? '➖' : '🔄'
        const typeName = trans.transactionType === 'IN'
          ? 'إدخال'
          : trans.transactionType === 'OUT'
            ? 'إخراج'
            : trans.transactionType === 'TRANSFER'
              ? 'نقل'
              : trans.transactionType === 'RETURN'
                ? 'إرجاع'
                : 'تسوية'

        message += `${typeEmoji} **${typeName}**\n`
        message += `📦 ${trans.item?.nameAr || 'غير معروف'} (${trans.item?.code || '-'})\n`
        message += `🔢 الكمية: ${trans.quantity}\n`
        message += `📅 ${trans.createdAt.toLocaleDateString('ar-EG')}\n`
        if (trans.notes) {
          message += `📝 ${trans.notes}\n`
        }
        message += '\n'
      }
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 تحديث', 'sp:trans:list')
      .row()
      .text('📤 تصدير Excel', 'sp:trans:export')
      .row()
      .text('⬅️ رجوع', 'sp:transactions:menu')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error fetching transactions:', error)
    await ctx.editMessageText(
      '❌ **خطأ في جلب الحركات**\n\n'
      + 'حدث خطأ أثناء جلب سجل الحركات.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:transactions:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// معالجة النصوص - تدفق الشراء المتقدم
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.on('message:text', async (ctx, next) => {
  const purchaseState = (ctx.session as any).purchaseForm

  // إذا كان هناك تدفق شراء نشط
  if (purchaseState) {
    const text = ctx.message.text.trim()

    // الخطوة 1: رقم الفاتورة
    if (purchaseState.step === 'invoice_number') {
      purchaseState.data.invoiceNumber = text
      purchaseState.step = 'purchase_date'

      const keyboard = new InlineKeyboard()
        .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ رقم الفاتورة: \`${text}\`\n\n`
        + `📄 **الخطوة 2 من 13:** تاريخ الشراء\n\n`
        + `✍️ الرجاء إرسال **تاريخ الشراء** بصيغة:\n`
        + `يوم/شهر/سنة (مثال: 15/03/2025)\n\n`
        + `أو اضغط "استخدام تاريخ اليوم":`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // الخطوة 2: تاريخ الشراء
    if (purchaseState.step === 'purchase_date') {
      const parts = text.split('/')
      if (parts.length !== 3) {
        await ctx.reply('❌ صيغة تاريخ خاطئة. استخدم: يوم/شهر/سنة (مثال: 15/03/2025)')
        return
      }

      const day = Number.parseInt(parts[0], 10)
      const month = Number.parseInt(parts[1], 10)
      const year = Number.parseInt(parts[2], 10)

      if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)
        || day < 1 || day > 31 || month < 1 || month > 12 || year < 2000) {
        await ctx.reply('❌ تاريخ غير صحيح. تأكد من القيم.')
        return
      }

      const purchaseDate = new Date(year, month - 1, day)
      purchaseState.data.purchaseDate = purchaseDate
      purchaseState.step = 'quantity'

      const keyboard = new InlineKeyboard().text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ تاريخ الشراء: ${purchaseDate.toLocaleDateString('ar-EG')}\n\n`
        + `📄 **الخطوة 3 من 13:** الكمية\n\n`
        + `📦 **المنتج:** ${purchaseState.data.itemName}\n`
        + `📊 **الكمية الحالية:** ${purchaseState.data.currentQuantity}\n\n`
        + `✍️ الرجاء إرسال **كمية الشراء** (عدد صحيح):`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // الخطوة 3: الكمية
    if (purchaseState.step === 'quantity') {
      const qty = Number.parseInt(text, 10)
      if (Number.isNaN(qty) || qty <= 0) {
        await ctx.reply('❌ الرجاء إدخال كمية صحيحة (عدد موجب)')
        return
      }

      purchaseState.data.quantity = qty
      purchaseState.step = 'unit_price'

      const keyboard = new InlineKeyboard()
        .text(`💰 استخدام السعر الحالي (${purchaseState.data.currentUnitPrice} ج.م)`, 'sp:trans:in:use_current_price')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ الكمية: ${qty}\n\n`
        + `📄 **الخطوة 4 من 13:** سعر الوحدة\n\n`
        + `💰 **السعر الحالي:** ${purchaseState.data.currentUnitPrice} ج.م\n\n`
        + `✍️ الرجاء إرسال **سعر الوحدة الجديد** (رقم):\n`
        + `أو اضغط "استخدام السعر الحالي":`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // الخطوة 4: سعر الوحدة
    if (purchaseState.step === 'unit_price') {
      const price = Number.parseFloat(text)
      if (Number.isNaN(price) || price < 0) {
        await ctx.reply('❌ الرجاء إدخال سعر صحيح (رقم موجب)')
        return
      }

      purchaseState.data.unitPrice = price
      purchaseState.data.totalCost = price * purchaseState.data.quantity
      purchaseState.step = 'condition'

      const keyboard = new InlineKeyboard()
        .text('🆕 جديد', 'sp:trans:in:cond:NEW')
        .text('♻️ مستعمل', 'sp:trans:in:cond:USED')
        .row()
        .text('🔧 مجدد', 'sp:trans:in:cond:REFURBISHED')
        .text('📥 استيراد', 'sp:trans:in:cond:IMPORT')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ سعر الوحدة: ${price} ج.م\n`
        + `💰 **الإجمالي:** ${purchaseState.data.totalCost.toFixed(2)} ج.م\n\n`
        + `📄 **الخطوة 5 من 13:** حالة المنتج\n\n`
        + `✍️ اختر **حالة المنتج المشترى**:`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // الخطوة 6: اسم المورد
    if (purchaseState.step === 'supplier') {
      purchaseState.data.supplierName = text
      purchaseState.step = 'payment_method'

      const keyboard = new InlineKeyboard()
        .text('💵 نقدي', 'sp:trans:in:pay:cash')
        .text('📋 آجل', 'sp:trans:in:pay:deferred')
        .row()
        .text('🧾 شيك', 'sp:trans:in:pay:check')
        .text('🏦 تحويل بنكي', 'sp:trans:in:pay:transfer')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ المورد: ${text}\n\n`
        + `📄 **الخطوة 7 من 13:** طريقة الدفع\n\n`
        + `✍️ اختر **طريقة الدفع**:`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // الخطوة 10: ملاحظات
    if (purchaseState.step === 'notes') {
      purchaseState.data.notes = text
      purchaseState.step = 'invoice_photo'

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي (بدون صورة)', 'sp:trans:in:skip_photo')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ تم حفظ الملاحظات\n\n`
        + `📄 **الخطوة 11 من 13:** صورة الفاتورة\n\n`
        + `📸 الرجاء **إرسال صورة الفاتورة** أو اضغط تخطي:`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }
  }

  // إذا لم يكن هناك شراء نشط، استمر للمعالج التالي
  return next()
})

// ════════════════════════════════════════════════════════
// 📸 معالج الصور للصرف والنقل (Barcode Scanning)
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.on('message:photo', async (ctx, next) => {
  const issueState = (ctx.session as any).issueForm
  const purchaseState = (ctx.session as any).purchaseForm
  const transferState = (ctx.session as any).transferState
  const returnState = (ctx.session as any).returnState

  // إذا لم يكن هناك حالة صرف أو شراء أو نقل أو إرجاع، تابع للمعالج التالي
  if (!issueState && !purchaseState && !transferState && !returnState) {
    return next()
  }

  // معالجة صورة الباركود للإرجاع
  if (returnState?.searchMode === 'awaiting_barcode_image') {
    try {
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('❌ لم يتم العثور على صورة. الرجاء المحاولة مرة أخرى.')
        return
      }

      // اختيار أكبر صورة
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const { Buffer } = await import('node:buffer')
      const imageBuffer = Buffer.from(arrayBuffer)

      await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

      // استخدام خدمة قراءة الباركود
      const result = await BarcodeScannerService.scanBarcode(imageBuffer)

      if (!result || !result.data) {
        const keyboard = new InlineKeyboard()
          .text('✍️ إدخال يدوي', 'sp:trans:return:search:barcode')
          .row()
          .text('🔍 بحث جديد', 'sp:trans:return:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:return')

        await ctx.reply(
          '❌ **لم يتم التعرف على الباركود**\n\n'
          + '💡 جرب:\n'
          + '• التقاط صورة أوضح\n'
          + '• التأكد من إضاءة جيدة\n'
          + '• استخدام الإدخال اليدوي',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).returnState = undefined
        return
      }

      const barcode = result.data.trim()

      // البحث عن القطعة بالباركود
      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item) {
        const keyboard = new InlineKeyboard()
          .text('🔍 بحث جديد', 'sp:trans:return:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:return')

        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من تسجيل القطعة في النظام\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).returnState = undefined
        return
      }

      // جلب آخر 10 عمليات صرف وفلترتها
      const allIssueTransactions = await Database.prisma.iNV_Transaction.findMany({
        where: {
          itemId: item.id,
          transactionType: 'OUT',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      })

      ;(ctx.session as any).returnState = undefined

      // فلترة العمليات التي لديها كمية متاحة للإرجاع
      const issueTransactions = await filterReturnableTransactions(allIssueTransactions)

      if (issueTransactions.length === 0) {
        await ctx.reply(
          '⚠️ **لا توجد عمليات صرف متاحة للإرجاع**\n\n'
          + `📦 **${item.nameAr}**\n`
          + `🔤 **الكود:** \`${item.code}\`\n\n`
          + 'جميع عمليات الصرف السابقة تم إرجاعها بالكامل.',
          {
            reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // عرض القائمة
      let message = `✅ **تم العثور على القطعة!**\n\n`
      message += `↩️ **اختر عملية الصرف للإرجاع**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📋 **آخر ${issueTransactions.length} عمليات صرف:**\n\n`

      const keyboard = new InlineKeyboard()

      for (const trans of issueTransactions) {
        const date = trans.createdAt.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        const time = trans.createdAt.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })

        message += `🔢 **#${trans.transactionNumber}**\n`
        message += `   📊 الكمية: ${trans.quantity} ${item.unit || 'قطعة'}\n`
        message += `   📅 ${date} - ⏰ ${time}\n`
        if (trans.notes) {
          message += `   📝 ${trans.notes}\n`
        }
        message += `\n`

        keyboard
          .text(`#${trans.transactionNumber} - ${trans.quantity} ${item.unit || 'قطعة'}`, `sp:trans:return:quantity:${trans.id}`)
          .row()
      }

      keyboard.text('🔙 رجوع', 'sp:trans:return')

      message += `━━━━━━━━━━━━━━\n\n`
      message += `💡 اختر عملية الصرف التي تريد إرجاعها`

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }
    catch (error) {
      console.error('Error processing return barcode image:', error)
      await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى.')
      ;(ctx.session as any).returnState = undefined
      return
    }
  }

  // معالجة صورة الباركود للنقل
  if (transferState?.searchMode === 'awaiting_barcode_image') {
    try {
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('❌ لم يتم العثور على صورة. الرجاء المحاولة مرة أخرى.')
        return
      }

      // اختيار أكبر صورة
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const { Buffer } = await import('node:buffer')
      const imageBuffer = Buffer.from(arrayBuffer)

      await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

      // استخدام خدمة قراءة الباركود
      const result = await BarcodeScannerService.scanBarcode(imageBuffer)

      if (!result || !result.data) {
        const keyboard = new InlineKeyboard()
          .text('✍️ إدخال يدوي', 'sp:trans:transfer:search:barcode')
          .row()
          .text('🔍 بحث جديد', 'sp:trans:transfer:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:transfer')

        await ctx.reply(
          '❌ **لم يتم التعرف على الباركود**\n\n'
          + '💡 جرب:\n'
          + '• التقاط صورة أوضح\n'
          + '• التأكد من إضاءة جيدة\n'
          + '• استخدام الإدخال اليدوي',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        return
      }

      const barcode = result.data.trim()

      // البحث عن القطعة بالباركود
      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item || !item.location) {
        const keyboard = new InlineKeyboard()
          .text('🔍 بحث جديد', 'sp:trans:transfer:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:transfer')

        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من تسجيل القطعة في النظام\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).transferState = undefined
        return
      }

      // التحقق من توفر كمية
      if (item.quantity === 0) {
        await ctx.reply('⚠️ لا توجد كمية متاحة من هذه القطعة للنقل')
        ;(ctx.session as any).transferState = undefined
        return
      }

      // حفظ بيانات القطعة وطلب الكمية
      ;(ctx.session as any).transferState = {
        step: 'awaiting_quantity',
        itemId: item.id,
        sparePartName: item.nameAr,
        sparePartCode: item.code,
        currentLocationId: item.locationId,
        currentLocationName: item.location.nameAr,
        availableQuantity: item.quantity,
      }

      let message = `✅ **تم العثور على القطعة بنجاح!**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n`
      message += `📍 **الموقع الحالي:** ${item.location.nameAr}\n`
      message += `📊 **الكمية المتاحة:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
      message += `📊 **أدخل الكمية للتأكيد:**\n\n`
      message += `**الكمية المطلوبة:** \`${item.quantity}\`\n\n`
      message += `💡 **ملاحظة:** لا يمكن نقل جزء من الكمية.\n\n`
      message += `⏳ **في انتظار الإدخال...**`

      await ctx.reply(message, {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
        parse_mode: 'Markdown',
      })
      return
    }
    catch (error) {
      console.error('Error processing transfer barcode image:', error)
      await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى.')
      ;(ctx.session as any).transferState = undefined
      return
    }
  }

  // معالجة صورة الباركود للصرف
  if (issueState?.step === 'awaiting_barcode_image') {
    try {
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('❌ لم يتم العثور على صورة. الرجاء المحاولة مرة أخرى.')
        return
      }

      // اختيار أكبر صورة
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const { Buffer } = await import('node:buffer')
      const imageBuffer = Buffer.from(arrayBuffer)

      await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

      // استخدام خدمة قراءة الباركود
      const result = await BarcodeScannerService.scanBarcode(imageBuffer)

      if (!result || !result.data) {
        const keyboard = new InlineKeyboard()
          .text('✍️ إدخال يدوي', 'sp:trans:out:search:barcode')
          .row()
          .text('🔍 بحث جديد', 'sp:trans:out:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:out')

        await ctx.reply(
          '❌ **لم يتم التعرف على الباركود**\n\n'
          + '💡 جرب:\n'
          + '• التقاط صورة أوضح\n'
          + '• التأكد من إضاءة جيدة\n'
          + '• استخدام الإدخال اليدوي',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        return
      }

      const barcode = result.data.trim()

      // البحث عن القطعة بالباركود
      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
      })

      if (!item) {
        const keyboard = new InlineKeyboard()
          .text('🔍 بحث جديد', 'sp:trans:out:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:out')

        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من تسجيل القطعة في النظام\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).issueForm = undefined
        return
      }

      // عرض حالات القطعة للصرف
      await showItemConditionsForIssue(ctx, item.id)
      return
    }
    catch (error) {
      console.error('Error processing barcode image:', error)
      await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى.')
      ;(ctx.session as any).issueForm = undefined
      return
    }
  }

  // معالجة صورة الباركود للشراء
  if (purchaseState?.step === 'awaiting_barcode_image') {
    try {
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('❌ لم يتم العثور على صورة. الرجاء المحاولة مرة أخرى.')
        return
      }

      // اختيار أكبر صورة
      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)
      const arrayBuffer = await response.arrayBuffer()
      const { Buffer } = await import('node:buffer')
      const imageBuffer = Buffer.from(arrayBuffer)

      await ctx.reply('🔎 جاري قراءة الباركود من الصورة...')

      // استخدام خدمة قراءة الباركود
      const result = await BarcodeScannerService.scanBarcode(imageBuffer)

      if (!result || !result.data) {
        const keyboard = new InlineKeyboard()
          .text('✍️ إدخال يدوي', 'sp:trans:in:search:barcode')
          .row()
          .text('🔍 بحث جديد', 'sp:trans:in:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:in')

        await ctx.reply(
          '❌ **لم يتم التعرف على الباركود**\n\n'
          + '💡 جرب:\n'
          + '• التقاط صورة أوضح\n'
          + '• التأكد من إضاءة جيدة\n'
          + '• استخدام الإدخال اليدوي',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        return
      }

      const barcode = result.data.trim()

      // البحث عن القطعة بالباركود
      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
      })

      if (!item) {
        const keyboard = new InlineKeyboard()
          .text('🔍 بحث جديد', 'sp:trans:in:search')
          .row()
          .text('❌ إلغاء', 'sp:trans:in')

        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من تسجيل القطعة في النظام\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      // الانتقال لبدء عملية الشراء
      const sparePart = await Database.prisma.iNV_Item.findUnique({
        where: { id: item.id },
        include: {
          category: { select: { nameAr: true } },
          location: { select: { nameAr: true } },
        },
      })

      if (!sparePart) {
        await ctx.reply('❌ حدث خطأ في جلب بيانات القطعة.')
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      // بدء تدفق الشراء
      ;(ctx.session as any).purchaseForm = {
        step: 'purchase_date',
        data: {
          itemId: sparePart.id,
          sparePartName: sparePart.nameAr,
          categoryName: sparePart.category?.nameAr || 'غير محدد',
          locationName: sparePart.location?.nameAr || 'غير محدد',
          currentQuantity: sparePart.quantity,
          currentUnitPrice: sparePart.unitPrice,
        },
      }

      const keyboard = new InlineKeyboard()
        .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ **تم العثور على القطعة:**\n\n`
        + `📦 **الاسم:** ${sparePart.nameAr}\n`
        + `🏷️ **الكود:** ${sparePart.code}\n`
        + `📂 **الفئة:** ${sparePart.category?.nameAr || 'غير محدد'}\n`
        + `📍 **الموقع:** ${sparePart.location?.nameAr || 'غير محدد'}\n\n`
        + `📄 **الخطوة 1 من 13:** تاريخ الشراء\n\n`
        + `✍️ أدخل **تاريخ الشراء** بصيغة: DD/MM/YYYY\n`
        + `أو اضغط "استخدام تاريخ اليوم":`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }
    catch (error) {
      console.error('Error processing barcode image for purchase:', error)
      await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. حاول مرة أخرى.')
      ;(ctx.session as any).purchaseForm = undefined
      return
    }
  }

  // حالة غير معروفة، تابع للمعالج التالي
  return next()
})

// ════════════════════════════════════════════════════════
// معالج النصوص للصرف والشراء والنقل
// ════════════════════════════════════════════════════════
sparePartsTransactionsHandler.on('message:text', async (ctx, next) => {
  const issueState = (ctx.session as any).issueForm
  const purchaseState = (ctx.session as any).purchaseForm
  const transferState = (ctx.session as any).transferState
  const returnState = (ctx.session as any).returnState

  // ═══════════════════════════════════════════════════════
  // معالجات البحث للإرجاع
  // ═══════════════════════════════════════════════════════
  if (returnState) {
    const text = ctx.message.text.trim()

    // ═══ إدخال الملاحظات (إرجاع) ═══
    if (returnState.step === 'awaiting_notes') {
      const notes = text.trim()

      if (notes.length > 500) {
        await ctx.reply(
          '❌ **الملاحظات طويلة جداً**\n\n'
          + `الحد الأقصى: 500 حرف\n`
          + `عدد الأحرف المُدخلة: ${notes.length}\n\n`
          + 'يرجى اختصار النص والمحاولة مرة أخرى.',
          {
            reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // حفظ الملاحظات في الجلسة
      ;(ctx.session as any).returnNotes = notes

      const transactionId = returnState.transactionId
      const returnQuantity = returnState.returnQuantity

      // مسح حالة انتظار الملاحظات
      ;(ctx.session as any).returnState = undefined

      // العودة لصفحة التأكيد
      try {
        const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
          where: { id: transactionId },
          include: { recipientEmployee: true },
        })

        if (!originalTransaction) {
          await ctx.reply('❌ عملية الصرف غير موجودة')
          return
        }

        const item = await Database.prisma.iNV_Item.findUnique({
          where: { id: originalTransaction.itemId },
          include: {
            category: true,
            location: true,
          },
        })

        if (!item) {
          await ctx.reply('❌ لم يتم العثور على بيانات القطعة')
          return
        }

        // عرض رسالة التأكيد
        let message = `↩️ **تأكيد إرجاع قطعة للمخزن**\n\n`
        message += `━━━━━━━━━━━━━━\n\n`
        message += `📋 **بيانات عملية الصرف الأصلية:**\n\n`
        message += `🔢 **رقم العملية:** \`${originalTransaction.transactionNumber}\`\n`
        message += `📅 **تاريخ الصرف:** ${originalTransaction.createdAt.toLocaleDateString('ar-EG')}\n`
        message += `⏰ **الوقت:** ${originalTransaction.createdAt.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })}\n`
        
        // عرض اسم المستلم إن وجد
        if (originalTransaction.recipientEmployee) {
          message += `👤 **المستلم:** ${originalTransaction.recipientEmployee.fullName}`
          if (originalTransaction.recipientEmployee.employeeCode) {
            message += ` (${originalTransaction.recipientEmployee.employeeCode})`
          }
          message += `\n`
        }
        
        message += `\n━━━━━━━━━━━━━━\n\n`
        message += `📦 **معلومات القطعة:**\n\n`
        message += `**الاسم:** ${item.nameAr}\n`
        message += `**الكود:** \`${item.code}\`\n`
        if (item.barcode) {
          message += `**الباركود:** \`${item.barcode}\`\n`
        }
        message += `**التصنيف:** ${item.category?.icon} ${item.category?.nameAr}\n\n`
        message += `━━━━━━━━━━━━━━\n\n`
        message += `📊 **تفاصيل الكمية:**\n\n`
        message += `**الكمية المصروفة الأصلية:** ${originalTransaction.quantity} ${item.unit || 'قطعة'}\n`
        message += `**الكمية المُرجعة:** ${returnQuantity} ${item.unit || 'قطعة'}\n`
        if (originalTransaction.unitPrice) {
          const originalTotalValue = originalTransaction.quantity * originalTransaction.unitPrice
          const returnValue = returnQuantity * originalTransaction.unitPrice
          message += `**سعر الوحدة:** ${originalTransaction.unitPrice} ${item.currency || 'EGP'}\n`
          message += `**القيمة الإجمالية المصروفة:** ${originalTotalValue} ${item.currency || 'EGP'}\n`
          message += `**قيمة المُرجع:** ${returnValue} ${item.currency || 'EGP'}\n`
        }
        if (originalTransaction.notes) {
          message += `\n**ملاحظات الصرف الأصلية:** ${originalTransaction.notes}\n`
        }
        
        // عرض الملاحظات المُضافة
        message += `\n📝 **ملاحظات الإرجاع:** ${notes}\n`
        
        message += `\n━━━━━━━━━━━━━━\n\n`
        message += `⚠️ **هل تريد إرجاع ${returnQuantity} ${item.unit || 'قطعة'} للمخزن؟**`

        const keyboard = new InlineKeyboard()
          .text('✅ تأكيد الإرجاع', `sp:trans:return:execute:${transactionId}:${returnQuantity}`)
          .row()
          .text('📝 تعديل الملاحظات', `sp:trans:return:notes:${transactionId}:${returnQuantity}`)
          .row()
          .text('🔙 تعديل الكمية', `sp:trans:return:quantity:${transactionId}`)
          .text('❌ إلغاء', 'sp:trans:return')

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        })
        return
      }
      catch (error) {
        console.error('Error showing confirmation after notes:', error)
        await ctx.reply('❌ حدث خطأ. حاول مرة أخرى.')
        return
      }
    }

    // ═══ إدخال الكمية المخصصة (إرجاع) ═══
    if (returnState.step === 'awaiting_custom_quantity') {
      const quantity = Number.parseInt(text, 10)

      if (Number.isNaN(quantity) || quantity < 1) {
        await ctx.reply(
          '❌ **الكمية غير صحيحة**\n\n'
          + 'يرجى إدخال رقم صحيح أكبر من صفر.',
          {
            reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:trans:return:quantity:${returnState.transactionId}`),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // جلب عملية الصرف الأصلية للتحقق من الحد الأقصى
      const originalTransaction = await Database.prisma.iNV_Transaction.findUnique({
        where: { id: returnState.transactionId },
      })

      if (!originalTransaction) {
        await ctx.reply('❌ عملية الصرف غير موجودة')
        ;(ctx.session as any).returnState = undefined
        return
      }

      // حساب الكمية المتاحة للإرجاع
      const returnedQuantity = await Database.prisma.iNV_Transaction.aggregate({
        where: {
          transactionType: 'RETURN',
          notes: {
            contains: `#${originalTransaction.transactionNumber}`,
          },
        },
        _sum: {
          quantity: true,
        },
      })

      const totalReturned = returnedQuantity._sum.quantity || 0
      const maxQuantity = originalTransaction.quantity - totalReturned

      if (quantity > maxQuantity) {
        const errorMessage = [
          `❌ **الكمية المُدخلة أكبر من المتاح**\n`,
          `📊 **الكمية الأصلية:** ${originalTransaction.quantity}`,
          (totalReturned > 0 ? `↩️ **المُرجع سابقاً:** ${totalReturned}` : ''),
          `✅ **المتاح للإرجاع:** ${maxQuantity}`,
          `📊 **الكمية المُدخلة:** ${quantity}\n`,
          `يرجى إدخال كمية من 1 إلى ${maxQuantity}`,
        ].filter(Boolean).join('\n')

        await ctx.reply(
          errorMessage,
          {
            reply_markup: new InlineKeyboard().text('❌ إلغاء', `sp:trans:return:quantity:${returnState.transactionId}`),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // مسح الحالة والتوجيه لصفحة التأكيد
      ;(ctx.session as any).returnState = undefined

      // استدعاء معالج التأكيد مباشرة
      const sparePart = await Database.prisma.iNV_Item.findUnique({
        where: { id: originalTransaction.itemId },
        include: {
          category: true,
          location: true,
        },
      })

      if (!sparePart) {
        await ctx.reply('❌ لم يتم العثور على بيانات القطعة')
        return
      }

      // عرض رسالة التأكيد
      let message = `↩️ **تأكيد إرجاع قطعة للمخزن**\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📋 **بيانات عملية الصرف الأصلية:**\n\n`
      message += `🔢 **رقم العملية:** \`${originalTransaction.transactionNumber}\`\n`
      message += `📅 **تاريخ الصرف:** ${originalTransaction.createdAt.toLocaleDateString('ar-EG')}\n`
      message += `⏰ **الوقت:** ${originalTransaction.createdAt.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📦 **معلومات القطعة:**\n\n`
      message += `**الاسم:** ${sparePart.nameAr}\n`
      message += `**الكود:** \`${sparePart.code}\`\n`
      if (sparePart.barcode) {
        message += `**الباركود:** \`${sparePart.barcode}\`\n`
      }
      message += `**التصنيف:** ${sparePart.category?.icon} ${sparePart.category?.nameAr}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📊 **تفاصيل الكمية:**\n\n`
      message += `**الكمية المصروفة الأصلية:** ${originalTransaction.quantity} ${sparePart.unit || 'قطعة'}\n`
      message += `**الكمية المُرجعة:** ${quantity} ${sparePart.unit || 'قطعة'}\n`
      if (originalTransaction.unitPrice) {
        const originalTotalValue = originalTransaction.quantity * originalTransaction.unitPrice
        const returnValue = quantity * originalTransaction.unitPrice
        message += `**سعر الوحدة:** ${originalTransaction.unitPrice} ${sparePart.currency || 'EGP'}\n`
        message += `**القيمة الإجمالية المصروفة:** ${originalTotalValue} ${sparePart.currency || 'EGP'}\n`
        message += `**قيمة المُرجع:** ${returnValue} ${sparePart.currency || 'EGP'}\n`
      }
      if (originalTransaction.notes) {
        message += `\n**ملاحظات الصرف:** ${originalTransaction.notes}\n`
      }
      message += `\n━━━━━━━━━━━━━━\n\n`
      message += `⚠️ **هل تريد إرجاع ${quantity} ${sparePart.unit || 'قطعة'} للمخزن؟**`

      const keyboard = new InlineKeyboard()
        .text('✅ تأكيد الإرجاع', `sp:trans:return:execute:${returnState.transactionId}:${quantity}`)
        .row()
        .text('🔙 تعديل الكمية', `sp:trans:return:quantity:${returnState.transactionId}`)
        .text('❌ إلغاء', 'sp:trans:return')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }

    // ═══ البحث بالباركود (إرجاع) ═══
    if (returnState.searchMode === 'search_by_barcode') {
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
              .text('🔍 بحث جديد', 'sp:trans:return:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).returnState = undefined
        return
      }

      // إعادة توجيه مباشرة لعرض آخر 5 عمليات صرف
      ;(ctx.session as any).returnState = undefined

      // جلب آخر 5 عمليات صرف
      const allIssueTransactions = await Database.prisma.iNV_Transaction.findMany({
        where: {
          itemId: item.id,
          transactionType: 'OUT',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // جلب 10 للتأكد من الحصول على 5 بعد الفلترة
      })

      // فلترة العمليات التي لديها كمية متاحة للإرجاع
      const issueTransactions = await filterReturnableTransactions(allIssueTransactions)

      if (issueTransactions.length === 0) {
        await ctx.reply(
          '⚠️ **لا توجد عمليات صرف متاحة للإرجاع**\n\n'
          + `📦 **${item.nameAr}**\n`
          + `🔤 **الكود:** \`${item.code}\`\n\n`
          + 'جميع عمليات الصرف السابقة تم إرجاعها بالكامل.',
          {
            reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // عرض القائمة
      let message = `✅ **تم العثور على القطعة!**\n\n`
      message += `↩️ **اختر عملية الصرف للإرجاع**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📋 **آخر ${issueTransactions.length} عمليات صرف:**\n\n`

      const keyboard = new InlineKeyboard()

      for (const trans of issueTransactions) {
        const date = trans.createdAt.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        const time = trans.createdAt.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })

        message += `🔢 **#${trans.transactionNumber}**\n`
        message += `   📊 الكمية: ${trans.quantity} ${item.unit || 'قطعة'}\n`
        message += `   📅 ${date} - ⏰ ${time}\n`
        if (trans.notes) {
          message += `   📝 ${trans.notes}\n`
        }
        message += `\n`

        keyboard
          .text(`#${trans.transactionNumber} - ${trans.quantity} ${item.unit || 'قطعة'}`, `sp:trans:return:quantity:${trans.id}`)
          .row()
      }

      keyboard.text('🔙 رجوع', 'sp:trans:return')

      message += `━━━━━━━━━━━━━━\n\n`
      message += `💡 اختر عملية الصرف التي تريد إرجاعها`

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }

    // ═══ البحث بالكود (إرجاع) ═══
    if (returnState.searchMode === 'search_by_code') {
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
          + '• تأكد من إدخال الكود بشكل صحيح\n'
          + '• استخدم البحث بالاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:return:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).returnState = undefined
        return
      }

      // عرض آخر 5 عمليات صرف
      ;(ctx.session as any).returnState = undefined

      // جلب آخر 10 عمليات صرف وفلترتها
      const allIssueTransactions = await Database.prisma.iNV_Transaction.findMany({
        where: {
          itemId: item.id,
          transactionType: 'OUT',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      })

      // فلترة العمليات التي لديها كمية متاحة للإرجاع
      const issueTransactions = await filterReturnableTransactions(allIssueTransactions)

      if (issueTransactions.length === 0) {
        await ctx.reply(
          '⚠️ **لا توجد عمليات صرف متاحة للإرجاع**\n\n'
          + `📦 **${item.nameAr}**\n`
          + `🔤 **الكود:** \`${item.code}\`\n\n`
          + 'جميع عمليات الصرف السابقة تم إرجاعها بالكامل.',
          {
            reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // عرض القائمة
      let message = `✅ **تم العثور على القطعة!**\n\n`
      message += `↩️ **اختر عملية الصرف للإرجاع**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📋 **آخر ${issueTransactions.length} عمليات صرف:**\n\n`

      const keyboard = new InlineKeyboard()

      for (const trans of issueTransactions) {
        const date = trans.createdAt.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        const time = trans.createdAt.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        })

        message += `🔢 **#${trans.transactionNumber}**\n`
        message += `   📊 الكمية: ${trans.quantity} ${item.unit || 'قطعة'}\n`
        message += `   📅 ${date} - ⏰ ${time}\n`
        if (trans.notes) {
          message += `   📝 ${trans.notes}\n`
        }
        message += `\n`

        keyboard
          .text(`#${trans.transactionNumber} - ${trans.quantity} ${item.unit || 'قطعة'}`, `sp:trans:return:quantity:${trans.id}`)
          .row()
      }

      keyboard.text('🔙 رجوع', 'sp:trans:return')

      message += `━━━━━━━━━━━━━━\n\n`
      message += `💡 اختر عملية الصرف التي تريد إرجاعها`

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }

    // ═══ البحث بالاسم (إرجاع) ═══
    if (returnState.searchMode === 'search_by_name') {
      const searchTerm = text.trim()

      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          OR: [{ nameAr: { contains: searchTerm } }, { nameEn: { contains: searchTerm } }],
        },
        take: 10,
        include: {
          category: { select: { nameAr: true, icon: true } },
          location: { select: { nameAr: true } },
        },
      })

      if (items.length === 0) {
        await ctx.reply(
          `🔎 **لا توجد نتائج للبحث عن:** "${searchTerm}"\n\n`
          + '**جرب:**\n'
          + '• استخدم كلمات أقل أو مختلفة\n'
          + '• تأكد من الإملاء\n'
          + '• جرب البحث بالكود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:return:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:return'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).returnState = undefined
        return
      }

      // إذا كانت نتيجة واحدة فقط
      if (items.length === 1) {
        const item = items[0]
        ;(ctx.session as any).returnState = undefined

        // جلب آخر 5 عمليات صرف
        const issueTransactions = await Database.prisma.iNV_Transaction.findMany({
          where: {
            itemId: item.id,
            transactionType: 'OUT',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        })

        if (issueTransactions.length === 0) {
          await ctx.reply(
            '⚠️ **لا توجد عمليات صرف سابقة لهذا الصنف**\n\n'
            + `📦 **${item.nameAr}**\n`
            + `🔤 **الكود:** \`${item.code}\`\n\n`
            + 'لا يمكن إرجاع صنف لم يتم صرفه من قبل.',
            {
              reply_markup: new InlineKeyboard().text('🔙 رجوع', 'sp:trans:return'),
              parse_mode: 'Markdown',
            },
          )
          return
        }

        // عرض القائمة
        let message = `↩️ **اختر عملية الصرف للإرجاع**\n\n`
        message += `📦 **${item.nameAr}**\n`
        message += `🔤 **الكود:** \`${item.code}\`\n\n`
        message += `━━━━━━━━━━━━━━\n\n`
        message += `📋 **آخر ${issueTransactions.length} عمليات صرف:**\n\n`

        const keyboard = new InlineKeyboard()

        for (const trans of issueTransactions) {
          const date = trans.createdAt.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          const time = trans.createdAt.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })

          message += `🔢 **#${trans.transactionNumber}**\n`
          message += `   📊 الكمية: ${trans.quantity} ${item.unit || 'قطعة'}\n`
          message += `   📅 ${date} - ⏰ ${time}\n`
          if (trans.notes) {
            message += `   📝 ${trans.notes}\n`
          }
          message += `\n`

          keyboard
            .text(`#${trans.transactionNumber} - ${trans.quantity} قطعة`, `sp:trans:return:confirm:${trans.id}`)
            .row()
        }

        keyboard.text('🔙 رجوع', 'sp:trans:return')

        message += `━━━━━━━━━━━━━━\n\n`
        message += `💡 اختر عملية الصرف التي تريد إرجاعها`

        await ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        })
        return
      }

      // إذا كانت عدة نتائج
      let message = `🔎 **نتائج البحث عن:** "${searchTerm}"\n\n`
      message += `📊 **تم العثور على ${items.length} قطع:**\n\n`

      const keyboard = new InlineKeyboard()

      for (const item of items) {
        const stockIcon
          = item.quantity === 0 ? '🔴' : item.minQuantity && item.quantity <= item.minQuantity ? '🟡' : '🟢'

        message += `${stockIcon} **${item.nameAr}**\n`
        message += `   🔤 \`${item.code}\`\n`
        message += `   📂 ${item.category?.icon} ${item.category?.nameAr}\n`
        message += `   📍 ${item.location?.nameAr}\n`
        message += `   📦 ${item.quantity} ${item.unit || 'قطعة'}\n\n`

        keyboard.text(`${stockIcon} ${item.nameAr}`, `sp:trans:return:select:${item.id}`).row()
      }

      keyboard.text('🔍 بحث جديد', 'sp:trans:return:search')
      keyboard.row()
      keyboard.text('❌ إلغاء', 'sp:trans:return')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      ;(ctx.session as any).returnState = undefined
      return
    }
  }

  // ═══════════════════════════════════════════════════════
  // معالجات البحث للنقل بين المواقع
  // ═══════════════════════════════════════════════════════
  if (transferState) {
    const text = ctx.message.text.trim()

    // ═══ البحث بالباركود (نقل) ═══
    if (transferState.searchMode === 'search_by_barcode') {
      const barcode = text.trim()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item || !item.location) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من إدخال الباركود بشكل صحيح\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:transfer:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:transfer'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).transferState = undefined
        return
      }

      // التحقق من توفر كمية
      if (item.quantity === 0) {
        await ctx.reply('⚠️ لا توجد كمية متاحة من هذه القطعة للنقل')
        ;(ctx.session as any).transferState = undefined
        return
      }

      // حفظ البيانات وطلب الكمية
      ;(ctx.session as any).transferState = {
        step: 'awaiting_quantity',
        itemId: item.id,
        sparePartName: item.nameAr,
        sparePartCode: item.code,
        currentLocationId: item.locationId,
        currentLocationName: item.location.nameAr,
        availableQuantity: item.quantity,
      }

      let message = `✅ **تم العثور على القطعة!**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n`
      message += `📍 **الموقع الحالي:** ${item.location.nameAr}\n`
      message += `📊 **الكمية المتاحة:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
      message += `📊 **أدخل الكمية للتأكيد:**\n\n`
      message += `**الكمية المطلوبة:** \`${item.quantity}\`\n\n`
      message += `💡 **ملاحظة:** لا يمكن نقل جزء من الكمية.`

      await ctx.reply(message, {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
        parse_mode: 'Markdown',
      })
      return
    }

    // ═══ البحث بالكود (نقل) ═══
    if (transferState.searchMode === 'search_by_code') {
      const code = text.trim().toUpperCase()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { code },
        include: {
          category: true,
          location: true,
        },
      })

      if (!item || !item.location) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالكود:** \`${code}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من إدخال الكود بشكل صحيح\n'
          + '• استخدم البحث بالاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:transfer:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:transfer'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).transferState = undefined
        return
      }

      // التحقق من توفر كمية
      if (item.quantity === 0) {
        await ctx.reply('⚠️ لا توجد كمية متاحة من هذه القطعة للنقل')
        ;(ctx.session as any).transferState = undefined
        return
      }

      // حفظ البيانات وطلب الكمية
      ;(ctx.session as any).transferState = {
        step: 'awaiting_quantity',
        itemId: item.id,
        sparePartName: item.nameAr,
        sparePartCode: item.code,
        currentLocationId: item.locationId,
        currentLocationName: item.location.nameAr,
        availableQuantity: item.quantity,
      }

      let message = `✅ **تم العثور على القطعة!**\n\n`
      message += `📦 **${item.nameAr}**\n`
      message += `🔤 **الكود:** \`${item.code}\`\n`
      message += `📍 **الموقع الحالي:** ${item.location.nameAr}\n`
      message += `📊 **الكمية المتاحة:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
      message += `📊 **أدخل الكمية للتأكيد:**\n\n`
      message += `**الكمية المطلوبة:** \`${item.quantity}\`\n\n`
      message += `💡 **ملاحظة:** لا يمكن نقل جزء من الكمية.`

      await ctx.reply(message, {
        reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
        parse_mode: 'Markdown',
      })
      return
    }

    // ═══ البحث بالاسم (نقل) ═══
    if (transferState.searchMode === 'search_by_name') {
      const searchTerm = text.trim()

      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          OR: [{ nameAr: { contains: searchTerm } }, { nameEn: { contains: searchTerm } }],
        },
        take: 10,
        include: {
          category: { select: { nameAr: true, icon: true } },
          location: { select: { nameAr: true } },
        },
      })

      if (items.length === 0) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطع باسم:** "${searchTerm}"\n\n`
          + '**جرب:**\n'
          + '• استخدام كلمات مختلفة\n'
          + '• البحث بالكود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:transfer:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:transfer'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).transferState = undefined
        return
      }

      // إذا كانت نتيجة واحدة فقط
      if (items.length === 1) {
        const item = items[0]

        if (!item.location) {
          await ctx.reply('❌ هذه القطعة ليس لها موقع محدد')
          ;(ctx.session as any).transferState = undefined
          return
        }

        if (item.quantity === 0) {
          await ctx.reply('⚠️ لا توجد كمية متاحة من هذه القطعة للنقل')
          ;(ctx.session as any).transferState = undefined
          return
        }

        ;(ctx.session as any).transferState = {
          step: 'awaiting_quantity',
          itemId: item.id,
          sparePartName: item.nameAr,
          sparePartCode: item.code,
          currentLocationId: item.locationId,
          currentLocationName: item.location.nameAr,
          availableQuantity: item.quantity,
        }

        let message = `✅ **تم العثور على القطعة!**\n\n`
        message += `📦 **${item.nameAr}**\n`
        message += `🔤 **الكود:** \`${item.code}\`\n`
        message += `📍 **الموقع الحالي:** ${item.location.nameAr}\n`
        message += `📊 **الكمية المتاحة:** ${item.quantity} ${item.unit || 'قطعة'}\n\n`
        message += `━━━━━━━━━━━━━━\n\n`
        message += `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
        message += `📊 **أدخل الكمية للتأكيد:**\n\n`
        message += `**الكمية المطلوبة:** \`${item.quantity}\`\n\n`
        message += `💡 **ملاحظة:** لا يمكن نقل جزء من الكمية.`

        await ctx.reply(message, {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:trans:transfer'),
          parse_mode: 'Markdown',
        })
        return
      }

      // إذا كانت عدة نتائج
      let message = `🔎 **نتائج البحث عن:** "${searchTerm}"\n\n`
      message += `📊 **تم العثور على ${items.length} قطع:**\n\n`

      const keyboard = new InlineKeyboard()

      for (const item of items) {
        const stockIcon
          = item.quantity === 0 ? '🔴' : item.minQuantity && item.quantity <= item.minQuantity ? '🟡' : '🟢'

        message += `${stockIcon} **${item.nameAr}**\n`
        message += `   🔤 \`${item.code}\`\n`
        message += `   📂 ${item.category?.icon} ${item.category?.nameAr}\n`
        message += `   📍 ${item.location?.nameAr}\n`
        message += `   📦 ${item.quantity} ${item.unit || 'قطعة'}\n\n`

        keyboard.text(`${stockIcon} ${item.nameAr}`, `sp:trans:transfer:select:${item.id}`).row()
      }

      keyboard.text('🔍 بحث جديد', 'sp:trans:transfer:search')
      keyboard.row()
      keyboard.text('❌ إلغاء', 'sp:trans:transfer')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }

    // معالجة إدخال الكمية للنقل
    if (transferState.step === 'awaiting_quantity') {
      const quantity = Number.parseInt(text, 10)

      if (Number.isNaN(quantity) || quantity <= 0) {
        await ctx.reply('❌ الرجاء إدخال كمية صحيحة (عدد موجب)')
        return
      }

      // ⚠️ النقل يجب أن يكون للكمية الكاملة فقط
      if (quantity !== transferState.availableQuantity) {
        await ctx.reply(
          `⚠️ **النقل بين المواقع يجب أن يكون للكمية الكاملة فقط**\n\n`
          + `📦 الكمية المتاحة: **${transferState.availableQuantity}**\n`
          + `❌ الكمية المدخلة: **${quantity}**\n\n`
          + `💡 لنقل جزء من الكمية:\n`
          + `   1️⃣ قم بإصدار الكمية المطلوبة أولاً (صرف)\n`
          + `   2️⃣ ثم انقل الكمية المتبقية\n\n`
          + `الرجاء إدخال الكمية الكاملة: **${transferState.availableQuantity}**`,
          { parse_mode: 'Markdown' },
        )
        return
      }

      // حفظ الكمية والانتقال لاختيار الموقع الجديد
      ;(ctx.session as any).transferState = {
        ...transferState,
        step: 'awaiting_new_location',
        quantity,
      }

      // جلب جميع المواقع ماعدا الموقع الحالي
      const locations = await Database.prisma.iNV_StorageLocation.findMany({
        where: {
          id: { not: transferState.currentLocationId },
          isActive: true,
        },
        orderBy: { nameAr: 'asc' },
      })

      if (locations.length === 0) {
        await ctx.reply('❌ لا توجد مواقع أخرى متاحة للنقل')
        ;(ctx.session as any).transferState = undefined
        return
      }

      let message = `✅ **تم تحديد الكمية: ${quantity}**\n\n`
      message += `📦 **${transferState.itemName}**\n`
      message += `📍 **من:** ${transferState.currentLocationName}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `📍 **اختر الموقع الجديد:**`

      const keyboard = new InlineKeyboard()
      for (const location of locations) {
        keyboard.text(`📍 ${location.nameAr}`, `sp:trans:transfer:location:${location.id}`).row()
      }
      keyboard.text('❌ إلغاء', 'sp:trans:transfer')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }
  }

  // ═══════════════════════════════════════════════════════
  // معالجات البحث للشراء
  // ═══════════════════════════════════════════════════════
  if (purchaseState) {
    const text = ctx.message.text.trim()

    // ═══ البحث بالباركود (شراء) ═══
    if (purchaseState.step === 'search_by_barcode') {
      const barcode = text.trim()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من إدخال الباركود بشكل صحيح\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:in:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:in'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      // بدء تدفق الشراء
      const sparePart = await Database.prisma.iNV_Item.findUnique({
        where: { id: item.id },
        include: {
          category: { select: { nameAr: true } },
          location: { select: { nameAr: true } },
        },
      })

      if (!sparePart) {
        await ctx.reply('❌ حدث خطأ في جلب بيانات القطعة.')
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      ;(ctx.session as any).purchaseForm = {
        step: 'purchase_date',
        data: {
          itemId: sparePart.id,
          sparePartName: sparePart.nameAr,
          categoryName: sparePart.category?.nameAr || 'غير محدد',
          locationName: sparePart.location?.nameAr || 'غير محدد',
          currentQuantity: sparePart.quantity,
          currentUnitPrice: sparePart.unitPrice,
        },
      }

      const keyboard = new InlineKeyboard()
        .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ **تم العثور على القطعة:**\n\n`
        + `📦 **الاسم:** ${sparePart.nameAr}\n`
        + `🏷️ **الكود:** ${sparePart.code}\n`
        + `📂 **الفئة:** ${sparePart.category?.nameAr || 'غير محدد'}\n`
        + `📍 **الموقع:** ${sparePart.location?.nameAr || 'غير محدد'}\n\n`
        + `📄 **الخطوة 1 من 13:** تاريخ الشراء\n\n`
        + `✍️ أدخل **تاريخ الشراء** بصيغة: DD/MM/YYYY\n`
        + `أو اضغط "استخدام تاريخ اليوم":`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // ═══ البحث بالكود (شراء) ═══
    if (purchaseState.step === 'search_by_code') {
      const code = text.trim().toUpperCase()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { code },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالكود:** \`${code}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من كتابة الكود بشكل صحيح\n'
          + '• استخدم البحث بالاسم أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:in:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:in'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      // بدء تدفق الشراء
      const sparePart = await Database.prisma.iNV_Item.findUnique({
        where: { id: item.id },
        include: {
          category: { select: { nameAr: true } },
          location: { select: { nameAr: true } },
        },
      })

      if (!sparePart) {
        await ctx.reply('❌ حدث خطأ في جلب بيانات القطعة.')
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      ;(ctx.session as any).purchaseForm = {
        step: 'purchase_date',
        data: {
          itemId: sparePart.id,
          sparePartName: sparePart.nameAr,
          categoryName: sparePart.category?.nameAr || 'غير محدد',
          locationName: sparePart.location?.nameAr || 'غير محدد',
          currentQuantity: sparePart.quantity,
          currentUnitPrice: sparePart.unitPrice,
        },
      }

      const keyboard = new InlineKeyboard()
        .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
        .row()
        .text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(
        `✅ **تم العثور على القطعة:**\n\n`
        + `📦 **الاسم:** ${sparePart.nameAr}\n`
        + `🏷️ **الكود:** ${sparePart.code}\n`
        + `📂 **الفئة:** ${sparePart.category?.nameAr || 'غير محدد'}\n`
        + `📍 **الموقع:** ${sparePart.location?.nameAr || 'غير محدد'}\n\n`
        + `📄 **الخطوة 1 من 13:** تاريخ الشراء\n\n`
        + `✍️ أدخل **تاريخ الشراء** بصيغة: DD/MM/YYYY\n`
        + `أو اضغط "استخدام تاريخ اليوم":`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
      return
    }

    // ═══ البحث بالاسم (شراء) ═══
    if (purchaseState.step === 'search_by_name') {
      const searchTerm = text.trim()

      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          isActive: true,
          OR: [
            { nameAr: { contains: searchTerm } },
            { nameEn: { contains: searchTerm } },
          ],
        },
        take: 10,
        include: {
          category: { select: { nameAr: true, icon: true } },
        },
      })

      if (items.length === 0) {
        await ctx.reply(
          `🔎 **لم يتم العثور على نتائج للبحث:** "${searchTerm}"\n\n`
          + '**جرب:**\n'
          + '• كلمات بحث مختلفة\n'
          + '• البحث بالكود أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:in:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:in'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).purchaseForm = undefined
        return
      }

      // إذا كانت نتيجة واحدة فقط
      if (items.length === 1) {
        const sparePart = await Database.prisma.iNV_Item.findUnique({
          where: { id: items[0].id },
          include: {
            category: { select: { nameAr: true } },
            location: { select: { nameAr: true } },
          },
        })

        if (!sparePart) {
          await ctx.reply('❌ حدث خطأ في جلب بيانات القطعة.')
          ;(ctx.session as any).purchaseForm = undefined
          return
        }

        ;(ctx.session as any).purchaseForm = {
          step: 'purchase_date',
          data: {
            itemId: sparePart.id,
            sparePartName: sparePart.nameAr,
            categoryName: sparePart.category?.nameAr || 'غير محدد',
            locationName: sparePart.location?.nameAr || 'غير محدد',
            currentQuantity: sparePart.quantity,
            currentUnitPrice: sparePart.unitPrice,
          },
        }

        const keyboard = new InlineKeyboard()
          .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
          .row()
          .text('❌ إلغاء', 'sp:trans:in')

        await ctx.reply(
          `✅ **تم العثور على القطعة:**\n\n`
          + `📦 **الاسم:** ${sparePart.nameAr}\n`
          + `🏷️ **الكود:** ${sparePart.code}\n`
          + `📂 **الفئة:** ${sparePart.category?.nameAr || 'غير محدد'}\n`
          + `📍 **الموقع:** ${sparePart.location?.nameAr || 'غير محدد'}\n\n`
          + `📄 **الخطوة 1 من 13:** تاريخ الشراء\n\n`
          + `✍️ أدخل **تاريخ الشراء** بصيغة: DD/MM/YYYY\n`
          + `أو اضغط "استخدام تاريخ اليوم":`,
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          },
        )
        return
      }

      // عرض نتائج متعددة
      let message = `🔍 **نتائج البحث** (${items.length})\n\n`
      message += `البحث: "${searchTerm}"\n\n`
      message += '⬇️ **اختر القطعة المطلوبة:**'

      const keyboard = new InlineKeyboard()
      for (const item of items) {
        const icon = item.quantity === 0 ? '🔴' : item.quantity <= (item.minQuantity || 0) ? '🟡' : '🟢'
        const displayText = `${icon} ${item.nameAr}`
        keyboard.text(displayText, `sp:trans:in:select:${item.id}`).row()
      }
      keyboard.text('🔍 بحث جديد', 'sp:trans:in:search')
      keyboard.row().text('❌ إلغاء', 'sp:trans:in')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })

      ;(ctx.session as any).purchaseForm = undefined
      return
    }
  }

  // ═══════════════════════════════════════════════════════
  // معالجات البحث للصرف
  // ═══════════════════════════════════════════════════════

  // إذا كان هناك تدفق صرف نشط
  if (issueState) {
    const text = ctx.message.text.trim()

    // ═══ البحث بالباركود ═══
    if (issueState.step === 'search_by_barcode') {
      const barcode = text.trim()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { barcode },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالباركود:** \`${barcode}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من إدخال الباركود بشكل صحيح\n'
          + '• استخدم البحث بالكود أو الاسم',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:out:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:out'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).issueForm = undefined
        return
      }

      // عرض حالات القطعة للصرف
      await showItemConditionsForIssue(ctx, item.id)
      return
    }

    // ═══ البحث بالكود ═══
    if (issueState.step === 'search_by_code') {
      const code = text.trim().toUpperCase()

      const item = await Database.prisma.iNV_Item.findUnique({
        where: { code },
      })

      if (!item) {
        await ctx.reply(
          `🔎 **لم يتم العثور على قطعة بالكود:** \`${code}\`\n\n`
          + '**جرب:**\n'
          + '• تأكد من كتابة الكود بشكل صحيح\n'
          + '• استخدم البحث بالاسم أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:out:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:out'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).issueForm = undefined
        return
      }

      // عرض حالات القطعة للصرف
      await showItemConditionsForIssue(ctx, item.id)
      return
    }

    // ═══ البحث بالاسم ═══
    if (issueState.step === 'search_by_name') {
      const searchTerm = text.trim()

      const items = await Database.prisma.iNV_Item.findMany({
        where: {
          isActive: true,
          OR: [
            { nameAr: { contains: searchTerm } },
            { nameEn: { contains: searchTerm } },
          ],
        },
        take: 10,
        include: {
          category: { select: { nameAr: true, icon: true } },
        },
      })

      if (items.length === 0) {
        await ctx.reply(
          `🔎 **لم يتم العثور على نتائج للبحث:** "${searchTerm}"\n\n`
          + '**جرب:**\n'
          + '• كلمات بحث مختلفة\n'
          + '• البحث بالكود أو الباركود',
          {
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث جديد', 'sp:trans:out:search')
              .row()
              .text('❌ إلغاء', 'sp:trans:out'),
            parse_mode: 'Markdown',
          },
        )
        ;(ctx.session as any).issueForm = undefined
        return
      }

      // إذا كانت نتيجة واحدة فقط
      if (items.length === 1) {
        await showItemConditionsForIssue(ctx, items[0].id)
        return
      }

      // عرض نتائج متعددة
      let message = `🔍 **نتائج البحث** (${items.length})\n\n`
      message += `البحث: "${searchTerm}"\n\n`
      message += '⬇️ **اختر القطعة المطلوبة:**'

      const keyboard = new InlineKeyboard()
      for (const item of items) {
        const icon = item.quantity === 0 ? '🔴' : item.quantity <= (item.minQuantity || 0) ? '🟡' : '🟢'
        const displayText = `${icon} ${item.nameAr}`
        keyboard.text(displayText, `sp:trans:out:select:${item.id}`).row()
      }
      keyboard.text('🔍 بحث جديد', 'sp:trans:out:search')
      keyboard.row().text('❌ إلغاء', 'sp:trans:out')

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })

      ;(ctx.session as any).issueForm = undefined
      return
    }

    // الخطوة: إدخال الكمية
    if (issueState.step === 'awaiting_quantity') {
      const quantity = Number.parseInt(text, 10)

      if (Number.isNaN(quantity) || quantity <= 0) {
        await ctx.reply('❌ الكمية غير صحيحة. يجب أن تكون رقماً موجباً.\n\n**مثال:** `10`', {
          parse_mode: 'Markdown',
        })
        return
      }

      // التحقق من الكمية المتاحة للحالة المختارة
      if (quantity > issueState.data.availableQuantity) {
        await ctx.reply(
          `❌ **الكمية المطلوبة أكبر من المتاح!**\n\n`
          + `الحالة المختارة: **${issueState.data.selectedConditionIcon} ${issueState.data.selectedConditionNameAr}**\n`
          + `الكمية المطلوبة: **${quantity}**\n`
          + `الكمية المتاحة: **${issueState.data.availableQuantity}**\n\n`
          + `⚠️ الرجاء إدخال كمية أقل من أو تساوي ${issueState.data.availableQuantity}`,
          { parse_mode: 'Markdown' },
        )
        return
      }

      // حفظ الكمية المطلوبة
      issueState.data.quantity = quantity
      issueState.step = 'select_issue_type'

      const keyboard = new InlineKeyboard()
        .text('🔧 صيانة معدة', 'sp:trans:out:type:equipment')
        .row()
        .text(' موظف', 'sp:trans:out:type:employee')
        .row()
        .text(' أخرى', 'sp:trans:out:type:other')
        .row()
        .text('❌ إلغاء', 'sp:trans:out')

      let message = `✅ **تم تحديد الكمية: ${quantity}**\n\n`
      message += `📦 **الحالة:** ${issueState.data.selectedConditionIcon} ${issueState.data.selectedConditionNameAr}\n`
      message += `📊 **الكمية المتبقية بعد الصرف:** ${issueState.data.availableQuantity - quantity}\n\n`
      message += `━━━━━━━━━━━━━━\n\n`
      message += `🎯 **اختر نوع الصرف:**\n\n`
      message += `🔧 **صيانة معدة**\n`
      message += `└ استخدام في إصلاح/صيانة معدة\n\n`
      message += ` **موظف**\n`
      message += `└ تسليم لموظف\n\n`
      message += `📦 **أخرى**\n`
      message += `└ أسباب أخرى`

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
      return
    }

    // الخطوة: إدخال الملاحظات
    if (issueState.step === 'awaiting_notes') {
      issueState.data.notes = text

      // الانتقال لشاشة المراجعة
      await showIssueReview(ctx)
      return
    }
  }

  // إذا لم يكن هناك صرف نشط، استمر للمعالج التالي
  return next()
})

// ════════════════════════════════════════════════════════
// دوال مساعدة لعرض القوائم
// ════════════════════════════════════════════════════════

// دالة عرض قائمة المعدات مع التصفح
async function showEquipmentSelectionList(ctx: any, page: number = 1) {
  try {
    const itemsPerPage = 20
    const skip = (page - 1) * itemsPerPage

    // جلب المعدات من قاعدة البيانات
    const [equipments, totalCount] = await Promise.all([
      Database.prisma.equipment.findMany({
        skip,
        take: itemsPerPage,
        orderBy: {
          nameAr: 'asc',
        },
        select: {
          id: true,
          nameAr: true,
          serialNumber: true,
          equipmentType: {
            select: {
              nameAr: true,
            },
          },
        },
      }),
      Database.prisma.equipment.count(),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '🔧 **اختر المعدة:**\n\n'
    message += `📄 **الصفحة ${page} من ${totalPages}**\n`
    message += `📊 **إجمالي:** ${totalCount} معدة\n\n`
    message += '⬇️ **اضغط على اسم المعدة:**'

    const keyboard = new InlineKeyboard()

    // إضافة أزرار المعدات
    for (const equipment of equipments) {
      const displayText = equipment.nameAr
        ? `${equipment.nameAr} (${equipment.equipmentType?.nameAr || 'معدة'})`
        : equipment.serialNumber || `معدة ${equipment.id}`

      keyboard.text(displayText, `sp:trans:out:equip:${equipment.id}`).row()
    }

    // أزرار التنقل بين الصفحات
    if (totalPages > 1) {
      keyboard.row()
      if (page > 1) {
        keyboard.text('⬅️ السابق', `sp:trans:out:equip-page:${page - 1}`)
      }
      if (page < totalPages) {
        keyboard.text('التالي ➡️', `sp:trans:out:equip-page:${page + 1}`)
      }
    }

    keyboard.row().text('❌ إلغاء', 'sp:trans:out')

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
  catch (error) {
    console.error('Error showing equipment list:', error)
    await ctx.reply('❌ حدث خطأ في جلب قائمة المعدات')
  }
}

// دالة عرض قائمة المشاريع مع التصفح
async function showProjectSelectionList(ctx: any, page: number = 1) {
  try {
    const itemsPerPage = 20
    const skip = (page - 1) * itemsPerPage

    // جلب المشاريع من قاعدة البيانات
    const [projects, totalCount] = await Promise.all([
      Database.prisma.project.findMany({
        skip,
        take: itemsPerPage,
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),
      Database.prisma.project.count(),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '📋 **اختر المشروع:**\n\n'
    message += `📄 **الصفحة ${page} من ${totalPages}**\n`
    message += `📊 **إجمالي:** ${totalCount} مشروع\n\n`
    message += '⬇️ **اضغط على اسم المشروع:**'

    const keyboard = new InlineKeyboard()

    // إضافة أزرار المشاريع
    for (const project of projects) {
      const displayText = project.name || project.code || `مشروع ${project.id}`
      keyboard.text(displayText, `sp:trans:out:proj:${project.id}`).row()
    }

    // أزرار التنقل بين الصفحات
    if (totalPages > 1) {
      keyboard.row()
      if (page > 1) {
        keyboard.text('⬅️ السابق', `sp:trans:out:proj-page:${page - 1}`)
      }
      if (page < totalPages) {
        keyboard.text('التالي ➡️', `sp:trans:out:proj-page:${page + 1}`)
      }
    }

    keyboard.row().text('❌ إلغاء', 'sp:trans:out')

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
  catch (error) {
    console.error('Error showing project list:', error)
    await ctx.reply('❌ حدث خطأ في جلب قائمة المشاريع')
  }
}

// ════════════════════════════════════════════════════════
// معالجات اختيار نوع الصرف
// ════════════════════════════════════════════════════════

// 1️⃣ نوع الصرف: صيانة معدة
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:type:equipment', async (ctx) => {
  await ctx.answerCallbackQuery()

  const issueState = (ctx.session as any).issueForm
  if (!issueState || issueState.step !== 'select_issue_type') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ;(ctx.session as any).issueForm = undefined
    return
  }

  issueState.data.issueType = 'EQUIPMENT'
  issueState.step = 'select_equipment'

  // عرض قائمة المعدات
  await showEquipmentSelectionList(ctx, 1)
})

// 2️⃣ نوع الصرف: تسليم لموظف
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:type:employee', async (ctx) => {
  await ctx.answerCallbackQuery()

  const issueState = (ctx.session as any).issueForm
  if (!issueState || issueState.step !== 'select_issue_type') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ;(ctx.session as any).issueForm = undefined
    return
  }

  issueState.data.issueType = 'EMPLOYEE'
  issueState.step = 'select_employee'

  // عرض قائمة الموظفين
  await showEmployeeSelectionList(ctx, 1)
})

// 4️⃣ نوع الصرف: أخرى (الأبسط - مباشر لاختيار المستلم)
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:type:other', async (ctx) => {
  await ctx.answerCallbackQuery()

  const issueState = (ctx.session as any).issueForm
  if (!issueState || issueState.step !== 'select_issue_type') {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ;(ctx.session as any).issueForm = undefined
    return
  }

  issueState.data.issueType = 'OTHER'
  issueState.step = 'select_employee'

  // عرض قائمة الموظفين
  await showEmployeeSelectionList(ctx, 1)
})

// تخطي الملاحظات والذهاب للمراجعة
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()

  const issueState = (ctx.session as any).issueForm
  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة. الرجاء البدء من جديد.')
    ;(ctx.session as any).issueForm = undefined
    return
  }

  // الانتقال لشاشة المراجعة
  await showIssueReview(ctx)
})

// دالة عرض مراجعة الصرف
async function showIssueReview(ctx: any) {
  const issueState = (ctx.session as any).issueForm
  if (!issueState) {
    return
  }

  const data = issueState.data

  const typeMap: Record<string, string> = {
    EQUIPMENT: '🔧 صيانة معدة',
    EMPLOYEE: '👤 موظف',
    OTHER: '📦 أخرى',
  }

  let message = '🔍 **مراجعة عملية الصرف**\n\n'
  message += `📦 **القطعة:** ${data.itemName}\n`
  message += `🔤 **الكود:** \`${data.itemCode}\`\n\n`
  message += `━━━━━━━━━━━━━━\n\n`
  message += `� **الحالة:** ${data.selectedConditionIcon} ${data.selectedConditionNameAr}\n`
  message += `📊 **الكمية قبل:** ${data.availableQuantity}\n`
  message += `➖ **الكمية المصروفة:** ${data.quantity}\n`
  message += `� **الكمية بعد:** ${data.availableQuantity - data.quantity}\n\n`
  message += `━━━━━━━━━━━━━━\n\n`
  message += `🎯 **نوع الصرف:** ${typeMap[data.issueType] || data.issueType}\n`

  // إضافة بيانات المعدة إذا كان النوع صيانة معدة
  if (data.equipmentName) {
    message += `🔧 **المعدة:** ${data.equipmentName}\n`
    if (data.equipmentCode) {
      message += `   └ الكود: \`${data.equipmentCode}\`\n`
    }
  }

  // إضافة بيانات الموظف المستلم
  if (data.employeeName) {
    message += `👤 **المستلم:** ${data.employeeName}\n`
    if (data.employeeCode) {
      message += `   └ الكود: \`${data.employeeCode}\`\n`
    }
  }

  if (data.notes) {
    message += `\n📝 **ملاحظات:** ${data.notes}\n`
  }

  message += `\n━━━━━━━━━━━━━━\n`

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد الصرف', 'sp:trans:out:confirm')
    .row()
    .text('❌ إلغاء', 'sp:trans:out')

  // Check if this is from a callback query (has callbackQuery) or text message
  if (ctx.callbackQuery) {
    // Edit existing message from button press
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  else {
    // Send new message from text input
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
}

// تأكيد الصرف وحفظ في قاعدة البيانات
sparePartsTransactionsHandler.callbackQuery('sp:trans:out:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()

  const issueState = (ctx.session as any).issueForm
  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  const data = issueState.data

  try {
    // جلب بيانات القطعة الكاملة مع العلاقات
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: data.itemId },
      include: {
        category: {
          select: {
            id: true,
            nameAr: true,
            code: true,
          },
        },
        location: {
          select: {
            id: true,
            nameAr: true,
            code: true,
          },
        },
      },
    })

    if (!sparePart) {
      await ctx.reply('❌ خطأ: القطعة غير موجودة')
      ;(ctx.session as any).issueForm = undefined
      return
    }

    const quantityBefore = sparePart.quantity
    const quantityAfter = quantityBefore - data.quantity

    // توليد رقم الحركة
    const now = new Date()
    const transactionNumber = `OUT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`

    // إنشاء سجل الحركة
    const transaction = await Database.prisma.iNV_Transaction.create({
      data: {
        transactionNumber,
        itemId: data.itemId,
        transactionType: 'OUT',
        quantity: data.quantity,
        quantityBefore,
        quantityAfter,
        notes: data.notes,
        reason: `صرف - ${data.issueType}`,
        transactionDate: new Date(),
        createdBy: BigInt(ctx.from?.id || 0),
        equipmentId: data.equipmentId || null,
        projectId: data.projectId || null,
        recipientEmployeeId: data.employeeId || null,
        toLocationId: data.toLocationId || null,
      },
    })

    // تحديث كميات القطعة حسب الحالة المختارة
    const quantityUpdates: any = {
      quantity: quantityAfter,
    }

    // تحديث الحالة المحددة فقط
    switch (data.selectedCondition) {
      case 'new':
        quantityUpdates.quantityNew = sparePart.quantityNew - data.quantity
        break
      case 'import':
        quantityUpdates.quantityImport = sparePart.quantityImport - data.quantity
        break
      case 'refurbished':
        quantityUpdates.quantityRefurbished = sparePart.quantityRefurbished - data.quantity
        break
      case 'used':
        quantityUpdates.quantityUsed = sparePart.quantityUsed - data.quantity
        break
    }

    await Database.prisma.iNV_Item.update({
      where: { id: data.itemId },
      data: quantityUpdates,
    })

    // مسح session
    ;(ctx.session as any).issueForm = undefined

    // إرسال تقرير احترافي لجميع الأدمن في قسم مخازن قطع الغيار
    await sendIssueReportToAdmins(ctx, transaction.id, data, sparePart, transactionNumber)
  }
  catch (error) {
    console.error('Error confirming issue:', error)
    await ctx.reply('❌ حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.')
  }
})

// Handle simple transaction text flows (quick in/out)
sparePartsTransactionsHandler.on('message:text', async (ctx, next) => {
  const state = (ctx.session as any).transactionForm
  if (!state) {
    return next()
  }

  if (state.step === 'awaiting_quantity') {
    const text = ctx.message.text.trim()
    const qty = Number.parseInt(text, 10)
    if (Number.isNaN(qty) || qty <= 0) {
      await ctx.reply('❌ الرجاء ادخال كمية صحيحة (عدد موجب)')
      return
    }

    const itemId = state.data.itemId
    const transactionType = state.data.transactionType

    try {
      // Get item details first
      const item = await Database.prisma.iNV_Item.findUnique({ where: { id: itemId } })
      if (!item) {
        await ctx.reply('❌ القطعة غير موجودة')
        ;(ctx.session as any).transactionForm = undefined
        return
      }

      const quantityBefore = item.quantity
      const newQty = transactionType === 'IN' ? item.quantity + qty : item.quantity - qty

      // Validate quantity for OUT operation
      if (transactionType === 'OUT' && newQty < 0) {
        await ctx.reply(`❌ الكمية المتاحة (${quantityBefore}) غير كافية للسحب`)
        return
      }

      // Generate transaction number
      const now = new Date()
      const transactionNumber = `${transactionType}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`

      // Create transaction record
      await Database.prisma.iNV_Transaction.create({
        data: {
          transactionNumber,
          itemId: itemId,
          transactionType,
          quantity: qty,
          quantityBefore,
          quantityAfter: newQty,
          createdBy: BigInt(ctx.from?.id || 0),
          notes: `سجل سريع بواسطة المستخدم`,
        },
      })

      // Update spare part quantity and total value
      await Database.prisma.iNV_Item.update({
        where: { id: itemId },
        data: {
          quantity: newQty,
          totalValue: newQty * item.unitPrice,
        },
      })

      // Clear session
      ;(ctx.session as any).transactionForm = undefined

      await ctx.reply(
        `✅ **تم تسجيل العملية بنجاح**\n\n`
        + `**النوع:** ${transactionType === 'IN' ? 'إدخال ➕' : 'إخراج ➖'}\n`
        + `**الكمية:** ${qty}\n`
        + `**الكمية قبل:** ${quantityBefore}\n`
        + `**الكمية بعد:** ${newQty}\n`
        + `**القطعة:** ${item.nameAr}`,
        { parse_mode: 'Markdown' },
      )
    }
    catch (error) {
      console.error('Error processing quick transaction:', error)
      await ctx.reply('❌ حدث خطأ أثناء تسجيل الحركة. حاول مرة أخرى.')
    }

    return
  }

  return next()
})

// ════════════════════════════════════════════════════════
// Callback Handlers - تدفق الشراء المتقدم
// ════════════════════════════════════════════════════════

// تخطي رقم الفاتورة
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:skip_invoice', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'invoice_number') {
    return
  }

  state.data.invoiceNumber = null
  state.step = 'purchase_date'

  const keyboard = new InlineKeyboard()
    .text('📅 استخدام تاريخ اليوم', 'sp:trans:in:use_today')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `📄 **الخطوة 2 من 13:** تاريخ الشراء\n\n`
    + `✍️ الرجاء إرسال **تاريخ الشراء** بصيغة:\n`
    + `يوم/شهر/سنة (مثال: 15/03/2025)\n\n`
    + `أو اضغط "استخدام تاريخ اليوم":`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// استخدام تاريخ اليوم
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:use_today', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'purchase_date') {
    return
  }

  state.data.purchaseDate = new Date()
  state.step = 'quantity'

  const keyboard = new InlineKeyboard().text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `📄 **الخطوة 3 من 13:** الكمية\n\n`
    + `📦 **المنتج:** ${state.data.itemName}\n`
    + `📊 **الكمية الحالية:** ${state.data.currentQuantity}\n\n`
    + `✍️ الرجاء إرسال **كمية الشراء** (عدد صحيح):`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// استخدام السعر الحالي
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:use_current_price', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'unit_price') {
    return
  }

  state.data.unitPrice = state.data.currentUnitPrice
  state.data.totalCost = state.data.currentUnitPrice * state.data.quantity
  state.step = 'condition'

  const keyboard = new InlineKeyboard()
    .text('🆕 جديد', 'sp:trans:in:cond:NEW')
    .text('♻️ مستعمل', 'sp:trans:in:cond:USED')
    .row()
    .text('🔧 مجدد', 'sp:trans:in:cond:REFURBISHED')
    .text('📥 استيراد', 'sp:trans:in:cond:IMPORT')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `✅ سعر الوحدة: ${state.data.currentUnitPrice} ج.م\n`
    + `💰 **الإجمالي:** ${state.data.totalCost.toFixed(2)} ج.م\n\n`
    + `📄 **الخطوة 5 من 13:** حالة المنتج\n\n`
    + `✍️ اختر **حالة المنتج المشترى**:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// اختيار الحالة
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:in:cond:(NEW|USED|REFURBISHED|IMPORT)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const condition = ctx.match![1]
  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'condition') {
    return
  }

  const conditionMap: Record<string, string> = {
    NEW: '🆕 جديد',
    USED: '♻️ مستعمل',
    REFURBISHED: '🔧 مجدد',
    IMPORT: '📥 استيراد',
  }

  state.data.condition = condition
  state.step = 'supplier'

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي (بدون مورد)', 'sp:trans:in:skip_supplier')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `✅ الحالة: ${conditionMap[condition]}\n\n`
    + `📄 **الخطوة 6 من 13:** اسم المورد\n\n`
    + `✍️ الرجاء إرسال **اسم المورد** أو اضغط تخطي:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تخطي اسم المورد
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:skip_supplier', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'supplier') {
    return
  }

  state.data.supplierName = null
  state.step = 'payment_method'

  const keyboard = new InlineKeyboard()
    .text('💵 نقدي', 'sp:trans:in:pay:cash')
    .text('📋 آجل', 'sp:trans:in:pay:deferred')
    .row()
    .text('🧾 شيك', 'sp:trans:in:pay:check')
    .text('🏦 تحويل بنكي', 'sp:trans:in:pay:transfer')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `📄 **الخطوة 7 من 13:** طريقة الدفع\n\n`
    + `✍️ اختر **طريقة الدفع**:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// اختيار طريقة الدفع
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:in:pay:(cash|deferred|check|transfer)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const paymentMethod = ctx.match![1]
  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'payment_method') {
    return
  }

  const paymentMap: Record<string, string> = {
    cash: '💵 نقدي',
    deferred: '📋 آجل',
    check: '🧾 شيك',
    transfer: '🏦 تحويل بنكي',
  }

  state.data.paymentMethod = paymentMethod
  state.step = 'notes'

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي (بدون ملاحظات)', 'sp:trans:in:skip_notes')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `✅ طريقة الدفع: ${paymentMap[paymentMethod]}\n\n`
    + `📄 **الخطوة 8 من 13:** ملاحظات\n\n`
    + `✍️ الرجاء إرسال **ملاحظات** (اختياري) أو اضغط تخطي:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تخطي الملاحظات
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'notes') {
    return
  }

  state.data.notes = null
  state.step = 'invoice_photo'

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي (بدون صورة)', 'sp:trans:in:skip_photo')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.editMessageText(
    `📄 **الخطوة 9 من 13:** صورة الفاتورة\n\n`
    + `📸 الرجاء **إرسال صورة الفاتورة** أو اضغط تخطي:`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تخطي صورة الفاتورة
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:skip_photo', async (ctx) => {
  await ctx.answerCallbackQuery()

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'invoice_photo') {
    return
  }

  state.data.invoicePhoto = null

  // عرض ملخص المراجعة
  await showPurchaseReview(ctx, state)
})

// معالج استلام الصورة
sparePartsTransactionsHandler.on('message:photo', async (ctx, next) => {
  const state = (ctx.session as any).purchaseForm

  if (state && state.step === 'invoice_photo') {
    const photo = ctx.message.photo[ctx.message.photo.length - 1] // أكبر حجم
    state.data.invoicePhoto = photo.file_id

    await ctx.reply('✅ تم استلام صورة الفاتورة')

    // عرض ملخص المراجعة
    await showPurchaseReview(ctx, state)
    return
  }

  return next()
})

// دالة عرض ملخص المراجعة
async function showPurchaseReview(ctx: Context, state: any) {
  const data = state.data

  const conditionMap: Record<string, string> = {
    NEW: '🆕 جديد',
    USED: '♻️ مستعمل',
    REFURBISHED: '🔧 مجدد',
    IMPORT: '📥 استيراد',
  }

  const paymentMap: Record<string, string> = {
    cash: '💵 نقدي',
    deferred: '📋 آجل',
    check: '🧾 شيك',
    transfer: '🏦 تحويل بنكي',
  }

  let message = '📋 **مراجعة بيانات الشراء**\n\n'
  message += `━━━━━━━━━━━━━━\n`
  message += `📦 **المنتج:** ${data.itemName}\n`
  message += `🔤 **الكود:** \`${data.itemCode}\`\n\n`

  if (data.invoiceNumber) {
    message += `📄 **رقم الفاتورة:** ${data.invoiceNumber}\n`
  }

  if (data.purchaseDate) {
    message += `📅 **تاريخ الشراء:** ${data.purchaseDate.toLocaleDateString('ar-EG')}\n`
  }

  message += `🔢 **الكمية:** ${data.quantity}\n`
  message += `💰 **سعر الوحدة:** ${data.unitPrice} ج.م\n`
  message += `💵 **الإجمالي:** ${data.totalCost.toFixed(2)} ج.م\n`
  message += `🏷️ **الحالة:** ${conditionMap[data.condition]}\n`

  if (data.supplierName) {
    message += `🏢 **المورد:** ${data.supplierName}\n`
  }

  if (data.paymentMethod) {
    message += `💳 **الدفع:** ${paymentMap[data.paymentMethod]}\n`
  }

  if (data.notes) {
    message += `📝 **ملاحظات:** ${data.notes}\n`
  }

  if (data.invoicePhoto) {
    message += `📸 **صورة الفاتورة:** ✅ مرفقة\n`
  }

  message += `\n━━━━━━━━━━━━━━\n`
  message += `📊 **الكمية قبل الشراء:** ${data.currentQuantity}\n`
  message += `📊 **الكمية بعد الشراء:** ${data.currentQuantity + data.quantity}\n\n`
  message += `⚠️ **هل أنت متأكد من إتمام الشراء?**`

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد الشراء', 'sp:trans:in:confirm')
    .row()
    .text('❌ إلغاء', 'sp:trans:in')

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })

  state.step = 'review'
}

// تأكيد الشراء وحفظ البيانات
sparePartsTransactionsHandler.callbackQuery('sp:trans:in:confirm', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري حفظ البيانات...', show_alert: false })

  const state = (ctx.session as any).purchaseForm
  if (!state || state.step !== 'review') {
    return
  }

  const data = state.data

  try {
    // جلب بيانات المنتج
    const sparePart = await Database.prisma.iNV_Item.findUnique({
      where: { id: data.itemId },
    })

    if (!sparePart) {
      await ctx.reply('❌ خطأ: المنتج غير موجود')
      ;(ctx.session as any).purchaseForm = undefined
      return
    }

    const quantityBefore = sparePart.quantity
    const quantityAfter = quantityBefore + data.quantity

    // توليد رقم الحركة
    const now = new Date()
    const transactionNumber = `IN-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`

    // إنشاء سجل الحركة مع كل البيانات
    const transaction = await Database.prisma.iNV_Transaction.create({
      data: {
        transactionNumber,
        itemId: data.itemId,
        transactionType: 'IN',
        quantity: data.quantity,
        quantityBefore,
        quantityAfter,
        invoiceNumber: data.invoiceNumber,
        supplierName: data.supplierName,
        unitPrice: data.unitPrice,
        notes: data.notes,
        reason: `شراء - ${data.condition}`,
        attachments: data.invoicePhoto ? { invoicePhoto: data.invoicePhoto } : undefined,
        transactionDate: data.purchaseDate || new Date(),
        createdBy: BigInt(ctx.from?.id || 0),
      },
    })

    // حساب المتوسط المرجح للسعر
    // القيمة الحالية = الكمية القديمة × السعر القديم
    const oldTotalValue = sparePart.quantity * sparePart.unitPrice
    // القيمة الجديدة = الكمية المضافة × السعر الجديد
    const newTotalValue = data.quantity * data.unitPrice
    // متوسط السعر = (القيمة القديمة + القيمة الجديدة) ÷ الكمية الإجمالية
    const weightedAveragePrice = quantityAfter > 0
      ? (oldTotalValue + newTotalValue) / quantityAfter
      : data.unitPrice

    // حساب الكميات الجديدة حسب الحالة
    const quantityUpdates: any = {
      quantity: quantityAfter,
      unitPrice: weightedAveragePrice, // ✅ استخدام المتوسط المرجح
      totalValue: quantityAfter * weightedAveragePrice,
      supplierName: data.supplierName || sparePart.supplierName,
    }

    // إضافة الكمية للحقل المناسب حسب الحالة
    switch (data.condition) {
      case 'NEW':
        quantityUpdates.quantityNew = sparePart.quantityNew + data.quantity
        break
      case 'USED':
        quantityUpdates.quantityUsed = sparePart.quantityUsed + data.quantity
        break
      case 'REFURBISHED':
        quantityUpdates.quantityRefurbished = sparePart.quantityRefurbished + data.quantity
        break
      case 'IMPORT':
        quantityUpdates.quantityImport = sparePart.quantityImport + data.quantity
        break
    }

    // تحديث كمية المنتج والسعر
    await Database.prisma.iNV_Item.update({
      where: { id: data.itemId },
      data: quantityUpdates,
    })

    // مسح session
    ;(ctx.session as any).purchaseForm = undefined

    // رسالة نجاح
    const conditionMap: Record<string, string> = {
      NEW: '🆕 جديد',
      USED: '♻️ مستعمل',
      REFURBISHED: '🔧 مجدد',
      IMPORT: '📥 استيراد',
    }

    let successMessage = `✅ **تم إتمام الشراء بنجاح!**\n\n`
    successMessage += `📦 **المنتج:** ${data.itemName}\n`
    successMessage += `🔤 **الكود:** \`${data.itemCode}\`\n`
    successMessage += `🔢 **رقم الحركة:** \`${transactionNumber}\`\n\n`
    successMessage += `━━━━━━━━━━━━━━\n\n`
    successMessage += `📊 **الكمية قبل:** ${quantityBefore}\n`
    successMessage += `➕ **الكمية المضافة:** ${data.quantity}\n`
    successMessage += `📊 **الكمية بعد:** ${quantityAfter}\n\n`
    successMessage += `💰 **سعر الوحدة:** ${data.unitPrice} ج.م\n`
    successMessage += `💵 **إجمالي التكلفة:** ${data.totalCost.toFixed(2)} ج.م\n`
    successMessage += `🏷️ **الحالة:** ${conditionMap[data.condition]}\n\n`

    if (data.invoiceNumber) {
      successMessage += `📄 **رقم الفاتورة:** ${data.invoiceNumber}\n`
    }

    if (data.supplierName) {
      successMessage += `🏢 **المورد:** ${data.supplierName}\n`
    }

    await ctx.reply(successMessage, {
      parse_mode: 'Markdown',
    })

    // إرسال إشعار للمشرفين
    await sendPurchaseNotificationToAdmins(ctx, transaction, sparePart, data)
  }
  catch (error) {
    console.error('Error confirming purchase:', error)
    await ctx.reply('❌ حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.')
  }
})

// دالة إرسال إشعار للمشرفين
async function sendPurchaseNotificationToAdmins(ctx: Context, transaction: any, item: any, data: any) {
  try {
    const departmentConfig = await Database.prisma.departmentConfig.findUnique({
      where: { code: 'inventory-management' },
    })

    if (!departmentConfig) {
      return
    }

    const admins = await Database.prisma.departmentAdmin.findMany({
      where: {
        departmentId: departmentConfig.id,
        isActive: true,
      },
    })

    const conditionMap: Record<string, string> = {
      NEW: '🆕 جديد',
      USED: '♻️ مستعمل',
      REFURBISHED: '🔧 مجدد',
      IMPORT: '📥 استيراد',
    }

    const paymentMap: Record<string, string> = {
      cash: '💵 نقدي',
      deferred: '📋 آجل',
      check: '🧾 شيك',
      transfer: '🏦 تحويل بنكي',
    }

    let adminMessage = `🔔 **إشعار شراء جديد - مخزن قطع الغيار**\n\n`
    adminMessage += `📦 **المنتج:** ${item.nameAr}\n`
    adminMessage += `🔤 **الكود:** \`${item.code}\`\n`
    adminMessage += `🔢 **رقم الحركة:** \`${transaction.transactionNumber}\`\n\n`
    adminMessage += `━━━━━━━━━━━━━━\n\n`
    adminMessage += `📊 **الكمية قبل:** ${transaction.quantityBefore}\n`
    adminMessage += `➕ **الكمية المضافة:** ${transaction.quantity}\n`
    adminMessage += `📊 **الكمية بعد:** ${transaction.quantityAfter}\n\n`
    adminMessage += `💰 **سعر الوحدة:** ${transaction.unitPrice} ج.م\n`
    adminMessage += `💵 **إجمالي التكلفة:** ${transaction.totalCost.toFixed(2)} ج.م\n`
    adminMessage += `🏷️ **الحالة:** ${conditionMap[data.condition]}\n\n`

    if (transaction.invoiceNumber) {
      adminMessage += `📄 **رقم الفاتورة:** ${transaction.invoiceNumber}\n`
    }

    if (transaction.supplierName) {
      adminMessage += `🏢 **المورد:** ${transaction.supplierName}\n`
    }

    if (data.paymentMethod) {
      adminMessage += `💳 **طريقة الدفع:** ${paymentMap[data.paymentMethod]}\n`
    }

    if (transaction.notes) {
      adminMessage += `📝 **ملاحظات:** ${transaction.notes}\n`
    }

    adminMessage += `\n━━━━━━━━━━━━━━\n`
    adminMessage += `👤 **تم بواسطة:** ${ctx.from?.first_name || 'مستخدم'}\n`
    adminMessage += `📅 **التاريخ:** ${new Date().toLocaleString('ar-EG')}`

    for (const admin of admins) {
      try {
        await ctx.api.sendMessage(admin.telegramId.toString(), adminMessage, {
          parse_mode: 'Markdown',
        })

        // إرسال صورة الفاتورة إن وجدت
        if (data.invoicePhoto) {
          await ctx.api.sendPhoto(admin.telegramId.toString(), data.invoicePhoto, {
            caption: '📸 صورة الفاتورة',
          })
        }
      }
      catch (adminError) {
        console.error(`Failed to notify admin ${admin.telegramId}:`, adminError)
      }
    }
  }
  catch (error) {
    console.error('Error sending admin notifications:', error)
  }
}

// ════════════════════════════════════════════════════════
// 📋 دالة عرض قائمة الموظفين للاختيار
// ════════════════════════════════════════════════════════
async function showEmployeeSelectionList(ctx: any, page: number = 1) {
  try {
    const itemsPerPage = 20
    const skip = (page - 1) * itemsPerPage

    // جلب الموظفين النشطين من قاعدة البيانات
    const [employees, totalCount] = await Promise.all([
      Database.prisma.employee.findMany({
        where: {
          isActive: true,
        },
        skip,
        take: itemsPerPage,
        orderBy: {
          nickname: 'asc',
        },
        select: {
          id: true,
          nickname: true,
          position: {
            select: {
              titleAr: true,
            },
          },
        },
      }),
      Database.prisma.employee.count({
        where: {
          isActive: true,
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / itemsPerPage)

    let message = '👥 **اختر الموظف المستلم:**\n\n'
    message += `📄 **الصفحة ${page} من ${totalPages}**\n`
    message += `📊 **إجمالي:** ${totalCount} موظف\n\n`
    message += '⬇️ **اضغط على اسم الموظف:**'

    const keyboard = new InlineKeyboard()

    // إضافة أزرار الموظفين
    for (const emp of employees) {
      const displayText = emp.nickname
        ? `${emp.nickname} (${emp.position?.titleAr || 'موظف'})`
        : emp.position?.titleAr || `موظف ${emp.id}`

      keyboard.text(displayText, `sp:trans:out:emp:${emp.id}`).row()
    }

    // أزرار التنقل بين الصفحات
    if (totalPages > 1) {
      keyboard.row()
      if (page > 1) {
        keyboard.text('⬅️ السابق', `sp:trans:out:emp-page:${page - 1}`)
      }
      if (page < totalPages) {
        keyboard.text('التالي ➡️', `sp:trans:out:emp-page:${page + 1}`)
      }
    }

    keyboard.row().text('❌ إلغاء', 'sp:trans:out')

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
  catch (error) {
    console.error('Error showing employee list:', error)
    await ctx.reply('❌ حدث خطأ في جلب قائمة الموظفين')
  }
}

// معالج التنقل بين صفحات الموظفين
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:emp-page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showEmployeeSelectionList(ctx, page)
})

// معالج اختيار موظف
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:emp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1], 10)
  const issueState = (ctx.session as any).issueForm

  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  try {
    // جلب بيانات الموظف
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        nickname: true,
        position: { select: { titleAr: true } },
        employeeCode: true,
      },
    })

    if (!employee) {
      await ctx.answerCallbackQuery({ text: '❌ الموظف غير موجود', show_alert: true })
      return
    }

    // حفظ بيانات الموظف
    issueState.data.employeeId = employee.id
    issueState.data.employeeName = employee.nickname || employee.position?.titleAr || `موظف ${employee.id}`
    issueState.data.employeeCode = employee.employeeCode

    // إذا كان النوع "نقل"، نطلب الموقع
    if (issueState.data.issueType === 'TRANSFER') {
      issueState.step = 'select_location'
      await showLocationSelectionList(ctx)
    }
    // وإلا ننتقل للملاحظات
    else {
      issueState.step = 'awaiting_notes'

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي الملاحظات', 'sp:trans:out:skip_notes')
        .row()
        .text('❌ إلغاء', 'sp:trans:out')

      await ctx.editMessageText(
        `✅ **تم اختيار المستلم:**\n\n`
        + `👤 **الاسم:** ${issueState.data.employeeName}\n`
        + `${employee.employeeCode ? `🔢 **الكود:** \`${employee.employeeCode}\`\n` : ''}\n`
        + `━━━━━━━━━━━━━━\n\n`
        + `📝 **أضف ملاحظات (اختياري):**\n\n`
        + `✍️ اكتب سبب الصرف أو أي ملاحظات إضافية\n\n`
        + `⏳ **أو اضغط "تخطي" للمتابعة...**`,
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
  }
  catch (error) {
    console.error('Error selecting employee:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// معالج التنقل بين صفحات المعدات
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:equip-page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showEquipmentSelectionList(ctx, page)
})

// معالج اختيار معدة
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:equip:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const equipmentId = Number.parseInt(ctx.match![1], 10)
  const issueState = (ctx.session as any).issueForm

  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  try {
    // جلب بيانات المعدة
    const equipment = await Database.prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        nameAr: true,
        code: true,
      },
    })

    if (!equipment) {
      await ctx.answerCallbackQuery({ text: '❌ المعدة غير موجودة', show_alert: true })
      return
    }

    // حفظ بيانات المعدة
    issueState.data.equipmentId = equipment.id
    issueState.data.equipmentName = equipment.nameAr
    issueState.data.equipmentCode = equipment.code

    // الانتقال لاختيار الموظف
    issueState.step = 'select_employee'
    await showEmployeeSelectionList(ctx, 1)
  }
  catch (error) {
    console.error('Error selecting equipment:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// معالج التنقل بين صفحات المشاريع
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:proj-page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showProjectSelectionList(ctx, page)
})

// معالج اختيار مشروع
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:proj:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const projectId = Number.parseInt(ctx.match![1], 10)
  const issueState = (ctx.session as any).issueForm

  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  try {
    // جلب بيانات المشروع
    const project = await Database.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        code: true,
      },
    })

    if (!project) {
      await ctx.answerCallbackQuery({ text: '❌ المشروع غير موجود', show_alert: true })
      return
    }

    // حفظ بيانات المشروع
    issueState.data.projectId = project.id
    issueState.data.projectName = project.name
    issueState.data.projectCode = project.code

    // الانتقال لاختيار الموظف
    issueState.step = 'select_employee'
    await showEmployeeSelectionList(ctx, 1)
  }
  catch (error) {
    console.error('Error selecting project:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 📍 دالة عرض قائمة المواقع للاختيار (للنقل)
// ════════════════════════════════════════════════════════
async function showLocationSelectionList(ctx: any) {
  try {
    const locations = await Database.prisma.iNV_StorageLocation.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        nameAr: 'asc',
      },
      select: {
        id: true,
        code: true,
        nameAr: true,
      },
    })

    let message = '📍 **اختر موقع التخزين الجديد:**\n\n'
    message += `📊 **المواقع المتاحة:** ${locations.length}\n\n`
    message += '⬇️ **اضغط على الموقع:**'

    const keyboard = new InlineKeyboard()

    for (const loc of locations) {
      keyboard.text(`📍 ${loc.nameAr}`, `sp:trans:out:loc:${loc.id}`).row()
    }

    keyboard.text('❌ إلغاء', 'sp:trans:out')

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
  catch (error) {
    console.error('Error showing location list:', error)
    await ctx.reply('❌ حدث خطأ في جلب قائمة المواقع')
  }
}

// معالج اختيار موقع
sparePartsTransactionsHandler.callbackQuery(/^sp:trans:out:loc:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const locationId = Number.parseInt(ctx.match![1], 10)
  const issueState = (ctx.session as any).issueForm

  if (!issueState) {
    await ctx.reply('❌ حالة غير صحيحة.')
    return
  }

  try {
    // جلب بيانات الموقع
    const location = await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        code: true,
        nameAr: true,
      },
    })

    if (!location) {
      await ctx.answerCallbackQuery({ text: '❌ الموقع غير موجود', show_alert: true })
      return
    }

    // حفظ بيانات الموقع
    issueState.data.toLocationId = location.id
    issueState.data.toLocationName = location.nameAr

    // الانتقال للملاحظات
    issueState.step = 'awaiting_notes'

    const keyboard = new InlineKeyboard()
      .text('⏭️ تخطي الملاحظات', 'sp:trans:out:skip_notes')
      .row()
      .text('❌ إلغاء', 'sp:trans:out')

    await ctx.editMessageText(
      `✅ **تم اختيار الموقع:**\n\n`
      + `📍 **الموقع الجديد:** ${location.nameAr}\n`
      + `🔤 **الكود:** \`${location.code}\`\n\n`
      + `━━━━━━━━━━━━━━\n\n`
      + `📝 **أضف ملاحظات (اختياري):**\n\n`
      + `✍️ اكتب سبب النقل أو أي ملاحظات إضافية\n\n`
      + `⏳ **أو اضغط "تخطي" للمتابعة...**`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error selecting location:', error)
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 📊 دالة إرسال تقرير احترافي للأدمن
// ════════════════════════════════════════════════════════
async function sendIssueReportToAdmins(
  ctx: any,
  transactionId: number,
  data: any,
  item: any,
  transactionNumber: string,
) {
  try {
    // جلب المسؤولين في قسم مخزن قطع الغيار فقط
    const admins = await Database.prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
        ],
        isActive: true,
        isBanned: false,
        // TODO: يمكن إضافة فلتر حسب القسم عندما يتم تطبيق نظام الأقسام
        // departmentId: SPARE_PARTS_DEPARTMENT_ID
      },
      select: {
        telegramId: true,
        fullName: true,
        nickname: true,
      },
    })

    if (admins.length === 0) {
      return
    }

    // جلب معلومات المستخدم الذي قام بالصرف
    const issuer = await Database.prisma.user.findUnique({
      where: { telegramId: BigInt(ctx.from?.id || 0) },
      select: {
        fullName: true,
        nickname: true,
        username: true,
      },
    })

    // جلب معلومات إضافية
    let equipmentInfo = ''
    let projectInfo = ''
    let employeeInfo = ''
    let locationInfo = ''

    if (data.equipmentId) {
      const equipment = await Database.prisma.equipment.findUnique({
        where: { id: data.equipmentId },
        select: {
          nameAr: true,
          code: true,
          equipmentType: { select: { nameAr: true } },
        },
      })
      if (equipment) {
        equipmentInfo = `🔧 **المعدة:** ${equipment.nameAr} (${equipment.code})\n`
        equipmentInfo += `   └ النوع: ${equipment.equipmentType?.nameAr || 'غير محدد'}\n`
      }
    }

    if (data.projectId) {
      const project = await Database.prisma.project.findUnique({
        where: { id: data.projectId },
        select: { name: true, code: true },
      })
      if (project) {
        projectInfo = `📋 **المشروع:** ${project.name}\n`
        if (project.code) {
          projectInfo += `   └ الكود: \`${project.code}\`\n`
        }
      }
    }

    if (data.employeeId) {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: data.employeeId },
        select: {
          nickname: true,
          employeeCode: true,
          position: { select: { titleAr: true } },
        },
      })
      if (employee) {
        employeeInfo = `👤 **المستلم:** ${employee.nickname}\n`
        if (employee.employeeCode) {
          employeeInfo += `   └ الكود: \`${employee.employeeCode}\`\n`
        }
        if (employee.position?.titleAr) {
          employeeInfo += `   └ الوظيفة: ${employee.position.titleAr}\n`
        }
      }
    }

    if (data.toLocationId) {
      const location = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { id: data.toLocationId },
        select: { nameAr: true, code: true },
      })
      if (location) {
        locationInfo = `📍 **الموقع الجديد:** ${location.nameAr}\n`
        if (location.code) {
          locationInfo += `   └ الكود: \`${location.code}\`\n`
        }
      }
    }

    // جلب معلومات الموقع الحالي والفئة من البيانات المضمنة
    const category = item.category
    const location = item.location

    // تحديد نوع الصرف بالعربية
    const issueTypeMap: Record<string, string> = {
      EQUIPMENT: '🔧 صيانة معدة',
      EMPLOYEE: '👤 تسليم لموظف',
      OTHER: '📦 أخرى',
    }

    const conditionMap: Record<string, { icon: string, nameAr: string }> = {
      new: { icon: '🆕', nameAr: 'جديد' },
      used: { icon: '♻️', nameAr: 'مستعمل' },
      refurbished: { icon: '🔄', nameAr: 'مجدد' },
      import: { icon: '📦', nameAr: 'استيراد' },
      general: { icon: '📦', nameAr: 'عام' },
    }

    const conditionInfo = conditionMap[data.selectedCondition] || conditionMap.general

    // بناء التقرير الاحترافي
    const now = new Date()
    const reportDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const reportTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })

    let report = `📊 ════════════════\n`
    report += `      🔴 **تقرير عملية صرف قطع غيار**\n`
    report += `════════════════ 📊\n\n`

    report += `📅 **التاريخ:** ${reportDate}\n`
    report += `🕐 **الوقت:** ${reportTime}\n`
    report += `🔢 **رقم الحركة:** \`${transactionNumber}\`\n\n`

    report += `━━━━━━━━━\n\n`

    // معلومات القطعة
    report += `📦 **بيانات قطعة الغيار:**\n\n`
    report += `   🏷️ **الاسم العربي:** ${item.nameAr}\n`
    if (item.nameEn) {
      report += `   🏷️ **الاسم الإنجليزي:** ${item.nameEn}\n`
    }
    report += `   🔤 **الكود:** \`${item.code}\`\n`
    if (item.barcode) {
      report += `   📸 **الباركود:** \`${item.barcode}\`\n`
    }
    if (category) {
      report += `   📂 **الفئة:** ${category.nameAr} (\`${category.code}\`)\n`
    }
    if (location) {
      report += `   📍 **موقع التخزين:** ${location.nameAr}\n`
    }
    if (item.description) {
      report += `   📝 **الوصف:** ${item.description}\n`
    }
    if (item.manufacturer) {
      report += `   🏭 **الشركة المصنعة:** ${item.manufacturer}\n`
    }
    if (item.partNumber) {
      report += `   #️⃣ **رقم الجزء:** ${item.partNumber}\n`
    }
    if (item.model) {
      report += `   🔧 **الموديل:** ${item.model}\n`
    }
    if (item.unit) {
      report += `   📏 **الوحدة:** ${item.unit}\n`
    }
    if (item.unitPrice && item.unitPrice > 0) {
      report += `   💰 **سعر الوحدة:** ${item.unitPrice.toFixed(2)} جنيه\n`
    }
    if (item.supplierName) {
      report += `   🏪 **المورد:** ${item.supplierName}\n`
    }

    report += `\n━━━━━━━━━━━━\n\n`

    // معلومات الصرف
    report += `🎯 **تفاصيل عملية الصرف:**\n\n`
    report += `   ${conditionInfo.icon} **حالة القطعة:** ${conditionInfo.nameAr}\n`
    report += `   📊 **الكمية قبل الصرف:** ${data.availableQuantity} ${item.unit || 'قطعة'}\n`
    report += `   ➖ **الكمية المصروفة:** ${data.quantity} ${item.unit || 'قطعة'}\n`
    report += `   📈 **الكمية المتبقية:** ${data.availableQuantity - data.quantity} ${item.unit || 'قطعة'}\n`
    report += `   🎯 **نوع الصرف:** ${issueTypeMap[data.issueType] || data.issueType}\n`

    // إضافة القيمة المالية للصرف إذا كان السعر متوفراً
    if (item.unitPrice && item.unitPrice > 0) {
      const totalValue = item.unitPrice * data.quantity
      report += `   💵 **قيمة الصرف:** ${totalValue.toFixed(2)} جنيه\n`
    }

    report += `\n━━━━━━━━━━\n\n`

    // معلومات إضافية حسب نوع الصرف
    if (equipmentInfo || projectInfo || employeeInfo || locationInfo) {
      report += `📋 **معلومات إضافية:**\n\n`
      if (equipmentInfo) {
        report += equipmentInfo
      }
      if (projectInfo) {
        report += projectInfo
      }
      if (employeeInfo) {
        report += employeeInfo
      }
      if (locationInfo) {
        report += locationInfo
      }
      report += `\n━━━━━━━━\n\n`
    }

    // الملاحظات
    if (data.notes) {
      report += `📝 **ملاحظات:**\n${data.notes}\n\n`
      report += `━━━━━━━━━━━━\n\n`
    }

    // معلومات من قام بالصرف
    report += `👤 **قام بالصرف:**\n\n`
    const issuerName = issuer?.fullName || issuer?.nickname || issuer?.username || 'مستخدم'
    report += `   ${issuerName}\n`
    if (ctx.from?.username) {
      report += `   \`@${ctx.from.username}\`\n`
    }

    report += `\n━━━━━━━━━━━━━━━━━━━━\n\n`

    // معلومات الكميات التفصيلية
    report += `📊 **توزيع المخزون الحالي:**\n\n`
    report += `   🆕 جديد: ${item.quantityNew || 0} ${item.unit || 'قطعة'}\n`
    report += `   ♻️ مستعمل: ${item.quantityUsed || 0} ${item.unit || 'قطعة'}\n`
    report += `   🔄 مجدد: ${item.quantityRefurbished || 0} ${item.unit || 'قطعة'}\n`
    report += `   📦 استيراد: ${item.quantityImport || 0} ${item.unit || 'قطعة'}\n\n`
    report += `   📦 **الإجمالي الحالي:** ${item.quantity || 0} ${item.unit || 'قطعة'}\n`

    // إضافة تنبيه إذا كانت الكمية أقل من الحد الأدنى
    if (item.minQuantity && item.quantity < item.minQuantity) {
      report += `\n   ⚠️ **تنبيه:** الكمية أقل من الحد الأدنى (${item.minQuantity})\n`
    }

    // إضافة معلومات القيمة الإجمالية
    if (item.totalValue && item.totalValue > 0) {
      report += `   💰 **القيمة الإجمالية للمخزون:** ${item.totalValue.toFixed(2)} جنيه\n`
    }

    report += `\n═════════\n`
    report += `      ✅ **انتهى التقرير**\n`
    report += `═══════════`

    // إعداد الأزرار للمستخدم
    const keyboard = new InlineKeyboard()
      .text('➕ عملية صرف جديدة', 'sp:trans:out')
      .row()
      .text('📋 القائمة الرئيسية', 'menu:back')

    // إرسال التقرير لجميع الأدمن (بما فيهم المستخدم الحالي)
    const currentUserId = ctx.from?.id
    const sendPromises = admins.map(async (admin) => {
      try {
        const isCurrentUser = Number(admin.telegramId) === currentUserId
        await ctx.api.sendMessage(Number(admin.telegramId), report, {
          parse_mode: 'Markdown',
          reply_markup: isCurrentUser ? keyboard : undefined,
        })
      }
      catch (error) {
        console.error(`Failed to send report to admin ${admin.telegramId}:`, error)
      }
    })

    await Promise.allSettled(sendPromises)
  }
  catch (error) {
    console.error('Error sending issue report to admins:', error)
  }
}

export default sparePartsTransactionsHandler
