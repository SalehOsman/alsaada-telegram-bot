/**
 * HR Management Feature Configuration
 */

import type { FeatureConfig } from '../registry/types.js'

export const hrManagementConfig: FeatureConfig = {
  id: 'hr-management',
  name: 'شئون العاملين',
  icon: '👥',
  description: 'إدارة شاملة للموارد البشرية',
  enabled: true,
  order: 2,
  permissions: ['SUPER_ADMIN'], // فقط السوبر أدمن أو المعينين على القسم

  subFeatures: [
    {
      id: 'employees-list',
      name: 'قوائم العاملين',
      icon: '📋',
      description: 'إدارة بيانات العاملين الحاليين والسابقين',
      handler: 'employeesListHandler',
      enabled: true,
      order: 1,
      permissions: ['SUPER_ADMIN'], // أو المعينين على هذه الوظيفة
    },
    {
      id: 'advances',
      name: 'السلف والمسحوبات',
      icon: '💰',
      description: 'إدارة السلف والمسحوبات المالية',
      handler: 'advancesHandler',
      enabled: true,
      order: 2,
      permissions: ['SUPER_ADMIN'], // أو المعينين على هذه الوظيفة
    },
    {
      id: 'leaves',
      name: 'الإجازات والماموريات',
      icon: '🏖️',
      description: 'إدارة الإجازات والماموريات الرسمية',
      handler: 'leavesHandler',
      enabled: true,
      order: 3,
      permissions: ['SUPER_ADMIN'], // أو المعينين على هذه الوظيفة
    },
    {
      id: 'payroll',
      name: 'الرواتب والأجور',
      icon: '💵',
      description: 'إدارة الرواتب والأجور (SUPER_ADMIN فقط)',
      handler: 'payrollHandler',
      enabled: true,
      order: 4,
      permissions: ['SUPER_ADMIN'], // السوبر أدمن فقط - لا يمكن تعيين أدمن عليها
    },
    {
      id: 'custom-reports',
      name: 'التقارير المخصصة',
      icon: '📊',
      description: 'إنشاء تقارير احترافية مخصصة (SUPER_ADMIN فقط)',
      handler: 'customReportsHandler',
      enabled: true,
      order: 5,
      permissions: ['SUPER_ADMIN'], // السوبر أدمن فقط - لا يمكن تعيين أدمن عليها
    },
    {
      id: 'section-management',
      name: 'إدارة قسم شئون العاملين',
      icon: '⚙️',
      description: 'تعيين الأدمن وإدارة صلاحيات القسم والوظائف (SUPER_ADMIN فقط)',
      handler: 'hr:section:manage',
      enabled: true,
      order: 6,
      permissions: ['SUPER_ADMIN'],
    },
  ],
}
