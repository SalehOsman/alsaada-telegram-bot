/**
 * Filter Builder Utility
 * بناء قوائم الفلاتر
 */

import { InlineKeyboard } from 'grammy'

export class FilterBuilder {
  /**
   * بناء قائمة فلاتر
   */
  static buildFilterMenu(
    title: string,
    filters: Array<{ id: number; name: string }>,
    callbackPrefix: string,
    backCallback: string,
  ): { message: string; keyboard: InlineKeyboard } {
    let message = `🔍 **${title}**\n\n`
    message += '📋 **اختر الفلتر:**'

    const keyboard = new InlineKeyboard()

    for (const filter of filters) {
      keyboard.text(filter.name, `${callbackPrefix}:${filter.id}`).row()
    }

    keyboard.text('⬅️ رجوع', backCallback)

    return { message, keyboard }
  }

  /**
   * بناء شريط فلاتر نشطة
   */
  static buildActiveFilters(filters: Record<string, any>): string {
    const active = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${value}`)

    if (active.length === 0) return ''

    return `\n🔍 **الفلاتر النشطة:**\n${active.join('\n')}\n`
  }

  /**
   * بناء keyboard فلاتر متعددة
   */
  static buildMultiFilterKeyboard(
    filters: Array<{
      label: string
      callback: string
      isActive?: boolean
    }>,
    backCallback: string,
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard()

    for (const filter of filters) {
      const icon = filter.isActive ? '✅' : '⬜'
      keyboard.text(`${icon} ${filter.label}`, filter.callback).row()
    }

    keyboard.text('⬅️ رجوع', backCallback)

    return keyboard
  }

  /**
   * إضافة زر إزالة الفلتر
   */
  static addClearFilterButton(
    keyboard: InlineKeyboard,
    clearCallback: string,
  ): InlineKeyboard {
    return keyboard.text('❌ إزالة الفلتر', clearCallback)
  }
}
