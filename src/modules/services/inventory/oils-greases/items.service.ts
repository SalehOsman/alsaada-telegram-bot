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
    const category = await Database.prisma.iNV_OilsGreasesCategory.findUnique({
      where: { id: categoryId },
    })

    if (!category) throw new Error('Category not found')

    const lastItem = await Database.prisma.iNV_OilsGreasesItem.findFirst({
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
      const existing = await Database.prisma.iNV_OilsGreasesItem.findFirst({
        where: { barcode: data.barcode, isActive: true }
      })
      if (existing) {
        throw new Error(`❌ الباركود موجود مسبقاً\n\n🔢 الباركود: ${data.barcode}\n📦 الصنف الموجود: ${existing.nameAr}\n✅ الرجاء استخدام باركود مختلف`)
      }
    }

    const totalValue = data.quantity * data.unitPrice

    return await Database.prisma.iNV_OilsGreasesItem.create({
      data: {
        barcode: data.barcode || null,
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn || null,
        categoryId: data.categoryId,
        locationId: data.locationId || null,
        quantity: data.quantity,
        unit: data.unit,
        unitCapacity: data.unitCapacity || null,
        unitPrice: data.unitPrice,
        totalValue,
        minQuantity: data.minQuantity || 5,
        supplierName: data.supplierName || null,
        notes: data.notes || null,
        images: data.images ? JSON.stringify(data.images) : undefined,
        createdBy: userId,
        isActive: true,
      },
    })
  }

  /**
   * Update item
   */
  static async updateItem(id: number, data: UpdateItemData, userId: bigint) {
    const item = await Database.prisma.iNV_OilsGreasesItem.findUnique({
      where: { id },
    })

    if (!item) throw new Error('Item not found')

    const quantity = data.quantity ?? item.quantity
    const unitPrice = data.unitPrice ?? item.unitPrice
    const totalValue = quantity * unitPrice

    return await Database.prisma.iNV_OilsGreasesItem.update({
      where: { id },
      data: {
        ...data,
        totalValue,
        updatedBy: userId,
      },
    })
  }

  /**
   * Get item with full details
   */
  static async getItemWithDetails(id: number) {
    return await Database.prisma.iNV_OilsGreasesItem.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 5,
        },
        issuances: {
          orderBy: { issuanceDate: 'desc' },
          take: 5,
        },
      },
    })
  }
}
