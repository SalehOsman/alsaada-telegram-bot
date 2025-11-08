/**
 * Dispensing Handler
 * معالج الصرف للمعدات
 */

import type { Context } from '../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../../modules/database/index.js'
import { createStockTransaction } from '../../services/stock-trx.service.js'
import { InventoryBarcodeService } from '../../services/inventory-barcode.service.js'
import { logger } from '../../../../../modules/services/logger/index.js'

export const dispensingHandler = new Composer<Context>()

/**
 * زر "صرف للمعدات" في قائمة المخزن
 */
dispensingHandler.callbackQuery(/^inv:warehouse:(\d+):dispense$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
    return
  }

  const warehouse = await Database.prisma.warehouse.findUnique({
    where: { id: warehouseId },
  })

  if (!warehouse) {
    await ctx.answerCallbackQuery('❌ المخزن غير موجود')
    return
  }

  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.dispensing = {
    warehouseId,
    step: 'select_method',
  }

  const keyboard = new InlineKeyboard()
    .text('📱 مسح باركود', `inv:warehouse:${warehouseId}:scan`)
    .row()
    .text('🔍 بحث عن منتج', `inv:warehouse:${warehouseId}:dispense:search`)
    .row()
    .text('⌨️ إدخال SKU', `inv:warehouse:${warehouseId}:dispense:manual`)
    .row()
    .text('📋 قائمة الأصناف', `inv:warehouse:${warehouseId}:items`)
    .row()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  await ctx.editMessageText(
    `📤 **صرف للمعدات**\n\n` +
    `📦 المخزن: ${warehouse.name}\n\n` +
    `اختر طريقة اختيار المنتج:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * بدء عملية الصرف بعد اختيار المنتج
 */
dispensingHandler.callbackQuery(/^inv:dispensing:add-item:(\d+):(\d+)$/, async (ctx) => {
  const itemId = parseInt(ctx.match[1])
  const warehouseId = parseInt(ctx.match[2])
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
    return
  }

  // جلب الصنف والرصيد
  const item = await Database.prisma.item.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      stocks: {
        where: { warehouseId },
        include: { warehouse: true },
      },
    },
  })

  if (!item) {
    await ctx.answerCallbackQuery('❌ الصنف غير موجود')
    return
  }

  const stock = item.stocks[0]

  if (!stock || stock.quantity <= 0) {
    await ctx.answerCallbackQuery({ text: '⚠️ لا يوجد رصيد متاح', show_alert: true })
    return
  }

  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.dispensing = {
    warehouseId,
    itemId,
    step: 'select_equipment',
    stockId: stock.id,
    availableQuantity: stock.quantity,
  }

  // جلب قائمة المعدات
  const equipment = await Database.prisma.equipment.findMany({
    where: { isActive: true },
    take: 20,
    orderBy: { nameAr: 'asc' },
  })

  if (equipment.length === 0) {
    await ctx.reply('❌ لا توجد معدات متاحة')
    return
  }

  const keyboard = new InlineKeyboard()

  // عرض المعدات (حد أقصى 10)
  equipment.slice(0, 10).forEach(eq => {
    keyboard.text(eq.nameAr, `inv:dispensing:equipment:${itemId}:${warehouseId}:${eq.id}`)
    keyboard.row()
  })

  if (equipment.length > 10) {
    keyboard.text('📋 عرض المزيد', `inv:dispensing:equipment:more:${itemId}:${warehouseId}`)
    keyboard.row()
  }

  keyboard.text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  // عرض معلومات الصنف مع الصورة إن وجدت
  let message = `📦 **${item.name}**\n\n`
  
  if (item.imageUrl || item.imagePath) {
    // إرسال الصورة إذا كانت موجودة
    try {
      const imagePath = item.imagePath || item.imageUrl
      if (imagePath) {
        // محاولة إرسال الصورة
        // TODO: إرسال الصورة من المسار
      }
    } catch (error) {
      logger.error({ error }, 'Error sending item image')
    }
  }

  message += `🏷️ **SKU:** \`${item.sku}\`\n`
  message += `📊 **الفئة:** ${item.category.name}\n`
  message += `📏 **الوحدة:** ${item.unit}\n`
  message += `📦 **الرصيد المتاح:** ${stock.quantity} ${item.unit}\n`
  message += `💰 **التكلفة:** ${stock.averageCost.toFixed(2)} جنيه/${item.unit}\n\n`
  message += `🔧 **اختر المعدة:**`

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

/**
 * اختيار المعدة
 */
dispensingHandler.callbackQuery(/^inv:dispensing:equipment:(\d+):(\d+):(\d+)$/, async (ctx) => {
  const itemId = parseInt(ctx.match[1])
  const warehouseId = parseInt(ctx.match[2])
  const equipmentId = parseInt(ctx.match[3])
  await ctx.answerCallbackQuery()

  if (!ctx.session?.dispensing) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  const equipment = await Database.prisma.equipment.findUnique({
    where: { id: equipmentId },
  })

  if (!equipment) {
    await ctx.answerCallbackQuery('❌ المعدة غير موجودة')
    return
  }

  // تحديث الحالة
  ctx.session.dispensing.equipmentId = equipmentId
  ctx.session.dispensing.equipmentName = equipment.nameAr
  ctx.session.dispensing.step = 'enter_quantity'

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  await ctx.editMessageText(
    `🔧 **المعدة:** ${equipment.nameAr}\n\n` +
    `📦 **الرصيد المتاح:** ${ctx.session.dispensing.availableQuantity} ${ctx.session.dispensing.unit || 'قطعة'}\n\n` +
    `📝 **أدخل الكمية المراد صرفها:**`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * معالج إدخال الكمية
 */
dispensingHandler.on('message:text', async (ctx) => {
  if (!ctx.session?.dispensing || ctx.session.dispensing.step !== 'enter_quantity') {
    return
  }

  const quantity = parseFloat(ctx.message.text.trim())

  if (isNaN(quantity) || quantity <= 0) {
    await ctx.reply('❌ الكمية غير صحيحة. يرجى إدخال رقم صحيح.')
    return
  }

  if (!ctx.session.dispensing?.availableQuantity || quantity > ctx.session.dispensing.availableQuantity) {
    await ctx.reply(
      `❌ **الكمية غير متاحة**\n\n` +
      `الرصيد المتاح: ${ctx.session.dispensing?.availableQuantity || 0}\n` +
      `الكمية المطلوبة: ${quantity}`,
      { parse_mode: 'Markdown' },
    )
    return
  }

  // تحديث الحالة
  ctx.session.dispensing.quantity = quantity
  ctx.session.dispensing.step = 'select_project'

  // جلب قائمة المشاريع
  const projects = await Database.prisma.project.findMany({
    where: { isActive: true },
    take: 10,
    orderBy: { name: 'asc' },
  })

  if (!ctx.session.dispensing) {
    await ctx.reply('❌ انتهت الجلسة')
    return
  }

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي (بدون مشروع)', `inv:dispensing:confirm:${ctx.session.dispensing.itemId}:${ctx.session.dispensing.warehouseId}`)
    .row()

  projects.forEach(project => {
    keyboard.text(project.name, `inv:dispensing:project:${ctx.session.dispensing!.itemId}:${ctx.session.dispensing!.warehouseId}:${project.id}`)
    keyboard.row()
  })

  keyboard.text('❌ إلغاء', `inv:warehouse:${ctx.session.dispensing.warehouseId}`)

  await ctx.reply(
    `✅ **الكمية:** ${quantity}\n\n` +
    `🔧 **المعدة:** ${ctx.session.dispensing.equipmentName || 'غير محدد'}\n\n` +
    `📋 **اختر المشروع (اختياري):**`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * تأكيد الصرف (دالة مساعدة)
 */
async function confirmDispensing(ctx: Context, itemId: number, warehouseId: number) {
  if (!ctx.session?.dispensing) {
    await ctx.answerCallbackQuery?.('❌ انتهت الجلسة')
    return
  }

  const state = ctx.session.dispensing

  try {
    // إنشاء الحركة
    const result = await createStockTransaction({
      stockId: state.stockId!,
      type: 'CONSUMPTION_OUT',
      quantity: -state.quantity!,
      notes: `صرف للمعدة: ${state.equipmentName || 'غير محدد'}`,
    })

    // ربط الحركة بالمعدة والموظف والمشروع
    if (state.equipmentId || ctx.dbUser?.userId || state.projectId) {
      await Database.prisma.transactionLink.create({
        data: {
          stockTransactionId: result.transaction.id,
          equipmentId: state.equipmentId,
          employeeId: ctx.dbUser?.userId,
          projectId: state.projectId,
        },
      })
    }

    // جلب بيانات الصنف
    const item = await Database.prisma.item.findUnique({
      where: { id: itemId },
    })

    await ctx.answerCallbackQuery?.({ text: '✅ تم الصرف بنجاح', show_alert: true })

    let message = `✅ **تم الصرف بنجاح**\n\n`
    message += `📦 **الصنف:** ${item?.name}\n`
    message += `📊 **الكمية:** ${state.quantity} ${item?.unit}\n`
    message += `🔧 **المعدة:** ${state.equipmentName || 'غير محدد'}\n`
    if (state.projectName) {
      message += `📋 **المشروع:** ${state.projectName}\n`
    }
    message += `💰 **التكلفة:** ${result.stock.averageCost * state.quantity!} جنيه\n\n`
    message += `📦 **الرصيد المتبقي:** ${result.stock.quantity} ${item?.unit}`

    const keyboard = new InlineKeyboard()
      .text('📤 صرف آخر', `inv:warehouse:${warehouseId}:dispense`)
      .row()
      .text('⬅️ رجوع', `inv:warehouse:${warehouseId}`)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // مسح الحالة
    delete ctx.session.dispensing
  } catch (error) {
    logger.error({ error }, 'Error processing dispensing')
    await ctx.answerCallbackQuery?.({ text: '❌ حدث خطأ أثناء الصرف', show_alert: true })
  }
}

/**
 * تأكيد الصرف (callback handler)
 */
dispensingHandler.callbackQuery(/^inv:dispensing:confirm:(\d+):(\d+)$/, async (ctx) => {
  const itemId = parseInt(ctx.match[1])
  const warehouseId = parseInt(ctx.match[2])
  await ctx.answerCallbackQuery()
  await confirmDispensing(ctx, itemId, warehouseId)
})

/**
 * اختيار المشروع
 */
dispensingHandler.callbackQuery(/^inv:dispensing:project:(\d+):(\d+):(\d+)$/, async (ctx) => {
  const itemId = parseInt(ctx.match[1])
  const warehouseId = parseInt(ctx.match[2])
  const projectId = parseInt(ctx.match[3])
  await ctx.answerCallbackQuery()

  if (!ctx.session?.dispensing) {
    await ctx.answerCallbackQuery('❌ انتهت الجلسة')
    return
  }

  const project = await Database.prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    await ctx.answerCallbackQuery('❌ المشروع غير موجود')
    return
  }

  // تحديث الحالة
  ctx.session.dispensing.projectId = projectId
  ctx.session.dispensing.projectName = project.name

  // تأكيد الصرف مباشرة
  await confirmDispensing(ctx, itemId, warehouseId)
})

/**
 * إعداد مسح الباركود للصرف
 */
dispensingHandler.callbackQuery(/^inv:warehouse:(\d+):dispense:scan$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  ctx.session = ctx.session || {}
  ctx.session.barcodeScan = {
    action: 'dispensing',
    warehouseId,
  }

  const keyboard = new InlineKeyboard()
    .text('⌨️ إدخال يدوي', `inv:warehouse:${warehouseId}:dispense:manual`)
    .row()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}:dispense`)

  await ctx.editMessageText(
    '📱 **مسح الباركود للصرف**\n\n' +
    '📸 أرسل صورة الباركود الآن',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * إدخال SKU يدوي للصرف
 */
dispensingHandler.callbackQuery(/^inv:warehouse:(\d+):dispense:manual$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  ctx.session = ctx.session || {}
  ctx.session.waitingForSku = {
    warehouseId,
    action: 'dispensing',
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', `inv:warehouse:${warehouseId}:dispense`)

  await ctx.editMessageText(
    '⌨️ **إدخال SKU يدوياً**\n\n' +
    '📝 أرسل رقم الباركود (SKU) الآن:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * معالج إدخال SKU يدوياً
 */
dispensingHandler.on('message:text', async (ctx) => {
  if (!ctx.session?.waitingForSku || ctx.session.waitingForSku.action !== 'dispensing') {
    return
  }

  const sku = ctx.message.text.trim()
  const warehouseId = ctx.session.waitingForSku.warehouseId

  // البحث عن الصنف
  const itemData = await InventoryBarcodeService.findItemByBarcode(sku)

  if (!itemData) {
    await ctx.reply('❌ الصنف غير موجود. حاول مرة أخرى أو أرسل "إلغاء"')
    return
  }

  // بدء عملية الصرف - استدعاء الدالة مباشرة
  const itemId = itemData.item.id
  const item = await Database.prisma.item.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      stocks: {
        where: { warehouseId },
        include: { warehouse: true },
      },
    },
  })

  if (!item) {
    await ctx.reply('❌ الصنف غير موجود')
    return
  }

  const stock = item.stocks[0]

  if (!stock || stock.quantity <= 0) {
    await ctx.reply('⚠️ لا يوجد رصيد متاح')
    return
  }

  // حفظ الحالة
  ctx.session = ctx.session || {}
  ctx.session.dispensing = {
    warehouseId,
    itemId,
    step: 'select_equipment',
    stockId: stock.id,
    availableQuantity: stock.quantity,
    unit: item.unit,
  }

  // جلب قائمة المعدات
  const equipment = await Database.prisma.equipment.findMany({
    where: { isActive: true },
    take: 20,
    orderBy: { nameAr: 'asc' },
  })

  if (equipment.length === 0) {
    await ctx.reply('❌ لا توجد معدات متاحة')
    return
  }

  const keyboard = new InlineKeyboard()

  equipment.slice(0, 10).forEach(eq => {
    keyboard.text(eq.nameAr, `inv:dispensing:equipment:${itemId}:${warehouseId}:${eq.id}`)
    keyboard.row()
  })

  keyboard.text('❌ إلغاء', `inv:warehouse:${warehouseId}`)

  let message = `📦 **${item.name}**\n\n`
  message += `🏷️ **SKU:** \`${item.sku}\`\n`
  message += `📊 **الفئة:** ${item.category.name}\n`
  message += `📏 **الوحدة:** ${item.unit}\n`
  message += `📦 **الرصيد المتاح:** ${stock.quantity} ${item.unit}\n`
  message += `💰 **التكلفة:** ${stock.averageCost.toFixed(2)} جنيه/${item.unit}\n\n`
  message += `🔧 **اختر المعدة:**`

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })

  delete ctx.session.waitingForSku
})

