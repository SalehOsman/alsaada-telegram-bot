/**
 * Role Manager
 *
 * Service for managing user roles and role changes
 */

import type { Role } from '../../../generated/prisma/index.js'
import { Database } from '#root/modules/database/index.js'
import { PermissionService } from './permission-service.js'

export interface RoleChangeOptions {
  userId: number
  newRole: Role
  changedBy: number
  reason?: string
}

export interface UserSearchOptions {
  role?: Role
  isActive?: boolean
  isBanned?: boolean
  search?: string
  limit?: number
  offset?: number
}

export class RoleManager {
  /**
   * Change user's role
   */
  static async changeRole(options: RoleChangeOptions): Promise<void> {
    const { userId, newRole, changedBy, reason } = options

    // Get current user
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.role === newRole) {
      throw new Error('User already has this role')
    }

    // Check if changer has permission
    const changerContext = await PermissionService.getUserContext(changedBy)
    if (!changerContext) {
      throw new Error('Changer not found')
    }

    // Only higher role can change roles
    if (!PermissionService.isRoleHigher(changerContext.role, user.role)) {
      throw new Error('Insufficient permissions to change this user role')
    }

    if (!PermissionService.isRoleHigher(changerContext.role, newRole)) {
      throw new Error('Cannot assign a role higher than or equal to yours')
    }

    // Update user role and log change
    await Database.prisma.$transaction([
      Database.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      }),
      Database.prisma.roleChange.create({
        data: {
          userId,
          oldRole: user.role,
          newRole,
          changedBy,
          reason,
        },
      }),
      Database.prisma.auditLog.create({
        data: {
          model: 'User',
          recordId: String(userId),
          action: 'UPDATE',
          category: 'SECURITY',
          fieldName: 'role',
          oldValue: String(user.role),
          newValue: String(newRole),
          changedByUserId: changedBy,
          description: reason,
        },
      }),
    ])
  }

  /**
   * Get role change history for a user
   */
  static async getRoleHistory(userId: number, limit: number = 10) {
    return Database.prisma.roleChange.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        changedByUser: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    })
  }

  /**
   * Ban a user
   */
  static async banUser(
    userId: number,
    bannedBy: number,
    reason?: string,
  ): Promise<void> {
    const bannerContext = await PermissionService.getUserContext(bannedBy)
    if (!bannerContext) {
      throw new Error('Banner not found')
    }

    // Only admins can ban
    if (!PermissionService.hasMinRole(bannerContext, 'ADMIN')) {
      throw new Error('Insufficient permissions to ban users')
    }

    await Database.prisma.$transaction([
      Database.prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          bannedBy,
          bannedReason: reason,
        },
      }),
      Database.prisma.auditLog.create({
        data: {
          model: 'User',
          recordId: String(userId),
          action: 'UPDATE',
          category: 'SECURITY',
          fieldName: 'isBanned',
          oldValue: 'false',
          newValue: 'true',
          changedByUserId: bannedBy,
          description: reason,
          metadata: { reason },
        } as any,
      }),
    ])
  }

  /**
   * Unban a user
   */
  static async unbanUser(userId: number, unbannedBy: number): Promise<void> {
    const unbannerContext = await PermissionService.getUserContext(unbannedBy)
    if (!unbannerContext) {
      throw new Error('Unbanner not found')
    }

    // Only admins can unban
    if (!PermissionService.hasMinRole(unbannerContext, 'ADMIN')) {
      throw new Error('Insufficient permissions to unban users')
    }

    await Database.prisma.$transaction([
      Database.prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          bannedBy: null,
          bannedReason: null,
        },
      }),
      Database.prisma.auditLog.create({
        data: {
          model: 'User',
          recordId: String(userId),
          action: 'UPDATE',
          category: 'SECURITY',
          fieldName: 'isBanned',
          oldValue: 'true',
          newValue: 'false',
          changedByUserId: unbannedBy,
        },
      }),
    ])
  }

  /**
   * Activate a user
   */
  static async activateUser(userId: number): Promise<void> {
    await Database.prisma.$transaction([
      Database.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      }),
      Database.prisma.auditLog.create({
        data: {
          model: 'User',
          recordId: String(userId),
          action: 'UPDATE',
          category: 'SYSTEM',
          fieldName: 'isActive',
          oldValue: 'false',
          newValue: 'true',
        },
      }),
    ])
  }

  /**
   * Deactivate a user
   */
  static async deactivateUser(userId: number): Promise<void> {
    await Database.prisma.$transaction([
      Database.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      Database.prisma.auditLog.create({
        data: {
          model: 'User',
          recordId: String(userId),
          action: 'UPDATE',
          category: 'SYSTEM',
          fieldName: 'isActive',
          oldValue: 'true',
          newValue: 'false',
        },
      }),
    ])
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: Role, limit: number = 50) {
    return Database.prisma.user.findMany({
      where: { role },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Search users
   */
  static async searchUsers(options: UserSearchOptions = {}) {
    const { role, isActive, isBanned, search, limit = 50, offset = 0 } = options

    const where: any = {}

    if (role)
      where.role = role
    if (isActive !== undefined)
      where.isActive = isActive
    if (isBanned !== undefined)
      where.isBanned = isBanned

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ]
    }

    return Database.prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get user statistics by role
   */
  static async getRoleStatistics() {
    const [superAdmins, admins, users, guests, total, active, banned]
      = await Promise.all([
        Database.prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
        Database.prisma.user.count({ where: { role: 'ADMIN' } }),
        Database.prisma.user.count({ where: { role: 'USER' } }),
        Database.prisma.user.count({ where: { role: 'GUEST' } }),
        Database.prisma.user.count(),
        Database.prisma.user.count({ where: { isActive: true } }),
        Database.prisma.user.count({ where: { isBanned: true } }),
      ])

    return {
      superAdmins,
      admins,
      users,
      guests,
      total,
      active,
      banned,
      inactive: total - active,
    }
  }

  /**
   * Get or create user by Telegram ID
   */
  static async getOrCreateUser(telegramId: bigint, userData: {
    username?: string
    firstName?: string
    lastName?: string
  }) {
    let user = await Database.prisma.user.findUnique({
      where: { telegramId },
    })

    if (!user) {
      user = await Database.prisma.user.create({
        data: {
          telegramId,
          username: userData.username,
          fullName: userData.firstName,
          nickname: userData.lastName,
          role: 'GUEST', // Default role
        },
      })
    }

    return user
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: number, data: {
    firstName?: string
    lastName?: string
    username?: string
    phone?: string
    email?: string
    department?: string
    position?: string
    notes?: string
  }) {
    return Database.prisma.user.update({
      where: { id: userId },
      data,
    })
  }
}
