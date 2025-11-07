/**
 * Professional Payroll Excel Generator
 * مولد ملفات Excel احترافية للرواتب الشهرية
 *
 * Features:
 * - Sheet 1: الملخص التنفيذي (Executive Summary)
 * - Sheet 2: رواتب العاملين (Employee Details)
 * - Sheet 3: الإحصائيات والتحليلات (Statistics & Analytics)
 * - Sheet 4: المقارنات الشهرية (Monthly Comparisons)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { Database } from '#root/modules/database/index.js'
import ExcelJS from 'exceljs'

interface PayrollEmployee {
  id: number
  employee: {
    employeeCode: string
    fullName: string
    nickname: string | null
    department: {
      name: string
    } | null
    position: {
      titleAr?: string | null
      title?: string
    } | null
  }
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  foodAllowance: number
  fieldAllowance: number
  otherAllowances: number
  grossSalary: number
  cashAdvancesTotal: number
  itemWithdrawalsTotal: number
  employeeDebtsTotal: number
  absencesDeduction: number
  penaltiesDeduction: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  status: string
  calculatedAt: Date
}

/**
 * الألوان الاحترافية
 */
const COLORS = {
  primary: 'FF0070C0', // أزرق
  success: 'FF70AD47', // أخضر
  danger: 'FFC00000', // أحمر
  warning: 'FFFFC000', // برتقالي
  dark: 'FF44546A', // رمادي غامق
  light: 'FFE7E6E6', // رمادي فاتح
  white: 'FFFFFFFF',
  headerBg: 'FF203864', // أزرق غامق للعناوين
  subHeaderBg: 'FF305496', // أزرق متوسط
}

/**
 * تنسيق العناوين الرئيسية
 */
function styleMainHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text
  cell.font = { bold: true, size: 16, color: { argb: COLORS.white } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
}

/**
 * تنسيق العناوين الفرعية
 */
function styleSubHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text
  cell.font = { bold: true, size: 12, color: { argb: COLORS.white } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderBg } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  cell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  }
}

/**
 * تنسيق الصف (Row)
 */
function styleDataRow(row: ExcelJS.Row, isAlternate: boolean = false) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.light } },
      bottom: { style: 'thin', color: { argb: COLORS.light } },
      left: { style: 'thin', color: { argb: COLORS.light } },
      right: { style: 'thin', color: { argb: COLORS.light } },
    }
    if (isAlternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    }
  })
}

/**
 * تنسيق الأرقام
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * الحصول على اسم الشهر بالعربية
 */
function getArabicMonthName(month: number): string {
  const months = [
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
  return months[month - 1] || 'غير محدد'
}

/**
 * إنشاء ملف Excel احترافي للرواتب
 */
export async function createProfessionalPayrollExcel(
  payrolls: PayrollEmployee[],
  month: number,
  year: number,
): Promise<string> {
  const workbook = new ExcelJS.Workbook()

  // معلومات الملف
  workbook.creator = 'نظام السعادة لإدارة الموارد البشرية'
  workbook.created = new Date()
  workbook.modified = new Date()

  // ══════════════════════════════════════════════════════════
  // 📊 SHEET 1: الملخص التنفيذي (Executive Summary)
  // ══════════════════════════════════════════════════════════
  await createExecutiveSummarySheet(workbook, payrolls, month, year)

  // ══════════════════════════════════════════════════════════
  // 👥 SHEET 2: رواتب العاملين (Employee Payroll Details)
  // ══════════════════════════════════════════════════════════
  await createEmployeeDetailsSheet(workbook, payrolls, month, year)

  // ══════════════════════════════════════════════════════════
  // 📈 SHEET 3: الإحصائيات والتحليلات (Statistics & Analytics)
  // ══════════════════════════════════════════════════════════
  await createStatisticsSheet(workbook, payrolls, month, year)

  // ══════════════════════════════════════════════════════════
  // 📅 SHEET 4: المقارنات الشهرية (Monthly Comparisons)
  // ══════════════════════════════════════════════════════════
  await createMonthlyComparisonSheet(workbook, month, year)

  // حفظ الملف
  const uploadsDir = path.join(process.cwd(), 'uploads')

  // التأكد من وجود المجلد
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const fileName = `Payroll_${getArabicMonthName(month)}_${year}_${Date.now()}.xlsx`
  const filePath = path.join(uploadsDir, fileName)

  await workbook.xlsx.writeFile(filePath)

  return filePath
}

/**
 * Sheet 1: الملخص التنفيذي
 */
async function createExecutiveSummarySheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollEmployee[],
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('📊 الملخص التنفيذي', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
  })

  // العنوان الرئيسي
  sheet.mergeCells('A1:F1')
  styleMainHeader(sheet.getCell('A1'), `كشف رواتب شهر ${getArabicMonthName(month)} ${year}`)
  sheet.getRow(1).height = 30

  // معلومات عامة
  sheet.mergeCells('A2:B2')
  sheet.getCell('A2').value = 'تاريخ الإصدار:'
  sheet.getCell('C2').value = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  sheet.mergeCells('D2:E2')
  sheet.getCell('D2').value = 'عدد العاملين:'
  sheet.getCell('F2').value = payrolls.length

  // إضافة خط فاصل
  sheet.addRow([])

  // حساب الإجماليات
  const totals = calculateTotals(payrolls)

  // ══════════════════════════════════════════════════════════
  // قسم الرواتب والبدلات
  // ══════════════════════════════════════════════════════════
  sheet.mergeCells('A4:F4')
  styleSubHeader(sheet.getCell('A4'), '💰 الرواتب والبدلات')
  sheet.getRow(4).height = 25

  const salaryData = [
    ['الراتب الأساسي الإجمالي', formatNumber(totals.totalBasicSalary), 'ج.م'],
    ['بدل السكن', formatNumber(totals.totalHousing), 'ج.م'],
    ['بدل المواصلات', formatNumber(totals.totalTransport), 'ج.م'],
    ['بدل الغذاء', formatNumber(totals.totalFood), 'ج.م'],
    ['بدل الميدان', formatNumber(totals.totalField), 'ج.م'],
    ['بدلات أخرى', formatNumber(totals.totalOther), 'ج.م'],
  ]

  salaryData.forEach((data, index) => {
    const row = sheet.addRow([data[0], '', '', '', data[1], data[2]])
    row.getCell(1).font = { bold: true }
    row.getCell(5).alignment = { horizontal: 'right' }
    row.getCell(5).numFmt = '#,##0.00'
    styleDataRow(row, index % 2 === 1)
  })

  // إجمالي الرواتب
  const grossRow = sheet.addRow(['إجمالي الرواتب (قبل الخصومات)', '', '', '', formatNumber(totals.totalGross), 'ج.م'])
  grossRow.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.primary } }
  grossRow.getCell(5).font = { bold: true, size: 12, color: { argb: COLORS.primary } }
  grossRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
  grossRow.height = 25

  sheet.addRow([])

  // ══════════════════════════════════════════════════════════
  // قسم الخصومات
  // ══════════════════════════════════════════════════════════
  const currentRow = sheet.lastRow ? sheet.lastRow.number + 1 : 1
  sheet.mergeCells(`A${currentRow}:F${currentRow}`)
  styleSubHeader(sheet.getCell(`A${currentRow}`), '➖ الخصومات')
  sheet.getRow(currentRow).height = 25

  const deductionsData = [
    ['السلف النقدية', formatNumber(totals.totalCashAdvances), 'ج.م'],
    ['سحوبات الأصناف', formatNumber(totals.totalItemWithdrawals), 'ج.م'],
    ['ديون الموظفين', formatNumber(totals.totalEmployeeDebts), 'ج.م'],
    ['خصومات الغياب', formatNumber(totals.totalAbsences), 'ج.م'],
    ['الجزاءات والغرامات', formatNumber(totals.totalPenalties), 'ج.م'],
    ['خصومات أخرى', formatNumber(totals.totalOtherDeductions), 'ج.م'],
  ]

  deductionsData.forEach((data, index) => {
    const row = sheet.addRow([data[0], '', '', '', data[1], data[2]])
    row.getCell(1).font = { bold: true }
    row.getCell(5).alignment = { horizontal: 'right' }
    row.getCell(5).numFmt = '#,##0.00'
    row.getCell(5).font = { color: { argb: COLORS.danger } }
    styleDataRow(row, index % 2 === 1)
  })

  // إجمالي الخصومات
  const deductRow = sheet.addRow(['إجمالي الخصومات', '', '', '', formatNumber(totals.totalDeductions), 'ج.م'])
  deductRow.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.danger } }
  deductRow.getCell(5).font = { bold: true, size: 12, color: { argb: COLORS.danger } }
  deductRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }
  deductRow.height = 25

  sheet.addRow([])

  // ══════════════════════════════════════════════════════════
  // صافي الرواتب
  // ══════════════════════════════════════════════════════════
  const netRowNum = sheet.lastRow ? sheet.lastRow.number + 1 : 1
  sheet.mergeCells(`A${netRowNum}:D${netRowNum}`)
  const netCell = sheet.getCell(`A${netRowNum}`)
  netCell.value = '✅ صافي الرواتب المستحقة'
  netCell.font = { bold: true, size: 14, color: { argb: COLORS.white } }
  netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } }
  netCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const netValueCell = sheet.getCell(`E${netRowNum}`)
  netValueCell.value = formatNumber(totals.totalNet)
  netValueCell.font = { bold: true, size: 14, color: { argb: COLORS.white } }
  netValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } }
  netValueCell.alignment = { horizontal: 'right', vertical: 'middle' }

  sheet.getCell(`F${netRowNum}`).value = 'ج.م'
  sheet.getCell(`F${netRowNum}`).font = { bold: true, size: 14, color: { argb: COLORS.white } }
  sheet.getCell(`F${netRowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } }

  sheet.getRow(netRowNum).height = 35

  // تنسيق الأعمدة
  sheet.getColumn(1).width = 30
  sheet.getColumn(2).width = 15
  sheet.getColumn(3).width = 15
  sheet.getColumn(4).width = 15
  sheet.getColumn(5).width = 20
  sheet.getColumn(6).width = 10
}

/**
 * Sheet 2: رواتب العاملين
 */
async function createEmployeeDetailsSheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollEmployee[],
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('👥 رواتب العاملين', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  // العنوان
  sheet.mergeCells('A1:P1')
  styleMainHeader(sheet.getCell('A1'), `كشف تفصيلي برواتب العاملين - ${getArabicMonthName(month)} ${year}`)
  sheet.getRow(1).height = 30

  sheet.addRow([])

  // العناوين
  const headers = [
    'م',
    'الكود',
    'اسم العامل',
    'القسم',
    'الوظيفة',
    'الراتب الأساسي',
    'بدلات',
    'الإجمالي',
    'سلف',
    'سحوبات',
    'ديون',
    'غياب',
    'جزاءات',
    'خصومات أخرى',
    'إجمالي الخصومات',
    'الصافي',
  ]

  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    styleSubHeader(cell, cell.value?.toString() || '')
  })
  headerRow.height = 25

  // البيانات
  payrolls.forEach((p, index) => {
    const row = sheet.addRow([
      index + 1,
      p.employee.employeeCode,
      p.employee.nickname || p.employee.fullName,
      p.employee.department?.name || '-',
      p.employee.position?.titleAr || p.employee.position?.title || '-',
      Math.round(p.basicSalary),
      Math.round(Number(p.housingAllowance)
        + Number(p.transportAllowance)
        + Number(p.foodAllowance)
        + Number(p.fieldAllowance)
        + Number(p.otherAllowances)),
      Math.round(p.grossSalary),
      Math.round(p.cashAdvancesTotal),
      Math.round(p.itemWithdrawalsTotal),
      Math.round(p.employeeDebtsTotal),
      Math.round(p.absencesDeduction),
      Math.round(p.penaltiesDeduction),
      Math.round(p.otherDeductions),
      Math.round(p.totalDeductions),
      Math.round(p.netSalary),
    ])

    // تنسيق الأرقام
    for (let i = 6; i <= 16; i++) {
      row.getCell(i).numFmt = '#,##0'
      row.getCell(i).alignment = { horizontal: 'right' }
    }

    // تلوين الخصومات بالأحمر
    for (let i = 9; i <= 15; i++) {
      row.getCell(i).font = { color: { argb: COLORS.danger } }
    }

    // تلوين الصافي بالأخضر أو الأحمر
    const netCell = row.getCell(16)
    if (Number(p.netSalary) < 0) {
      netCell.font = { color: { argb: COLORS.danger }, bold: true }
    }
    else {
      netCell.font = { color: { argb: COLORS.success }, bold: true }
    }

    styleDataRow(row, index % 2 === 1)
  })

  // إضافة صف الإجماليات
  const totals = calculateTotals(payrolls)
  const totalRow = sheet.addRow([
    '',
    '',
    'الإجمالي',
    '',
    '',
    Math.round(totals.totalBasicSalary),
    Math.round(totals.totalAllowances),
    Math.round(totals.totalGross),
    Math.round(totals.totalCashAdvances),
    Math.round(totals.totalItemWithdrawals),
    Math.round(totals.totalEmployeeDebts),
    Math.round(totals.totalAbsences),
    Math.round(totals.totalPenalties),
    Math.round(totals.totalOtherDeductions),
    Math.round(totals.totalDeductions),
    Math.round(totals.totalNet),
  ])

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: COLORS.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  totalRow.height = 30

  // تنسيق الأعمدة
  sheet.getColumn(1).width = 5 // م
  sheet.getColumn(2).width = 12 // الكود
  sheet.getColumn(3).width = 25 // الاسم
  sheet.getColumn(4).width = 15 // القسم
  sheet.getColumn(5).width = 20 // الوظيفة
  for (let i = 6; i <= 16; i++) {
    sheet.getColumn(i).width = 12
  }
}

/**
 * Sheet 3: الإحصائيات والتحليلات
 */
async function createStatisticsSheet(
  workbook: ExcelJS.Workbook,
  payrolls: PayrollEmployee[],
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('📈 الإحصائيات', {
    views: [{ rightToLeft: true }],
  })

  // العنوان
  sheet.mergeCells('A1:D1')
  styleMainHeader(sheet.getCell('A1'), `الإحصائيات والتحليلات - ${getArabicMonthName(month)} ${year}`)
  sheet.getRow(1).height = 30

  sheet.addRow([])

  // حساب الإحصائيات
  const stats = calculateStatistics(payrolls)

  // ══════════════════════════════════════════════════════════
  // الإحصائيات العامة
  // ══════════════════════════════════════════════════════════
  sheet.mergeCells('A3:D3')
  styleSubHeader(sheet.getCell('A3'), '📊 الإحصائيات العامة')
  sheet.getRow(3).height = 25

  const generalStats = [
    ['إجمالي عدد العاملين', stats.totalEmployees, 'موظف'],
    ['عدد العاملين المعتمدين', stats.approvedCount, 'موظف'],
    ['عدد العاملين المدفوعين', stats.paidCount, 'موظف'],
    ['متوسط الراتب الأساسي', formatNumber(stats.avgBasicSalary), 'ج.م'],
    ['متوسط البدلات', formatNumber(stats.avgAllowances), 'ج.م'],
    ['متوسط الخصومات', formatNumber(stats.avgDeductions), 'ج.م'],
    ['متوسط صافي الراتب', formatNumber(stats.avgNetSalary), 'ج.م'],
  ]

  generalStats.forEach((data, index) => {
    const row = sheet.addRow([data[0], '', data[1], data[2]])
    row.getCell(1).font = { bold: true }
    row.getCell(3).alignment = { horizontal: 'right' }
    styleDataRow(row, index % 2 === 1)
  })

  sheet.addRow([])

  // ══════════════════════════════════════════════════════════
  // أعلى وأقل الرواتب
  // ══════════════════════════════════════════════════════════
  const rangeRowNum = sheet.lastRow ? sheet.lastRow.number + 1 : 1
  sheet.mergeCells(`A${rangeRowNum}:D${rangeRowNum}`)
  styleSubHeader(sheet.getCell(`A${rangeRowNum}`), '💰 نطاق الرواتب')
  sheet.getRow(rangeRowNum).height = 25

  const rangeStats = [
    ['أعلى راتب أساسي', formatNumber(stats.maxBasicSalary), 'ج.م'],
    ['أقل راتب أساسي', formatNumber(stats.minBasicSalary), 'ج.م'],
    ['أعلى صافي راتب', formatNumber(stats.maxNetSalary), 'ج.م'],
    ['أقل صافي راتب', formatNumber(stats.minNetSalary), 'ج.م'],
    ['الفرق بين الأعلى والأقل', formatNumber(stats.maxNetSalary - stats.minNetSalary), 'ج.م'],
  ]

  rangeStats.forEach((data, index) => {
    const row = sheet.addRow([data[0], '', data[1], data[2]])
    row.getCell(1).font = { bold: true }
    row.getCell(3).alignment = { horizontal: 'right' }
    styleDataRow(row, index % 2 === 1)
  })

  sheet.addRow([])

  // ══════════════════════════════════════════════════════════
  // توزيع الخصومات
  // ══════════════════════════════════════════════════════════
  const deductRowNum = sheet.lastRow ? sheet.lastRow.number + 1 : 1
  sheet.mergeCells(`A${deductRowNum}:D${deductRowNum}`)
  styleSubHeader(sheet.getCell(`A${deductRowNum}`), '➖ توزيع الخصومات')
  sheet.getRow(deductRowNum).height = 25

  const totals = calculateTotals(payrolls)
  const totalDeduct = totals.totalDeductions || 1 // لتجنب القسمة على صفر

  const deductStats = [
    ['نسبة السلف النقدية', `${((totals.totalCashAdvances / totalDeduct) * 100).toFixed(1)}%`, formatNumber(totals.totalCashAdvances)],
    ['نسبة سحوبات الأصناف', `${((totals.totalItemWithdrawals / totalDeduct) * 100).toFixed(1)}%`, formatNumber(totals.totalItemWithdrawals)],
    ['نسبة ديون الموظفين', `${((totals.totalEmployeeDebts / totalDeduct) * 100).toFixed(1)}%`, formatNumber(totals.totalEmployeeDebts)],
    ['نسبة الغياب والجزاءات', `${(((totals.totalAbsences + totals.totalPenalties) / totalDeduct) * 100).toFixed(1)}%`, formatNumber(totals.totalAbsences + totals.totalPenalties)],
  ]

  deductStats.forEach((data, index) => {
    const row = sheet.addRow([data[0], '', data[1], data[2]])
    row.getCell(1).font = { bold: true }
    row.getCell(3).alignment = { horizontal: 'center' }
    row.getCell(4).alignment = { horizontal: 'right' }
    styleDataRow(row, index % 2 === 1)
  })

  // تنسيق الأعمدة
  sheet.getColumn(1).width = 30
  sheet.getColumn(2).width = 5
  sheet.getColumn(3).width = 20
  sheet.getColumn(4).width = 15
}

/**
 * Sheet 4: المقارنات الشهرية
 */
async function createMonthlyComparisonSheet(
  workbook: ExcelJS.Workbook,
  month: number,
  year: number,
) {
  const sheet = workbook.addWorksheet('📅 المقارنات الشهرية', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
  })

  // العنوان
  sheet.mergeCells('A1:F1')
  styleMainHeader(sheet.getCell('A1'), 'مقارنة الرواتب - آخر 6 أشهر')
  sheet.getRow(1).height = 30

  sheet.addRow([])

  // جلب بيانات آخر 6 أشهر
  const comparisonData = await getMonthlyComparisonData(month, year)

  // العناوين
  const headers = [
    'الشهر',
    'عدد العاملين',
    'إجمالي الرواتب',
    'إجمالي الخصومات',
    'صافي الرواتب',
    'التغير عن الشهر السابق',
  ]

  const headerRow = sheet.addRow(headers)
  headerRow.eachCell((cell) => {
    styleSubHeader(cell, cell.value?.toString() || '')
  })
  headerRow.height = 25

  // البيانات
  comparisonData.forEach((data, index) => {
    const row = sheet.addRow([
      data.monthName,
      data.employeeCount,
      formatNumber(data.totalGross),
      formatNumber(data.totalDeductions),
      formatNumber(data.totalNet),
      data.changePercent,
    ])

    // تلوين التغير
    const changeCell = row.getCell(6)
    if (data.changePercent.includes('+')) {
      changeCell.font = { color: { argb: COLORS.success }, bold: true }
    }
    else if (data.changePercent.includes('-')) {
      changeCell.font = { color: { argb: COLORS.danger }, bold: true }
    }

    styleDataRow(row, index % 2 === 1)
  })

  // تنسيق الأعمدة
  sheet.getColumn(1).width = 20
  sheet.getColumn(2).width = 15
  sheet.getColumn(3).width = 20
  sheet.getColumn(4).width = 20
  sheet.getColumn(5).width = 20
  sheet.getColumn(6).width = 20
}

/**
 * حساب الإجماليات
 */
function calculateTotals(payrolls: PayrollEmployee[]) {
  const totals = {
    totalBasicSalary: 0,
    totalHousing: 0,
    totalTransport: 0,
    totalFood: 0,
    totalField: 0,
    totalOther: 0,
    totalAllowances: 0,
    totalGross: 0,
    totalCashAdvances: 0,
    totalItemWithdrawals: 0,
    totalEmployeeDebts: 0,
    totalAbsences: 0,
    totalPenalties: 0,
    totalOtherDeductions: 0,
    totalDeductions: 0,
    totalNet: 0,
  }

  payrolls.forEach((p) => {
    totals.totalBasicSalary += Number(p.basicSalary)
    totals.totalHousing += Number(p.housingAllowance)
    totals.totalTransport += Number(p.transportAllowance)
    totals.totalFood += Number(p.foodAllowance)
    totals.totalField += Number(p.fieldAllowance)
    totals.totalOther += Number(p.otherAllowances)
    totals.totalGross += Number(p.grossSalary)
    totals.totalCashAdvances += Number(p.cashAdvancesTotal)
    totals.totalItemWithdrawals += Number(p.itemWithdrawalsTotal)
    totals.totalEmployeeDebts += Number(p.employeeDebtsTotal)
    totals.totalAbsences += Number(p.absencesDeduction)
    totals.totalPenalties += Number(p.penaltiesDeduction)
    totals.totalOtherDeductions += Number(p.otherDeductions)
    totals.totalDeductions += Number(p.totalDeductions)
    totals.totalNet += Number(p.netSalary)
  })

  totals.totalAllowances = totals.totalHousing
    + totals.totalTransport
    + totals.totalFood
    + totals.totalField
    + totals.totalOther

  return totals
}

/**
 * حساب الإحصائيات
 */
function calculateStatistics(payrolls: PayrollEmployee[]) {
  const count = payrolls.length || 1

  const basicSalaries = payrolls.map(p => Number(p.basicSalary))
  const netSalaries = payrolls.map(p => Number(p.netSalary))
  const allowances = payrolls.map(p =>
    Number(p.housingAllowance)
    + Number(p.transportAllowance)
    + Number(p.foodAllowance)
    + Number(p.fieldAllowance)
    + Number(p.otherAllowances),
  )
  const deductions = payrolls.map(p => Number(p.totalDeductions))

  return {
    totalEmployees: count,
    approvedCount: payrolls.filter(p => p.status === 'APPROVED' || p.status === 'PAID').length,
    paidCount: payrolls.filter(p => p.status === 'PAID').length,
    avgBasicSalary: basicSalaries.reduce((a, b) => a + b, 0) / count,
    avgAllowances: allowances.reduce((a, b) => a + b, 0) / count,
    avgDeductions: deductions.reduce((a, b) => a + b, 0) / count,
    avgNetSalary: netSalaries.reduce((a, b) => a + b, 0) / count,
    maxBasicSalary: Math.max(...basicSalaries),
    minBasicSalary: Math.min(...basicSalaries),
    maxNetSalary: Math.max(...netSalaries),
    minNetSalary: Math.min(...netSalaries),
  }
}

/**
 * جلب بيانات المقارنة الشهرية
 */
async function getMonthlyComparisonData(currentMonth: number, currentYear: number) {
  const data: Array<{
    monthName: string
    employeeCount: number
    totalGross: number
    totalDeductions: number
    totalNet: number
    changePercent: string
  }> = []

  let prevNet = 0

  // جلب بيانات آخر 6 أشهر
  for (let i = 5; i >= 0; i--) {
    let month = currentMonth - i
    let year = currentYear

    if (month <= 0) {
      month += 12
      year -= 1
    }

    const payrolls = await Database.prisma.hR_MonthlyPayroll.findMany({
      where: { month, year },
    })

    const totalGross = payrolls.reduce((sum, p) => sum + Number(p.totalEarnings), 0)
    const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeductions) + Number(p.totalDelayPenalties), 0)
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0)

    let changePercent = '-'
    if (prevNet > 0) {
      const change = ((totalNet - prevNet) / prevNet) * 100
      changePercent = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
    }

    data.push({
      monthName: `${getArabicMonthName(month)} ${year}`,
      employeeCount: payrolls.length,
      totalGross,
      totalDeductions,
      totalNet,
      changePercent,
    })

    prevNet = totalNet
  }

  return data
}
