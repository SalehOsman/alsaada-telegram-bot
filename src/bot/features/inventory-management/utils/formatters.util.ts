/**
 * Formatters Utility
 * أدوات تنسيق البيانات للمخازن
 * قابلة لإعادة الاستخدام في جميع أنواع المخازن
 */

import type {
  AuditType,
  TransactionType,
} from '../types/warehouse.types.js'

/**
 * تنسيق التاريخ بالعربية
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date)
    return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * تنسيق التاريخ والوقت بالعربية
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date)
    return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * تنسيق الأرقام بالفواصل
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined)
    return '0'
  return num.toLocaleString('ar-EG')
}

/**
 * تنسيق المبالغ المالية
 */
export function formatCurrency(amount: number | null | undefined, currency = 'جنيه'): string {
  if (amount === null || amount === undefined)
    return `0 ${currency}`
  return `${amount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined)
    return '0%'
  return `${value.toFixed(2)}%`
}

/**
 * الحصول على أيقونة نوع الحركة
 */
export function getTransactionTypeIcon(type: TransactionType): string {
  const icons: Record<TransactionType, string> = {
    IN: '📥',
    OUT: '📤',
    TRANSFER: '🔄',
    RETURN: '↩️',
    ADJUSTMENT: '⚖️',
    PURCHASE: '🛒',
    ISSUE_TO_EMPLOYEE: '�',
    ISSUE_TO_EQUIPMENT: '🚜',
    ISSUE_TO_PROJECT: '🏗️',
  }
  return icons[type] || '📋'
}

/**
 * الحصول على تسمية نوع الحركة
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    IN: 'إدخال',
    OUT: 'إخراج',
    TRANSFER: 'نقل',
    RETURN: 'إرجاع',
    ADJUSTMENT: 'تسوية',
    PURCHASE: 'شراء',
    ISSUE_TO_EMPLOYEE: 'صرف لموظف',
    ISSUE_TO_EQUIPMENT: 'صرف لمعدة',
    ISSUE_TO_PROJECT: 'صرف لمشروع',
  }
  return labels[type] || type
}

/**
 * الحصول على أيقونة نوع الجرد
 */
export function getAuditTypeIcon(type: AuditType): string {
  const icons: Record<AuditType, string> = {
    FULL: '📊',
    CATEGORY: '📁',
    LOCATION: '📍',
    SINGLE_ITEM: '📦',
  }
  return icons[type] || '📋'
}

/**
 * الحصول على تسمية نوع الجرد
 */
export function getAuditTypeLabel(type: AuditType): string {
  const labels: Record<AuditType, string> = {
    FULL: 'جرد شامل',
    CATEGORY: 'جرد فئة',
    LOCATION: 'جرد موقع',
    SINGLE_ITEM: 'جرد صنف واحد',
  }
  return labels[type] || type
}

/**
 * الحصول على أيقونة حالة الحركة
 */
export function getTransactionStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    PENDING: '⏳',
    APPROVED: '✅',
    REJECTED: '❌',
    COMPLETED: '✔️',
    CANCELLED: '🚫',
  }
  return icons[status] || '📋'
}

/**
 * الحصول على تسمية حالة الحركة
 */
export function getTransactionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'قيد الانتظار',
    APPROVED: 'معتمد',
    REJECTED: 'مرفوض',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
  }
  return labels[status] || status
}

/**
 * تنسيق الفرق في الجرد (نقص/زيادة)
 */
export function formatAuditDifference(difference: number): string {
  if (difference === 0) {
    return '✅ مطابق'
  }
  else if (difference < 0) {
    return `⚠️ نقص: ${Math.abs(difference)}`
  }
  else {
    return `⬆️ زيادة: ${difference}`
  }
}

/**
 * تنسيق رسالة إحصائيات الجرد
 */
export function formatAuditStatistics(stats: {
  totalItems: number
  checkedItems: number
  matchedItems: number
  shortageItems: number
  surplusItems: number
  totalShortageQty: number
  totalSurplusQty: number
  completionPercentage: number
}): string {
  return `📊 **إحصائيات الجرد:**\n\n`
    + `• إجمالي الأصناف: ${formatNumber(stats.totalItems)}\n`
    + `• الأصناف المجردة: ${formatNumber(stats.checkedItems)}\n`
    + `• الأصناف المطابقة: ✅ ${formatNumber(stats.matchedItems)}\n`
    + `• أصناف بها نقص: ⚠️ ${formatNumber(stats.shortageItems)} (${formatNumber(stats.totalShortageQty)} وحدة)\n`
    + `• أصناف بها زيادة: ⬆️ ${formatNumber(stats.surplusItems)} (${formatNumber(stats.totalSurplusQty)} وحدة)\n`
    + `• نسبة الإنجاز: ${formatPercentage(stats.completionPercentage)}`
}

/**
 * تنسيق رسالة معلومات الصنف
 */
export function formatItemInfo(item: {
  code: string
  name: string
  category?: string
  location?: string
  quantity: number
  unit: string
  unitPrice?: number
}): string {
  let message = `📦 **${item.name}**\n\n`
  message += `• الكود: \`${item.code}\`\n`

  if (item.category) {
    message += `• الفئة: ${item.category}\n`
  }

  if (item.location) {
    message += `• الموقع: ${item.location}\n`
  }

  message += `• الكمية: ${formatNumber(item.quantity)} ${item.unit}\n`

  if (item.unitPrice) {
    message += `• سعر الوحدة: ${formatCurrency(item.unitPrice)}\n`
    message += `• القيمة الإجمالية: ${formatCurrency(item.quantity * item.unitPrice)}\n`
  }

  return message
}

/**
 * تنسيق رسالة معلومات الحركة
 */
export function formatTransactionInfo(transaction: {
  transactionNumber: string
  type: TransactionType
  itemName: string
  quantity: number
  unit: string
  employeeName?: string
  equipmentName?: string
  notes?: string
  createdAt: Date
  status: string
}): string {
  let message = `${getTransactionTypeIcon(transaction.type)} **${getTransactionTypeLabel(transaction.type)}**\n\n`
  message += `• رقم الحركة: \`${transaction.transactionNumber}\`\n`
  message += `• الصنف: ${transaction.itemName}\n`
  message += `• الكمية: ${formatNumber(transaction.quantity)} ${transaction.unit}\n`

  if (transaction.employeeName) {
    message += `• الموظف: ${transaction.employeeName}\n`
  }

  if (transaction.equipmentName) {
    message += `• المعدة: ${transaction.equipmentName}\n`
  }

  if (transaction.notes) {
    message += `• ملاحظات: ${transaction.notes}\n`
  }

  message += `• التاريخ: ${formatDateTime(transaction.createdAt)}\n`
  message += `• الحالة: ${getTransactionStatusIcon(transaction.status)} ${getTransactionStatusLabel(transaction.status)}`

  return message
}

/**
 * اختصار النص الطويل
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength)
    return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * تحويل الحجم بالبايت إلى قراءة بشرية
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 بايت'

  const k = 1024
  const sizes = ['بايت', 'كيلو بايت', 'ميجا بايت', 'جيجا بايت']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * تنسيق قائمة بصيغة نقاط
 */
export function formatBulletList(items: string[]): string {
  return items.map(item => `• ${item}`).join('\n')
}

/**
 * إضافة أصفار في البداية للأرقام
 */
export function padNumber(num: number, length: number = 5): string {
  return String(num).padStart(length, '0')
}

/**
 * توليد رقم حركة فريد
 */
export function generateTransactionNumber(prefix: string, sequence: number): string {
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  return `${prefix}-${dateStr}-${padNumber(sequence, 5)}`
}

/**
 * تنسيق مدة زمنية
 */
export function formatDuration(startDate: Date, endDate: Date): string {
  const diff = endDate.getTime() - startDate.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`
  }
  return `${minutes} دقيقة`
}
