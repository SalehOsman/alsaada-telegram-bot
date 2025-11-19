/**
 * Step Flow Utility
 * إدارة خطوات conversations بشكل منظم - يمكن استخدامه في أي multi-step conversation
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
 * التحقق من إمكانية تخطي خطوة (generic)
 */
export function canSkipStep(step: string, skippableSteps: string[]): boolean {
  return skippableSteps.includes(step)
}

