/**
 * Confirmation Dialog Utility
 * أدوات حوارات التأكيد
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

import type { Context } from '#root/bot/context.js'
import { InlineKeyboard } from 'grammy'

/**
 * عرض حوار تأكيد
 */
export async function showConfirmDialog(
  ctx: Context,
  options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    confirmCallback: string
    cancelCallback: string
    warning?: string
  }
): Promise<void> {
  const {
    title,
    message,
    confirmText = '✅ تأكيد',
    cancelText = '❌ إلغاء',
    confirmCallback,
    cancelCallback,
    warning,
  } = options
  
  let text = `⚠️ **${title}**\n\n${message}`
  
  if (warning) {
    text += `\n\n⚠️ **تحذير:** ${warning}`
  }
  
  const keyboard = new InlineKeyboard()
    .text(confirmText, confirmCallback)
    .row()
    .text(cancelText, cancelCallback)
  
  await ctx.editMessageText(text, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * تأكيد الحذف
 */
export async function showDeleteConfirm(
  ctx: Context,
  itemName: string,
  itemCode: string,
  confirmCallback: string,
  cancelCallback: string
): Promise<void> {
  await showConfirmDialog(ctx, {
    title: 'تأكيد الحذف',
    message: `هل أنت متأكد من حذف:\n\n**${itemName}**\nالكود: \`${itemCode}\``,
    confirmText: '✅ نعم، احذف',
    cancelText: '❌ إلغاء',
    confirmCallback,
    cancelCallback,
    warning: 'سيتم الحذف الناعم (يمكن استرجاع البيانات لاحقاً)',
  })
}

/**
 * تأكيد العملية
 */
export async function showOperationConfirm(
  ctx: Context,
  operation: string,
  details: string,
  confirmCallback: string,
  cancelCallback: string
): Promise<void> {
  await showConfirmDialog(ctx, {
    title: `تأكيد ${operation}`,
    message: details,
    confirmText: '✅ تأكيد',
    cancelText: '❌ إلغاء',
    confirmCallback,
    cancelCallback,
  })
}

/**
 * تأكيد مع خيارات متعددة
 */
export async function showMultiOptionDialog(
  ctx: Context,
  title: string,
  message: string,
  options: Array<{ text: string; callback: string }>
): Promise<void> {
  let text = `**${title}**\n\n${message}`
  
  const keyboard = new InlineKeyboard()
  
  for (const option of options) {
    keyboard.text(option.text, option.callback).row()
  }
  
  await ctx.editMessageText(text, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

/**
 * رسالة نجاح مع خيارات
 */
export async function showSuccessWithOptions(
  ctx: Context,
  message: string,
  options: Array<{ text: string; callback: string }>
): Promise<void> {
  const keyboard = new InlineKeyboard()
  
  for (const option of options) {
    keyboard.text(option.text, option.callback).row()
  }
  
  await ctx.editMessageText(`✅ ${message}`, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

