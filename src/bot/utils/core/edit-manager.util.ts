/**
 * ════════════════════════════════════════════════════════════════════════════
 * ✏️ EDIT MANAGER UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Manages edit functionality in review/final confirmation screens.
 * Allows users to modify specific fields before saving.
 * 
 * @features
 * ✅ Build edit menu with field selection
 * ✅ Jump to specific field for editing
 * ✅ Preserve other data during edit
 * ✅ Return to review after edit
 * 
 * @usage
 * ```typescript
 * // Build edit menu
 * const keyboard = EditManager.buildEditMenu({
 *   nameAr: 'الاسم (عربي)',
 *   category: 'الفئة',
 *   quantity: 'الكمية'
 * }, 'og:items:add')
 * 
 * // Handle edit request
 * await EditManager.handleEdit(ctx, 'nameAr', 'awaiting_name_ar')
 * ```
 * 
 * @author Alsaada Bot Team
 * @version 1.0.0
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { Context } from '#root/bot/context.js'
import { InlineKeyboard } from 'grammy'
import { NavigationManager } from './navigation-manager.util.js'

/**
 * Editable field configuration
 */
export interface EditableField {
  /** Field identifier (e.g., 'nameAr') */
  key: string
  
  /** Display name (Arabic) */
  label: string
  
  /** Target step for editing */
  targetStep: string
  
  /** Current value (for display) */
  currentValue?: string | number
  
  /** Optional: icon emoji */
  icon?: string
  
  /** Optional: disable edit for this field */
  disabled?: boolean
}

/**
 * Edit menu configuration
 */
export interface EditMenuConfig {
  /** List of editable fields */
  fields: EditableField[]
  
  /** Callback prefix (e.g., 'og:items:add') */
  callbackPrefix: string
  
  /** Show current values in menu */
  showValues?: boolean
  
  /** Number of columns (default: 1) */
  columns?: number
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * EDIT MANAGER CLASS
 * ════════════════════════════════════════════════════════════════════════════
 */
export class EditManager {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📋 BUILD EDIT MENU                                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Builds an inline keyboard with editable fields.
   * 
   * @param config - Edit menu configuration
   * @returns Inline keyboard with edit options
   * 
   * @example
   * ```typescript
   * const keyboard = EditManager.buildEditMenu({
   *   fields: [
   *     { key: 'nameAr', label: 'الاسم (عربي)', targetStep: 'awaiting_name_ar' },
   *     { key: 'quantity', label: 'الكمية', targetStep: 'awaiting_quantity' }
   *   ],
   *   callbackPrefix: 'og:items:add'
   * })
   * ```
   */
  static buildEditMenu(config: EditMenuConfig): InlineKeyboard {
    const {
      fields,
      callbackPrefix,
      showValues = false,
      columns = 1,
    } = config
    
    const keyboard = new InlineKeyboard()
    
    // Add field edit buttons
    let currentRow: Array<{ text: string, callback_data: string }> = []
    
    for (const field of fields) {
      if (field.disabled) continue
      
      // Build button text
      let text = field.icon ? `${field.icon} ${field.label}` : field.label
      
      if (showValues && field.currentValue !== undefined) {
        const valueStr = typeof field.currentValue === 'number'
          ? field.currentValue.toString()
          : field.currentValue.substring(0, 15)
        
        text += `: ${valueStr}...`
      }
      
      // Build callback data
      const callbackData = `${callbackPrefix}:edit:${field.key}`
      
      currentRow.push({ text, callback_data: callbackData })
      
      // Add row when full
      if (currentRow.length === columns) {
        keyboard.row(...currentRow)
        currentRow = []
      }
    }
    
    // Add remaining buttons
    if (currentRow.length > 0) {
      keyboard.row(...currentRow)
    }
    
    return keyboard
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ✏️ HANDLE EDIT                                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Handles edit request by jumping to target step.
   * Preserves existing data and sets edit mode.
   * 
   * @param ctx - Telegram context
   * @param fieldKey - Field identifier
   * @param targetStep - Step to jump to for editing
   * @param preserveData - Preserve existing data (default: true)
   * 
   * @example
   * ```typescript
   * await EditManager.handleEdit(ctx, 'nameAr', 'awaiting_name_ar')
   * ```
   */
  static handleEdit(
    ctx: Context,
    fieldKey: string,
    targetStep: string,
    preserveData = true,
  ): void {
    if (!ctx.session.inventoryForm) return
    
    // Mark as edit mode
    ctx.session.inventoryForm.editMode = true
    ctx.session.inventoryForm.editingField = fieldKey
    
    // Save current step for return
    ctx.session.inventoryForm.returnToStep = ctx.session.inventoryForm.step
    
    // Jump to target step
    NavigationManager.jumpToStep(ctx, targetStep, preserveData)
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ ✅ FINISH EDIT                                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Completes edit and returns to review step.
   * 
   * @param ctx - Telegram context
   * @returns True if returned to review, false otherwise
   * 
   * @example
   * ```typescript
   * if (EditManager.finishEdit(ctx)) {
   *   // Show review screen again
   *   await showReviewScreen(ctx)
   * }
   * ```
   */
  static finishEdit(ctx: Context): boolean {
    if (!ctx.session.inventoryForm) return false
    
    const returnToStep = ctx.session.inventoryForm.returnToStep
    
    if (!returnToStep) return false
    
    // Clear edit mode
    ctx.session.inventoryForm.editMode = false
    ctx.session.inventoryForm.editingField = undefined
    ctx.session.inventoryForm.returnToStep = undefined
    
    // Return to previous step
    ctx.session.inventoryForm.step = returnToStep
    
    return true
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔍 IS EDIT MODE                                                      │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Checks if currently in edit mode.
   * 
   * @param ctx - Telegram context
   * @returns True if in edit mode
   * 
   * @example
   * ```typescript
   * if (EditManager.isEditMode(ctx)) {
   *   // Show different message for edit
   * }
   * ```
   */
  static isEditMode(ctx: Context): boolean {
    return ctx.session.inventoryForm?.editMode === true
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📝 GET EDITING FIELD                                                 │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Gets currently editing field key.
   * 
   * @param ctx - Telegram context
   * @returns Field key or undefined
   * 
   * @example
   * ```typescript
   * const field = EditManager.getEditingField(ctx)
   * console.log(`Editing: ${field}`)
   * ```
   */
  static getEditingField(ctx: Context): string | undefined {
    return ctx.session.inventoryForm?.editingField
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📋 BUILD QUICK EDIT MENU (PRESET)                                    │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Builds edit menu for add-item flow with all editable fields.
   * 
   * @param data - Current item data
   * @param callbackPrefix - Callback prefix
   * @returns Inline keyboard
   * 
   * @example
   * ```typescript
   * const keyboard = EditManager.buildAddItemEditMenu(
   *   ctx.session.inventoryForm.data,
   *   'og:items:add'
   * )
   * ```
   */
  static buildAddItemEditMenu(
    data: any,
    callbackPrefix: string,
  ): InlineKeyboard {
    const fields: EditableField[] = [
      {
        key: 'barcode',
        label: 'الباركود',
        targetStep: 'awaiting_barcode',
        currentValue: data.barcode,
        icon: '🔢',
      },
      {
        key: 'nameAr',
        label: 'الاسم (عربي)',
        targetStep: 'awaiting_name_ar',
        currentValue: data.nameAr,
        icon: '📝',
      },
      {
        key: 'nameEn',
        label: 'الاسم (إنجليزي)',
        targetStep: 'awaiting_name_en',
        currentValue: data.nameEn,
        icon: '🔤',
      },
      {
        key: 'category',
        label: 'الفئة',
        targetStep: 'awaiting_category',
        currentValue: data.categoryName,
        icon: '🏷️',
      },
      {
        key: 'location',
        label: 'الموقع',
        targetStep: 'awaiting_location',
        currentValue: data.locationName,
        icon: '📍',
      },
      {
        key: 'unit',
        label: 'الوحدة',
        targetStep: 'awaiting_unit',
        currentValue: data.unit,
        icon: '📦',
      },
      {
        key: 'capacity',
        label: 'السعة',
        targetStep: 'awaiting_capacity',
        currentValue: data.capacity,
        icon: '📊',
      },
      {
        key: 'quantity',
        label: 'الكمية',
        targetStep: 'awaiting_quantity',
        currentValue: data.quantity,
        icon: '🔢',
      },
      {
        key: 'minQuantity',
        label: 'الحد الأدنى',
        targetStep: 'awaiting_min_quantity',
        currentValue: data.minQuantity,
        icon: '📉',
      },
      {
        key: 'price',
        label: 'السعر',
        targetStep: 'awaiting_price',
        currentValue: data.price,
        icon: '💰',
      },
      {
        key: 'supplier',
        label: 'المورد',
        targetStep: 'awaiting_supplier',
        currentValue: data.supplier,
        icon: '🏭',
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        targetStep: 'awaiting_notes',
        currentValue: data.notes,
        icon: '📝',
      },
    ]
    
    return this.buildEditMenu({
      fields,
      callbackPrefix,
      showValues: false,
      columns: 2,
    })
  }
}

