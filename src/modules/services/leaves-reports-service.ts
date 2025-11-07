/**
 * Leaves Reports Service
 * خدمة تقارير الإجازات - إنشاء تقارير Excel احترافية
 */

import ExcelJS from 'exceljs'
import { Database } from '#root/modules/database/index.js'
import { Calendar } from '#root/modules/ui/calendar.js'

export interface LeavesReportFilters {
  // فلتر الفترة الزمنية
  startDate?: Date
  endDate?: Date
  
  // فلتر العامل
  employeeId?: number
  
  // فلتر الوظيفة
  positionId?: number
  
  // فلتر القسم
  departmentId?: number
  
  // فلتر نوع الإجازة
  leaveType?: string // REGULAR, SICK, EMERGENCY, UNPAID
  
  // فلتر نوع التسوية
  settlementType?: string // ACTUAL_LEAVE, CASH_SETTLEMENT, POSTPONED
  
  // فلتر الحالة
  status?: string // PENDING, APPROVED, REJECTED
  
  // فلتر التسوية النقدية
  hasAllowance?: boolean // true = فقط التي لها بدل نقدي
  allowanceSettled?: boolean // true = المسواة, false = غير مسواة
  
  // فلتر أيام التأخير
  hasDelay?: boolean // true = فقط التي بها تأخير
  minDelayDays?: number // الحد الأدنى لأيام التأخير
  
  // فلتر حالة العودة
  hasReturned?: boolean // true = تم تسجيل العودة, false = لم يعد
  
  // فلتر الإجازات المؤجلة
  isPostponed?: boolean
  
  // فلتر الحالة النشطة
  isActive?: boolean
}

export interface LeavesReportSummary {
  // الإحصائيات العامة
  totalLeaves: number
  totalDays: number
  totalEmployees: number
  
  // حسب نوع التسوية
  actualLeaves: number
  cashSettlements: number
  postponedLeaves: number
  
  // حسب نوع الإجازة
  regularLeaves: number
  sickLeaves: number
  emergencyLeaves: number
  unpaidLeaves: number
  
  // حسب الحالة
  pendingLeaves: number
  approvedLeaves: number
  rejectedLeaves: number
  
  // التسويات النقدية
  totalAllowanceAmount: number
  settledAllowances: number
  unsettledAllowances: number
  
  // أيام التأخير
  totalDelayDays: number
  leavesWithDelay: number
  
  // الإجازات المفتوحة
  openLeaves: number
  
  // حسب القسم (أعلى 5)
  topDepartments: Array<{ name: string, count: number }>
  
  // حسب الوظيفة (أعلى 5)
  topPositions: Array<{ name: string, count: number }>
  
  // الفترة الزمنية
  dateRange: { start: Date, end: Date }
}

export class LeavesReportsService {
  /**
   * جلب البيانات مع الفلاتر
   */
  static async getFilteredLeaves(filters: LeavesReportFilters) {
    const where: any = {}
    
    // فلتر الفترة الزمنية
    if (filters.startDate || filters.endDate) {
      where.startDate = {}
      if (filters.startDate) {
        where.startDate.gte = filters.startDate
      }
      if (filters.endDate) {
        where.startDate.lte = filters.endDate
      }
    }
    
    // فلتر العامل
    if (filters.employeeId) {
      where.employeeId = filters.employeeId
    }
    
    // فلتر الوظيفة
    if (filters.positionId) {
      where.employee = {
        positionId: filters.positionId
      }
    }
    
    // فلتر القسم
    if (filters.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: filters.departmentId
      }
    }
    
    // فلتر نوع الإجازة
    if (filters.leaveType) {
      where.leaveType = filters.leaveType
    }
    
    // فلتر نوع التسوية
    if (filters.settlementType) {
      where.settlementType = filters.settlementType
    }
    
    // فلتر الحالة
    if (filters.status) {
      where.status = filters.status
    }
    
    // فلتر التسوية النقدية
    if (filters.hasAllowance !== undefined) {
      if (filters.hasAllowance) {
        where.allowanceAmount = { gt: 0 }
      } else {
        where.OR = [
          { allowanceAmount: null },
          { allowanceAmount: 0 }
        ]
      }
    }
    
    if (filters.allowanceSettled !== undefined) {
      where.allowanceSettled = filters.allowanceSettled
    }
    
    // فلتر أيام التأخير
    if (filters.hasDelay !== undefined) {
      if (filters.hasDelay) {
        where.delayDays = { gt: 0 }
      }
    }
    
    if (filters.minDelayDays !== undefined) {
      where.delayDays = { gte: filters.minDelayDays }
    }
    
    // فلتر حالة العودة
    if (filters.hasReturned !== undefined) {
      if (filters.hasReturned) {
        where.actualReturnDate = { not: null }
      } else {
        where.actualReturnDate = null
      }
    }
    
    // فلتر الإجازات المؤجلة
    if (filters.isPostponed !== undefined) {
      where.isPostponed = filters.isPostponed
    }
    
    // فلتر الحالة النشطة
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }
    
    // جلب البيانات
    const leaves = await Database.prisma.hR_EmployeeLeave.findMany({
      where,
      include: {
        employee: {
          include: {
            position: true,
            department: true
          }
        },
        replacement: {
          select: {
            fullName: true,
            nickname: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })
    
    return leaves
  }
  
  /**
   * حساب الملخص والإحصائيات
   */
  static calculateSummary(leaves: any[], filters: LeavesReportFilters): LeavesReportSummary {
    const summary: LeavesReportSummary = {
      totalLeaves: leaves.length,
      totalDays: 0,
      totalEmployees: new Set(leaves.map(l => l.employeeId)).size,
      
      actualLeaves: 0,
      cashSettlements: 0,
      postponedLeaves: 0,
      
      regularLeaves: 0,
      sickLeaves: 0,
      emergencyLeaves: 0,
      unpaidLeaves: 0,
      
      pendingLeaves: 0,
      approvedLeaves: 0,
      rejectedLeaves: 0,
      
      totalAllowanceAmount: 0,
      settledAllowances: 0,
      unsettledAllowances: 0,
      
      totalDelayDays: 0,
      leavesWithDelay: 0,
      
      openLeaves: 0,
      
      topDepartments: [],
      topPositions: [],
      
      dateRange: {
        start: filters.startDate || new Date(Math.min(...leaves.map(l => l.startDate.getTime()))),
        end: filters.endDate || new Date(Math.max(...leaves.map(l => l.endDate.getTime())))
      }
    }
    
    // حساب الإحصائيات
    const departmentCounts: Record<string, number> = {}
    const positionCounts: Record<string, number> = {}
    
    leaves.forEach(leave => {
      // إجمالي الأيام
      summary.totalDays += leave.totalDays
      
      // حسب نوع التسوية
      if (leave.settlementType === 'ACTUAL_LEAVE') summary.actualLeaves++
      else if (leave.settlementType === 'CASH_SETTLEMENT') summary.cashSettlements++
      else if (leave.settlementType === 'POSTPONED') summary.postponedLeaves++
      
      // حسب نوع الإجازة
      if (leave.leaveType === 'REGULAR') summary.regularLeaves++
      else if (leave.leaveType === 'SICK') summary.sickLeaves++
      else if (leave.leaveType === 'EMERGENCY') summary.emergencyLeaves++
      else if (leave.leaveType === 'UNPAID') summary.unpaidLeaves++
      
      // حسب الحالة
      if (leave.status === 'PENDING') summary.pendingLeaves++
      else if (leave.status === 'APPROVED') summary.approvedLeaves++
      else if (leave.status === 'REJECTED') summary.rejectedLeaves++
      
      // التسويات النقدية
      if (leave.allowanceAmount && leave.allowanceAmount > 0) {
        summary.totalAllowanceAmount += leave.allowanceAmount
        if (leave.allowanceSettled) {
          summary.settledAllowances++
        } else {
          summary.unsettledAllowances++
        }
      }
      
      // أيام التأخير
      if (leave.delayDays > 0) {
        summary.totalDelayDays += leave.delayDays
        summary.leavesWithDelay++
      }
      
      // الإجازات المفتوحة
      if (!leave.actualReturnDate) {
        summary.openLeaves++
      }
      
      // حسب القسم
      const deptName = leave.employee?.department?.name || 'غير محدد'
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1
      
      // حسب الوظيفة
      const posName = leave.employee?.position?.title || 'غير محدد'
      positionCounts[posName] = (positionCounts[posName] || 0) + 1
    })
    
    // أعلى 5 أقسام
    summary.topDepartments = Object.entries(departmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    
    // أعلى 5 وظائف
    summary.topPositions = Object.entries(positionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    
    return summary
  }
  
  /**
   * إنشاء ملف Excel احترافي
   */
  static async generateExcelReport(
    leaves: any[],
    summary: LeavesReportSummary,
    filters: LeavesReportFilters
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    
    // معلومات الملف
    workbook.creator = 'نظام إدارة الموارد البشرية'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // Sheet 1: الملخص والإحصائيات
    await this.createSummarySheet(workbook, summary, filters)
    
    // Sheet 2: بيانات الإجازات التفصيلية
    await this.createDetailsSheet(workbook, leaves)
    
    // Sheet 3: الإجازات الفعلية
    const actualLeaves = leaves.filter(l => l.settlementType === 'ACTUAL_LEAVE')
    if (actualLeaves.length > 0) {
      await this.createActualLeavesSheet(workbook, actualLeaves)
    }
    
    // Sheet 4: التسويات النقدية
    const cashSettlements = leaves.filter(l => l.settlementType === 'CASH_SETTLEMENT')
    if (cashSettlements.length > 0) {
      await this.createCashSettlementsSheet(workbook, cashSettlements)
    }
    
    // Sheet 5: الإجازات المتأخرة
    const delayedLeaves = leaves.filter(l => l.delayDays > 0)
    if (delayedLeaves.length > 0) {
      await this.createDelayedLeavesSheet(workbook, delayedLeaves)
    }
    
    // Sheet 6: التحليلات
    await this.createAnalyticsSheet(workbook, leaves, summary)
    
    // تصدير كـ Buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
  
  /**
   * Sheet 1: الملخص والإحصائيات
   */
  private static async createSummarySheet(
    workbook: ExcelJS.Workbook,
    summary: LeavesReportSummary,
    filters: LeavesReportFilters
  ) {
    const sheet = workbook.addWorksheet('📊 الملخص', {
      properties: { tabColor: { argb: 'FF4472C4' } },
      views: [{ rightToLeft: true }]
    })
    
    let row = 1
    
    // العنوان
    sheet.mergeCells(`A${row}:D${row}`)
    const titleCell = sheet.getCell(`A${row}`)
    titleCell.value = '📊 تقرير الإجازات الشامل'
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF4472C4' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(row).height = 30
    row += 2
    
    // تاريخ التقرير
    sheet.getCell(`A${row}`).value = '📅 تاريخ التقرير:'
    sheet.getCell(`B${row}`).value = new Date().toLocaleString('ar-EG')
    row++
    
    // الفترة
    sheet.getCell(`A${row}`).value = '📆 الفترة:'
    sheet.getCell(`B${row}`).value = `من ${Calendar.formatArabic(summary.dateRange.start)} إلى ${Calendar.formatArabic(summary.dateRange.end)}`
    row += 2
    
    // الإحصائيات العامة
    this.addSectionHeader(sheet, row, 'الإحصائيات العامة')
    row++
    
    this.addStatRow(sheet, row++, 'إجمالي الإجازات', summary.totalLeaves.toString())
    this.addStatRow(sheet, row++, 'إجمالي الأيام', summary.totalDays.toString())
    this.addStatRow(sheet, row++, 'عدد الموظفين', summary.totalEmployees.toString())
    this.addStatRow(sheet, row++, 'متوسط الأيام/إجازة', (summary.totalDays / summary.totalLeaves || 0).toFixed(1))
    row++
    
    // حسب نوع التسوية
    this.addSectionHeader(sheet, row, 'حسب نوع التسوية')
    row++
    
    this.addStatRow(sheet, row++, '🏖️ إجازات فعلية', summary.actualLeaves.toString(), this.getPercentage(summary.actualLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, '💰 تسويات نقدية', summary.cashSettlements.toString(), this.getPercentage(summary.cashSettlements, summary.totalLeaves))
    this.addStatRow(sheet, row++, '⏸️ مؤجلة', summary.postponedLeaves.toString(), this.getPercentage(summary.postponedLeaves, summary.totalLeaves))
    row++
    
    // حسب نوع الإجازة
    this.addSectionHeader(sheet, row, 'حسب نوع الإجازة')
    row++
    
    this.addStatRow(sheet, row++, 'اعتيادية', summary.regularLeaves.toString(), this.getPercentage(summary.regularLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, 'مرضية', summary.sickLeaves.toString(), this.getPercentage(summary.sickLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, 'عارضة', summary.emergencyLeaves.toString(), this.getPercentage(summary.emergencyLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, 'بدون مرتب', summary.unpaidLeaves.toString(), this.getPercentage(summary.unpaidLeaves, summary.totalLeaves))
    row++
    
    // حسب الحالة
    this.addSectionHeader(sheet, row, 'حسب الحالة')
    row++
    
    this.addStatRow(sheet, row++, '⏳ قيد الموافقة', summary.pendingLeaves.toString(), this.getPercentage(summary.pendingLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, '✅ موافق عليها', summary.approvedLeaves.toString(), this.getPercentage(summary.approvedLeaves, summary.totalLeaves))
    this.addStatRow(sheet, row++, '❌ مرفوضة', summary.rejectedLeaves.toString(), this.getPercentage(summary.rejectedLeaves, summary.totalLeaves))
    row++
    
    // التسويات النقدية
    if (summary.cashSettlements > 0) {
      this.addSectionHeader(sheet, row, 'التسويات النقدية')
      row++
      
      this.addStatRow(sheet, row++, 'إجمالي المبالغ', `${summary.totalAllowanceAmount.toFixed(2)} جنيه`)
      this.addStatRow(sheet, row++, 'المسواة', summary.settledAllowances.toString())
      this.addStatRow(sheet, row++, 'غير مسواة', summary.unsettledAllowances.toString())
      this.addStatRow(sheet, row++, 'متوسط البدل', `${(summary.totalAllowanceAmount / summary.cashSettlements).toFixed(2)} جنيه`)
      row++
    }
    
    // أيام التأخير
    if (summary.leavesWithDelay > 0) {
      this.addSectionHeader(sheet, row, 'أيام التأخير')
      row++
      
      this.addStatRow(sheet, row++, 'إجازات بها تأخير', summary.leavesWithDelay.toString())
      this.addStatRow(sheet, row++, 'إجمالي أيام التأخير', summary.totalDelayDays.toString())
      this.addStatRow(sheet, row++, 'متوسط التأخير', `${(summary.totalDelayDays / summary.leavesWithDelay).toFixed(1)} يوم`)
      row++
    }
    
    // أعلى 5 أقسام
    if (summary.topDepartments.length > 0) {
      this.addSectionHeader(sheet, row, 'أعلى الأقسام')
      row++
      
      summary.topDepartments.forEach((dept, index) => {
        this.addStatRow(sheet, row++, `${index + 1}. ${dept.name}`, dept.count.toString(), this.getPercentage(dept.count, summary.totalLeaves))
      })
      row++
    }
    
    // ضبط عرض الأعمدة
    sheet.getColumn(1).width = 30
    sheet.getColumn(2).width = 20
    sheet.getColumn(3).width = 15
    sheet.getColumn(4).width = 15
  }
  
  /**
   * Sheet 2: بيانات الإجازات التفصيلية
   */
  private static async createDetailsSheet(workbook: ExcelJS.Workbook, leaves: any[]) {
    const sheet = workbook.addWorksheet('📋 البيانات التفصيلية', {
      properties: { tabColor: { argb: 'FF70AD47' } },
      views: [{ rightToLeft: true }]
    })
    
    // العناوين
    const headers = [
      'رقم الإجازة',
      'اسم الموظف',
      'كود الموظف',
      'القسم',
      'الوظيفة',
      'نوع الإجازة',
      'نوع التسوية',
      'تاريخ البداية',
      'تاريخ النهاية',
      'عدد الأيام',
      'تاريخ العودة الفعلي',
      'أيام التأخير',
      'الحالة',
      'مبلغ البدل',
      'حالة الصرف',
      'البديل',
      'ملاحظات'
    ]
    
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25
    
    // البيانات
    leaves.forEach(leave => {
      const row = sheet.addRow([
        leave.leaveNumber,
        leave.employee?.nickname || leave.employee?.fullName,
        leave.employee?.employeeCode,
        leave.employee?.department?.name || '-',
        leave.employee?.position?.title || '-',
        this.getLeaveTypeLabel(leave.leaveType),
        this.getSettlementTypeLabel(leave.settlementType),
        Calendar.formatArabic(leave.startDate),
        Calendar.formatArabic(leave.endDate),
        leave.totalDays,
        leave.actualReturnDate ? Calendar.formatArabic(leave.actualReturnDate) : 'لم يعد',
        leave.delayDays || 0,
        this.getStatusLabel(leave.status),
        leave.allowanceAmount ? `${leave.allowanceAmount.toFixed(2)} ج` : '-',
        leave.allowanceSettled ? 'مسواة' : 'غير مسواة',
        leave.replacement ? (leave.replacement.nickname || leave.replacement.fullName) : '-',
        leave.reason || '-'
      ])
      
      // تنسيق حسب نوع التسوية
      if (leave.settlementType === 'CASH_SETTLEMENT') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' } // أصفر فاتح
        }
      } else if (leave.delayDays > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' } // أحمر فاتح
        }
      }
    })
    
    // ضبط عرض الأعمدة
    sheet.columns.forEach(column => {
      column.width = 18
    })
    
    // تجميد الصف الأول
    sheet.views = [
      { rightToLeft: true, state: 'frozen', ySplit: 1 }
    ]
    
    // إضافة فلاتر
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    }
  }
  
  /**
   * Sheet 3: الإجازات الفعلية
   */
  private static async createActualLeavesSheet(workbook: ExcelJS.Workbook, leaves: any[]) {
    const sheet = workbook.addWorksheet('🏖️ الإجازات الفعلية', {
      properties: { tabColor: { argb: 'FF5B9BD5' } },
      views: [{ rightToLeft: true }]
    })
    
    // نفس هيكل البيانات التفصيلية لكن بدون التسويات النقدية
    const headers = [
      'رقم الإجازة',
      'اسم الموظف',
      'القسم',
      'الوظيفة',
      'نوع الإجازة',
      'من',
      'إلى',
      'الأيام',
      'العودة الفعلية',
      'التأخير',
      'الحالة'
    ]
    
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5B9BD5' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25
    
    leaves.forEach(leave => {
      sheet.addRow([
        leave.leaveNumber,
        leave.employee?.nickname || leave.employee?.fullName,
        leave.employee?.department?.name || '-',
        leave.employee?.position?.title || '-',
        this.getLeaveTypeLabel(leave.leaveType),
        Calendar.formatArabic(leave.startDate),
        Calendar.formatArabic(leave.endDate),
        leave.totalDays,
        leave.actualReturnDate ? Calendar.formatArabic(leave.actualReturnDate) : 'لم يعد',
        leave.delayDays || 0,
        this.getStatusLabel(leave.status)
      ])
    })
    
    sheet.columns.forEach(column => {
      column.width = 18
    })
    
    sheet.views = [
      { rightToLeft: true, state: 'frozen', ySplit: 1 }
    ]
    
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    }
  }
  
  /**
   * Sheet 4: التسويات النقدية
   */
  private static async createCashSettlementsSheet(workbook: ExcelJS.Workbook, leaves: any[]) {
    const sheet = workbook.addWorksheet('💰 التسويات النقدية', {
      properties: { tabColor: { argb: 'FFFFC000' } },
      views: [{ rightToLeft: true }]
    })
    
    const headers = [
      'رقم السجل',
      'اسم الموظف',
      'القسم',
      'الوظيفة',
      'من',
      'إلى',
      'الأيام',
      'المبلغ',
      'حالة الصرف',
      'تاريخ الصرف',
      'الحالة'
    ]
    
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25
    
    let totalAmount = 0
    
    leaves.forEach(leave => {
      const amount = leave.allowanceAmount || 0
      totalAmount += amount
      
      sheet.addRow([
        leave.leaveNumber,
        leave.employee?.nickname || leave.employee?.fullName,
        leave.employee?.department?.name || '-',
        leave.employee?.position?.title || '-',
        Calendar.formatArabic(leave.startDate),
        Calendar.formatArabic(leave.endDate),
        leave.totalDays,
        amount.toFixed(2),
        leave.allowanceSettled ? '✅ مسواة' : '⏳ قيد الانتظار',
        leave.allowancePaidDate ? Calendar.formatArabic(leave.allowancePaidDate) : '-',
        this.getStatusLabel(leave.status)
      ])
    })
    
    // صف الإجمالي
    const totalRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      `الإجمالي: ${leaves.length}`,
      totalAmount.toFixed(2),
      '',
      '',
      ''
    ])
    totalRow.font = { bold: true }
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    }
    
    sheet.columns.forEach(column => {
      column.width = 18
    })
    
    sheet.views = [
      { rightToLeft: true, state: 'frozen', ySplit: 1 }
    ]
    
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    }
  }
  
  /**
   * Sheet 5: الإجازات المتأخرة
   */
  private static async createDelayedLeavesSheet(workbook: ExcelJS.Workbook, leaves: any[]) {
    const sheet = workbook.addWorksheet('⏰ الإجازات المتأخرة', {
      properties: { tabColor: { argb: 'FFFF0000' } },
      views: [{ rightToLeft: true }]
    })
    
    const headers = [
      'رقم الإجازة',
      'اسم الموظف',
      'القسم',
      'الوظيفة',
      'تاريخ البداية',
      'تاريخ النهاية المتوقع',
      'تاريخ العودة الفعلي',
      'أيام التأخير',
      'الحالة'
    ]
    
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25
    
    let totalDelayDays = 0
    
    leaves.forEach(leave => {
      totalDelayDays += leave.delayDays
      
      const row = sheet.addRow([
        leave.leaveNumber,
        leave.employee?.nickname || leave.employee?.fullName,
        leave.employee?.department?.name || '-',
        leave.employee?.position?.title || '-',
        Calendar.formatArabic(leave.startDate),
        Calendar.formatArabic(leave.endDate),
        leave.actualReturnDate ? Calendar.formatArabic(leave.actualReturnDate) : '-',
        leave.delayDays,
        this.getStatusLabel(leave.status)
      ])
      
      // تلوين حسب شدة التأخير
      if (leave.delayDays > 5) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' } // أحمر
        }
        row.font = { color: { argb: 'FFFFFFFF' } }
      } else if (leave.delayDays > 2) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' } // أحمر فاتح
        }
      }
    })
    
    // صف الإجمالي
    const totalRow = sheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      `الإجمالي: ${leaves.length} إجازة`,
      totalDelayDays,
      ''
    ])
    totalRow.font = { bold: true }
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    }
    
    sheet.columns.forEach(column => {
      column.width = 18
    })
    
    sheet.views = [
      { rightToLeft: true, state: 'frozen', ySplit: 1 }
    ]
    
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    }
  }
  
  /**
   * Sheet 6: التحليلات والرسوم البيانية
   */
  private static async createAnalyticsSheet(
    workbook: ExcelJS.Workbook,
    leaves: any[],
    summary: LeavesReportSummary
  ) {
    const sheet = workbook.addWorksheet('📈 التحليلات', {
      properties: { tabColor: { argb: 'FF9966FF' } },
      views: [{ rightToLeft: true }]
    })
    
    let row = 1
    
    // العنوان
    sheet.mergeCells(`A${row}:D${row}`)
    const titleCell = sheet.getCell(`A${row}`)
    titleCell.value = '📈 التحليلات والمقارنات'
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF9966FF' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    row += 2
    
    // التوزيع حسب نوع التسوية
    this.addSectionHeader(sheet, row, 'التوزيع حسب نوع التسوية')
    row++
    
    sheet.getCell(`A${row}`).value = 'النوع'
    sheet.getCell(`B${row}`).value = 'العدد'
    sheet.getCell(`C${row}`).value = 'النسبة'
    sheet.getRow(row).font = { bold: true }
    row++
    
    sheet.getCell(`A${row}`).value = 'إجازات فعلية'
    sheet.getCell(`B${row}`).value = summary.actualLeaves
    sheet.getCell(`C${row}`).value = this.getPercentage(summary.actualLeaves, summary.totalLeaves)
    row++
    
    sheet.getCell(`A${row}`).value = 'تسويات نقدية'
    sheet.getCell(`B${row}`).value = summary.cashSettlements
    sheet.getCell(`C${row}`).value = this.getPercentage(summary.cashSettlements, summary.totalLeaves)
    row++
    
    sheet.getCell(`A${row}`).value = 'مؤجلة'
    sheet.getCell(`B${row}`).value = summary.postponedLeaves
    sheet.getCell(`C${row}`).value = this.getPercentage(summary.postponedLeaves, summary.totalLeaves)
    row += 2
    
    // المعدلات
    this.addSectionHeader(sheet, row, 'المعدلات والمتوسطات')
    row++
    
    this.addStatRow(sheet, row++, 'متوسط أيام الإجازة', `${(summary.totalDays / summary.totalLeaves || 0).toFixed(1)} يوم`)
    this.addStatRow(sheet, row++, 'متوسط الإجازات/موظف', `${(summary.totalLeaves / summary.totalEmployees || 0).toFixed(1)} إجازة`)
    
    if (summary.cashSettlements > 0) {
      this.addStatRow(sheet, row++, 'متوسط البدل النقدي', `${(summary.totalAllowanceAmount / summary.cashSettlements).toFixed(2)} جنيه`)
    }
    
    if (summary.leavesWithDelay > 0) {
      this.addStatRow(sheet, row++, 'متوسط أيام التأخير', `${(summary.totalDelayDays / summary.leavesWithDelay).toFixed(1)} يوم`)
    }
    
    row++
    
    // مقارنات
    this.addSectionHeader(sheet, row, 'المقارنات')
    row++
    
    const approvalRate = this.getPercentage(summary.approvedLeaves, summary.totalLeaves)
    const delayRate = this.getPercentage(summary.leavesWithDelay, summary.totalLeaves)
    
    this.addStatRow(sheet, row++, 'نسبة الموافقة', approvalRate)
    this.addStatRow(sheet, row++, 'نسبة التأخير', delayRate)
    this.addStatRow(sheet, row++, 'نسبة التسويات النقدية', this.getPercentage(summary.cashSettlements, summary.totalLeaves))
    
    sheet.getColumn(1).width = 30
    sheet.getColumn(2).width = 20
    sheet.getColumn(3).width = 15
  }
  
  // Helper Methods
  
  private static addSectionHeader(sheet: ExcelJS.Worksheet, row: number, title: string) {
    sheet.mergeCells(`A${row}:D${row}`)
    const cell = sheet.getCell(`A${row}`)
    cell.value = title
    cell.font = { bold: true, size: 12, color: { argb: 'FF4472C4' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getRow(row).height = 25
  }
  
  private static addStatRow(
    sheet: ExcelJS.Worksheet,
    row: number,
    label: string,
    value: string,
    percentage?: string
  ) {
    sheet.getCell(`A${row}`).value = label
    sheet.getCell(`B${row}`).value = value
    if (percentage) {
      sheet.getCell(`C${row}`).value = percentage
    }
    sheet.getCell(`A${row}`).font = { bold: true }
  }
  
  private static getPercentage(part: number, total: number): string {
    if (total === 0) return '0%'
    return `${((part / total) * 100).toFixed(1)}%`
  }
  
  private static getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      REGULAR: 'اعتيادية',
      SICK: 'مرضية',
      EMERGENCY: 'عارضة',
      UNPAID: 'بدون مرتب'
    }
    return labels[type] || type
  }
  
  private static getSettlementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ACTUAL_LEAVE: '🏖️ فعلية',
      CASH_SETTLEMENT: '💰 نقدية',
      POSTPONED: '⏸️ مؤجلة'
    }
    return labels[type] || type
  }
  
  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: '⏳ قيد الموافقة',
      APPROVED: '✅ موافق',
      REJECTED: '❌ مرفوض'
    }
    return labels[status] || status
  }
  
  /**
   * تنسيق ملخص للعرض في البوت
   */
  static formatSummaryForBot(summary: LeavesReportSummary, filters: LeavesReportFilters): string {
    let message = '📊 **ملخص تقرير الإجازات**\n\n'
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    
    // الفترة
    message += `📅 **الفترة:** من ${Calendar.formatArabic(summary.dateRange.start)} إلى ${Calendar.formatArabic(summary.dateRange.end)}\n\n`
    
    // الإحصائيات العامة
    message += `📊 **الإحصائيات العامة:**\n`
    message += `• إجمالي الإجازات: ${summary.totalLeaves}\n`
    message += `• إجمالي الأيام: ${summary.totalDays}\n`
    message += `• عدد الموظفين: ${summary.totalEmployees}\n`
    message += `• متوسط الأيام/إجازة: ${(summary.totalDays / summary.totalLeaves || 0).toFixed(1)}\n\n`
    
    // حسب نوع التسوية
    message += `🔄 **حسب نوع التسوية:**\n`
    message += `• 🏖️ فعلية: ${summary.actualLeaves} (${this.getPercentage(summary.actualLeaves, summary.totalLeaves)})\n`
    message += `• 💰 نقدية: ${summary.cashSettlements} (${this.getPercentage(summary.cashSettlements, summary.totalLeaves)})\n`
    message += `• ⏸️ مؤجلة: ${summary.postponedLeaves} (${this.getPercentage(summary.postponedLeaves, summary.totalLeaves)})\n\n`
    
    // حسب نوع الإجازة
    message += `📋 **حسب نوع الإجازة:**\n`
    message += `• اعتيادية: ${summary.regularLeaves}\n`
    message += `• مرضية: ${summary.sickLeaves}\n`
    message += `• عارضة: ${summary.emergencyLeaves}\n`
    message += `• بدون مرتب: ${summary.unpaidLeaves}\n\n`
    
    // حسب الحالة
    message += `✅ **حسب الحالة:**\n`
    message += `• قيد الموافقة: ${summary.pendingLeaves}\n`
    message += `• موافق: ${summary.approvedLeaves}\n`
    message += `• مرفوض: ${summary.rejectedLeaves}\n\n`
    
    // التسويات النقدية
    if (summary.cashSettlements > 0) {
      message += `💰 **التسويات النقدية:**\n`
      message += `• المبلغ الإجمالي: ${summary.totalAllowanceAmount.toFixed(2)} جنيه\n`
      message += `• المسواة: ${summary.settledAllowances}\n`
      message += `• غير مسواة: ${summary.unsettledAllowances}\n\n`
    }
    
    // أيام التأخير
    if (summary.leavesWithDelay > 0) {
      message += `⏰ **أيام التأخير:**\n`
      message += `• إجازات بها تأخير: ${summary.leavesWithDelay}\n`
      message += `• إجمالي أيام التأخير: ${summary.totalDelayDays}\n\n`
    }
    
    // الإجازات المفتوحة
    if (summary.openLeaves > 0) {
      message += `🔓 **إجازات مفتوحة:** ${summary.openLeaves}\n\n`
    }
    
    // أعلى الأقسام
    if (summary.topDepartments.length > 0) {
      message += `🏢 **أعلى الأقسام:**\n`
      summary.topDepartments.slice(0, 3).forEach((dept, index) => {
        message += `${index + 1}. ${dept.name}: ${dept.count}\n`
      })
      message += `\n`
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📥 **سيتم إرسال ملف Excel التفصيلي...**`
    
    return message
  }
}
