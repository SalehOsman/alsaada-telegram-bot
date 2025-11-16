import { Composer } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { editItemConversation } from './edit-item.conversation.js'
import { EditItemService } from './edit-item.service.js'

export const editItemHandler = new Composer<Context>()

// Select category
editItemHandler.callbackQuery(/^og:items:edit:category:select:(\d+):(\d+):(\d+)(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const categoryId = Number.parseInt(ctx.match![1], 10)
  const itemId = Number.parseInt(ctx.match![2], 10)
  const page = Number.parseInt(ctx.match![3], 10)
  const filterCatId = ctx.match![4] ? Number.parseInt(ctx.match![4], 10) : undefined

  if (!ctx.dbUser) return
  await EditItemService.updateCategory(itemId, categoryId, BigInt(ctx.dbUser.userId))

  await ctx.answerCallbackQuery({ text: '✅ تم تحديث الفئة بنجاح' })
  
  const catParam = filterCatId ? `:cat:${filterCatId}` : ''
  await ctx.editMessageText('✅ تم تحديث الفئة بنجاح\n\nاضغط على الزر للعودة:', {
    reply_markup: {
      inline_keyboard: [[{ text: '📦 عرض الصنف', callback_data: `og:items:view:${itemId}:page:${page}${catParam}` }]],
    },
  })
})

// Select location
editItemHandler.callbackQuery(/^og:items:edit:location:select:(\d+):(\d+):(\d+)(?::cat:(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const locationId = Number.parseInt(ctx.match![1], 10)
  const itemId = Number.parseInt(ctx.match![2], 10)
  const page = Number.parseInt(ctx.match![3], 10)
  const filterCatId = ctx.match![4] ? Number.parseInt(ctx.match![4], 10) : undefined

  if (!ctx.dbUser) return
  await EditItemService.updateLocation(itemId, locationId, BigInt(ctx.dbUser.userId))

  await ctx.answerCallbackQuery({ text: '✅ تم تحديث الموقع بنجاح' })
  
  const catParam = filterCatId ? `:cat:${filterCatId}` : ''
  await ctx.editMessageText('✅ تم تحديث الموقع بنجاح\n\nاضغط على الزر للعودة:', {
    reply_markup: {
      inline_keyboard: [[{ text: '📦 عرض الصنف', callback_data: `og:items:view:${itemId}:page:${page}${catParam}` }]],
    },
  })
})

// Start conversation for text fields
editItemHandler.callbackQuery(/^og:items:edit:(name|code|quantity|price|barcode|supplier|notes):(\d+):page:(\d+)/, async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter('editItemConversation')
})
