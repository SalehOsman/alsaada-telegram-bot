import { 
  OilsGreasesPurchaseService,
  InventoryItemsService,
  CategoryService
} from '#root/modules/services/inventory/index.js'
import { Database } from '#root/modules/database/index.js'

export class PurchaseService {
  /**
   * Create purchase transaction using shared service
   */
  static async createPurchase(data: {
    itemId: number
    quantity: number
    unitPrice: number
    supplierName?: string
    invoiceNumber?: string
    notes?: string
    userId: number
  }) {
    // Get item to fetch default locationId
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: data.itemId },
      select: { locationId: true }
    })
    
    if (!item) {
      throw new Error('❌ الصنف غير موجود')
    }
    
    // Use item's default locationId or a fallback (location 1)
    const locationId = item.locationId || 1
    
    return await OilsGreasesPurchaseService.executePurchase({
      itemId: data.itemId,
      locationId,
      quantity: data.quantity,
      price: data.unitPrice,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      userId: data.userId
    })
  }

  /**
   * Search items using shared service
   */
  static async searchItems(query: string) {
    // Try all search types and combine results
    const [byCode, byName, byBarcode] = await Promise.all([
      InventoryItemsService.searchItems('oils-greases', query, 'code'),
      InventoryItemsService.searchItems('oils-greases', query, 'name'),
      query.length > 5 ? InventoryItemsService.searchItems('oils-greases', query, 'barcode') : []
    ])
    
    // Combine and deduplicate
    const allItems = [...byCode, ...byName, ...byBarcode]
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    )
    
    return uniqueItems.slice(0, 10)
  }

  /**
   * Get item by ID using shared service
   */
  static async getItemById(id: number) {
    return await InventoryItemsService.getItemById('oils-greases', id)
  }

  /**
   * Get categories using shared service
   */
  static async getCategories() {
    return await CategoryService.getCategories('oils-greases')
  }
}
