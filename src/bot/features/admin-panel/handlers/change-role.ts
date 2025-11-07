/**
 * Change Role Handler
 * معالج تغيير الأدوار
 */

import type { Role } from '../../../../../generated/prisma/index.js'
import type { Context } from '../../../context.js'
import { PermissionService, RoleManager } from '#root/modules/permissions/index.js'
import { getUserDisplayName } from '#root/modules/services/user-display/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const changeRoleHandler = new Composer<Context>()

// تخزين مؤقت لحالة تغيير الدور
const changeRoleState = new Map<number, {
  targetUserId?: number
  newRole?: Role
  reason?: string
}>()

// دعم نمط MenuBuilder المباشر بالاسم
changeRoleHandler.callbackQuery('changeRoleHandler', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    changeRoleState.set(userId, {})
    await showUserSelection(ctx, userId)
  }
  catch (error) {
    console.error('Error in changeRoleHandler:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * بدء عملية تغيير الدور
 */
changeRoleHandler.callbackQuery(/^menu:sub:admin-panel:change-role$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    changeRoleState.set(userId, {})

    await showUserSelection(ctx, userId)
  }
  catch (error) {
    console.error('Error in change role:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * تغيير الدور من صفحة تفاصيل المستخدم
 */
changeRoleHandler.callbackQuery(/^admin:change-role:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])
    changeRoleState.set(userId, { targetUserId })

    await showRoleSelection(ctx, userId, targetUserId)
  }
  catch (error) {
    console.error('Error in change role:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * اختيار الدور الجديد
 */
changeRoleHandler.callbackQuery(/^admin:set-role:(\d+):(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])
    const newRole = ctx.match![2] as Role

    const state = changeRoleState.get(userId) || {}
    state.targetUserId = targetUserId
    state.newRole = newRole
    changeRoleState.set(userId, state)

    await showReasonInput(ctx, userId, targetUserId, newRole)
  }
  catch (error) {
    console.error('Error setting role:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * تخطي السبب أو تأكيد
 */
changeRoleHandler.callbackQuery(/^admin:confirm-role:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    const targetUserId = Number.parseInt(ctx.match![1])
    const state = changeRoleState.get(userId)

    if (!state || !state.newRole) {
      await ctx.answerCallbackQuery('⚠️ حدث خطأ. حاول مرة أخرى')
      return
    }

    await executeRoleChange(ctx, userId, targetUserId, state.newRole, state.reason)
  }
  catch (error) {
    console.error('Error confirming role:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * استقبال السبب من النص
 */
changeRoleHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const state = changeRoleState.get(userId)
  if (!state || !state.targetUserId || !state.newRole) {
    return next()
  }

  const reason = ctx.message.text
  state.reason = reason
  changeRoleState.set(userId, state)

  await ctx.reply('✅ تم حفظ السبب')
  await executeRoleChange(ctx, userId, state.targetUserId, state.newRole, reason)
})

/**
 * عرض اختيار المستخدم
 */
async function showUserSelection(ctx: Context, _currentUserId: number) {
  const users = await RoleManager.searchUsers({ limit: 10 })

  if (users.length === 0) {
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      '🔄 **تغيير دور مستخدم**\n\n'
      + '⚠️ لا يوجد مستخدمون',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  users.slice(0, 8).forEach((user) => {
    const roleEmoji = getRoleEmoji(user.role)
    keyboard.text(
      `${getUserDisplayName(user)} ${roleEmoji}`,
      `admin:change-role:${user.id}`,
    ).row()
  })

  keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

  await ctx.editMessageText(
    '🔄 **تغيير دور مستخدم**\n\n'
    + 'اختر المستخدم الذي تريد تغيير دوره:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * عرض اختيار الدور
 */
async function showRoleSelection(ctx: Context, currentUserId: number, targetUserId: number) {
  const targetUser = await RoleManager.searchUsers({ limit: 100 }).then(
    users => users.find(u => u.id === targetUserId),
  )

  if (!targetUser) {
    await ctx.answerCallbackQuery('⚠️ المستخدم غير موجود')
    return
  }

  const currentUser = ctx.dbUser
  if (!currentUser) {
    await ctx.reply('⛔ خطأ في التحقق من الصلاحيات')
    return
  }

  const roles: Role[] = ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST']
  const keyboard = new InlineKeyboard()

  roles.forEach((role) => {
    // تحقق من أن المستخدم الحالي يمكنه تعيين هذا الدور
    const canAssign = PermissionService.isRoleHigher(currentUser.role, role)

    if (canAssign) {
      const isCurrent = targetUser.role === role
      const emoji = getRoleEmoji(role)
      const name = getRoleNameAr(role)
      const label = isCurrent ? `${emoji} ${name} ← الحالي` : `${emoji} ${name}`

      keyboard.text(label, `admin:set-role:${targetUserId}:${role}`)
    }
    else {
      // عرض الدور لكن غير قابل للضغط
      const emoji = getRoleEmoji(role)
      const name = getRoleNameAr(role)
      keyboard.text(`${emoji} ${name} 🔒`, `admin:no-permission`)
    }
    keyboard.row()
  })

  keyboard.text('❌ إلغاء', 'menu:feature:admin-panel')

  await ctx.editMessageText(
    `🔄 **تغيير دور المستخدم**\n\n`
    + `**المستخدم:** ${getUserDisplayName(targetUser)}\n`
    + `**الدور الحالي:** ${getRoleEmoji(targetUser.role)} ${getRoleNameAr(targetUser.role)}\n\n`
    + 'اختر الدور الجديد:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * عرض إدخال السبب
 */
async function showReasonInput(ctx: Context, currentUserId: number, targetUserId: number, newRole: Role) {
  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `admin:confirm-role:${targetUserId}`)
    .row()
    .text('❌ إلغاء', 'menu:feature:admin-panel')

  await ctx.editMessageText(
    `🔄 **تغيير الدور**\n\n`
    + `**الدور الجديد:** ${getRoleEmoji(newRole)} ${getRoleNameAr(newRole)}\n\n`
    + '📝 **سبب التغيير (اختياري):**\n'
    + 'أرسل السبب في رسالة، أو اضغط تخطي للمتابعة بدون سبب.',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
}

/**
 * تنفيذ تغيير الدور
 */
async function executeRoleChange(
  ctx: Context,
  currentUserId: number,
  targetUserId: number,
  newRole: Role,
  reason?: string,
) {
  try {
    await RoleManager.changeRole({
      userId: targetUserId,
      newRole,
      changedBy: ctx.dbUser!.userId,
      reason,
    })

    const keyboard = new InlineKeyboard()
      .text('✅ عرض المستخدم', `admin:user:view:${targetUserId}`)
      .row()
      .text('🔄 تغيير دور آخر', 'menu:sub:admin-panel:change-role')
      .row()
      .text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.reply(
      `✅ **تم تغيير الدور بنجاح!**\n\n`
      + `**الدور الجديد:** ${getRoleEmoji(newRole)} ${getRoleNameAr(newRole)}\n${
        reason ? `**السبب:** ${reason}\n` : ''}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    changeRoleState.delete(currentUserId)
  }
  catch (error: any) {
    console.error('Error executing role change:', error)

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.reply(
      `❌ **فشل تغيير الدور**\n\n`
      + `**السبب:** ${error.message}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
}

/**
 * معالج عدم وجود صلاحية
 */
changeRoleHandler.callbackQuery('admin:no-permission', async (ctx) => {
  await ctx.answerCallbackQuery({
    text: '⛔ لا يمكنك تعيين هذا الدور',
    show_alert: true,
  })
})

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
