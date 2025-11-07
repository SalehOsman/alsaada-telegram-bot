/**
 * HR Permissions Middleware
 * التحقق من صلاحيات الوصول لقسم شئون العاملين
 */

import type { NextFunction } from 'grammy'
import type { Context } from '../../../context.js'
import { PermissionService } from '../../../../modules/permissions/permission-service.js'

/**
 * التحقق من صلاحية الوصول لقسم شئون العاملين
 */
export async function checkHRAccess(ctx: Context, next: NextFunction) {
  const user = ctx.dbUser

  if (!user) {
    await ctx.reply('❌ يجب تسجيل الدخول أولاً')
    return
  }

  // السوبر أدمن له صلاحيات كاملة دائماً
  if (user.role === 'SUPER_ADMIN') {
    return next()
  }

  // التحقق من تعيين المستخدم على القسم
  const hasAccess = await PermissionService.canAccessDepartment(
    user,
    'hr-management',
  )

  if (!hasAccess) {
    await ctx.reply('⛔️ ليس لديك صلاحية الوصول لهذا القسم')
    return
  }

  return next()
}

/**
 * التحقق من صلاحية الوصول لوظيفة فرعية محددة
 */
export function checkSubFeatureAccess(subFeatureCode: string) {
  return async (ctx: Context, next: NextFunction) => {
    const user = ctx.dbUser

    if (!user) {
      await ctx.reply('❌ يجب تسجيل الدخول أولاً')
      return
    }

    // السوبر أدمن له صلاحيات كاملة دائماً
    if (user.role === 'SUPER_ADMIN') {
      return next()
    }

    // التحقق من تعيين المستخدم على الوظيفة
    const hasAccess = await PermissionService.canAccessSubFeature(
      user,
      subFeatureCode,
    )

    if (!hasAccess) {
      await ctx.reply('⛔️ ليس لديك صلاحية الوصول لهذه الوظيفة')
      return
    }

    return next()
  }
}

/**
 * التحقق من أن المستخدم سوبر أدمن فقط (لا تعيينات)
 */
export async function checkSuperAdminOnly(ctx: Context, next: NextFunction) {
  const user = ctx.dbUser

  if (!user) {
    await ctx.reply('❌ يجب تسجيل الدخول أولاً')
    return
  }

  if (user.role !== 'SUPER_ADMIN') {
    await ctx.reply('⛔️ هذه الوظيفة متاحة فقط للسوبر أدمن')
    return
  }

  return next()
}
