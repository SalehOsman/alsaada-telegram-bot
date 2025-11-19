import { Database } from '#root/modules/database/index.js'

export interface PaginatedResult<T = any> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ItemFilters {
  categoryId?: number
  locationId?: number
  searchQuery?: string
  minQuantity?: number
  maxQuantity?: number
}

export class InventoryItemsService {
  /**
   * Check if barcode exists
   */
  static async checkBarcodeExists(
    warehouse: 'oils-greases' | 'spare-parts',
    barcode: string
  ) {
    return await Database.prisma.iNV_Item.findUnique({
      where: { barcode },
      include: { category: true, stocks: { include: { location: true } } },
    })
  }

  /**
   * Soft delete item
   */
  static async softDelete(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    return await Database.prisma.iNV_Item.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Get paginated items from any warehouse
   */
  static async getItems(
    warehouse: 'oils-greases' | 'spare-parts',
    page: number,
    limit: number,
    filters?: ItemFilters
  ): Promise<PaginatedResult> {
    const skip = (page - 1) * limit

    const where: any = {}
    if (filters?.categoryId) where.categoryId = filters.categoryId
    if (filters?.searchQuery) {
      where.OR = [
        { nameAr: { contains: filters.searchQuery } },
        { code: { contains: filters.searchQuery } }
      ]
    }
    // Note: quantity filtering now needs to be done via stocks relation
    if (filters?.locationId || filters?.minQuantity !== undefined || filters?.maxQuantity !== undefined) {
      const stockWhere: any = {}
      if (filters.locationId) stockWhere.locationId = filters.locationId
      if (filters.minQuantity !== undefined) stockWhere.quantity = { ...stockWhere.quantity, gte: filters.minQuantity }
      if (filters.maxQuantity !== undefined) stockWhere.quantity = { ...stockWhere.quantity, lte: filters.maxQuantity }
      where.stocks = { some: stockWhere }
    }

    const [items, total] = await Promise.all([
      Database.prisma.iNV_Item.findMany({
        where,
        skip,
        take: limit,
        include: { 
          category: true, 
          location: true,
          stocks: { include: { location: true } } 
        },
        orderBy: { createdAt: 'desc' }
      }),
      Database.prisma.iNV_Item.count({ where })
    ])
    return { items, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: skip + limit < total, hasPrev: page > 1 }
  }

  /**
   * Search items by code, name, or barcode
   */
  static async searchItems(
    warehouse: 'oils-greases' | 'spare-parts',
    query: string,
    searchType: 'code' | 'name' | 'barcode'
  ) {
    const where =
      searchType === 'code'
        ? { code: { contains: query } }
        : searchType === 'name'
        ? { nameAr: { contains: query } }
        : { barcode: query }

    return await Database.prisma.iNV_Item.findMany({
      where,
      include: { category: true, stocks: { include: { location: true } } },
      take: 20
    })
  }

  /**
   * Get single item by ID
   */
  static async getItemById(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    return await Database.prisma.iNV_Item.findUnique({
      where: { id },
      include: { 
        category: true, 
        location: true,
        stocks: { include: { location: true } } 
      }
    })
  }

  /**
   * Update item quantity in a specific location
   * Note: In the new schema, quantity is in INV_Stock, not INV_Item
   */
  static async updateItemQuantity(
    warehouse: 'oils-greases' | 'spare-parts',
    itemId: number,
    quantityChange: number,
    locationId?: number
  ) {
    // If no locationId provided, update the first stock entry
    const stock = await Database.prisma.iNV_Stock.findFirst({
      where: { 
        itemId,
        ...(locationId && { locationId })
      }
    })
    
    if (stock) {
      return await Database.prisma.iNV_Stock.update({
        where: { id: stock.id },
        data: { quantity: { increment: quantityChange } }
      })
    }
    return null
  }

  /**
   * Check if item has sufficient quantity
   */
  static async checkAvailability(
    warehouse: 'oils-greases' | 'spare-parts',
    itemId: number,
    requiredQuantity: number,
    locationId?: number
  ): Promise<boolean> {
    const stocks = await Database.prisma.iNV_Stock.findMany({
      where: { 
        itemId,
        ...(locationId && { locationId })
      }
    })
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0)
    return totalQuantity >= requiredQuantity
  }


}
