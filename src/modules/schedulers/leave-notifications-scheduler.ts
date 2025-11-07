import type { Api } from 'grammy'
import { logger } from '#root/modules/services/logger/index.js'
import cron from 'node-cron'
import { LeaveNotificationsService } from '../services/leave-notifications.js'

/**
 * Leave Notifications Scheduler
 *
 * Schedules automatic leave notifications based on HR_Settings
 * Runs every minute to check if it's time to send notifications
 */
export class LeaveNotificationsScheduler {
  private cronJob: cron.ScheduledTask | null = null
  private leaveService: LeaveNotificationsService

  constructor(botApi: Api) {
    this.leaveService = new LeaveNotificationsService(botApi)
  }

  /**
   * Start the scheduler
   * Checks every minute if it's notification time
   */
  start(): void {
    // Run every minute to check if it's notification time
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndSendNotifications()
    })

    logger.info('🔔 Leave notifications scheduler started')
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      logger.info('🔔 Leave notifications scheduler stopped')
    }
  }

  /**
   * Check if it's time to send notifications and send them
   */
  private async checkAndSendNotifications(): Promise<void> {
    try {
      // Get HR settings
      const { Database } = await import('#root/modules/database/index.js')
      const settings = await Database.prisma.hR_Settings.findFirst()

      // If notifications are disabled, skip
      if (!settings || !settings.notificationsEnabled) {
        return
      }

      // Get current time in HH:MM format
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      // Check if current time matches notification time
      if (currentTime === settings.notificationTime) {
        logger.info(`🕐 Notification time reached (${currentTime}), sending leave notifications...`)
        await this.sendAllNotifications()
      }
    }
    catch (error) {
      logger.error({ error }, 'Error in leave notifications scheduler')
    }
  }

  /**
   * Send all leave notifications
   */
  private async sendAllNotifications(): Promise<void> {
    try {
      // Send leave start reminders
      await this.leaveService.sendLeaveStartReminders()

      // Send leave return reminders
      await this.leaveService.sendLeaveReturnReminders()

      // Check overdue leaves
      await this.leaveService.checkOverdueLeaves()

      logger.info('✅ All leave notifications sent successfully')
    }
    catch (error) {
      logger.error({ error }, 'Error sending leave notifications')
    }
  }

  /**
   * Send notifications immediately (for testing)
   */
  async sendNow(): Promise<void> {
    logger.info('📤 Sending leave notifications manually...')
    await this.sendAllNotifications()
  }
}
