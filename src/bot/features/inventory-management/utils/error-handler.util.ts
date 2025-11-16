/**
 * Error Handler Utility
 * أدوات معالجة الأخطاء
 */

import type { Context } from '#root/bot/context.js'
import { InlineKeyboard } from 'grammy'
import { notifyError } from './notification-helper.util.js'

/**
 * معالجة الأخطاء بشكل موحد
 */
export async function handleError(
  ctx: Context,
  error: any,
  operation: string,
  options: {
    showRetry?: boolean
    retryCallback?: string
    notifyAdmins?: boolean
  } = {}
): Promise<void> {
  const { showRetry = false, retryCallback, notifyAdmins = true } = options
  
  console.error(`Error in ${operation}:`, error)
  
  const errorMessage = getErrorMessage(error)
  
  let message = `❌ **حدث خطأ**\n\n`
  message += `**العملية:** ${operation}\n`
  message += `**التفاصيل:** ${errorMessage}\n\n`
  message += `الرجاء المحاولة مرة أخرى.`
  
  const keyboard = new InlineKeyboard()
  
  if (showRetry && retryCallback) {
    keyboard.text('🔄 إعادة المحاولة', retryCallback).row()
  }
  
  keyboard.text('⬅️ رجوع', 'og:items:menu')
  
  try {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  } catch {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  
  if (notifyAdmins) {
    await notifyError(ctx, operation, errorMessage)
  }
}

/**
 * استخراج رسالة الخطأ
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.code) {
    return `خطأ: ${error.code}`
  }
  
  return 'خطأ غير معروف'
}

/**
 * عرض خطأ مع زر إعادة المحاولة
 */
export async function showErrorWithRetry(
  ctx: Context,
  errorMessage: string,
  retryCallback: string,
  backCallback: string = 'og:items:menu'
): Promise<void> {
  const message = `❌ **حدث خطأ**\n\n${errorMessage}\n\nالرجاء المحاولة مرة أخرى.`
  
  const keyboard = new InlineKeyboard()
    .text('🔄 إعادة المحاولة', retryCallback)
    .row()
    .text('⬅️ رجوع', backCallback)
  
  try {
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  } catch {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
}

/**
 * عرض خطأ بسيط
 */
export async function showSimpleError(
  ctx: Context,
  message: string
): Promise<void> {
  try {
    await ctx.answerCallbackQuery({ text: `❌ ${message}` })
  } catch {
    await ctx.reply(`❌ ${message}`)
  }
}

/**
 * رسائل أخطاء شائعة
 */
export const CommonErrors = {
  notFound: 'العنصر غير موجود',
  invalidInput: 'البيانات المدخلة غير صحيحة',
  insufficientQuantity: 'الكمية المتوفرة غير كافية',
  duplicateCode: 'الكود موجود مسبقاً',
  duplicateBarcode: 'الباركود موجود مسبقاً',
  sessionExpired: 'انتهت الجلسة، الرجاء البدء من جديد',
  unauthorized: 'ليس لديك صلاحية لهذه العملية',
  databaseError: 'خطأ في قاعدة البيانات',
  networkError: 'خطأ في الاتصال',
}
