import { Database } from '#root/modules/database/index.js'
import { TransactionNumberService } from '../shared/index.js'

export interface PurchaseData {
  itemId: number
  quantity: number
  price: number
  invoiceNumber?: string
  notes?: string
  userId: number
}

export class OilsGreasesPurchaseService {
  /**
   * Execute purchase transaction
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
      // Update item quantity
      const item = await tx.iNV_OilsGreasesItem.update({
        where: { id: data.itemId },
        data: { quantity: { increment: data.quantity } }
      })

      // Generate transaction number
      const transactionNumber = await TransactionNumberService.generate(
        'oils-greases',
        'purchase'
      )

      // Create transaction record
      const transaction = await tx.iNV_OilsGreasesPurchase.create({
        data: {
          purchaseNumber: transactionNumber,
          itemId: data.itemId,
          quantity: data.quantity,
          unitPrice: data.price,
          totalCost: data.quantity * data.price,
          invoiceNumber: data.invoiceNumber,
          notes: data.notes,
          createdBy: BigInt(data.userId)
        }
      })

      return { transaction, item }
    })
  }
}
