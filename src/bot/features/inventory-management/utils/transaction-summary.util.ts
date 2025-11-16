/**
 * Transaction Summary Utility
 * تنسيق ملخصات المعاملات بشكل موحد
 */

import { toArabicNumerals, formatArabicCurrency, formatArabicDateTime } from './arabic-formatter.util.js'

export class TransactionSummary {
  /**
   * بناء ملخص عام للمعاملة
   */
  private static buildBaseInfo(data: {
    itemName: string
    itemCode?: string
    itemBarcode?: string
    itemLocation?: string
  }): string {
    let message = `📦 **الصنف:** ${data.itemName}\n`
    if (data.itemCode) message += `🔢 **الكود:** \`${data.itemCode}\`\n`
    if (data.itemBarcode) message += `📋 **الباركود:** \`${data.itemBarcode}\`\n`
    if (data.itemLocation) message += `📍 **الموقع:** ${data.itemLocation}\n`
    return message
  }

  /**
   * بناء معلومات الكميات
   */
  private static buildQuantityInfo(data: {
    currentQty: number
    changeQty: number
    newQty: number
    unit: string
    changeLabel?: string
  }): string {
    const label = data.changeLabel || 'المضافة'
    let message = '\n📊 **الكميات:**\n'
    message += `   • الحالية: ${toArabicNumerals(data.currentQty)} ${data.unit}\n`
    message += `   • ${label}: ${data.changeQty >= 0 ? '+' : ''}${toArabicNumerals(data.changeQty)} ${data.unit}\n`
    message += `   • الجديدة: ${toArabicNumerals(data.newQty)} ${data.unit}\n`
    return message
  }

  /**
   * بناء معلومات مالية
   */
  private static buildFinancialInfo(data: {
    unitPrice?: number
    quantity: number
  }): string {
    if (!data.unitPrice) return ''
    
    const total = data.quantity * data.unitPrice
    let message = '\n💰 **المالية:**\n'
    message += `   • سعر الوحدة: ${formatArabicCurrency(data.unitPrice)}\n`
    message += `   • الإجمالي: ${formatArabicCurrency(total)}\n`
    return message
  }

  /**
   * بناء بيانات إضافية
   */
  private static buildAdditionalInfo(data: {
    supplierName?: string
    invoiceNumber?: string
    employeeName?: string
    equipmentName?: string
    fromLocation?: string
    toLocation?: string
    notes?: string
  }): string {
    const hasData = Object.values(data).some(v => v !== undefined && v !== null)
    if (!hasData) return ''

    let message = '\n📝 **بيانات إضافية:**\n'
    if (data.supplierName) message += `   • المورد: ${data.supplierName}\n`
    if (data.invoiceNumber) message += `   • رقم الفاتورة: ${data.invoiceNumber}\n`
    if (data.employeeName) message += `   • الموظف: ${data.employeeName}\n`
    if (data.equipmentName) message += `   • المعدة: ${data.equipmentName}\n`
    if (data.fromLocation) message += `   • من: ${data.fromLocation}\n`
    if (data.toLocation) message += `   • إلى: ${data.toLocation}\n`
    if (data.notes) message += `   • ملاحظات: ${data.notes}\n`
    return message
  }

  /**
   * ملخص عملية شراء
   */
  static buildPurchaseSummary(data: {
    itemName: string
    itemCode?: string
    itemBarcode?: string
    itemLocation?: string
    currentQty: number
    quantity: number
    unit: string
    unitPrice?: number
    supplierName?: string
    invoiceNumber?: string
    notes?: string
    userName?: string
    isReview?: boolean
  }): string {
    const header = data.isReview 
      ? '═════════════════\n📋 **مراجعة عملية الشراء**\n═════════════════\n\n'
      : '═══════════════════\n✅ **تمت عملية الشراء بنجاح**\n═══════════════════\n\n'

    let message = header
    message += this.buildBaseInfo(data)
    message += this.buildQuantityInfo({
      currentQty: data.currentQty,
      changeQty: data.quantity,
      newQty: data.currentQty + data.quantity,
      unit: data.unit,
      changeLabel: 'المضافة'
    })
    message += this.buildFinancialInfo({ unitPrice: data.unitPrice, quantity: data.quantity })
    message += this.buildAdditionalInfo({
      supplierName: data.supplierName,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes
    })

    if (!data.isReview) {
      message += `\n⏰ **التاريخ:** ${formatArabicDateTime(new Date())}\n`
      if (data.userName) message += `👤 **المستخدم:** ${data.userName}\n`
    }

    return message
  }

  /**
   * ملخص عملية صرف
   */
  static buildIssueSummary(data: {
    itemName: string
    itemCode?: string
    itemBarcode?: string
    itemLocation?: string
    currentQty: number
    quantity: number
    unit: string
    employeeName?: string
    equipmentName?: string
    notes?: string
    userName?: string
    isReview?: boolean
  }): string {
    const header = data.isReview
      ? '═════════════════\n📋 **مراجعة عملية الصرف**\n═════════════════\n\n'
      : '═══════════════════\n✅ **تمت عملية الصرف بنجاح**\n═══════════════════\n\n'

    let message = header
    message += this.buildBaseInfo(data)
    message += this.buildQuantityInfo({
      currentQty: data.currentQty,
      changeQty: -data.quantity,
      newQty: data.currentQty - data.quantity,
      unit: data.unit,
      changeLabel: 'المصروفة'
    })
    message += this.buildAdditionalInfo({
      employeeName: data.employeeName,
      equipmentName: data.equipmentName,
      notes: data.notes
    })

    if (!data.isReview) {
      message += `\n⏰ **التاريخ:** ${formatArabicDateTime(new Date())}\n`
      if (data.userName) message += `👤 **المستخدم:** ${data.userName}\n`
    }

    return message
  }

  /**
   * ملخص عملية نقل
   */
  static buildTransferSummary(data: {
    itemName: string
    itemCode?: string
    quantity: number
    unit: string
    fromLocation: string
    toLocation: string
    notes?: string
    userName?: string
    isReview?: boolean
  }): string {
    const header = data.isReview
      ? '═════════════════\n📋 **مراجعة عملية النقل**\n═════════════════\n\n'
      : '═══════════════════\n✅ **تمت عملية النقل بنجاح**\n═══════════════════\n\n'

    let message = header
    message += `📦 **الصنف:** ${data.itemName}\n`
    message += `🔢 **الكود:** \`${data.itemCode}\`\n\n`
    message += `📊 **الكمية:** ${toArabicNumerals(data.quantity)} ${data.unit}\n\n`
    message += `📍 **من:** ${data.fromLocation}\n`
    message += `📍 **إلى:** ${data.toLocation}\n`
    
    if (data.notes) message += `\n📝 **ملاحظات:** ${data.notes}\n`

    if (!data.isReview) {
      message += `\n⏰ **التاريخ:** ${formatArabicDateTime(new Date())}\n`
      if (data.userName) message += `👤 **المستخدم:** ${data.userName}\n`
    }

    return message
  }

  /**
   * ملخص عملية إرجاع
   */
  static buildReturnSummary(data: {
    itemName: string
    itemCode?: string
    currentQty: number
    quantity: number
    unit: string
    employeeName?: string
    equipmentName?: string
    notes?: string
    userName?: string
    isReview?: boolean
  }): string {
    const header = data.isReview
      ? '═════════════════\n📋 **مراجعة عملية الإرجاع**\n═════════════════\n\n'
      : '═══════════════════\n✅ **تمت عملية الإرجاع بنجاح**\n═══════════════════\n\n'

    let message = header
    message += this.buildBaseInfo(data)
    message += this.buildQuantityInfo({
      currentQty: data.currentQty,
      changeQty: data.quantity,
      newQty: data.currentQty + data.quantity,
      unit: data.unit,
      changeLabel: 'المرتجعة'
    })
    message += this.buildAdditionalInfo({
      employeeName: data.employeeName,
      equipmentName: data.equipmentName,
      notes: data.notes
    })

    if (!data.isReview) {
      message += `\n⏰ **التاريخ:** ${formatArabicDateTime(new Date())}\n`
      if (data.userName) message += `👤 **المستخدم:** ${data.userName}\n`
    }

    return message
  }

  /**
   * ملخص عملية تسوية
   */
  static buildAdjustSummary(data: {
    itemName: string
    itemCode?: string
    currentQty: number
    newQty: number
    unit: string
    reason: string
    notes?: string
    userName?: string
    isReview?: boolean
  }): string {
    const header = data.isReview
      ? '═════════════════\n📋 **مراجعة عملية التسوية**\n═════════════════\n\n'
      : '═══════════════════\n✅ **تمت عملية التسوية بنجاح**\n═══════════════════\n\n'

    const difference = data.newQty - data.currentQty
    const changeLabel = difference >= 0 ? 'الزيادة' : 'النقص'

    let message = header
    message += this.buildBaseInfo(data)
    message += this.buildQuantityInfo({
      currentQty: data.currentQty,
      changeQty: difference,
      newQty: data.newQty,
      unit: data.unit,
      changeLabel
    })
    message += `\n📝 **السبب:** ${data.reason}\n`
    if (data.notes) message += `**ملاحظات:** ${data.notes}\n`

    if (!data.isReview) {
      message += `\n⏰ **التاريخ:** ${formatArabicDateTime(new Date())}\n`
      if (data.userName) message += `👤 **المستخدم:** ${data.userName}\n`
    }

    return message
  }
}
