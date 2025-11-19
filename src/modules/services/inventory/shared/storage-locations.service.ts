import { Database } from '#root/modules/database/index.js'

export class StorageLocationsService {
  /**
   * Get all storage locations for a warehouse
   */
  static async getLocations() {
    return await Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' }
    })
  }

  /**
   * Get storage location by ID
   */
  static async getLocationById(id: number) {
    return await Database.prisma.iNV_StorageLocation.findUnique({
      where: { id }
    })
  }

  /**
   * Create new storage location
   */
  static async createLocation(
    data: {
      code: string
      nameAr: string
      nameEn?: string
      locationType: string
      locationArea?: string
      description?: string
      capacity?: number
      orderIndex?: number
    },
    userId: bigint
  ) {
    return await Database.prisma.iNV_StorageLocation.create({
      data: {
        ...data,
        orderIndex: data.orderIndex || 0,
        isActive: true,
        createdBy: userId,
      },
    })
  }

  /**
   * Update storage location
   */
  static async updateLocation(
    id: number,
    data: {
      nameAr?: string
      nameEn?: string
      locationArea?: string
      description?: string
      capacity?: number
      orderIndex?: number
    },
    userId: bigint
  ) {
    return await Database.prisma.iNV_StorageLocation.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    })
  }

  /**
   * Delete storage location (soft delete)
   */
  static async deleteLocation(id: number) {
    return await Database.prisma.iNV_StorageLocation.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /**
   * Get all items in a specific location
   */
  static async getItemsByLocation(
    warehouse: 'oils-greases' | 'spare-parts',
    locationId: number
  ) {
    // Get stocks at this location, then get their items
    const stocks = await Database.prisma.iNV_Stock.findMany({
      where: { locationId },
      include: { 
        item: { 
          include: { category: true } 
        } 
      }
    })

    return stocks.map(stock => stock.item)
  }
}
