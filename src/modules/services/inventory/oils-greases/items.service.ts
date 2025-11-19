import { Database } from '#root/modules/database/index.js'

export interface CreateItemData {
  barcode?: string
  code: string
  nameAr: string
  nameEn?: string
  categoryId: number
  locationId?: number
  quantity: number
  unit: string
  unitCapacity?: number
  unitPrice: number
  minQuantity?: number
  supplierName?: string
  notes?: string
  images?: string[]
}

export interface UpdateItemData {
  nameAr?: string
  nameEn?: string
  categoryId?: number
  locationId?: number
  quantity?: number
  unit?: string
  unitCapacity?: number
  unitPrice?: number
  minQuantity?: number
  supplierName?: string
  notes?: string
}

export class OilsGreasesItemsService {
  /**
   * Generate unique code for oils/greases item
   */
  static async generateCode(categoryId: number): Promise<string> {
    const category = await Database.prisma.iNV_Category.findUnique({
      where: { id: categoryId },
    })

    if (!category || !category.prefix) throw new Error('Category not found')

    const lastItem = await Database.prisma.iNV_Item.findFirst({
      where: { categoryId },
      orderBy: { code: 'desc' },
    })

    let nextNumber = 1
    if (lastItem) {
      const match = lastItem.code.match(/-(\d+)$/)
      if (match) nextNumber = Number.parseInt(match[1], 10) + 1
    }

    return `${category.prefix}-${nextNumber.toString().padStart(3, '0')}`
  }

  /**
   * Create new item
   * Note: In the unified schema, we create INV_Item first, then INV_Stock
   */
  static async createItem(data: CreateItemData, userId: bigint) {
    // Validation
    if (data.quantity < 0) {
      throw new Error(`❌ الكمية غير صحيحة\n\n📊 الكمية: ${data.quantity}\n✅ يجب أن تكون أكبر من أو تساوي صفر`)
    }
    if (data.unitPrice < 0) {
      throw new Error(`❌ السعر غير صحيح\n\n💰 السعر: ${data.unitPrice}\n✅ يجب أن يكون أكبر من أو يساوي صفر`)
    }

    // Check barcode uniqueness
    if (data.barcode) {
      const existing = await Database.prisma.iNV_Item.findFirst({
        where: { barcode: data.barcode, isActive: true }
      })
      if (existing) {
        throw new Error(`❌ الباركود موجود مسبقاً\n\n🔢 الباركود: ${data.barcode}\n📦 الصنف الموجود: ${existing.nameAr}\n✅ الرجاء استخدام باركود مختلف`)
      }
    }

    // Create item first
    const item = await Database.prisma.iNV_Item.create({
      data: {
        barcode: data.barcode || null,
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn || null,
        categoryId: data.categoryId,
        locationId: data.locationId || null, // ✅ إضافة الموقع الافتراضي
        unit: data.unit,
        unitCapacity: data.unitCapacity || null,
        unitPrice: data.unitPrice,
        minQuantity: data.minQuantity || 5,
        quantity: data.quantity, // ✅ إضافة الكمية
        totalValue: data.quantity * data.unitPrice, // ✅ إضافة القيمة الإجمالية
        supplierName: data.supplierName || null,
        notes: data.notes || null,
        images: data.images ? JSON.stringify(data.images) : undefined,
        createdBy: userId,
        isActive: true,
      },
    })

    // Create initial stock if quantity > 0 and location provided
    if (data.quantity > 0 && data.locationId) {
      await Database.prisma.iNV_Stock.create({
        data: {
          itemId: item.id,
          locationId: data.locationId,
          quantity: data.quantity,
          createdBy: userId,
        },
      })
    }

    return item
  }

  /**
   * Update item
   * Note: quantity updates should be done via INV_Stock table
   */
  static async updateItem(id: number, data: UpdateItemData, userId: bigint) {
    const item = await Database.prisma.iNV_Item.findUnique({
      where: { id },
    })

    if (!item) throw new Error('Item not found')

    // Handle quantity update via stock if needed
    if (data.quantity !== undefined && data.locationId) {
      const stock = await Database.prisma.iNV_Stock.findFirst({
        where: { itemId: id, locationId: data.locationId },
      })

      if (stock) {
        await Database.prisma.iNV_Stock.update({
          where: { id: stock.id },
          data: { quantity: data.quantity, updatedBy: userId },
        })
      } else {
        await Database.prisma.iNV_Stock.create({
          data: {
            itemId: id,
            locationId: data.locationId,
            quantity: data.quantity,
            createdBy: userId,
          },
        })
      }
    }

    // Update item details (excluding quantity and locationId as they're in stock table)
    const { quantity, locationId, ...itemData } = data

    return await Database.prisma.iNV_Item.update({
      where: { id },
      data: {
        ...itemData,
        updatedBy: userId,
      },
    })
  }

  /**
   * Get item with full details
   */
  static async getItemWithDetails(id: number) {
    return await Database.prisma.iNV_Item.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: {
          include: { location: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { location: true },
        },
      },
    })
  }
}
