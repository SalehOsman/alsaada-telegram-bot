/**
 * Permission Service
 *
 * Centralized service for checking and managing permissions
 */

import type { Role } from '../../../generated/prisma/index.js'
import type {
  PermissionCheckResult,
  UserPermissionContext,
} from './types.js'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { ROLE_HIERARCHY, ROLE_PERMISSIONS } from './types.js'

export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(
    userContext: UserPermissionContext,
    permission: string,
  ): boolean {
    // Banned users have no permissions
    if (userContext.isBanned) {
      return false
    }

    // Inactive users have no permissions
    if (!userContext.isActive) {
      return false
    }

    // SUPER_ADMIN has all permissions
    if (userContext.role === 'SUPER_ADMIN') {
      return true
    }

    // Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[userContext.role] || []

    // Check wildcard permission
    if (rolePermissions.includes('*')) {
      return true
    }

    // Check exact permission
    if (rolePermissions.includes(permission)) {
      return true
    }

    // Check category wildcard (e.g., "users.*" matches "users.view")
    const [category] = permission.split('.')
    if (rolePermissions.includes(`${category}.*`)) {
      return true
    }

    // Check custom permissions
    if (userContext.customPermissions && userContext.customPermissions.includes(permission)) {
      return true
    }

    return false
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(
    userContext: UserPermissionContext,
    permissions: string[],
  ): boolean {
    return permissions.some(permission => this.hasPermission(userContext, permission))
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(
    userContext: UserPermissionContext,
    permissions: string[],
  ): boolean {
    return permissions.every(permission => this.hasPermission(userContext, permission))
  }

  /**
   * Check if a user has a specific role
   */
  static hasRole(userContext: UserPermissionContext, role: Role): boolean {
    return userContext.role === role
  }

  /**
   * Check if a user has any of the specified roles
   */
  static hasAnyRole(userContext: UserPermissionContext, roles: Role[]): boolean {
    return roles.includes(userContext.role)
  }

  /**
   * Check if a user's role is at least the specified role
   * (e.g., ADMIN is at least USER)
   */
  static hasMinRole(userContext: UserPermissionContext, minRole: Role): boolean {
    const userLevel = ROLE_HIERARCHY[userContext.role] || 0
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= requiredLevel
  }

  /**
   * Check if user can access a feature
   */
  static canAccessFeature(
    userContext: UserPermissionContext,
    requiredRoles?: Role[],
  ): PermissionCheckResult {
    // Banned or inactive users cannot access anything
    if (userContext.isBanned) {
      return {
        allowed: false,
        reason: 'User is banned',
        userRole: userContext.role,
      }
    }

    if (!userContext.isActive) {
      return {
        allowed: false,
        reason: 'User is inactive',
        userRole: userContext.role,
      }
    }

    // If no specific roles required, allow all active users
    if (!requiredRoles || requiredRoles.length === 0) {
      return { allowed: true, userRole: userContext.role }
    }

    // Check if user has any of the required roles
    const allowed = requiredRoles.includes(userContext.role)

    return {
      allowed,
      reason: allowed ? undefined : 'Insufficient role',
      required: requiredRoles,
      userRole: userContext.role,
    }
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: Role): string[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if one role is higher than another
   */
  static isRoleHigher(role1: Role, role2: Role): boolean {
    const level1 = ROLE_HIERARCHY[role1] || 0
    const level2 = ROLE_HIERARCHY[role2] || 0
    return level1 > level2
  }

  /**
   * Get user permission context from database by database ID
   */
  static async getUserContext(userId: number): Promise<UserPermissionContext | null> {
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        role: true,
        isActive: true,
        isBanned: true,
        customPermissions: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      userId: user.id,
      telegramId: user.telegramId,
      role: user.role,
      isActive: user.isActive,
      isBanned: user.isBanned,
      customPermissions: user.customPermissions
        ? JSON.parse(String(user.customPermissions))
        : undefined,
    }
  }

  /**
   * Get user permission context from database by Telegram ID
   */
  static async getUserContextByTelegramId(telegramId: number): Promise<UserPermissionContext | null> {
    const user = await Database.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: {
        id: true,
        telegramId: true,
        role: true,
        isActive: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        customPermissions: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      userId: user.id,
      telegramId: user.telegramId,
      role: user.role,
      isActive: user.isActive,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt,
      bannedReason: user.bannedReason,
      customPermissions: user.customPermissions
        ? JSON.parse(String(user.customPermissions))
        : undefined,
    }
  }

  /**
   * Add custom permission to user
   */
  static async addCustomPermission(userId: number, permission: string): Promise<void> {
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: { customPermissions: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const currentPermissions: string[] = user.customPermissions
      ? JSON.parse(String(user.customPermissions))
      : []

    if (!currentPermissions.includes(permission)) {
      currentPermissions.push(permission)
      await Database.prisma.user.update({
        where: { id: userId },
        data: {
          customPermissions: JSON.stringify(currentPermissions),
        },
      })
    }
  }

  /**
   * Remove custom permission from user
   */
  static async removeCustomPermission(userId: number, permission: string): Promise<void> {
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: { customPermissions: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const currentPermissions: string[] = user.customPermissions
      ? JSON.parse(String(user.customPermissions))
      : []

    const filteredPermissions = currentPermissions.filter(p => p !== permission)

    await Database.prisma.user.update({
      where: { id: userId },
      data: {
        customPermissions: JSON.stringify(filteredPermissions),
      },
    })
  }

  /**
   * Get all custom permissions for a user
   */
  static async getUserCustomPermissions(userId: number): Promise<string[]> {
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: { customPermissions: true },
    })

    if (!user || !user.customPermissions) {
      return []
    }

    return JSON.parse(String(user.customPermissions))
  }

  /**
   * Check if user is admin for a specific department
   */
  static async isDepartmentAdmin(
    telegramId: bigint,
    departmentCode: string,
  ): Promise<boolean> {
    const assignment = await Database.prisma.departmentAdmin.findFirst({
      where: {
        telegramId,
        isActive: true,
        department: {
          code: departmentCode,
          isEnabled: true,
        },
      },
    })

    return assignment !== null
  }

  /**
   * Check if user is admin for a specific sub-feature
   */
  static async isSubFeatureAdmin(
    telegramId: bigint,
    subFeatureCode: string,
  ): Promise<boolean> {
    const assignment = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        telegramId,
        isActive: true,
        subFeature: {
          code: subFeatureCode,
          isEnabled: true,
        },
      },
    })

    return assignment !== null
  }

  /**
   * Check if user can access a department
   * Updated Logic (Fixed):
   * 1. SUPER_ADMIN: always true (bypass all checks)
   * 2. Department disabled: false (nobody except SUPER_ADMIN can access)
   * 3. Assignment check FIRST: DepartmentAdmin OR SubFeatureAdmin → immediate access
   * 4. Role check LAST: if not assigned, check if userRole >= department.minRole
   */
  static async canAccessDepartment(
    userContext: UserPermissionContext,
    departmentCode: string,
  ): Promise<boolean> {
    // 1. SUPER_ADMIN bypass: always has access
    if (userContext.role === 'SUPER_ADMIN') {
      return true
    }

    // Get department config from database
    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: departmentCode },
    })

    // 2. Department doesn't exist or is disabled
    if (!department || !department.isEnabled) {
      return false
    }

    // 3. Check assignments FIRST (before minRole check)
    // Option A: User is DepartmentAdmin (assigned to department itself)
    const isDeptAdmin = await Database.prisma.departmentAdmin.findFirst({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        department: {
          code: departmentCode,
          isEnabled: true,
        },
      },
    })

    if (isDeptAdmin) {
      return true // ✅ Assigned to department → immediate access
    }

    // Option B: User is SubFeatureAdmin (assigned to at least one sub-feature in this department)
    const hasSubFeatureAccess = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        subFeature: {
          code: {
            startsWith: `${departmentCode.replace('-management', '')}:`, // "hr:" for "hr-management"
          },
          isEnabled: true,
        },
      },
    })

    if (hasSubFeatureAccess) {
      return true // ✅ Assigned to sub-feature → immediate access
    }

    // 4. No assignment found - check minRole as fallback
    const minRole = department.minRole || 'ADMIN'
    return this.hasMinRole(userContext, minRole as Role)
  }

  /**
   * Check if user can access a sub-feature
   * Updated Logic (Fixed):
   * 1. SUPER_ADMIN: always true (bypass all checks)
   * 2. Sub-feature not in database: check if user is DepartmentAdmin on parent department
   * 3. Sub-feature disabled: false
   * 4. Parent department disabled: false
   * 5. Assignment check FIRST: DepartmentAdmin OR SubFeatureAdmin → immediate access
   * 6. Role check LAST: if not assigned, check userRole >= (subFeature.minRole OR department.minRole)
   */
  static async canAccessSubFeature(
    userContext: UserPermissionContext,
    subFeatureCode: string,
  ): Promise<boolean> {
    // 1. SUPER_ADMIN bypass: always has access
    if (userContext.role === 'SUPER_ADMIN') {
      return true
    }

    // Get sub-feature config from database
    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { code: subFeatureCode },
      include: {
        department: true,
      },
    })

    // 2. Sub-feature doesn't exist in database - check if user is DepartmentAdmin
    if (!subFeature) {
      // Extract department code from subFeatureCode (e.g., "hr:employees-list" → "hr-management")
      const departmentPrefix = subFeatureCode.split(':')[0]
      const departmentCode = `${departmentPrefix}-management`

      // Check if user is DepartmentAdmin on this department
      const isDeptAdmin = await Database.prisma.departmentAdmin.findFirst({
        where: {
          telegramId: userContext.telegramId,
          isActive: true,
          department: {
            code: departmentCode,
            isEnabled: true,
          },
        },
        include: {
          department: true,
        },
      })

      if (!isDeptAdmin) {
        return false // Not in database and not DepartmentAdmin
      }

      // User is DepartmentAdmin - check role against department's minRole
      const deptMinRole = isDeptAdmin.department.minRole || 'ADMIN'
      return this.hasMinRole(userContext, deptMinRole as Role)
    }

    // 3. Sub-feature exists but is disabled
    if (!subFeature.isEnabled) {
      return false
    }

    // 4. Parent department is disabled
    if (subFeature.department && !subFeature.department.isEnabled) {
      return false
    }

    // 5. Check assignments FIRST (before minRole check)
    // Option A: User is DepartmentAdmin (sees ALL sub-features in department)
    const isDeptAdmin = await Database.prisma.departmentAdmin.findFirst({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        department: {
          code: subFeature.departmentCode,
          isEnabled: true,
        },
      },
    })

    if (isDeptAdmin) {
      // IMPORTANT: DepartmentAdmin cannot access SUPER_ADMIN-only features
      // unless they are also explicitly assigned as SubFeatureAdmin
      if (subFeature.superAdminOnly) {
        // Continue to SubFeatureAdmin check below
      }
      else {
        return true // ✅ Assigned to department → immediate access
      }
    }

    // Option B: User is SubFeatureAdmin (assigned to THIS specific sub-feature)
    const isSubFeatureAdmin = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        telegramId: userContext.telegramId,
        isActive: true,
        subFeature: {
          code: subFeatureCode,
          isEnabled: true,
        },
      },
    })

    if (isSubFeatureAdmin) {
      return true // ✅ Assigned to sub-feature → immediate access
    }

    // 6. No assignment found - check minRole as fallback
    // Determine minimum required role
    let requiredRole: string

    if (subFeature.superAdminOnly) {
      requiredRole = 'SUPER_ADMIN' // Only SUPER_ADMIN can access
    }
    else if (subFeature.minRole) {
      requiredRole = subFeature.minRole // Use sub-feature's specific role requirement
    }
    else if (subFeature.department?.minRole) {
      requiredRole = subFeature.department.minRole // Inherit from parent department
    }
    else {
      requiredRole = 'ADMIN' // Default minimum role
    }

    logger.debug({
      requiredRole,
      userRole: userContext.role,
      hasMinRole: this.hasMinRole(userContext, requiredRole as Role),
    }, '🔍 MinRole check')

    // Check if user's role meets minimum requirement
    const result = this.hasMinRole(userContext, requiredRole as Role)
    logger.debug({
      result,
      subFeatureCode,
    }, '📊 Final canAccessSubFeature result')

    return result
  }

  /**
   * Get all departments for a user
   */
  static async getUserDepartments(telegramId: bigint): Promise<string[]> {
    const assignments = await Database.prisma.departmentAdmin.findMany({
      where: {
        telegramId,
        isActive: true,
      },
      include: {
        department: {
          select: {
            code: true,
          },
        },
      },
    })

    return assignments.map(a => a.department.code)
  }

  /**
   * Get all sub-features for a user
   */
  static async getUserSubFeatures(telegramId: bigint): Promise<string[]> {
    const assignments = await Database.prisma.subFeatureAdmin.findMany({
      where: {
        telegramId,
        isActive: true,
      },
      include: {
        subFeature: {
          select: {
            code: true,
          },
        },
      },
    })

    return assignments.map(a => a.subFeature.code)
  }
}
