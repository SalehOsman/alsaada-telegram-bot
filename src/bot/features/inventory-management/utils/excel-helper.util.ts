/**
 * Excel Helper Utility
 * أدوات مساعدة Excel
 */

import { formatArabicDate } from './arabic-formatter.util.js'

/**
 * توليد اسم ملف Excel
 */
export function generateExcelFileName(
  type: string,
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0]
  const timestamp = Date.now()
  return `${type}-${dateStr}-${timestamp}.xlsx`
}

/**
 * تنسيق بيانات للتصدير
 */
export function formatExcelData<T extends Record<string, any>>(
  items: T[],
  columns: Array<{ key: keyof T; header: string; formatter?: (value: any) => any }>
): any[] {
  return items.map((item) => {
    const row: Record<string, any> = {}
    
    for (const col of columns) {
      const value = item[col.key]
      row[col.header] = col.formatter ? col.formatter(value) : value
    }
    
    return row
  })
}

/**
 * إنشاء صف ملخص
 */
export function createSummaryRow(
  label: string,
  data: Record<string, any>
): any[] {
  return [label, ...Object.values(data)]
}

/**
 * تنسيق تاريخ للـ Excel
 */
export function formatExcelDate(date: Date): string {
  return formatArabicDate(date, 'short')
}

/**
 * تنسيق رقم للـ Excel
 */
export function formatExcelNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}
