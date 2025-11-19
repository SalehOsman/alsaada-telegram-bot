/**
 * ════════════════════════════════════════════════════════════════════════════
 * 📊 PROGRESS INDICATOR UTILITY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * @description
 * Visual progress tracking for multi-step conversations.
 * Shows current step, completed steps, and remaining steps.
 * 
 * @features
 * ✅ Simple progress bar (e.g., "3 من 8")
 * ✅ Detailed step-by-step view with emojis
 * ✅ Percentage calculation
 * ✅ Arabic text support
 * 
 * @usage
 * ```typescript
 * // Simple progress
 * const progress = ProgressIndicator.simple(3, 8)
 * // Output: "📋 الخطوة 3 من 8 (38%)"
 * 
 * // Detailed with steps
 * const progress = ProgressIndicator.detailed({
 *   steps: [
 *     { name: 'الباركود', status: 'completed' },
 *     { name: 'الاسم', status: 'current' },
 *     { name: 'الفئة', status: 'pending' }
 *   ]
 * })
 * ```
 * 
 * @author Alsaada Bot Team
 * @version 1.0.0
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Step status types
 */
export type StepStatus = 'completed' | 'current' | 'pending' | 'skipped'

/**
 * Step information
 */
export interface StepInfo {
  /** Step name (Arabic) */
  name: string
  
  /** Step status */
  status: StepStatus
  
  /** Optional: Step number override */
  number?: number
}

/**
 * Detailed progress configuration
 */
export interface DetailedProgressConfig {
  /** List of steps */
  steps: StepInfo[]
  
  /** Show percentage (default: true) */
  showPercentage?: boolean
  
  /** Show progress bar (default: true) */
  showBar?: boolean
  
  /** Compact mode (single line per step, default: false) */
  compact?: boolean
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROGRESS INDICATOR CLASS
 * ════════════════════════════════════════════════════════════════════════════
 */
export class ProgressIndicator {
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📊 SIMPLE PROGRESS                                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Creates a simple progress indicator with current/total.
   * 
   * @param current - Current step number (1-based)
   * @param total - Total number of steps
   * @param stepName - Optional: name of current step
   * @returns Formatted progress string
   * 
   * @example
   * ```typescript
   * ProgressIndicator.simple(3, 8)
   * // "📋 الخطوة 3 من 8 (38%)"
   * 
   * ProgressIndicator.simple(3, 8, 'اختيار الفئة')
   * // "📋 الخطوة 3 من 8 - اختيار الفئة (38%)"
   * ```
   */
  static simple(current: number, total: number, stepName?: string): string {
    const percentage = Math.round((current / total) * 100)
    const arabicCurrent = this.toArabicNumerals(current)
    const arabicTotal = this.toArabicNumerals(total)
    const arabicPercentage = this.toArabicNumerals(percentage)
    
    let progress = `📋 **الخطوة ${arabicCurrent} من ${arabicTotal}**`
    
    if (stepName) {
      progress += ` - ${stepName}`
    }
    
    progress += ` (${arabicPercentage}%)`
    
    return progress
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📊 DETAILED PROGRESS                                                 │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Creates a detailed step-by-step progress view.
   * 
   * @param config - Progress configuration
   * @returns Formatted progress string with all steps
   * 
   * @example
   * ```typescript
   * ProgressIndicator.detailed({
   *   steps: [
   *     { name: 'الباركود', status: 'completed' },
   *     { name: 'الاسم', status: 'current' },
   *     { name: 'الفئة', status: 'pending' }
   *   ]
   * })
   * ```
   */
  static detailed(config: DetailedProgressConfig): string {
    const {
      steps,
      showPercentage = true,
      showBar = true,
      compact = false,
    } = config
    
    const total = steps.length
    const completed = steps.filter((s) => s.status === 'completed').length
    const currentIndex = steps.findIndex((s) => s.status === 'current')
    const current = currentIndex >= 0 ? currentIndex + 1 : completed + 1
    
    let result = ''
    
    // Header with percentage
    if (showPercentage) {
      const percentage = Math.round((completed / total) * 100)
      const arabicCurrent = this.toArabicNumerals(current)
      const arabicTotal = this.toArabicNumerals(total)
      const arabicPercentage = this.toArabicNumerals(percentage)
      
      result += `📋 **الخطوة ${arabicCurrent} من ${arabicTotal}** (${arabicPercentage}%)\n`
    }
    
    // Progress bar
    if (showBar) {
      result += this.buildProgressBar(completed, total)
      result += '\n'
    }
    
    // Step list
    result += '\n'
    
    if (compact) {
      // Compact mode: single line per step
      steps.forEach((step, index) => {
        const emoji = this.getStepEmoji(step.status)
        const number = step.number || index + 1
        const arabicNumber = this.toArabicNumerals(number)
        result += `${emoji} ${arabicNumber}. ${step.name}\n`
      })
    }
    else {
      // Full mode: detailed view
      steps.forEach((step, index) => {
        const emoji = this.getStepEmoji(step.status)
        const number = step.number || index + 1
        const arabicNumber = this.toArabicNumerals(number)
        const indicator = step.status === 'current' ? ' ← **أنت هنا**' : ''
        
        result += `${emoji} ${arabicNumber}. ${step.name}${indicator}\n`
      })
    }
    
    return result.trim()
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📊 BUILD PROGRESS BAR                                                │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Builds a visual progress bar.
   * 
   * @param completed - Number of completed steps
   * @param total - Total number of steps
   * @returns Progress bar string
   * 
   * @example
   * ```typescript
   * buildProgressBar(3, 8)
   * // "━━━━━━━━━━━━━━━━━━━━"
   * //  ████████░░░░░░░░░░░░
   * ```
   */
  private static buildProgressBar(completed: number, total: number): string {
    const barLength = 20
    const filledLength = Math.round((completed / total) * barLength)
    const emptyLength = barLength - filledLength
    
    const filled = '█'.repeat(filledLength)
    const empty = '░'.repeat(emptyLength)
    
    return `${filled}${empty}`
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🎨 GET STEP EMOJI                                                    │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Returns emoji based on step status.
   * 
   * @param status - Step status
   * @returns Emoji string
   */
  private static getStepEmoji(status: StepStatus): string {
    switch (status) {
      case 'completed':
        return '✅'
      case 'current':
        return '🔵'
      case 'skipped':
        return '⏭️'
      case 'pending':
      default:
        return '⚪'
    }
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🔢 TO ARABIC NUMERALS                                                │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Converts English numerals to Arabic numerals.
   * 
   * @param num - Number to convert
   * @returns Arabic numeral string
   * 
   * @example
   * ```typescript
   * toArabicNumerals(123) // "١٢٣"
   * ```
   */
  static toArabicNumerals(num: number): string {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return String(num)
      .split('')
      .map((digit) => arabicNumerals[Number.parseInt(digit)] || digit)
      .join('')
  }
  
  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 📋 PRESET: ADD ITEM FLOW                                             │
   * └─────────────────────────────────────────────────────────────────────┘
   * 
   * Preset configuration for add-item flow.
   * 
   * @param currentStep - Current step name
   * @returns Formatted progress string
   */
  static addItemFlow(currentStep: string): string {
    const stepMap: Record<string, number> = {
      awaiting_barcode: 1,
      awaiting_barcode_image: 1,
      awaiting_name_ar: 2,
      awaiting_name_en: 3,
      awaiting_category: 4,
      awaiting_location: 5,
      awaiting_unit: 6,
      awaiting_capacity: 7,
      awaiting_quantity: 8,
      awaiting_min_quantity: 9,
      awaiting_price: 10,
      awaiting_supplier: 11,
      awaiting_notes: 12,
      awaiting_images: 13,
      review: 14,
    }
    
    const stepNames: Record<string, string> = {
      awaiting_barcode: 'إدخال الباركود',
      awaiting_barcode_image: 'مسح الباركود',
      awaiting_name_ar: 'الاسم بالعربية',
      awaiting_name_en: 'الاسم بالإنجليزية',
      awaiting_category: 'اختيار الفئة',
      awaiting_location: 'اختيار الموقع',
      awaiting_unit: 'نوع الوحدة',
      awaiting_capacity: 'سعة الوحدة',
      awaiting_quantity: 'الكمية',
      awaiting_min_quantity: 'الحد الأدنى',
      awaiting_price: 'السعر',
      awaiting_supplier: 'المورد',
      awaiting_notes: 'الملاحظات',
      awaiting_images: 'الصور',
      review: 'المراجعة النهائية',
    }
    
    const currentStepNumber = stepMap[currentStep] || 1
    const currentStepName = stepNames[currentStep] || 'غير معروف'
    const total = Object.keys(stepMap).length
    
    return this.simple(currentStepNumber, total, currentStepName)
  }
}

