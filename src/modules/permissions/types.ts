/**
 * Permissions System Types
 */

import type { Role } from '../../../generated/prisma/index.js'

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  required?: Role[]
  userRole?: Role
}

/**
 * Permission Definition
 */
export interface PermissionDefinition {
  name: string
  description?: string
  category?: string
  requiredRoles: Role[]
}

/**
 * User Permission Context
 */
export interface UserPermissionContext {
  userId: number
  telegramId: bigint
  role: Role
  isActive: boolean
  isBanned: boolean
  bannedAt?: Date | null
  bannedReason?: string | null
  customPermissions?: string[]
}

/**
 * Role Hierarchy
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 2,
  GUEST: 1,
}

/**
 * Default Permissions per Role
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    '*', // All permissions
  ],
  ADMIN: [
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'roles.view',
    'roles.assign',
    'features.view',
    'features.access',
    'reports.view',
    'reports.generate',
  ],
  MODERATOR: [
    'users.view',
    'users.edit',
    'features.view',
    'features.access',
    'reports.view',
  ],
  USER: [
    'profile.view',
    'profile.edit',
    'features.view',
    'features.access',
  ],
  GUEST: [
    'features.view',
  ],
}

/**
 * Permission Categories
 */
export enum PermissionCategory {
  USERS = 'users',
  ROLES = 'roles',
  FEATURES = 'features',
  REPORTS = 'reports',
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
  SYSTEM = 'system',
}
