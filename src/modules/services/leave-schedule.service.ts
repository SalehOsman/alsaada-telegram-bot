/**
 * خدمة حساب مواعيد الإجازات - محدثة ومحسّنة
 * تعمل مع نظام دورات العمل والإجازات
 */

import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'

export class LeaveScheduleService {
  /**
   * حساب موعد الإجازة القادمة للعامل بشكل دقيق
   *
   * المنطق:
   * - موظف جديد (لم يأخذ إجازة): hireDate + workDaysPerCycle
   * - موظف له إجازة سابقة: actualReturnDate + workDaysPerCycle
   * - يتعامل مع التواريخ الماضية
   */
  static async calculateNextLeave(employeeId: number): Promise<{
    startDate: Date
    endDate: Date
  } | null> {
    try {
      const employee = await Database.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          workDaysPerCycle: true,
          leaveDaysPerCycle: true,
          lastLeaveEndDate: true,
          hireDate: true,
          isOnLeave: true,
        },
      })

      // التحقق من البيانات الأساسية
      if (!employee || !employee.workDaysPerCycle || !employee.leaveDaysPerCycle) {
        return null
      }

      // إذا كان في إجازة حالياً، لا نحسب موعد جديد
      if (employee.isOnLeave) {
        return null
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let baseDate: Date

      // تحديد تاريخ البداية للحساب
      if (employee.lastLeaveEndDate) {
        // موظف له إجازة سابقة - نحسب من تاريخ آخر إجازة
        baseDate = new Date(employee.lastLeaveEndDate)
      }
      else {
        // موظف جديد - نحسب من تاريخ التعيين
        baseDate = new Date(employee.hireDate)
      }

      baseDate.setHours(0, 0, 0, 0)

      // حساب موعد الإجازة القادمة
      const startDate = new Date(baseDate)
      startDate.setDate(startDate.getDate() + employee.workDaysPerCycle)

      // إذا كان التاريخ المحسوب في الماضي، نبدأ من اليوم
      if (startDate < today) {
        startDate.setTime(today.getTime())
        startDate.setDate(startDate.getDate() + employee.workDaysPerCycle)
      }

      // حساب تاريخ النهاية
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + employee.leaveDaysPerCycle - 1)

      return { startDate, endDate }
    }
    catch (error) {
      logger.error({ error, employeeId }, 'Error calculating next leave')
      return null
    }
  }

  /**
   * تحديث موعد الإجازة القادمة في قاعدة البيانات
   */
  static async updateNextLeaveDate(employeeId: number): Promise<void> {
    try {
      const nextLeave = await this.calculateNextLeave(employeeId)

      if (nextLeave) {
        await Database.prisma.employee.update({
          where: { id: employeeId },
          data: {
            nextLeaveStartDate: nextLeave.startDate,
            nextLeaveEndDate: nextLeave.endDate,
          },
        })

        logger.info({ employeeId, nextLeave }, 'Updated next leave date')
      }
      else {
        // مسح البيانات إذا لم يكن هناك موعد محسوب
        await Database.prisma.employee.update({
          where: { id: employeeId },
          data: {
            nextLeaveStartDate: null,
            nextLeaveEndDate: null,
          },
        })
      }
    }
    catch (error) {
      logger.error({ error, employeeId }, 'Error updating next leave date')
    }
  }

  /**
   * تحديث جميع الموظفين النشطين
   */
  static async updateAllEmployees(): Promise<{
    updated: number
    skipped: number
    errors: number
  }> {
    try {
      const employees = await Database.prisma.employee.findMany({
        where: {
          isActive: true,
          isOnLeave: false,
        },
        select: { id: true, fullName: true },
      })

      let updated = 0
      let skipped = 0
      let errors = 0

      logger.info(`🔄 بدء تحديث ${employees.length} موظف...`)

      for (const employee of employees) {
        try {
          const nextLeave = await this.calculateNextLeave(employee.id)

          if (nextLeave) {
            await Database.prisma.employee.update({
              where: { id: employee.id },
              data: {
                nextLeaveStartDate: nextLeave.startDate,
                nextLeaveEndDate: nextLeave.endDate,
              },
            })
            updated++
          }
          else {
            // موظف بدون دورة محددة
            await Database.prisma.employee.update({
              where: { id: employee.id },
              data: {
                nextLeaveStartDate: null,
                nextLeaveEndDate: null,
              },
            })
            skipped++
          }
        }
        catch (error) {
          logger.error({ error, employeeId: employee.id }, 'Error updating employee')
          errors++
        }
      }

      logger.info({ updated, skipped, errors }, '✅ انتهى التحديث')

      return { updated, skipped, errors }
    }
    catch (error) {
      logger.error({ error }, 'Error updating all employees')
      return { updated: 0, skipped: 0, errors: 0 }
    }
  }

  /**
   * حساب عدد أيام التأخير
   * التأخير = actualReturnDate - (endDate + 1)
   */
  static calculateDelayDays(leaveEndDate: Date, actualReturnDate: Date): number {
    const expectedReturn = new Date(leaveEndDate)
    expectedReturn.setDate(expectedReturn.getDate() + 1) // اليوم التالي للإجازة
    expectedReturn.setHours(0, 0, 0, 0)

    const actual = new Date(actualReturnDate)
    actual.setHours(0, 0, 0, 0)

    const diffTime = actual.getTime() - expectedReturn.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }

  /**
   * حساب عدد الأيام بين تاريخين (شامل)
   */
  static calculateTotalDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate)
    const end = new Date(endDate)

    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

    return diffDays > 0 ? diffDays : 1
  }

  /**
   * توليد رقم إجازة فريد
   */
  static async generateLeaveNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await Database.prisma.hR_EmployeeLeave.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    })

    const number = String(count + 1).padStart(3, '0')
    return `LV-${year}-${number}`
  }

  /**
   * الحصول على العاملين الذين موعد إجازتهم قريب
   */
  static async getUpcomingLeaves(days: number = 7) {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)

      return await Database.prisma.employee.findMany({
        where: {
          isActive: true,
          nextLeaveStartDate: {
            gte: today,
            lte: futureDate,
          },
        },
        include: {
          department: true,
          position: true,
        },
        orderBy: {
          nextLeaveStartDate: 'asc',
        },
      })
    }
    catch (error) {
      logger.error({ error }, 'Error getting upcoming leaves')
      return []
    }
  }

  /**
   * الحصول على العاملين في إجازة حالياً
   */
  static async getActiveLeaves() {
    try {
      return await Database.prisma.hR_EmployeeLeave.findMany({
        where: {
          status: 'APPROVED',
        },
        include: {
          employee: {
            include: {
              department: true,
              position: true,
            },
          },
        },
        orderBy: {
          endDate: 'asc',
        },
      })
    }
    catch (error) {
      logger.error({ error }, 'Error getting active leaves')
      return []
    }
  }

  /**
   * الحصول على العاملين المتأخرين عن العودة
   * ⚠️ فقط الإجازات التي:
   *  - معتمدة (APPROVED)
   *  - انتهت (endDate < اليوم)
   *  - لم يتم تسجيل عودة فعلية (actualReturnDate = null)
   */
  static async getOverdueLeaves() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await Database.prisma.hR_EmployeeLeave.findMany({
        where: {
          status: 'APPROVED',
          endDate: {
            lt: today,
          },
          actualReturnDate: null, // ✅ الشرط الأساسي: لم يتم تسجيل عودة
        },
        include: {
          employee: {
            include: {
              department: true,
              position: true,
            },
          },
        },
        orderBy: {
          endDate: 'asc',
        },
      })
    }
    catch (error) {
      logger.error({ error }, 'Error getting overdue leaves')
      return []
    }
  }
}
