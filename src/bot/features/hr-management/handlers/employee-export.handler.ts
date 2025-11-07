/**
 * Employee Excel Export Handler
 * معالج تصدير العاملين إلى Excel
 */

import type { Context } from '#root/bot/context.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import ExcelJS from 'exceljs'
import { Composer, InputFile } from 'grammy'

const employeeExportHandler = new Composer<Context>()

/**
 * تصدير جميع العاملين
 */
employeeExportHandler.callbackQuery('export:all-employees', async (ctx) => {
  try {
    await ctx.answerCallbackQuery('⏳ جاري تجهيز الملف...')

    const employees = await Database.prisma.employee.findMany({
      where: { isActive: true },
      include: {
        company: true,
        department: true,
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const filePath = await generateExcelFile(employees, 'جميع العاملين')

    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير جميع العاملين**\n\n`
        + `• عدد العاملين: ${employees.length}\n`
        + `• تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n\n`
        + `✅ تم إنشاء الملف بنجاح`,
      parse_mode: 'Markdown',
    })

    // Delete temp file
    await fs.unlink(filePath)

    logger.info({
      employeeCount: employees.length,
      exportedBy: ctx.from?.id,
    }, 'All employees exported to Excel')
  }
  catch (error) {
    logger.error({ error }, 'Error exporting all employees')
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

/**
 * تصدير العاملين حسب القسم
 */
employeeExportHandler.callbackQuery(/^export:dept:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery('⏳ جاري تجهيز الملف...')

    const departmentId = Number.parseInt(ctx.match[1])

    const department = await Database.prisma.department.findUnique({
      where: { id: departmentId },
    })

    const employees = await Database.prisma.employee.findMany({
      where: {
        departmentId,
        isActive: true,
      },
      include: {
        company: true,
        department: true,
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const filePath = await generateExcelFile(
      employees,
      `عاملي قسم ${department?.name || 'غير محدد'}`,
    )

    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير عاملي قسم ${department?.name}**\n\n`
        + `• عدد العاملين: ${employees.length}\n`
        + `• تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n\n`
        + `✅ تم إنشاء الملف بنجاح`,
      parse_mode: 'Markdown',
    })

    await fs.unlink(filePath)

    logger.info({
      departmentId,
      employeeCount: employees.length,
      exportedBy: ctx.from?.id,
    }, 'Department employees exported to Excel')
  }
  catch (error) {
    logger.error({ error }, 'Error exporting department employees')
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

/**
 * تصدير العاملين حسب المحافظة
 */
employeeExportHandler.callbackQuery(/^export:gov:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery('⏳ جاري تجهيز الملف...')

    const governorateId = Number.parseInt(ctx.match[1])

    const governorate = await Database.prisma.governorate.findUnique({
      where: { id: governorateId },
    })

    const employees = await Database.prisma.employee.findMany({
      where: {
        governorateId,
        isActive: true,
      },
      include: {
        company: true,
        department: true,
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const filePath = await generateExcelFile(
      employees,
      `عاملي محافظة ${governorate?.nameAr || 'غير محدد'}`,
    )

    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير عاملي محافظة ${governorate?.nameAr}**\n\n`
        + `• عدد العاملين: ${employees.length}\n`
        + `• تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n\n`
        + `✅ تم إنشاء الملف بنجاح`,
      parse_mode: 'Markdown',
    })

    await fs.unlink(filePath)

    logger.info({
      governorateId,
      employeeCount: employees.length,
      exportedBy: ctx.from?.id,
    }, 'Governorate employees exported to Excel')
  }
  catch (error) {
    logger.error({ error }, 'Error exporting governorate employees')
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

/**
 * تصدير العاملين حسب الوظيفة
 */
employeeExportHandler.callbackQuery(/^export:pos:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery('⏳ جاري تجهيز الملف...')

    const positionId = Number.parseInt(ctx.match[1])

    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
    })

    const employees = await Database.prisma.employee.findMany({
      where: {
        positionId,
        isActive: true,
      },
      include: {
        company: true,
        department: true,
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const filePath = await generateExcelFile(
      employees,
      `عاملي وظيفة ${position?.titleAr || 'غير محدد'}`,
    )

    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير عاملي وظيفة ${position?.titleAr}**\n\n`
        + `• عدد العاملين: ${employees.length}\n`
        + `• تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n\n`
        + `✅ تم إنشاء الملف بنجاح`,
      parse_mode: 'Markdown',
    })

    await fs.unlink(filePath)

    logger.info({
      positionId,
      employeeCount: employees.length,
      exportedBy: ctx.from?.id,
    }, 'Position employees exported to Excel')
  }
  catch (error) {
    logger.error({ error }, 'Error exporting position employees')
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

/**
 * تصدير العاملين حسب الحالة
 */
employeeExportHandler.callbackQuery(/^export:status:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery('⏳ جاري تجهيز الملف...')

    const status = ctx.match[1]

    const statusNames: Record<string, string> = {
      ACTIVE: 'نشط',
      ON_LEAVE: 'في إجازة',
      SUSPENDED: 'موقوف',
      RESIGNED: 'مستقيل',
      TERMINATED: 'مفصول',
      RETIRED: 'متقاعد',
      ON_MISSION: 'في مأمورية',
      SETTLED: 'مسوى',
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        employmentStatus: status as any,
        isActive: true,
      },
      include: {
        company: true,
        department: true,
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const filePath = await generateExcelFile(
      employees,
      `العاملين - ${statusNames[status] || status}`,
    )

    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 **تقرير العاملين - ${statusNames[status]}**\n\n`
        + `• عدد العاملين: ${employees.length}\n`
        + `• تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n\n`
        + `✅ تم إنشاء الملف بنجاح`,
      parse_mode: 'Markdown',
    })

    await fs.unlink(filePath)

    logger.info({
      status,
      employeeCount: employees.length,
      exportedBy: ctx.from?.id,
    }, 'Status employees exported to Excel')
  }
  catch (error) {
    logger.error({ error }, 'Error exporting status employees')
    await ctx.reply('❌ حدث خطأ أثناء تصدير الملف')
  }
})

/**
 * Generate Excel file with employee data and statistics
 */
async function generateExcelFile(employees: any[], title: string): Promise<string> {
  const workbook = new ExcelJS.Workbook()

  // ==================== Sheet 1: بيانات العاملين ====================
  const worksheet = workbook.addWorksheet('بيانات العاملين')

  // Set RTL
  worksheet.views = [{ rightToLeft: true }]

  // Set column widths
  worksheet.columns = [
    { width: 5 }, // #
    { width: 30 }, // الاسم الكامل
    { width: 15 }, // الكود
    { width: 20 }, // القسم
    { width: 25 }, // الوظيفة
    { width: 15 }, // المحافظة
    { width: 15 }, // الموبايل
    { width: 15 }, // الهاتف
    { width: 20 }, // البريد الإلكتروني
    { width: 12 }, // الحالة
    { width: 15 }, // تاريخ التعيين
    { width: 30 }, // العنوان
  ]

  // Title row
  worksheet.mergeCells('A1:L1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = title
  titleCell.font = { size: 16, bold: true, name: 'Arial' }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  }
  titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).height = 30

  // Date row
  worksheet.mergeCells('A2:L2')
  const dateCell = worksheet.getCell('A2')
  dateCell.value = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`
  dateCell.font = { size: 12, name: 'Arial' }
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(2).height = 20

  // Headers
  const headers = [
    '#',
    'الاسم الكامل',
    'الكود',
    'القسم',
    'الوظيفة',
    'المحافظة',
    'الموبايل',
    'الهاتف',
    'البريد الإلكتروني',
    'الحالة',
    'تاريخ التعيين',
    'العنوان',
  ]

  const headerRow = worksheet.getRow(3)
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, size: 12, name: 'Arial' }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
  headerRow.height = 25

  // Data rows
  const statusNames: Record<string, string> = {
    ACTIVE: 'نشط',
    ON_LEAVE: 'في إجازة',
    SUSPENDED: 'موقوف',
    RESIGNED: 'مستقيل',
    TERMINATED: 'مفصول',
    RETIRED: 'متقاعد',
    ON_MISSION: 'في مأمورية',
    SETTLED: 'مسوى',
  }

  employees.forEach((emp, index) => {
    const row = worksheet.getRow(index + 4)

    row.getCell(1).value = index + 1
    row.getCell(2).value = emp.fullName || ''
    row.getCell(3).value = emp.employeeCode || ''
    row.getCell(4).value = emp.department?.name || ''
    row.getCell(5).value = emp.position?.titleAr || ''
    row.getCell(6).value = emp.governorate?.nameAr || ''
    row.getCell(7).value = emp.personalPhone || ''
    row.getCell(8).value = emp.workPhone || ''
    row.getCell(9).value = emp.personalEmail || emp.workEmail || ''
    row.getCell(10).value = statusNames[emp.employmentStatus] || emp.employmentStatus
    row.getCell(11).value = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('ar-EG') : ''
    row.getCell(12).value = emp.currentAddress || ''

    // Styling
    row.eachCell((cell) => {
      cell.font = { size: 11, name: 'Arial' }
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    // Alternate row colors
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        }
      })
    }

    row.height = 20
  })

  // Summary row
  const summaryRow = worksheet.getRow(employees.length + 5)
  worksheet.mergeCells(`A${employees.length + 5}:L${employees.length + 5}`)
  const summaryCell = summaryRow.getCell(1)
  summaryCell.value = `إجمالي العاملين: ${employees.length}`
  summaryCell.font = { bold: true, size: 12, name: 'Arial' }
  summaryCell.alignment = { vertical: 'middle', horizontal: 'center' }
  summaryCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' },
  }
  summaryRow.height = 25

  // ==================== Sheet 2: الإحصائيات ====================
  const statsSheet = workbook.addWorksheet('الإحصائيات')
  statsSheet.views = [{ rightToLeft: true }]

  // Set column widths
  statsSheet.columns = [
    { width: 30 }, // البيان
    { width: 15 }, // العدد
    { width: 15 }, // النسبة
  ]

  // Title
  statsSheet.mergeCells('A1:C1')
  const statsTitleCell = statsSheet.getCell('A1')
  statsTitleCell.value = '📊 إحصائيات العاملين'
  statsTitleCell.font = { size: 18, bold: true, name: 'Arial' }
  statsTitleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  statsTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  }
  statsTitleCell.font = { ...statsTitleCell.font, color: { argb: 'FFFFFFFF' } }
  statsSheet.getRow(1).height = 35

  // Date
  statsSheet.mergeCells('A2:C2')
  const statsDateCell = statsSheet.getCell('A2')
  statsDateCell.value = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`
  statsDateCell.font = { size: 12, name: 'Arial' }
  statsDateCell.alignment = { vertical: 'middle', horizontal: 'center' }
  statsSheet.getRow(2).height = 20

  let currentRow = 4

  // Helper function to add section header
  function addSectionHeader(title: string) {
    statsSheet.mergeCells(`A${currentRow}:C${currentRow}`)
    const cell = statsSheet.getCell(`A${currentRow}`)
    cell.value = title
    cell.font = { size: 14, bold: true, name: 'Arial', color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    }
    statsSheet.getRow(currentRow).height = 25
    currentRow++
  }

  // Helper function to add stat row
  function addStatRow(label: string, count: number, total: number, highlight = false) {
    const row = statsSheet.getRow(currentRow)
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'

    row.getCell(1).value = label
    row.getCell(2).value = count
    row.getCell(3).value = `${percentage}%`

    row.eachCell((cell) => {
      cell.font = { size: 11, name: 'Arial', bold: highlight }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }

      if (highlight) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD966' },
        }
      }
      else if (currentRow % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        }
      }
    })

    row.height = 20
    currentRow++
  }

  // Get all data for statistics (removed unused prisma variable)

  // 1. إجمالي العاملين
  addSectionHeader('📈 إحصائيات عامة')
  const totalEmployees = employees.length
  addStatRow('إجمالي العاملين', totalEmployees, totalEmployees, true)
  currentRow++

  // 2. العاملين حسب الحالة
  addSectionHeader('📊 توزيع العاملين حسب الحالة')
  const statusCounts = employees.reduce((acc: any, emp: any) => {
    acc[emp.employmentStatus] = (acc[emp.employmentStatus] || 0) + 1
    return acc
  }, {})

  const statusLabels: Record<string, string> = {
    ACTIVE: '✅ نشط',
    ON_LEAVE: '🏖️ في إجازة',
    ON_MISSION: '✈️ في مأمورية',
    SUSPENDED: '⏸️ موقوف',
    RESIGNED: '📤 مستقيل',
    TERMINATED: '❌ مفصول',
    RETIRED: '👴 متقاعد',
    SETTLED: '💼 مسوى',
  }

  // العاملين المتواجدين في الموقع (نشط وليس في إجازة أو مأمورية)
  const presentEmployees = employees.filter(
    (emp: any) => emp.employmentStatus === 'ACTIVE',
  ).length

  addStatRow('👥 العاملين المتواجدين في الموقع', presentEmployees, totalEmployees, true)

  Object.entries(statusLabels).forEach(([status, label]) => {
    const count = statusCounts[status] || 0
    if (count > 0) {
      addStatRow(label, count, totalEmployees)
    }
  })
  currentRow++

  // 3. العاملين حسب الوظيفة
  addSectionHeader('💼 توزيع العاملين حسب الوظيفة')

  const positionCounts = employees.reduce((acc: any, emp: any) => {
    const posTitle = emp.position?.titleAr || 'غير محدد'
    acc[posTitle] = (acc[posTitle] || 0) + 1
    return acc
  }, {})

  // Sort by count
  const sortedPositions = Object.entries(positionCounts)
    .sort(([, a]: any, [, b]: any) => b - a)

  sortedPositions.forEach(([position, count]: any) => {
    addStatRow(position, count, totalEmployees)
  })
  currentRow++

  // 4. العاملين حسب المحافظة
  addSectionHeader('🗺️ توزيع العاملين حسب المحافظة')
  const governorateCounts = employees.reduce((acc: any, emp: any) => {
    const govName = emp.governorate?.nameAr || 'غير محدد'
    acc[govName] = (acc[govName] || 0) + 1
    return acc
  }, {})

  const sortedGovernorates = Object.entries(governorateCounts)
    .sort(([, a]: any, [, b]: any) => b - a)

  sortedGovernorates.forEach(([governorate, count]: any) => {
    addStatRow(governorate, count, totalEmployees)
  })
  currentRow++

  // 5. العاملين حسب القسم
  addSectionHeader('🏢 توزيع العاملين حسب القسم')
  const departmentCounts = employees.reduce((acc: any, emp: any) => {
    const deptName = emp.department?.name || 'غير محدد'
    acc[deptName] = (acc[deptName] || 0) + 1
    return acc
  }, {})

  const sortedDepartments = Object.entries(departmentCounts)
    .sort(([, a]: any, [, b]: any) => b - a)

  sortedDepartments.forEach(([department, count]: any) => {
    addStatRow(department, count, totalEmployees)
  })
  currentRow++

  // 6. إحصائيات التوظيف
  addSectionHeader('📅 إحصائيات التوظيف')

  // العاملين حسب سنة التعيين
  const currentYear = new Date().getFullYear()
  const hireDateCounts = {
    thisYear: 0,
    lastYear: 0,
    older: 0,
  }

  employees.forEach((emp: any) => {
    if (emp.hireDate) {
      const hireYear = new Date(emp.hireDate).getFullYear()
      if (hireYear === currentYear) {
        hireDateCounts.thisYear++
      }
      else if (hireYear === currentYear - 1) {
        hireDateCounts.lastYear++
      }
      else {
        hireDateCounts.older++
      }
    }
  })

  addStatRow(`🆕 معينون في ${currentYear}`, hireDateCounts.thisYear, totalEmployees)
  addStatRow(`📆 معينون في ${currentYear - 1}`, hireDateCounts.lastYear, totalEmployees)
  addStatRow('📜 معينون قبل ذلك', hireDateCounts.older, totalEmployees)
  currentRow++

  // 7. إحصائيات الخبرة
  addSectionHeader('⏰ توزيع العاملين حسب سنوات الخبرة')

  const experienceGroups = {
    lessThan1: 0,
    oneToThree: 0,
    threeToFive: 0,
    fiveToTen: 0,
    moreThan10: 0,
  }

  employees.forEach((emp: any) => {
    if (emp.hireDate) {
      const years = (new Date().getTime() - new Date(emp.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      if (years < 1) {
        experienceGroups.lessThan1++
      }
      else if (years < 3) {
        experienceGroups.oneToThree++
      }
      else if (years < 5) {
        experienceGroups.threeToFive++
      }
      else if (years < 10) {
        experienceGroups.fiveToTen++
      }
      else {
        experienceGroups.moreThan10++
      }
    }
  })

  addStatRow('🌱 أقل من سنة', experienceGroups.lessThan1, totalEmployees)
  addStatRow('📊 من 1 إلى 3 سنوات', experienceGroups.oneToThree, totalEmployees)
  addStatRow('📈 من 3 إلى 5 سنوات', experienceGroups.threeToFive, totalEmployees)
  addStatRow('⭐ من 5 إلى 10 سنوات', experienceGroups.fiveToTen, totalEmployees)
  addStatRow('🏆 أكثر من 10 سنوات', experienceGroups.moreThan10, totalEmployees)
  currentRow++

  // 8. معلومات الاتصال
  addSectionHeader('📞 معلومات الاتصال')
  const contactStats = {
    withMobile: employees.filter((emp: any) => emp.personalPhone).length,
    withWorkPhone: employees.filter((emp: any) => emp.workPhone).length,
    withEmail: employees.filter((emp: any) => emp.personalEmail || emp.workEmail).length,
  }

  addStatRow('📱 لديهم رقم موبايل', contactStats.withMobile, totalEmployees)
  addStatRow('☎️ لديهم هاتف عمل', contactStats.withWorkPhone, totalEmployees)
  addStatRow('📧 لديهم بريد إلكتروني', contactStats.withEmail, totalEmployees)

  // Save file
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const uploadsDir = path.join(__dirname, '../../../../../uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  const fileName = `employees_${Date.now()}.xlsx`
  const filePath = path.join(uploadsDir, fileName)

  await workbook.xlsx.writeFile(filePath)

  return filePath
}

export { employeeExportHandler }
