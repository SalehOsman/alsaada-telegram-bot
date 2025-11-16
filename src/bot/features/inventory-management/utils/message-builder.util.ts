/**
 * Message Builder Utility
 * أدوات بناء الرسائل
 */

import { formatArabicCurrency, formatArabicDateTime, toArabicNumerals } from './arabic-formatter.util.js'

/**
 * بناء رأس قائمة الأصناف
 */
export function buildListHeaderMessage(
  title: string,
  total: number,
  page: number,
  totalPages: number,
  filter?: string
): string {
  let message = `📊 **${title}**\n\n`
  
  if (filter) {
    message += `🔍 **الفلتر:** ${filter}\n\n`
  }
  
  message += `📦 **إجمالي الأصناف:** ${toArabicNumerals(total)}\n`
  message += `📄 **الصفحة:** ${toArabicNumerals(page)} من ${toArabicNumerals(totalPages)}\n\n`
  
  return message
}

/**
 * بناء رسالة تفاصيل الصنف
 */
export function buildItemDetailsMessage(item: {
  nameAr: string
  nameEn?: string
  code: string
  barcode?: string
  category?: { nameAr: string }
  location?: { nameAr: string }
  quantity: number
  minQuantity: number
  unit: string
  unitPrice: number
  totalValue: number
  supplierName?: string
  notes?: string
  createdAt: Date
  updatedAt?: Date
}): string {
  let message = '📦 **تفاصيل الصنف**\n\n'
  
  message += `**الاسم (عربي):** ${item.nameAr}\n`
  if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
  message += `**الكود:** \`${item.code}\`\n`
  if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`
  
  message += `\n**الفئة:** ${item.category?.nameAr || 'غير محدد'}\n`
  message += `**الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`
  
  message += `\n**الكمية:** ${toArabicNumerals(item.quantity)} ${item.unit}\n`
  message += `**الحد الأدنى:** ${toArabicNumerals(item.minQuantity)} ${item.unit}\n`
  
  if (item.quantity <= item.minQuantity) {
    message += `\n⚠️ **تحذير:** الكمية أقل من أو تساوي الحد الأدنى\n`
  }
  
  message += `\n**سعر الوحدة:** ${formatArabicCurrency(item.unitPrice)}\n`
  message += `**القيمة الإجمالية:** ${formatArabicCurrency(item.totalValue)}\n`
  
  if (item.supplierName) message += `\n**المورد:** ${item.supplierName}\n`
  if (item.notes) message += `\n**ملاحظات:** ${item.notes}\n`
  
  message += `\n**تاريخ الإضافة:** ${formatArabicDateTime(item.createdAt)}\n`
  if (item.updatedAt) message += `**آخر تحديث:** ${formatArabicDateTime(item.updatedAt)}\n`
  
  return message
}

/**
 * بناء رسالة تأكيد
 */
export function buildConfirmationMessage(
  action: string,
  itemName: string,
  itemCode: string,
  warning?: string
): string {
  let message = `⚠️ **تأكيد ${action}**\n\n`
  message += `هل أنت متأكد من ${action}:\n\n`
  message += `**${itemName}**\n`
  message += `الكود: \`${itemCode}\`\n`
  
  if (warning) {
    message += `\n⚠️ **ملاحظة:** ${warning}`
  }
  
  return message
}

/**
 * بناء رسالة نجاح
 */
export function buildSuccessMessage(
  action: string,
  details?: string
): string {
  let message = `✅ **${action} بنجاح!**\n`
  
  if (details) {
    message += `\n${details}`
  }
  
  return message
}

/**
 * بناء رسالة خطأ
 */
export function buildErrorMessage(
  action: string,
  reason?: string
): string {
  let message = `❌ **فشل ${action}**\n`
  
  if (reason) {
    message += `\n**السبب:** ${reason}`
  } else {
    message += `\nالرجاء المحاولة مرة أخرى.`
  }
  
  return message
}

/**
 * بناء رسالة قائمة فارغة
 */
export function buildEmptyListMessage(
  title: string,
  suggestion?: string
): string {
  let message = `📊 **${title}**\n\n`
  message += `❌ **لا توجد عناصر**\n`
  
  if (suggestion) {
    message += `\n${suggestion}`
  }
  
  return message
}
