import { ReportsService } from '#root/modules/services/inventory/shared/reports.service.js'

export class SummaryService {
  static async getInventorySummary() {
    return ReportsService.getInventorySummary('oils-greases')
  }
}
