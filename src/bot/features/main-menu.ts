/**
 * Main Menu Feature
 *
 * Handles the main menu navigation and feature routing.
 */

import type { Context } from '../context.js'
import { Composer } from 'grammy'
import { logger } from '../../modules/services/logger/index.js'
import { featureRegistry } from './registry/feature-registry.js'
import { MenuBuilder } from './registry/menu-builder.js'

export const mainMenuComposer = new Composer<Context>()

/**
 * Handle main menu command
 * ⚠️ فقط للمستخدمين المسجلين (ليس GUEST)
 */
mainMenuComposer.command('menu', async (ctx) => {
  try {
    const userRole = ctx.dbUser?.role ?? 'GUEST'

    // منع الزوار من الوصول للقائمة
    if (!ctx.dbUser || userRole === 'GUEST') {
      await ctx.reply('⛔ يجب عليك تقديم طلب انضمام أولاً.\n\nاستخدم /start للبدء.')
      return
    }

    const keyboard = await MenuBuilder.buildMainMenu(ctx.dbUser, {
      maxButtonsPerRow: 1,
    })

    // إشعار العقوبات المعلقة (للأدمن فقط)
    let notificationMessage = ''
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      try {
        const { Database } = await import('#root/modules/database/index.js')
        const pendingPenaltiesCount = await Database.prisma.hR_AppliedPenalty.count({
          where: {
            status: 'PENDING',
            isCancelled: false,
          },
        })

        if (pendingPenaltiesCount > 0) {
          notificationMessage = `\n\n⚠️ **تنبيه:** يوجد ${pendingPenaltiesCount} عقوبة معلقة تحتاج للمراجعة!\n`
            + '📍 إدارة قسم شئون العاملين → إدارة عقوبات التأخير → مراجعة العقوبات المعلقة'
        }
      }
      catch (error) {
        logger.error({ error }, 'Error checking pending penalties')
      }
    }

    await ctx.reply(
      `📋 **القائمة الرئيسية**\n\nاختر القسم المطلوب:${notificationMessage}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing main menu')
    await ctx.reply('حدث خطأ أثناء عرض القائمة.')
  }
})

/**
 * Handle "القائمة الرئيسية" keyboard button
 * ⚠️ فقط للمستخدمين المسجلين (ليس GUEST)
 */
mainMenuComposer.hears('📋 القائمة الرئيسية', async (ctx) => {
  try {
    const userRole = ctx.dbUser?.role ?? 'GUEST'

    logger.debug({
      userId: ctx.from?.id,
      userRole,
      hasDbUser: !!ctx.dbUser,
    }, 'Main menu button pressed')

    // منع الزوار من الوصول للقائمة
    if (!ctx.dbUser || userRole === 'GUEST') {
      await ctx.reply('⛔ يجب عليك تقديم طلب انضمام أولاً.\n\nاستخدم /start للبدء.')
      return
    }

    const keyboard = await MenuBuilder.buildMainMenu(ctx.dbUser, {
      maxButtonsPerRow: 1,
    })

    // إشعار العقوبات المعلقة (للأدمن فقط)
    let notificationMessage = ''
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      try {
        const { Database } = await import('#root/modules/database/index.js')
        const pendingPenaltiesCount = await Database.prisma.hR_AppliedPenalty.count({
          where: {
            status: 'PENDING',
            isCancelled: false,
          },
        })

        logger.info({
          userRole,
          pendingPenaltiesCount,
        }, 'Checking pending penalties for admin notification')

        if (pendingPenaltiesCount > 0) {
          notificationMessage = `\n\n⚠️ **تنبيه:** يوجد ${pendingPenaltiesCount} عقوبة معلقة تحتاج للمراجعة!\n`
            + '📍 إدارة قسم شئون العاملين → إدارة عقوبات التأخير → مراجعة العقوبات المعلقة'
        }
      }
      catch (error) {
        logger.error({ error }, 'Error checking pending penalties')
      }
    }
    else {
      logger.debug({
        userRole,
      }, 'User is not admin, skipping penalty notification')
    }

    await ctx.reply(
      `📋 **القائمة الرئيسية**\n\nاختر القسم المطلوب:${notificationMessage}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error showing main menu')
    await ctx.reply('حدث خطأ أثناء عرض القائمة.')
  }
})

/**
 * Handle feature selection callback
 */
mainMenuComposer.callbackQuery(/^menu:feature:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const match = ctx.match
    if (!match || !match[1])
      return

    const featureId = match[1]

    if (!ctx.dbUser) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
      return
    }

    // Check if user can access this department using database
    const { PermissionService } = await import('#root/modules/permissions/permission-service.js')
    const canAccess = await PermissionService.canAccessDepartment(ctx.dbUser, featureId)
    if (!canAccess) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول لهذا القسم')
      return
    }

    const feature = featureRegistry.get(featureId)
    if (!feature) {
      await ctx.answerCallbackQuery('⚠️ القسم غير موجود')
      return
    }

    // Build sub-menu (عرض قسم شئون العاملين والمخازن بعمود واحد)
    const keyboard = featureId === 'hr-management' || featureId === 'inventory-management'
      ? await MenuBuilder.buildSubMenu(featureId, ctx.dbUser, {
        maxButtonsPerRow: 1,
        showBackButton: true,
        backButtonText: '⬅️ رجوع للقائمة الرئيسية',
      })
      : await MenuBuilder.buildSubMenu(featureId, ctx.dbUser)
    if (!keyboard) {
      await ctx.answerCallbackQuery('⚠️ لا توجد أقسام فرعية متاحة')
      return
    }

    const description = MenuBuilder.getFeatureDescription(featureId)

    await ctx.editMessageText(description || feature.config.name, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error handling feature selection')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Handle sub-feature selection callback
 */
mainMenuComposer.callbackQuery(/^menu:sub:([^:]+):([^:]+)$/, async (ctx, next) => {
  try {
    const match = ctx.match
    if (!match || !match[1] || !match[2])
      return

    const featureId = match[1] // e.g., "hr-management"
    const subFeatureId = match[2] // e.g., "employees-list"

    if (!ctx.dbUser) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
      return
    }

    // Build the correct sub-feature code for permission check
    // Format: "departmentPrefix:subFeatureId" (e.g., "hr:employees-list")
    const departmentPrefix = featureId.replace('-management', '') // "hr-management" → "hr"
    const subFeatureCode = `${departmentPrefix}:${subFeatureId}` // "hr:employees-list"

    logger.debug({
      featureId,
      subFeatureId,
      subFeatureCode,
      telegramId: ctx.dbUser.telegramId.toString(),
      role: ctx.dbUser.role,
    }, 'Checking sub-feature access')

    // Check permissions using database with correct code format
    const { PermissionService } = await import('#root/modules/permissions/permission-service.js')
    const canAccess = await PermissionService.canAccessSubFeature(ctx.dbUser, subFeatureCode)

    logger.debug({
      subFeatureCode,
      canAccess,
    }, 'Sub-feature access result')

    if (!canAccess) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول لهذا القسم')
      return
    }

    const subFeature = featureRegistry.getSubFeature(featureId, subFeatureId)
    if (!subFeature) {
      await ctx.answerCallbackQuery('⚠️ القسم الفرعي غير موجود')
      return
    }

    // If this sub-feature has its own handler, let downstream handlers process it
    if (subFeature.handler) {
      return next()
    }

    // Otherwise, show basic info/fallback UI
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      `✅ تم اختيار: ${subFeature.name}`,
      {
        parse_mode: 'Markdown',
        reply_markup:
          (featureId === 'hr-management'
            ? await MenuBuilder.buildSubMenu(featureId, ctx.dbUser, {
              maxButtonsPerRow: 1,
              showBackButton: true,
              backButtonText: '⬅️ رجوع للقائمة الرئيسية',
            })
            : await MenuBuilder.buildSubMenu(featureId, ctx.dbUser)) || undefined,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error handling sub-feature selection')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

/**
 * Handle back button
 */
mainMenuComposer.callbackQuery('menu:back', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    if (!ctx.dbUser) {
      await ctx.editMessageText('⛔ يجب عليك تقديم طلب انضمام أولاً.')
      return
    }

    const userRole = ctx.dbUser.role

    const keyboard = await MenuBuilder.buildMainMenu(ctx.dbUser, {
      maxButtonsPerRow: 1,
    })

    // إشعار العقوبات المعلقة (للأدمن فقط)
    let notificationMessage = ''
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      try {
        const { Database } = await import('#root/modules/database/index.js')
        const pendingPenaltiesCount = await Database.prisma.hR_AppliedPenalty.count({
          where: {
            status: 'PENDING',
            isCancelled: false,
          },
        })

        logger.info({
          userRole,
          pendingPenaltiesCount,
        }, 'Checking pending penalties for admin notification (menu:back)')

        if (pendingPenaltiesCount > 0) {
          notificationMessage = `\n\n⚠️ **تنبيه:** يوجد ${pendingPenaltiesCount} عقوبة معلقة تحتاج للمراجعة!\n`
            + '📍 إدارة قسم شئون العاملين → إدارة عقوبات التأخير → مراجعة العقوبات المعلقة'
        }
      }
      catch (error) {
        logger.error({ error }, 'Error checking pending penalties')
      }
    }

    await ctx.editMessageText(
      `📋 **القائمة الرئيسية**\n\nاختر القسم المطلوب:${notificationMessage}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    logger.error({ error }, 'Error handling back button')
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})
