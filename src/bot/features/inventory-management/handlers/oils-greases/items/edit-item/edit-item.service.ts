import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'
import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { Database } from '#root/modules/database/index.js'

export class EditItemService {
  static async getItemById(id: number) {
    return InventoryItemsService.getItemById('oils-greases', id)
  }

  static async updateCategory(itemId: number, categoryId: number, userId: bigint) {
    return OilsGreasesItemsService.updateItem(itemId, { categoryId }, userId)
  }

  static async updateLocation(itemId: number, locationId: number, userId: bigint) {
    return OilsGreasesItemsService.updateItem(itemId, { locationId }, userId)
  }

  static async updateField(itemId: number, field: string, value: any, userId: bigint) {
    const data: any = {}
    data[field] = value
    return OilsGreasesItemsService.updateItem(itemId, data, userId)
  }

  static async getCategories() {
    return CategoryService.getCategories('oils-greases')
  }

  static async getLocations() {
    return Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
  }
}
