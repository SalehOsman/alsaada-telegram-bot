/**
 * Loading Indicator Utility
 * أدوات مؤشرات التحميل
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

import type { Context } from '#root/bot/context.js'

/**
 * عرض مؤشر تحميل
 */
export async function showLoading(
  ctx: Context,
  message: string = '⏳ جاري المعالجة...'
): Promise<void> {
  try {
    await ctx.answerCallbackQuery({ text: message })
  } catch {
    // Ignore if not a callback query
  }
}

/**
 * عرض مؤشر تحميل مع رسالة
 */
export async function showLoadingMessage(
  ctx: Context,
  message: string = '⏳ جاري المعالجة...\n\nالرجاء الانتظار...'
): Promise<void> {
  try {
    await ctx.reply(message)
  } catch {
    // Ignore errors
  }
}

/**
 * تحديث رسالة التحميل
 */
export async function updateLoadingMessage(
  ctx: Context,
  message: string
): Promise<void> {
  try {
    await ctx.editMessageText(message)
  } catch {
    // Ignore errors
  }
}

/**
 * رسائل تحميل متحركة
 */
export const LoadingMessages = {
  processing: '⏳ جاري المعالجة...',
  saving: '💾 جاري الحفظ...',
  loading: '📥 جاري التحميل...',
  searching: '🔍 جاري البحث...',
  calculating: '🧮 جاري الحساب...',
  exporting: '📊 جاري التصدير...',
  uploading: '📤 جاري الرفع...',
  deleting: '🗑️ جاري الحذف...',
  updating: '✏️ جاري التحديث...',
}

/**
 * عرض مؤشر تحميل حسب العملية
 */
export async function showOperationLoading(
  ctx: Context,
  operation: keyof typeof LoadingMessages
): Promise<void> {
  await showLoading(ctx, LoadingMessages[operation])
}

