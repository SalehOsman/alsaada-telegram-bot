import { Composer, InlineKeyboard, InputFile } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ListItemsService } from './list-items.service.js'
import * as fs from 'node:fs/promises'

export const listItemsHandler = new Composer<Context>()

// Main list view
listItemsHandler.callbackQuery('og:items:list', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showItemsList(ctx, 1)
})

// Pagination
listItemsHandler.callbackQuery(/^og:items:list:page:(\d+)(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  const categoryId = ctx.match![2] ? Number.parseInt(ctx.match![2], 10) : undefined
  await showItemsList(ctx, page, categoryId)
})

// Filter by category
listItemsHandler.callbackQuery(/^og:items:list:category:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  await showItemsList(ctx, 1, categoryId)
})

// Clear filter
listItemsHandler.callbackQuery('og:items:list:clear', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showItemsList(ctx, 1)
})

// Show filters menu
listItemsHandler.callbackQuery('og:items:list:filters', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showFiltersMenu(ctx)
})

// Export to Excel
listItemsHandler.callbackQuery(/^og:items:list:export(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ جاري تصدير البيانات...' })
  
  try {
    const categoryId = ctx.match![1] ? Number.parseInt(ctx.match![1], 10) : undefined
    const result = await ListItemsService.exportToExcel(categoryId)
    
    await ctx.replyWithDocument(new InputFile(result.filePath, result.fileName), {
      caption: `✅ تم تصدير ${result.count} صنف بنجاح\n📄 الملف: ${result.fileName}`,
    })
    
    // Clean up file
    await fs.unlink(result.filePath)
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء التصدير')
  }
})

// View item details
listItemsHandler.callbackQuery(/^og:items:view:(\d+)(?::page:(\d+))?(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const page = ctx.match![2] ? Number.parseInt(ctx.match![2], 10) : 1
  const categoryId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined
  await showItemDetails(ctx, itemId, page, categoryId)
})

// Edit item menu
listItemsHandler.callbackQuery(/^og:items:edit:(\d+)(?::page:(\d+))?(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const page = ctx.match![2] ? Number.parseInt(ctx.match![2], 10) : 1
  const categoryId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined
  await showEditMenu(ctx, itemId, page, categoryId)
})

// Delete item (soft delete)
listItemsHandler.callbackQuery(/^og:items:delete:(\d+)(?::page:(\d+))?(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const page = ctx.match![2] ? Number.parseInt(ctx.match![2], 10) : 1
  const categoryId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined
  await showDeleteConfirm(ctx, itemId, page, categoryId)
})

// Confirm delete
listItemsHandler.callbackQuery(/^og:items:delete:confirm:(\d+)(?::page:(\d+))?(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const page = ctx.match![2] ? Number.parseInt(ctx.match![2], 10) : 1
  const categoryId = ctx.match![3] ? Number.parseInt(ctx.match![3], 10) : undefined
  
  try {
    await ListItemsService.softDeleteItem(itemId)
    await ctx.answerCallbackQuery({ text: '✅ تم حذف الصنف بنجاح' })
    await showItemsList(ctx, page, categoryId)
  } catch (error) {
    await ctx.answerCallbackQuery({ text: '❌ حدث خطأ أثناء الحذف' })
  }
})

/**
 * Show items list
 */
async function showItemsList(ctx: Context, page: number = 1, categoryId?: number) {
  const result = await ListItemsService.getItems(page, 8, categoryId)

  if (result.total === 0) {
    await ctx.editMessageText(
      '📊 **عرض جميع الأصناف**\n\n'
      + '❌ **لا توجد أصناف**\n\n'
      + 'يمكنك إضافة صنف جديد من القائمة الرئيسية',
      {
        reply_markup: new InlineKeyboard()
          .text('➕ إضافة صنف', 'og:items:add:start')
          .row()
          .text('⬅️ رجوع', 'og:items:menu'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  let message = '📊 **عرض جميع الأصناف**\n\n'
  
  if (categoryId) {
    const category = result.items[0]?.category
    message += `🔍 **الفلتر:** ${category?.nameAr || 'غير محدد'}\n\n`
  }
  
  message += `📦 **إجمالي الأصناف:** ${result.total}\n`
  message += `📄 **الصفحة:** ${page} من ${result.totalPages}\n\n`
  message += '**اختر صنف لعرض التفاصيل:**'

  const keyboard = new InlineKeyboard()

  // Item buttons (2 per row)
  for (let i = 0; i < result.items.length; i += 2) {
    const item1 = result.items[i]
    const item2 = result.items[i + 1]
    
    const catParam = categoryId ? `:cat:${categoryId}` : ''
    const warning1 = item1.quantity <= item1.minQuantity ? '⚠️ ' : ''
    const warning2 = item2 && item2.quantity <= item2.minQuantity ? '⚠️ ' : ''
    
    keyboard.text(
      `${warning1}${item1.nameAr} (${item1.quantity})`,
      `og:items:view:${item1.id}:page:${page}${catParam}`
    )
    
    if (item2) {
      keyboard.text(
        `${warning2}${item2.nameAr} (${item2.quantity})`,
        `og:items:view:${item2.id}:page:${page}${catParam}`
      )
    }
    
    keyboard.row()
  }

  // Pagination buttons
  if (result.hasPrev || result.hasNext) {
    const catParam = categoryId ? `:cat:${categoryId}` : ''
    if (result.hasPrev) {
      keyboard.text('⬅️ السابق', `og:items:list:page:${page - 1}${catParam}`)
    }
    if (result.hasNext) {
      keyboard.text('التالي ➡️', `og:items:list:page:${page + 1}${catParam}`)
    }
    keyboard.row()
  }

  // Action buttons
  keyboard.text('🔍 فلترة', 'og:items:list:filters')
  
  if (categoryId) {
    keyboard.text('❌ إزالة الفلتر', 'og:items:list:clear')
    keyboard.row()
    keyboard.text('📊 تصدير Excel', `og:items:list:export:cat:${categoryId}`)
  } else {
    keyboard.row()
    keyboard.text('📊 تصدير Excel', 'og:items:list:export')
  }
  
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'og:items:menu')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * Show filters menu
 */
async function showFiltersMenu(ctx: Context) {
  const categories = await ListItemsService.getCategories()

  let message = '🔍 **فلترة الأصناف**\n\n'
  message += '📋 **اختر الفئة:**'

  const keyboard = new InlineKeyboard()
  
  for (const cat of categories) {
    keyboard.text(cat.nameAr, `og:items:list:category:${cat.id}`).row()
  }
  
  keyboard.text('⬅️ رجوع', 'og:items:list')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * Show item details
 */
async function showItemDetails(ctx: Context, itemId: number, page: number, categoryId?: number) {
  const item = await ListItemsService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }

  let message = '📦 **تفاصيل الصنف**\n\n'
  message += `**الاسم (عربي):** ${item.nameAr}\n`
  if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
  message += `**الكود:** \`${item.code}\`\n`
  if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`
  message += `\n**الفئة:** ${item.category?.nameAr || 'غير محدد'}\n`
  message += `**الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`
  message += `\n**الكمية:** ${item.quantity} ${item.unit}\n`
  message += `**الحد الأدنى:** ${item.minQuantity} ${item.unit}\n`
  
  if (item.quantity <= item.minQuantity) {
    message += `\n⚠️ **تحذير:** الكمية أقل من أو تساوي الحد الأدنى\n`
  }
  
  message += `\n**سعر الوحدة:** ${item.unitPrice.toFixed(2)} جنيه\n`
  message += `**القيمة الإجمالية:** ${item.totalValue.toFixed(2)} جنيه\n`
  
  if (item.supplierName) message += `\n**المورد:** ${item.supplierName}\n`
  if (item.notes) message += `\n**ملاحظات:** ${item.notes}\n`
  
  message += `\n**تاريخ الإضافة:** ${item.createdAt.toLocaleString('ar-EG')}\n`
  if (item.updatedAt) message += `**آخر تحديث:** ${item.updatedAt.toLocaleString('ar-EG')}\n`

  const keyboard = new InlineKeyboard()
  const catParam = categoryId ? `:cat:${categoryId}` : ''
  
  keyboard.text('✏️ تعديل', `og:items:edit:${itemId}:page:${page}${catParam}`)
  keyboard.text('🗑️ حذف', `og:items:delete:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('⬅️ رجوع للقائمة', `og:items:list:page:${page}${catParam}`)

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * Show edit menu
 */
async function showEditMenu(ctx: Context, itemId: number, page: number, categoryId?: number) {
  const item = await ListItemsService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }

  let message = '✏️ **تعديل الصنف**\n\n'
  message += `**الصنف:** ${item.nameAr}\n`
  message += `**الكود:** \`${item.code}\`\n\n`
  message += '**اختر البيانات المراد تعديلها:**'

  const keyboard = new InlineKeyboard()
  const catParam = categoryId ? `:cat:${categoryId}` : ''
  
  keyboard.text('📝 الاسم', `og:items:edit:name:${itemId}:page:${page}${catParam}`)
  keyboard.text('🔢 الكود', `og:items:edit:code:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('📊 الكمية', `og:items:edit:quantity:${itemId}:page:${page}${catParam}`)
  keyboard.text('💰 السعر', `og:items:edit:price:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('📦 الفئة', `og:items:edit:category:${itemId}:page:${page}${catParam}`)
  keyboard.text('📍 الموقع', `og:items:edit:location:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('📋 الباركود', `og:items:edit:barcode:${itemId}:page:${page}${catParam}`)
  keyboard.text('🏢 المورد', `og:items:edit:supplier:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('📝 ملاحظات', `og:items:edit:notes:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('⬅️ رجوع', `og:items:view:${itemId}:page:${page}${catParam}`)

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * Show delete confirmation
 */
async function showDeleteConfirm(ctx: Context, itemId: number, page: number, categoryId?: number) {
  const item = await ListItemsService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }

  let message = '⚠️ **تأكيد الحذف**\n\n'
  message += `هل أنت متأكد من حذف الصنف:\n\n`
  message += `**${item.nameAr}**\n`
  message += `الكود: \`${item.code}\`\n\n`
  message += '⚠️ **ملاحظة:** سيتم الحذف الناعم (يمكن استرجاع البيانات لاحقاً)'

  const keyboard = new InlineKeyboard()
  const catParam = categoryId ? `:cat:${categoryId}` : ''
  
  keyboard.text('✅ تأكيد الحذف', `og:items:delete:confirm:${itemId}:page:${page}${catParam}`)
  keyboard.row()
  keyboard.text('❌ إلغاء', `og:items:view:${itemId}:page:${page}${catParam}`)

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}
