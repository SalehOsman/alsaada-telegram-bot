/**
 * Notification Helper Utility
 * أدوات مساعدة الإشعارات
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
 * إشعار بعملية شراء
 */
export async function notifyPurchase(
  ctx: Context,
  data: {
    itemName: string
    quantity: number
    unit: string
    totalPrice?: number
    userName: string
  }
): Promise<void> {
  const message = buildNotificationMessage(
    'إشعار: عملية شراء جديدة',
    {
      'الصنف': data.itemName,
      'الكمية': `${data.quantity} ${data.unit}`,
      'الإجمالي': data.totalPrice ? `${data.totalPrice.toFixed(2)} جنيه` : 'غير محدد',
      'بواسطة': data.userName,
      'التاريخ': new Date().toLocaleString('ar-EG'),
    }
  )
  
  await notifyAdmins(ctx, message)
}

/**
 * إشعار بعملية صرف
 */
export async function notifyIssue(
  ctx: Context,
  data: {
    itemName: string
    quantity: number
    unit: string
    issuedTo: string
    userName: string
  }
): Promise<void> {
  const message = buildNotificationMessage(
    'إشعار: عملية صرف جديدة',
    {
      'الصنف': data.itemName,
      'الكمية': `${data.quantity} ${data.unit}`,
      'صرف إلى': data.issuedTo,
      'بواسطة': data.userName,
      'التاريخ': new Date().toLocaleString('ar-EG'),
    }
  )
  
  await notifyAdmins(ctx, message)
}

/**
 * إشعار بنقص المخزون
 */
export async function notifyLowStock(
  ctx: Context,
  data: {
    itemName: string
    currentQuantity: number
    minQuantity: number
    unit: string
  }
): Promise<void> {
  const message = buildNotificationMessage(
    '⚠️ تحذير: نقص في المخزون',
    {
      'الصنف': data.itemName,
      'الكمية الحالية': `${data.currentQuantity} ${data.unit}`,
      'الحد الأدنى': `${data.minQuantity} ${data.unit}`,
    },
    '⚠️ يرجى إعادة الطلب في أقرب وقت'
  )
  
  await notifyAdmins(ctx, message)
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
