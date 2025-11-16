/**
 * Skip Handler Utility
 * معالجة أزرار التخطي بشكل موحد
 */

import { InlineKeyboard } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { updateSessionStep } from './session-manager.util.js'

export class SkipHandler {
  /**
   * إنشاء زر تخطي
   */
  static createSkipButton(callbackData: string, text: string = '⏭️ تخطي'): InlineKeyboard {
    return new InlineKeyboard().text(text, callbackData)
  }

  /**
   * إنشاء أزرار تخطي وإلغاء
   */
  static createSkipCancelButtons(
    skipCallback: string,
    cancelCallback: string = 'og:items:menu',
  ): InlineKeyboard {
    return new InlineKeyboard()
      .text('⏭️ تخطي', skipCallback)
      .row()
      .text('❌ إلغاء', cancelCallback)
  }

  /**
   * معالجة تخطي خطوة
   */
  static async handleSkip(
    ctx: Context,
    nextStep: string,
    nextMessage: string,
    nextKeyboard?: InlineKeyboard,
  ): Promise<void> {
    await ctx.answerCallbackQuery({ text: '⏭️ تم التخطي' })

    updateSessionStep(ctx, nextStep)

    await ctx.editMessageText(nextMessage, {
      reply_markup: nextKeyboard,
      parse_mode: 'Markdown',
    })
  }

  /**
   * التحقق من إمكانية التخطي
   */
  static canSkip(step: string): boolean {
    const skippableSteps = [
      'awaiting_name_en',
      'awaiting_min_quantity',
      'awaiting_price',
      'awaiting_supplier',
      'awaiting_notes',
      'awaiting_images',
    ]
    return skippableSteps.includes(step)
  }

  /**
   * الحصول على رسالة التخطي
   */
  static getSkipMessage(step: string): string {
    const messages: Record<string, string> = {
      awaiting_name_en: 'تم تخطي الاسم الإنجليزي',
      awaiting_min_quantity: 'تم تخطي الحد الأدنى',
      awaiting_price: 'تم تخطي السعر',
      awaiting_supplier: 'تم تخطي المورد',
      awaiting_notes: 'تم تخطي الملاحظات',
      awaiting_images: 'تم تخطي الصور',
    }
    return messages[step] || 'تم التخطي'
  }
}
