import { Database } from '#root/modules/database/index.js'
import { TransactionNumberService } from '../shared/index.js'

export interface IssueData {
  itemId: number
  locationId: number
  quantity: number
  recipientId?: number
  notes?: string
  userId: number
}

export class OilsGreasesIssueService {
  /**
   * Execute issue transaction
   * Note: In unified schema, we update INV_Stock and create INV_Transaction
   */
  static async executeIssue(data: IssueData) {
    // Validation
    if (data.quantity <= 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية المدخلة: ${data.quantity}\n✅ يجب أن تكون أكبر من صفر`)
    }

    return await Database.prisma.$transaction(async tx => {
      // Check availability
      const item = await tx.iNV_Item.findUnique({
        where: { id: data.itemId }
      })

      if (!item) {
        throw new Error('❌ الصنف غير موجود')
      }

      // Check stock at location
      const stock = await tx.iNV_Stock.findFirst({
        where: { itemId: data.itemId, locationId: data.locationId }
      })

      if (!stock || stock.quantity < data.quantity) {
        throw new Error(
          `❌ الكمية غير كافية\n\n📦 الصنف: ${item.nameAr}\n📊 المتوفر: ${stock?.quantity || 0} ${item.unit}\n📈 المطلوب: ${data.quantity} ${item.unit}`
        )
      }

      // Update stock quantity
      const updatedStock = await tx.iNV_Stock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: data.quantity } }
      })

      // Generate transaction number
      const transactionNumber = await TransactionNumberService.generate(
        'oils-greases',
        'issue'
      )

      // Create unified transaction record
      const transaction = await tx.iNV_Transaction.create({
        data: {
          transactionNumber,
          transactionType: 'ISSUANCE',
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: data.quantity,
          recipientEmployeeId: data.recipientId,
          notes: data.notes,
          createdBy: BigInt(data.userId)
        }
      })

      return { transaction, stock: updatedStock }
    })
  }
}
