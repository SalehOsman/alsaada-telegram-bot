/**
 * أنواع حالات السداد وسجل التدقيق
 */

export enum PaymentStatus {
  PAID = 'PAID', // مدفوع بالكامل
  UNPAID = 'UNPAID', // غير مدفوع
  PARTIAL = 'PARTIAL', // مدفوع جزئياً
}

export enum AuditAction {
  CREATED = 'CREATED', // تم الإنشاء
  UPDATED = 'UPDATED', // تم التعديل
  DELETED = 'DELETED', // تم الحذف
  PAYMENT_UPDATED = 'PAYMENT_UPDATED', // تحديث حالة الدفع
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // تأكيد الدفع
  RESTORED = 'RESTORED', // استعادة سجل محذوف
}

export interface PaymentInfo {
  status: PaymentStatus
  amountPaid: number
  paymentDate?: Date
  notes?: string
}

export interface AuditLogEntry {
  action: AuditAction
  actionBy: bigint
  oldData?: any
  newData?: any
  changes?: Record<string, { old: any, new: any }>
  notes?: string
}

export function translatePaymentStatus(status: string): string {
  const translations: Record<string, string> = {
    PAID: '✅ مدفوع',
    UNPAID: '⏳ غير مدفوع',
    PARTIAL: '🔵 مدفوع جزئياً',
  }
  return translations[status] || status
}

export function translateAuditAction(action: string): string {
  const translations: Record<string, string> = {
    CREATED: 'تم الإنشاء',
    UPDATED: 'تم التعديل',
    DELETED: 'تم الحذف',
    PAYMENT_UPDATED: 'تحديث الدفع',
    PAYMENT_CONFIRMED: 'تأكيد الدفع',
    RESTORED: 'تم الاستعادة',
  }
  return translations[action] || action
}
