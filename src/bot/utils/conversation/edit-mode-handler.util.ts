/**
 * ════════════════════════════════════════════════════════════════════════════
 * ✏️ EDIT MODE HANDLER UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Centralized handler for edit mode in multi-step conversations.
 * Automatically detects edit mode and returns to review screen.
 * 
 * @features
 * ✅ Auto-detect edit mode
 * ✅ Show success message
 * ✅ Clear edit state
 * ✅ Return to review screen
 * ✅ Reusable across all flows
 * 
 * @usage
 * ```typescript
 * // In any input handler
 * if (await EditModeHandler.handleIfEditMode(ctx, 'الاسم', YourFlow.showFinalReview)) {
 *   return true
 * }
 * // Continue with normal flow...
 * ```
 * 
 * @author Alsaada Bot Team
 * @version 1.0.0
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Context } from '#root/bot/context.js'
import { buildSuccessMessage } from '#root/bot/utils/ui/message-builder.util.js'

/**
 * Edit mode completion callback
 */
export type EditModeCallback = (ctx: Context) => Promise<void>

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EDIT MODE HANDLER CLASS
 * ════════════════════════════════════════════════════════════════════════════
 */
export class EditModeHandler {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ✏️ HANDLE IF EDIT MODE                                               │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Checks if currently in edit mode and handles the completion.
   * 
   * @param ctx - Telegram context
   * @param fieldLabel - Field label in Arabic (e.g., 'الاسم', 'الكمية')
   * @param reviewCallback - Callback to show review screen
   * @param skipMessage - Skip success message (default: false)
   * @returns True if in edit mode (handler should stop), false otherwise
   * 
   * @example
   * ```typescript
   * // In handleNameInput
   * if (await EditModeHandler.handleIfEditMode(ctx, 'الاسم', AddItemFlow.showFinalReview)) {
   *   return true // Stop processing, already returned to review
   * }
   * // Continue normal flow...
   * ```
   */
  static async handleIfEditMode(
    ctx: Context,
    fieldLabel: string,
    reviewCallback: EditModeCallback,
    skipMessage = false,
  ): Promise<boolean> {
    const state = ctx.session.inventoryForm
    
    // Not in edit mode - continue normal flow
    if (!state?.editMode) {
      return false
    }
    
    // In edit mode - complete edit and return to review
    
    // Show success message (unless skipped)
    if (!skipMessage) {
      await ctx.reply(buildSuccessMessage(`تحديث ${fieldLabel}`))
    }
    
    // Clear edit state
    state.editMode = false
    state.editingField = undefined
    state.returnToStep = undefined
    
    // Return to review screen
    await reviewCallback(ctx)
    
    // Signal that we're done (caller should stop processing)
    return true
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔍 IS EDIT MODE                                                      │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Checks if currently in edit mode (without handling).
   * 
   * @param ctx - Telegram context
   * @returns True if in edit mode
   * 
   * @example
   * ```typescript
   * if (EditModeHandler.isEditMode(ctx)) {
   *   // Do something different in edit mode
   * }
   * ```
   */
  static isEditMode(ctx: Context): boolean {
    return ctx.session.inventoryForm?.editMode === true
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ✅ COMPLETE EDIT (Selection-based fields)                            │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Handles edit completion for selection-based fields (category, location, unit).
   * Should be called BEFORE updating the step.
   * 
   * @param ctx - Telegram context
   * @param fieldLabel - Field label in Arabic
   * @param reviewCallback - Callback to show review screen
   * @returns True if in edit mode (handler should stop), false otherwise
   * 
   * @example
   * ```typescript
   * // In selectCategory
   * if (await EditModeHandler.completeEdit(ctx, 'الفئة', AddItemFlow.showFinalReview)) {
   *   return // Stop processing
   * }
   * ```
   */
  static async completeEdit(
    ctx: Context,
    fieldLabel: string,
    reviewCallback: EditModeCallback,
  ): Promise<boolean> {
    return this.handleIfEditMode(ctx, fieldLabel, reviewCallback, false)
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🚀 START EDIT                                                        │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Starts edit mode for a specific field.
   * 
   * @param ctx - Telegram context
   * @param fieldKey - Field identifier (e.g., 'nameAr', 'quantity')
   * @param targetStep - Target step for editing
   * @param returnToStep - Step to return to after edit (default: 'awaiting_final_review')
   * 
   * @example
   * ```typescript
   * EditModeHandler.startEdit(ctx, 'nameAr', 'awaiting_name_ar')
   * ```
   */
  static startEdit(
    ctx: Context,
    fieldKey: string,
    targetStep: string,
    returnToStep = 'awaiting_final_review',
  ): void {
    if (!ctx.session.inventoryForm) return
    
    ctx.session.inventoryForm.editMode = true
    ctx.session.inventoryForm.editingField = fieldKey
    ctx.session.inventoryForm.returnToStep = returnToStep
    ctx.session.inventoryForm.step = targetStep
  }
}

