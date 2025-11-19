/**
 * Inventory-Specific Message Builder Utility
 * أدوات بناء الرسائل الخاصة بالمخازن
 * 
 * ⚠️ For general message builders, use: #root/bot/utils/ui/message-builder.util.js
 */

import { formatArabicCurrency, formatArabicDateTime, toArabicNumerals } from '#root/bot/utils/formatting/arabic-formatter.util.js'

// Re-export general message builders for backward compatibility
export { 
  buildSuccessMessage, 
  buildErrorMessage, 
  buildConfirmationMessage, 
  buildEmptyListMessage 
} from '#root/bot/utils/ui/message-builder.util.js'

/**
 * بناء رأس قائمة الأصناف
 * 📦 INVENTORY-SPECIFIC
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
 * 📦 INVENTORY-SPECIFIC
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
