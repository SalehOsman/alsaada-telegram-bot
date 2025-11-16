import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { Database } from '#root/modules/database/index.js'

export class SearchItemService {
  static async searchByBarcode(barcode: string) {
    return InventoryItemsService.checkBarcodeExists('oils-greases', barcode)
  }

  static async searchByCode(code: string) {
    const results = await InventoryItemsService.searchItems('oils-greases', code, 'code')
    return results[0] || null
  }

  static async searchByName(name: string) {
    return InventoryItemsService.searchItems('oils-greases', name, 'name')
  }

  static async searchByCategory(categoryId: number) {
    return Database.prisma.iNV_OilsGreasesItem.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: true,
        location: true,
      },
      orderBy: { nameAr: 'asc' },
    })
  }

  static async getCategories() {
    return CategoryService.getCategories('oils-greases')
  }
}
