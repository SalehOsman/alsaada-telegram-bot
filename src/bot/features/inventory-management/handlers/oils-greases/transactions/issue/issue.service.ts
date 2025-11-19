import { 
  OilsGreasesIssueService,
  InventoryItemsService,
  CategoryService
} from '#root/modules/services/inventory/index.js'
import { Database } from '#root/modules/database/index.js'

export class IssueService {
  /**
   * Get all items with pagination using shared service
   */
  static async getItems(page: number = 1, limit: number = 8, categoryId?: number) {
    const result = await InventoryItemsService.getItems(
      'oils-greases',
      page,
      limit,
      categoryId ? { categoryId } : undefined
    )
    
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      totalPages: Math.ceil(result.total / limit),
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    }
  }

  /**
   * Search items using shared service
   */
  static async searchItems(query: string) {
    const [byCode, byName, byBarcode] = await Promise.all([
      InventoryItemsService.searchItems('oils-greases', query, 'code'),
      InventoryItemsService.searchItems('oils-greases', query, 'name'),
      query.length > 5 ? InventoryItemsService.searchItems('oils-greases', query, 'barcode') : []
    ])
    
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

  // Get employees
  static async getEmployees(page: number = 1, limit: number = 8) {
    const skip = (page - 1) * limit
    
    const [employees, total] = await Promise.all([
      Database.prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { fullName: 'asc' },
        skip,
        take: limit,
      }),
      Database.prisma.employee.count({ where: { isActive: true } }),
    ])
    
    return {
      employees,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  // Search employees
  static async searchEmployees(query: string) {
    return Database.prisma.employee.findMany({
      where: {
        isActive: true,
        OR: [
          { employeeCode: { contains: query } },
          { fullName: { contains: query } },
          { nickname: { contains: query } },
        ],
      },
      take: 10,
    })
  }

  // Get equipment
  static async getEquipment(page: number = 1, limit: number = 8) {
    const skip = (page - 1) * limit
    
    const [equipment, total] = await Promise.all([
      Database.prisma.equipment.findMany({
        where: { isActive: true },
        orderBy: { nameAr: 'asc' },
        skip,
        take: limit,
      }),
      Database.prisma.equipment.count({ where: { isActive: true } }),
    ])
    
    return {
      equipment,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  // Search equipment
  static async searchEquipment(query: string) {
    return Database.prisma.equipment.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: query } },
          { nameAr: { contains: query } },
          { plateNumber: { contains: query } },
        ],
      },
      take: 10,
    })
  }

  /**
   * Create issuance using shared service
   */
  static async createIssuance(data: {
    itemId: number
    quantity: number
    issuanceType: 'EQUIPMENT' | 'GENERAL'
    equipmentId?: number
    employeeId: number
    purpose?: string
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
    
    return await OilsGreasesIssueService.executeIssue({
      itemId: data.itemId,
      locationId,
      quantity: data.quantity,
      recipientId: data.employeeId,
      notes: data.notes,
      userId: data.userId
    })
  }
}
