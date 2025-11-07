/**
 * Menu Builder
 *
 * Builds dynamic inline keyboards from feature configurations.
 */

import type { UserPermissionContext } from '#root/modules/permissions/types.js'
import type { FeatureConfig, MenuBuilderOptions, SubFeature, UserRole } from './types.js'
import { Database } from '#root/modules/database/index.js'
import { InlineKeyboard } from 'grammy'
import { featureRegistry } from './feature-registry.js'

export class MenuBuilder {
  /**
   * Build main menu keyboard
   * Now supports database-assigned admins
   */
  static async buildMainMenu(
    userContext: UserPermissionContext,
    options?: MenuBuilderOptions,
  ): Promise<InlineKeyboard> {
    const keyboard = new InlineKeyboard()
    const maxPerRow = options?.maxButtonsPerRow ?? 2

    // Get features accessible by role
    const roleBasedFeatures = featureRegistry.getAccessibleSorted(userContext.role as UserRole)

    // Get departments where user is assigned as admin
    const assignedDepartments = await Database.prisma.departmentAdmin.findMany({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        department: {
          isEnabled: true,
        },
      },
      include: {
        department: true,
      },
    })

    // Get features from assigned departments
    const assignedFeatures = new Set<FeatureConfig>()
    for (const assignment of assignedDepartments) {
      const feature = featureRegistry.get(assignment.department.code)
      if (feature && feature.config.enabled) {
        assignedFeatures.add(feature.config)
      }
    }

    // Merge role-based and assigned features (remove duplicates)
    const allFeatures = new Map<string, FeatureConfig>()

    for (const feature of roleBasedFeatures) {
      allFeatures.set(feature.config.id, feature.config)
    }

    for (const featureConfig of assignedFeatures) {
      if (!allFeatures.has(featureConfig.id)) {
        allFeatures.set(featureConfig.id, featureConfig)
      }
    }

    // Sort features by order
    const sortedFeatures = Array.from(allFeatures.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    )

    // Build keyboard
    sortedFeatures.forEach((feature, index) => {
      const text = this.formatFeatureName(feature)
      const callbackData = `menu:feature:${feature.id}`

      keyboard.text(text, callbackData)

      // إضافة صف جديد بعد كل زر عندما maxPerRow = 1
      if (maxPerRow === 1) {
        keyboard.row()
      }
      // إضافة صف جديد بعد كل maxPerRow من الأزرار
      else if ((index + 1) % maxPerRow === 0) {
        keyboard.row()
      }
    })

    // إضافة صف أخير إذا كان آخر مجموعة أقل من maxPerRow (فقط عندما maxPerRow > 1)
    if (maxPerRow > 1 && sortedFeatures.length % maxPerRow !== 0) {
      keyboard.row()
    }

    return keyboard
  }

  /**
   * Build sub-menu keyboard for a feature
   * Updated Logic (Fixed):
   * 1. SUPER_ADMIN: sees everything
   * 2. DepartmentAdmin: sees all sub-features (assignment grants access)
   * 3. SubFeatureAdmin: sees only assigned sub-features (assignment grants access)
   * 4. Others: sees sub-features where userRole >= minRole
   */
  static async buildSubMenu(
    featureId: string,
    userContext: UserPermissionContext,
    options?: MenuBuilderOptions,
  ): Promise<InlineKeyboard | null> {
    const feature = featureRegistry.get(featureId)
    if (!feature)
      return null

    const isSystem = feature.config.category === 'system'
    if (!isSystem && !feature.config.enabled)
      return null

    // Get all enabled sub-features
    const allSubFeatures = feature.config.subFeatures?.filter(sf => sf.enabled !== false) || []
    if (allSubFeatures.length === 0)
      return null

    // 1. SUPER_ADMIN sees everything
    if (userContext.role === 'SUPER_ADMIN') {
      return this.buildKeyboardFromSubFeatures(allSubFeatures.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), featureId, options)
    }

    // 2. Check if user is DepartmentAdmin (sees all sub-features)
    const isDepartmentAdmin = await Database.prisma.departmentAdmin.findFirst({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        department: {
          code: featureId,
          isEnabled: true,
        },
      },
    })

    const accessibleSubFeatures: SubFeature[] = []

    if (isDepartmentAdmin) {
      // DepartmentAdmin: sees ALL sub-features EXCEPT those marked as superAdminOnly
      for (const subFeature of allSubFeatures) {
        const subFeatureCode = `${featureId.replace('-management', '')}:${subFeature.id}`

        // Check if this sub-feature is SUPER_ADMIN only
        const subFeatureConfig = await Database.prisma.subFeatureConfig.findUnique({
          where: { code: subFeatureCode },
        })

        // Skip SUPER_ADMIN only features unless user is also explicitly assigned
        if (subFeatureConfig?.superAdminOnly) {
          // Check if user is explicitly assigned to this specific sub-feature
          const assignment = await Database.prisma.subFeatureAdmin.findFirst({
            where: {
              telegramId: userContext.telegramId,
              isActive: true,
              subFeature: {
                code: subFeatureCode,
                isEnabled: true,
              },
            },
          })

          if (assignment) {
            // Explicitly assigned → add it
            accessibleSubFeatures.push(subFeature)
          }
          // else: skip it (SUPER_ADMIN only and not assigned)
        }
        else {
          // Not SUPER_ADMIN only → DepartmentAdmin can see it
          accessibleSubFeatures.push(subFeature)
        }
      }
    }
    else {
      // 3. Not DepartmentAdmin - check each sub-feature individually
      for (const subFeature of allSubFeatures) {
        const subFeatureCode = `${featureId.replace('-management', '')}:${subFeature.id}`

        // Check if user is assigned to this specific sub-feature
        const assignment = await Database.prisma.subFeatureAdmin.findFirst({
          where: {
            telegramId: userContext.telegramId,
            isActive: true,
            subFeature: {
              code: subFeatureCode,
              isEnabled: true,
            },
          },
          include: {
            subFeature: true,
          },
        })

        if (assignment) {
          // SubFeatureAdmin: assigned to this sub-feature → add it
          accessibleSubFeatures.push(subFeature)
        }
        else {
          // 4. Not assigned - check minRole
          const subFeatureConfig = await Database.prisma.subFeatureConfig.findUnique({
            where: { code: subFeatureCode },
          })

          // If no SubFeatureConfig, fall back to department minRole or ADMIN
          let minRole: string
          if (!subFeatureConfig) {
            // No config in database - check department's minRole
            const departmentConfig = await Database.prisma.departmentConfig.findUnique({
              where: { code: featureId },
            })
            minRole = departmentConfig?.minRole || 'ADMIN'
          }
          else {
            minRole = subFeatureConfig.minRole || (subFeatureConfig.superAdminOnly ? 'SUPER_ADMIN' : 'ADMIN')
          }

          const { PermissionService } = await import('#root/modules/permissions/permission-service.js')

          if (PermissionService.hasMinRole(userContext, minRole as any)) {
            accessibleSubFeatures.push(subFeature)
          }
        }
      }
    }

    if (accessibleSubFeatures.length === 0)
      return null

    // Sort by order
    accessibleSubFeatures.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

    return this.buildKeyboardFromSubFeatures(accessibleSubFeatures, featureId, options)
  }

  /**
   * Build keyboard from sub-features list
   */
  private static buildKeyboardFromSubFeatures(
    subFeatures: SubFeature[],
    featureId: string,
    options?: MenuBuilderOptions,
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard()
    const maxPerRow = options?.maxButtonsPerRow ?? 2

    subFeatures.forEach((subFeature, index) => {
      const text = this.formatSubFeatureName(subFeature)
      const callbackData = `menu:sub:${featureId}:${subFeature.id}`

      keyboard.text(text, callbackData)

      if (maxPerRow === 1) {
        keyboard.row()
      }
      else if ((index + 1) % maxPerRow === 0) {
        keyboard.row()
      }
    })

    if (maxPerRow > 1 && subFeatures.length % maxPerRow !== 0) {
      keyboard.row()
    }

    // Add back button
    if (options?.showBackButton !== false) {
      const backText = options?.backButtonText ?? '⬅️ رجوع'
      keyboard.text(backText, 'menu:back')
    }

    return keyboard
  }

  /**
   * Build breadcrumb navigation
   */
  static buildBreadcrumb(path: string[]): string {
    if (path.length === 0)
      return 'القائمة الرئيسية'

    const breadcrumbs: string[] = ['القائمة الرئيسية']

    for (const featureId of path) {
      const feature = featureRegistry.get(featureId)
      if (feature) {
        breadcrumbs.push(feature.config.name)
      }
    }

    return breadcrumbs.join(' > ')
  }

  /**
   * Format feature name with icon
   */
  private static formatFeatureName(config: FeatureConfig): string {
    if (config.icon) {
      return `${config.icon} ${config.name}`
    }
    return config.name
  }

  /**
   * Format sub-feature name with icon
   */
  private static formatSubFeatureName(subFeature: SubFeature): string {
    if (subFeature.icon) {
      return `${subFeature.icon} ${subFeature.name}`
    }
    return subFeature.name
  }

  /**
   * Parse callback data
   */
  static parseCallback(callbackData: string): {
    action: string
    featureId?: string
    subFeatureId?: string
  } | null {
    const parts = callbackData.split(':')
    if (parts[0] !== 'menu')
      return null

    if (parts[1] === 'back') {
      return { action: 'back' }
    }

    if (parts[1] === 'feature' && parts[2]) {
      return { action: 'feature', featureId: parts[2] }
    }

    if (parts[1] === 'sub' && parts[2] && parts[3]) {
      return { action: 'sub', featureId: parts[2], subFeatureId: parts[3] }
    }

    return null
  }

  /**
   * Get feature description text
   */
  static getFeatureDescription(featureId: string): string | null {
    const feature = featureRegistry.get(featureId)
    if (!feature)
      return null

    let text = `**${this.formatFeatureName(feature.config)}**\n\n`

    if (feature.config.description) {
      text += `${feature.config.description}\n\n`
    }

    const subFeatures = featureRegistry.getEnabledSubFeatures(featureId)
    if (subFeatures.length > 0) {
      text += 'الأقسام المتاحة:\n'
      subFeatures.forEach((sf) => {
        text += `• ${this.formatSubFeatureName(sf)}\n`
      })
    }

    return text
  }
}
