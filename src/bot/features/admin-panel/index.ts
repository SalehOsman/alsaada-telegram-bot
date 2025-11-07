/**
 * Admin Panel Feature
 *
 * لوحة التحكم الإدارية
 */

import type { Context } from '../../context.js'
import { RoleManager } from '#root/modules/permissions/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer, InlineKeyboard } from 'grammy'
import { adminPanelConfig } from './config.js'
import { banUserHandler } from './handlers/ban-user.js'
import { changeRoleHandler } from './handlers/change-role.js'
import { joinRequestsHandler } from './handlers/join-requests.js'
import { settingsManagerHandler } from './handlers/settings-manager.js'
import { usersListHandler } from './handlers/users-list.js'
// import { rateLimiterHandler } from './handlers/rate-limiter/index.js'

export const composer = new Composer<Context>()

// Register all handlers
composer.use(usersListHandler)
composer.use(changeRoleHandler)
composer.use(banUserHandler)
composer.use(settingsManagerHandler)
composer.use(joinRequestsHandler)
// composer.use(rateLimiterHandler)

/**
 * Statistics Handler
 */
async function showStatistics(ctx: Context) {
  try {
    await ctx.answerCallbackQuery()

    const stats = await RoleManager.getRoleStatistics()

    const keyboard = new InlineKeyboard()
      .text('🔄 تحديث', 'menu:sub:admin-panel:statistics')
      .row()
      .text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      '📊 **إحصائيات المستخدمين**\n\n'
      + `**إجمالي المستخدمين:** ${stats.total}\n`
      + `**النشطون:** ${stats.active}\n`
      + `**غير النشطين:** ${stats.inactive}\n`
      + `**المحظورون:** ${stats.banned}\n\n`
      + '**حسب الأدوار:**\n'
      + `👑 **مدير أعلى:** ${stats.superAdmins}\n`
      + `🛡️ **مدير:** ${stats.admins}\n`
      + `👤 **مستخدم:** ${stats.users}\n`
      + `🌐 **زائر:** ${stats.guests}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error in statistics handler:')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
}

// نمط القائمة القياسي
composer.callbackQuery(/^menu:sub:admin-panel:statistics$/, showStatistics)

// دعم نمط MenuBuilder المباشر بالاسم
composer.callbackQuery('statisticsHandler', showStatistics)

// Export config
export { adminPanelConfig as config }

// Export initialization (optional)
export async function init() {
  logger.info('✅ Admin Panel initialized')
}
