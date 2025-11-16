import { Database } from '#root/modules/database/index.js'
import { TransactionNumberService } from '../shared/index.js'

export interface IssueData {
  itemId: number
  quantity: number
  recipientId?: number
  notes?: string
  userId: number
}

export class OilsGreasesIssueService {
  /**
   * Execute issue transaction
   */
  static async executeIssue(data: IssueData) {
    // Validation
    if (data.quantity <= 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية المدخلة: ${data.quantity}\n✅ يجب أن تكون أكبر من صفر`)
    }

    return await Database.prisma.$transaction(async tx => {
      // Check availability
      const item = await tx.iNV_OilsGreasesItem.findUnique({
        where: { id: data.itemId }
      })

      if (!item) {
        throw new Error('❌ الصنف غير موجود')
      }

      if (item.quantity < data.quantity) {
        throw new Error(
          `❌ الكمية غير كافية\n\n📦 الصنف: ${item.nameAr}\n📊 المتوفر: ${item.quantity} ${item.unit}\n📈 المطلوب: ${data.quantity} ${item.unit}`
        )
      }

      // Update item quantity
      const updatedItem = await tx.iNV_OilsGreasesItem.update({
        where: { id: data.itemId },
        data: { quantity: { decrement: data.quantity } }
      })

      // Generate transaction number
      const transactionNumber = await TransactionNumberService.generate(
        'oils-greases',
        'issue'
      )

      // Create transaction record
      const transaction = await tx.iNV_OilsGreasesIssuance.create({
        data: {
          issuanceNumber: transactionNumber,
          itemId: data.itemId,
          quantity: data.quantity,
          issuedToEmployeeId: data.recipientId,
          notes: data.notes,
          createdBy: BigInt(data.userId)
        }
      })

      return { transaction, item: updatedItem }
    })
  }
}
