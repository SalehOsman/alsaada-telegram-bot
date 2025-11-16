/**
 * Spare Parts Reports Handler
 * إدارة تقارير قطع الغيار
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sparePartsReportsHandler = new Composer<Context>()

console.error('🔵 ✅ sparePartsReportsHandler loaded and ready')

// ════════════════════════════════════════════════════════
// 1️⃣ ملخص المخزون
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:summary', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب إحصائيات المخزون
    const stats = await Database.prisma.iNV_SparePart.aggregate({
      _count: { id: true },
      _sum: {
        quantity: true,
        totalValue: true,
      },
    })

    // جلب عدد القطع المنخفضة
    const lowStockCount = await Database.prisma.iNV_SparePart.count({
      where: {
        quantity: {
          lte: Database.prisma.iNV_SparePart.fields.minQuantity,
        },
      },
    })

    let message = '📈 **ملخص المخزون**\n\n'
    message += `📦 **إجمالي الأصناف:** ${stats._count.id || 0} صنف\n`
    message += `🔢 **إجمالي القطع:** ${stats._sum.quantity || 0} قطعة\n`
    message += `💰 **القيمة الإجمالية:** ${(stats._sum.totalValue || 0).toFixed(2)} جنيه\n`
    message += `⚠️ **قطع منخفضة:** ${lowStockCount} صنف\n\n`

    // جلب أعلى 5 قطع قيمة
    const topValue = await Database.prisma.iNV_SparePart.findMany({
      take: 5,
      orderBy: {
        totalValue: 'desc',
      },
      select: {
        nameAr: true,
        totalValue: true,
      },
    })

    if (topValue.length > 0) {
      message += '💎 **أعلى 5 قطع قيمة:**\n\n'
      for (const item of topValue) {
        message += `• ${item.nameAr}: ${item.totalValue.toFixed(2)} ج\n`
      }
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 تحديث', 'sp:reports:summary')
      .row()
      .text('📤 تصدير Excel', 'sp:reports:export:summary')
      .row()
      .text('⬅️ رجوع', 'sp:reports:menu')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating summary report:', error)
    await ctx.editMessageText(
      '❌ **خطأ في توليد التقرير**\n\n'
      + 'حدث خطأ أثناء توليد ملخص المخزون.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// 2️⃣ تنبيهات النقص
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:alerts', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب القطع المنخفضة والمنتهية
    const lowStock = await Database.prisma.iNV_SparePart.findMany({
      where: {
        OR: [
          {
            quantity: {
              lte: Database.prisma.iNV_SparePart.fields.minQuantity,
            },
          },
          {
            quantity: {
              equals: 0,
            },
          },
        ],
      },
      orderBy: {
        quantity: 'asc',
      },
      include: {
        category: {
          select: {
            nameAr: true,
          },
        },
        location: {
          select: {
            nameAr: true,
          },
        },
      },
    })

    let message = '⚠️ **تنبيهات النقص**\n\n'

    if (lowStock.length === 0) {
      message += '✅ **جميع القطع في المستوى الطبيعي**\n\n'
      message += 'لا توجد قطع منخفضة أو منتهية.'
    }
    else {
      const outOfStock = lowStock.filter(item => item.quantity === 0)
      const belowMin = lowStock.filter(item => item.quantity > 0 && item.quantity <= item.minQuantity)

      if (outOfStock.length > 0) {
        message += `🔴 **منتهية من المخزن** (${outOfStock.length})\n\n`
        for (const item of outOfStock.slice(0, 5)) {
          message += `• ${item.nameAr}\n`
          message += `  الكود: ${item.code}\n`
          message += `  📍 ${item.location?.nameAr || '-'}\n\n`
        }
        if (outOfStock.length > 5) {
          message += `⚠️ وهناك ${outOfStock.length - 5} قطع أخرى منتهية\n\n`
        }
      }

      if (belowMin.length > 0) {
        message += `🟡 **أقل من الحد الأدنى** (${belowMin.length})\n\n`
        for (const item of belowMin.slice(0, 5)) {
          message += `• ${item.nameAr}\n`
          message += `  الكمية: ${item.quantity} / الحد الأدنى: ${item.minQuantity}\n`
          message += `  📍 ${item.location?.nameAr || '-'}\n\n`
        }
        if (belowMin.length > 5) {
          message += `⚠️ وهناك ${belowMin.length - 5} قطع أخرى منخفضة\n\n`
        }
      }
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 تحديث', 'sp:reports:alerts')
      .row()
      .text('📤 تصدير Excel', 'sp:reports:export:alerts')
      .row()
      .text('⬅️ رجوع', 'sp:reports:menu')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating alerts report:', error)
    await ctx.editMessageText(
      '❌ **خطأ في توليد التقرير**\n\n'
      + 'حدث خطأ أثناء جلب تنبيهات النقص.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// 3️⃣ تقرير القيمة المالية
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:value', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // إجمالي قيمة المخزون
    const totalValue = await Database.prisma.iNV_SparePart.aggregate({
      _sum: {
        totalValue: true,
      },
    })

    // قيمة حسب التصنيف
    const byCategory = await Database.prisma.iNV_EquipmentCategory.findMany({
      include: {
        _count: {
          select: {
            spareParts: true,
          },
        },
        spareParts: {
          select: {
            totalValue: true,
          },
        },
      },
      orderBy: {
        nameAr: 'asc',
      },
    })

    let message = '💰 **تقرير القيمة المالية**\n\n'
    message += `📊 **إجمالي قيمة المخزون:** ${(totalValue._sum.totalValue || 0).toFixed(2)} جنيه\n\n`

    if (byCategory.length > 0) {
      message += '📋 **التوزيع حسب التصنيف:**\n\n'

      for (const cat of byCategory) {
        const catValue = cat.spareParts.reduce((sum: number, item: { totalValue: number }) => sum + Number(item.totalValue), 0)
        const percentage = totalValue._sum.totalValue
          ? ((catValue / Number(totalValue._sum.totalValue)) * 100).toFixed(1)
          : '0.0'

        message += `${cat.icon} **${cat.nameAr}**\n`
        message += `  القيمة: ${catValue.toFixed(2)} ج (${percentage}%)\n`
        message += `  الأصناف: ${cat._count.spareParts}\n\n`
      }
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 تحديث', 'sp:reports:value')
      .row()
      .text('📤 تصدير Excel', 'sp:reports:export:value')
      .row()
      .text('⬅️ رجوع', 'sp:reports:menu')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating value report:', error)
    await ctx.editMessageText(
      '❌ **خطأ في توليد التقرير**\n\n'
      + 'حدث خطأ أثناء حساب القيمة المالية.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:menu'),
        parse_mode: 'Markdown',
      },
    )
  }
})

// ════════════════════════════════════════════════════════
// 4️⃣ حركات فترة معينة
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:period', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📅 آخر 7 أيام', 'sp:reports:period:7')
    .row()
    .text('📅 آخر 30 يوم', 'sp:reports:period:30')
    .row()
    .text('📅 آخر 90 يوم', 'sp:reports:period:90')
    .row()
    .text('📅 هذا الشهر', 'sp:reports:period:month')
    .row()
    .text('⬅️ رجوع', 'sp:reports:menu')

  await ctx.editMessageText(
    '📊 **تقرير حركات فترة معينة**\n\n'
    + '📋 **اختر الفترة:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// 5️⃣ تقرير حسب التصنيف
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:category', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const categories = await Database.prisma.iNV_EquipmentCategory.findMany({
      include: {
        _count: {
          select: {
            spareParts: true,
          },
        },
      },
      orderBy: {
        nameAr: 'asc',
      },
    })

    const keyboard = new InlineKeyboard()

    for (const cat of categories) {
      keyboard.text(
        `${cat.icon} ${cat.nameAr} (${cat._count.spareParts})`,
        `sp:reports:category:${cat.id}`,
      ).row()
    }

    keyboard.text('⬅️ رجوع', 'sp:reports:menu')

    await ctx.editMessageText(
      '🏷️ **تقرير حسب التصنيف**\n\n'
      + '📋 **اختر التصنيف:**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error loading categories:', error)
    await ctx.editMessageText(
      '❌ خطأ في جلب التصنيفات',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:menu'),
      },
    )
  }
})

// Handle selecting a specific category to show items and summary
sparePartsReportsHandler.callbackQuery(/^sp:reports:category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const categoryId = Number.parseInt(ctx.match![1], 10)

  try {
    const items = await Database.prisma.iNV_SparePart.findMany({
      where: { categoryId },
      orderBy: { code: 'asc' },
      take: 50,
    })

    let message = '🏷️ **تقرير التصنيف**\n\n'
    if (items.length === 0) {
      message += '❌ لا توجد قطع تحت هذا التصنيف.'
    }
    else {
      message += `📦 **عدد القطع:** ${items.length}\n\n`
      for (const it of items.slice(0, 30)) {
        message += `• ${it.nameAr} — ${it.quantity} — ${it.code}\n`
      }
    }

    await ctx.editMessageText(message, {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:category'),
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating category report:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في توليد التقرير', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 6️⃣ تقرير حسب الموقع
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:location', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const locations = await Database.prisma.iNV_StorageLocation.findMany({
      include: {
        _count: {
          select: {
            spareParts: true,
          },
        },
      },
      orderBy: {
        nameAr: 'asc',
      },
    })

    const keyboard = new InlineKeyboard()

    for (const loc of locations) {
      keyboard.text(
        `📍 ${loc.nameAr} (${loc._count.spareParts})`,
        `sp:reports:location:${loc.id}`,
      ).row()
    }

    keyboard.text('⬅️ رجوع', 'sp:reports:menu')

    await ctx.editMessageText(
      '📍 **تقرير حسب الموقع**\n\n'
      + '📋 **اختر الموقع:**',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error loading locations:', error)
    await ctx.editMessageText(
      '❌ خطأ في جلب المواقع',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:menu'),
      },
    )
  }
})

// Handle selecting a specific location to show items there
sparePartsReportsHandler.callbackQuery(/^sp:reports:location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const locationId = Number.parseInt(ctx.match![1], 10)

  try {
    const items = await Database.prisma.iNV_SparePart.findMany({
      where: { locationId },
      orderBy: { code: 'asc' },
      take: 50,
    })

    let message = '📍 **تقرير الموقع**\n\n'
    if (items.length === 0) {
      message += '❌ لا توجد قطع في هذا الموقع.'
    }
    else {
      message += `📦 **عدد القطع:** ${items.length}\n\n`
      for (const it of items.slice(0, 30)) {
        message += `• ${it.nameAr} — ${it.quantity} — ${it.code}\n`
      }
    }

    await ctx.editMessageText(message, {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:location'),
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating location report:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في توليد التقرير', show_alert: true })
  }
})

// ════════════════════════════════════════════════════════
// 7️⃣ تصدير Excel
// ════════════════════════════════════════════════════════
sparePartsReportsHandler.callbackQuery('sp:reports:export', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📊 جميع القطع', 'sp:reports:export:all')
    .row()
    .text('⚠️ القطع المنخفضة', 'sp:reports:export:alerts')
    .row()
    .text('💰 القيمة المالية', 'sp:reports:export:value')
    .row()
    .text('📋 سجل الحركات', 'sp:reports:export:transactions')
    .row()
    .text('⬅️ رجوع', 'sp:reports:menu')

  await ctx.editMessageText(
    '📤 **تصدير Excel**\n\n'
    + '📋 **اختر نوع التقرير للتصدير:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تصدير جميع القطع
sparePartsReportsHandler.callbackQuery('sp:reports:export:all', async (ctx) => {
  await ctx.answerCallbackQuery({
    text: '⚙️ جاري إنشاء ملف Excel... (قريباً)',
    show_alert: true,
  })
})

// Period report handlers (last 7/30/90 days, this month)
sparePartsReportsHandler.callbackQuery(/^sp:reports:period:(7|30|90|month)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const key = ctx.match![1]
  let fromDate: Date
  const now = new Date()

  if (key === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  else {
    const days = Number.parseInt(key, 10)
    fromDate = new Date(now)
    fromDate.setDate(now.getDate() - days)
  }

  try {
    const transactions = await Database.prisma.iNV_SparePartTransaction.findMany({
      where: { createdAt: { gte: fromDate } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { sparePart: { select: { nameAr: true, code: true } } },
    })

    let message = `📊 **تقرير الحركات منذ ${fromDate.toLocaleDateString('ar-EG')}**\n\n`
    if (transactions.length === 0) {
      message += '⚠️ لا توجد حركات في هذه الفترة.'
    }
    else {
      for (const t of transactions.slice(0, 50)) {
        message += `${t.transactionType} — ${t.sparePart?.nameAr || '-'} — ${t.quantity} — ${t.createdAt.toLocaleDateString('ar-EG')}\n`
      }
    }

    await ctx.editMessageText(message, {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:reports:period'),
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error generating period report:', error)
    await ctx.answerCallbackQuery({ text: '❌ خطأ في توليد التقرير', show_alert: true })
  }
})

// Small stubs for export actions that were missing
sparePartsReportsHandler.callbackQuery('sp:reports:export:alerts', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⚙️ جاري إنشاء ملف Excel للتنبيهات... (قريباً)', show_alert: true })
})

sparePartsReportsHandler.callbackQuery('sp:reports:export:value', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⚙️ جاري إنشاء ملف Excel لتقرير القيمة... (قريباً)', show_alert: true })
})

sparePartsReportsHandler.callbackQuery('sp:reports:export:transactions', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⚙️ جاري إنشاء ملف Excel لسجل الحركات... (قريباً)', show_alert: true })
})

export default sparePartsReportsHandler
