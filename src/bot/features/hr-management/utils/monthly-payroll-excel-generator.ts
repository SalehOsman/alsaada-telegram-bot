/**
 * Monthly Payroll Excel Generator
 * مولد تقارير Excel الاحترافية للرواتب الشهرية
 *
 * الشيتات المشمولة:
 * 1. الملخص التنفيذي
 * 2. تفاصيل الرواتب الكاملة
 * 3. الإحصائيات والتحليلات
 * 4. المقارنة مع 3 أشهر سابقة
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from '#root/modules/database/index.js'
import ExcelJS from 'exceljs'

// Types - نوع البيانات كما يأتي من قاعدة البيانات مع علاقة Employee
type PayrollWithRelations = Awaited<
  ReturnType<
    typeof Database.prisma.hR_MonthlyPayroll.findMany<{
      include: {
        employee: {
          select: {
            employeeCode: true
            fullName: true
            nickname: true
            department: { select: { name: true } }
            position: { select: { titleAr: true } }
          }
        }
      }
    }>
  >
>[number]

const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function getMonthName(month: number): string {
  return monthNames[month - 1] || 'غير معروف'
}

/**
 * إنشاء تقرير Excel احترافي للرواتب الشهرية
 */
export async function createMonthlyPayrollExcel(
  payrolls: PayrollWithRelations[],
  month: number,
  year: number,
): Promise<string> {
  // جلب بيانات الشركة من قاعدة البيانات
  const company = await Database.prisma.company.findFirst({
    where: { isActive: true },
    select: { name: true },
  })
  const companyName = company?.name || 'شركة السعادة'

  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'نظام السعادة للموارد البشرية'
  workbook.created = new Date()
  workbook.company = companyName

  // إنشاء الشيتات
  await createSummarySheet(workbook, payrolls, month, year, companyName)
  await createDetailsSheet(workbook, payrolls, month, year)
  await createStatisticsSheet(workbook, payrolls, month, year)
  await createComparisonSheet(workbook, month, year)

  // حفظ الملف
  const fileName = `monthly_payroll_${year}_${month.toString().padStart(2, '0')}_${Date.now()}.xlsx`
  const filePath = join(tmpdir(), fileName)
  await workbook.xlsx.writeFile(filePath)

  return filePath
}

/**
 * شيت 1: الملخص التنفيذي
 */
async function createSummarySheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollWithRelations[],
  month: number,
  year: number,
  companyName: string,
) {
  const sheet = workbook.addWorksheet('الملخص التنفيذي', {
    views: [{ rightToLeft: true }],
  })

  // عرض الأعمدة
  sheet.columns = [
    { width: 5 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
  ]

  let rowIndex = 1

  // العنوان الرئيسي
  const titleRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`)
  const titleCell = titleRow.getCell(1)
  titleCell.value = `كشف رواتب ${getMonthName(month)} ${year}`
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' },
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleRow.height = 30

  rowIndex++ // سطر فارغ

  // معلومات الشركة
  const infoRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${infoRow.number}:D${infoRow.number}`)
  const infoCell = infoRow.getCell(1)
  infoCell.value = companyName
  infoCell.font = { name: 'Arial', size: 14, bold: true }
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' }

  rowIndex++ // سطر فارغ

  // الإحصائيات الرئيسية
  const statsRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${statsRow.number}:D${statsRow.number}`)
  const statsCell = statsRow.getCell(1)
  statsCell.value = '📊 الإحصائيات الرئيسية'
  statsCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  statsCell.alignment = { horizontal: 'center', vertical: 'middle' }

  rowIndex++

  // حساب الإحصائيات
  const totalEmployees = payrolls.length
  const totalBasicSalary = payrolls.reduce((sum, p) => sum + Number(p.proratedSalary), 0)
  const totalAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalAllowances), 0)
  const totalBonuses = payrolls.reduce((sum, p) => sum + Number(p.totalBonuses), 0)
  const totalLeaveAllowances = payrolls.reduce((sum, p) => sum + Number(p.totalLeaveAllowances), 0)
  const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0)
  const totalPenalties = payrolls.reduce((sum, p) => sum + Number(p.totalDelayPenalties), 0)
  const totalEarnings = payrolls.reduce((sum, p) => sum + Number(p.totalEarnings), 0)
  const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0)

  const stats = [
    { label: 'عدد الموظفين', value: totalEmployees, format: '#,##0' },
    { label: 'إجمالي الرواتب الأساسية', value: totalBasicSalary, format: '#,##0.00' },
    { label: 'إجمالي البدلات', value: totalAllowances, format: '#,##0.00' },
    { label: 'إجمالي المكافآت', value: totalBonuses, format: '#,##0.00' },
    { label: 'إجمالي بدل الإجازات', value: totalLeaveAllowances, format: '#,##0.00' },
    { label: 'إجمالي الخصومات', value: totalDeductions, format: '#,##0.00' },
    { label: 'إجمالي الغرامات', value: totalPenalties, format: '#,##0.00' },
    { label: 'إجمالي المستحقات', value: totalEarnings, format: '#,##0.00' },
    { label: 'صافي المدفوعات', value: totalNet, format: '#,##0.00' },
  ]

  stats.forEach((stat) => {
    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = stat.label
    row.getCell(2).font = { name: 'Arial', size: 12, bold: true }
    row.getCell(2).alignment = { horizontal: 'right' }

    row.getCell(3).value = stat.value
    row.getCell(3).numFmt = stat.format
    row.getCell(3).font = { name: 'Arial', size: 12 }
    row.getCell(3).alignment = { horizontal: 'center' }

    row.getCell(4).value = 'ج.م'
    row.getCell(4).font = { name: 'Arial', size: 12 }
    row.getCell(4).alignment = { horizontal: 'left' }

    // تلوين السطر
    if (stat.label.includes('صافي')) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      row.getCell(3).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F4E78' } }
    }
  })

  rowIndex += 2

  // التوزيع حسب الأقسام
  const deptRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${deptRow.number}:D${deptRow.number}`)
  const deptCell = deptRow.getCell(1)
  deptCell.value = '🏢 التوزيع حسب الأقسام'
  deptCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  deptCell.alignment = { horizontal: 'center', vertical: 'middle' }

  rowIndex++

  // جدول الأقسام
  const headerRow = sheet.getRow(rowIndex++)
  headerRow.getCell(2).value = 'القسم'
  headerRow.getCell(3).value = 'عدد الموظفين'
  headerRow.getCell(4).value = 'إجمالي الصافي'

  headerRow.eachCell((cell, colNum) => {
    if (colNum >= 2) {
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  })

  // تجميع حسب القسم
  const deptStats = new Map<string, { count: number, total: number }>()
  payrolls.forEach((p) => {
    const deptName = p.employee.department?.name || 'بدون قسم'
    const current = deptStats.get(deptName) || { count: 0, total: 0 }
    current.count++
    current.total += Number(p.netSalary)
    deptStats.set(deptName, current)
  })

  Array.from(deptStats.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([deptName, stats]) => {
      const row = sheet.getRow(rowIndex++)
      row.getCell(2).value = deptName
      row.getCell(3).value = stats.count
      row.getCell(3).numFmt = '#,##0'
      row.getCell(4).value = stats.total
      row.getCell(4).numFmt = '#,##0.00'

      row.eachCell((cell, colNum) => {
        if (colNum >= 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        }
      })
    })

  rowIndex += 2

  // تاريخ الطباعة
  const footerRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`)
  const footerCell = footerRow.getCell(1)
  footerCell.value = `تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}`
  footerCell.font = { name: 'Arial', size: 10, italic: true }
  footerCell.alignment = { horizontal: 'center' }
}

/**
 * شيت 2: تفاصيل الرواتب الكاملة
 */
async function createDetailsSheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollWithRelations[],
  _month: number,
  _year: number,
) {
  const sheet = workbook.addWorksheet('التفاصيل الكاملة', {
    views: [{ rightToLeft: true }],
  })

  // تحديد الأعمدة
  sheet.columns = [
    { header: 'م', key: 'no', width: 5 },
    { header: 'الكود', key: 'code', width: 10 },
    { header: 'الاسم', key: 'name', width: 20 },
    { header: 'القسم', key: 'dept', width: 18 },
    { header: 'الوظيفة', key: 'position', width: 18 },
    { header: 'أيام العمل', key: 'workDays', width: 12 },
    { header: 'الراتب الأساسي', key: 'basic', width: 15 },
    { header: 'البدلات', key: 'allowances', width: 12 },
    { header: 'بدل مسحوبات', key: 'material', width: 12 },
    { header: 'المكافآت', key: 'bonuses', width: 12 },
    { header: 'بدل إجازات', key: 'leaveAllowance', width: 12 },
    { header: 'السلف', key: 'advances', width: 12 },
    { header: 'المسحوبات', key: 'withdrawals', width: 12 },
    { header: 'الديون', key: 'debts', width: 12 },
    { header: 'الغرامات', key: 'penalties', width: 12 },
    { header: 'الصافي', key: 'net', width: 15 },
  ]

  // تنسيق الهيدر
  const headerRow = sheet.getRow(1)
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 25

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // إضافة البيانات
  payrolls.forEach((p, index) => {
    const row = sheet.addRow({
      no: index + 1,
      code: p.employee.employeeCode,
      name: p.employee.nickname || p.employee.fullName,
      dept: p.employee.department?.name || '-',
      position: p.employee.position?.titleAr || '-',
      workDays: Number(p.actualWorkDays),
      basic: Number(p.proratedSalary),
      allowances: Number(p.totalAllowances), // ✅ totalAllowances لا يحتوي على materialAllowance
      material: Number(p.materialAllowance),
      bonuses: Number(p.totalBonuses),
      leaveAllowance: Number(p.totalLeaveAllowances),
      advances: Number(p.totalAdvances),
      withdrawals: Number(p.totalWithdrawals),
      debts: Number(p.totalDebts),
      penalties: Number(p.totalDelayPenalties),
      net: Number(p.netSalary),
    })

    // تنسيق الأرقام
    row.getCell('workDays').numFmt = '#,##0'
    row.getCell('basic').numFmt = '#,##0.00'
    row.getCell('allowances').numFmt = '#,##0.00'
    row.getCell('material').numFmt = '#,##0.00'
    row.getCell('bonuses').numFmt = '#,##0.00'
    row.getCell('leaveAllowance').numFmt = '#,##0.00'
    row.getCell('advances').numFmt = '#,##0.00'
    row.getCell('withdrawals').numFmt = '#,##0.00'
    row.getCell('debts').numFmt = '#,##0.00'
    row.getCell('penalties').numFmt = '#,##0.00'
    row.getCell('net').numFmt = '#,##0.00'

    // تنسيق الحدود
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // تلوين متبادل
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
      })
    }

    // تمييز الصافي
    row.getCell('net').font = { name: 'Arial', size: 11, bold: true }
    row.getCell('net').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }
  })

  // إضافة سطر الإجماليات
  const totalRow = sheet.addRow({
    no: '',
    code: '',
    name: 'الإجمالي',
    dept: '',
    position: '',
    workDays: payrolls.reduce((sum, p) => sum + Number(p.actualWorkDays), 0),
    basic: payrolls.reduce((sum, p) => sum + Number(p.proratedSalary), 0),
    allowances: payrolls.reduce((sum, p) => sum + Number(p.totalAllowances), 0), // ✅ totalAllowances منفصل
    material: payrolls.reduce((sum, p) => sum + Number(p.materialAllowance), 0),
    bonuses: payrolls.reduce((sum, p) => sum + Number(p.totalBonuses), 0),
    leaveAllowance: payrolls.reduce((sum, p) => sum + Number(p.totalLeaveAllowances), 0),
    advances: payrolls.reduce((sum, p) => sum + Number(p.totalAdvances), 0),
    withdrawals: payrolls.reduce((sum, p) => sum + Number(p.totalWithdrawals), 0),
    debts: payrolls.reduce((sum, p) => sum + Number(p.totalDebts), 0),
    penalties: payrolls.reduce((sum, p) => sum + Number(p.totalDelayPenalties), 0),
    net: payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0),
  })

  totalRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  totalRow.alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.height = 25

  totalRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thick' },
      left: { style: 'thin' },
      bottom: { style: 'thick' },
      right: { style: 'thin' },
    }
  })

  // تنسيق أرقام الإجماليات
  totalRow.getCell('workDays').numFmt = '#,##0'
  totalRow.getCell('basic').numFmt = '#,##0.00'
  totalRow.getCell('allowances').numFmt = '#,##0.00'
  totalRow.getCell('material').numFmt = '#,##0.00'
  totalRow.getCell('bonuses').numFmt = '#,##0.00'
  totalRow.getCell('leaveAllowance').numFmt = '#,##0.00'
  totalRow.getCell('advances').numFmt = '#,##0.00'
  totalRow.getCell('withdrawals').numFmt = '#,##0.00'
  totalRow.getCell('debts').numFmt = '#,##0.00'
  totalRow.getCell('penalties').numFmt = '#,##0.00'
  totalRow.getCell('net').numFmt = '#,##0.00'

  // تجميد الصف الأول
  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', rightToLeft: true },
  ]
}

/**
 * شيت 3: الإحصائيات والتحليلات
 */
async function createStatisticsSheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollWithRelations[],
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('الإحصائيات', {
    views: [{ rightToLeft: true }],
  })

  sheet.columns = [
    { width: 5 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ]

  let rowIndex = 1

  // العنوان
  const titleRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`)
  const titleCell = titleRow.getCell(1)
  titleCell.value = `التحليلات الإحصائية - ${getMonthName(month)} ${year}`
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleRow.height = 30

  rowIndex += 2

  // 1. توزيع الرواتب
  const salaryDistRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${salaryDistRow.number}:E${salaryDistRow.number}`)
  salaryDistRow.getCell(1).value = '📊 توزيع الرواتب'
  salaryDistRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  salaryDistRow.getCell(1).alignment = { horizontal: 'center' }

  rowIndex++

  const ranges = [
    { label: 'أقل من 3,000 ج.م', min: 0, max: 3000 },
    { label: '3,000 - 5,000 ج.م', min: 3000, max: 5000 },
    { label: '5,000 - 7,000 ج.م', min: 5000, max: 7000 },
    { label: '7,000 - 10,000 ج.م', min: 7000, max: 10000 },
    { label: 'أكثر من 10,000 ج.م', min: 10000, max: Infinity },
  ]

  const headerRow1 = sheet.getRow(rowIndex++)
  headerRow1.getCell(2).value = 'الفئة'
  headerRow1.getCell(3).value = 'عدد الموظفين'
  headerRow1.getCell(4).value = 'النسبة المئوية'
  headerRow1.getCell(5).value = 'إجمالي الرواتب'

  headerRow1.eachCell((cell, colNum) => {
    if (colNum >= 2) {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  })

  ranges.forEach((range) => {
    const count = payrolls.filter(p => Number(p.netSalary) >= range.min && Number(p.netSalary) < range.max).length
    const percentage = (count / payrolls.length) * 100
    const total = payrolls
      .filter(p => Number(p.netSalary) >= range.min && Number(p.netSalary) < range.max)
      .reduce((sum, p) => sum + Number(p.netSalary), 0)

    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = range.label
    row.getCell(3).value = count
    row.getCell(3).numFmt = '#,##0'
    row.getCell(4).value = percentage / 100
    row.getCell(4).numFmt = '0.00%'
    row.getCell(5).value = total
    row.getCell(5).numFmt = '#,##0.00'

    row.eachCell((cell, colNum) => {
      if (colNum >= 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
      }
    })
  })

  rowIndex += 2

  // 2. أعلى وأقل الرواتب
  const topBottomRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${topBottomRow.number}:E${topBottomRow.number}`)
  topBottomRow.getCell(1).value = '🏆 أعلى وأقل الرواتب'
  topBottomRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  topBottomRow.getCell(1).alignment = { horizontal: 'center' }

  rowIndex++

  const headerRow2 = sheet.getRow(rowIndex++)
  headerRow2.getCell(2).value = 'الاسم'
  headerRow2.getCell(3).value = 'القسم'
  headerRow2.getCell(4).value = 'الوظيفة'
  headerRow2.getCell(5).value = 'صافي الراتب'

  headerRow2.eachCell((cell, colNum) => {
    if (colNum >= 2) {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  })

  // أعلى 5 رواتب
  const topPayrolls = [...payrolls].sort((a, b) => Number(b.netSalary) - Number(a.netSalary)).slice(0, 5)
  topPayrolls.forEach((p) => {
    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = p.employee.nickname || p.employee.fullName
    row.getCell(3).value = p.employee.department?.name || '-'
    row.getCell(4).value = p.employee.position?.titleAr || '-'
    row.getCell(5).value = Number(p.netSalary)
    row.getCell(5).numFmt = '#,##0.00'

    row.eachCell((cell, colNum) => {
      if (colNum >= 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
      }
    })
  })

  rowIndex++

  // أقل 5 رواتب
  const bottomPayrolls = [...payrolls].sort((a, b) => Number(a.netSalary) - Number(b.netSalary)).slice(0, 5)
  bottomPayrolls.forEach((p) => {
    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = p.employee.nickname || p.employee.fullName
    row.getCell(3).value = p.employee.department?.name || '-'
    row.getCell(4).value = p.employee.position?.titleAr || '-'
    row.getCell(5).value = Number(p.netSalary)
    row.getCell(5).numFmt = '#,##0.00'

    row.eachCell((cell, colNum) => {
      if (colNum >= 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }
      }
    })
  })

  rowIndex += 2

  // 3. متوسطات البنود
  const averagesRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${averagesRow.number}:E${averagesRow.number}`)
  averagesRow.getCell(1).value = '📈 المتوسطات'
  averagesRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  averagesRow.getCell(1).alignment = { horizontal: 'center' }

  rowIndex++

  const avgData = [
    { label: 'متوسط الراتب الأساسي', value: payrolls.reduce((sum, p) => sum + Number(p.proratedSalary), 0) / payrolls.length },
    { label: 'متوسط البدلات', value: payrolls.reduce((sum, p) => sum + Number(p.totalAllowances), 0) / payrolls.length },
    { label: 'متوسط المكافآت', value: payrolls.reduce((sum, p) => sum + Number(p.totalBonuses), 0) / payrolls.length },
    { label: 'متوسط الخصومات', value: payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0) / payrolls.length },
    { label: 'متوسط صافي الراتب', value: payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0) / payrolls.length },
  ]

  avgData.forEach((item) => {
    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = item.label
    row.getCell(2).font = { name: 'Arial', size: 11, bold: true }
    row.getCell(2).alignment = { horizontal: 'right' }

    row.getCell(3).value = item.value
    row.getCell(3).numFmt = '#,##0.00'
    row.getCell(3).alignment = { horizontal: 'center' }

    row.getCell(4).value = 'ج.م'
    row.getCell(4).alignment = { horizontal: 'left' }

    if (item.label.includes('صافي')) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
      row.getCell(3).font = { name: 'Arial', size: 11, bold: true }
    }
  })
}

/**
 * شيت 4: المقارنة مع 3 أشهر سابقة
 */
async function createComparisonSheet(
  workbook: ExcelJS.Workbook,
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('المقارنات الشهرية', {
    views: [{ rightToLeft: true }],
  })

  sheet.columns = [
    { width: 5 },
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ]

  let rowIndex = 1

  // العنوان
  const titleRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`)
  const titleCell = titleRow.getCell(1)
  titleCell.value = 'مقارنة الرواتب - آخر 4 أشهر'
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleRow.height = 30

  rowIndex += 2

  // حساب الأشهر الأربعة
  const months: Array<{ month: number, year: number, label: string }> = []
  for (let i = 0; i < 4; i++) {
    let m = month - i
    let y = year
    while (m <= 0) {
      m += 12
      y--
    }
    months.push({ month: m, year: y, label: `${getMonthName(m)} ${y}` })
  }
  months.reverse()

  // جلب البيانات لكل شهر
  const prisma = Database.prisma
  const monthlyData = await Promise.all(
    months.map(async ({ month: m, year: y }) => {
      const data = await prisma.hR_MonthlyPayroll.aggregate({
        where: { month: m, year: y },
        _count: { id: true },
        _sum: {
          proratedSalary: true,
          totalAllowances: true,
          totalBonuses: true,
          totalLeaveAllowances: true,
          totalDeductions: true,
          totalDelayPenalties: true,
          netSalary: true,
        },
      })
      return {
        month: m,
        year: y,
        label: `${getMonthName(m)} ${y}`,
        count: data._count.id,
        basicSalary: Number(data._sum.proratedSalary || 0),
        allowances: Number(data._sum.totalAllowances || 0),
        bonuses: Number(data._sum.totalBonuses || 0),
        leaveAllowances: Number(data._sum.totalLeaveAllowances || 0),
        deductions: Number(data._sum.totalDeductions || 0),
        penalties: Number(data._sum.totalDelayPenalties || 0),
        net: Number(data._sum.netSalary || 0),
      }
    }),
  )

  // إنشاء جدول المقارنة
  const headerRow = sheet.getRow(rowIndex++)
  headerRow.getCell(2).value = 'البند'
  months.forEach(({ label }, index) => {
    headerRow.getCell(3 + index).value = label
  })

  headerRow.eachCell((cell, colNum) => {
    if (colNum >= 2) {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  })

  // البيانات
  const items = [
    { label: 'عدد الموظفين', key: 'count', format: '#,##0' },
    { label: 'إجمالي الرواتب', key: 'basicSalary', format: '#,##0.00' },
    { label: 'إجمالي البدلات', key: 'allowances', format: '#,##0.00' },
    { label: 'إجمالي المكافآت', key: 'bonuses', format: '#,##0.00' },
    { label: 'إجمالي بدل الإجازات', key: 'leaveAllowances', format: '#,##0.00' },
    { label: 'إجمالي الخصومات', key: 'deductions', format: '#,##0.00' },
    { label: 'إجمالي الغرامات', key: 'penalties', format: '#,##0.00' },
    { label: 'صافي المدفوعات', key: 'net', format: '#,##0.00' },
  ]

  items.forEach((item, itemIndex) => {
    const row = sheet.getRow(rowIndex++)
    row.getCell(2).value = item.label
    row.getCell(2).font = { name: 'Arial', size: 11, bold: true }
    row.getCell(2).alignment = { horizontal: 'right' }

    monthlyData.forEach((data, dataIndex) => {
      const value = data[item.key as keyof typeof data] as number
      const cell = row.getCell(3 + dataIndex)
      cell.value = value
      cell.numFmt = item.format
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }

      // تلوين الشهر الحالي (آخر عمود)
      if (dataIndex === monthlyData.length - 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } }
        cell.font = { name: 'Arial', size: 11, bold: true }
      }
    })

    // تلوين سطر الصافي
    if (item.label.includes('صافي')) {
      row.eachCell((cell, colNum) => {
        if (colNum >= 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
          cell.font = { name: 'Arial', size: 11, bold: true }
        }
      })
    }

    // تلوين متبادل
    if (itemIndex % 2 === 0) {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    }
  })

  rowIndex += 2

  // إضافة نسب التغيير
  const changeRow = sheet.getRow(rowIndex++)
  sheet.mergeCells(`A${changeRow.number}:F${changeRow.number}`)
  changeRow.getCell(1).value = '📊 نسب التغيير (مقارنة بالشهر السابق)'
  changeRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E78' } }
  changeRow.getCell(1).alignment = { horizontal: 'center' }

  rowIndex++

  const changeHeaderRow = sheet.getRow(rowIndex++)
  changeHeaderRow.getCell(2).value = 'البند'
  changeHeaderRow.getCell(3).value = 'الشهر السابق'
  changeHeaderRow.getCell(4).value = 'الشهر الحالي'
  changeHeaderRow.getCell(5).value = 'الفرق'
  changeHeaderRow.getCell(6).value = 'النسبة'

  changeHeaderRow.eachCell((cell, colNum) => {
    if (colNum >= 2) {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  })

  if (monthlyData.length >= 2) {
    const current = monthlyData[monthlyData.length - 1]
    const previous = monthlyData[monthlyData.length - 2]

    const changeItems = [
      { label: 'عدد الموظفين', current: current.count, previous: previous.count, format: '#,##0' },
      { label: 'صافي المدفوعات', current: current.net, previous: previous.net, format: '#,##0.00' },
      { label: 'إجمالي الخصومات', current: current.deductions, previous: previous.deductions, format: '#,##0.00' },
      { label: 'إجمالي الغرامات', current: current.penalties, previous: previous.penalties, format: '#,##0.00' },
    ]

    changeItems.forEach((item) => {
      const row = sheet.getRow(rowIndex++)
      const diff = item.current - item.previous
      const percentage = item.previous !== 0 ? (diff / item.previous) : 0

      row.getCell(2).value = item.label
      row.getCell(2).font = { name: 'Arial', size: 11, bold: true }
      row.getCell(2).alignment = { horizontal: 'right' }

      row.getCell(3).value = item.previous
      row.getCell(3).numFmt = item.format
      row.getCell(3).alignment = { horizontal: 'center' }

      row.getCell(4).value = item.current
      row.getCell(4).numFmt = item.format
      row.getCell(4).alignment = { horizontal: 'center' }

      row.getCell(5).value = diff
      row.getCell(5).numFmt = item.format
      row.getCell(5).alignment = { horizontal: 'center' }

      row.getCell(6).value = percentage
      row.getCell(6).numFmt = '0.00%'
      row.getCell(6).alignment = { horizontal: 'center' }

      // تلوين حسب الاتجاه
      if (diff > 0) {
        row.getCell(5).font = { name: 'Arial', size: 11, color: { argb: 'FF00B050' } }
        row.getCell(6).font = { name: 'Arial', size: 11, color: { argb: 'FF00B050' } }
      }
      else if (diff < 0) {
        row.getCell(5).font = { name: 'Arial', size: 11, color: { argb: 'FFC00000' } }
        row.getCell(6).font = { name: 'Arial', size: 11, color: { argb: 'FFC00000' } }
      }

      row.eachCell((cell, colNum) => {
        if (colNum >= 2) {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        }
      })
    })
  }
}
