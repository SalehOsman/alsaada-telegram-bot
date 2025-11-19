/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🔄 CONVERSATION STEP UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Standardized conversation flow helpers for multi-step dialogs.
 * Reduces boilerplate code by 70%+ in conversation handlers.
 * 
 * @features
 * ✅ Auto-handles session updates
 * ✅ Auto-tracks messages for cleanup
 * ✅ Standardized keyboard patterns
 * ✅ Skip/Cancel button automation
 * ✅ Success/error message formatting
 * 
 * @usage
 * ```typescript
 * // Before (12 lines):
 * updateSessionStep(ctx, 'awaiting_notes', { supplierName: text })
 * const keyboard = buildActionButtons([...])
 * const msg = await ctx.reply('...')
 * MessageTracker.track(ctx, msg.message_id)
 * 
 * // After (1 line):
 * await ConversationStep.prompt(ctx, { nextStep: 'awaiting_notes', ... })
 * ```
 * 
 * @author Alsaada Bot Team
 * @version 2.0.0
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Context } from '#root/bot/context.js'
import { updateSessionStep } from '../core/session-manager.util.js'
import { buildActionButtons, addBackButton } from './keyboard-builder.util.js'
import { MessageTracker } from './message-tracker.util.js'
import { ProgressIndicator } from './progress-indicator.util.js'
import { NavigationManager } from '../core/navigation-manager.util.js'

/**
 * Configuration for conversation step prompts
 */
export interface StepPromptConfig {
  /** Next step identifier */
  nextStep: string
  
  /** Data to merge into session */
  data?: Record<string, any>
  
  /** Main message to display */
  message: string
  
  /** Skip button callback (optional) */
  skipCallback?: string
  
  /** Skip button text (default: '⏭️ تخطي') */
  skipText?: string
  
  /** Cancel button callback */
  cancelCallback: string
  
  /** Cancel button text (default: '❌ إلغاء') */
  cancelText?: string
  
  /** Use editMessageText instead of reply (default: false) */
  useEdit?: boolean
  
  /** Track message for cleanup (default: true) */
  trackMessage?: boolean
  
  /** Show progress indicator (default: false) */
  showProgress?: boolean
  
  /** Add back button (default: false) */
  addBackButton?: boolean
}

/**
 * Configuration for skip handlers
 */
export interface StepSkipConfig {
  /** Field name that was skipped (for message) */
  skippedField: string
  
  /** Next step identifier */
  nextStep: string
  
  /** Next prompt message */
  nextPrompt: string
  
  /** Skip button callback for next step (optional) */
  skipCallback?: string
  
  /** Skip button text (default: '⏭️ تخطي') */
  skipText?: string
  
  /** Cancel button callback */
  cancelCallback: string
  
  /** Cancel button text (default: '❌ إلغاء') */
  cancelText?: string
  
  /** Default value to set (optional) */
  defaultValue?: any
  
  /** Key to store default value (if different from skippedField) */
  valueKey?: string
}

/**
 * Configuration for confirmation prompts
 */
export interface StepConfirmConfig {
  /** Confirmation message */
  message: string
  
  /** Confirm button text */
  confirmText: string
  
  /** Confirm callback */
  confirmCallback: string
  
  /** Cancel button text (default: '❌ إلغاء') */
  cancelText?: string
  
  /** Cancel callback */
  cancelCallback: string
  
  /** Additional action buttons (optional) */
  additionalButtons?: Array<{ text: string, callback: string }>
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * 🎯 MAIN CONVERSATION STEP UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 */
export class ConversationStep {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📝 PROMPT FOR INPUT                                                  │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Handles the full flow of asking for input:
   * 1. Updates session with next step and data
   * 2. Builds standardized keyboard (skip/cancel)
   * 3. Sends message (reply or edit)
   * 4. Tracks message for cleanup
   * 
   * @example
   * await ConversationStep.prompt(ctx, {
   *   nextStep: 'awaiting_notes',
   *   data: { supplierName: text },
   *   message: `✅ **المورد:** ${text}\n\n📝 **أدخل ملاحظات:**`,
   *   skipCallback: 'og:items:add:skip_notes',
   *   cancelCallback: 'og:items:menu'
   * })
   */
  static async prompt(ctx: Context, config: StepPromptConfig): Promise<void> {
    // 0. Push to navigation history
    if (ctx.session.inventoryForm) {
      NavigationManager.pushHistory(ctx, config.nextStep, config.data)
    }
    
    // 1. Update session
    updateSessionStep(ctx, config.nextStep, config.data || {})
    
    // 2. Build keyboard
    const buttons: Array<{ text: string, callback: string }> = []
    
    if (config.skipCallback) {
      buttons.push({
        text: config.skipText || '⏭️ تخطي',
        callback: config.skipCallback,
      })
    }
    
    buttons.push({
      text: config.cancelText || '❌ إلغاء',
      callback: config.cancelCallback,
    })
    
    let keyboard = buildActionButtons(buttons)
    
    // 2a. Add back button if requested
    if (config.addBackButton && NavigationManager.canGoBack(ctx)) {
      keyboard = NavigationManager.addBackButton(keyboard, {
        callback: 'nav:back',
        position: 'end',
      })
    }
    
    // 3. Build final message with progress indicator
    let finalMessage = config.message
    
    if (config.showProgress) {
      const progress = ProgressIndicator.addItemFlow(config.nextStep)
      finalMessage = progress + '\n\n' + config.message
    }
    
    // 4. Send message
    const sendOptions = {
      reply_markup: keyboard,
      parse_mode: 'Markdown' as const,
    }
    
    if (config.useEdit) {
      await ctx.editMessageText(finalMessage, sendOptions)
    }
    else {
      const sentMessage = await ctx.reply(finalMessage, sendOptions)
      
      // 5. Track message (default: true)
      if (config.trackMessage !== false) {
        MessageTracker.track(ctx, sentMessage.message_id)
      }
    }
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ⏭️ SKIP HANDLER                                                      │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Standardized skip flow:
   * 1. Updates session with next step
   * 2. Sets default value (if provided)
   * 3. Shows "skipped" message
   * 4. Prompts for next input
   * 
   * @example
   * await ConversationStep.skip(ctx, {
   *   skippedField: 'المورد',
   *   nextStep: 'awaiting_notes',
   *   nextPrompt: '📝 **أدخل ملاحظات:**',
   *   skipCallback: 'og:items:add:skip_notes',
   *   cancelCallback: 'og:items:menu'
   * })
   */
  static async skip(ctx: Context, config: StepSkipConfig): Promise<void> {
    const state = ctx.session.inventoryForm
    if (!state) return
    
    // Prepare data with default value
    const data: Record<string, any> = {}
    if (config.defaultValue !== undefined) {
      const key = config.valueKey || config.skippedField
      data[key] = config.defaultValue
    }
    
    // Update session
    updateSessionStep(ctx, config.nextStep, data)
    
    // Build keyboard
    const buttons: Array<{ text: string, callback: string }> = []
    
    if (config.skipCallback) {
      buttons.push({
        text: config.skipText || '⏭️ تخطي',
        callback: config.skipCallback,
      })
    }
    
    buttons.push({
      text: config.cancelText || '❌ إلغاء',
      callback: config.cancelCallback,
    })
    
    const keyboard = buildActionButtons(buttons)
    
    // Show skip message + next prompt
    await ctx.editMessageText(
      `⏭️ **تم تخطي ${config.skippedField}**\n\n${config.nextPrompt}`,
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      },
    )
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ✅ CONFIRMATION DIALOG                                               │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Standardized confirmation pattern:
   * 1. Shows message with confirm/cancel buttons
   * 2. Optional additional action buttons
   * 
   * @example
   * await ConversationStep.confirm(ctx, {
   *   message: '📋 **مراجعة البيانات:**\n\n...',
   *   confirmText: '✅ حفظ',
   *   confirmCallback: 'og:items:add:save',
   *   cancelCallback: 'og:items:menu'
   * })
   */
  static async confirm(ctx: Context, config: StepConfirmConfig): Promise<void> {
    const buttons: Array<{ text: string, callback: string }> = []
    
    // Add additional buttons first (if any)
    if (config.additionalButtons) {
      buttons.push(...config.additionalButtons)
    }
    
    // Add confirm button
    buttons.push({
      text: config.confirmText,
      callback: config.confirmCallback,
    })
    
    // Add cancel button
    buttons.push({
      text: config.cancelText || '❌ إلغاء',
      callback: config.cancelCallback,
    })
    
    const keyboard = buildActionButtons(buttons)
    
    await ctx.editMessageText(config.message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔄 PROMPT WITH DEFAULT VALUE                                         │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Special case: Ask for input with a suggested default value
   * 
   * @example
   * await ConversationStep.promptWithDefault(ctx, {
   *   nextStep: 'awaiting_unit_capacity',
   *   data: { unit: 'جالون' },
   *   message: '📦 **أدخل سعة الوحدة (باللتر):**',
   *   defaultValue: 20,
   *   confirmDefaultCallback: 'og:items:add:confirm_capacity:20',
   *   cancelCallback: 'og:items:menu'
   * })
   */
  static async promptWithDefault(
    ctx: Context,
    config: {
      nextStep: string
      data?: Record<string, any>
      message: string
      defaultValue: any
      confirmDefaultCallback: string
      confirmDefaultText?: string
      cancelCallback: string
      useEdit?: boolean
    },
  ): Promise<void> {
    // Update session
    updateSessionStep(ctx, config.nextStep, config.data || {})
    
    // Build keyboard
    const keyboard = buildActionButtons([
      {
        text: config.confirmDefaultText || `✅ استخدام ${config.defaultValue}`,
        callback: config.confirmDefaultCallback,
      },
      {
        text: '❌ إلغاء',
        callback: config.cancelCallback,
      },
    ])
    
    // Build full message with default hint
    const fullMessage = `${config.message}\n\n💡 *الافتراضي: ${config.defaultValue}*`
    
    // Send message
    if (config.useEdit) {
      await ctx.editMessageText(fullMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
    }
    else {
      await ctx.reply(fullMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      })
    }
  }
}

