/**
 * Ban Check Middleware
 *
 * Prevents banned users from interacting with the bot.
 * Must be placed after loadUserPermissions middleware.
 */

import type { Context } from '#root/bot/context.js'
import type { Middleware } from 'grammy'

export function banCheck(): Middleware<Context> {
  return async (ctx, next) => {
    // Skip for non-message updates (like inline queries)
    if (!ctx.from)
      return next()

    // Check if user is loaded and banned
    if (ctx.dbUser?.isBanned) {
      // Get ban reason if available
      const reason = ctx.dbUser.bannedReason || 'انتهاك شروط الاستخدام'
      const bannedAt = ctx.dbUser.bannedAt
        ? new Date(ctx.dbUser.bannedAt).toLocaleDateString('ar-EG')
        : ''

      // Send ban notification
      await ctx.reply(
        `🚫 **تم حظر حسابك**\n\n`
        + `**السبب:** ${reason}\n`
        + `${bannedAt ? `**التاريخ:** ${bannedAt}\n` : ''}`
        + `\nللاستفسار، تواصل مع الإدارة.`,
        { parse_mode: 'Markdown' },
      ).catch(() => {
        // Ignore if we can't send message (e.g., user blocked bot)
      })

      // Stop processing this update
      return
    }

    // User is not banned, continue
    await next()
  }
}
