/**
 * Step Flow Utility
 * إدارة خطوات conversations بشكل منظم
 */

export class StepFlow {
  private steps: string[]
  private currentIndex: number = 0

  constructor(steps: string[]) {
    this.steps = steps
  }

  /**
   * الحصول على الخطوة الحالية
   */
  getCurrentStep(): string {
    return this.steps[this.currentIndex]
  }

  /**
   * الانتقال للخطوة التالية
   */
  getNextStep(): string | null {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++
      return this.steps[this.currentIndex]
    }
    return null
  }

  /**
   * الرجوع للخطوة السابقة
   */
  getPreviousStep(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.steps[this.currentIndex]
    }
    return null
  }

  /**
   * التحقق من آخر خطوة
   */
  isLastStep(): boolean {
    return this.currentIndex === this.steps.length - 1
  }

  /**
   * التحقق من أول خطوة
   */
  isFirstStep(): boolean {
    return this.currentIndex === 0
  }

  /**
   * الانتقال لخطوة محددة
   */
  goToStep(step: string): boolean {
    const index = this.steps.indexOf(step)
    if (index !== -1) {
      this.currentIndex = index
      return true
    }
    return false
  }

  /**
   * الحصول على رقم الخطوة الحالية
   */
  getCurrentStepNumber(): number {
    return this.currentIndex + 1
  }

  /**
   * الحصول على إجمالي الخطوات
   */
  getTotalSteps(): number {
    return this.steps.length
  }

  /**
   * الحصول على نسبة التقدم
   */
  getProgress(): number {
    return Math.round((this.currentIndex / (this.steps.length - 1)) * 100)
  }
}

/**
 * خطوات إضافة صنف
 */
export const ADD_ITEM_STEPS = [
  'awaiting_barcode',
  'awaiting_name_ar',
  'awaiting_name_en',
  'awaiting_category',
  'awaiting_location',
  'awaiting_unit',
  'awaiting_unit_capacity',
  'awaiting_quantity',
  'awaiting_min_quantity',
  'awaiting_price',
  'awaiting_supplier',
  'awaiting_notes',
  'awaiting_images',
  'confirm_save',
]

/**
 * خطوات تعديل صنف
 */
export const EDIT_ITEM_STEPS = [
  'select_field',
  'enter_value',
  'confirm_change',
]

/**
 * الخطوات القابلة للتخطي
 */
export const SKIPPABLE_STEPS = [
  'awaiting_name_en',
  'awaiting_min_quantity',
  'awaiting_price',
  'awaiting_supplier',
  'awaiting_notes',
  'awaiting_images',
]

/**
 * التحقق من إمكانية تخطي خطوة
 */
export function canSkipStep(step: string): boolean {
  return SKIPPABLE_STEPS.includes(step)
}
