import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'

export class CategoriesService {
  static async getCategories() {
    return CategoryService.getCategories('oils-greases')
  }

  static async getCategoryById(id: number) {
    return CategoryService.getCategoryById('oils-greases', id)
  }

  static async createCategory(data: { nameAr: string; code: string; prefix: string; description?: string }, userId: bigint) {
    return CategoryService.createCategory('oils-greases', data, userId)
  }

  static async updateCategory(id: number, data: { nameAr?: string; code?: string; prefix?: string; description?: string }, userId: bigint) {
    return CategoryService.updateCategory('oils-greases', id, data, userId)
  }

  static async deleteCategory(id: number) {
    return CategoryService.deleteCategory('oils-greases', id)
  }
}
