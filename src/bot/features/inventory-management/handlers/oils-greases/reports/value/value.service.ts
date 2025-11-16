import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export class ValueService {
  static async getValueByCategory() {
    return ReportsService.getValueByCategory('oils-greases')
  }

  static async getValueByLocation() {
    return ReportsService.getValueByLocation('oils-greases')
  }
}
