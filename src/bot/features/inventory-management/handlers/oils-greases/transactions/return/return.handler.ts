import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../../context.js'
import { ReturnService } from './return.service.js'
import { Database } from '#root/modules/database/index.js'

export const returnHandler = new Composer<Context>()

// Start return
returnHandler.callbackQuery('og:trans:return', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  ctx.session.inventoryForm = {
    action: 'return',
    step: 'select_issuance',
    warehouse: 'oils-greases',
    data: {},
  }
  
  await showIssuancesList(ctx, 1)
})

// Pagination
returnHandler.callbackQuery(/^og:return:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = Number.parseInt(ctx.match![1], 10)
  await showIssuancesList(ctx, page)
})

// Select issuance
returnHandler.callbackQuery(/^og:return:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const issuanceId = Number.parseInt(ctx.match![1], 10)
  const issuance = await ReturnService.getIssuanceById(issuanceId)
  
  if (!issuance) {
    await ctx.answerCallbackQuery({ text: '❌ عملية الصرف غير موجودة' })
    return
  }
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm!,
    step: 'awaiting_quantity',
    data: {
      issuanceId: issuance.id,
      issuanceNumber: issuance.transactionNumber,
      itemId: issuance.itemId,
      itemName: issuance.item.nameAr,
      itemCode: issuance.item.code,
      issuedQuantity: issuance.quantity,
      currentQuantity: issuance.item.quantity,
      unit: issuance.item.unit,
      employeeId: issuance.recipientEmployeeId,
      employeeName: issuance.recipientEmployee?.fullName || 'غير محدد',
      employeeCode: issuance.recipientEmployee?.employeeCode,
      equipmentName: issuance.equipment?.nameAr,
    },
  }
  
  await ctx.editMessageText(
    `📦 **الصنف:** ${issuance.item.nameAr}\n`
    + `📊 **الكمية المصروفة:** ${issuance.quantity} ${issuance.item.unit}\n`
    + `👤 **المستلم:** ${issuance.recipientEmployee?.fullName || 'غير محدد'}\n`
    + (issuance.equipment ? `🚜 **المعدة:** ${issuance.equipment.nameAr}\n` : '')
    + `📅 **التاريخ:** ${issuance.transactionDate.toLocaleDateString('ar-EG')}\n\n`
    + '🔢 **أدخل الكمية المراد إرجاعها:**',
    {
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'og:trans:menu'),
      parse_mode: 'Markdown',
    },
  )
})



// Skip notes
returnHandler.callbackQuery('og:return:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showConfirmation(ctx)
})

// Confirm
returnHandler.callbackQuery('og:return:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()
  const state = ctx.session.inventoryForm
  if (!state || !ctx.dbUser) return
  
  try {
    await ReturnService.createReturn({
      issuanceId: state.data.issuanceId as number,
      itemId: state.data.itemId as number,
      quantity: state.data.quantity as number,
      notes: state.data.notes as string | undefined,
      userId: ctx.dbUser.userId,
    })
    
    ctx.session.inventoryForm = undefined
    
    const successMessage = '═══════════════════\n'
      + '✅ **تمت عملية الإرجاع بنجاح**\n'
      + '═══════════════════\n\n'
      + `📦 **الصنف:** ${state.data.itemName}\n`
      + `🔢 **الكود:** \`${state.data.itemCode}\`\n\n`
      + '📊 **الكميات:**\n'
      + `   • السابقة: ${state.data.currentQuantity} ${state.data.unit}\n`
      + `   • المرتجعة: +${state.data.quantity} ${state.data.unit}\n`
      + `   • الجديدة: ${(state.data.currentQuantity as number) + (state.data.quantity as number)} ${state.data.unit}\n\n`
      + '👤 **المُرجِع:**\n'
      + `   • الاسم: ${state.data.employeeName}\n`
      + `   • الكود: ${state.data.employeeCode}\n\n`
      + (state.data.notes ? `📝 **ملاحظات:** ${state.data.notes}\n\n` : '')
      + `⏰ **التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`
      + `👤 **المستخدم:** ${ctx.from?.first_name || 'غير معروف'}`
    
    await ctx.editMessageText(successMessage, {
      reply_markup: new InlineKeyboard()
        .text('➕ عملية جديدة', 'og:trans:return')
        .row()
        .text('⬅️ القائمة الرئيسية', 'og:trans:menu'),
      parse_mode: 'Markdown',
    })
  } catch (error) {
    await ctx.reply('❌ حدث خطأ أثناء حفظ العملية')
  }
})

// Text handler
returnHandler.on('message:text', async (ctx, next) => {
  const state = ctx.session?.inventoryForm
  if (!state || state.warehouse !== 'oils-greases' || state.action !== 'return') return next()
  
  const text = ctx.message.text
  
  if (state.step === 'awaiting_quantity') {
    const quantity = Number.parseFloat(text)
    if (Number.isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ يجب إدخال رقم صحيح أكبر من صفر')
      return
    }
    
    if (quantity > (state.data.issuedQuantity as number)) {
      await ctx.reply('❌ الكمية أكبر من الكمية المصروفة')
      return
    }
    
    ctx.session.inventoryForm = {
      ...state,
      step: 'awaiting_notes',
      data: { ...state.data, quantity },
    }
    
    await ctx.reply(
      '📝 **ملاحظات**\n\nأدخل ملاحظات (اختياري):',
      {
        reply_markup: new InlineKeyboard().text('⏭️ تخطي', 'og:return:skip_notes'),
        parse_mode: 'Markdown',
      },
    )
    return
  }
  
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
async function showIssuancesList(ctx: Context, page: number) {
  const result = await ReturnService.getIssuances(page, 10)
  
  if (result.issuances.length === 0) {
    await ctx.editMessageText('❌ لا توجد عمليات صرف', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'og:trans:menu'),
    })
    return
  }
  
  let message = '↩️ **إرجاع للمخزن**\n\n'
  message += `📊 آخر عمليات الصرف\n`
  message += `📄 الصفحة: ${page} من ${result.totalPages}\n\n`
  message += '👇 **اختر عملية الصرف:**'
  
  const keyboard = new InlineKeyboard()
  
  for (const iss of result.issuances) {
    const label = `${iss.item.nameAr} - ${iss.quantity} ${iss.item.unit} - ${iss.recipientEmployee?.fullName || 'غير محدد'}`
    keyboard.text(label.substring(0, 60), `og:return:select:${iss.id}`)
    keyboard.row()
  }
  
  if (result.hasPrev || result.hasNext) {
    if (result.hasPrev) keyboard.text('⬅️ السابق', `og:return:page:${page - 1}`)
    if (result.hasNext) keyboard.text('التالي ➡️', `og:return:page:${page + 1}`)
    keyboard.row()
  }
  
  keyboard.text('⬅️ رجوع', 'og:trans:menu')
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function showConfirmation(ctx: Context) {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  let message = '═════════════════\n'
  message += '📋 **مراجعة عملية الإرجاع**\n'
  message += '═════════════════\n\n'
  
  message += `📦 **الصنف:** ${state.data.itemName}\n`
  message += `🔢 **الكود:** \`${state.data.itemCode}\`\n\n`
  
  message += '📈 **الكميات:**\n'
  message += `   • الحالية: ${state.data.currentQuantity} ${state.data.unit}\n`
  message += `   • المرتجعة: +${state.data.quantity} ${state.data.unit}\n`
  message += `   • الجديدة: ${(state.data.currentQuantity as number) + (state.data.quantity as number)} ${state.data.unit}\n\n`
  
  message += '👤 **المُرجِع:**\n'
  message += `   • الاسم: ${state.data.employeeName}\n`
  message += `   • الكود: ${state.data.employeeCode}\n\n`
  
  if (state.data.notes) {
    message += `📝 **ملاحظات:** ${state.data.notes}\n\n`
  }
  
  await ctx.reply(message, {
    reply_markup: new InlineKeyboard()
      .text('✅ تأكيد العملية', 'og:return:confirm')
      .row()
      .text('❌ إلغاء', 'og:trans:menu'),
    parse_mode: 'Markdown',
  })
}
