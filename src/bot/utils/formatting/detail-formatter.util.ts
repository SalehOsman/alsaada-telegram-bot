/**
 * Detail Formatter Utility
 * تنسيق تفاصيل الأصناف والمعاملات
 * يمكن استخدامه لأي قسم يحتاج تنسيق تفاصيل مماثل
 */

import { toArabicNumerals, formatArabicCurrency, formatArabicDateTime } from './arabic-formatter.util.js'

export class DetailFormatter {
  /**
   * تنسيق تفاصيل صنف كاملة
   */
  static formatItemDetails(item: any, options?: {
    showHeader?: boolean
    showWarnings?: boolean
    showTimestamps?: boolean
  }): string {
    const opts = { showHeader: true, showWarnings: true, showTimestamps: true, ...options }

    let message = ''

    if (opts.showHeader) {
      message += '📦 **تفاصيل الصنف**\n\n'
    }

    // معلومات أساسية
    message += `**الاسم (عربي):** ${item.nameAr}\n`
    if (item.nameEn) message += `**الاسم (إنجليزي):** ${item.nameEn}\n`
    message += `**الكود:** \`${item.code}\`\n`
    if (item.barcode) message += `**الباركود:** \`${item.barcode}\`\n`

    // التصنيف والموقع
    message += `\n**الفئة:** ${item.category?.nameAr || 'غير محدد'}\n`
    message += `**الموقع:** ${item.location?.nameAr || 'غير محدد'}\n`

    // الكميات
    message += `\n**الكمية:** ${toArabicNumerals(item.quantity)} ${item.unit}\n`
    message += `**الحد الأدنى:** ${toArabicNumerals(item.minQuantity)} ${item.unit}\n`

    // تحذيرات
    if (opts.showWarnings && item.quantity <= item.minQuantity) {
      message += `\n⚠️ **تحذير:** الكمية أقل من أو تساوي الحد الأدنى\n`
    }

    // الأسعار
    message += `\n**سعر الوحدة:** ${formatArabicCurrency(item.unitPrice)}\n`
    message += `**القيمة الإجمالية:** ${formatArabicCurrency(item.totalValue)}\n`

    // معلومات إضافية
    if (item.supplierName) message += `\n**المورد:** ${item.supplierName}\n`
    if (item.notes) message += `\n**ملاحظات:** ${item.notes}\n`

    // التواريخ
    if (opts.showTimestamps) {
      message += `\n**تاريخ الإضافة:** ${formatArabicDateTime(item.createdAt)}\n`
      if (item.updatedAt) message += `**آخر تحديث:** ${formatArabicDateTime(item.updatedAt)}\n`
    }

    return message
  }

  /**
   * تنسيق ملخص صنف (للقوائم)
   */
  static formatItemSummary(item: any, showWarning: boolean = true): string {
    const warning = showWarning && item.quantity <= item.minQuantity ? '⚠️ ' : ''
    return `${warning}${item.nameAr} (${toArabicNumerals(item.quantity)})`
  }

  /**
   * تنسيق معلومات معاملة
   */
  static formatTransactionDetails(transaction: any, type: string): string {
    let message = `📋 **تفاصيل ${type}**\n\n`
    message += `**رقم العملية:** \`${transaction.number || transaction.purchaseNumber || transaction.issuanceNumber}\`\n`
    message += `**الصنف:** ${transaction.item?.nameAr || 'غير محدد'}\n`
    message += `**الكمية:** ${toArabicNumerals(transaction.quantity)} ${transaction.item?.unit || ''}\n`

    if (transaction.unitPrice) {
      message += `**السعر:** ${formatArabicCurrency(transaction.unitPrice)}\n`
      message += `**الإجمالي:** ${formatArabicCurrency(transaction.totalPrice)}\n`
    }

    if (transaction.notes) message += `\n**ملاحظات:** ${transaction.notes}\n`

    message += `\n**التاريخ:** ${formatArabicDateTime(transaction.createdAt)}\n`

    return message
  }

  /**
   * تنسيق رأس قائمة
   */
  static formatListHeader(
    title: string,
    total: number,
    page: number,
    totalPages: number,
    filter?: string,
  ): string {
    let message = `📊 **${title}**\n\n`

    if (filter) {
      message += `🔍 **الفلتر:** ${filter}\n\n`
    }

    message += `📦 **الإجمالي:** ${toArabicNumerals(total)}\n`
    message += `📄 **الصفحة:** ${toArabicNumerals(page)} من ${toArabicNumerals(totalPages)}\n\n`

    return message
  }

  /**
   * تنسيق رسالة تأكيد
   */
  static formatConfirmation(
    action: string,
    itemName: string,
    details?: string,
  ): string {
    let message = `⚠️ **تأكيد ${action}**\n\n`
    message += `**الصنف:** ${itemName}\n`
    if (details) message += `\n${details}\n`
    message += `\n**هل أنت متأكد؟**`
    return message
  }
}

