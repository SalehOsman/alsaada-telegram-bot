/**
 * Notification Helper Utility
 * أدوات مساعدة الإشعارات
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'

/**
 * إرسال إشعار للمدراء
 */
export async function notifyAdmins(
  ctx: Context,
  message: string,
  options: {
    excludeCurrentUser?: boolean
    roles?: string[]
  } = {}
): Promise<void> {
  const { excludeCurrentUser = true, roles = ['SUPER_ADMIN', 'ADMIN'] } = options
  
  try {
    const admins = await Database.prisma.user.findMany({
      where: {
        role: { in: roles as any },
        isActive: true,
      },
    })
    
    for (const admin of admins) {
      if (!admin.telegramId) continue
      
      if (excludeCurrentUser && admin.telegramId.toString() === ctx.from?.id.toString()) {
        continue
      }
      
      try {
        await ctx.api.sendMessage(admin.telegramId.toString(), message, {
          parse_mode: 'Markdown',
        })
      } catch (error) {
        // Ignore if admin blocked the bot
      }
    }
  } catch (error) {
    // Ignore notification errors
  }
}

/**
 * بناء رسالة إشعار
 */
export function buildNotificationMessage(
  title: string,
  details: Record<string, any>,
  footer?: string
): string {
  let message = `🔔 **${title}**\n\n`
  
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined && value !== null) {
      message += `**${key}:** ${value}\n`
    }
  }
  
  if (footer) {
    message += `\n${footer}`
  }
  
  return message
}

/**
 * إشعار بخطأ
 */
export async function notifyError(
  ctx: Context,
  operation: string,
  error: string
): Promise<void> {
  const message = buildNotificationMessage(
    '❌ خطأ في النظام',
    {
      'العملية': operation,
      'الخطأ': error,
      'المستخدم': ctx.from?.first_name || 'غير معروف',
      'التاريخ': new Date().toLocaleString('ar-EG'),
    }
  )
  
  await notifyAdmins(ctx, message, { excludeCurrentUser: false, roles: ['SUPER_ADMIN'] })
}

