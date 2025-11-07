/**
 * خدمة إشعارات الإجازات
 */

import type { Api } from 'grammy'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { LeaveScheduleService } from './leave-schedule.service.js'

export class LeaveNotificationsService {
  private botApi: Api

  constructor(botApi: Api) {
    this.botApi = botApi
  }

  /**
   * إرسال إشعارات قبل بداية الإجازة بـ 24 ساعة
   */
  async sendLeaveStartReminders() {
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
  async sendLeaveReturnReminders() {
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
  async checkOverdueLeaves() {
    try {
      const overdueLeaves = await LeaveScheduleService.getOverdueLeaves()

      logger.info({ count: overdueLeaves.length }, 'Checking overdue leaves')

      for (const leave of overdueLeaves) {
        // تخطي الإجازات التي تم تسجيل عودة فعلية لها
        if (leave.actualReturnDate) {
          continue
        }

        const delayDays = LeaveScheduleService.calculateDelayDays(
          leave.endDate,
          new Date(),
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
  private async notifyAdmins(
    type: 'leave_start' | 'leave_return' | 'leave_overdue' | 'leave_registered',
    employee: any,
    leave?: any,
    delayDays?: number,
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

      if (admins.length === 0) {
        logger.warn('No active admins found to send notifications')
        return
      }

      let message = ''

      // بناء الرسالة حسب النوع
      switch (type) {
        case 'leave_start':
          message = `🔔 *إشعار بداية إجازة*\n\n`
          message += `� *رقم الموظف:* #${employee.employeeCode || employee.id}\n`
          message += `👤 *الاسم:* ${employee.fullName}\n`
          message += `💼 *الوظيفة:* ${employee.position?.titleAr || employee.position?.title || 'غير محددة'}\n`
          message += `🏢 *القسم:* ${employee.department?.name || 'غير محدد'}\n`
          message += `📅 *تاريخ بداية الإجازة:* ${this.formatDate(employee.nextLeaveStartDate)}\n`
          message += `\n⏰ غداً سيبدأ إجازته`
          break

        case 'leave_return':
          message = `🔔 *إشعار نهاية إجازة*\n\n`
          message += `🆔 *رقم الإجازة:* #${leave?.id || 'غير متوفر'}\n`
          message += `� *رقم الموظف:* #${employee.employeeCode || employee.id}\n`
          message += `👤 *الاسم:* ${employee.fullName}\n`
          message += `💼 *الوظيفة:* ${employee.position?.titleAr || employee.position?.title || 'غير محددة'}\n`
          message += `🏢 *القسم:* ${employee.department?.name || 'غير محدد'}\n`
          message += `📅 *بداية الإجازة:* ${this.formatDate(leave?.startDate)}\n`
          message += `📅 *نهاية الإجازة:* ${this.formatDate(leave?.endDate)}\n`
          message += `\n⏰ غداً موعد عودته من الإجازة`
          break

        case 'leave_overdue':
          message = `⚠️ *إشعار تأخير عن العودة*\n\n`
          message += `🆔 *رقم الإجازة:* #${leave?.id || 'غير متوفر'}\n`
          message += `� *رقم الموظف:* #${employee.employeeCode || employee.id}\n`
          message += `👤 *الاسم:* ${employee.fullName}\n`
          message += `💼 *الوظيفة:* ${employee.position?.titleAr || employee.position?.title || 'غير محددة'}\n`
          message += `🏢 *القسم:* ${employee.department?.name || 'غير محدد'}\n`
          message += `📅 *بداية الإجازة:* ${this.formatDate(leave?.startDate)}\n`
          message += `📅 *نهاية الإجازة:* ${this.formatDate(leave?.endDate)}\n`
          message += `📊 *أيام التأخير:* ${delayDays} يوم\n`
          message += `\n⚠️ متأخر عن موعد العودة`
          break

        case 'leave_registered':
          message = `✅ *إجازة جديدة مسجلة*\n\n`
          message += `🆔 *رقم الإجازة:* #${leave?.id || 'غير متوفر'}\n`
          message += `� *رقم الموظف:* #${employee.employeeCode || employee.id}\n`
          message += `👤 *الاسم:* ${employee.fullName}\n`
          message += `💼 *الوظيفة:* ${employee.position?.titleAr || employee.position?.title || 'غير محددة'}\n`
          message += `🏢 *القسم:* ${employee.department?.name || 'غير محدد'}\n`
          message += `📅 *بداية الإجازة:* ${this.formatDate(leave?.startDate)}\n`
          message += `📅 *نهاية الإجازة:* ${this.formatDate(leave?.endDate)}\n`
          break
      }

      // إرسال للجميع
      for (const admin of admins) {
        try {
          await this.botApi.sendMessage(String(admin.telegramId), message, {
            parse_mode: 'Markdown',
          })
        }
        catch (error) {
          logger.error({ adminId: admin.id, error }, 'Error sending notification to admin')
        }
      }

      logger.info({
        type,
        employeeId: employee.id,
        adminsNotified: admins.length,
      }, 'Notifications sent to admins')
    }
    catch (error) {
      logger.error({ error }, 'Error notifying admins')
    }
  }

  /**
   * إرسال إشعار للعامل
   */
  private async notifyEmployee(employee: any, leave: any) {
    try {
      if (!employee.telegramId) {
        logger.warn({ employeeId: employee.id }, 'Employee has no Telegram ID')
        return
      }

      const message = `🔔 *تذكير بموعد العودة*\n\n`
        + `عزيزي ${employee.fullName}\n`
        + `نذكرك بأن موعد عودتك من الإجازة هو غداً\n`
        + `📅 ${this.formatDate(leave.endDate)}\n\n`
        + `نتمنى لك إجازة سعيدة ونراك قريباً`

      await this.botApi.sendMessage(String(employee.telegramId), message, {
        parse_mode: 'Markdown',
      })

      logger.info({
        employeeId: employee.id,
        telegramId: employee.telegramId,
        leaveId: leave.id,
      }, 'Return notification sent to employee')
    }
    catch (error) {
      logger.error({ error }, 'Error notifying employee')
    }
  }

  /**
   * تنسيق التاريخ
   */
  private formatDate(date: Date | null | undefined): string {
    if (!date)
      return 'غير محدد'

    const d = new Date(date)
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
}
