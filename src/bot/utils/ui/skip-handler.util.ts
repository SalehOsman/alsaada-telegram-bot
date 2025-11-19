/**
 * Skip Handler Utility
 * معالجة أزرار التخطي بشكل موحد - يمكن استخدامه في أي conversation
 */

import { InlineKeyboard } from 'grammy'

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
    cancelCallback: string,
  ): InlineKeyboard {
    return new InlineKeyboard()
      .text('⏭️ تخطي', skipCallback)
      .row()
      .text('❌ إلغاء', cancelCallback)
  }
}

