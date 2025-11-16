/**
 * Search Helper Utility
 * أدوات مساعدة البحث
 */

import { InlineKeyboard } from 'grammy'

/**
 * بناء keyboard البحث
 */
export function buildSearchKeyboard(
  callbackPrefix: string,
  options: {
    showBarcode?: boolean
    showCode?: boolean
    showName?: boolean
    showCategory?: boolean
    backCallback?: string
  } = {}
): InlineKeyboard {
  const {
    showBarcode = true,
    showCode = true,
    showName = true,
    showCategory = true,
    backCallback,
  } = options
  
  const keyboard = new InlineKeyboard()
  
  if (showBarcode) {
    keyboard.text('📸 صورة الباركود', `${callbackPrefix}:search:barcode`).row()
  }
  
  if (showCode) {
    keyboard.text('🔢 الكود', `${callbackPrefix}:search:code`).row()
  }
  
  if (showName) {
    keyboard.text('📝 الاسم', `${callbackPrefix}:search:name`).row()
  }
  
  if (showCategory) {
    keyboard.text('📦 الفئة', `${callbackPrefix}:search:category`).row()
  }
  
  if (backCallback) {
    keyboard.text('⬅️ رجوع', backCallback)
  }
  
  return keyboard
}

/**
 * معالجة نتائج البحث
 */
export function handleSearchResults<T>(
  items: T[],
  handlers: {
    onEmpty: () => void | Promise<void>
    onSingle: (item: T) => void | Promise<void>
    onMultiple: (items: T[]) => void | Promise<void>
  }
): void | Promise<void> {
  if (items.length === 0) {
    return handlers.onEmpty()
  }
  
  if (items.length === 1) {
    return handlers.onSingle(items[0])
  }
  
  return handlers.onMultiple(items)
}

/**
 * بناء رسالة نتائج البحث
 */
export function buildSearchResultsMessage(
  count: number,
  query?: string
): string {
  let message = '🔍 **نتائج البحث**\n\n'
  
  if (query) {
    message += `**البحث عن:** ${query}\n`
  }
  
  message += `📊 **عدد النتائج:** ${count}\n\n`
  message += '👇 **اختر من القائمة:**'
  
  return message
}

/**
 * بناء رسالة عدم وجود نتائج
 */
export function buildNoResultsMessage(query?: string): string {
  let message = '❌ **لم يتم العثور على نتائج**\n\n'
  
  if (query) {
    message += `**البحث عن:** ${query}\n\n`
  }
  
  message += 'جرب البحث بطريقة أخرى أو تحقق من الإملاء.'
  
  return message
}

/**
 * تنظيف نص البحث
 */
export function cleanSearchQuery(text: string): string {
  return text.trim().toLowerCase()
}

/**
 * التحقق من صلاحية نص البحث
 */
export function isValidSearchQuery(text: string, minLength: number = 2): boolean {
  const cleaned = cleanSearchQuery(text)
  return cleaned.length >= minLength
}
