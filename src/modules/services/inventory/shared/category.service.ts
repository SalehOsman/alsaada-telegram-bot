import { Database } from '#root/modules/database/index.js'

export class CategoryService {
  /**
   * Get all categories for a warehouse
   */
  static async getCategories(warehouse: 'oils-greases' | 'spare-parts') {
    return await Database.prisma.iNV_Category.findMany({
      orderBy: { nameAr: 'asc' }
    })
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(warehouse: 'oils-greases' | 'spare-parts', id: number) {
    return await Database.prisma.iNV_Category.findUnique({
      where: { id }
    })
  }

  /**
   * Get all items in a category
   */
  static async getItemsByCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    categoryId: number
  ) {
    return await Database.prisma.iNV_Item.findMany({
      where: { categoryId },
      include: { stocks: { include: { location: true } } }
    })
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
    return await Database.prisma.iNV_Category.create({
      data: {
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn || null,
        prefix: data.prefix,
        description: data.description || null,
        orderIndex: data.displayOrder || 0,
        isActive: true,
        createdBy: userId,
      },
    })
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
    return await Database.prisma.iNV_Category.update({
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

  /**
   * Delete category (soft delete)
   */
  static async deleteCategory(
    warehouse: 'oils-greases' | 'spare-parts',
    id: number
  ) {
    return await Database.prisma.iNV_Category.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
