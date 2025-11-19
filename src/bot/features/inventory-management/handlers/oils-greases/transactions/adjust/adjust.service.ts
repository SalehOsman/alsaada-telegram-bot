import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'
import { OilsGreasesAdjustService } from '#root/modules/services/inventory/oils-greases/adjust.service.js'
import { Database } from '#root/modules/database/index.js'

export class AdjustService {
  static async getItems() {
    return Database.prisma.iNV_Item.findMany({
      where: { isActive: true },
      include: { category: true, location: true },
      orderBy: { nameAr: 'asc' },
    })
  }

  static async getItemsByCategory(categoryId: number) {
    return Database.prisma.iNV_Item.findMany({
      where: { isActive: true, categoryId },
      include: { category: true, location: true },
      orderBy: { nameAr: 'asc' },
    })
  }

  static async getItemsByLocation(locationId: number) {
    return Database.prisma.iNV_Item.findMany({
      where: { isActive: true, locationId },
      include: { category: true, location: true },
      orderBy: { nameAr: 'asc' },
    })
  }

  static async getCategories() {
    return CategoryService.getCategories('oils-greases')
  }

  static async getLocations() {
    return Database.prisma.iNV_StorageLocation.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
  }

  static async createAudit(userId: number, auditType: string = 'FULL', targetId?: number) {
    return OilsGreasesAdjustService.createAudit(userId, auditType, targetId)
  }

  static async addAuditItem(data: {
    auditId: number
    itemId: number
    itemCode: string
    itemName: string
    systemQuantity: number
    actualQuantity: number
    unit: string
    locationId?: number
    locationName?: string
    categoryId?: number
    categoryName?: string
  }) {
    return OilsGreasesAdjustService.addAuditItem(data)
  }

  static async completeAudit(auditId: number, userId: number) {
    return OilsGreasesAdjustService.completeAudit(auditId, userId)
  }

  static async applyAdjustments(auditId: number, userId: number) {
    return OilsGreasesAdjustService.applyAdjustments(auditId, userId)
  }

  static async getAuditById(auditId: number) {
    return OilsGreasesAdjustService.getAuditById(auditId)
  }
}
