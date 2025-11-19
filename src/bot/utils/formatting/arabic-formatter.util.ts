/**
 * Arabic Formatter Utility
 * أدوات التنسيق بالعربية
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

/**
 * تحويل الأرقام الإنجليزية إلى عربية
 */
export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  
  return String(num)
    .split('')
    .map((char) => {
      if (char >= '0' && char <= '9') {
        return arabicNumerals[Number.parseInt(char)]
      }
      return char
    })
    .join('')
}

/**
 * تنسيق الأرقام بفواصل عربية
 */
export function formatArabicNumber(num: number): string {
  const formatted = num.toLocaleString('ar-EG')
  return toArabicNumerals(formatted)
}

/**
 * تنسيق العملة بالعربية
 */
export function formatArabicCurrency(
  amount: number,
  currency: string = 'جنيه'
): string {
  const formatted = amount.toFixed(2)
  return `${toArabicNumerals(formatted)} ${currency}`
}

/**
 * تنسيق التاريخ بالعربية
 */
export function formatArabicDate(date: Date, format: 'short' | 'long' = 'long'): string {
  if (format === 'short') {
    const day = toArabicNumerals(date.getDate())
    const month = toArabicNumerals(date.getMonth() + 1)
    const year = toArabicNumerals(date.getFullYear())
    return `${day}/${month}/${year}`
  }
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  
  const formatted = date.toLocaleDateString('ar-EG', options)
  return toArabicNumerals(formatted)
}

/**
 * تنسيق التاريخ والوقت بالعربية
 */
export function formatArabicDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  
  const formatted = date.toLocaleString('ar-EG', options)
  return toArabicNumerals(formatted)
}

/**
 * تنسيق الكمية مع الوحدة
 */
export function formatQuantity(quantity: number, unit: string): string {
  return `${toArabicNumerals(quantity)} ${unit}`
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercentage(value: number): string {
  return `${toArabicNumerals(value.toFixed(2))}٪`
}

