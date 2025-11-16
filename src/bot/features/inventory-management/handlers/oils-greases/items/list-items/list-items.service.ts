import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { ExcelExportService } from '#root/modules/services/inventory/shared/excel-export.service.js'

export class ListItemsService {
  static async getItems(page: number = 1, limit: number = 8, categoryId?: number) {
    return InventoryItemsService.getItems('oils-greases', page, limit, { categoryId })
  }

  static async getCategories() {
    return CategoryService.getCategories('oils-greases')
  }

  static async getItemById(id: number) {
    return InventoryItemsService.getItemById('oils-greases', id)
  }

  static async exportToExcel(categoryId?: number) {
    const categoryIds = categoryId ? [categoryId] : []
    return ExcelExportService.exportItems('oils-greases', categoryIds)
  }

  static async softDeleteItem(id: number) {
    return InventoryItemsService.softDelete('oils-greases', id)
  }
}
