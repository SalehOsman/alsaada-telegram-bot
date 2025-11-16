import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { TransferService } from './transfer.service.js'

export const transferHandler = new Composer<Context>()

// Start transfer
transferHandler.callbackQuery('og:trans:transfer', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  ctx.session.inventoryForm = {
    action: 'transfer',
    step: 'select_item',
    warehouse: 'oils-greases',
    data: {},
  }
  
  await showItemsList(ctx, 1)
})

// Pagination
transferHandler.callbackQuery(/^og:transfer:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showItemsList(ctx, page)
})

// Select item
transferHandler.callbackQuery(/^og:transfer:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const itemId = Number.parseInt(ctx.match![1], 10)
  const item = await TransferService.getItemById(itemId)
  
  if (!item) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف غير موجود' })
    return
  }
  
  if (!item.locationId) {
    await ctx.answerCallbackQuery({ text: '❌ الصنف ليس في موقع محدد' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'select_location',
    data: {
      itemId: item.id,
      itemName: item.nameAr,
      itemCode: item.code,
      fromLocationId: item.locationId,
      fromLocationName: item.location?.nameAr,
      quantity: item.quantity,
      unit: item.unit,
    },
  }
  
  await showLocationsList(ctx)
})

// Select destination location
transferHandler.callbackQuery(/^og:transfer:location:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const locationId = Number.parseInt(ctx.match![1], 10)
  const locations = await TransferService.getLocations()
  const location = locations.find(l => l.id === locationId)
  
  if (!location) {
    await ctx.answerCallbackQuery({ text: '❌ الموقع غير موجود' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'awaiting_notes',
    data: {
      ...ctx.session.inventoryForm!.data,
      toLocationId: location.id,
      toLocationName: location.nameAr,
    },
  }
  
  await ctx.reply(
    '📝 **ملاحظات**\n\nأدخل ملاحظات (اختياري):',
    {
      reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:transfer:skip_notes'),
      parse_mode: 'Markdown',
    },
  )
})

// Skip notes
transferHandler.callbackQuery('og:transfer:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showConfirmation(ctx)
})

// Confirm
transferHandler.callbackQuery('og:transfer:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state || !ctx.dbUser) return
  
  try {
    await TransferService.createTransfer({
      itemId: state.data.itemId as number,
      quantity: state.data.quantity as number,
      fromLocationId: state.data.fromLocationId as number,
      toLocationId: state.data.toLocationId as number,
      notes: state.data.notes as string | undefined,
      userId: ctx.dbUser.userId,
    })
    
    ctx.session.inventoryForm = undefined
    
    const successMessage = '═══════════════════\n'
      + '✅ **تمت عملية النقل بنجاح**\n'
      + '═══════════════════\n\n'
      + `📦 **الصنف:** ${state.data.itemName}\n`
      + `🔢 **الكود:** \`${state.data.itemCode}\`\n\n`
      + `📊 **الكمية المنقولة:** ${state.data.quantity} ${state.data.unit}\n\n`
      + `📍 **من:** ${state.data.fromLocationName}\n`
      + `📍 **إلى:** ${state.data.toLocationName}\n\n`
      + (state.data.notes ? `📝 **ملاحظات:** ${state.data.notes}\n\n` : '')
      + `⏰ **التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`
      + `👤 **المستخدم:** ${ctx.from?.first_name || 'غير معروف'}`
    
    await ctx.editMessageText(successMessage, {
      reply_markup: new InlineKeyboard()
        .text('➕ عملية جديدة', 'og:trans:transfer')
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    })
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء حفظ العملية')
  }
})

// Text handler
transferHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'transfer') return next()
  
  const text = ctx.message.text
  
  if (state.step === 'awaiting_notes') {
    ctx.session.inventoryForm = {
      ...state,
      data: { ...state.data, notes: text },
    }
    
    await showConfirmation(ctx)
    return
  }
  
  return next()
})

// Helper functions
async function showItemsList(ctx: Context, page: number) {
  const result = await TransferService.getItems(page, 8)
  
  if (result.total === 0) {
    await ctx.editMessageText('❌ لا توجد أصناف', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:trans:menu'),
    })
    return
  }
  
  let message = '🔄 **نقل بين مواقع**\n\n'
  message += `📦 إجمالي الأصناف: ${result.total}\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر الصنف:**'
  
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < result.items.length; i += 2) {
    const item1 = result.items[i]
    const item2 = result.items[i + 1]
    
    keyboard.text(`${item1.nameAr} (${item1.quantity})`, `og:transfer:select:${item1.id}`)
    if (item2) keyboard.text(`${item2.nameAr} (${item2.quantity})`, `og:transfer:select:${item2.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:transfer:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:transfer:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('⬅️ رجوع', 'og:trans:menu')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showLocationsList(ctx: Context) {
  const locations = await TransferService.getLocations()
  const state = ctx.session.inventoryForm!
  const fromLocationId = state.data.fromLocationId as number
  
  const keyboard = new InlineKeyboard()
  
  for (const loc of locations) {
    if (loc.id !== fromLocationId) {
      keyboard.text(loc.nameAr, `og:transfer:location:${loc.id}`)
      keyboard.row()
    }
  }
  
  keyboard.text('⬅️ رجوع', 'og:trans:transfer')
  
  await ctx.reply(
    '📍 **اختر الموقع الجديد:**',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
}

async function showConfirmation(ctx: Context) {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  let message = '═════════════════\n'
  message += '📋 **مراجعة عملية النقل**\n'
  message += '═════════════════\n\n'
  
  message += `📦 **الصنف:** ${state.data.itemName}\n`
  message += `🔢 **الكود:** \`${state.data.itemCode}\`\n\n`
  
  message += `📊 **الكمية:** ${state.data.quantity} ${state.data.unit}\n\n`
  
  message += `📍 **من:** ${state.data.fromLocationName}\n`
  message += `📍 **إلى:** ${state.data.toLocationName}\n\n`
  
  if (state.data.notes) {
    message += `📝 **ملاحظات:** ${state.data.notes}\n\n`
  }
  
  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('✅ تأكيد العملية', 'og:transfer:confirm')
      .row()
      .text('❌ إلغاء', 'og:trans:menu'),
    parse_mode: 'Markdown',
  })
}
