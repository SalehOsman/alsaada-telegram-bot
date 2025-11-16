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

    const item = await Database.prisma.iNV_OilsGreasesItem.findUnique({
      where: { id: data.itemId },
    })

    if (!item) throw new Error('❌ الصنف غير موجود')
    if (item.locationId !== data.fromLocationId) {
      throw new Error('❌ الصنف غير موجود في الموقع المحدد')
    }

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const count = await Database.prisma.iNV_OilsGreasesTransfer.count({
      where: {
        transferDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        },
      },
    })
    const transferNumber = `TRF-OILS-${dateStr}-${String(count + 1).padStart(3, '0')}`

    return Database.prisma.$transaction(async (tx) => {
      await tx.iNV_OilsGreasesItem.update({
        where: { id: data.itemId },
        data: { locationId: data.toLocationId },
      })

      const transfer = await tx.iNV_OilsGreasesTransfer.create({
        data: {
          transferNumber,
          itemId: data.itemId,
          quantity: data.quantity,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          notes: data.notes,
          createdBy: BigInt(data.userId),
        },
      })

      return { success: true, transfer }
    })
  }
}
