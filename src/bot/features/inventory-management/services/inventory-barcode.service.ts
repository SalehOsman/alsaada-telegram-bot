/**
 * Inventory Barcode Service
 * خدمة البحث بالباركود والاسم
 */

import { Database } from '../../../../modules/database/index.js'

export interface ItemWithStocks {
  item: {
    id: number
    name: string
    sku: string
    unit: string
    description: string | null
    imageUrl: string | null
    imagePath: string | null
    category: {
      id: number
      name: string
    }
  }
  stocks: Array<{
    warehouse: {
      id: number
      name: string
      type: string
    }
    quantity: number
    averageCost: number
  }>
}

export class InventoryBarcodeService {
  /**
   * البحث عن صنف بالباركود (SKU)
   */
  static async findItemByBarcode(sku: string): Promise<ItemWithStocks | null> {
    const item = await Database.prisma.item.findUnique({
      where: { sku },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    })

    if (!item) return null

    return {
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        description: item.description,
        imageUrl: item.imageUrl,
        imagePath: item.imagePath,
        category: {
          id: item.category.id,
          name: item.category.name,
        },
      },
      stocks: item.stocks.map(stock => ({
        warehouse: {
          id: stock.warehouse.id,
          name: stock.warehouse.name,
          type: stock.warehouse.type,
        },
        quantity: stock.quantity,
        averageCost: stock.averageCost,
      })),
    }
  }

  /**
   * البحث عن أصناف بالاسم أو SKU
   */
  static async searchItems(searchTerm: string, limit: number = 20): Promise<ItemWithStocks[]> {
    // SQLite doesn't support case-insensitive search, so we'll fetch all and filter
    const allItems = await Database.prisma.item.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Filter in memory (case-insensitive)
    const searchLower = searchTerm.toLowerCase()
    const filtered = allItems.filter(item =>
      item.sku.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower),
    ).slice(0, limit)

    return filtered.map(item => ({
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        description: item.description,
        imageUrl: item.imageUrl,
        imagePath: item.imagePath,
        category: {
          id: item.category.id,
          name: item.category.name,
        },
      },
      stocks: item.stocks.map(stock => ({
        warehouse: {
          id: stock.warehouse.id,
          name: stock.warehouse.name,
          type: stock.warehouse.type,
        },
        quantity: stock.quantity,
        averageCost: stock.averageCost,
      })),
    }))
  }
}

