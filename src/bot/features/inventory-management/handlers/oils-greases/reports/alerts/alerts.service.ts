import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export class AlertsService {
  static async getLowStockItems(threshold?: number) {
    return ReportsService.getLowStockItems('oils-greases', threshold)
  }

  static async getOutOfStockItems() {
    return ReportsService.getOutOfStockItems('oils-greases')
  }
}
