import ExcelJS from 'exceljs'

export class ExcelExportService {
  /**
   * Export items to Excel file
   */
  static async exportItems(
    warehouse: string,
    categoryIds?: any[],
    options?: {
      includeCategories?: boolean
      includeLocations?: boolean
    }
  ): Promise<{ filePath: string; fileName: string; count: number }> {
    const { Database } = await import('#root/modules/database/index.js')
    const path = await import('node:path')
    const fs = await import('node:fs/promises')
    const XLSX = await import('xlsx')

    const where: any = { isActive: true }
    if (categoryIds && categoryIds.length > 0) {
      where.categoryId = { in: categoryIds }
    }

    const items = await Database.prisma.iNV_Item.findMany({
      where,
      include: { category: true, stocks: { include: { location: true } } },
      orderBy: { code: 'asc' },
    })

    const data = items.map(item => {
      // Calculate total quantity from all stock locations
      const totalQuantity = item.stocks.reduce((sum, stock) => sum + stock.quantity, 0)
      const totalValue = item.unitPrice ? item.unitPrice * totalQuantity : 0
      const primaryLocation = item.stocks[0]?.location?.nameAr || ''
      
      return {
        'الكود': item.code,
        'الباركود': item.barcode || '',
        'الاسم (عربي)': item.nameAr,
        'الفئة': item.category?.nameAr || '',
        'الموقع': primaryLocation,
        'الكمية': totalQuantity,
        'الوحدة': item.unit,
        'الحد الأدنى': item.minQuantity,
        'سعر الوحدة': item.unitPrice,
        'القيمة الإجمالية': totalValue,
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, warehouse === 'oils-greases' ? 'الزيوت والشحوم' : 'قطع الغيار')

    const uploadsDir = path.join(process.cwd(), 'uploads', 'exports')
    await fs.mkdir(uploadsDir, { recursive: true })

    const fileName = `${warehouse}-${Date.now()}.xlsx`
    const filePath = path.join(uploadsDir, fileName)

    XLSX.writeFile(wb, filePath)

    return { filePath, fileName, count: items.length }
  }

  static async exportItemsOld(
    warehouse: string,
    items: any[],
    options?: {
      includeCategories?: boolean
      includeLocations?: boolean
    }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('الأصناف')

    worksheet.columns = [
      { header: 'الكود', key: 'code', width: 15 },
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'الفئة', key: 'category', width: 20 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'الوحدة', key: 'unit', width: 10 },
      { header: 'الموقع', key: 'location', width: 20 }
    ]

    items.forEach(item => {
      worksheet.addRow({
        code: item.code,
        name: item.name,
        category: item.category?.name || '-',
        quantity: item.quantity,
        unit: item.unit || '-',
        location: item.location?.name || '-'
      })
    })

    // Style header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer
  }

  /**
   * Export transactions to Excel file
   */
  static async exportTransactions(
    transactions: any[],
    options?: {
      groupByType?: boolean
      includeTotals?: boolean
    }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('المعاملات')

    worksheet.columns = [
      { header: 'رقم المعاملة', key: 'number', width: 20 },
      { header: 'النوع', key: 'type', width: 15 },
      { header: 'الصنف', key: 'item', width: 30 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'السعر', key: 'price', width: 12 },
      { header: 'الإجمالي', key: 'total', width: 12 },
      { header: 'التاريخ', key: 'date', width: 15 }
    ]

    transactions.forEach(trans => {
      worksheet.addRow({
        number: trans.number,
        type: this.translateType(trans.type),
        item: trans.item?.name || '-',
        quantity: trans.quantity,
        price: trans.price || 0,
        total: trans.totalAmount || 0,
        date: new Date(trans.createdAt).toLocaleDateString('ar-EG')
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer
  }

  /**
   * Export stock report to Excel
   */
  static async exportStockReport(
    items: any[],
    options?: {
      lowStockOnly?: boolean
      byCategory?: boolean
    }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('تقرير المخزون')

    worksheet.columns = [
      { header: 'الكود', key: 'code', width: 15 },
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'الفئة', key: 'category', width: 20 },
      { header: 'الكمية الحالية', key: 'quantity', width: 15 },
      { header: 'الحد الأدنى', key: 'minQuantity', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 }
    ]

    items.forEach(item => {
      const isLowStock = item.minQuantity && item.quantity <= item.minQuantity
      worksheet.addRow({
        code: item.code,
        name: item.name,
        category: item.category?.name || '-',
        quantity: item.quantity,
        minQuantity: item.minQuantity || '-',
        status: isLowStock ? 'منخفض' : 'طبيعي'
      })
    })

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer
  }

  private static translateType(type: string): string {
    const types: Record<string, string> = {
      purchase: 'شراء',
      issue: 'صرف',
      transfer: 'نقل',
      return: 'إرجاع',
      adjust: 'تسوية'
    }
    return types[type] || type
  }
}
