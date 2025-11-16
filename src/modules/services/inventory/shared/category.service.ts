import { Database } from '#root/modules/database/index.js'

export class CategoryService {
  /**
   * Get all categories for a warehouse
   */
  static async getCategories(warehouse: 'oils-greases' | 'spare-parts') {
    return await Database.prisma.iNV_OilsGreasesCategory.findMany({
      orderBy: { nameAr: 'asc' }
    })
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(warehouse: 'oils-greases' | 'spare-parts', id: number) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesCategory.findUnique({
        where: { id }
      })
    } else {
      return await Database.prisma.iNV_EquipmentCategory.findUnique({
        where: { id }
      })
    }
  }

  /**
   * Get all items in a category
   */
  static async getItemsByCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    categoryId: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesItem.findMany({
        where: { categoryId },
        include: { location: true }
      })
    } else {
      return await Database.prisma.iNV_SparePart.findMany({
        where: { categoryId },
        include: { location: true }
      })
    }
  }

  /**
   * Create new category
   */
  static async createCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    data: {
      code: string
      nameAr: string
      nameEn?: string
      prefix: string
      description?: string
      displayOrder?: number
    },
    userId: bigint
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesCategory.create({
        data: {
          ...data,
          displayOrder: data.displayOrder || 0,
          isActive: true,
          createdBy: userId,
        },
      })
    } else {
      return await Database.prisma.iNV_EquipmentCategory.create({
        data: {
          code: data.code,
          nameAr: data.nameAr,
          nameEn: data.nameEn || null,
          description: data.description || null,
          orderIndex: data.displayOrder || 0,
          isActive: true,
          createdBy: userId,
        },
      })
    }
  }

  /**
   * Update category
   */
  static async updateCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number,
    data: {
      nameAr?: string
      nameEn?: string
      description?: string
      displayOrder?: number
    },
    userId: bigint
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesCategory.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      })
    } else {
      return await Database.prisma.iNV_EquipmentCategory.update({
        where: { id },
        data: {
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          description: data.description,
          orderIndex: data.displayOrder,
          updatedBy: userId,
        },
      })
    }
  }

  /**
   * Delete category (soft delete)
   */
  static async deleteCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    if (warehouse === 'oils-greases') {
      return await Database.prisma.iNV_OilsGreasesCategory.update({
        where: { id },
        data: { isActive: false },
      })
    } else {
      return await Database.prisma.iNV_EquipmentCategory.update({
        where: { id },
        data: { isActive: false },
      })
    }
  }
}
