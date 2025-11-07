/**
 * Ban User Handler
 * معالج حظر المستخدمين
 */

import type { Context } from '../../../context.js'
import { RoleManager } from '#root/modules/permissions/index.js'
import { getUserDisplayName } from '#root/modules/services/user-display/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const banUserHandler = new Composer<Context>()

// تخزين مؤقت لحالة الحظر
const banState = new Map<number, {
  targetUserId?: number
  action?: 'ban' | 'unban'
  reason?: string
}>()

// دعم نمط MenuBuilder المباشر بالاسم
banUserHandler.callbackQuery('banUserHandler', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    banState.set(userId, {})
    await showBanMenu(ctx, userId)
  }
  catch (error) {
    console.error('Error in banUserHandler:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * القائمة الرئيسية للحظر
 */
banUserHandler.callbackQuery(/^menu:sub:admin-panel:ban-user$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    banState.set(userId, {})

    await showBanMenu(ctx, userId)
  }
  catch (error) {
    console.error('Error in ban menu:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * تبديل حالة الحظر من صفحة المستخدم
 */
banUserHandler.callbackQuery(/^admin:ban-toggle:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])

    const user = await RoleManager.searchUsers({ limit: 100 }).then(
      users => users.find(u => u.id === targetUserId),
    )

    if (!user) {
      await ctx.answerCallbackQuery('⚠️ المستخدم غير موجود')
      return
    }

    const action = user.isBanned ? 'unban' : 'ban'
    banState.set(userId, { targetUserId, action })

    if (action === 'ban') {
      await showBanReasonInput(ctx, userId, targetUserId)
    }
    else {
      await executeUnban(ctx, userId, targetUserId)
    }
  }
  catch (error) {
    console.error('Error toggling ban:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * اختيار حظر مستخدم
 */
banUserHandler.callbackQuery('admin:ban-action:ban', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    banState.set(userId, { action: 'ban' })

    await showUserSelection(ctx, userId, 'ban')
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * اختيار إلغاء حظر مستخدم
 */
banUserHandler.callbackQuery('admin:ban-action:unban', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    banState.set(userId, { action: 'unban' })

    await showUserSelection(ctx, userId, 'unban')
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * عرض قائمة المحظورين
 */
banUserHandler.callbackQuery('admin:ban-action:list', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    await showBannedList(ctx)
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * اختيار مستخدم للحظر/إلغاء الحظر
 */
banUserHandler.callbackQuery(/^admin:ban-user:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])
    const state = banState.get(userId)

    if (!state || !state.action) {
      await ctx.answerCallbackQuery('⚠️ حدث خطأ')
      return
    }

    state.targetUserId = targetUserId
    banState.set(userId, state)

    if (state.action === 'ban') {
      await showBanReasonInput(ctx, userId, targetUserId)
    }
    else {
      await executeUnban(ctx, userId, targetUserId)
    }
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * اختيار سبب جاهز
 */
banUserHandler.callbackQuery(/^admin:ban-reason:(\d+):(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])
    const reasonKey = ctx.match![2]

    const reasons: Record<string, string> = {
      violation: 'انتهاك شروط الاستخدام',
      inappropriate: 'سلوك غير لائق',
      misuse: 'استخدام خاطئ للبوت',
      spam: 'إرسال رسائل مزعجة',
    }

    const reason = reasons[reasonKey]

    const state = banState.get(userId)
    if (state) {
      state.reason = reason
      banState.set(userId, state)
    }

    await executeBan(ctx, userId, targetUserId, reason)
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * إدخال سبب مخصص
 */
banUserHandler.callbackQuery(/^admin:ban-custom:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    await ctx.editMessageText(
      '📝 **إدخال سبب مخصص**\n\n'
      + 'أرسل سبب الحظر في رسالة نصية:',
      { parse_mode: 'Markdown' },
    )
  }
  catch (error) {
    console.error('Error:', error)
  }
})

/**
 * استقبال السبب المخصص
 */
banUserHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const state = banState.get(userId)
  if (!state || !state.targetUserId || state.action !== 'ban') {
    return next()
  }

  const reason = ctx.message.text
  await ctx.reply('✅ تم حفظ السبب')
  await executeBan(ctx, userId, state.targetUserId, reason)
})

/**
 * عرض قائمة الحظر الرئيسية
 */
async function showBanMenu(ctx: Context, _userId: number) {
  const stats = await RoleManager.getRoleStatistics()

  const keyboard = new InlineKeyboard()
    .text('🚫 حظر مستخدم', 'admin:ban-action:ban')
    .row()
    .text('✅ إلغاء حظر مستخدم', 'admin:ban-action:unban')
    .row()
    .text('📋 قائمة المحظورين', 'admin:ban-action:list')
    .row()
    .text('⬅️ رجوع', 'menu:feature:admin-panel')

  await ctx.editMessageText(
    '🚫 **إدارة حظر المستخدمين**\n\n'
    + `**عدد المحظورين حالياً:** ${stats.banned}\n\n`
    + 'اختر الإجراء المطلوب:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * عرض اختيار المستخدم
 */
async function showUserSelection(ctx: Context, currentUserId: number, action: 'ban' | 'unban') {
  const filter = action === 'unban' ? { isBanned: true } : { isBanned: false }
  const users = await RoleManager.searchUsers({ ...filter, limit: 10 })

  if (users.length === 0) {
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

    const message = action === 'unban'
      ? '✅ لا يوجد مستخدمون محظورون'
      : '⚠️ لا يوجد مستخدمون نشطون'

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
    return
  }

  const keyboard = new InlineKeyboard()

  users.slice(0, 8).forEach((user) => {
    const statusEmoji = user.isBanned ? '🚫' : '✅'
    keyboard.text(
      `${getUserDisplayName(user)} ${statusEmoji}`,
      `admin:ban-user:${user.id}`,
    ).row()
  })

  keyboard.text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

  const title = action === 'ban' ? '🚫 حظر مستخدم' : '✅ إلغاء حظر مستخدم'
  await ctx.editMessageText(
    `${title}\n\n`
    + 'اختر المستخدم:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * عرض إدخال سبب الحظر
 */
async function showBanReasonInput(ctx: Context, currentUserId: number, targetUserId: number) {
  const user = await RoleManager.searchUsers({ limit: 100 }).then(
    users => users.find(u => u.id === targetUserId),
  )

  if (!user)
    return

  const keyboard = new InlineKeyboard()
    .text('انتهاك الشروط', `admin:ban-reason:${targetUserId}:violation`)
    .row()
    .text('سلوك غير لائق', `admin:ban-reason:${targetUserId}:inappropriate`)
    .row()
    .text('استخدام خاطئ', `admin:ban-reason:${targetUserId}:misuse`)
    .row()
    .text('رسائل مزعجة', `admin:ban-reason:${targetUserId}:spam`)
    .row()
    .text('✏️ سبب مخصص', `admin:ban-custom:${targetUserId}`)
    .row()
    .text('❌ إلغاء', 'menu:sub:admin-panel:ban-user')

  await ctx.editMessageText(
    `🚫 **حظر مستخدم**\n\n`
    + `**المستخدم:** ${user.fullName || user.nickname || user.username || 'مستخدم'}\n\n`
    + '📝 **سبب الحظر:**\n'
    + 'اختر سبباً جاهزاً أو أدخل سبباً مخصصاً:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * عرض قائمة المحظورين
 */
async function showBannedList(ctx: Context) {
  const bannedUsers = await RoleManager.searchUsers({ isBanned: true, limit: 20 })

  if (bannedUsers.length === 0) {
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

    await ctx.editMessageText(
      '📋 **قائمة المحظورين**\n\n'
      + '✅ لا يوجد مستخدمون محظورون',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  let message = `📋 **قائمة المحظورين** (${bannedUsers.length})\n\n`

  bannedUsers.forEach((user, index) => {
    message += `${index + 1}. **${getUserDisplayName(user)}**\n`
    if (user.bannedReason)
      message += `   السبب: ${user.bannedReason}\n`
    if (user.bannedAt) {
      message += `   التاريخ: ${new Date(user.bannedAt).toLocaleDateString('ar-EG')}\n`
    }
    message += '\n'
  })

  const keyboard = new InlineKeyboard()
    .text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

/**
 * تنفيذ الحظر
 */
async function executeBan(ctx: Context, currentUserId: number, targetUserId: number, reason: string) {
  try {
    await RoleManager.banUser(targetUserId, ctx.dbUser!.userId, reason)

    const keyboard = new InlineKeyboard()
      .text('✅ عرض المستخدم', `admin:user:view:${targetUserId}`)
      .row()
      .text('🚫 حظر آخر', 'admin:ban-action:ban')
      .row()
      .text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

    await ctx.reply(
      `✅ **تم حظر المستخدم بنجاح!**\n\n`
      + `**السبب:** ${reason}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    banState.delete(currentUserId)
  }
  catch (error: any) {
    console.error('Error executing ban:', error)

    await ctx.reply(
      `❌ **فشل حظر المستخدم**\n\n`
      + `**السبب:** ${error.message}`,
      { parse_mode: 'Markdown' },
    )
  }
}

/**
 * تنفيذ إلغاء الحظر
 */
async function executeUnban(ctx: Context, currentUserId: number, targetUserId: number) {
  try {
    await RoleManager.unbanUser(targetUserId, ctx.dbUser!.userId)

    const keyboard = new InlineKeyboard()
      .text('✅ عرض المستخدم', `admin:user:view:${targetUserId}`)
      .row()
      .text('✅ إلغاء حظر آخر', 'admin:ban-action:unban')
      .row()
      .text('⬅️ رجوع', 'menu:sub:admin-panel:ban-user')

    await ctx.reply(
      `✅ **تم إلغاء حظر المستخدم بنجاح!**`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    banState.delete(currentUserId)
  }
  catch (error: any) {
    console.error('Error executing unban:', error)

    await ctx.reply(
      `❌ **فشل إلغاء حظر المستخدم**\n\n`
      + `**السبب:** ${error.message}`,
      { parse_mode: 'Markdown' },
    )
  }
}
