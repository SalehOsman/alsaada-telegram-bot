/**
 * Penalties Notifications Service
 * خدمة إشعارات العقوبات المعلقة للسوبر أدمن
 */

import { Database } from '#root/modules/database/index.js'
import type { Bot, Api } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { InlineKeyboard } from 'grammy'

export class PenaltiesNotificationsService {
  /**
   * التحقق من وجود عقوبات معلقة وإرسال إشعار للسوبر أدمن
   */
  static async notifySuperAdminOnLogin(ctx: Context) {
    try {
      const userId = ctx.from?.id
      if (!userId) return

      // التحقق من أن المستخدم هو Super Admin
      const user = await Database.prisma.user.findFirst({
        where: {
          telegramId: BigInt(userId),
          role: 'SUPER_ADMIN'
        }
      })

      if (!user) return

      // جلب عدد العقوبات المعلقة
      const pendingCount = await Database.prisma.hR_AppliedPenalty.count({
        where: {
          status: 'PENDING'
        }
      })

      if (pendingCount === 0) return

      // إرسال إشعار
      const keyboard = new InlineKeyboard()
        .text(`⚖️ مراجعة العقوبات (${pendingCount})`, 'penalties:pending')
        .row()
        .text('🔕 تجاهل', 'penalties:dismiss_notification')

      await ctx.reply(
        `🚨 **تنبيه: عقوبات معلقة!**\n\n` +
        `⚠️ يوجد **${pendingCount}** عقوبة معلقة تحتاج للمراجعة.\n\n` +
        `📋 العقوبات المعلقة تنتظر قرارك:\n` +
        `• ✅ اعتماد العقوبة\n` +
        `• ❌ إلغاء مع عذر\n\n` +
        `⏰ يُنصح بمراجعتها في أقرب وقت.`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      )
    } catch (error) {
      console.error('Error sending penalties notification:', error)
    }
  }

  /**
   * الحصول على ملخص العقوبات المعلقة
   */
  static async getPendingSummary(): Promise<string> {
    try {
      const penalties = await Database.prisma.hR_AppliedPenalty.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          leave: {
            include: {
              employee: {
                select: {
                  nickname: true,
                  fullName: true
                }
              }
            }
          },
          policy: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })

      if (penalties.length === 0) {
        return '✅ لا توجد عقوبات معلقة حالياً'
      }

      let summary = `📊 **ملخص العقوبات المعلقة:**\n\n`

      penalties.forEach((penalty: any, index: number) => {
        const employeeName = penalty.leave?.employee?.nickname || penalty.leave?.employee?.fullName || 'غير معروف'
        summary += `${index + 1}. ${employeeName}\n`
        summary += `   • التأخير: ${penalty.delayDays} يوم\n`
        summary += `   • العقوبة: ${penalty.penaltyType === 'DEDUCTION' ? `خصم ${penalty.deductionDays} يوم` : 'إيقاف'}\n\n`
      })

      if (penalties.length === 5) {
        summary += `_...وأكثر_\n`
      }

      return summary
    } catch (error) {
      console.error('Error getting pending summary:', error)
      return '❌ خطأ في جلب الملخص'
    }
  }

  /**
   * جلب عدد العقوبات المعلقة
   */
  static async getPendingCount(): Promise<number> {
    try {
      return await Database.prisma.hR_AppliedPenalty.count({
        where: {
          status: 'PENDING'
        }
      })
    } catch (error) {
      console.error('Error getting pending count:', error)
      return 0
    }
  }

  /**
   * إرسال إشعار لجميع السوبر أدمنز عند إنشاء عقوبة جديدة
   */
  static async notifyNewPenalty(api: Api | Bot<Context>, penaltyId: number) {
    try {
      // جلب بيانات العقوبة
      const penalty = await Database.prisma.hR_AppliedPenalty.findUnique({
        where: { id: penaltyId },
        include: {
          leave: {
            include: {
              employee: {
                select: {
                  nickname: true,
                  fullName: true,
                  employeeCode: true
                }
              }
            }
          },
          policy: true
        }
      })

      if (!penalty) return

      // جلب جميع السوبر أدمنز
      const superAdmins = await Database.prisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN'
        },
        select: {
          telegramId: true
        }
      })

      const employeeName = penalty.leave?.employee?.nickname || penalty.leave?.employee?.fullName || 'غير معروف'
      const employeeCode = penalty.leave?.employee?.employeeCode || '-'

      const message = 
        `🚨 **عقوبة تأخير جديدة**\n\n` +
        `👤 **العامل:** ${employeeName}\n` +
        `🔢 **الكود:** ${employeeCode}\n` +
        `⏱️ **التأخير:** ${penalty.delayDays} يوم\n` +
        `💰 **العقوبة:** ${penalty.penaltyType === 'DEDUCTION' ? `خصم ${penalty.deductionDays} يوم` : 'إيقاف عن العمل'}\n` +
        `📜 **السياسة:** ${penalty.policy?.name || '-'}\n\n` +
        `⚠️ تحتاج للمراجعة والاعتماد`

      const keyboard = new InlineKeyboard()
        .text('⚖️ مراجعة العقوبة', `penalties:review:${penaltyId}`)
        .row()
        .text('📋 جميع العقوبات المعلقة', 'penalties:pending')

      // إرسال الإشعار لكل سوبر أدمن
      for (const admin of superAdmins) {
        try {
          // التحقق إذا كان api من نوع Bot أو Api مباشرة
          const apiToUse = 'api' in api ? api.api : api
          
          await apiToUse.sendMessage(
            Number(admin.telegramId),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            }
          )
        } catch (error) {
          console.error(`Failed to send notification to admin ${admin.telegramId}:`, error)
        }
      }
    } catch (error) {
      console.error('Error notifying new penalty:', error)
    }
  }

  /**
   * إنشاء رسالة ملخصة يومية للعقوبات المعلقة
   */
  static async getDailySummary(): Promise<{
    count: number
    message: string
  }> {
    try {
      const penalties = await Database.prisma.hR_AppliedPenalty.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          leave: {
            include: {
              employee: {
                select: {
                  nickname: true,
                  fullName: true
                }
              }
            }
          },
          policy: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (penalties.length === 0) {
        return {
          count: 0,
          message: '✅ **لا توجد عقوبات معلقة**\n\nجميع العقوبات تم مراجعتها واعتمادها.'
        }
      }

      let message = `📊 **تقرير العقوبات المعلقة اليومي**\n\n`
      message += `⚠️ **العدد الإجمالي:** ${penalties.length} عقوبة\n`
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`

      // تصنيف حسب نوع العقوبة
      const deductions = penalties.filter((p: any) => p.penaltyType === 'DEDUCTION')
      const suspensions = penalties.filter((p: any) => p.penaltyType === 'SUSPENSION')

      if (deductions.length > 0) {
        message += `💰 **خصومات:** ${deductions.length}\n`
        const totalDeductionDays = deductions.reduce((sum: number, p: any) => sum + (p.deductionDays || 0), 0)
        message += `   • إجمالي أيام الخصم: ${totalDeductionDays} يوم\n\n`
      }

      if (suspensions.length > 0) {
        message += `🚫 **إيقاف عن العمل:** ${suspensions.length}\n\n`
      }

      message += `━━━━━━━━━━━━━━━━━━━━\n`
      message += `⏰ **يُرجى المراجعة والاعتماد في أقرب وقت**`

      return {
        count: penalties.length,
        message
      }
    } catch (error) {
      console.error('Error getting daily summary:', error)
      return {
        count: 0,
        message: '❌ خطأ في إنشاء التقرير اليومي'
      }
    }
  }
}
