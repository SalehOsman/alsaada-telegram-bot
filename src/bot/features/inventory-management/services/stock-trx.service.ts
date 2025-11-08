/**
 * Stock Transaction Service
 * خدمة إدارة حركات المخزون
 */

import { Database } from '../../../../modules/database/index.js'
import { calculateWAC } from './costing.service.js'
import type { StockTransactionType } from '../../../../../generated/prisma/index.js'

export interface CreateStockTransactionInput {
  stockId: number
  type: StockTransactionType
  quantity: number
  unitPrice?: number
  purchaseOrderId?: number
  notes?: string
}

/**
 * إنشاء حركة مخزون وتحديث الرصيد (Atomic Transaction)
 * 
 * يضمن أن الحركة والرصيد يتم تحديثهما معاً أو لا يتم تحديثهما
 */
export async function createStockTransaction(
  input: CreateStockTransactionInput,
): Promise<{ transaction: any; stock: any }> {
  return await Database.prisma.$transaction(async (tx) => {
    // 1. جلب الرصيد الحالي
    const stock = await tx.stock.findUnique({
      where: { id: input.stockId },
    })

    if (!stock) {
      throw new Error('Stock not found')
    }

    // 2. حساب الكمية الجديدة
    const newQuantity = stock.quantity + input.quantity

    if (newQuantity < 0) {
      throw new Error('Insufficient stock')
    }

    // 3. حساب التكلفة الجديدة (فقط للشراء)
    let newCost = stock.averageCost
    if (input.type === 'PURCHASE_IN' && input.unitPrice) {
      newCost = calculateWAC(
        stock.quantity,
        stock.averageCost,
        input.quantity,
        input.unitPrice,
      )
    }

    // 4. إنشاء الحركة
    const transaction = await tx.stockTransaction.create({
      data: {
        stockId: input.stockId,
        type: input.type,
        quantity: input.quantity,
        unitPrice: input.unitPrice || stock.averageCost,
        purchaseOrderId: input.purchaseOrderId,
        notes: input.notes,
        date: new Date(),
      },
    })

    // 5. تحديث الرصيد
    const updatedStock = await tx.stock.update({
      where: { id: input.stockId },
      data: {
        quantity: newQuantity,
        averageCost: newCost,
      },
    })

    return { transaction, stock: updatedStock }
  })
}

