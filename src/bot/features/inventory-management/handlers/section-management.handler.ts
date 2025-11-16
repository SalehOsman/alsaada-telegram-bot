/**
 * Section Management Handler - Inventory Management
 * نسخة كاملة من قسم شئون العاملين لإدارة قسم المخازن
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const inventorySectionManagementHandler = new Composer<Context>()

const ROLES = {
  SUPER_ADMIN: { value: 'SUPER_ADMIN', label: '🔴 سوبر أدمن' },
  ADMIN: { value: 'ADMIN', label: '🟢 أدمن' },
  MODERATOR: { value: 'MODERATOR', label: '🟡 مشرف' },
  USER: { value: 'USER', label: '🔵 مستخدم' },
  GUEST: { value: 'GUEST', label: '⚪ ضيف' },
}

// ════════════════════════════════════════════════════════
// القائمة الرئيسية - إدارة قسم المخازن
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery(/^menu:sub:inventory-management:inv:section-management$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.editMessageText('⛔ هذه الوظيفة متاحة فقط للسوبر أدمن', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:feature:inventory-management'),
    })
    return
  }

  const keyboard = new InlineKeyboard()
    .text('🔐 إدارة الصلاحيات', 'inv:section:permissions')
    .row()
    .text('👥 إدارة المسؤولين', 'inv:section:admins')
    .row()
    .text('⚡ التحكم والإعدادات', 'inv:section:control')
    .row()
    .text('⬅️ رجوع', 'menu:feature:inventory-management')

  await ctx.editMessageText(
    '⚙️ **إدارة قسم المخازن**\n\n'
    + '📋 **اختر القسم المطلوب:**\n\n'
    + '🔐 **إدارة الصلاحيات**\n'
    + '└ تحديد الحد الأدنى للرتبة المطلوبة\n\n'
    + '👥 **إدارة المسؤولين**\n'
    + '└ تعيين/إزالة مسؤولي القسم والوظائف\n\n'
    + '⚡ **التحكم والإعدادات**\n'
    + '└ تشغيل/إيقاف وعرض الإحصائيات',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// القسم 1: إدارة الصلاحيات
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:section:permissions', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'inv:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'inv:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'inv:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:inv:section-management')

  await ctx.editMessageText(
    '🔐 **إدارة الصلاحيات**\n\n'
    + '📌 **الحد الأدنى للرتبة (minRole)**:\n'
    + 'تحديد أقل رتبة يمكنها الوصول للقسم أو الوظيفة\n\n'
    + '⚠️ **ملاحظة**:\n'
    + '• المسؤولون المعينون يرون كل شيء بغض النظر عن الرتبة\n'
    + '• السوبر أدمن يرى كل شيء دائماً\n'
    + '• الضيف (GUEST) لا يرى أي شيء',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// القسم 2: إدارة المسؤولين
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:section:admins', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('👥 مسؤولو القسم', 'inv:admins:dept:list')
    .row()
    .text('➕ إضافة مسؤول قسم', 'inv:admins:dept:add')
    .row()
    .text('⚙️ مسؤولو الوظائف', 'inv:admins:sf:list')
    .row()
    .text('➕ إضافة مسؤول وظيفة', 'inv:admins:sf:add')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:inv:section-management')

  await ctx.editMessageText(
    '👥 **إدارة المسؤولين**\n\n'
    + '📌 **مسؤول القسم**: يرى جميع الوظائف (ما عدا السوبر أدمن فقط)\n'
    + '📌 **مسؤول الوظيفة**: يرى وظيفة محددة فقط',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// القسم 3: التحكم والإعدادات
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:section:control', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  const isEnabled = dept?.isEnabled ?? true

  const keyboard = new InlineKeyboard()
    .text(
      isEnabled ? '🔴 إيقاف القسم' : '🟢 تشغيل القسم',
      'inv:control:toggle',
    )
    .row()
    .text('📊 الإحصائيات', 'inv:control:stats')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:inv:section-management')

  await ctx.editMessageText(
    '⚙️ **التحكم والإعدادات**\n\n'
    + `الحالة الحالية: ${isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض الإحصائيات
inventorySectionManagementHandler.callbackQuery('inv:control:stats', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const deptAdmins = await Database.prisma.departmentAdmin.count({
    where: { departmentId: dept.id, isActive: true },
  })

  const subFeatures = await Database.prisma.subFeatureConfig.count({
    where: { departmentCode: 'inventory-management', isEnabled: true },
  })

  const sfAdmins = await Database.prisma.subFeatureAdmin.count({
    where: {
      isActive: true,
      subFeature: { departmentCode: 'inventory-management' },
    },
  })

  const message = '📊 **إحصائيات القسم**\n\n'
    + `👥 مسؤولو القسم: **${deptAdmins}**\n`
    + `⚙️ الوظائف الفرعية: **${subFeatures}**\n`
    + `👤 مسؤولو الوظائف: **${sfAdmins}**\n`
    + `🔐 الحد الأدنى للرتبة: **${ROLES[(dept.minRole || 'ADMIN') as keyof typeof ROLES]?.label}**\n`
    + `📌 الحالة: ${dept.isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}`

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard()
      .text('⬅️ رجوع', 'inv:section:control'),
    parse_mode: 'Markdown',
  })
})

// ════════════════════════════════════════════════════════
// تحديد صلاحية القسم (minRole)
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:perm:set-dept-role', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  const currentRole = dept?.minRole || 'ADMIN'

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, 'inv:perm:dept:SUPER_ADMIN')
    .row()
    .text(ROLES.ADMIN.label, 'inv:perm:dept:ADMIN')
    .text(ROLES.MODERATOR.label, 'inv:perm:dept:MODERATOR')
    .row()
    .text(ROLES.USER.label, 'inv:perm:dept:USER')
    .row()
    .text('⬅️ رجوع', 'inv:section:permissions')

  await ctx.editMessageText(
    '🔐 **تحديد صلاحية القسم**\n\n'
    + `الصلاحية الحالية: **${ROLES[currentRole as keyof typeof ROLES]?.label}**\n\n`
    + '📌 اختر الحد الأدنى للرتبة المطلوبة:\n'
    + '• من يملك هذه الرتبة أو أعلى يمكنه الوصول\n'
    + '• السوبر أدمن يرى كل شيء دائماً',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تطبيق تغيير صلاحية القسم
inventorySectionManagementHandler.callbackQuery(/^inv:perm:dept:(.+)$/, async (ctx) => {
  const role = ctx.match![1] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'
  await ctx.answerCallbackQuery()

  await Database.prisma.departmentConfig.update({
    where: { code: 'inventory-management' },
    data: { minRole: role },
  })

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية القسم إلى: ${ROLES[role].label}`,
    show_alert: true,
  })

  // العودة لقائمة الصلاحيات
  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'inv:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'inv:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'inv:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:inv:section-management')

  await ctx.editMessageText(
    '🔐 **إدارة الصلاحيات**\n\n'
    + '📌 **الحد الأدنى للرتبة (minRole)**:\n'
    + 'تحديد أقل رتبة يمكنها الوصول للقسم أو الوظيفة\n\n'
    + '⚠️ **ملاحظة**:\n'
    + '• المسؤولون المعينون يرون كل شيء بغض النظر عن الرتبة\n'
    + '• السوبر أدمن يرى كل شيء دائماً\n'
    + '• الضيف (GUEST) لا يرى أي شيء',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// تحديد صلاحيات الوظائف
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:perm:set-subfeatures', async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { id: true, code: true, name: true, minRole: true },
  })

  if (subFeatures.length === 0) {
    await ctx.editMessageText('❌ لا توجد وظائف فرعية في هذا القسم', {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'inv:section:permissions'),
    })
    return
  }

  const keyboard = new InlineKeyboard()
  for (const sf of subFeatures) {
    keyboard.text(
      `⚙️ ${sf.name}`,
      `inv:perm:sf:${sf.code}`,
    ).row()
  }
  keyboard.text('⬅️ رجوع', 'inv:section:permissions')

  await ctx.editMessageText(
    '⚙️ **تحديد صلاحيات الوظائف**\n\n'
    + '📌 اختر الوظيفة لتعديل صلاحيتها:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض خيارات صلاحية وظيفة محددة
inventorySectionManagementHandler.callbackQuery(/^inv:perm:sf:(.+)$/, async (ctx) => {
  const sfCode = ctx.match![1]
  await ctx.answerCallbackQuery()

  const subFeature = await Database.prisma.subFeatureConfig.findFirst({
    where: { code: sfCode, departmentCode: 'inventory-management' },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const currentRole = subFeature.minRole || 'ADMIN'

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, `inv:perm:sf-set:${sfCode}:SUPER_ADMIN`)
    .row()
    .text(ROLES.ADMIN.label, `inv:perm:sf-set:${sfCode}:ADMIN`)
    .text(ROLES.MODERATOR.label, `inv:perm:sf-set:${sfCode}:MODERATOR`)
    .row()
    .text(ROLES.USER.label, `inv:perm:sf-set:${sfCode}:USER`)
    .row()
    .text('⬅️ رجوع', 'inv:perm:set-subfeatures')

  await ctx.editMessageText(
    `⚙️ **${subFeature.name}**\n\n`
    + `الصلاحية الحالية: **${ROLES[currentRole as keyof typeof ROLES]?.label}**\n\n`
    + '📌 اختر الحد الأدنى للرتبة المطلوبة:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تطبيق تغيير صلاحية وظيفة
inventorySectionManagementHandler.callbackQuery(/^inv:perm:sf-set:(.+):([A-Z_]+)$/, async (ctx) => {
  const sfCode = ctx.match![1]
  const role = ctx.match![2] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'

  await ctx.answerCallbackQuery()

  await Database.prisma.subFeatureConfig.updateMany({
    where: { code: sfCode, departmentCode: 'inventory-management' },
    data: {
      minRole: role,
      superAdminOnly: role === 'SUPER_ADMIN',
    },
  })

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية الوظيفة إلى: ${ROLES[role].label}`,
    show_alert: true,
  })

  // العودة لقائمة الوظائف
  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { id: true, code: true, name: true, minRole: true },
  })

  const keyboard = new InlineKeyboard()
  for (const sf of subFeatures) {
    keyboard.text(
      `⚙️ ${sf.name}`,
      `inv:perm:sf:${sf.code}`,
    ).row()
  }
  keyboard.text('⬅️ رجوع', 'inv:section:permissions')

  await ctx.editMessageText(
    '⚙️ **تحديد صلاحيات الوظائف**\n\n'
    + '📌 اختر الوظيفة لتعديل صلاحيتها:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// عرض جميع الصلاحيات
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:perm:view-all', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { name: true, minRole: true },
  })

  let message = '📊 **الصلاحيات الحالية**\n\n'
  message += `🏢 **القسم**: ${ROLES[(dept?.minRole || 'ADMIN') as keyof typeof ROLES]?.label}\n\n`
  message += '**الوظائف الفرعية:**\n'

  for (const sf of subFeatures) {
    message += `• ${sf.name}: ${ROLES[(sf.minRole || 'ADMIN') as keyof typeof ROLES]?.label}\n`
  }

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard()
      .text('⬅️ رجوع', 'inv:section:permissions'),
    parse_mode: 'Markdown',
  })
})

// ════════════════════════════════════════════════════════
// إيقاف/تشغيل القسم
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:control:toggle', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  const newStatus = !dept.isEnabled

  await Database.prisma.departmentConfig.update({
    where: { code: 'inventory-management' },
    data: { isEnabled: newStatus },
  })

  await ctx.answerCallbackQuery({
    text: newStatus ? '✅ تم تشغيل القسم' : '⚠️ تم إيقاف القسم',
    show_alert: true,
  })

  // تحديث القائمة
  const keyboard = new InlineKeyboard()
    .text(
      newStatus ? '🔴 إيقاف القسم' : '🟢 تشغيل القسم',
      'inv:control:toggle',
    )
    .row()
    .text('📊 الإحصائيات', 'inv:control:stats')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:inv:section-management')

  await ctx.editMessageText(
    '⚙️ **التحكم والإعدادات**\n\n'
    + `الحالة الحالية: ${newStatus ? '🟢 مفعّل' : '🔴 معطّل'}`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// إدارة مسؤولي القسم
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:admins:dept:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const adminsData = await Database.prisma.departmentAdmin.findMany({
    where: { departmentId: dept.id, isActive: true },
  })

  const keyboard = new InlineKeyboard()

  if (adminsData.length === 0) {
    await ctx.editMessageText(
      '👥 **مسؤولو القسم**\n\n'
      + '❌ لا يوجد مسؤولون معينون حالياً',
      {
        reply_markup: keyboard.text('⬅️ رجوع', 'inv:section:admins'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  // إنشاء زر لكل مسؤول
  for (const admin of adminsData) {
    const user = await Database.prisma.user.findUnique({
      where: { id: admin.userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      },
    })

    if (user) {
      const displayName = user.fullName || user.username || 'غير معروف'
      const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
      keyboard
        .text(`${displayName} - ${roleLabel}`, `inv:admins:dept:view:${user.id}`)
        .row()
    }
  }

  keyboard.text('⬅️ رجوع', 'inv:section:admins')

  await ctx.editMessageText(
    '👥 **مسؤولو القسم**\n\n'
    + `📊 العدد الإجمالي: ${adminsData.length}\n\n`
    + '👇 اختر مسؤولاً لعرض التفاصيل:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض تفاصيل مسؤول القسم
inventorySectionManagementHandler.callbackQuery(/^inv:admins:dept:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = Number.parseInt(ctx.match![1], 10)

  const admin = await Database.prisma.departmentAdmin.findFirst({
    where: {
      userId,
      department: { code: 'inventory-management' },
      isActive: true,
    },
  })

  if (!admin) {
    await ctx.answerCallbackQuery({ text: '❌ المسؤول غير موجود', show_alert: true })
    return
  }

  const user = await Database.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      nickname: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      isBanned: true,
      department: true,
      position: true,
      createdAt: true,
    },
  })

  if (!user) {
    await ctx.answerCallbackQuery({ text: '❌ المستخدم غير موجود', show_alert: true })
    return
  }

  // جلب جميع الأقسام المُعين عليها كمسؤول
  const allDeptAdmins = await Database.prisma.departmentAdmin.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      department: true,
    },
  })

  // جلب جميع الوظائف المُعين عليها كمسؤول
  const allSubFeatureAdmins = await Database.prisma.subFeatureAdmin.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      subFeature: true,
    },
  })

  const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role

  let message = '👤 **معلومات المسؤول**\n\n'
  message += `**الاسم الكامل:** ${user.fullName || 'غير متوفر'}\n`
  message += `**اسم الشهرة:** ${user.nickname || 'غير متوفر'}\n`
  message += `**اسم المستخدم:** ${user.username ? `@${user.username}` : 'غير متوفر'}\n`
  message += `**رقم الهاتف:** ${user.phone || 'غير متوفر'}\n`
  message += `**البريد الإلكتروني:** ${user.email || 'غير متوفر'}\n`
  message += `**Telegram ID:** \`${user.telegramId}\`\n`
  message += `**User ID:** ${user.id}\n\n`
  message += `**الرتبة:** ${roleLabel}\n`
  message += `**الحالة:** ${user.isActive ? '🟢 نشط' : '🔴 غير نشط'}\n`
  message += `**محظور:** ${user.isBanned ? '🚫 نعم' : '✅ لا'}\n`
  message += `**تاريخ التسجيل:** ${user.createdAt.toLocaleDateString('ar-EG')}\n\n`

  // عرض الأقسام المُعين عليها
  message += '📋 **الأقسام المسؤول عنها:**\n'
  if (allDeptAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي قسم\n'
  }
  else {
    for (const deptAdmin of allDeptAdmins) {
      message += `  • ${deptAdmin.department.name} (منذ ${deptAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  // عرض الوظائف المُعين عليها
  message += '\n⚙️ **الوظائف المسؤول عنها:**\n'
  if (allSubFeatureAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي وظيفة\n'
  }
  else {
    for (const sfAdmin of allSubFeatureAdmins) {
      message += `  • ${sfAdmin.subFeature.name} (منذ ${sfAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  const keyboard = new InlineKeyboard()
    .text('🗑️ إزالة من القسم', `inv:admins:dept:remove:${userId}`)
    .row()
    .text('⬅️ رجوع', 'inv:admins:dept:list')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// إزالة مسؤول القسم
inventorySectionManagementHandler.callbackQuery(/^inv:admins:dept:remove:(\d+)$/, async (ctx) => {
  const userId = Number.parseInt(ctx.match![1], 10)

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  const deleted = await Database.prisma.departmentAdmin.updateMany({
    where: {
      userId,
      departmentId: dept.id,
    },
    data: { isActive: false },
  })

  if (deleted.count > 0) {
    const subFeatures = await Database.prisma.subFeatureConfig.findMany({
      where: { departmentCode: dept.code },
      select: { id: true },
    })

    const subFeatureIds = subFeatures.map(sf => sf.id)

    const removedSubFeatures = await Database.prisma.subFeatureAdmin.updateMany({
      where: {
        userId,
        subFeatureId: { in: subFeatureIds },
        isActive: true,
      },
      data: { isActive: false },
    })

    await ctx.answerCallbackQuery({
      text: `✅ تم إزالة المسؤول من القسم و ${removedSubFeatures.count} وظيفة`,
      show_alert: true,
    })

    // العودة للقائمة
    const updatedAdmins = await Database.prisma.departmentAdmin.findMany({
      where: { departmentId: dept.id, isActive: true },
    })

    const keyboard = new InlineKeyboard()

    if (updatedAdmins.length === 0) {
      await ctx.editMessageText(
        '👥 **مسؤولو القسم**\n\n'
        + '❌ لا يوجد مسؤولون معينون حالياً',
        {
          reply_markup: keyboard.text('⬅️ رجوع', 'inv:section:admins'),
          parse_mode: 'Markdown',
        },
      )
    }
    else {
      for (const admin of updatedAdmins) {
        const user = await Database.prisma.user.findUnique({
          where: { id: admin.userId },
          select: { id: true, fullName: true, username: true, role: true },
        })
        if (user) {
          const displayName = user.fullName || user.username || 'غير معروف'
          const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
          keyboard.text(`${displayName} - ${roleLabel}`, `inv:admins:dept:view:${user.id}`).row()
        }
      }
      keyboard.text('⬅️ رجوع', 'inv:section:admins')

      await ctx.editMessageText(
        '👥 **مسؤولو القسم**\n\n'
        + `📊 العدد الإجمالي: ${updatedAdmins.length}\n\n`
        + '👇 اختر مسؤولاً لعرض التفاصيل:',
        {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        },
      )
    }
  }
  else {
    await ctx.answerCallbackQuery({
      text: '❌ فشل في إزالة المسؤول',
      show_alert: true,
    })
  }
})

// إضافة مسؤول قسم - الخطوة 1
inventorySectionManagementHandler.callbackQuery('inv:admins:dept:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const deptMinLevel = roleHierarchy[dept.minRole as keyof typeof roleHierarchy] || 0

  const currentAdmins = await Database.prisma.departmentAdmin.findMany({
    where: {
      departmentId: dept.id,
      isActive: true,
    },
    select: { userId: true },
  })
  const currentAdminIds = currentAdmins.map(a => a.userId)

  const eligibleUsers = await Database.prisma.user.findMany({
    where: {
      isActive: true,
      isBanned: false,
      id: { notIn: currentAdminIds },
      OR: deptMinLevel <= 2
        ? [
            { role: 'SUPER_ADMIN' },
            { role: 'ADMIN' },
            { role: 'MODERATOR' },
            { role: 'USER' },
          ]
        : [
            { role: 'SUPER_ADMIN' },
            { role: 'ADMIN' },
          ],
    },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
    },
    orderBy: [
      { role: 'desc' },
      { fullName: 'asc' },
    ],
    take: 20,
  })

  if (eligibleUsers.length === 0) {
    await ctx.editMessageText(
      '➕ **إضافة مسؤول قسم**\n\n'
      + '❌ لا يوجد مستخدمون مؤهلون للتعيين\n\n'
      + '**الشروط:**\n'
      + `• الرتبة >= ${ROLES[dept.minRole as keyof typeof ROLES]?.label}\n`
      + '• نشط وغير محظور\n'
      + '• غير مُعين بالفعل',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:section:admins'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const user of eligibleUsers) {
    const displayName = user.fullName || user.username || `ID: ${user.telegramId}`
    const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
    keyboard
      .text(`${displayName} - ${roleLabel}`, `inv:admins:dept:confirm:${user.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', 'inv:section:admins')

  await ctx.editMessageText(
    '➕ **إضافة مسؤول قسم**\n\n'
    + `📋 القسم: ${dept.name}\n`
    + `📊 الحد الأدنى: ${ROLES[dept.minRole as keyof typeof ROLES]?.label}\n\n`
    + `👥 المستخدمون المؤهلون (${eligibleUsers.length}):\n`
    + '👇 اختر المستخدم المراد تعيينه:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إضافة مسؤول قسم - الخطوة 2: تأكيد
inventorySectionManagementHandler.callbackQuery(/^inv:admins:dept:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = Number.parseInt(ctx.match![1], 10)

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const user = await Database.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user || !user.isActive || user.isBanned) {
    await ctx.answerCallbackQuery({ text: '❌ المستخدم غير صالح', show_alert: true })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  const existing = await Database.prisma.departmentAdmin.findFirst({
    where: {
      userId: user.id,
      departmentId: dept.id,
    },
  })

  if (existing) {
    if (existing.isActive) {
      await ctx.answerCallbackQuery({ text: '⚠️ المستخدم مُعين بالفعل', show_alert: true })
      return
    }
    else {
      await Database.prisma.departmentAdmin.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          assignedAt: new Date(),
          assignedBy: BigInt(ctx.from!.id),
        },
      })
    }
  }
  else {
    await Database.prisma.departmentAdmin.create({
      data: {
        userId: user.id,
        telegramId: user.telegramId,
        departmentId: dept.id,
        assignedBy: BigInt(ctx.from!.id),
        isActive: true,
        assignedAt: new Date(),
      },
    })
  }

  // التعيين التلقائي على الوظائف الفرعية
  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: {
      departmentCode: dept.code,
      NOT: { minRole: 'SUPER_ADMIN' },
    },
  })

  let assignedSubFeatures = 0
  for (const sf of subFeatures) {
    const existingSF = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        userId: user.id,
        subFeatureId: sf.id,
      },
    })

    if (existingSF) {
      if (!existingSF.isActive) {
        await Database.prisma.subFeatureAdmin.update({
          where: { id: existingSF.id },
          data: {
            isActive: true,
            assignedAt: new Date(),
            assignedBy: BigInt(ctx.from!.id),
          },
        })
        assignedSubFeatures++
      }
    }
    else {
      await Database.prisma.subFeatureAdmin.create({
        data: {
          userId: user.id,
          telegramId: user.telegramId,
          subFeatureId: sf.id,
          assignedBy: BigInt(ctx.from!.id),
          isActive: true,
          assignedAt: new Date(),
        },
      })
      assignedSubFeatures++
    }
  }

  const displayName = user.fullName || user.username || 'غير معروف'

  await ctx.editMessageText(
    '✅ **تم التعيين بنجاح**\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `🏢 القسم: ${dept.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}\n\n`
    + `📊 تم تعيينه تلقائياً على ${assignedSubFeatures} وظيفة فرعية`,
    {
      reply_markup: new InlineKeyboard()
        .text('👥 عرض المسؤولين', 'inv:admins:dept:list')
        .row()
        .text('⬅️ رجوع', 'inv:section:admins'),
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// إدارة مسؤولي الوظائف الفرعية
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery('inv:admins:sf:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: dept.code },
    orderBy: { name: 'asc' },
  })

  if (subFeatures.length === 0) {
    await ctx.editMessageText(
      '⚙️ **مسؤولو الوظائف**\n\n'
      + '❌ لا توجد وظائف فرعية معرفة',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:section:admins'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const sf of subFeatures) {
    const adminsCount = await Database.prisma.subFeatureAdmin.count({
      where: {
        subFeatureId: sf.id,
        isActive: true,
      },
    })

    const statusEmoji = sf.isEnabled ? '✅' : '❌'
    keyboard
      .text(`${statusEmoji} ${sf.name} (${adminsCount})`, `inv:admins:sf:view:${sf.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', 'inv:section:admins')

  await ctx.editMessageText(
    '⚙️ **مسؤولو الوظائف**\n\n'
    + `📋 القسم: ${dept.name}\n`
    + `📊 عدد الوظائف: ${subFeatures.length}\n\n`
    + '👇 اختر وظيفة لعرض المسؤولين:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض تفاصيل الوظيفة الفرعية والمسؤولين
inventorySectionManagementHandler.callbackQuery(/^inv:admins:sf:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const adminsData = await Database.prisma.subFeatureAdmin.findMany({
    where: {
      subFeatureId,
      isActive: true,
    },
  })

  let message = '⚙️ **تفاصيل الوظيفة**\n\n'
  message += `**الاسم:** ${subFeature.name}\n`
  message += `**الحالة:** ${subFeature.isEnabled ? '✅ مفعلة' : '❌ معطلة'}\n`
  message += `**الحد الأدنى:** ${ROLES[subFeature.minRole as keyof typeof ROLES]?.label}\n`
  message += `**Super Admin فقط:** ${subFeature.superAdminOnly ? '🔒 نعم' : '🔓 لا'}\n\n`

  message += `👥 **المسؤولون (${adminsData.length}):**\n`

  if (adminsData.length === 0) {
    message += '  ❌ لا يوجد مسؤولون\n'
  }
  else {
    for (const admin of adminsData) {
      const user = await Database.prisma.user.findUnique({
        where: { id: admin.userId },
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      })

      if (user) {
        const displayName = user.fullName || user.username || 'غير معروف'
        const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
        message += `  • ${displayName} - ${roleLabel}\n`
      }
    }
  }

  const keyboard = new InlineKeyboard()
    .text('➕ إضافة مسؤول', `inv:admins:sf:add:${subFeatureId}`)
    .row()

  if (adminsData.length > 0) {
    keyboard.text('🗑️ إزالة مسؤول', `inv:admins:sf:remove:${subFeatureId}`).row()
  }

  keyboard.text('⬅️ رجوع', 'inv:admins:sf:list')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// إضافة مسؤول للوظيفة - الخطوة 1
inventorySectionManagementHandler.callbackQuery(/^inv:admins:sf:add:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const subFeatureId = Number.parseInt(ctx.match![1], 10)

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const sfMinLevel = roleHierarchy[subFeature.minRole as keyof typeof roleHierarchy] || 0

  const currentAdmins = await Database.prisma.subFeatureAdmin.findMany({
    where: {
      subFeatureId,
      isActive: true,
    },
    select: { userId: true },
  })
  const currentAdminIds = currentAdmins.map(a => a.userId)

  const eligibleUsers = await Database.prisma.user.findMany({
    where: {
      isActive: true,
      isBanned: false,
      id: { notIn: currentAdminIds },
      OR: sfMinLevel <= 2
        ? [
            { role: 'SUPER_ADMIN' },
            { role: 'ADMIN' },
            { role: 'MODERATOR' },
            { role: 'USER' },
          ]
        : [
            { role: 'SUPER_ADMIN' },
            { role: 'ADMIN' },
          ],
    },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
    },
    orderBy: [
      { role: 'desc' },
      { fullName: 'asc' },
    ],
    take: 20,
  })

  if (eligibleUsers.length === 0) {
    await ctx.editMessageText(
      '➕ **إضافة مسؤول وظيفة**\n\n'
      + `📋 الوظيفة: ${subFeature.name}\n\n`
      + '❌ لا يوجد مستخدمون مؤهلون للتعيين',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', `inv:admins:sf:view:${subFeatureId}`),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()

  for (const user of eligibleUsers) {
    const displayName = user.fullName || user.username || `ID: ${user.telegramId}`
    const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
    keyboard
      .text(`${displayName} - ${roleLabel}`, `inv:admins:sf:confirm:${subFeatureId}:${user.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', `inv:admins:sf:view:${subFeatureId}`)

  await ctx.editMessageText(
    '➕ **إضافة مسؤول وظيفة**\n\n'
    + `📋 الوظيفة: ${subFeature.name}\n`
    + `📊 الحد الأدنى: ${ROLES[subFeature.minRole as keyof typeof ROLES]?.label}\n\n`
    + `👥 المستخدمون المؤهلون (${eligibleUsers.length}):\n`
    + '👇 اختر المستخدم المراد تعيينه:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إضافة مسؤول للوظيفة - الخطوة 2: تأكيد
inventorySectionManagementHandler.callbackQuery(/^inv:admins:sf:confirm:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const userId = Number.parseInt(ctx.match![2], 10)

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const user = await Database.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user || !user.isActive || user.isBanned) {
    await ctx.answerCallbackQuery({ text: '❌ المستخدم غير صالح', show_alert: true })
    return
  }

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const existing = await Database.prisma.subFeatureAdmin.findFirst({
    where: {
      userId: user.id,
      subFeatureId,
    },
  })

  if (existing) {
    if (existing.isActive) {
      await ctx.answerCallbackQuery({ text: '⚠️ المستخدم مُعين بالفعل', show_alert: true })
      return
    }
    else {
      await Database.prisma.subFeatureAdmin.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          assignedAt: new Date(),
          assignedBy: BigInt(ctx.from!.id),
        },
      })
    }
  }
  else {
    await Database.prisma.subFeatureAdmin.create({
      data: {
        userId: user.id,
        telegramId: user.telegramId,
        subFeatureId,
        assignedBy: BigInt(ctx.from!.id),
        isActive: true,
        assignedAt: new Date(),
      },
    })
  }

  const displayName = user.fullName || user.username || 'غير معروف'

  await ctx.editMessageText(
    '✅ **تم التعيين بنجاح**\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `⚙️ الوظيفة: ${subFeature.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}`,
    {
      reply_markup: new InlineKeyboard()
        .text('⚙️ عرض الوظيفة', `inv:admins:sf:view:${subFeatureId}`)
        .row()
        .text('⬅️ رجوع', 'inv:admins:sf:list'),
      parse_mode: 'Markdown',
    },
  )
})

// إزالة مسؤول من الوظيفة - الخطوة 1
inventorySectionManagementHandler.callbackQuery(/^inv:admins:sf:remove:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const subFeatureId = Number.parseInt(ctx.match![1], 10)

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const adminsData = await Database.prisma.subFeatureAdmin.findMany({
    where: {
      subFeatureId,
      isActive: true,
    },
  })

  if (adminsData.length === 0) {
    await ctx.answerCallbackQuery({ text: '❌ لا يوجد مسؤولون', show_alert: true })
    return
  }

  const keyboard = new InlineKeyboard()

  for (const admin of adminsData) {
    const user = await Database.prisma.user.findUnique({
      where: { id: admin.userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      },
    })

    if (user) {
      const displayName = user.fullName || user.username || 'غير معروف'
      const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
      keyboard
        .text(`${displayName} - ${roleLabel}`, `inv:admins:sf:remove:confirm:${subFeatureId}:${user.id}`)
        .row()
    }
  }

  keyboard.text('⬅️ رجوع', `inv:admins:sf:view:${subFeatureId}`)

  await ctx.editMessageText(
    '🗑️ **إزالة مسؤول وظيفة**\n\n'
    + `📋 الوظيفة: ${subFeature.name}\n\n`
    + '👇 اختر المسؤول المراد إزالته:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إزالة مسؤول من الوظيفة - الخطوة 2: تأكيد
inventorySectionManagementHandler.callbackQuery(/^inv:admins:sf:remove:confirm:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const userId = Number.parseInt(ctx.match![2], 10)

  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const deleted = await Database.prisma.subFeatureAdmin.updateMany({
    where: {
      userId,
      subFeatureId,
    },
    data: { isActive: false },
  })

  if (deleted.count > 0) {
    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, username: true },
    })

    const displayName = user?.fullName || user?.username || 'غير معروف'

    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { id: subFeatureId },
    })

    await ctx.editMessageText(
      '✅ **تم الإزالة بنجاح**\n\n'
      + `👤 المستخدم: ${displayName}\n`
      + `⚙️ الوظيفة: ${subFeature?.name}`,
      {
        reply_markup: new InlineKeyboard()
          .text('⚙️ عرض الوظيفة', `inv:admins:sf:view:${subFeatureId}`)
          .row()
          .text('⬅️ رجوع', 'inv:admins:sf:list'),
        parse_mode: 'Markdown',
      },
    )
  }
  else {
    await ctx.answerCallbackQuery({
      text: '❌ فشل في إزالة المسؤول',
      show_alert: true,
    })
  }
})

// ════════════════════════════════════════════════════════
// أوامر Terminal (Commands)
// ════════════════════════════════════════════════════════

// أمر إضافة مسؤول قسم عبر Terminal
inventorySectionManagementHandler.command('add_dept_admin', async (ctx) => {
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.reply('❌ هذا الأمر متاح فقط للسوبر أدمن')
    return
  }

  const args = ctx.message?.text?.split(' ')

  if (!args || args.length < 2) {
    await ctx.reply(
      '**استخدام الأمر:**\n'
      + '`/add_dept_admin <user_id>`\n\n'
      + '**مثال:**\n'
      + '`/add_dept_admin 123`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const userId = Number.parseInt(args[1], 10)

  if (Number.isNaN(userId)) {
    await ctx.reply('❌ User ID غير صالح')
    return
  }

  const user = await Database.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user) {
    await ctx.reply('❌ المستخدم غير موجود')
    return
  }

  if (!user.isActive || user.isBanned) {
    await ctx.reply('❌ المستخدم غير نشط أو محظور')
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const existing = await Database.prisma.departmentAdmin.findFirst({
    where: {
      userId: user.id,
      departmentId: dept.id,
    },
  })

  if (existing && existing.isActive) {
    await ctx.reply('⚠️ المستخدم مُعين بالفعل كمسؤول قسم')
    return
  }

  if (existing && !existing.isActive) {
    await Database.prisma.departmentAdmin.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        assignedAt: new Date(),
        assignedBy: BigInt(ctx.from!.id),
      },
    })
  }
  else {
    await Database.prisma.departmentAdmin.create({
      data: {
        userId: user.id,
        telegramId: user.telegramId,
        departmentId: dept.id,
        assignedBy: BigInt(ctx.from!.id),
        isActive: true,
        assignedAt: new Date(),
      },
    })
  }

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: {
      departmentCode: dept.code,
      NOT: { minRole: 'SUPER_ADMIN' },
    },
  })

  let assignedSubFeatures = 0
  for (const sf of subFeatures) {
    const existingSF = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        userId: user.id,
        subFeatureId: sf.id,
      },
    })

    if (existingSF) {
      if (!existingSF.isActive) {
        await Database.prisma.subFeatureAdmin.update({
          where: { id: existingSF.id },
          data: {
            isActive: true,
            assignedAt: new Date(),
            assignedBy: BigInt(ctx.from!.id),
          },
        })
        assignedSubFeatures++
      }
    }
    else {
      await Database.prisma.subFeatureAdmin.create({
        data: {
          userId: user.id,
          telegramId: user.telegramId,
          subFeatureId: sf.id,
          assignedBy: BigInt(ctx.from!.id),
          isActive: true,
          assignedAt: new Date(),
        },
      })
      assignedSubFeatures++
    }
  }

  const displayName = user.fullName || user.username || 'غير معروف'

  await ctx.reply(
    '✅ **تم التعيين بنجاح**\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `🏢 القسم: ${dept.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}\n\n`
    + `📊 تم تعيينه تلقائياً على ${assignedSubFeatures} وظيفة فرعية`,
    { parse_mode: 'Markdown' },
  )
})

// أمر إضافة مسؤول وظيفة عبر Terminal
inventorySectionManagementHandler.command('add_sf_admin', async (ctx) => {
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.reply('❌ هذا الأمر متاح فقط للسوبر أدمن')
    return
  }

  const args = ctx.message?.text?.split(' ')

  if (!args || args.length < 3) {
    await ctx.reply(
      '**استخدام الأمر:**\n'
      + '`/add_sf_admin <subfeature_id> <user_id>`\n\n'
      + '**مثال:**\n'
      + '`/add_sf_admin 5 123`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const subFeatureId = Number.parseInt(args[1], 10)
  const userId = Number.parseInt(args[2], 10)

  if (Number.isNaN(subFeatureId) || Number.isNaN(userId)) {
    await ctx.reply('❌ القيم المُدخلة غير صالحة')
    return
  }

  const user = await Database.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user || !user.isActive || user.isBanned) {
    await ctx.reply('❌ المستخدم غير صالح أو غير نشط')
    return
  }

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.reply('❌ الوظيفة الفرعية غير موجودة')
    return
  }

  const existing = await Database.prisma.subFeatureAdmin.findFirst({
    where: {
      userId: user.id,
      subFeatureId,
    },
  })

  if (existing && existing.isActive) {
    await ctx.reply('⚠️ المستخدم مُعين بالفعل على هذه الوظيفة')
    return
  }

  if (existing && !existing.isActive) {
    await Database.prisma.subFeatureAdmin.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        assignedAt: new Date(),
        assignedBy: BigInt(ctx.from!.id),
      },
    })
  }
  else {
    await Database.prisma.subFeatureAdmin.create({
      data: {
        userId: user.id,
        telegramId: user.telegramId,
        subFeatureId,
        assignedBy: BigInt(ctx.from!.id),
        isActive: true,
        assignedAt: new Date(),
      },
    })
  }

  const displayName = user.fullName || user.username || 'غير معروف'

  await ctx.reply(
    '✅ **تم التعيين بنجاح**\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `⚙️ الوظيفة: ${subFeature.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}`,
    { parse_mode: 'Markdown' },
  )
})

export default inventorySectionManagementHandler
