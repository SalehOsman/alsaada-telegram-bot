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
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findUnique({
        where: { barcode },
        include: { category: true, location: true },
      })
    } else {
      return await Database.prisma.iNV_SparePart.findUnique({
        where: { barcode },
        include: { category: true, location: true },
      })
    }
  }

  /**
   * Soft delete item
   */
  static async softDelete(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id },
        data: { isActive: false },
      })
    } else {
      return await Database.prisma.iNV_SparePart.update({
        where: { id },
        data: { isActive: false },
      })
    }
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
    if (filters?.locationId) where.locationId = filters.locationId
    if (filters?.searchQuery) {
      where.OR = [
        { nameAr: { contains: filters.searchQuery } },
        { code: { contains: filters.searchQuery } }
      ]
    }
    if (filters?.minQuantity !== undefined) {
      where.quantity = { ...where.quantity, gte: filters.minQuantity }
    }
    if (filters?.maxQuantity !== undefined) {
      where.quantity = { ...where.quantity, lte: filters.maxQuantity }
    }

    if (warehouse === 'oils-greases') {
      const [items, total] = await Promise.all([
        Database.prisma.iNV_OilsGreasesItem.findMany({
          where,
          skip,
          take: limit,
          include: { category: true, location: true },
          orderBy: { createdAt: 'desc' }
        }),
        Database.prisma.iNV_OilsGreasesItem.count({ where })
      ])
      return { items, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: skip + limit < total, hasPrev: page > 1 }
    } else {
      const [items, total] = await Promise.all([
        Database.prisma.iNV_SparePart.findMany({
          where,
          skip,
          take: limit,
          include: { category: true, location: true },
          orderBy: { createdAt: 'desc' }
        }),
        Database.prisma.iNV_SparePart.count({ where })
      ])
      return { items, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: skip + limit < total, hasPrev: page > 1 }
    }
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

    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findMany({
        where,
        include: { category: true, location: true },
        take: 20
      })
    } else {
      return await Database.prisma.iNV_SparePart.findMany({
        where,
        include: { category: true, location: true },
        take: 20
      })
    }
  }

  /**
   * Get single item by ID
   */
  static async getItemById(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findUnique({
        where: { id },
        include: { category: true, location: true }
      })
    } else {
      return await Database.prisma.iNV_SparePart.findUnique({
        where: { id },
        include: { category: true, location: true }
      })
    }
  }

  /**
   * Update item quantity
   */
  static async updateItemQuantity(
    warehouse: 'oils-greases' | 'spare-parts',
    itemId: number,
    quantityChange: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.update({
        where: { id: itemId },
        data: { quantity: { increment: quantityChange } }
      })
    } else {
      return await Database.prisma.iNV_SparePart.update({
        where: { id: itemId },
        data: { quantity: { increment: quantityChange } }
      })
    }
  }

  /**
   * Check if item has sufficient quantity
   */
  static async checkAvailability(
    warehouse: 'oils-greases' | 'spare-parts',
    itemId: number,
    requiredQuantity: number
  ): Promise<boolean> {
    const item = await this.getItemById(warehouse, itemId)
    return item ? item.quantity >= requiredQuantity : false
  }


}
