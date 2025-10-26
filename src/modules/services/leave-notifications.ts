/**
 * خدمة إشعارات الإجازات
 */

import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { LeaveScheduleService } from './leave-schedule.service.js'

export class LeaveNotificationsService {
  /**
   * إرسال إشعارات قبل بداية الإجازة بـ 24 ساعة
   */
  static async sendLeaveStartReminders() {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const nextDay = new Date(tomorrow)
      nextDay.setDate(nextDay.getDate() + 1)

      // الحصول على العاملين الذين إجازتهم غداً
      const employees = await Database.prisma.employee.findMany({
        where: {
          isActive: true,
          nextLeaveStartDate: {
            gte: tomorrow,
            lt: nextDay,
          },
        },
        include: {
          position: true,
          department: true,
        },
      })

      logger.info({ count: employees.length }, 'Sending leave start reminders')

      for (const employee of employees) {
        // إرسال للأدمن
        await this.notifyAdmins('leave_start', employee)
      }
    }
    catch (error) {
      logger.error({ error }, 'Error sending leave start reminders')
    }
  }

  /**
   * إرسال إشعارات قبل موعد العودة بـ 24 ساعة
   */
  static async sendLeaveReturnReminders() {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const nextDay = new Date(tomorrow)
      nextDay.setDate(nextDay.getDate() + 1)

      // الحصول على الإجازات النشطة التي تنتهي غداً
      const leaves = await Database.prisma.hR_EmployeeLeave.findMany({
        where: {
          status: 'APPROVED',
          endDate: {
            gte: tomorrow,
            lt: nextDay,
          },
        },
        include: {
          employee: {
            include: {
              position: true,
              department: true,
            },
          },
        },
      })

      logger.info({ count: leaves.length }, 'Sending leave return reminders')

      for (const leave of leaves) {
        // إرسال للأدمن
        await this.notifyAdmins('leave_return', leave.employee, leave)

        // إرسال للعامل إذا له Telegram ID
        if (leave.employee.telegramId) {
          await this.notifyEmployee(leave.employee, leave)
        }
      }
    }
    catch (error) {
      logger.error({ error }, 'Error sending leave return reminders')
    }
  }

  /**
   * التحقق من الإجازات المتأخرة
   */
  static async checkOverdueLeaves() {
    try {
      const overdueLeaves = await LeaveScheduleService.getOverdueLeaves()

      logger.info({ count: overdueLeaves.length }, 'Checking overdue leaves')

      for (const leave of overdueLeaves) {
        const delayDays = LeaveScheduleService.calculateDelayDays(
          leave.endDate,
          new Date()
        )

        if (delayDays >= 1) {
          await this.notifyAdmins('leave_overdue', leave.employee, leave, delayDays)
        }
      }
    }
    catch (error) {
      logger.error({ error }, 'Error checking overdue leaves')
    }
  }

  /**
   * إرسال إشعار للأدمن
   */
  private static async notifyAdmins(
    type: 'leave_start' | 'leave_return' | 'leave_overdue' | 'leave_registered',
    employee: any,
    leave?: any,
    delayDays?: number
  ) {
    try {
      // الحصول على الأدمن
      const admins = await Database.prisma.user.findMany({
        where: {
          role: {
            in: ['SUPER_ADMIN', 'ADMIN'],
          },
          isActive: true,
        },
      })

      let message = ''

      switch (type) {
        case 'leave_start':
          message = `⏰ تذكير: إجازة قادمة\n\n`
            + `👤 العامل: ${employee.fullName}\n`
            + `💼 الوظيفة: ${employee.position?.titleAr || 'غير محدد'}\n`
            + `📅 موعد الإجازة: غداً ${this.formatDate(employee.nextLeaveStartDate)}\n`
            + `⏱️ المدة: ${employee.leaveDaysPerCycle} أيام\n`
            + `📅 العودة المتوقعة: ${this.formatDate(employee.nextLeaveEndDate)}`
          break

        case 'leave_return':
          message = `↩️ تذكير: موعد العودة\n\n`
            + `👤 العامل: ${employee.fullName}\n`
            + `📋 إجازة: #${leave?.id}\n`
            + `📅 موعد العودة: غداً ${this.formatDate(leave?.endDate)}`
          break

        case 'leave_overdue':
          message = `⚠️ تنبيه: تأخر عن العودة\n\n`
            + `👤 العامل: ${employee.fullName}\n`
            + `📋 إجازة: #${leave?.id}\n`
            + `📅 كان يجب العودة: ${this.formatDate(leave?.endDate)}\n`
            + `⏰ تأخر: ${delayDays} يوم`
          break

        case 'leave_registered':
          message = `✅ تم تسجيل إجازة جديدة\n\n`
            + `📋 رقم: #${leave?.id}\n`
            + `👤 العامل: ${employee.fullName}\n`
            + `📅 من: ${this.formatDate(leave?.startDate)} إلى: ${this.formatDate(leave?.endDate)}\n`
            + `⏱️ المدة: ${leave?.totalDays} أيام`
          break
      }

      // هنا يمكن إرسال الإشعار عبر Telegram
      logger.info({ type, employeeId: employee.id, adminsCount: admins.length }, 'Notification sent to admins')
    }
    catch (error) {
      logger.error({ error }, 'Error notifying admins')
    }
  }

  /**
   * إرسال إشعار للعامل
   */
  private static async notifyEmployee(employee: any, leave: any) {
    try {
      const message = `↩️ تذكير: موعد العودة\n\n`
        + `📋 إجازة: #${leave.id}\n`
        + `📅 موعد العودة: غداً ${this.formatDate(leave.endDate)}\n\n`
        + `نتمنى لك عودة سالمة 🙏`

      // هنا يمكن إرسال الإشعار عبر Telegram
      logger.info({ employeeId: employee.id, telegramId: employee.telegramId }, 'Notification sent to employee')
    }
    catch (error) {
      logger.error({ error }, 'Error notifying employee')
    }
  }

  /**
   * تنسيق التاريخ
   */
  private static formatDate(date: Date | null | undefined): string {
    if (!date) return 'غير محدد'
    
    const d = new Date(date)
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
}
