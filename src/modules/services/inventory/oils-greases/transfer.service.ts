import { Database } from '#root/modules/database/index.js'

export interface TransferData {
  itemId: number
  quantity: number
  fromLocationId: number
  toLocationId: number
  notes?: string
  userId: number
}

export class OilsGreasesTransferService {
  static async createTransfer(data: TransferData) {
    // Validation
    if (data.quantity <= 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية: ${data.quantity}\n✅ يجب أن تكون أكبر من صفر`)
    }
    if (data.fromLocationId === data.toLocationId) {
      throw new Error('❌ عملية نقل غير صحيحة\n\n❗ لا يمكن النقل إلى نفس الموقع')
    }

    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id: data.itemId },
    })

    if (!item) throw new Error('❌ الصنف غير موجود')

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const count = await Database.prisma.iNV_Transaction.count({
      where: {
        transactionType: 'TRANSFER',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        },
      },
    })
    const transferNumber = `TRF-OILS-${dateStr}-${String(count + 1).padStart(3, '0')}`

    return Database.prisma.$transaction(async (tx) => {
      // Check stock at source location
      const fromStock = await tx.iNV_Stock.findFirst({
        where: { itemId: data.itemId, locationId: data.fromLocationId }
      })

      if (!fromStock || fromStock.quantity < data.quantity) {
        throw new Error(`❌ الكمية غير كافية في الموقع المصدر`)
      }

      // Decrease from source
      await tx.iNV_Stock.update({
        where: { id: fromStock.id },
        data: { quantity: { decrement: data.quantity } }
      })

      // Increase to destination (or create if not exists)
      const toStock = await tx.iNV_Stock.findFirst({
        where: { itemId: data.itemId, locationId: data.toLocationId }
      })

      if (toStock) {
        await tx.iNV_Stock.update({
          where: { id: toStock.id },
          data: { quantity: { increment: data.quantity } }
        })
      } else {
        await tx.iNV_Stock.create({
          data: {
            itemId: data.itemId,
            locationId: data.toLocationId,
            quantity: data.quantity,
            createdBy: BigInt(data.userId)
          }
        })
      }

      // Create transfer transaction
      const transfer = await tx.iNV_Transaction.create({
        data: {
          transactionNumber: transferNumber,
          transactionType: 'TRANSFER',
          itemId: data.itemId,
          locationId: data.fromLocationId, // Source location
          toLocationId: data.toLocationId,
          quantity: data.quantity,
          notes: data.notes,
          createdBy: BigInt(data.userId),
        },
      })

      return { success: true, transfer }
    })
  }
}
