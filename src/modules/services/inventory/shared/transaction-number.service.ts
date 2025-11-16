import { Database } from '#root/modules/database/index.js'

type TransactionType = 'purchase' | 'issue' | 'transfer' | 'return' | 'adjust'

export class TransactionNumberService {
  /**
   * Generate unique transaction number
   * Format: {PREFIX}-{YYMM}-{SEQUENCE}
   * Example: OG-PUR-2401-0001
   */
  static async generate(
    warehouse: 'oils-greases' | 'spare-parts',
    type: TransactionType
  ): Promise<string> {
    const prefix = this.getPrefix(warehouse, type)
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const yearMonth = `${year}${month}`

    const lastTransaction = await Database.prisma.iNV_OilsGreasesPurchase.findFirst({
      where: {
        purchaseNumber: { startsWith: `${prefix}-${yearMonth}` }
      },
      orderBy: { createdAt: 'desc' }
    })

    const sequence = lastTransaction
      ? this.extractSequence(lastTransaction.purchaseNumber) + 1
      : 1

    return `${prefix}-${yearMonth}-${sequence.toString().padStart(4, '0')}`
  }

  /**
   * Get last transaction number
   */
  static async getLastNumber(
    warehouse: string,
    type: string
  ): Promise<string | null> {
    const transaction = await Database.prisma.iNV_OilsGreasesPurchase.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    return transaction?.purchaseNumber || null
  }

  /**
   * Validate transaction number format
   */
  static validateNumber(number: string): boolean {
    return /^[A-Z]{2}-[A-Z]{3}-\d{4}-\d{4}$/.test(number)
  }

  private static getPrefix(warehouse: string, type: string): string {
    const prefixes: Record<string, Record<string, string>> = {
      'oils-greases': {
        purchase: 'OG-PUR',
        issue: 'OG-ISS',
        transfer: 'OG-TRF',
        return: 'OG-RET',
        adjust: 'OG-ADJ'
      },
      'spare-parts': {
        purchase: 'SP-PUR',
        issue: 'SP-ISS',
        transfer: 'SP-TRF',
        return: 'SP-RET',
        adjust: 'SP-ADJ'
      }
    }
    return prefixes[warehouse]?.[type] || 'XX-XXX'
  }

  private static extractSequence(number: string): number {
    const parts = number.split('-')
    return Number.parseInt(parts[parts.length - 1], 10) || 0
  }
}
