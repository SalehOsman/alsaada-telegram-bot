import { Composer, InlineKeyboard, InputFile } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { AdjustService } from './adjust.service.js'
import { Database } from '#root/modules/database/index.js'

export const adjustHandler = new Composer<Context>()

// Start audit - choose type
adjustHandler.callbackQuery('og:trans:adjust', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const keyboard = new InlineKeyboard()
    .text('📦 جرد كامل', 'og:audit:type:full')
    .row()
    .text('🏷️ جرد فئة', 'og:audit:type:category')
    .row()
    .text('📍 جرد موقع', 'og:audit:type:location')
    .row()
    .text('📄 التقارير التاريخية', 'og:audit:history')
    .row()
    .text('⬅️ رجوع', 'og:trans:menu')
  
  await ctx.editMessageText(
    '⚖️ **تسوية جرد**\n\n'
    + '📋 **اختر نوع الجرد:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Full audit
adjustHandler.callbackQuery('og:audit:type:full', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  if (!ctx.dbUser) return
  
  const audit = await AdjustService.createAudit(ctx.dbUser.userId)
  const items = await AdjustService.getItems()
  
  ctx.session.currentAuditId = audit.id
  ctx.session.auditItems = items.map(i => i.id)
  ctx.session.currentAuditIndex = 0
  
  await showNextItem(ctx)
})

// Category audit
adjustHandler.callbackQuery('og:audit:type:category', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const categories = await AdjustService.getCategories()
  const keyboard = new InlineKeyboard()
  
  for (const cat of categories) {
    keyboard.text(cat.nameAr, `og:audit:cat:${cat.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:adjust')
  
  await ctx.editMessageText(
    '🏷️ **جرد حسب الفئة**\n\nاختر الفئة:',
    { reply_markup: keyboard, parse_mode: 'Markdown' },
  )
})

adjustHandler.callbackQuery(/^og:audit:cat:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  if (!ctx.dbUser) return
  
  const categoryId = Number.parseInt(ctx.match![1], 10)
  const audit = await AdjustService.createAudit(ctx.dbUser.userId, 'CATEGORY', categoryId)
  const items = await AdjustService.getItemsByCategory(categoryId)
  
  ctx.session.currentAuditId = audit.id
  ctx.session.auditItems = items.map(i => i.id)
  ctx.session.currentAuditIndex = 0
  
  await showNextItem(ctx)
})

// Location audit
adjustHandler.callbackQuery('og:audit:type:location', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const locations = await AdjustService.getLocations()
  const keyboard = new InlineKeyboard()
  
  for (const loc of locations) {
    keyboard.text(loc.nameAr, `og:audit:loc:${loc.id}`)
    keyboard.row()
  }
  keyboard.text('⬅️ رجوع', 'og:trans:adjust')
  
  await ctx.editMessageText(
    '📍 **جرد حسب الموقع**\n\nاختر الموقع:',
    { reply_markup: keyboard, parse_mode: 'Markdown' },
  )
})

adjustHandler.callbackQuery(/^og:audit:loc:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  if (!ctx.dbUser) return
  
  const locationId = Number.parseInt(ctx.match![1], 10)
  const audit = await AdjustService.createAudit(ctx.dbUser.userId, 'LOCATION', locationId)
  const items = await AdjustService.getItemsByLocation(locationId)
  
  ctx.session.currentAuditId = audit.id
  ctx.session.auditItems = items.map(i => i.id)
  ctx.session.currentAuditIndex = 0
  
  await showNextItem(ctx)
})

// History
adjustHandler.callbackQuery('og:audit:history', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showAuditHistory(ctx, 1)
})

adjustHandler.callbackQuery(/^og:audit:history:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showAuditHistory(ctx, page)
})

// Skip item
adjustHandler.callbackQuery('og:audit:skip', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  if (!ctx.session.currentAuditIndex) return
  
  ctx.session.currentAuditIndex++
  await showNextItem(ctx)
})

// Save and pause
adjustHandler.callbackQuery('og:audit:pause', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  await ctx.editMessageText(
    '⏸️ **تم حفظ الجرد مؤقتاً**\n\nيمكنك استكمال الجرد لاحقاً من التقارير التاريخية.',
    {
      reply_markup: new InlineKeyboard().text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// Complete audit
adjustHandler.callbackQuery('og:audit:complete', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  if (!ctx.session.currentAuditId || !ctx.dbUser) return
  
  await AdjustService.completeAudit(ctx.session.currentAuditId, ctx.dbUser.userId)
  
  await showAuditReport(ctx)
})

// Apply adjustments
adjustHandler.callbackQuery(/^og:audit:apply:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري تطبيق التسوية...')
  
  const auditId = Number.parseInt(ctx.match![1], 10)
  
  if (!ctx.dbUser) return
  
  await AdjustService.applyAdjustments(auditId, ctx.dbUser.userId)
  
  await ctx.editMessageText(
    '✅ **تم تطبيق التسوية بنجاح**\n\n'
    + 'تم تحديث جميع الكميات في النظام حسب الجرد الفعلي.',
    {
      reply_markup: new InlineKeyboard()
        .text('📊 عرض التقرير', `og:audit:report:${auditId}`)
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
})

// View report
adjustHandler.callbackQuery(/^og:audit:report:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const auditId = Number.parseInt(ctx.match![1], 10)
  ctx.session.currentAuditId = auditId
  
  await showAuditReport(ctx)
})

// Export to Excel
adjustHandler.callbackQuery(/^og:audit:export:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري إنشاء ملف Excel...')
  
  const auditId = Number.parseInt(ctx.match![1], 10)
  const audit = await AdjustService.getAuditById(auditId)
  
  if (!audit) {
    await ctx.reply('❌ لم يتم العثور على الجرد')
    return
  }
  
  try {
    const { ExcelExportService } = await import('./excel-export.service.js')
    const filePath = await ExcelExportService.exportAuditToExcel(audit)
    
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📄 **تقرير الجرد**\n\n`
        + `🔢 **رقم:** \`${audit.auditNumber}\`\n`
        + `📅 **التاريخ:** ${audit.auditDate.toLocaleDateString('ar-EG')}`,
      parse_mode: 'Markdown',
    })
    
    // Delete file after sending
    const fs = await import('node:fs/promises')
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Error exporting audit:', error)
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

// Text handler
adjustHandler.on('message:text', async (ctx, next) => {
  if (!ctx.session.currentAuditId || !ctx.session.auditItems) return next()
  
  const text = ctx.message.text
  const quantity = Number.parseFloat(text)
  
  if (Number.isNaN(quantity) || quantity < 0) {
    await ctx.reply('❌ يجب إدخال رقم صحيح أكبر من أو يساوي صفر')
    return
  }
  
  const index = ctx.session.currentAuditIndex || 0
  const itemId = ctx.session.auditItems[index]
  const items = await AdjustService.getItems()
  const item = items.find(i => i.id === itemId)
  
  if (!item) return
  
  await AdjustService.addAuditItem({
    auditId: ctx.session.currentAuditId,
    itemId: item.id,
    itemCode: item.code,
    itemName: item.nameAr,
    systemQuantity: item.quantity,
    actualQuantity: quantity,
    unit: item.unit,
    locationId: item.locationId || undefined,
    locationName: item.location?.nameAr,
    categoryId: item.categoryId,
    categoryName: item.category.nameAr,
  })
  
  const difference = quantity - item.quantity
  const diffText = difference > 0 ? `+${difference}` : `${difference}`
  const diffEmoji = difference > 0 ? '📈' : difference < 0 ? '📉' : '✅'
  
  await ctx.reply(
    `${diffEmoji} **تم تسجيل الكمية**\n\n`
    + `📊 الكمية في النظام: ${item.quantity} ${item.unit}\n`
    + `📊 الكمية الفعلية: ${quantity} ${item.unit}\n`
    + `${diffEmoji} الفرق: ${diffText} ${item.unit}\n\n`
    + `━━━━━━━━━━━━━━━━━━━━\n`
    + `التقدم: ${index + 1}/${ctx.session.auditItems.length} صنف`,
    { parse_mode: 'Markdown' },
  )
  
  ctx.session.currentAuditIndex = index + 1
  await showNextItem(ctx)
})

// Helper functions
async function showNextItem(ctx: Context) {
  const index = ctx.session.currentAuditIndex || 0
  const auditItems = ctx.session.auditItems || []
  
  if (index >= auditItems.length) {
    await ctx.reply(
      '🎉 **تم الانتهاء من جرد جميع الأصناف!**\n\nاضغط "إكمال الجرد" لعرض التقرير النهائي.',
      {
        reply_markup: new InlineKeyboard().text('✅ إكمال الجرد', 'og:audit:complete'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
  const itemId = auditItems[index]
  const items = await AdjustService.getItems()
  const item = items.find(i => i.id === itemId)
  
  if (!item) return
  
  await ctx.reply(
    `📦 **جرد: ${item.nameAr}**\n`
    + `🔢 **الكود:** \`${item.code}\`\n`
    + `📍 **الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`
    + `━━━━━━━━━━━━━━━━━━━━\n\n`
    + `📊 **الكمية في النظام:** ${item.quantity} ${item.unit}\n\n`
    + `🔢 **أدخل الكمية الفعلية:**`,
    {
      reply_markup: new InlineKeyboard()
        .text('⏭️ تخطي', 'og:audit:skip')
        .text('⏸️ حفظ مؤقت', 'og:audit:pause')
        .row()
        .text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
}

async function showAuditHistory(ctx: Context, page: number) {
  const skip = (page - 1) * 10
  
  const [audits, total] = await Promise.all([
    Database.prisma.iNV_InventoryAudit.findMany({
      where: { warehouseType: 'OILS' },
      orderBy: { auditDate: 'desc' },
      skip,
      take: 10,
    }),
    Database.prisma.iNV_InventoryAudit.count({ where: { warehouseType: 'OILS' } }),
  ])
  
  if (audits.length === 0) {
    await ctx.editMessageText('❌ لا توجد تقارير جرد', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:trans:adjust'),
    })
    return
  }
  
  const totalPages = Math.ceil(total / 10)
  
  let message = '📄 **التقارير التاريخية**\n\n'
  message += `📄 الصفحة: ${page} من ${totalPages}\n\n`
  
  const keyboard = new InlineKeyboard()
  
  for (const audit of audits) {
    const statusEmoji = audit.status === 'COMPLETED' ? '✅' : '🔄'
    const label = `${statusEmoji} ${audit.auditNumber} - ${audit.auditDate.toLocaleDateString('ar-EG')}`
    keyboard.text(label.substring(0, 60), `og:audit:view:${audit.id}`)
    keyboard.row()
  }
  
  if (page > 1 || page < totalPages) {
    if (page > 1) keyboard.text('⬅️ السابق', `og:audit:history:page:${page - 1}`)
    if (page < totalPages) keyboard.text('التالي ➡️', `og:audit:history:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('⬅️ رجوع', 'og:trans:adjust')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

adjustHandler.callbackQuery(/^og:audit:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const auditId = Number.parseInt(ctx.match![1], 10)
  const audit = await AdjustService.getAuditById(auditId)
  
  if (!audit) return
  
  const keyboard = new InlineKeyboard()
  
  if (audit.status === 'IN_PROGRESS') {
    keyboard.text('▶️ استكمال الجرد', `og:audit:resume:${audit.id}`)
    keyboard.row()
  }
  
  keyboard.text('📄 تصدير Excel', `og:audit:export:${audit.id}`)
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:audit:history')
  
  let message = '📋 **تقرير الجرد**\n'
  message += `🔢 **رقم:** \`${audit.auditNumber}\`\n`
  message += `📅 **التاريخ:** ${audit.auditDate.toLocaleDateString('ar-EG')}\n`
  message += `📊 **الحالة:** ${audit.status === 'COMPLETED' ? 'مكتمل' : 'جاري'}\n`
  message += '━━━━━━━━━━━━━━━━━━━━\n\n'
  message += `• إجمالي الأصناف: ${audit.totalItems}\n`
  message += `• أصناف مجردة: ${audit.itemsChecked}\n`
  message += `• أصناف بها فروقات: ${audit.itemsWithDiff}\n`
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

async function showAuditReport(ctx: Context) {
  const auditId = ctx.session.currentAuditId
  if (!auditId) return
  
  const audit = await AdjustService.getAuditById(auditId)
  if (!audit) return
  
  const itemsWithDiff = audit.items.filter(i => i.hasDiscrepancy)
  
  let message = '📋 **تقرير الجرد**\n'
  message += `🔢 **رقم:** \`${audit.auditNumber}\`\n`
  message += `📅 **التاريخ:** ${audit.auditDate.toLocaleDateString('ar-EG')}\n`
  message += '━━━━━━━━━━━━━━━━━━━━\n\n'
  
  message += '📊 **الإحصائيات:**\n'
  message += `• إجمالي الأصناف: ${audit.totalItems}\n`
  message += `• أصناف مجردة: ${audit.itemsChecked}\n`
  message += `• أصناف بها فروقات: ${audit.itemsWithDiff}\n\n`
  
  if (audit.totalShortage > 0 || audit.totalSurplus > 0) {
    message += '📉 **الفروقات:**\n'
    if (audit.totalShortage > 0) message += `• إجمالي العجز: ${audit.totalShortage} وحدة\n`
    if (audit.totalSurplus > 0) message += `• إجمالي الزيادة: ${audit.totalSurplus} وحدة\n`
    message += '\n'
  }
  
  if (itemsWithDiff.length > 0) {
    message += '⚠️ **الأصناف بها فروقات:**\n'
    const displayItems = itemsWithDiff.slice(0, 10)
    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i]
      const diffText = item.difference > 0 ? `+${item.difference}` : `${item.difference}`
      message += `${i + 1}. ${item.itemName}: ${diffText} ${item.unit}\n`
    }
    if (itemsWithDiff.length > 10) {
      message += `\n... و ${itemsWithDiff.length - 10} صنف آخر\n`
    }
  }
  
  message += '\n━━━━━━━━━━━━━━━━━━━━\n'
  
  const keyboard = new InlineKeyboard()
  
  if (audit.status === 'COMPLETED' && itemsWithDiff.length > 0) {
    keyboard.text('✅ تطبيق التسوية', `og:audit:apply:${audit.id}`)
    keyboard.row()
  }
  
  keyboard.text('📄 تصدير Excel', `og:audit:export:${audit.id}`)
  keyboard.row()
  keyboard.text('⬅️ القائمة الرئيسية', 'og:trans:menu')
  
  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
  
  // Clear session
  ctx.session.currentAuditId = undefined
  ctx.session.auditItems = undefined
  ctx.session.currentAuditIndex = undefined
}
