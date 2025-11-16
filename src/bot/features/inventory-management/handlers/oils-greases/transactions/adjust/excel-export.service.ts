import ExcelJS from 'exceljs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export class ExcelExportService {
  static async exportAuditToExcel(audit: any) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('تقرير الجرد')

    // Set RTL
    worksheet.views = [{ rightToLeft: true }]

    // Header styling
    const headerStyle = {
      font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0070C0' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    }

    // Title
    worksheet.mergeCells('A1:H1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = '📋 تقرير جرد مخزن الزيوت والشحوم'
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0070C0' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 30

    // Info section
    worksheet.mergeCells('A3:B3')
    worksheet.getCell('A3').value = 'رقم الجرد:'
    worksheet.getCell('A3').font = { bold: true }
    worksheet.getCell('C3').value = audit.auditNumber

    worksheet.mergeCells('A4:B4')
    worksheet.getCell('A4').value = 'تاريخ الجرد:'
    worksheet.getCell('A4').font = { bold: true }
    worksheet.getCell('C4').value = audit.auditDate.toLocaleDateString('ar-EG')

    worksheet.mergeCells('A5:B5')
    worksheet.getCell('A5').value = 'الحالة:'
    worksheet.getCell('A5').font = { bold: true }
    worksheet.getCell('C5').value = audit.status === 'COMPLETED' ? 'مكتمل' : 'جاري'

    // Statistics
    worksheet.mergeCells('E3:F3')
    worksheet.getCell('E3').value = 'إجمالي الأصناف:'
    worksheet.getCell('E3').font = { bold: true }
    worksheet.getCell('G3').value = audit.totalItems

    worksheet.mergeCells('E4:F4')
    worksheet.getCell('E4').value = 'أصناف بها فروقات:'
    worksheet.getCell('E4').font = { bold: true }
    worksheet.getCell('G4').value = audit.itemsWithDiff

    worksheet.mergeCells('E5:F5')
    worksheet.getCell('E5').value = 'إجمالي العجز:'
    worksheet.getCell('E5').font = { bold: true }
    worksheet.getCell('G5').value = audit.totalShortage
    worksheet.getCell('G5').font = { color: { argb: 'FFFF0000' } }

    worksheet.mergeCells('E6:F6')
    worksheet.getCell('E6').value = 'إجمالي الزيادة:'
    worksheet.getCell('E6').font = { bold: true }
    worksheet.getCell('G6').value = audit.totalSurplus
    worksheet.getCell('G6').font = { color: { argb: 'FF00B050' } }

    // Table header
    const headerRow = worksheet.getRow(8)
    headerRow.values = ['#', 'الصنف', 'الكود', 'الفئة', 'الموقع', 'الكمية في النظام', 'الكمية الفعلية', 'الفرق']
    headerRow.eachCell((cell) => {
      cell.style = headerStyle
    })
    headerRow.height = 25

    // Data rows
    let rowIndex = 9
    for (let i = 0; i < audit.items.length; i++) {
      const item = audit.items[i]
      const row = worksheet.getRow(rowIndex)
      
      row.values = [
        i + 1,
        item.itemName,
        item.itemCode,
        item.categoryName || '-',
        item.locationName || '-',
        item.systemQuantity,
        item.actualQuantity,
        item.difference,
      ]

      // Styling
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }

        // Color difference column
        if (colNumber === 8) {
          if (item.difference > 0) {
            cell.font = { color: { argb: 'FF00B050' }, bold: true }
          } else if (item.difference < 0) {
            cell.font = { color: { argb: 'FFFF0000' }, bold: true }
          }
        }
      })

      // Highlight rows with discrepancy
      if (item.hasDiscrepancy) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: item.difference > 0 ? 'FFE2EFDA' : 'FFFCE4D6' },
          }
        })
      }

      rowIndex++
    }

    // Column widths
    worksheet.getColumn(1).width = 8
    worksheet.getColumn(2).width = 30
    worksheet.getColumn(3).width = 15
    worksheet.getColumn(4).width = 20
    worksheet.getColumn(5).width = 25
    worksheet.getColumn(6).width = 18
    worksheet.getColumn(7).width = 18
    worksheet.getColumn(8).width = 15

    // Save file
    const uploadsDir = path.join(process.cwd(), 'uploads', 'audits')
    await fs.mkdir(uploadsDir, { recursive: true })
    
    const fileName = `audit-${audit.auditNumber}-${Date.now()}.xlsx`
    const filePath = path.join(uploadsDir, fileName)
    
    await workbook.xlsx.writeFile(filePath)
    
    return filePath
  }
}
