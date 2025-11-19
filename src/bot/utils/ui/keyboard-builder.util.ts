/**
 * Keyboard Builder Utility
 * أدوات بناء لوحات المفاتيح
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

import { InlineKeyboard } from 'grammy'

/**
 * بناء keyboard للأصناف (2 في كل صف)
 */
export function buildItemsKeyboard(
  items: Array<{
    id: number
    nameAr: string
    quantity?: number
    minQuantity?: number
  }>,
  callbackPrefix: string,
  options: {
    itemsPerRow?: number
    showWarning?: boolean
    showQuantity?: boolean
    pageParam?: string
    extraParams?: string
  } = {}
): InlineKeyboard {
  const {
    itemsPerRow = 2,
    showWarning = true,
    showQuantity = true,
    pageParam = '',
    extraParams = '',
  } = options
  
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < items.length; i += itemsPerRow) {
    for (let j = 0; j < itemsPerRow && i + j < items.length; j++) {
      const item = items[i + j]
      
      let text = item.nameAr
      
      if (showQuantity && item.quantity !== undefined) {
        text += ` (${item.quantity})`
      }
      
      if (showWarning && item.quantity !== undefined && item.minQuantity !== undefined) {
        if (item.quantity <= item.minQuantity) {
          text = `⚠️ ${text}`
        }
      }
      
      keyboard.text(text, `${callbackPrefix}:${item.id}${pageParam}${extraParams}`)
    }
    keyboard.row()
  }
  
  return keyboard
}

/**
 * بناء keyboard للفئات
 */
export function buildCategoriesKeyboard(
  categories: Array<{ id: number; nameAr: string }>,
  callbackPrefix: string,
  options: {
    itemsPerRow?: number
    extraParams?: string
  } = {}
): InlineKeyboard {
  const { itemsPerRow = 2, extraParams = '' } = options
  
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < categories.length; i += itemsPerRow) {
    for (let j = 0; j < itemsPerRow && i + j < categories.length; j++) {
      const cat = categories[i + j]
      keyboard.text(cat.nameAr, `${callbackPrefix}:${cat.id}${extraParams}`)
    }
    keyboard.row()
  }
  
  return keyboard
}

/**
 * بناء أزرار الإجراءات
 */
export function buildActionButtons(
  actions: Array<{ text: string; callback: string }>,
  itemsPerRow: number = 2
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  
  for (let i = 0; i < actions.length; i += itemsPerRow) {
    for (let j = 0; j < itemsPerRow && i + j < actions.length; j++) {
      const action = actions[i + j]
      keyboard.text(action.text, action.callback)
    }
    keyboard.row()
  }
  
  return keyboard
}

/**
 * إضافة زر الرجوع
 */
export function addBackButton(
  keyboard: InlineKeyboard,
  backCallback: string,
  text: string = '⬅️ رجوع'
): InlineKeyboard {
  keyboard.text(text, backCallback)
  return keyboard
}

/**
 * بناء keyboard تأكيد
 */
export function buildConfirmKeyboard(
  confirmCallback: string,
  cancelCallback: string,
  options: {
    confirmText?: string
    cancelText?: string
  } = {}
): InlineKeyboard {
  const {
    confirmText = '✅ تأكيد',
    cancelText = '❌ إلغاء',
  } = options
  
  return new InlineKeyboard()
    .text(confirmText, confirmCallback)
    .row()
    .text(cancelText, cancelCallback)
}

