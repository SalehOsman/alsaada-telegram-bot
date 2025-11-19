import { Database } from '#root/modules/database/index.js'
import * as XLSX from 'xlsx'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export class PurchaseReportService {
  static async generateReport(filters: {
    itemId?: number
    startDate?: Date
    endDate?: Date
  }) {
    const where: any = { transactionType: 'PURCHASE' }
    
    if (filters.itemId) where.itemId = filters.itemId
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {}
      if (filters.startDate) where.transactionDate.gte = filters.startDate
      if (filters.endDate) where.transactionDate.lte = filters.endDate
    }

    const purchases = await Database.prisma.iNV_Transaction.findMany({
      where,
      include: {
        item: {
          include: {
            category: true,
            location: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    })

    // Statistics
    const totalPurchases = purchases.length
    const totalQuantity = purchases.reduce((sum: number, p: any) => sum + p.quantity, 0)
    const totalCost = purchases.reduce((sum: number, p: any) => sum + (p.unitPrice * p.quantity), 0)
    const uniqueItems = new Set(purchases.map((p: any) => p.itemId)).size
    const uniqueSuppliers = new Set(purchases.map((p: any) => p.item.supplierName).filter(Boolean)).size

    // Group by item
    const itemStats = purchases.reduce((acc: any, p: any) => {
      const key = p.item.nameAr
      if (!acc[key]) {
        acc[key] = { quantity: 0, cost: 0, count: 0 }
      }
      acc[key].quantity += p.quantity
      acc[key].cost += (p.unitPrice * p.quantity)
      acc[key].count += 1
      return acc
    }, {} as Record<string, { quantity: number; cost: number; count: number }>)

    // Group by supplier
    const supplierStats = purchases.reduce((acc: any, p: any) => {
      const key = p.item.supplierName || 'غير محدد'
      if (!acc[key]) {
        acc[key] = { quantity: 0, cost: 0, count: 0 }
      }
      acc[key].quantity += p.quantity
      acc[key].cost += (p.unitPrice * p.quantity)
      acc[key].count += 1
      return acc
    }, {} as Record<string, { quantity: number; cost: number; count: number }>)

    return {
      purchases,
      statistics: {
        totalPurchases,
        totalQuantity,
        totalCost,
        uniqueItems,
        uniqueSuppliers,
        itemStats,
        supplierStats,
      },
    }
  }

  static async exportToExcel(filters: {
    itemId?: number
    startDate?: Date
    endDate?: Date
  }) {
    const { purchases, statistics } = await this.generateReport(filters)

    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary
    const summaryData = [
      ['تقرير عمليات الشراء - الزيوت والشحوم'],
      [''],
      ['إحصائيات عامة'],
      ['إجمالي العمليات', statistics.totalPurchases],
      ['إجمالي الكمية', statistics.totalQuantity],
      ['إجمالي التكلفة', `${statistics.totalCost.toFixed(2)} جنيه`],
      ['عدد الأصناف', statistics.uniqueItems],
      ['عدد الموردين', statistics.uniqueSuppliers],
      [''],
      ['تاريخ التقرير', new Date().toLocaleString('ar-EG')],
    ]

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص')

    // Sheet 2: All Purchases
    const purchasesData = purchases.map((p: any) => ({
      'رقم العملية': p.transactionNumber,
      'التاريخ': new Date(p.transactionDate).toLocaleString('ar-EG'),
      'الصنف': p.item.nameAr,
      'الكود': p.item.code,
      'الفئة': p.item.category?.nameAr || '',
      'الموقع': p.item.location?.nameAr || '',
      'الكمية': p.quantity,
      'الوحدة': p.item.unit,
      'سعر الوحدة': p.unitPrice,
      'التكلفة الإجمالية': (p.unitPrice * p.quantity).toFixed(2),
      'المورد': p.item.supplierName || '',
      'رقم الفاتورة': p.referenceNumber || '',
      'ملاحظات': p.notes || '',
    }))

    const wsPurchases = XLSX.utils.json_to_sheet(purchasesData)
    wsPurchases['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(wb, wsPurchases, 'جميع العمليات')

    // Sheet 3: By Item
    const itemStatsData = Object.entries(statistics.itemStats).map(([name, stats]: [string, any]) => ({
      'الصنف': name,
      'عدد العمليات': stats.count,
      'إجمالي الكمية': stats.quantity,
      'إجمالي التكلفة': stats.cost.toFixed(2),
      'متوسط سعر الوحدة': (stats.cost / stats.quantity).toFixed(2),
    }))

    const wsItems = XLSX.utils.json_to_sheet(itemStatsData)
    wsItems['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsItems, 'حسب الصنف')

    // Sheet 4: By Supplier
    const supplierStatsData = Object.entries(statistics.supplierStats).map(([name, stats]: [string, any]) => ({
      'المورد': name,
      'عدد العمليات': stats.count,
      'إجمالي الكمية': stats.quantity,
      'إجمالي التكلفة': stats.cost.toFixed(2),
    }))

    const wsSuppliers = XLSX.utils.json_to_sheet(supplierStatsData)
    wsSuppliers['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsSuppliers, 'حسب المورد')

    // Save file
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports')
    await fs.mkdir(uploadsDir, { recursive: true })

    const fileName = `purchase-report-${Date.now()}.xlsx`
    const filePath = path.join(uploadsDir, fileName)

    XLSX.writeFile(wb, filePath)

    return { filePath, fileName, statistics }
  }

  static async getItems() {
    return await Database.prisma.iNV_Item.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, code: true },
      orderBy: { nameAr: 'asc' },
    })
  }
}
