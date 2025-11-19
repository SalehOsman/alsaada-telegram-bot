/**
 * Add Item Service - Business logic for adding items
 * ✅ Refactored to use Shared Services and Utils (v2.0)
 */

import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { Database } from '#root/modules/database/index.js'
import type { AddItemData } from './add-item.types.js'

// ✅ استخدام Utils - من المستوى العام للبوت
import { formatArabicCurrency, formatArabicDateTime } from '#root/bot/utils/formatting/arabic-formatter.util.js'
import { TransactionSummary } from '#root/bot/utils/formatting/transaction-summary.util.js'

export class AddItemService {
  /**
   * Generate item code
   * ✅ Uses shared service
   */
  static async generateCode(categoryId: number): Promise<string> {
    return OilsGreasesItemsService.generateCode(categoryId)
  }

  /**
   * Check if barcode exists
   * ✅ Uses shared service
   */
  static async checkBarcodeExists(barcode: string) {
    return InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
  }

  /**
   * Save new item
   * ✅ Uses shared service
   */
  static async saveItem(data: AddItemData, userId: bigint) {
    return OilsGreasesItemsService.createItem(data, userId)
  }

  /**
   * Send report to admins
   * ⚡ استخدام TransactionSummary.buildPurchaseSummary (اختصار 110 سطر إلى 35)
   */
  static async sendReportToAdmins(ctx: any, item: any, category: any, location: any) {
    try {
      const dept = await Database.prisma.departmentConfig.findUnique({
        where: { code: 'inventory-management' },
      })

      if (!dept) return

      const admins = await Database.prisma.departmentAdmin.findMany({
        where: {
          departmentId: dept.id,
          isActive: true,
        },
      })

      const user = ctx.from
      const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()

      // ⚡ استخدام TransactionSummary بدلاً من بناء التقرير يدوياً
      let report = '╔═══════════════════════════════╗\n'
      report += '║   🆕 **تقرير إضافة صنف جديد**   ║\n'
      report += '╚═══════════════════════════════╝\n\n'
      
      report += TransactionSummary.buildPurchaseSummary({
        itemName: item.nameAr,
        itemCode: item.code,
        itemBarcode: item.barcode,
        itemLocation: location?.nameAr,
        currentQty: 0,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        supplierName: item.supplierName,
        notes: item.notes,
        userName,
        isReview: false,
      })

      report += `\n🆔 **معرف الصنف:** \`${item.id}\`\n`
      report += '═══════════════════════════════'

      for (const admin of admins) {
        if (admin.telegramId && Number(admin.telegramId) !== ctx.from?.id) {
          try {
            await ctx.api.sendMessage(Number(admin.telegramId), report, {
              parse_mode: 'Markdown',
            })
          }
          catch (err) {
            console.error(`Failed to send report to admin ${admin.telegramId}:`, err)
          }
        }
      }
    }
    catch (error) {
      console.error('Error sending reports to admins:', error)
    }
  }
}
