import { Database } from '#root/modules/database/index.js'

export class ReportsService {
  /**
   * Get low stock items
   */
  static async getLowStockItems(
    warehouse: 'oils-greases' | 'spare-parts',
    threshold?: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findMany({
        where: {
          isActive: true,
          quantity: {
            lte: threshold || Database.prisma.iNV_OilsGreasesItem.fields.minQuantity,
          },
        },
        include: { category: true, location: true },
        orderBy: { quantity: 'asc' },
      })
    } else {
      return await Database.prisma.iNV_SparePart.findMany({
        where: {
          isActive: true,
          quantity: {
            lte: threshold || Database.prisma.iNV_SparePart.fields.minQuantity,
          },
        },
        include: { category: true, location: true },
        orderBy: { quantity: 'asc' },
      })
    }
  }

  /**
   * Get out of stock items
   */
  static async getOutOfStockItems(warehouse: 'oils-greases' | 'spare-parts') {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findMany({
        where: {
          isActive: true,
          quantity: 0,
        },
        include: { category: true, location: true },
      })
    } else {
      return await Database.prisma.iNV_SparePart.findMany({
        where: {
          isActive: true,
          quantity: 0,
        },
        include: { category: true, location: true },
      })
    }
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary(warehouse: 'oils-greases' | 'spare-parts') {
    if (warehouse === 'oils-greases') {
      const [totalItems, totalValue, lowStock, outOfStock] = await Promise.all([
        Database.prisma.iNV_OilsGreasesItem.count({ where: { isActive: true } }),
        Database.prisma.iNV_OilsGreasesItem.aggregate({
          where: { isActive: true },
          _sum: { totalValue: true },
        }),
        Database.prisma.iNV_OilsGreasesItem.count({
          where: {
            isActive: true,
            quantity: { lte: Database.prisma.iNV_OilsGreasesItem.fields.minQuantity },
          },
        }),
        Database.prisma.iNV_OilsGreasesItem.count({
          where: { isActive: true, quantity: 0 },
        }),
      ])

      return {
        totalItems,
        totalValue: totalValue._sum.totalValue || 0,
        lowStock,
        outOfStock,
      }
    } else {
      const [totalItems, totalValue, lowStock, outOfStock] = await Promise.all([
        Database.prisma.iNV_SparePart.count({ where: { isActive: true } }),
        Database.prisma.iNV_SparePart.aggregate({
          where: { isActive: true },
          _sum: { totalValue: true },
        }),
        Database.prisma.iNV_SparePart.count({
          where: {
            isActive: true,
            quantity: { lte: Database.prisma.iNV_SparePart.fields.minQuantity },
          },
        }),
        Database.prisma.iNV_SparePart.count({
          where: { isActive: true, quantity: 0 },
        }),
      ])

      return {
        totalItems,
        totalValue: totalValue._sum.totalValue || 0,
        lowStock,
        outOfStock,
      }
    }
  }

  /**
   * Get value by category
   */
  static async getValueByCategory(warehouse: 'oils-greases' | 'spare-parts') {
    if (warehouse === 'oils-greases') {
      const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
        where: { isActive: true },
        include: { category: true },
      })

      const categoryMap = new Map<string, { name: string; value: number; count: number }>()

      for (const item of items) {
        const categoryName = item.category?.nameAr || 'غير مصنف'
        const existing = categoryMap.get(categoryName) || { name: categoryName, value: 0, count: 0 }
        existing.value += item.totalValue
        existing.count += 1
        categoryMap.set(categoryName, existing)
      }

      return Array.from(categoryMap.values())
    } else {
      const items = await Database.prisma.iNV_SparePart.findMany({
        where: { isActive: true },
        include: { category: true },
      })

      const categoryMap = new Map<string, { name: string; value: number; count: number }>()

      for (const item of items) {
        const categoryName = item.category?.nameAr || 'غير مصنف'
        const existing = categoryMap.get(categoryName) || { name: categoryName, value: 0, count: 0 }
        existing.value += item.totalValue
        existing.count += 1
        categoryMap.set(categoryName, existing)
      }

      return Array.from(categoryMap.values())
    }
  }

  /**
   * Get value by location
   */
  static async getValueByLocation(warehouse: 'oils-greases' | 'spare-parts') {
    if (warehouse === 'oils-greases') {
      const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
        where: { isActive: true },
        include: { location: true },
      })

      const locationMap = new Map<string, { name: string; value: number; count: number }>()

      for (const item of items) {
        const locationName = item.location?.nameAr || 'غير محدد'
        const existing = locationMap.get(locationName) || { name: locationName, value: 0, count: 0 }
        existing.value += item.totalValue
        existing.count += 1
        locationMap.set(locationName, existing)
      }

      return Array.from(locationMap.values())
    } else {
      const items = await Database.prisma.iNV_SparePart.findMany({
        where: { isActive: true },
        include: { location: true },
      })

      const locationMap = new Map<string, { name: string; value: number; count: number }>()

      for (const item of items) {
        const locationName = item.location?.nameAr || 'غير محدد'
        const existing = locationMap.get(locationName) || { name: locationName, value: 0, count: 0 }
        existing.value += item.totalValue
        existing.count += 1
        locationMap.set(locationName, existing)
      }

      return Array.from(locationMap.values())
    }
  }
}
