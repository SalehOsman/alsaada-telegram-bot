/**
 * Unit Selector Utility
 * اختيار الوحدات
 */

import { InlineKeyboard } from 'grammy'

export class UnitSelector {
  private static readonly UNITS = {
    volume: ['لتر', 'جالون', 'برميل', 'متر مكعب'],
    weight: ['كيلو', 'طن', 'جرام', 'رطل'],
    count: ['قطعة', 'علبة', 'كرتونة', 'صندوق', 'حزمة'],
  }

  /**
   * الحصول على جميع الوحدات
   */
  static getAllUnits(): string[] {
    return Object.values(this.UNITS).flat()
  }

  /**
   * الحصول على وحدات حسب النوع
   */
  static getUnitsByType(type: 'volume' | 'weight' | 'count'): string[] {
    return this.UNITS[type]
  }

  /**
   * بناء keyboard اختيار الوحدة
   */
  static buildUnitKeyboard(
    callbackPrefix: string,
    type?: 'volume' | 'weight' | 'count',
    itemsPerRow: number = 3,
  ): InlineKeyboard {
    const units = type ? this.getUnitsByType(type) : this.getAllUnits()
    const keyboard = new InlineKeyboard()

    for (let i = 0; i < units.length; i += itemsPerRow) {
      const row = units.slice(i, i + itemsPerRow)
      for (const unit of row) {
        keyboard.text(unit, `${callbackPrefix}:${unit}`)
      }
      keyboard.row()
    }

    return keyboard
  }

  /**
   * بناء keyboard مع تصنيف
   */
  static buildCategorizedUnitKeyboard(callbackPrefix: string): InlineKeyboard {
    const keyboard = new InlineKeyboard()

    // وحدات الحجم
    keyboard.text('📊 وحدات الحجم', 'unit:category:volume').row()
    for (const unit of this.UNITS.volume) {
      keyboard.text(unit, `${callbackPrefix}:${unit}`)
    }
    keyboard.row()

    // وحدات الوزن
    keyboard.text('⚖️ وحدات الوزن', 'unit:category:weight').row()
    for (const unit of this.UNITS.weight) {
      keyboard.text(unit, `${callbackPrefix}:${unit}`)
    }
    keyboard.row()

    // وحدات العد
    keyboard.text('🔢 وحدات العد', 'unit:category:count').row()
    for (const unit of this.UNITS.count) {
      keyboard.text(unit, `${callbackPrefix}:${unit}`)
    }

    return keyboard
  }

  /**
   * التحقق من صحة الوحدة
   */
  static isValidUnit(unit: string): boolean {
    return this.getAllUnits().includes(unit)
  }

  /**
   * الحصول على نوع الوحدة
   */
  static getUnitType(unit: string): 'volume' | 'weight' | 'count' | null {
    for (const [type, units] of Object.entries(this.UNITS)) {
      if (units.includes(unit)) {
        return type as 'volume' | 'weight' | 'count'
      }
    }
    return null
  }
}
