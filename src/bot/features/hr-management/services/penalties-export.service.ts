import ExcelJS from 'exceljs'
import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'

/**
 * تنسيق التاريخ بالعربية
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export class PenaltiesExportService {
  /**
   * تصدير سجل العقوبات إلى Excel
   */
  static async exportPenalties(
    ctx: Context,
    filters?: {
      status?: 'APPROVED' | 'CANCELLED' | 'ALL'
      employeeId?: bigint
      startDate?: Date
      endDate?: Date
      penaltyType?: 'DEDUCTION' | 'SUSPENSION' | 'ALL'
      isAppliedToPayroll?: boolean
    },
  ): Promise<{ fileName: string, stats: any }> {
    const prisma = Database.prisma

    // بناء شروط البحث
    const whereConditions: any = {}

    // تصفية حسب الحالة
    if (filters?.status && filters.status !== 'ALL') {
      whereConditions.status = filters.status
    }
    else {
      whereConditions.status = { in: ['APPROVED', 'CANCELLED'] }
    }

    // تصفية حسب الموظف
    if (filters?.employeeId) {
      whereConditions.employeeId = filters.employeeId
    }

    // تصفية حسب التاريخ
    if (filters?.startDate || filters?.endDate) {
      whereConditions.createdAt = {}
      if (filters.startDate) {
        whereConditions.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        whereConditions.createdAt.lte = filters.endDate
      }
    }

    // تصفية حسب نوع العقوبة
    if (filters?.penaltyType && filters.penaltyType !== 'ALL') {
      whereConditions.penaltyType = filters.penaltyType
    }

    // تصفية حسب التطبيق على الراتب
    if (filters?.isAppliedToPayroll !== undefined) {
      whereConditions.isAppliedToPayroll = filters.isAppliedToPayroll
    }

    // جلب البيانات
    const penalties = await prisma.hR_AppliedPenalty.findMany({
      where: whereConditions,
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            employeeCode: true,
            position: {
              select: {
                titleAr: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        leave: {
          select: {
            leaveNumber: true,
            startDate: true,
            endDate: true,
            actualReturnDate: true,
          },
        },
        policy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // إنشاء ملف Excel
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'نظام إدارة الموارد البشرية'
    workbook.created = new Date()

    // Sheet 1: البيانات الكاملة
    const mainSheet = workbook.addWorksheet('سجل العقوبات', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 1 }],
      properties: { defaultRowHeight: 20 },
    })

    // تعريف الأعمدة
    mainSheet.columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'اسم العامل', key: 'employeeName', width: 25 },
      { header: 'اللقب', key: 'nickname', width: 15 },
      { header: 'كود العامل', key: 'employeeCode', width: 15 },
      { header: 'الوظيفة', key: 'position', width: 20 },
      { header: 'القسم', key: 'department', width: 20 },
      { header: 'رقم الإجازة', key: 'leaveNumber', width: 20 },
      { header: 'بداية الإجازة', key: 'leaveStart', width: 15 },
      { header: 'نهاية الإجازة', key: 'leaveEnd', width: 15 },
      { header: 'العودة الفعلية', key: 'actualReturn', width: 15 },
      { header: 'أيام التأخير', key: 'delayDays', width: 12 },
      { header: 'السياسة المطبقة', key: 'policyName', width: 20 },
      { header: 'نوع العقوبة', key: 'penaltyType', width: 15 },
      { header: 'قيمة الخصم (يوم)', key: 'deductionDays', width: 15 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'مطبقة على الراتب', key: 'appliedToPayroll', width: 15 },
      { header: 'تاريخ الإنشاء', key: 'createdAt', width: 18 },
      { header: 'أنشأ بواسطة', key: 'createdBy', width: 20 },
      { header: 'تاريخ الاعتماد', key: 'approvedAt', width: 18 },
      { header: 'اعتمد بواسطة', key: 'approvedBy', width: 20 },
      { header: 'تاريخ الإلغاء', key: 'cancelledAt', width: 18 },
      { header: 'ألغى بواسطة', key: 'cancelledBy', width: 20 },
      { header: 'سبب الإلغاء', key: 'cancelReason', width: 30 },
    ]

    // تنسيق رأس الجدول
    const headerRow = mainSheet.getRow(1)
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E5090' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    // إضافة البيانات
    penalties.forEach((penalty: any, index: number) => {
      const penaltyTypeText
        = penalty.penaltyType === 'DEDUCTION' ? 'خصم من الراتب' : 'إيقاف عن العمل'
      const statusText = penalty.status === 'APPROVED' ? 'معتمدة' : 'ملغاة'
      const appliedText = penalty.isAppliedToPayroll ? 'نعم' : 'لا'

      const row = mainSheet.addRow({
        index: index + 1,
        employeeName: penalty.employee.fullName,
        nickname: penalty.employee.nickname || '-',
        employeeCode: penalty.employee.employeeCode,
        position: penalty.employee.position?.titleAr || '-',
        department: penalty.employee.department?.name || '-',
        leaveNumber: penalty.leave.leaveNumber,
        leaveStart: formatDate(penalty.leave.startDate),
        leaveEnd: formatDate(penalty.leave.endDate),
        actualReturn: penalty.leave.actualReturnDate
          ? formatDate(penalty.leave.actualReturnDate)
          : '-',
        delayDays: penalty.delayDays,
        policyName: penalty.policy.name,
        penaltyType: penaltyTypeText,
        deductionDays: penalty.penaltyType === 'DEDUCTION' ? penalty.deductionDays : '-',
        status: statusText,
        appliedToPayroll: appliedText,
        createdAt: formatDate(penalty.createdAt),
        createdBy: '-',
        approvedAt: penalty.approvedAt ? formatDate(penalty.approvedAt) : '-',
        approvedBy: '-',
        cancelledAt: penalty.cancelledAt ? formatDate(penalty.cancelledAt) : '-',
        cancelledBy: '-',
        cancelReason: penalty.cancelReason || '-',
      })

      // تنسيق الصفوف
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      row.font = { size: 11 }

      // تلوين حسب الحالة
      if (penalty.status === 'CANCELLED') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE6E6' },
        }
      }
      else if (penalty.isAppliedToPayroll) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F7E6' },
        }
      }
      else {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFEE6' },
        }
      }

      // حدود الخلايا
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        }
      })
    })

    // إضافة AutoFilter
    mainSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: mainSheet.columns.length },
    }

    // Sheet 2: الإحصائيات
    const statsSheet = workbook.addWorksheet('إحصائيات', {
      views: [{ rightToLeft: true }],
      properties: { defaultRowHeight: 20 },
    })

    // حساب الإحصائيات
    const totalPenalties = penalties.length
    const approvedPenalties = penalties.filter((p: any) => p.status === 'APPROVED').length
    const cancelledPenalties = penalties.filter((p: any) => p.status === 'CANCELLED').length
    const appliedToPayroll = penalties.filter((p: any) => p.isAppliedToPayroll).length
    const pendingApplication = penalties.filter(
      (p: any) => p.status === 'APPROVED' && !p.isAppliedToPayroll,
    ).length

    const deductionPenalties = penalties.filter((p: any) => p.penaltyType === 'DEDUCTION').length
    const suspensionPenalties = penalties.filter((p: any) => p.penaltyType === 'SUSPENSION').length

    const totalDeductionDays = penalties
      .filter((p: any) => p.penaltyType === 'DEDUCTION' && p.status === 'APPROVED')
      .reduce((sum: number, p: any) => sum + p.deductionDays, 0)

    // إضافة الإحصائيات
    statsSheet.columns = [
      { key: 'label', width: 35 },
      { key: 'value', width: 20 },
    ]

    const statsData = [
      { label: '📊 إجمالي العقوبات', value: totalPenalties },
      { label: '', value: '' },
      { label: '✅ العقوبات المعتمدة', value: approvedPenalties },
      { label: '❌ العقوبات الملغاة', value: cancelledPenalties },
      { label: '', value: '' },
      { label: '💰 عقوبات الخصم', value: deductionPenalties },
      { label: '🚫 عقوبات الإيقاف', value: suspensionPenalties },
      { label: '', value: '' },
      { label: '✅ مطبقة على الراتب', value: appliedToPayroll },
      { label: '⏳ قيد الانتظار للتطبيق', value: pendingApplication },
      { label: '', value: '' },
      { label: '📉 إجمالي أيام الخصم', value: totalDeductionDays },
      { label: '📊 متوسط أيام الخصم', value: deductionPenalties > 0 ? (totalDeductionDays / deductionPenalties).toFixed(2) : 0 },
    ]

    statsData.forEach((stat, index) => {
      const row = statsSheet.addRow(stat)
      row.font = { size: 12, bold: stat.label !== '' }
      row.alignment = { vertical: 'middle', horizontal: 'center' }

      if (stat.label !== '') {
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        }
        row.getCell(2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F2FF' },
        }
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })
      }
    })

    // Sheet 3: ملخص حسب الموظفين
    const employeeSummarySheet = workbook.addWorksheet('ملخص الموظفين', {
      views: [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 1 }],
    })

    employeeSummarySheet.columns = [
      { header: 'اسم العامل', key: 'name', width: 25 },
      { header: 'كود العامل', key: 'code', width: 15 },
      { header: 'عدد العقوبات', key: 'count', width: 15 },
      { header: 'عقوبات معتمدة', key: 'approved', width: 15 },
      { header: 'عقوبات ملغاة', key: 'cancelled', width: 15 },
      { header: 'إجمالي أيام الخصم', key: 'totalDeduction', width: 18 },
    ]

    // تنسيق الرأس
    const empHeaderRow = employeeSummarySheet.getRow(1)
    empHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    empHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E5090' },
    }
    empHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }
    empHeaderRow.height = 25

    // تجميع حسب الموظفين
    const employeeMap = new Map()
    penalties.forEach((penalty: any) => {
      const empId = penalty.employee.employeeCode
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          name: penalty.employee.fullName,
          code: empId,
          count: 0,
          approved: 0,
          cancelled: 0,
          totalDeduction: 0,
        })
      }
      const emp = employeeMap.get(empId)
      emp.count++
      if (penalty.status === 'APPROVED') {
        emp.approved++
        if (penalty.penaltyType === 'DEDUCTION') {
          emp.totalDeduction += penalty.deductionDays
        }
      }
      else {
        emp.cancelled++
      }
    })

    // إضافة البيانات
    Array.from(employeeMap.values())
      .sort((a, b) => b.count - a.count)
      .forEach((emp) => {
        const row = employeeSummarySheet.addRow(emp)
        row.alignment = { vertical: 'middle', horizontal: 'center' }
        row.font = { size: 11 }
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          }
        })
      })

    // AutoFilter
    employeeSummarySheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: employeeSummarySheet.columns.length },
    }

    // حفظ الملف
    const timestamp = new Date().getTime()
    const fileName = `penalties_export_${timestamp}.xlsx`
    const filePath = `uploads/${fileName}`

    await workbook.xlsx.writeFile(filePath)

    // إرجاع اسم الملف مع الإحصائيات
    return {
      fileName,
      stats: {
        total: totalPenalties,
        approved: approvedPenalties,
        cancelled: cancelledPenalties,
        deduction: deductionPenalties,
        suspension: suspensionPenalties,
        appliedToPayroll,
        pending: pendingApplication,
        totalDeductionDays,
        employeeCount: employeeMap.size,
      },
    }
  }
}
