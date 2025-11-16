import { OilsGreasesItemsService } from '#root/modules/services/inventory/oils-greases/items.service.js'

export class ViewItemService {
  static async getItemWithDetails(id: number) {
    return OilsGreasesItemsService.getItemWithDetails(id)
  }
}
