/**
 * مكون التقويم - اختيار تاريخ (7 أيام)
 */

import { InlineKeyboard } from 'grammy'

export interface CalendarOptions {
  /** التاريخ الحالي المحدد */
  selectedDate?: Date
  /** أقل تاريخ يمكن اختياره */
  minDate?: Date
  /** أكبر تاريخ يمكن اختياره */
  maxDate?: Date
  /** callback data prefix */
  callbackPrefix: string
}

export class Calendar {
  /**
   * إنشاء تقويم 7 أيام
   */
  static create(options: CalendarOptions): InlineKeyboard {
    const keyboard = new InlineKeyboard()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // عرض 7 أيام: 3 سابقة + اليوم + 3 تالية
    const dates: Date[] = []
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }

    // صف أول: 3 أيام سابقة
    for (let i = 0; i < 3; i++) {
      const date = dates[i]
      const label = this.formatDateButton(date, false)
      const callback = `${options.callbackPrefix}:${this.formatDateValue(date)}`
      keyboard.text(label, callback)
    }
    keyboard.row()

    // صف ثاني: اليوم
    const todayDate = dates[3]
    const todayLabel = this.formatDateButton(todayDate, true)
    const todayCallback = `${options.callbackPrefix}:${this.formatDateValue(todayDate)}`
    keyboard.text(todayLabel, todayCallback).row()

    // صف ثالث: 3 أيام تالية
    for (let i = 4; i < 7; i++) {
      const date = dates[i]
      const label = this.formatDateButton(date, false)
      const callback = `${options.callbackPrefix}:${this.formatDateValue(date)}`
      keyboard.text(label, callback)
    }

    return keyboard
  }

  /**
   * تنسيق زر التاريخ
   */
  private static formatDateButton(date: Date, isToday: boolean): string {
    const day = date.getDate()
    const month = date.getMonth() + 1

    if (isToday) {
      return `📅 ${day}/${month} (اليوم)`
    }

    return `${day}/${month}`
  }

  /**
   * تنسيق قيمة التاريخ للـ callback
   */
  private static formatDateValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * تحويل قيمة callback إلى تاريخ
   */
  static parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number)
    // إنشاء تاريخ UTC بدلاً من التوقيت المحلي لتجنب مشاكل التوقيت
    return new Date(Date.UTC(year, month - 1, day))
  }

  /**
   * تنسيق تاريخ للعرض (عربي)
   */
  static formatArabic(date: Date): string {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  /**
   * تنسيق تاريخ للعرض (قصير)
   */
  static formatShort(date: Date): string {
    const day = date.getDate()
    const month = date.getMonth() + 1
    return `${day}/${month}`
  }
}
