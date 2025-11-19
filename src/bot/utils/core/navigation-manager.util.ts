/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🔄 NAVIGATION MANAGER UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Manages conversation navigation and back button functionality.
 * Handles step history, back navigation, and step jumping.
 * 
 * @features
 * ✅ Add back button to keyboards
 * ✅ Track step history
 * ✅ Navigate to previous step
 * ✅ Clear navigation history
 * 
 * @usage
 * ```typescript
 * // Add back button
 * const keyboard = NavigationManager.addBackButton(
 *   baseKeyboard,
 *   'awaiting_name_ar'
 * )
 * 
 * // Handle back navigation
 * await NavigationManager.goBack(ctx)
 * ```
 * 
 * @author Alsaada Bot Team
 * @version 1.0.0
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Context } from '#root/bot/context.js'
import type { InlineKeyboard } from 'grammy'

/**
 * Navigation history entry
 */
export interface NavigationHistoryEntry {
  /** Step identifier */
  step: string
  
  /** Timestamp */
  timestamp: number
  
  /** Optional: saved data at this step */
  data?: Record<string, any>
}

/**
 * Back button configuration
 */
export interface BackButtonConfig {
  /** Button text (default: "⬅️ رجوع") */
  text?: string
  
  /** Target step to go back to */
  targetStep?: string
  
  /** Callback data (auto-generated if not provided) */
  callback?: string
  
  /** Position: 'start' | 'end' (default: 'end') */
  position?: 'start' | 'end'
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * NAVIGATION MANAGER CLASS
 * ════════════════════════════════════════════════════════════════════════════
 */
export class NavigationManager {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ⬅️ ADD BACK BUTTON                                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Adds a back button to existing keyboard.
   * 
   * @param keyboard - Existing inline keyboard
   * @param config - Back button configuration
   * @returns Updated keyboard with back button
   * 
   * @example
   * ```typescript
   * const keyboard = new InlineKeyboard()
   *   .text('✅ تأكيد', 'confirm')
   * 
   * const withBack = NavigationManager.addBackButton(keyboard, {
   *   targetStep: 'awaiting_name_ar'
   * })
   * ```
   */
  static addBackButton(
    keyboard: InlineKeyboard,
    config: BackButtonConfig | string,
  ): InlineKeyboard {
    // Handle string shorthand
    const cfg: BackButtonConfig = typeof config === 'string'
      ? { targetStep: config }
      : config
    
    const {
      text = '⬅️ رجوع',
      targetStep,
      callback,
      position = 'end',
    } = cfg
    
    // Generate callback data
    const callbackData = callback || (targetStep ? `nav:back:${targetStep}` : 'nav:back')
    
    // Create back button
    const backButton = { text, callback_data: callbackData }
    
    // Add to keyboard
    if (position === 'start') {
      keyboard.row(backButton)
    }
    else {
      // Add as last row
      keyboard.row(backButton)
    }
    
    return keyboard
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📝 PUSH TO HISTORY                                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Adds current step to navigation history.
   * 
   * @param ctx - Telegram context
   * @param step - Step identifier
   * @param data - Optional: data to save with this step
   * 
   * @example
   * ```typescript
   * NavigationManager.pushHistory(ctx, 'awaiting_name_ar', {
   *   barcode: '6281234567890'
   * })
   * ```
   */
  static pushHistory(
    ctx: Context,
    step: string,
    data?: Record<string, any>,
  ): void {
    if (!ctx.session.inventoryForm) return
    
    const history = ctx.session.inventoryForm.navigationHistory || []
    
    // Add new entry
    history.push({
      step,
      timestamp: Date.now(),
      data,
    })
    
    // Limit history size (keep last 20 steps)
    if (history.length > 20) {
      history.shift()
    }
    
    ctx.session.inventoryForm.navigationHistory = history
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ⬅️ GO BACK                                                           │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Navigates to previous step in history.
   * 
   * @param ctx - Telegram context
   * @param steps - Optional: number of steps to go back (default: 1)
   * @returns Previous step info or null
   * 
   * @example
   * ```typescript
   * const previous = NavigationManager.goBack(ctx)
   * if (previous) {
   *   ctx.session.inventoryForm.step = previous.step
   *   // Restore data if needed
   * }
   * ```
   */
  static goBack(
    ctx: Context,
    steps = 1,
  ): NavigationHistoryEntry | null {
    if (!ctx.session.inventoryForm) return null
    
    const history = ctx.session.inventoryForm.navigationHistory || []
    
    if (history.length === 0) return null
    
    // Remove current and previous steps
    for (let i = 0; i < steps; i++) {
      history.pop()
    }
    
    // Get previous step
    const previous = history[history.length - 1]
    
    if (!previous) return null
    
    // Update session
    ctx.session.inventoryForm.navigationHistory = history
    
    return previous
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔍 GET PREVIOUS STEP                                                 │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Gets previous step without modifying history.
   * 
   * @param ctx - Telegram context
   * @param steps - Optional: number of steps back (default: 1)
   * @returns Previous step info or null
   * 
   * @example
   * ```typescript
   * const previous = NavigationManager.getPreviousStep(ctx)
   * if (previous) {
   *   console.log(`Previous step: ${previous.step}`)
   * }
   * ```
   */
  static getPreviousStep(
    ctx: Context,
    steps = 1,
  ): NavigationHistoryEntry | null {
    if (!ctx.session.inventoryForm) return null
    
    const history = ctx.session.inventoryForm.navigationHistory || []
    
    if (history.length < steps + 1) return null
    
    return history[history.length - steps - 1]
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🗑️ CLEAR HISTORY                                                     │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Clears navigation history.
   * 
   * @param ctx - Telegram context
   * 
   * @example
   * ```typescript
   * // After completing flow
   * NavigationManager.clearHistory(ctx)
   * ```
   */
  static clearHistory(ctx: Context): void {
    if (!ctx.session.inventoryForm) return
    ctx.session.inventoryForm.navigationHistory = []
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🎯 JUMP TO STEP                                                      │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Jumps to specific step (used for edit functionality).
   * 
   * @param ctx - Telegram context
   * @param targetStep - Target step identifier
   * @param saveData - Save current data before jumping
   * 
   * @example
   * ```typescript
   * // User wants to edit category
   * NavigationManager.jumpToStep(ctx, 'awaiting_category', true)
   * ```
   */
  static jumpToStep(
    ctx: Context,
    targetStep: string,
    saveData = true,
  ): void {
    if (!ctx.session.inventoryForm) return
    
    // Save current state if requested
    if (saveData) {
      this.pushHistory(
        ctx,
        ctx.session.inventoryForm.step,
        ctx.session.inventoryForm.data,
      )
    }
    
    // Update to target step
    ctx.session.inventoryForm.step = targetStep
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📊 GET HISTORY                                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Gets full navigation history.
   * 
   * @param ctx - Telegram context
   * @returns Navigation history array
   * 
   * @example
   * ```typescript
   * const history = NavigationManager.getHistory(ctx)
   * console.log(`Visited ${history.length} steps`)
   * ```
   */
  static getHistory(ctx: Context): NavigationHistoryEntry[] {
    if (!ctx.session.inventoryForm) return []
    return ctx.session.inventoryForm.navigationHistory || []
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔙 CAN GO BACK                                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Checks if back navigation is possible.
   * 
   * @param ctx - Telegram context
   * @returns True if can go back
   * 
   * @example
   * ```typescript
   * if (NavigationManager.canGoBack(ctx)) {
   *   // Show back button
   * }
   * ```
   */
  static canGoBack(ctx: Context): boolean {
    const history = this.getHistory(ctx)
    return history.length > 0
  }
}

