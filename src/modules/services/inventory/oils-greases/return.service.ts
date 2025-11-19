import { Database } from '#root/modules/database/index.js'

export interface ReturnData {
  itemId: number
  locationId: number
  quantity: number
  returnedByEmployeeId?: number
  returnedByEquipmentId?: number
  reason: string
  notes?: string
  userId: number
}

export class OilsGreasesReturnService {
  static async createReturn(data: ReturnData) {
    // Validation
    if (data.quantity <= 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية: ${data.quantity}\n✅ يجب أن تكون أكبر من صفر`)
    }

    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: data.itemId },
    })

    if (!item) throw new Error('❌ الصنف غير موجود')

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const count = await Database.prisma.iNV_Transaction.count({
      where: {
        transactionType: 'RETURN',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        },
      },
    })
    const returnNumber = `RET-OILS-${dateStr}-${String(count + 1).padStart(3, '0')}`

    return Database.prisma.$transaction(async (tx) => {
      // Find or create stock at location
      let stock = await tx.iNV_Stock.findFirst({
        where: { itemId: data.itemId, locationId: data.locationId }
      })

      if (stock) {
        await tx.iNV_Stock.update({
          where: { id: stock.id },
          data: { quantity: { increment: data.quantity } }
        })
      } else {
        stock = await tx.iNV_Stock.create({
          data: {
            itemId: data.itemId,
            locationId: data.locationId,
            quantity: data.quantity,
            createdBy: BigInt(data.userId)
          }
        })
      }

      // Create return transaction
      const returnRecord = await tx.iNV_Transaction.create({
        data: {
          transactionNumber: returnNumber,
          transactionType: 'RETURN',
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: data.quantity,
          returnedByEmployeeId: data.returnedByEmployeeId,
          returnedByEquipmentId: data.returnedByEquipmentId,
          reason: data.reason,
          notes: data.notes,
          createdBy: BigInt(data.userId),
        },
      })

      return { success: true, return: returnRecord }
    })
  }
}
