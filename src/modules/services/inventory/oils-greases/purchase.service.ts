import { Database } from '#root/modules/database/index.js'
import { TransactionNumberService } from '../shared/index.js'

export interface PurchaseData {
  itemId: number
  locationId: number
  quantity: number
  price: number
  invoiceNumber?: string
  notes?: string
  userId: number
}

export class OilsGreasesPurchaseService {
  /**
   * Execute purchase transaction
   * Note: In unified schema, we update INV_Stock and create INV_Transaction
   */
  static async executePurchase(data: PurchaseData) {
    // Validation
    if (data.quantity <= 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية المدخلة: ${data.quantity}\n✅ يجب أن تكون أكبر من صفر`)
    }
    if (data.price < 0) {
      throw new Error(`❌ السعر غير صحيح\n\n💰 السعر المدخل: ${data.price}\n✅ يجب أن يكون أكبر من أو يساوي صفر`)
    }

    return await Database.prisma.$transaction(async tx => {
      // Find or create stock record
      let stock = await tx.iNV_Stock.findFirst({
        where: { itemId: data.itemId, locationId: data.locationId }
      })

      if (stock) {
        stock = await tx.iNV_Stock.update({
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

      // Generate transaction number
      const transactionNumber = await TransactionNumberService.generate(
        'oils-greases',
        'purchase'
      )

      // Create unified transaction record
      const transaction = await tx.iNV_Transaction.create({
        data: {
          transactionNumber,
          transactionType: 'PURCHASE',
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: data.quantity,
          unitPrice: data.price,
          totalPrice: data.quantity * data.price,
          referenceNumber: data.invoiceNumber,
          notes: data.notes,
          createdBy: BigInt(data.userId)
        }
      })

      return { transaction, stock }
    })
  }
}
