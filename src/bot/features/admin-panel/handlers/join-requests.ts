/**
 * Join Requests Management
 *
 * معالجات إدارة طلبات الانضمام
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer, InlineKeyboard } from 'grammy'
import { RequestStatus } from '../../../../../generated/prisma/index.js'

export const joinRequestsHandler = new Composer<Context>()

// دعم نمط MenuBuilder المباشر بالاسم
joinRequestsHandler.callbackQuery('joinRequestsHandler', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    // نفس منطق القائمة الرئيسية لطلبات الانضمام
    const pendingRequests = await Database.prisma.joinRequest.findMany({
      where: { status: RequestStatus.PENDING },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    })

    const rejectedCount = await Database.prisma.joinRequest.count({
      where: { status: RequestStatus.REJECTED },
    })

    if (pendingRequests.length === 0) {
      const keyboard = new InlineKeyboard()
      if (rejectedCount > 0) {
        keyboard.text(`❌ عرض المرفوضة (${rejectedCount})`, 'join:rejected-list').row()
      }
      keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

      await ctx.editMessageText(
        '📋 **طلبات الانضمام**\n\n'
        + '✅ لا توجد طلبات قيد المراجعة',
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      return
    }

    const keyboard = new InlineKeyboard()
    pendingRequests.forEach((request) => {
      keyboard.text(`👤 ${request.fullName} (${request.phone})`, `join:details:${request.id}`)
      keyboard.row()
    })
    if (rejectedCount > 0) {
      keyboard.text(`❌ عرض المرفوضة (${rejectedCount})`, 'join:rejected-list').row()
    }
    keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      `📋 **طلبات الانضمام قيد المراجعة (${pendingRequests.length})**\n\n`
      + 'اختر طلباً لعرض التفاصيل:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing join requests via direct handler')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض قائمة طلبات الانضمام
 */
joinRequestsHandler.callbackQuery(/^menu:sub:admin-panel:join-requests$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const pendingRequests = await Database.prisma.joinRequest.findMany({
      where: { status: RequestStatus.PENDING },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    })

    const rejectedCount = await Database.prisma.joinRequest.count({
      where: { status: RequestStatus.REJECTED },
    })

    if (pendingRequests.length === 0) {
      const keyboard = new InlineKeyboard()

      if (rejectedCount > 0) {
        keyboard.text(`❌ عرض المرفوضة (${rejectedCount})`, 'join:rejected-list').row()
      }

      keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

      await ctx.editMessageText(
        '📋 **طلبات الانضمام**\n\n'
        + '✅ لا توجد طلبات قيد المراجعة',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    pendingRequests.forEach((request) => {
      keyboard.text(
        `👤 ${request.fullName} (${request.phone})`,
        `join:details:${request.id}`,
      )
      keyboard.row()
    })

    if (rejectedCount > 0) {
      keyboard.text(`❌ عرض المرفوضة (${rejectedCount})`, 'join:rejected-list').row()
    }

    keyboard.text('⬅️ رجوع', 'menu:feature:admin-panel')

    await ctx.editMessageText(
      `📋 **طلبات الانضمام قيد المراجعة (${pendingRequests.length})**\n\n`
      + 'اختر طلباً لعرض التفاصيل:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing join requests list')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض تفاصيل طلب
 */
joinRequestsHandler.callbackQuery(/^join:details:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const requestId = Number(ctx.match[1])
    const request = await Database.prisma.joinRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      await ctx.answerCallbackQuery('⚠️ الطلب غير موجود')
      return
    }

    const statusEmoji: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]: '⏳',
      [RequestStatus.APPROVED]: '✅',
      [RequestStatus.REJECTED]: '❌',
    }

    const statusText: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]: 'قيد المراجعة',
      [RequestStatus.APPROVED]: 'تم القبول',
      [RequestStatus.REJECTED]: 'تم الرفض',
    }

    let message
      = `📋 **تفاصيل طلب الانضمام #${request.id}**\n\n`
        + `👤 **الاسم الكامل:** ${request.fullName}\n`
        + `🏷️ **اسم الشهرة:** ${request.nickname || '_غير محدد_'}\n`
        + `📱 **رقم الموبايل:** ${request.phone}\n`
        + `🆔 **Telegram ID:** \`${request.telegramId}\`\n`
        + `📅 **تاريخ الطلب:** ${request.requestedAt.toLocaleString('ar-EG')}\n`
        + `${statusEmoji[request.status]} **الحالة:** ${statusText[request.status]}\n`

    if (request.respondedAt) {
      message += `📅 **تاريخ الرد:** ${request.respondedAt.toLocaleString('ar-EG')}\n`
    }

    if (request.notes) {
      message += `📝 **ملاحظات:** ${request.notes}\n`
    }

    const keyboard = new InlineKeyboard()

    if (request.status === RequestStatus.PENDING) {
      keyboard
        .text('✅ قبول', `join:approve:${request.id}`)
        .text('❌ رفض', `join:reject:${request.id}`)
        .row()
    }

    keyboard.text('⬅️ رجوع', 'menu:sub:admin-panel:join-requests')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing join request details')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * قبول طلب انضمام
 */
joinRequestsHandler.callbackQuery(/^join:approve:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const requestId = Number(ctx.match[1])
    const adminId = ctx.dbUser?.userId

    if (!adminId) {
      await ctx.answerCallbackQuery('⚠️ خطأ في تحديد هويتك')
      return
    }

    const request = await Database.prisma.joinRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      await ctx.answerCallbackQuery('⚠️ الطلب غير موجود')
      return
    }

    if (request.status !== RequestStatus.PENDING) {
      await ctx.answerCallbackQuery('⚠️ تم معالجة هذا الطلب مسبقاً')
      return
    }

    // إنشاء المستخدم في النظام من بيانات طلب الانضمام
    try {
      const user = await Database.prisma.user.create({
        data: {
          telegramId: request.telegramId,
          username: request.username,
          fullName: request.fullName,
          nickname: request.nickname,
          phone: request.phone,
          role: 'USER',
          isActive: true,
        },
      })

      logger.info({
        userId: user.id,
        requestId,
      }, 'User created from join request')

      // تحديث حالة الطلب وحذفه
      await Database.prisma.joinRequest.delete({
        where: { id: requestId },
      })

      // إرسال إشعار للمستخدم
      try {
        await ctx.api.sendMessage(
          request.telegramId.toString(),
          '🎉 **تهانينا!**\n\n'
          + 'تمت الموافقة على طلب انضمامك.\n'
          + 'يمكنك الآن استخدام البوت والوصول إلى جميع الميزات.\n\n'
          + 'اضغط /start للبدء',
          { parse_mode: 'Markdown' },
        )
      }
      catch (error) {
        logger.error({ error }, 'Failed to notify user of approval')
      }

      await ctx.editMessageText(
        `✅ **تم قبول الطلب بنجاح!**\n\n`
        + `👤 **المستخدم:** ${request.fullName}\n`
        + `🆔 **User ID:** ${user.id}\n`
        + `📱 **الهاتف:** ${request.phone}\n\n`
        + `تم إنشاء حساب المستخدم وحذف طلب الانضمام وإرسال إشعار له.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'menu:sub:admin-panel:join-requests'),
        },
      )

      logger.info({
        requestId,
        userId: user.id,
        approvedBy: adminId,
      }, 'Join request approved and user created')
    }
    catch (error) {
      logger.error({ error }, 'Error creating user after approval')
      await ctx.reply('⚠️ تمت الموافقة على الطلب لكن حدث خطأ في إنشاء الحساب')
    }
  }
  catch (error) {
    logger.error({ error }, 'Error approving join request')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * رفض طلب انضمام
 */
joinRequestsHandler.callbackQuery(/^join:reject:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const requestId = Number(ctx.match[1])
    const adminId = ctx.dbUser?.userId

    if (!adminId) {
      await ctx.answerCallbackQuery('⚠️ خطأ في تحديد هويتك')
      return
    }

    const request = await Database.prisma.joinRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      await ctx.answerCallbackQuery('⚠️ الطلب غير موجود')
      return
    }

    if (request.status !== 'PENDING') {
      await ctx.answerCallbackQuery('⚠️ تم معالجة هذا الطلب مسبقاً')
      return
    }

    // طلب سبب الرفض (اختياري - يمكن تطويره لاحقاً)
    const rejectionReason = 'تم رفض الطلب من قبل الإدارة'

    // تحديث حالة الطلب إلى REJECTED (للحفاظ على السجل ومنع إعادة التقديم)
    await Database.prisma.joinRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        respondedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason,
      },
    })

    // إرسال إشعار للمستخدم
    try {
      await ctx.api.sendMessage(
        request.telegramId.toString(),
        '❌ **عذراً**\n\n'
        + 'تم رفض طلب انضمامك.\n\n'
        + `**السبب:** ${rejectionReason}\n\n`
        + 'يمكنك التواصل مع الإدارة للمزيد من المعلومات.',
        { parse_mode: 'Markdown' },
      )
    }
    catch (error) {
      logger.error({ error }, 'Failed to notify user of rejection')
    }

    await ctx.editMessageText(
      `❌ **تم رفض الطلب**\n\n`
      + `👤 **المستخدم:** ${request.fullName}\n`
      + `📱 **الهاتف:** ${request.phone}\n\n`
      + `تم حفظ حالة الرفض لمنع إعادة التقديم وإرسال إشعار للمستخدم.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⬅️ رجوع', 'menu:sub:admin-panel:join-requests'),
      },
    )

    logger.info({
      requestId,
      rejectedBy: adminId,
    }, 'Join request rejected and status saved')
  }
  catch (error) {
    logger.error({ error }, 'Error rejecting join request')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * عرض قائمة الطلبات المرفوضة
 */
joinRequestsHandler.callbackQuery('join:rejected-list', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const rejectedRequests = await Database.prisma.joinRequest.findMany({
      where: { status: RequestStatus.REJECTED },
      orderBy: { respondedAt: 'desc' },
      take: 10,
      include: {
        User_JoinRequest_rejectedByToUser: {
          select: { fullName: true, nickname: true },
        },
      },
    })

    if (rejectedRequests.length === 0) {
      await ctx.editMessageText(
        '📋 **الطلبات المرفوضة**\n\n'
        + 'لا توجد طلبات مرفوضة',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'menu:sub:admin-panel:join-requests'),
        },
      )
      return
    }

    let message = `❌ **الطلبات المرفوضة (${rejectedRequests.length})**\n\n`

    rejectedRequests.forEach((request, index) => {
      const rejectedByName = request.User_JoinRequest_rejectedByToUser
        ? `${request.User_JoinRequest_rejectedByToUser.fullName || request.User_JoinRequest_rejectedByToUser.nickname || ''}`.trim() || 'غير معروف'
        : 'غير معروف'

      message += `${index + 1}. **${request.fullName}**\n`
      message += `   📱 ${request.phone}\n`
      message += `   🚫 رفض بواسطة: ${rejectedByName}\n`
      message += `   📅 ${request.respondedAt?.toLocaleDateString('ar-EG') || 'N/A'}\n`
      message += `   📝 ${request.rejectionReason || 'لا يوجد سبب'}\n\n`
    })

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'menu:sub:admin-panel:join-requests'),
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing rejected requests')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})
