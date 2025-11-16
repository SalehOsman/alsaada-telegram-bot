/**
 * Spare Parts Settings Handler
 * إدارة التصنيفات والمواقع التخزينية لقطع الغيار
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sparePartsSettingsHandler = new Composer<Context>()

// ═══════════════════════════════════════════════════════
// 🏷️ إدارة التصنيفات
// ═══════════════════════════════════════════════════════

// القائمة الرئيسية للتصنيفات
sparePartsSettingsHandler.callbackQuery('sp:categories:menu', async (ctx) => {
  await ctx.answerCallbackQuery()

  const categories = await Database.prisma.iNV_EquipmentCategory.findMany({
    orderBy: { orderIndex: 'asc' },
  })

  const keyboard = new InlineKeyboard()
    .text('➕ إضافة تصنيف جديد', 'sp:categories:add:start')
    .row()

  if (categories.length > 0) {
    keyboard.text('📋 عرض جميع التصنيفات', 'sp:categories:list').row()
  }

  keyboard.text('⬅️ رجوع', 'sp:settings:menu')

  await ctx.editMessageText(
    '🏷️ **إدارة تصنيفات قطع الغيار**\n\n'
    + `📊 **عدد التصنيفات:** ${categories.length}\n\n`
    + '💡 **التصنيفات المتاحة:**\n'
    + '• سيارات 🚗\n'
    + '• لوادر 🚜\n'
    + '• حفارات 🏗️\n'
    + '• بلدوزر 🔶\n'
    + '• عام 🔧',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// بدء إضافة تصنيف جديد
sparePartsSettingsHandler.callbackQuery('sp:categories:add:start', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.inventoryForm = {
    action: 'add',
    step: 'awaiting_category_name_ar',
    data: { formType: 'category' },
  }

  await ctx.editMessageText(
    '➕ **إضافة تصنيف جديد**\n\n'
    + '✍️ **أدخل اسم التصنيف بالعربية:**\n\n'
    + '**مثال:** سيارات، لوادر، حفارات...\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:categories:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// معالج النصوص لإضافة تصنيف
sparePartsSettingsHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.action !== 'add' || state.data?.formType !== 'category') {
    return next()
  }

  const text = ctx.message.text.trim()

  try {
    // Step 1: Awaiting category name in Arabic
    if (state.step === 'awaiting_category_name_ar') {
      if (!text || text.length < 2) {
        await ctx.reply('❌ الرجاء إدخال اسم صحيح (حرفين على الأقل)')
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_category_code',
        data: { ...state.data, nameAr: text },
      }

      await ctx.reply(
        '✅ تم حفظ الاسم بالعربية\n\n'
        + '🔤 **الآن أدخل كود التصنيف (بالإنجليزية):**\n\n'
        + '**مثال:** CAR, LOADER, BULLDOZER, EXCAVATOR\n\n'
        + '💡 **هذا الكود سيُستخدم في توليد أكواد القطع تلقائياً**',
        { parse_mode: 'Markdown' },
      )
      return
    }

    // Step 2: Awaiting category code
    if (state.step === 'awaiting_category_code') {
      const code = text.toUpperCase()

      if (!/^[A-Z]{2,10}$/.test(code)) {
        await ctx.reply(
          '❌ الكود يجب أن يكون:\n'
          + '• حروف إنجليزية فقط\n'
          + '• من 2 إلى 10 أحرف\n'
          + '• بدون مسافات أو رموز\n\n'
          + '**مثال:** CAR, LOADER',
        )
        return
      }

      // Check if code already exists
      const existing = await Database.prisma.iNV_EquipmentCategory.findUnique({
        where: { code },
      })

      if (existing) {
        await ctx.reply(
          `⚠️ يوجد بالفعل تصنيف بهذا الكود:\n• ${existing.nameAr}\n\nالرجاء إدخال كود آخر:`,
        )
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_category_icon',
        data: { ...state.data, code },
      }

      await ctx.reply(
        '✅ تم حفظ الكود\n\n'
        + '🎨 **الآن أدخل الأيقونة (اختياري):**\n\n'
        + '**أمثلة:** 🚗 🚜 🏗️ 🔧 🔶\n\n'
        + 'أو اضغط /skip للتخطي',
        { parse_mode: 'Markdown' },
      )
      return
    }

    // Step 3: Awaiting icon (optional)
    if (state.step === 'awaiting_category_icon') {
      let icon: string | undefined

      if (text === '/skip') {
        icon = '📦' // Default icon
      }
      else {
        icon = text
      }

      const data = state.data

      // Get the next order index
      const lastCategory = await Database.prisma.iNV_EquipmentCategory.findFirst({
        orderBy: { orderIndex: 'desc' },
      })
      const nextOrderIndex = (lastCategory?.orderIndex || 0) + 1

      // Create category
      await Database.prisma.iNV_EquipmentCategory.create({
        data: {
          code: data.code!,
          nameAr: data.nameAr!,
          icon,
          orderIndex: nextOrderIndex,
          isActive: true,
          createdBy: BigInt(ctx.from?.id || 0),
        },
      })

      ctx.session.inventoryForm = undefined

      const keyboard = new InlineKeyboard()
        .text('➕ إضافة تصنيف آخر', 'sp:categories:add:start')
        .row()
        .text('📋 عرض التصنيفات', 'sp:categories:list')
        .row()
        .text('⬅️ رجوع', 'sp:categories:menu')

      await ctx.reply(
        '✅ **تم إضافة التصنيف بنجاح!**\n\n'
        + `${icon} **${data.nameAr}**\n`
        + `🔤 **الكود:** \`${data.code}\`\n\n`
        + '💡 الآن يمكنك استخدام هذا التصنيف عند إضافة قطع جديدة',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
  }
  catch (error) {
    console.error('Error in category creation:', error)
    await ctx.reply('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
    ctx.session.inventoryForm = undefined
  }
})

// عرض جميع التصنيفات
sparePartsSettingsHandler.callbackQuery('sp:categories:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const categories = await Database.prisma.iNV_EquipmentCategory.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: {
        select: { spareParts: true },
      },
    },
  })

  if (categories.length === 0) {
    await ctx.editMessageText(
      '❌ **لا توجد تصنيفات**\n\n'
      + 'لم يتم إضافة أي تصنيفات بعد.',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة تصنيف', 'sp:categories:add:start')
          .row()
          .text('⬅️ رجوع', 'sp:categories:menu'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  let message = '📋 **قائمة التصنيفات**\n\n'
  for (const cat of categories) {
    const status = cat.isActive ? '🟢' : '🔴'
    const count = cat._count.spareParts
    message += `${status} ${cat.icon || '📦'} **${cat.nameAr}**\n`
    message += `   └ الكود: \`${cat.code}\` | القطع: ${count}\n\n`
  }

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:categories:menu'),
    parse_mode: 'Markdown',
  })
})

// ═══════════════════════════════════════════════════════
// 📍 إدارة المواقع التخزينية
// ═══════════════════════════════════════════════════════

// القائمة الرئيسية للمواقع
sparePartsSettingsHandler.callbackQuery('sp:locations:menu', async (ctx) => {
  await ctx.answerCallbackQuery()

  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    orderBy: { orderIndex: 'asc' },
  })

  const keyboard = new InlineKeyboard()
    .text('➕ إضافة موقع جديد', 'sp:locations:add:start')
    .row()

  if (locations.length > 0) {
    keyboard.text('📋 عرض جميع المواقع', 'sp:locations:list').row()
  }

  keyboard.text('⬅️ رجوع', 'sp:settings:menu')

  await ctx.editMessageText(
    '📍 **إدارة مواقع التخزين**\n\n'
    + `📊 **عدد المواقع:** ${locations.length}\n\n`
    + '💡 **أنواع المواقع المتاحة:**\n'
    + '• كرستر (Container)\n'
    + '• رف (Shelf)\n'
    + '• كرفان (Rack)\n'
    + '• غرفة (Room)\n'
    + '• مخزن رئيسي',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// بدء إضافة موقع جديد
sparePartsSettingsHandler.callbackQuery('sp:locations:add:start', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.inventoryForm = {
    action: 'add',
    step: 'awaiting_location_name_ar',
    data: { formType: 'location' },
  }

  await ctx.editMessageText(
    '➕ **إضافة موقع تخزين جديد**\n\n'
    + '✍️ **أدخل اسم الموقع بالعربية:**\n\n'
    + '**مثال:**\n'
    + '• كرستر رقم 1 - كرفان العاملين\n'
    + '• رف A1 - المخزن الرئيسي\n'
    + '• كرفان قطع الغيار\n\n'
    + '⏳ **في انتظار الإدخال...**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'sp:locations:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// معالج النصوص لإضافة موقع
sparePartsSettingsHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.action !== 'add' || state.data?.formType !== 'location') {
    return next()
  }

  const text = ctx.message.text.trim()

  try {
    // Step 1: Awaiting location name in Arabic
    if (state.step === 'awaiting_location_name_ar') {
      if (!text || text.length < 2) {
        await ctx.reply('❌ الرجاء إدخال اسم صحيح (حرفين على الأقل)')
        return
      }

      ctx.session.inventoryForm = {
        ...state,
        step: 'awaiting_location_code',
        data: { ...state.data, nameAr: text },
      }

      await ctx.reply(
        '✅ تم حفظ الاسم بالعربية\n\n'
        + '🔤 **الآن أدخل كود الموقع:**\n\n'
        + '**أمثلة:**\n'
        + '• CONT-1 (كرستر 1)\n'
        + '• SHELF-A1 (رف A1)\n'
        + '• RACK-5 (كرفان 5)\n\n'
        + '💡 **الكود يجب أن يكون فريداً**',
        { parse_mode: 'Markdown' },
      )
      return
    }

    // Step 2: Awaiting location code
    if (state.step === 'awaiting_location_code') {
      const code = text.toUpperCase()

      if (!/^[A-Z0-9-]{2,20}$/.test(code)) {
        await ctx.reply(
          '❌ الكود يجب أن يكون:\n'
          + '• حروف إنجليزية وأرقام فقط\n'
          + '• يمكن استخدام الشرطة -\n'
          + '• من 2 إلى 20 حرف\n\n'
          + '**مثال:** CONT-1, SHELF-A1',
        )
        return
      }

      // Check if code already exists
      const existing = await Database.prisma.iNV_StorageLocation.findUnique({
        where: { code },
      })

      if (existing) {
        await ctx.reply(
          `⚠️ يوجد بالفعل موقع بهذا الكود:\n• ${existing.nameAr}\n\nالرجاء إدخال كود آخر:`,
        )
        return
      }

      const data = state.data

      // Get the next order index
      const lastLocation = await Database.prisma.iNV_StorageLocation.findFirst({
        orderBy: { orderIndex: 'desc' },
      })
      const nextOrderIndex = (lastLocation?.orderIndex || 0) + 1

      // Create location
      await Database.prisma.iNV_StorageLocation.create({
        data: {
          code,
          nameAr: data.nameAr!,
          locationType: 'SHELF', // Default type
          orderIndex: nextOrderIndex,
          isActive: true,
          createdBy: BigInt(ctx.from?.id || 0),
        },
      })

      ctx.session.inventoryForm = undefined

      const keyboard = new InlineKeyboard()
        .text('➕ إضافة موقع آخر', 'sp:locations:add:start')
        .row()
        .text('📋 عرض المواقع', 'sp:locations:list')
        .row()
        .text('⬅️ رجوع', 'sp:locations:menu')

      await ctx.reply(
        '✅ **تم إضافة موقع التخزين بنجاح!**\n\n'
        + `📍 **${data.nameAr}**\n`
        + `🔤 **الكود:** \`${code}\`\n\n`
        + '💡 الآن يمكنك تخزين القطع في هذا الموقع',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
  }
  catch (error) {
    console.error('Error in location creation:', error)
    await ctx.reply('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
    ctx.session.inventoryForm = undefined
  }
})

// عرض جميع المواقع
sparePartsSettingsHandler.callbackQuery('sp:locations:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const locations = await Database.prisma.iNV_StorageLocation.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: {
        select: { spareParts: true },
      },
    },
  })

  if (locations.length === 0) {
    await ctx.editMessageText(
      '❌ **لا توجد مواقع**\n\n'
      + 'لم يتم إضافة أي مواقع تخزين بعد.',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة موقع', 'sp:locations:add:start')
          .row()
          .text('⬅️ رجوع', 'sp:locations:menu'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  let message = '📋 **قائمة مواقع التخزين**\n\n'
  for (const loc of locations) {
    const status = loc.isActive ? '🟢' : '🔴'
    const count = loc._count.spareParts
    message += `${status} 📍 **${loc.nameAr}**\n`
    message += `   └ الكود: \`${loc.code}\` | القطع: ${count}\n\n`
  }

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'sp:locations:menu'),
    parse_mode: 'Markdown',
  })
})

// ═══════════════════════════════════════════════════════
// ⚙️ القائمة الرئيسية للإعدادات
// ═══════════════════════════════════════════════════════
sparePartsSettingsHandler.callbackQuery('sp:settings:menu', async (ctx) => {
  await ctx.answerCallbackQuery()

  await ctx.editMessageText(
    '⚙️ **إعدادات قطع الغيار**\n\n'
    + '📋 **الإعدادات المتاحة:**\n\n'
    + '🏷️ **إدارة التصنيفات**\n'
    + '└ سيارات، لوادر، حفارات...\n\n'
    + '📍 **إدارة المواقع**\n'
    + '└ كرستر، رف، مخزن رئيسي...',
    {
      reply_markup: new InlineKeyboard()
        .text('🏷️ إدارة التصنيفات', 'sp:categories:menu')
        .row()
        .text('📍 إدارة المواقع', 'sp:locations:menu')
        .row()
        .text('⬅️ رجوع', 'menu:sub:inventory-management:spare_parts'),
      parse_mode: 'Markdown',
    },
  )
})
