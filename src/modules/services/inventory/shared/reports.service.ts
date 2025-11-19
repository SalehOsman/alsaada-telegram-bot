import { Database } from '#root/modules/database/index.js'

export class ReportsService {
  /**
   * Get low stock items
   * Note: In the new unified schema, stock quantities are in INV_Stock table
   */
  static async getLowStockItems(
    warehouse: 'oils-greases' | 'spare-parts',
    threshold?: number
  ) {
    // Get items with stocks below threshold
    const items = await Database.prisma.iNV_Item.findMany({
      where: {
        isActive: true,
        stocks: {
          some: {
            quantity: {
              lte: threshold || 10, // Default threshold
            },
          },
        },
      },
      include: { category: true, stocks: { include: { location: true } } },
      orderBy: { nameAr: 'asc' },
    })

    return items
  }

  /**
   * Get out of stock items
   */
  static async getOutOfStockItems(warehouse: 'oils-greases' | 'spare-parts') {
    const items = await Database.prisma.iNV_Item.findMany({
      where: {
        isActive: true,
        stocks: {
          every: {
            quantity: 0,
          },
        },
      },
      include: { category: true, stocks: { include: { location: true } } },
    })

    return items
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary(warehouse: 'oils-greases' | 'spare-parts') {
    const [totalItems, stocks] = await Promise.all([
      Database.prisma.iNV_Item.count({ where: { isActive: true } }),
      Database.prisma.iNV_Stock.findMany({
        include: { item: true },
      }),
    ])

    // Calculate totals from stocks
    const totalValue = stocks.reduce((sum, stock) => {
      return sum + (stock.item?.unitPrice ? stock.item.unitPrice * stock.quantity : 0)
    }, 0)

    const lowStock = stocks.filter((s) => s.quantity <= (s.item?.minQuantity || 10)).length
    const outOfStock = stocks.filter((s) => s.quantity === 0).length

    return {
      totalItems,
      totalValue,
      lowStock,
      outOfStock,
    }
  }

  /**
   * Get value by category
   */
  static async getValueByCategory(warehouse: 'oils-greases' | 'spare-parts') {
    const items = await Database.prisma.iNV_Item.findMany({
      where: { isActive: true },
      include: { category: true, stocks: true },
    })

    const categoryMap = new Map<string, { name: string; value: number; count: number }>()

    for (const item of items) {
      const categoryName = item.category?.nameAr || 'غير مصنف'
      const existing = categoryMap.get(categoryName) || { name: categoryName, value: 0, count: 0 }
      
      // Calculate value from all stocks
      const itemValue = item.stocks.reduce((sum, stock) => {
        return sum + (item.unitPrice ? item.unitPrice * stock.quantity : 0)
      }, 0)
      
      existing.value += itemValue
      existing.count += 1
      categoryMap.set(categoryName, existing)
    }

    return Array.from(categoryMap.values())
  }

  /**
   * Get value by location
   */
  static async getValueByLocation(warehouse: 'oils-greases' | 'spare-parts') {
    const stocks = await Database.prisma.iNV_Stock.findMany({
      include: { item: true, location: true },
    })

    const locationMap = new Map<string, { name: string; value: number; count: number }>()

    for (const stock of stocks) {
      const locationName = stock.location?.nameAr || 'غير محدد'
      const existing = locationMap.get(locationName) || { name: locationName, value: 0, count: 0 }
      
      const itemValue = stock.item?.unitPrice ? stock.item.unitPrice * stock.quantity : 0
      existing.value += itemValue
      existing.count += 1
      locationMap.set(locationName, existing)
    }

    return Array.from(locationMap.values())
  }
}
