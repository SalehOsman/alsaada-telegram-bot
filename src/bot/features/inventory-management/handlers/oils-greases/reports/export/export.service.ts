import { ExcelExportService } from '#root/modules/services/inventory/shared/excel-export.service.js'

export class ExportService {
  static async exportItems(categoryIds?: number[]) {
    return ExcelExportService.exportItems('oils-greases', categoryIds || [])
  }
}
