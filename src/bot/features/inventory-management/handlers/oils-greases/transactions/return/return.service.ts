import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { OilsGreasesReturnService } from '#root/modules/services/inventory/oils-greases/return.service.js'
import { Database } from '#root/modules/database/index.js'

export class ReturnService {
  static async getIssuances(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit
    const [issuances, total] = await Promise.all([
      Database.prisma.iNV_Transaction.findMany({
        where: { transactionType: 'ISSUANCE' },
        include: { item: true, recipientEmployee: { select: { id: true, fullName: true, employeeCode: true } }, equipment: true },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      Database.prisma.iNV_Transaction.count({ where: { transactionType: 'ISSUANCE' } }),
    ])
    return {
      issuances,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }

  static async getIssuanceById(id: number) {
    return Database.prisma.iNV_Transaction.findUnique({
      where: { id, transactionType: 'ISSUANCE' },
      include: { item: true, recipientEmployee: { select: { id: true, fullName: true, employeeCode: true } }, equipment: true },
    })
  }

  static async createReturn(data: {
    issuanceId: number
    itemId: number
    quantity: number
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
    
    return OilsGreasesReturnService.createReturn({
      ...data,
      locationId,
      reason: data.notes || 'إرجاع من عملية صرف',
    })
  }
}
