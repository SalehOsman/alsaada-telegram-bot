import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sectionPermissionsHandler = new Composer<Context>()

/**
 * Handler لإدارة صلاحيات قسم شئون العاملين
 * يسمح بتحديد:
 * 1. الحد الأدنى من الصلاحية للوصول إلى القسم (Department minRole)
 * 2. الحد الأدنى من الصلاحية لكل وظيفة فرعية (SubFeature minRole)
 */

// Main menu for section permissions
sectionPermissionsHandler.callbackQuery(/^menu:sub:hr-management:section-management$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
    return
  }

  // Only SUPER_ADMIN and ADMIN can manage section permissions
  if (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN') {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }

  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'hr:section:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'hr:section:manage-subfeatures')
    .row()
    .text('👥 إدارة المدراء المعينين', 'hr:section:manage-admins')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'hr:section:view-permissions')
    .row()
    .text('⬅️ رجوع', 'menu:feature:hr-management')

  await ctx.editMessageText(
    '⚙️ **إدارة صلاحيات قسم شئون العاملين**\n\n'
    + '🔐 **إدارة الصلاحيات:**\n'
    + '• تحديد الحد الأدنى من الرتبة للوصول إلى القسم\n'
    + '• تحديد صلاحيات كل وظيفة فرعية\n'
    + '• إدارة المدراء المعينين على القسم والوظائف\n\n'
    + '📌 اختر الإجراء المطلوب:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// View current permissions
sectionPermissionsHandler.callbackQuery('hr:section:view-permissions', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // Get department config
    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: 'hr-management' },
    })

    if (!department) {
      await ctx.answerCallbackQuery('⚠️ القسم غير موجود في قاعدة البيانات')
      return
    }

    // Get all sub-features
    const subFeatures = await Database.prisma.subFeatureConfig.findMany({
      where: { departmentCode: 'hr-management' },
      orderBy: { code: 'asc' },
    })

    const roleNames: Record<string, string> = {
      SUPER_ADMIN: 'المدير الأعلى',
      ADMIN: 'مدير',
      MODERATOR: 'مشرف',
      USER: 'مستخدم',
      GUEST: 'زائر',
    }

    let message = '📊 **الصلاحيات الحالية لقسم شئون العاملين**\n\n'

    // Department level
    message += `🏢 **صلاحية القسم:**\n`
    message += `└─ الحد الأدنى: ${roleNames[department.minRole || 'ADMIN'] || 'غير محدد'}\n\n`

    // Sub-features
    message += '⚙️ **صلاحيات الوظائف:**\n\n'

    if (subFeatures.length === 0) {
      message += '_لا توجد وظائف مسجلة في قاعدة البيانات_\n\n'
    }
    else {
      subFeatures.forEach((sf: any, index: number) => {
        const featureName = getSubFeatureName(sf.code)
        const minRole = sf.superAdminOnly
          ? 'المدير الأعلى فقط'
          : (sf.minRole ? roleNames[sf.minRole] : 'يرث من القسم')
        const status = sf.isEnabled ? '✅' : '❌'

        message += `${index + 1}. ${status} **${featureName}**\n`
        message += `   └─ الحد الأدنى: ${minRole}\n\n`
      })
    }

    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error viewing permissions:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// Set department minRole
sectionPermissionsHandler.callbackQuery('hr:section:set-dept-role', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('👑 المدير الأعلى فقط', 'hr:section:dept-role:SUPER_ADMIN')
    .row()
    .text('🔑 مدير فأعلى', 'hr:section:dept-role:ADMIN')
    .row()
    .text('📋 مشرف فأعلى', 'hr:section:dept-role:MODERATOR')
    .row()
    .text('👤 مستخدم فأعلى', 'hr:section:dept-role:USER')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

  await ctx.editMessageText(
    '🔐 **تحديد صلاحية قسم شئون العاملين**\n\n'
    + 'اختر الحد الأدنى من الرتبة المطلوبة للوصول إلى هذا القسم:\n\n'
    + '• **المدير الأعلى فقط:** SUPER_ADMIN فقط\n'
    + '• **مدير فأعلى:** ADMIN + SUPER_ADMIN\n'
    + '• **مشرف فأعلى:** MODERATOR + ADMIN + SUPER_ADMIN\n'
    + '• **مستخدم فأعلى:** الجميع ما عدا GUEST',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// Handle department role selection
sectionPermissionsHandler.callbackQuery(/^hr:section:dept-role:(.+)$/, async (ctx) => {
  const role = ctx.match![1] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'

  try {
    await Database.prisma.departmentConfig.update({
      where: { code: 'hr-management' },
      data: { minRole: role },
    })

    await ctx.answerCallbackQuery(`✅ تم تحديث صلاحية القسم إلى: ${getRoleName(role)}`)

    // Return to section management menu
    const keyboard = new InlineKeyboard()
      .text('🔐 تحديد صلاحية القسم', 'hr:section:set-dept-role')
      .row()
      .text('⚙️ تحديد صلاحيات الوظائف', 'hr:section:manage-subfeatures')
      .row()
      .text('👥 إدارة المدراء المعينين', 'hr:section:manage-admins')
      .row()
      .text('📊 عرض الصلاحيات الحالية', 'hr:section:view-permissions')
      .row()
      .text('⬅️ رجوع', 'menu:feature:hr-management')

    await ctx.editMessageText(
      '✅ **تم تحديث الصلاحية بنجاح**\n\n'
      + '⚙️ **إدارة صلاحيات قسم شئون العاملين**\n\n'
      + '🔐 **إدارة الصلاحيات:**\n'
      + '• تحديد الحد الأدنى من الرتبة للوصول إلى القسم\n'
      + '• تحديد صلاحيات كل وظيفة فرعية\n'
      + '• إدارة المدراء المعينين على القسم والوظائف\n\n'
      + '📌 اختر الإجراء المطلوب:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating department role:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء التحديث')
  }
})

// Manage sub-features permissions
sectionPermissionsHandler.callbackQuery('hr:section:manage-subfeatures', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const subFeatures = await Database.prisma.subFeatureConfig.findMany({
      where: { departmentCode: 'hr-management' },
      orderBy: { code: 'asc' },
    })

    if (subFeatures.length === 0) {
      await ctx.editMessageText(
        '⚠️ **لا توجد وظائف مسجلة**\n\n'
        + 'لا توجد وظائف فرعية مسجلة في قاعدة البيانات لهذا القسم.\n\n'
        + 'يمكنك إضافتها من Prisma Studio أو عبر الكود.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'menu:sub:hr-management:section-management'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    subFeatures.forEach((sf: any) => {
      const featureName = getSubFeatureName(sf.code)
      const status = sf.isEnabled ? '✅' : '❌'
      keyboard.text(
        `${status} ${featureName}`,
        `hr:section:subfeature:${sf.code}`,
      ).row()
    })

    keyboard.text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

    await ctx.editMessageText(
      '⚙️ **إدارة صلاحيات الوظائف**\n\n'
      + 'اختر الوظيفة لتحديد صلاحياتها:\n\n'
      + '✅ = مفعلة | ❌ = معطلة',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error loading sub-features:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// Manage specific sub-feature
sectionPermissionsHandler.callbackQuery(/^hr:section:subfeature:(.+)$/, async (ctx) => {
  const subFeatureCode = ctx.match![1]

  try {
    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { code: subFeatureCode },
    })

    if (!subFeature) {
      await ctx.answerCallbackQuery('⚠️ الوظيفة غير موجودة')
      return
    }

    const featureName = getSubFeatureName(subFeatureCode)

    const keyboard = new InlineKeyboard()
      .text('🔐 تحديد الحد الأدنى من الصلاحية', `hr:section:sf-role:${subFeatureCode}`)
      .row()
      .text(
        subFeature.isEnabled ? '❌ تعطيل الوظيفة' : '✅ تفعيل الوظيفة',
        `hr:section:sf-toggle:${subFeatureCode}`,
      )
      .row()
      .text('⬅️ رجوع', 'hr:section:manage-subfeatures')

    const currentRole = subFeature.superAdminOnly
      ? 'المدير الأعلى فقط'
      : (subFeature.minRole ? getRoleName(subFeature.minRole as any) : 'يرث من القسم')

    await ctx.editMessageText(
      `⚙️ **إدارة: ${featureName}**\n\n`
      + `📊 **الحالة الحالية:**\n`
      + `• التفعيل: ${subFeature.isEnabled ? '✅ مفعلة' : '❌ معطلة'}\n`
      + `• الحد الأدنى: ${currentRole}\n\n`
      + '📌 اختر الإجراء:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error loading sub-feature:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// Set sub-feature role
sectionPermissionsHandler.callbackQuery(/^hr:section:sf-role:(.+)$/, async (ctx) => {
  const subFeatureCode = ctx.match![1]

  const keyboard = new InlineKeyboard()
    .text('👑 المدير الأعلى فقط', `hr:section:sf-role-set:${subFeatureCode}:SUPER_ADMIN`)
    .row()
    .text('🔑 مدير فأعلى', `hr:section:sf-role-set:${subFeatureCode}:ADMIN`)
    .row()
    .text('📋 مشرف فأعلى', `hr:section:sf-role-set:${subFeatureCode}:MODERATOR`)
    .row()
    .text('👤 مستخدم فأعلى', `hr:section:sf-role-set:${subFeatureCode}:USER`)
    .row()
    .text('🔄 يرث من القسم', `hr:section:sf-role-set:${subFeatureCode}:INHERIT`)
    .row()
    .text('⬅️ رجوع', `hr:section:subfeature:${subFeatureCode}`)

  await ctx.editMessageText(
    `🔐 **تحديد صلاحية: ${getSubFeatureName(subFeatureCode)}**\n\n`
    + 'اختر الحد الأدنى من الرتبة المطلوبة:\n\n'
    + '• **المدير الأعلى فقط:** SUPER_ADMIN فقط\n'
    + '• **مدير فأعلى:** ADMIN + SUPER_ADMIN\n'
    + '• **مشرف فأعلى:** MODERATOR + ADMIN + SUPER_ADMIN\n'
    + '• **مستخدم فأعلى:** الجميع ما عدا GUEST\n'
    + '• **يرث من القسم:** يستخدم صلاحية القسم الأساسية',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// Handle sub-feature role setting
sectionPermissionsHandler.callbackQuery(/^hr:section:sf-role-set:([^:]+):([^:]+)$/, async (ctx) => {
  const subFeatureCode = ctx.match![1]
  const role = ctx.match![2]

  try {
    if (role === 'INHERIT') {
      // Set to inherit from department (null minRole, superAdminOnly = false)
      await Database.prisma.subFeatureConfig.update({
        where: { code: subFeatureCode },
        data: {
          minRole: null,
          superAdminOnly: false,
        },
      })

      await ctx.answerCallbackQuery('✅ تم تحديث الصلاحية: يرث من القسم')
    }
    else if (role === 'SUPER_ADMIN') {
      // SUPER_ADMIN only
      await Database.prisma.subFeatureConfig.update({
        where: { code: subFeatureCode },
        data: {
          minRole: null,
          superAdminOnly: true,
        },
      })

      await ctx.answerCallbackQuery('✅ تم تحديث الصلاحية: المدير الأعلى فقط')
    }
    else {
      // Specific role
      await Database.prisma.subFeatureConfig.update({
        where: { code: subFeatureCode },
        data: {
          minRole: role,
          superAdminOnly: false,
        },
      })

      await ctx.answerCallbackQuery(`✅ تم تحديث الصلاحية: ${getRoleName(role as any)}`)
    }

    // Return to sub-feature menu
    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { code: subFeatureCode },
    })

    if (!subFeature) {
      await ctx.answerCallbackQuery('⚠️ الوظيفة غير موجودة')
      return
    }

    const featureName = getSubFeatureName(subFeatureCode)

    const keyboard = new InlineKeyboard()
      .text('🔐 تحديد الحد الأدنى من الصلاحية', `hr:section:sf-role:${subFeatureCode}`)
      .row()
      .text(
        subFeature.isEnabled ? '❌ تعطيل الوظيفة' : '✅ تفعيل الوظيفة',
        `hr:section:sf-toggle:${subFeatureCode}`,
      )
      .row()
      .text('⬅️ رجوع', 'hr:section:manage-subfeatures')

    const currentRole = subFeature.superAdminOnly
      ? 'المدير الأعلى فقط'
      : (subFeature.minRole ? getRoleName(subFeature.minRole as any) : 'يرث من القسم')

    await ctx.editMessageText(
      `✅ **تم التحديث بنجاح**\n\n`
      + `⚙️ **إدارة: ${featureName}**\n\n`
      + `📊 **الحالة الحالية:**\n`
      + `• التفعيل: ${subFeature.isEnabled ? '✅ مفعلة' : '❌ معطلة'}\n`
      + `• الحد الأدنى: ${currentRole}\n\n`
      + '📌 اختر الإجراء:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating sub-feature role:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء التحديث')
  }
})

// Toggle sub-feature enabled/disabled
sectionPermissionsHandler.callbackQuery(/^hr:section:sf-toggle:(.+)$/, async (ctx) => {
  const subFeatureCode = ctx.match![1]

  try {
    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { code: subFeatureCode },
    })

    if (!subFeature) {
      await ctx.answerCallbackQuery('⚠️ الوظيفة غير موجودة')
      return
    }

    // Toggle
    await Database.prisma.subFeatureConfig.update({
      where: { code: subFeatureCode },
      data: { isEnabled: !subFeature.isEnabled },
    })

    await ctx.answerCallbackQuery(
      subFeature.isEnabled ? '❌ تم تعطيل الوظيفة' : '✅ تم تفعيل الوظيفة',
    )

    // Refresh menu
    const updatedSubFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { code: subFeatureCode },
    })

    if (!updatedSubFeature)
      return

    const featureName = getSubFeatureName(subFeatureCode)

    const keyboard = new InlineKeyboard()
      .text('🔐 تحديد الحد الأدنى من الصلاحية', `hr:section:sf-role:${subFeatureCode}`)
      .row()
      .text(
        updatedSubFeature.isEnabled ? '❌ تعطيل الوظيفة' : '✅ تفعيل الوظيفة',
        `hr:section:sf-toggle:${subFeatureCode}`,
      )
      .row()
      .text('⬅️ رجوع', 'hr:section:manage-subfeatures')

    const currentRole = updatedSubFeature.superAdminOnly
      ? 'المدير الأعلى فقط'
      : (updatedSubFeature.minRole ? getRoleName(updatedSubFeature.minRole as any) : 'يرث من القسم')

    await ctx.editMessageText(
      `⚙️ **إدارة: ${featureName}**\n\n`
      + `📊 **الحالة الحالية:**\n`
      + `• التفعيل: ${updatedSubFeature.isEnabled ? '✅ مفعلة' : '❌ معطلة'}\n`
      + `• الحد الأدنى: ${currentRole}\n\n`
      + '📌 اختر الإجراء:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error toggling sub-feature:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// Manage admins (placeholder for now)
sectionPermissionsHandler.callbackQuery('hr:section:manage-admins', async (ctx) => {
  await ctx.answerCallbackQuery('⚠️ هذه الميزة قيد التطوير')
})

/**
 * Helper functions
 */

function getSubFeatureName(code: string): string {
  const names: Record<string, string> = {
    'hr:employees-list': 'قوائم العاملين',
    'hr:advances': 'السلف والمسحوبات',
    'hr:leaves': 'الإجازات والماموريات',
    'hr:payroll': 'الرواتب والأجور',
    'hr:custom-reports': 'التقارير المخصصة',
    'hr:section-management': 'إدارة القسم',
  }
  return names[code] || code
}

function getRoleName(role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST'): string {
  const names: Record<string, string> = {
    SUPER_ADMIN: 'المدير الأعلى',
    ADMIN: 'مدير',
    MODERATOR: 'مشرف',
    USER: 'مستخدم',
    GUEST: 'زائر',
  }
  return names[role] || role
}
