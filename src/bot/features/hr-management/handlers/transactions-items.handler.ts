import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { isPositiveNumber } from '../../../../modules/input/validators/index.js'

export const transactionsItemsHandler = new Composer<Context>()

// تخزين بيانات النموذج
interface ItemFormData {
  step: string
  nameAr?: string
  nameEn?: string
  price?: number
  unit?: string
  description?: string
  category?: string
  editingItemId?: number
  messageIds?: number[] // لحذف الرسائل بعد الانتهاء
}

const itemFormData = new Map<number, ItemFormData>()

// ============================================
// 📋 عرض قائمة الأصناف العينية
// ============================================
transactionsItemsHandler.callbackQuery('hr:transactions:items', async (ctx) => {
  await ctx.answerCallbackQuery()

  // التحقق من صلاحية السوبر أدمين
  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه الوظيفة متاحة للسوبر أدمين فقط',
      show_alert: true,
    })
    return
  }

  await showItemsList(ctx)
})

async function showItemsList(ctx: Context, page = 1) {
  const pageSize = 10
  const offset = (page - 1) * pageSize

  const items = await Database.prisma.hR_AdvanceItem.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: 'asc' }, { nameAr: 'asc' }],
    skip: offset,
    take: pageSize + 1,
  })

  const hasMore = items.length > pageSize
  const displayItems = hasMore ? items.slice(0, pageSize) : items

  const keyboard = new InlineKeyboard()
    .text('➕ إضافة صنف جديد', 'hr:transactions:items:add')
    .row()

  if (displayItems.length === 0) {
    keyboard.text('⬅️ رجوع', 'advancesHandler')
  }
  else {
    displayItems.forEach((item) => {
      keyboard
        .text(`${item.nameAr} (${item.price} ج)`, `hr:transactions:items:view:${item.id}`)
        .row()
    })

    // أزرار التنقل بين الصفحات
    const navRow: any[] = []
    if (page > 1) {
      navRow.push(InlineKeyboard.text('⬅️ السابق', `hr:transactions:items:page:${page - 1}`))
    }
    if (hasMore) {
      navRow.push(InlineKeyboard.text('➡️ التالي', `hr:transactions:items:page:${page + 1}`))
    }
    if (navRow.length > 0) {
      keyboard.row(...navRow)
    }

    keyboard.text('⬅️ رجوع', 'advancesHandler')
  }

  let message = '📦 **إدارة الأصناف العينية**\n\n'
  if (displayItems.length === 0) {
    message += 'لا توجد أصناف مسجلة حالياً.\n\n'
    message += 'قم بإضافة أصناف جديدة لبدء استخدام المسحوبات العينية.'
  }
  else {
    message += `عدد الأصناف: ${displayItems.length}\n\n`
    message += 'اختر صنفاً لعرض تفاصيله أو تعديله.'
  }

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// ============================================
// 📄 عرض تفاصيل صنف
// ============================================
transactionsItemsHandler.callbackQuery(/^hr:transactions:items:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1])
  const item = await Database.prisma.hR_AdvanceItem.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({
      text: '❌ الصنف غير موجود',
      show_alert: true,
    })
    return
  }

  const keyboard = new InlineKeyboard()
    .text('✏️ تعديل', `hr:transactions:items:edit:${item.id}`)
    .text('🗑️ حذف', `hr:transactions:items:delete:${item.id}`)
    .row()
    .text('⬅️ رجوع', 'hr:transactions:items')

  let message = `📦 **تفاصيل الصنف**\n\n`
  message += `**الاسم بالعربية:** ${item.nameAr}\n`
  if (item.nameEn) {
    message += `**الاسم بالإنجليزية:** ${item.nameEn}\n`
  }
  message += `**الكود:** ${item.code}\n`
  message += `**السعر:** ${item.price} جنيه\n`
  message += `**الوحدة:** ${item.unit}\n`
  if (item.category) {
    message += `**الفئة:** ${item.category}\n`
  }
  if (item.description) {
    message += `**الوصف:** ${item.description}\n`
  }

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// ============================================
// ➕ إضافة صنف جديد
// ============================================
transactionsItemsHandler.callbackQuery('hr:transactions:items:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  itemFormData.set(userId, { step: 'nameAr', messageIds: [] })

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'hr:transactions:items')

  await ctx.editMessageText(
    '➕ **إضافة صنف عيني جديد**\n\n'
    + '📝 أدخل اسم الصنف بالعربية:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// معالجة إدخال اسم الصنف بالعربية
transactionsItemsHandler.on('message:text', async (ctx, next) => {
  ctx.logger.info('📦 Items handler: message received')
  const userId = ctx.from?.id
  if (!userId) {
    ctx.logger.info('📦 Items handler: no userId')
    return next()
  }

  const data = itemFormData.get(userId)
  ctx.logger.info({ userId, hasData: !!data }, '📦 Items handler: checking form data')
  if (!data) {
    ctx.logger.info('📦 Items handler: no form data, passing to next')
    return next()
  }

  const text = ctx.message.text.trim()

  try {
    // حذف رسالة المستخدم
    try {
      await ctx.deleteMessage()
    }
    catch {
      // تجاهل الخطأ
    }

    if (data.step === 'nameAr') {
      if (text.length < 2 || text.length > 100) {
        const errorMsg = await ctx.reply('❌ اسم الصنف يجب أن يكون بين 2 و 100 حرف.')
        data.messageIds!.push(errorMsg.message_id)
        return
      }

      data.nameAr = text
      data.step = 'price'

      const keyboard = new InlineKeyboard()
        .text('❌ إلغاء', 'hr:transactions:items')

      const msg = await ctx.reply(
        '💵 أدخل سعر الوحدة بالجنيه:',
        { reply_markup: keyboard },
      )
      data.messageIds!.push(msg.message_id)
    }
    else if (data.step === 'price') {
      const price = Number.parseFloat(text)
      if (!isPositiveNumber(text) || price <= 0) {
        const errorMsg = await ctx.reply('❌ السعر يجب أن يكون رقماً موجباً.')
        data.messageIds!.push(errorMsg.message_id)
        return
      }

      data.price = price
      data.step = 'unit'

      const keyboard = new InlineKeyboard()
        .text('علبة', 'hr:transactions:items:unit:علبة')
        .text('كرتونة', 'hr:transactions:items:unit:كرتونة')
        .row()
        .text('وحدة', 'hr:transactions:items:unit:وحدة')
        .text('قطعة', 'hr:transactions:items:unit:قطعة')
        .row()
        .text('❌ إلغاء', 'hr:transactions:items')

      const msg = await ctx.reply(
        '📦 اختر الوحدة أو أدخل وحدة مخصصة:',
        { reply_markup: keyboard },
      )
      data.messageIds!.push(msg.message_id)
    }
    else if (data.step === 'unit') {
      if (text.length < 1 || text.length > 20) {
        const errorMsg = await ctx.reply('❌ الوحدة يجب أن تكون بين 1 و 20 حرف.')
        data.messageIds!.push(errorMsg.message_id)
        return
      }

      data.unit = text
      await saveNewItem(ctx, data)
    }
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error in item form')
    await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.')
    itemFormData.delete(userId)
  }
})

// اختيار الوحدة من الأزرار
transactionsItemsHandler.callbackQuery(/^hr:transactions:items:unit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = itemFormData.get(userId)
  if (!data || data.step !== 'unit')
    return

  const unit = ctx.match![1]
  data.unit = unit

  await saveNewItem(ctx, data)
})

async function saveNewItem(ctx: Context, data: ItemFormData) {
  const userId = ctx.from?.id
  if (!userId)
    return

  try {
    // حذف جميع رسائل التدفق
    for (const msgId of data.messageIds || []) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId)
      }
      catch {
        // تجاهل الأخطاء
      }
    }

    // توليد كود فريد
    const code = `ITEM_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`

    const newItem = await Database.prisma.hR_AdvanceItem.create({
      data: {
        nameAr: data.nameAr!,
        code,
        price: data.price!,
        unit: data.unit!,
        createdBy: userId,
      },
    })

    itemFormData.delete(userId)

    // إعداد التقرير النهائي
    const now = new Date()
    const currentUser = await Database.prisma.user.findUnique({
      where: { telegramId: userId },
      select: { username: true },
    })

    const finalReport = [
      '✅ **تم إضافة صنف عيني جديد بنجاح!**\n',
      `📦 **الصنف:** ${newItem.nameAr}`,
      `🔢 **الكود:** ${newItem.code}`,
      `💵 **السعر:** ${newItem.price} جنيه/${newItem.unit}`,
      `📅 **التاريخ:** ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      `⏰ **الوقت:** ${now.toLocaleTimeString('ar-EG')}\n`,
      `👤 **تم الإضافة بواسطة:** ${currentUser?.username || ctx.from?.first_name || 'غير معروف'}`,
    ].filter(Boolean).join('\n')

    // إرسال التقرير للمستخدم الحالي
    await ctx.reply(finalReport, { parse_mode: 'Markdown' })

    // إرسال التقرير لجميع السوبر أدمن
    const superAdmins = await Database.prisma.user.findMany({
      where: {
        isActive: true,
        role: 'SUPER_ADMIN',
        telegramId: { not: userId }, // عدم إرسال للمستخدم الحالي مرة أخرى
      },
      select: { telegramId: true },
    })

    for (const admin of superAdmins) {
      try {
        await ctx.api.sendMessage(Number(admin.telegramId), finalReport, { parse_mode: 'Markdown' })
      }
      catch (error) {
        ctx.logger.error({ error, adminId: admin.telegramId }, 'Failed to send item report to super admin')
      }
    }
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error saving item')
    await ctx.reply('❌ حدث خطأ أثناء حفظ الصنف.')
    itemFormData.delete(userId)
  }
}

// ============================================
// 🗑️ حذف صنف
// ============================================
transactionsItemsHandler.callbackQuery(/^hr:transactions:items:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1])

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد الحذف', `hr:transactions:items:delete:confirm:${itemId}`)
    .row()
    .text('❌ إلغاء', `hr:transactions:items:view:${itemId}`)

  await ctx.editMessageText(
    '⚠️ **تأكيد الحذف**\n\n'
    + 'هل أنت متأكد من حذف هذا الصنف؟\n\n'
    + '⚠️ سيتم إلغاء تفعيل الصنف وليس حذفه نهائياً.',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

transactionsItemsHandler.callbackQuery(/^hr:transactions:items:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const itemId = Number.parseInt(ctx.match![1])

  try {
    await Database.prisma.hR_AdvanceItem.update({
      where: { id: itemId },
      data: {
        isActive: false,
        updatedBy: ctx.from?.id,
      },
    })

    await ctx.editMessageText(
      '✅ تم حذف الصنف بنجاح!',
    )

    setTimeout(() => {
      showItemsList(ctx)
    }, 1500)
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error deleting item')
    await ctx.answerCallbackQuery({
      text: '❌ حدث خطأ أثناء الحذف',
      show_alert: true,
    })
  }
})

// ============================================
// 📄 التنقل بين الصفحات
// ============================================
transactionsItemsHandler.callbackQuery(/^hr:transactions:items:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1])
  await showItemsList(ctx, page)
})
