/**
 * Message Tracker Utility
 * تتبع وحذف الرسائل المؤقتة في المحادثات
 * 
 * @description
 * يوفر واجهة موحدة لتتبع الرسائل المرسلة أثناء المحادثات متعددة الخطوات
 * وحذفها جميعاً عند الانتهاء للحفاظ على نظافة المحادثة
 * 
 * @example
 * ```typescript
 * // في بداية المحادثة
 * MessageTracker.init(ctx)
 * 
 * // بعد كل رسالة
 * const msg = await ctx.reply('...')
 * MessageTracker.track(ctx, msg.message_id)
 * 
 * // عند الانتهاء
 * await MessageTracker.deleteAll(ctx)
 * ```
 */

import type { Context } from '#root/bot/context.js'

export class MessageTracker {
  /**
   * تهيئة message tracking للجلسة
   */
  static init(ctx: Context): void {
    if (!ctx.session.inventoryForm) return
    
    if (!ctx.session.inventoryForm.messageIds) {
      ctx.session.inventoryForm.messageIds = []
    }
  }

  /**
   * تتبع message ID جديد
   */
  static track(ctx: Context, messageId: number): void {
    if (!ctx.session.inventoryForm) return
    
    if (!ctx.session.inventoryForm.messageIds) {
      ctx.session.inventoryForm.messageIds = []
    }
    
    if (!ctx.session.inventoryForm.messageIds.includes(messageId)) {
      ctx.session.inventoryForm.messageIds.push(messageId)
    }
  }

  /**
   * تتبع عدة message IDs
   */
  static trackMany(ctx: Context, messageIds: number[]): void {
    for (const id of messageIds) {
      this.track(ctx, id)
    }
  }

  /**
   * حذف message واحد
   */
  static async deleteOne(ctx: Context, messageId: number): Promise<boolean> {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, messageId)
      return true
    }
    catch (error) {
      // Ignore errors (message might be already deleted)
      return false
    }
  }

  /**
   * حذف جميع الرسائل المتتبعة
   */
  static async deleteAll(ctx: Context): Promise<number> {
    const messageIds = ctx.session.inventoryForm?.messageIds || []
    let deleted = 0
    
    for (const msgId of messageIds) {
      const success = await this.deleteOne(ctx, msgId)
      if (success) deleted++
    }
    
    // Clear the tracked messages
    if (ctx.session.inventoryForm) {
      ctx.session.inventoryForm.messageIds = []
    }
    
    return deleted
  }

  /**
   * الحصول على عدد الرسائل المتتبعة
   */
  static count(ctx: Context): number {
    return ctx.session.inventoryForm?.messageIds?.length || 0
  }

  /**
   * مسح جميع IDs بدون حذف
   */
  static clear(ctx: Context): void {
    if (ctx.session.inventoryForm) {
      ctx.session.inventoryForm.messageIds = []
    }
  }

  /**
   * helper: تتبع رسالة مباشرة من reply
   */
  static async trackReply(
    ctx: Context,
    message: string,
    options?: any
  ): Promise<number> {
    const sent = await ctx.reply(message, options)
    this.track(ctx, sent.message_id)
    return sent.message_id
  }

  /**
   * helper: تتبع رسالة من editMessageText
   */
  static async trackEdit(
    ctx: Context,
    message: string,
    options?: any
  ): Promise<number | undefined> {
    const edited = await ctx.editMessageText(message, options)
    
    if (typeof edited === 'object' && 'message_id' in edited) {
      this.track(ctx, edited.message_id)
      return edited.message_id
    }
    
    return undefined
  }
}

