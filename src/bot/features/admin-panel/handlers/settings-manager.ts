/**
 * Settings Manager Admin Panel Handler
 *
 * UI for managing bot settings from Telegram.
 */

import type { Context } from '#root/bot/context.js'
import type { SettingCategory } from '#root/modules/settings/types.js'
import { logger } from '#root/modules/services/logger/index.js'
import { settingsManager } from '#root/modules/settings/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const settingsManagerHandler = new Composer<Context>()

/**
 * Main settings menu
 */
settingsManagerHandler.callbackQuery('admin:settings', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const categories: SettingCategory[] = [
      'bot',
      'security',
      'notifications',
      'features',
      'database',
      'performance',
      'logging',
    ]

    const keyboard = new InlineKeyboard()

    // Category buttons (2 per row)
    categories.forEach((category, index) => {
      const icon = getCategoryIcon(category)
      const label = getCategoryLabel(category)
      keyboard.text(`${icon} ${label}`, `admin:settings:category:${category}`)
      if ((index + 1) % 2 === 0)
        keyboard.row()
    })

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'admin:back')

    await ctx.editMessageText(
      '⚙️ **إدارة الإعدادات**\n\n'
      + 'اختر الفئة التي تريد تعديل إعداداتها:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing settings menu')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

// دعم نمط MenuBuilder المباشر بالاسم
settingsManagerHandler.callbackQuery('settingsManagerHandler', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const categories: SettingCategory[] = [
      'bot',
      'security',
      'notifications',
      'features',
      'database',
      'performance',
      'logging',
    ]

    const keyboard = new InlineKeyboard()
    categories.forEach((category, index) => {
      const icon = getCategoryIcon(category)
      const label = getCategoryLabel(category)
      keyboard.text(`${icon} ${label}`, `admin:settings:category:${category}`)
      if ((index + 1) % 2 === 0)
        keyboard.row()
    })
    keyboard.row().text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      '⚙️ **إدارة الإعدادات**\n\n' + 'اختر الفئة التي تريد تعديل إعداداتها:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing settings menu (direct)')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Settings category view
 */
settingsManagerHandler.callbackQuery(/^admin:settings:category:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const category = ctx.match[1] as SettingCategory
    const settings = settingsManager.getDefinitionsByCategory(category)
      .filter(s => s.isEditable !== false)
      .sort((a, b) => (a.order || 999) - (b.order || 999))

    if (settings.length === 0) {
      await ctx.editMessageText(
        '⚠️ لا توجد إعدادات قابلة للتعديل في هذه الفئة.',
        {
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'admin:settings'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    for (const setting of settings) {
      const currentValue = await settingsManager.get(setting.key)
      const valueDisplay = formatValue(currentValue, setting.type)
      keyboard.text(
        `${setting.description || setting.key}: ${valueDisplay}`,
        `admin:settings:edit:${setting.key}`,
      )
      keyboard.row()
    }

    keyboard.text('⬅️ رجوع', 'admin:settings')

    const categoryLabel = getCategoryLabel(category)
    await ctx.editMessageText(
      `⚙️ **إعدادات: ${categoryLabel}**\n\n`
      + 'اختر الإعداد الذي تريد تعديله:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing category settings')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Edit setting view
 */
settingsManagerHandler.callbackQuery(/^admin:settings:edit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const key = ctx.match[1]
    const definition = settingsManager.getDefinition(key)

    if (!definition) {
      await ctx.answerCallbackQuery('الإعداد غير موجود')
      return
    }

    const currentValue = await settingsManager.get(key)
    const valueDisplay = formatValue(currentValue, definition.type)

    let message = `⚙️ **تعديل إعداد**\n\n`
    message += `**الاسم:** ${definition.description || key}\n`
    message += `**المفتاح:** \`${key}\`\n`
    message += `**النوع:** ${definition.type}\n`
    message += `**القيمة الحالية:** ${valueDisplay}\n`
    message += `**القيمة الافتراضية:** ${formatValue(definition.defaultValue, definition.type)}\n`

    if (definition.requiresRestart) {
      message += `\n⚠️ _تغيير هذا الإعداد يتطلب إعادة تشغيل البوت_\n`
    }

    const keyboard = new InlineKeyboard()

    // Different actions based on type
    if (definition.type === 'boolean') {
      keyboard.text(
        currentValue === true ? '❌ تعطيل' : '✅ تفعيل',
        `admin:settings:toggle:${key}`,
      )
      keyboard.row()
    }
    else {
      keyboard.text('✏️ تعديل القيمة', `admin:settings:set:${key}`)
      keyboard.row()
    }

    keyboard.text('🔄 إعادة تعيين للافتراضي', `admin:settings:reset:${key}`)
    keyboard.row()
    keyboard.text('📊 عرض السجل', `admin:settings:history:${key}`)
    keyboard.row()
    keyboard.text('⬅️ رجوع', `admin:settings:category:${definition.category}`)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing setting edit view')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Toggle boolean setting
 */
settingsManagerHandler.callbackQuery(/^admin:settings:toggle:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const key = ctx.match[1]
    const definition = settingsManager.getDefinition(key)

    if (!definition || definition.type !== 'boolean') {
      await ctx.answerCallbackQuery('إعداد غير صالح')
      return
    }

    const currentValue = await settingsManager.get<boolean>(key)
    const newValue = !currentValue

    const success = await settingsManager.set(key, newValue, {
      updatedBy: ctx.dbUser?.userId,
    })

    if (success) {
      await ctx.answerCallbackQuery(`✅ تم ${newValue ? 'التفعيل' : 'التعطيل'}`)

      // Refresh the view
      await ctx.callbackQuery.message?.editText(
        `⚙️ **تعديل إعداد**\n\n`
        + `**الاسم:** ${definition.description || key}\n`
        + `**المفتاح:** \`${key}\`\n`
        + `**القيمة الحالية:** ${newValue ? '✅ مفعل' : '❌ معطل'}\n\n${
          definition.requiresRestart ? '⚠️ _يتطلب إعادة تشغيل البوت_\n' : ''}`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text(newValue ? '❌ تعطيل' : '✅ تفعيل', `admin:settings:toggle:${key}`)
            .row()
            .text('🔄 إعادة تعيين للافتراضي', `admin:settings:reset:${key}`)
            .row()
            .text('⬅️ رجوع', `admin:settings:category:${definition.category}`),
        },
      )
    }
    else {
      await ctx.answerCallbackQuery('❌ فشل تحديث الإعداد')
    }
  }
  catch (error) {
    logger.error({ error }, 'Error toggling setting')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Reset setting to default
 */
settingsManagerHandler.callbackQuery(/^admin:settings:reset:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const key = ctx.match[1]
    const definition = settingsManager.getDefinition(key)

    if (!definition) {
      await ctx.answerCallbackQuery('الإعداد غير موجود')
      return
    }

    const success = await settingsManager.reset(key, {
      updatedBy: ctx.dbUser?.userId,
    })

    if (success) {
      await ctx.answerCallbackQuery('✅ تمت إعادة التعيين للقيمة الافتراضية')

      // Refresh the view by navigating back to edit view
      const currentValue = await settingsManager.get(key)
      const valueDisplay = formatValue(currentValue, definition.type)

      let message = `⚙️ **تعديل إعداد**\n\n`
      message += `**الاسم:** ${definition.description || key}\n`
      message += `**المفتاح:** \`${key}\`\n`
      message += `**القيمة الحالية:** ${valueDisplay}\n`
      message += `**القيمة الافتراضية:** ${formatValue(definition.defaultValue, definition.type)}\n`

      if (definition.requiresRestart) {
        message += `\n⚠️ _تغيير هذا الإعداد يتطلب إعادة تشغيل البوت_\n`
      }

      const keyboard = new InlineKeyboard()

      if (definition.type === 'boolean') {
        keyboard.text(
          currentValue === true ? '❌ تعطيل' : '✅ تفعيل',
          `admin:settings:toggle:${key}`,
        )
        keyboard.row()
      }
      else {
        keyboard.text('✏️ تعديل القيمة', `admin:settings:set:${key}`)
        keyboard.row()
      }

      keyboard.text('🔄 إعادة تعيين للافتراضي', `admin:settings:reset:${key}`)
      keyboard.row()
      keyboard.text('⬅️ رجوع', `admin:settings:category:${definition.category}`)

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
    }
    else {
      await ctx.answerCallbackQuery('❌ فشلت إعادة التعيين')
    }
  }
  catch (error) {
    logger.error({ error }, 'Error resetting setting')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * View setting history
 */
settingsManagerHandler.callbackQuery(/^admin:settings:history:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const key = ctx.match[1]
    const definition = settingsManager.getDefinition(key)

    if (!definition) {
      await ctx.answerCallbackQuery('الإعداد غير موجود')
      return
    }

    const history = await settingsManager.getHistory(key, 10)

    let message = `📊 **سجل التغييرات: ${definition.description || key}**\n\n`

    if (history.length === 0) {
      message += '_لا توجد تغييرات مسجلة_\n'
    }
    else {
      history.forEach((entry, index) => {
        const date = entry.createdAt.toLocaleString('ar-EG')
        const oldVal = formatValue(entry.oldValue, definition.type)
        const newVal = formatValue(entry.newValue, definition.type)
        message += `**${index + 1}.** ${date}\n`
        message += `   من: ${oldVal}\n`
        message += `   إلى: ${newVal}\n`
        if (entry.reason) {
          message += `   السبب: ${entry.reason}\n`
        }
        message += `\n`
      })
    }

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', `admin:settings:edit:${key}`)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing setting history')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Helper: Get category icon
 */
function getCategoryIcon(category: SettingCategory): string {
  const icons: Record<SettingCategory, string> = {
    general: '⚙️',
    bot: '🤖',
    security: '🔐',
    notifications: '🔔',
    features: '✨',
    database: '💾',
    logging: '📝',
    performance: '⚡',
    ui: '🎨',
    custom: '🔧',
  }
  return icons[category] || '⚙️'
}

/**
 * Helper: Get category label
 */
function getCategoryLabel(category: SettingCategory): string {
  const labels: Record<SettingCategory, string> = {
    general: 'عام',
    bot: 'البوت',
    security: 'الأمان',
    notifications: 'الإشعارات',
    features: 'الميزات',
    database: 'قاعدة البيانات',
    logging: 'السجلات',
    performance: 'الأداء',
    ui: 'الواجهة',
    custom: 'مخصص',
  }
  return labels[category] || category
}

/**
 * Helper: Format value for display
 */
function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) {
    return '_غير محدد_'
  }

  switch (type) {
    case 'boolean':
      return value === true ? '✅ مفعل' : '❌ معطل'
    case 'number':
      return String(value)
    case 'string':
      return `"${value}"`
    case 'array':
      return Array.isArray(value) ? `[${value.length} عنصر]` : '[]'
    case 'json':
      return `\`${JSON.stringify(value)}\``
    default:
      return String(value)
  }
}
