import type { Context } from '#root/bot/context.js'
import type { Conversation } from '@grammyjs/conversations'
import { Database } from '#root/modules/database/index.js'
import { InlineKeyboard } from 'grammy'

export async function editItemConversation(conversation: any, ctx: Context) {
  const match = ctx.callbackQuery?.data?.match(/^og:items:edit:(\w+):(\d+):page:(\d+)(?::cat:(\d+))?$/)
  if (!match) return

  const [, field, itemIdStr, pageStr, categoryIdStr] = match
  const itemId = Number.parseInt(itemIdStr, 10)
  const page = Number.parseInt(pageStr, 10)
  const categoryId = categoryIdStr ? Number.parseInt(categoryIdStr, 10) : undefined

  const item = await Database.prisma.iNV_OilsGreasesItem.findUnique({
    where: { id: itemId },
    include: { category: true, location: true },
  })

  if (!item) {
    await ctx.reply('❌ الصنف غير موجود')
    return
  }

  const catParam = categoryId ? `:cat:${categoryId}` : ''

  switch (field) {
    case 'name':
      await ctx.editMessageText(
        `✏️ **تعديل الاسم**\n\n**الاسم الحالي:** ${item.nameAr}\n\nأرسل الاسم الجديد (عربي):`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const nameCtx = await conversation.wait()
      if (!nameCtx.message?.text) {
        await ctx.reply('❌ يجب إرسال نص')
        return
      }

      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { nameAr: nameCtx.message.text },
      })

      await ctx.reply('✅ تم تحديث الاسم بنجاح')
      break

    case 'code':
      await ctx.editMessageText(
        `✏️ **تعديل الكود**\n\n**الكود الحالي:** \`${item.code}\`\n\nأرسل الكود الجديد:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const codeCtx = await conversation.wait()
      if (!codeCtx.message?.text) {
        await ctx.reply('❌ يجب إرسال نص')
        return
      }

      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { code: codeCtx.message.text },
      })

      await ctx.reply('✅ تم تحديث الكود بنجاح')
      break

    case 'quantity':
      await ctx.editMessageText(
        `✏️ **تعديل الكمية**\n\n**الكمية الحالية:** ${item.quantity} ${item.unit}\n\nأرسل الكمية الجديدة:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const qtyCtx = await conversation.wait()
      const quantity = Number.parseFloat(qtyCtx.message?.text || '')
      if (Number.isNaN(quantity)) {
        await ctx.reply('❌ يجب إرسال رقم صحيح')
        return
      }

      const totalValue = quantity * Number(item.unitPrice)
      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { quantity, totalValue },
      })

      await ctx.reply('✅ تم تحديث الكمية بنجاح')
      break

    case 'price':
      await ctx.editMessageText(
        `✏️ **تعديل السعر**\n\n**السعر الحالي:** ${item.unitPrice} جنيه\n\nأرسل السعر الجديد:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const priceCtx = await conversation.wait()
      const price = Number.parseFloat(priceCtx.message?.text || '')
      if (Number.isNaN(price)) {
        await ctx.reply('❌ يجب إرسال رقم صحيح')
        return
      }

      const newTotalValue = item.quantity * price
      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { unitPrice: price, totalValue: newTotalValue },
      })

      await ctx.reply('✅ تم تحديث السعر بنجاح')
      break

    case 'barcode':
      await ctx.editMessageText(
        `✏️ **تعديل الباركود**\n\n**الباركود الحالي:** ${item.barcode || 'غير محدد'}\n\nأرسل الباركود الجديد:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const barcodeCtx = await conversation.wait()
      if (!barcodeCtx.message?.text) {
        await ctx.reply('❌ يجب إرسال نص')
        return
      }

      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { barcode: barcodeCtx.message.text },
      })

      await ctx.reply('✅ تم تحديث الباركود بنجاح')
      break

    case 'supplier':
      await ctx.editMessageText(
        `✏️ **تعديل المورد**\n\n**المورد الحالي:** ${item.supplierName || 'غير محدد'}\n\nأرسل اسم المورد الجديد:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const supplierCtx = await conversation.wait()
      if (!supplierCtx.message?.text) {
        await ctx.reply('❌ يجب إرسال نص')
        return
      }

      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { supplierName: supplierCtx.message.text },
      })

      await ctx.reply('✅ تم تحديث المورد بنجاح')
      break

    case 'notes':
      await ctx.editMessageText(
        `✏️ **تعديل الملاحظات**\n\n**الملاحظات الحالية:** ${item.notes || 'لا توجد'}\n\nأرسل الملاحظات الجديدة:`,
        {
          reply_markup: new InlineKeyboard().text('❌ إلغاء', `og:items:edit:${itemId}:page:${page}${catParam}`),
          parse_mode: 'Markdown',
        },
      )
      
      const notesCtx = await conversation.wait()
      if (!notesCtx.message?.text) {
        await ctx.reply('❌ يجب إرسال نص')
        return
      }

      await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { notes: notesCtx.message.text },
      })

      await ctx.reply('✅ تم تحديث الملاحظات بنجاح')
      break
  }

  await ctx.reply('اضغط على الزر للعودة:', {
    reply_markup: new InlineKeyboard().text('📦 عرض الصنف', `og:items:view:${itemId}:page:${page}${catParam}`),
  })
}
