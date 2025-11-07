/**
 * Users List Handler
 * معالج قائمة المستخدمين
 */

import type { Context } from '../../../context.js'
import { RoleManager } from '#root/modules/permissions/index.js'
import { formatUserForAdmin, getUserDisplayName } from '#root/modules/services/user-display/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const usersListHandler = new Composer<Context>()

// تخزين مؤقت لحالة الصفحات
const userListState = new Map<number, { page: number, filter?: any }>()

// دعم نمط MenuBuilder المباشر بالاسم
usersListHandler.callbackQuery('usersListHandler', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    userListState.set(userId, { page: 1 })
    await showUsersList(ctx, userId, 1)
  }
  catch (error) {
    console.error('Error in usersListHandler:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض قائمة المستخدمين
 */
usersListHandler.callbackQuery(/^menu:sub:admin-panel:users-list$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    // إعادة تعيين الحالة
    userListState.set(userId, { page: 1 })

    await showUsersList(ctx, userId, 1)
  }
  catch (error) {
    console.error('Error in users list:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * التنقل بين الصفحات
 */
usersListHandler.callbackQuery(/^admin:users:page:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const page = Number.parseInt(ctx.match![1])

    const state = userListState.get(userId) || { page: 1 }
    state.page = page
    userListState.set(userId, state)

    await showUsersList(ctx, userId, page)
  }
  catch (error) {
    console.error('Error in pagination:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * فلترة حسب الدور
 */
usersListHandler.callbackQuery(/^admin:users:filter:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const filterType = ctx.match![1]

    const state = userListState.get(userId) || { page: 1 }

    if (filterType === 'all') {
      delete state.filter
    }
    else if (filterType === 'banned') {
      state.filter = { isBanned: true }
    }
    else if (filterType === 'active') {
      state.filter = { isActive: true, isBanned: false }
    }
    else {
      // فلتر حسب الدور
      state.filter = { role: filterType.toUpperCase() }
    }

    state.page = 1
    userListState.set(userId, state)

    await showUsersList(ctx, userId, 1)
  }
  catch (error) {
    console.error('Error in filter:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض تفاصيل مستخدم
 */
usersListHandler.callbackQuery(/^admin:user:view:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const targetUserId = Number.parseInt(ctx.match![1])
    const currentUserId = ctx.from?.id
    if (!currentUserId)
      return

    const user = await RoleManager.searchUsers({
      limit: 1,
      offset: 0,
    }).then(users => users.find(u => u.id === targetUserId))

    if (!user) {
      await ctx.answerCallbackQuery('⚠️ المستخدم غير موجود')
      return
    }

    const roleHistory = await RoleManager.getRoleHistory(targetUserId, 3)

    let historyText = ''
    if (roleHistory.length > 0) {
      historyText = '\n\n**تاريخ تغيير الدور:**\n'
      roleHistory.forEach((change) => {
        const date = new Date(change.createdAt).toLocaleDateString('ar-EG')
        historyText += `• ${change.oldRole} → ${change.newRole}\n`
        historyText += `  بواسطة: User ID ${change.changedBy}\n`
        historyText += `  التاريخ: ${date}\n`
        if (change.reason)
          historyText += `  السبب: ${change.reason}\n`
      })
    }

    const keyboard = new InlineKeyboard()
      .text('🔄 تغيير الدور', `admin:change-role:${targetUserId}`)
      .row()
      .text(user.isBanned ? '✅ إلغاء الحظر' : '🚫 حظر', `admin:ban-toggle:${targetUserId}`)
      .row()
      .text('⬅️ رجوع', `admin:users:page:${userListState.get(currentUserId)?.page || 1}`)

    await ctx.editMessageText(
      `👤 **تفاصيل المستخدم**\n\n${
        formatUserForAdmin(user)}\n\n`
        + `**تاريخ التسجيل:** ${new Date(user.createdAt).toLocaleDateString('ar-EG')}\n${
          historyText}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error viewing user:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض قائمة المستخدمين مع الصفحات
 */
async function showUsersList(ctx: Context, currentUserId: number, page: number) {
  const USERS_PER_PAGE = 5
  const offset = (page - 1) * USERS_PER_PAGE

  const state = userListState.get(currentUserId) || { page: 1 }

  const users = await RoleManager.searchUsers({
    ...state.filter,
    limit: USERS_PER_PAGE,
    offset,
  })

  const totalUsers = await RoleManager.searchUsers(state.filter || {}).then(u => u.length)
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE)

  if (users.length === 0) {
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      '👥 **قائمة المستخدمين**\n\n'
      + '⚠️ لا يوجد مستخدمون',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  let message = `👥 **قائمة المستخدمين** (صفحة ${page}/${totalPages})\n\n`

  if (state.filter) {
    message += `**الفلتر:** ${getFilterName(state.filter)}\n\n`
  }

  const keyboard = new InlineKeyboard()

  users.forEach((user, index) => {
    const statusEmoji = user.isBanned ? '🚫' : user.isActive ? '✅' : '⚠️'
    const roleEmoji = getRoleEmoji(user.role)

    keyboard.text(
      `${index + 1}. ${getUserDisplayName(user)} ${roleEmoji} ${statusEmoji}`,
      `admin:user:view:${user.id}`,
    ).row()
  })

  // أزرار التنقل
  const navButtons: any[] = []
  if (page > 1) {
    navButtons.push({ text: '⬅️ السابق', callback_data: `admin:users:page:${page - 1}` })
  }
  if (page < totalPages) {
    navButtons.push({ text: 'التالي ➡️', callback_data: `admin:users:page:${page + 1}` })
  }
  if (navButtons.length > 0) {
    keyboard.row(...navButtons.map(b => InlineKeyboard.text(b.text, b.callback_data)))
  }

  // أزرار الفلترة
  keyboard.row()
  keyboard.text('🔍 الكل', 'admin:users:filter:all')
  keyboard.text('👑 مديرين', 'admin:users:filter:admin')
  keyboard.row()
  keyboard.text('👤 مستخدمين', 'admin:users:filter:user')
  keyboard.text('🚫 محظورين', 'admin:users:filter:banned')
  keyboard.row()
  keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

/**
 * Helper functions
 */
function getRoleEmoji(role: string): string {
  const emojis: Record<string, string> = {
    SUPER_ADMIN: '👑',
    ADMIN: '🛡️',
    USER: '👤',
    GUEST: '🌐',
  }
  return emojis[role] || '❓'
}

function getRoleNameAr(role: string): string {
  const names: Record<string, string> = {
    SUPER_ADMIN: 'مدير أعلى',
    ADMIN: 'مدير',
    USER: 'مستخدم',
    GUEST: 'زائر',
  }
  return names[role] || role
}

function getFilterName(filter: any): string {
  if (filter.role)
    return getRoleNameAr(filter.role)
  if (filter.isBanned)
    return 'المحظورين'
  if (filter.isActive)
    return 'النشطين'
  return 'الكل'
}
