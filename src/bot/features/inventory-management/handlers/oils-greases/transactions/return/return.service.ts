import { InventoryItemsService } from '#root/modules/services/inventory/shared/inventory-items.service.js'
import { OilsGreasesReturnService } from '#root/modules/services/inventory/oils-greases/return.service.js'
import { Database } from '#root/modules/database/index.js'

export class ReturnService {
  static async getIssuances(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit
    const [issuances, total] = await Promise.all([
      Database.prisma.iNV_OilsGreasesIssuance.findMany({
        include: { item: true, employee: true, equipment: true },
        orderBy: { issuanceDate: 'desc' },
        skip,
        take: limit,
      }),
      Database.prisma.iNV_OilsGreasesIssuance.count(),
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
    return Database.prisma.iNV_OilsGreasesIssuance.findUnique({
      where: { id },
      include: { item: true, employee: true, equipment: true },
    })
  }

  static async createReturn(data: {
    issuanceId: number
    itemId: number
    quantity: number
    notes?: string
    userId: number
  }) {
    return OilsGreasesReturnService.createReturn({
      ...data,
      reason: data.notes || 'إرجاع من عملية صرف',
    })
  }
}
