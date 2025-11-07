/**
 * Features Toggle Handler
 * معالج تفعيل/إيقاف الأقسام
 */

import type { Context } from '#root/bot/context.js'
import { featureRegistry } from '#root/bot/features/registry/index.js'
import { settingsManager } from '#root/modules/settings/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const featuresToggleHandler = new Composer<Context>()

/**
 * Show features toggle menu
 */
featuresToggleHandler.callbackQuery('settings:features', async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery('⛔ غير مصرح')
    return
  }

  const features = featureRegistry.getAll().filter(f => f.config.category !== 'system')
  const keyboard = new InlineKeyboard()

  features.forEach((feature) => {
    const icon = feature.config.enabled ? '✅' : '❌'
    const status = feature.config.enabled ? 'مفعّل' : 'معطّل'
    keyboard
      .text(
        `${icon} ${feature.config.name} (${status})`,
        `settings:feature:toggle:${feature.config.id}`,
      )
      .row()
  })

  keyboard.text('🔙 رجوع للإعدادات', 'settings:main')

  await ctx.editMessageText(
    '🎯 **تفعيل/إيقاف الأقسام**\n\n'
    + 'اختر القسم لتبديل حالته:\n\n'
    + '✅ = مفعّل\n'
    + '❌ = معطّل',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

/**
 * Toggle feature status
 */
featuresToggleHandler.callbackQuery(/^settings:feature:toggle:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery('⛔ غير مصرح')
    return
  }

  const featureId = ctx.match[1]
  const feature = featureRegistry.get(featureId)

  if (!feature) {
    await ctx.answerCallbackQuery('⚠️ القسم غير موجود')
    return
  }

  // Toggle status
  feature.config.enabled = !feature.config.enabled
  const newStatus = feature.config.enabled ? 'مفعّل' : 'معطّل'

  // Save to both settings and database
  const settingKey = `features.${featureId}.enabled`
  try {
    // Save to settings manager
    await settingsManager.set(settingKey, feature.config.enabled, {
      updatedBy: ctx.dbUser.userId,
      reason: `تبديل حالة القسم: ${feature.config.name}`,
    })

    // Also update DepartmentConfig in database if exists
    const { Database } = await import('#root/modules/database/index.js')
    const departmentConfig = await Database.prisma.departmentConfig.findUnique({
      where: { code: featureId },
    })

    if (departmentConfig) {
      await Database.prisma.departmentConfig.update({
        where: { code: featureId },
        data: {
          isEnabled: feature.config.enabled,
          updatedBy: ctx.dbUser.telegramId,
        },
      })
    }
  }
  catch (error) {
    console.error(`Failed to save feature state for ${featureId}:`, error)
  }

  await ctx.answerCallbackQuery(`✅ تم ${newStatus === 'مفعّل' ? 'تفعيل' : 'إيقاف'} القسم`)

  // Refresh the list
  const features = featureRegistry.getAll().filter(f => f.config.category !== 'system')
  const keyboard = new InlineKeyboard()

  features.forEach((f) => {
    const icon = f.config.enabled ? '✅' : '❌'
    const status = f.config.enabled ? 'مفعّل' : 'معطّل'
    keyboard
      .text(
        `${icon} ${f.config.name} (${status})`,
        `settings:feature:toggle:${f.config.id}`,
      )
      .row()
  })

  keyboard.text('🔙 رجوع للإعدادات', 'settings:main')

  await ctx.editMessageText(
    '🎯 **تفعيل/إيقاف الأقسام**\n\n'
    + 'اختر القسم لتبديل حالته:\n\n'
    + '✅ = مفعّل\n'
    + '❌ = معطّل',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})
