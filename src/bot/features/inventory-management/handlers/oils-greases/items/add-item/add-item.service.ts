import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { Database } from '#root/modules/database/index.js'
import type { AddItemData } from './add-item.types.js'

export class AddItemService {
  static async generateCode(categoryId: number): Promise<string> {
    return OilsGreasesItemsService.generateCode(categoryId)
  }

  static async checkBarcodeExists(barcode: string) {
    return InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
  }

  static async saveItem(data: AddItemData, userId: bigint) {
    return OilsGreasesItemsService.createItem(data, userId)
  }

  /**
   * Send report to admins
   */
  static async sendReportToAdmins(ctx: any, item: any, category: any, location: any) {
    try {
      const dept = await Database.prisma.departmentConfig.findUnique({
        where: { code: 'inventory-management' },
      })

      if (!dept)
        return

      const admins = await Database.prisma.departmentAdmin.findMany({
        where: {
          departmentId: dept.id,
          isActive: true,
        },
      })

      const user = ctx.from
      const now = new Date()
      const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })

      let report = ''
      report += '╔═══════════════════════════════╗\n'
      report += '║   🆕 **تقرير إضافة صنف جديد**   ║\n'
      report += '╚═══════════════════════════════╝\n\n'

      report += '👤 **معلومات المسجل:**\n'
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      report += `• الاسم: ${user?.first_name || ''} ${user?.last_name || ''}\n`
      if (user?.username) report += `• المعرف: @${user.username}\n`
      report += `• رقم المستخدم: \`${user?.id}\`\n`
      report += `• التاريخ: ${dateStr}\n`
      report += `• الوقت: ${timeStr}\n\n`

      report += '📋 **معلومات الصنف الأساسية:**\n'
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      report += `• الباركود: \`${item.barcode}\`\n`
      report += `• الكود: \`${item.code}\`\n`
      report += `• الاسم (عربي): **${item.nameAr}**\n`
      if (item.nameEn) report += `• الاسم (إنجليزي): ${item.nameEn}\n`
      report += '\n'

      report += '🏷️ **التصنيف والموقع:**\n'
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      report += `• الفئة: ${category?.nameAr || 'غير محدد'}\n`
      if (category?.nameEn) report += `  └ ${category.nameEn}\n`
      report += `• موقع التخزين: ${location?.nameAr || 'غير محدد'}\n`
      if (location?.nameEn) report += `  └ ${location.nameEn}\n`
      report += '\n'

      report += '📦 **معلومات الكمية:**\n'
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      report += `• الوحدة: ${item.unit}\n`
      report += `• الكمية: **${item.quantity}** ${item.unit}\n`
      report += `• الحد الأدنى: ${item.minQuantity} ${item.unit}\n`
      
      const images = item.images ? JSON.parse(item.images) : []
      const totalLiters = item.quantity * (item.unitCapacity || 1)
      if (totalLiters > item.quantity) {
        report += `• السعة الإجمالية: ${totalLiters} لتر\n`
      }
      report += '\n'

      report += '💰 **المعلومات المالية:**\n'
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
      report += `• سعر الوحدة: ${item.unitPrice.toFixed(2)} جنيه\n`
      report += `• القيمة الإجمالية: **${item.totalValue.toFixed(2)}** جنيه\n`
      report += '\n'

      if (item.supplierName) {
        report += '🏭 **معلومات المورد:**\n'
        report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
        report += `• اسم المورد: ${item.supplierName}\n`
        report += '\n'
      }

      if (item.notes) {
        report += '📝 **ملاحظات إضافية:**\n'
        report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
        report += `${item.notes}\n\n`
      }

      if (images.length > 0) {
        report += `📸 **الصور المرفقة:** ${images.length} صورة\n\n`
      }

      report += '═══════════════════════════════\n'
      report += `🆔 **معرف الصنف:** \`${item.id}\`\n`
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
