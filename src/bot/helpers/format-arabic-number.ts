/**
 * تحويل الأرقام الإنجليزية إلى أرقام عربية
 */
export function formatArabicNumber(value: number | string): string {
  const str = String(value)
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

  return str.replace(/\d/g, digit => arabicNumerals[Number.parseInt(digit)])
}
