/**
 * Auto Penalties Scheduler
 * مجدول إنشاء عقوبات تلقائية للمتأخرين عن العودة من الإجازة
 */

import cron from 'node-cron'
import { Database } from '../database/index.js'
import { DelayPenaltyService } from '../services/delay-penalty.service.js'
import { PenaltiesNotificationsService } from '../services/penalties-notifications.service.js'
import type { Bot } from 'grammy'
import type { Context } from '#root/bot/context.js'

export class AutoPenaltiesScheduler {
  private static isRunning = false
  private static task: cron.ScheduledTask | null = null
  private static bot: Bot<Context> | null = null

  /**
   * تشغيل المجدول
   */
  static start(bot: Bot<Context>) {
    if (this.task) {
      console.log('⚠️ Auto Penalties Scheduler is already running')
      return
    }

    this.bot = bot

    // التشغيل يومياً في الساعة 9 صباحاً
    this.task = cron.schedule(
      '0 9 * * *',
      async () => {
        await this.checkAndCreateAutoPenalties()
      },
      {
        timezone: 'Africa/Cairo',
      }
    )

    console.log('✅ Auto Penalties Scheduler started - يعمل يومياً الساعة 9 صباحاً')
  }

  /**
   * إيقاف المجدول
   */
  static stop() {
    if (this.task) {
      this.task.stop()
      this.task = null
      this.bot = null
      console.log('🛑 Auto Penalties Scheduler stopped')
    }
  }

  /**
   * تشغيل فوري للتحقق (للاختبار)
   */
  static async runNow(bot?: Bot<Context>) {
    if (bot) {
      this.bot = bot
    }
    await this.checkAndCreateAutoPenalties()
  }

  /**
   * التحقق من الإجازات المتأخرة وإنشاء العقوبات
   */
  private static async checkAndCreateAutoPenalties() {
    if (this.isRunning) {
      console.log('⚠️ Auto penalties check is already running, skipping...')
      return
    }

    this.isRunning = true
    console.log('🔍 بدء التحقق من الإجازات المتأخرة...')

    try {
      const prisma = Database.prisma
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      // حساب تاريخ 5 أيام مضت
      const fiveDaysAgo = new Date(today)
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

      // البحث عن الإجازات:
      // 1. معتمدة (APPROVED)
      // 2. نشطة (isActive = true)
      // 3. تاريخ العودة المتوقع أقدم من أو يساوي 5 أيام مضت
      // 4. لا يوجد تاريخ عودة فعلي (actualReturnDate = null)
      // 5. لا توجد عقوبة معلقة أو معتمدة بالفعل
      const overdueLeaves = await prisma.hR_EmployeeLeave.findMany({
        where: {
          status: 'APPROVED',
          isActive: true,
          endDate: {
            lte: fiveDaysAgo,
          },
          actualReturnDate: null,
          // التأكد من عدم وجود عقوبة بالفعل
          appliedPenalties: {
            none: {
              status: {
                in: ['PENDING', 'APPROVED'],
              },
              isCancelled: false,
            },
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              nickname: true,
              employmentStatus: true,
              isActive: true,
            },
          },
        },
      })

      if (overdueLeaves.length === 0) {
        console.log('✅ لا توجد إجازات متأخرة تحتاج لعقوبات تلقائية')
        return
      }

      console.log(`📊 تم العثور على ${overdueLeaves.length} إجازة متأخرة`)

      let createdCount = 0
      const createdPenalties: number[] = []

      for (const leave of overdueLeaves) {
        try {
          // تخطي الموظفين غير النشطين
          if (!leave.employee.isActive) {
            console.log(`⏭️ تخطي ${leave.employee.fullName} - موظف غير نشط`)
            continue
          }

          // تخطي الموظفين الموقوفين بالفعل
          if (leave.employee.employmentStatus === 'SUSPENDED') {
            console.log(`⏭️ تخطي ${leave.employee.fullName} - موقوف بالفعل`)
            continue
          }

          // حساب أيام التأخير
          const endDate = new Date(leave.endDate)
          endDate.setUTCHours(0, 0, 0, 0)
          const delayDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))

          console.log(`📝 إنشاء عقوبة تلقائية:`)
          console.log(`   - الموظف: ${leave.employee.fullName}`)
          console.log(`   - الإجازة: ${leave.leaveNumber}`)
          console.log(`   - التأخير: ${delayDays} يوم`)

          // إنشاء عقوبة تلقائية
          // نستخدم employeeId 1 كـ createdBy للعقوبات التلقائية
          const systemUserId = BigInt(1)

          const penalty = await DelayPenaltyService.createPenaltyForLeave({
            leaveId: leave.id,
            employeeId: leave.employee.id,
            delayDays,
            createdBy: systemUserId,
            api: this.bot?.api, // لإرسال الإشعارات
          })

          if (penalty) {
            createdCount++
            createdPenalties.push(penalty.id)
            console.log(`   ✅ تم إنشاء العقوبة #${penalty.id}`)
          } else {
            console.log(`   ⚠️ لم يتم إنشاء عقوبة (ربما لا توجد سياسة مناسبة)`)
          }
        } catch (error) {
          console.error(`❌ خطأ في إنشاء عقوبة للإجازة ${leave.leaveNumber}:`, error)
        }
      }

      console.log(`\n✅ انتهى التحقق - تم إنشاء ${createdCount} عقوبة تلقائية`)

      // إرسال ملخص يومي للسوبر أدمنز إذا تم إنشاء عقوبات
      if (createdCount > 0 && this.bot) {
        await this.sendDailySummary(createdCount, createdPenalties)
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من العقوبات التلقائية:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * إرسال ملخص يومي للسوبر أدمنز
   */
  private static async sendDailySummary(count: number, penaltyIds: number[]) {
    try {
      if (!this.bot) return

      const prisma = Database.prisma

      // جلب السوبر أدمنز
      const superAdmins = await prisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN',
        },
        select: {
          telegramId: true,
        },
      })

      const message =
        `🤖 **تقرير العقوبات التلقائية اليومي**\n\n` +
        `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n` +
        `⏰ الوقت: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ تم إنشاء **${count}** عقوبة تلقائية للموظفين المتأخرين عن العودة من الإجازة.\n\n` +
        `📋 العقوبات تنتظر المراجعة والاعتماد.\n\n` +
        `💡 **ملاحظة:** هذه العقوبات تم إنشاؤها تلقائياً للموظفين الذين تأخروا 5 أيام أو أكثر عن العودة المتوقعة.`

      // استخدام InlineKeyboard
      const { InlineKeyboard } = await import('grammy')
      const keyboard = new InlineKeyboard().text('⚖️ مراجعة العقوبات المعلقة', 'penalties:pending')

      for (const admin of superAdmins) {
        try {
          await this.bot.api.sendMessage(Number(admin.telegramId), message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          })
        } catch (error) {
          console.error(`Failed to send daily summary to admin ${admin.telegramId}:`, error)
        }
      }

      console.log(`✅ تم إرسال الملخص اليومي لـ ${superAdmins.length} سوبر أدمن`)
    } catch (error) {
      console.error('❌ خطأ في إرسال الملخص اليومي:', error)
    }
  }
}
