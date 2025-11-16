import { Database } from '#root/modules/database/index.js'

export interface AdjustmentData {
  auditId: number
  itemId: number
  itemCode: string
  itemName: string
  systemQuantity: number
  actualQuantity: number
  unit: string
  locationId?: number
  locationName?: string
  categoryId?: number
  categoryName?: string
}

export class OilsGreasesAdjustService {
  static async createAudit(userId: number, auditType: string = 'FULL', targetId?: number) {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const count = await Database.prisma.iNV_InventoryAudit.count({
      where: {
        auditDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        },
      },
    })
    const auditNumber = `AUD-OILS-${dateStr}-${String(count + 1).padStart(3, '0')}`

    const items = await Database.prisma.iNV_OilsGreasesItem.findMany({
      where: { isActive: true },
    })

    return Database.prisma.iNV_InventoryAudit.create({
      data: {
        auditNumber,
        warehouseType: 'OILS',
        auditType,
        categoryId: auditType === 'CATEGORY' ? targetId : undefined,
        locationId: auditType === 'LOCATION' ? targetId : undefined,
        status: 'IN_PROGRESS',
        totalItems: items.length,
        itemsChecked: 0,
        itemsWithDiff: 0,
        totalShortage: 0,
        totalSurplus: 0,
        createdBy: BigInt(userId),
      },
    })
  }

  static async addAuditItem(data: AdjustmentData) {
    // Validation
    if (data.actualQuantity < 0) {
      throw new Error(`❌ الكمية الفعلية غير صحيحة\n\n📊 الكمية: ${data.actualQuantity}\n✅ يجب أن تكون أكبر من أو تساوي صفر`)
    }

    const difference = data.actualQuantity - data.systemQuantity
    const hasDiscrepancy = difference !== 0
    const discrepancyType = difference > 0 ? 'SURPLUS' : difference < 0 ? 'SHORTAGE' : 'MATCH'

    return Database.prisma.iNV_InventoryAuditItem.create({
      data: {
        auditId: data.auditId,
        itemId: data.itemId,
        itemType: 'OIL',
        itemCode: data.itemCode,
        itemName: data.itemName,
        systemQuantity: Math.round(data.systemQuantity),
        actualQuantity: Math.round(data.actualQuantity),
        difference: Math.round(difference),
        unit: data.unit,
        locationId: data.locationId,
        locationName: data.locationName,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        hasDiscrepancy,
        discrepancyType,
      },
    })
  }

  static async completeAudit(auditId: number, userId: number) {
    const items = await Database.prisma.iNV_InventoryAuditItem.findMany({
      where: { auditId },
    })

    const itemsWithDiff = items.filter(i => i.hasDiscrepancy).length
    const totalShortage = items.reduce((sum, i) => sum + (i.difference < 0 ? Math.abs(i.difference) : 0), 0)
    const totalSurplus = items.reduce((sum, i) => sum + (i.difference > 0 ? i.difference : 0), 0)

    return Database.prisma.iNV_InventoryAudit.update({
      where: { id: auditId },
      data: {
        status: 'COMPLETED',
        itemsChecked: items.length,
        itemsWithDiff,
        totalShortage,
        totalSurplus,
        completedDate: new Date(),
        completedBy: BigInt(userId),
      },
    })
  }

  static async applyAdjustments(auditId: number, userId: number) {
    const items = await Database.prisma.iNV_InventoryAuditItem.findMany({
      where: { auditId, hasDiscrepancy: true },
    })

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const adjustmentNumber = `ADJ-OILS-${dateStr}-${String(i + 1).padStart(3, '0')}`

      await Database.prisma.$transaction(async (tx) => {
        await tx.iNV_OilsGreasesItem.update({
          where: { id: item.itemId },
          data: { quantity: item.actualQuantity },
        })

        await tx.iNV_OilsGreasesAdjustment.create({
          data: {
            adjustmentNumber,
            itemId: item.itemId,
            quantityBefore: item.systemQuantity,
            quantityAfter: item.actualQuantity,
            quantityDifference: item.difference,
            adjustmentType: item.difference > 0 ? 'INCREASE' : 'DECREASE',
            reason: `جرد مخزون - ${item.discrepancyType}`,
            createdBy: BigInt(userId),
            approvedBy: BigInt(userId),
            approvedAt: now,
          },
        })
      })
    }
  }

  static async getAuditById(auditId: number) {
    return Database.prisma.iNV_InventoryAudit.findUnique({
      where: { id: auditId },
      include: {
        items: {
          orderBy: { itemName: 'asc' },
        },
      },
    })
  }
}
