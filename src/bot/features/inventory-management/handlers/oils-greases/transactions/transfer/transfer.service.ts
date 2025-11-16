import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'
import { OilsGreasesTransferService } from '#root/modules/services/inventory/oils-greases/transfer.service.js'
import { Database } from '#root/modules/database/index.js'

export class TransferService {
  static async getItems(page: number = 1, limit: number = 8) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Database.prisma.iNV_OilsGreasesItem.findMany({
        where: { isActive: true, status: 'AVAILABLE' },
        include: { category: true, location: true },
        orderBy: { nameAr: 'asc' },
        skip,
        take: limit,
      }),
      Database.prisma.iNV_OilsGreasesItem.count({ where: { isActive: true, status: 'AVAILABLE' } }),
    ])
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  static async searchItems(query: string) {
    return Database.prisma.iNV_OilsGreasesItem.findMany({
      where: {
        isActive: true,
        status: 'AVAILABLE',
        OR: [
          { code: { contains: query } },
          { barcode: { contains: query } },
          { nameAr: { contains: query } },
        ],
      },
      include: { category: true, location: true },
      take: 10,
    })
  }

  static async getItemById(id: number) {
    return InventoryItemsService.getItemById('oils-greases', id)
  }

  static async getLocations() {
    return Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
  }

  static async createTransfer(data: {
    itemId: number
    quantity: number
    fromLocationId: number
    toLocationId: number
    notes?: string
    userId: number
  }) {
    return OilsGreasesTransferService.createTransfer(data)
  }
}
