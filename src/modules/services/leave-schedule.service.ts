/**
 * خدمة حساب مواعيد الإجازات
 */

import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'

export class LeaveScheduleService {
  /**
   * حساب موعد الإجازة القادمة للعامل
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
        },
      })

      if (!employee || !employee.workDaysPerCycle || !employee.leaveDaysPerCycle) {
        return null
      }

      // تاريخ البداية = آخر إجازة + أيام العمل + 1 (يوم العودة)
      // إذا لم يحصل على إجازة من قبل، نستخدم تاريخ التعيين
      const baseDate = employee.lastLeaveEndDate || employee.hireDate
      const startDate = new Date(baseDate)
      startDate.setDate(startDate.getDate() + employee.workDaysPerCycle + 1)

      // تاريخ النهاية = البداية + أيام الإجازة - 1
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
      }
    }
    catch (error) {
      logger.error({ error, employeeId }, 'Error updating next leave date')
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
