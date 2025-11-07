/**
 * Section Management Handler - Rebuilt
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const sectionManagementHandler = new Composer<Context>()

const ROLES = {
  SUPER_ADMIN: { value: 'SUPER_ADMIN', label: '🔴 سوبر أدمن' },
  ADMIN: { value: 'ADMIN', label: '🟢 أدمن' },
  MODERATOR: { value: 'MODERATOR', label: '🟡 مشرف' },
  USER: { value: 'USER', label: '🔵 مستخدم' },
  GUEST: { value: 'GUEST', label: '⚪ ضيف' },
}

// القائمة الرئيسية
sectionManagementHandler.callbackQuery(/^menu:sub:hr-management:section-management$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.editMessageText(' هذه الوظيفة متاحة فقط للسوبر أدمن', {
      reply_markup: new InlineKeyboard().text(' رجوع', 'menu:feature:hr-management'),
    })
    return
  }

  const keyboard = new InlineKeyboard()
    .text('🚨 إدارة عقوبات التأخير', 'penalties:main')
    .row()
    .text('🔄 إدارة دورة العمل والإجازات', 'hr:work_leave_cycle:main')
    .row()
    .text(' إدارة الصلاحيات', 'hr:section:permissions')
    .row()
    .text(' إدارة المسؤولين', 'hr:section:admins')
    .row()
    .text(' التحكم والإعدادات', 'hr:section:control')
    .row()
    .text(' رجوع', 'menu:feature:hr-management')

  await ctx.editMessageText(
    '⚙️ **إدارة قسم شئون العاملين**\n\n'
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
sectionManagementHandler.callbackQuery('hr:section:permissions', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'hr:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'hr:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'hr:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

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

// القسم 2: إدارة المسؤولين
sectionManagementHandler.callbackQuery('hr:section:admins', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('👥 مسؤولو القسم', 'hr:admins:dept:list')
    .row()
    .text('➕ إضافة مسؤول قسم', 'hr:admins:dept:add')
    .row()
    .text('⚙️ مسؤولو الوظائف', 'hr:admins:sf:list')
    .row()
    .text('➕ إضافة مسؤول وظيفة', 'hr:admins:sf:add')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

  await ctx.editMessageText(
    '👥 *إدارة المسؤولين*\n\n'
    + '📌 *مسؤول القسم*: يرى جميع الوظائف (ما عدا السوبر أدمن فقط)\n'
    + '📌 *مسؤول الوظيفة*: يرى وظيفة محددة فقط',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// القسم 3: التحكم والإعدادات
sectionManagementHandler.callbackQuery('hr:section:control', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  const isEnabled = dept?.isEnabled ?? true

  const keyboard = new InlineKeyboard()
    .text(
      isEnabled ? '🔴 إيقاف القسم' : '🟢 تشغيل القسم',
      'hr:control:toggle',
    )
    .row()
    .text('📊 الإحصائيات', 'hr:control:stats')
    .row()
    .text('🔔 إعدادات الإشعارات', 'hr:control:notifications')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

  await ctx.editMessageText(
    '⚙️ **التحكم والإعدادات**\n\n'
    + `الحالة الحالية: ${isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}\n\n`
    + '🔔 **إعدادات الإشعارات**: تحديد مواعيد وإعدادات إشعارات الإجازات',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض الإحصائيات
sectionManagementHandler.callbackQuery('hr:control:stats', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const deptAdmins = await Database.prisma.departmentAdmin.count({
    where: { departmentId: dept.id, isActive: true },
  })

  const subFeatures = await Database.prisma.subFeatureConfig.count({
    where: { departmentCode: 'hr-management', isEnabled: true },
  })

  const sfAdmins = await Database.prisma.subFeatureAdmin.count({
    where: {
      isActive: true,
      subFeature: { departmentCode: 'hr-management' },
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
      .text('⬅️ رجوع', 'hr:section:control'),
    parse_mode: 'Markdown',
  })
})

// ════════════════════════════════════════════════════════
// تحديد صلاحية القسم (minRole)
// ════════════════════════════════════════════════════════
sectionManagementHandler.callbackQuery('hr:perm:set-dept-role', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  const currentRole = dept?.minRole || 'ADMIN'

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, 'hr:perm:dept:SUPER_ADMIN')
    .row()
    .text(ROLES.ADMIN.label, 'hr:perm:dept:ADMIN')
    .text(ROLES.MODERATOR.label, 'hr:perm:dept:MODERATOR')
    .row()
    .text(ROLES.USER.label, 'hr:perm:dept:USER')
    .row()
    .text('⬅️ رجوع', 'hr:section:permissions')

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
sectionManagementHandler.callbackQuery(/^hr:perm:dept:(.+)$/, async (ctx) => {
  const role = ctx.match![1] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'
  await ctx.answerCallbackQuery()

  await Database.prisma.departmentConfig.update({
    where: { code: 'hr-management' },
    data: { minRole: role },
  })

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية القسم إلى: ${ROLES[role].label}`,
    show_alert: true,
  })

  // العودة لقائمة الصلاحيات
  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'hr:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'hr:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'hr:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

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
sectionManagementHandler.callbackQuery('hr:perm:set-subfeatures', async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'hr-management' },
    select: { id: true, code: true, name: true, minRole: true },
  })

  if (subFeatures.length === 0) {
    await ctx.editMessageText('❌ لا توجد وظائف فرعية في هذا القسم', {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:section:permissions'),
    })
    return
  }

  const keyboard = new InlineKeyboard()
  for (const sf of subFeatures) {
    keyboard.text(
      `⚙️ ${sf.name}`,
      `hr:perm:sf:${sf.code}`,
    ).row()
  }
  keyboard.text('⬅️ رجوع', 'hr:section:permissions')

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
sectionManagementHandler.callbackQuery(/^hr:perm:sf:(.+)$/, async (ctx) => {
  const sfCode = ctx.match![1]
  await ctx.answerCallbackQuery()

  const subFeature = await Database.prisma.subFeatureConfig.findFirst({
    where: { code: sfCode, departmentCode: 'hr-management' },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const currentRole = subFeature.minRole || 'ADMIN'

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, `hr:perm:sf-set:${sfCode}:SUPER_ADMIN`)
    .row()
    .text(ROLES.ADMIN.label, `hr:perm:sf-set:${sfCode}:ADMIN`)
    .text(ROLES.MODERATOR.label, `hr:perm:sf-set:${sfCode}:MODERATOR`)
    .row()
    .text(ROLES.USER.label, `hr:perm:sf-set:${sfCode}:USER`)
    .row()
    .text('⬅️ رجوع', 'hr:perm:set-subfeatures')

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
sectionManagementHandler.callbackQuery(/^hr:perm:sf-set:(.+):([A-Z_]+)$/, async (ctx) => {
  const sfCode = ctx.match![1] // "hr:employees-list"
  const role = ctx.match![2] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'

  await ctx.answerCallbackQuery()

  await Database.prisma.subFeatureConfig.updateMany({
    where: { code: sfCode, departmentCode: 'hr-management' },
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
    where: { departmentCode: 'hr-management' },
    select: { id: true, code: true, name: true, minRole: true },
  })

  const keyboard = new InlineKeyboard()
  for (const sf of subFeatures) {
    keyboard.text(
      `⚙️ ${sf.name}`,
      `hr:perm:sf:${sf.code}`,
    ).row()
  }
  keyboard.text('⬅️ رجوع', 'hr:section:permissions')

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
sectionManagementHandler.callbackQuery('hr:perm:view-all', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'hr-management' },
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
      .text('⬅️ رجوع', 'hr:section:permissions'),
    parse_mode: 'Markdown',
  })
})

// ════════════════════════════════════════════════════════
// إيقاف/تشغيل القسم
// ════════════════════════════════════════════════════════
sectionManagementHandler.callbackQuery('hr:control:toggle', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  const newStatus = !dept.isEnabled

  await Database.prisma.departmentConfig.update({
    where: { code: 'hr-management' },
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
      'hr:control:toggle',
    )
    .row()
    .text('📊 الإحصائيات', 'hr:control:stats')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:section-management')

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
sectionManagementHandler.callbackQuery('hr:admins:dept:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
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
      '👥 *مسؤولو القسم*\n\n'
      + '❌ لا يوجد مسؤولون معينون حالياً',
      {
        reply_markup: keyboard.text('⬅️ رجوع', 'hr:section:admins'),
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
        .text(`${displayName} - ${roleLabel}`, `hr:admins:dept:view:${user.id}`)
        .row()
    }
  }

  keyboard.text('⬅️ رجوع', 'hr:section:admins')

  await ctx.editMessageText(
    '👥 *مسؤولو القسم*\n\n'
    + `📊 العدد الإجمالي: ${adminsData.length}\n\n`
    + '👇 اختر مسؤولاً لعرض التفاصيل:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض تفاصيل مسؤول القسم
sectionManagementHandler.callbackQuery(/^hr:admins:dept:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = Number.parseInt(ctx.match![1], 10)

  const admin = await Database.prisma.departmentAdmin.findFirst({
    where: {
      userId,
      department: { code: 'hr-management' },
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

  let message = '👤 *معلومات المسؤول*\n\n'
  message += `*الاسم الكامل:* ${user.fullName || 'غير متوفر'}\n`
  message += `*اسم الشهرة:* ${user.nickname || 'غير متوفر'}\n`
  message += `*اسم المستخدم:* ${user.username ? `@${user.username}` : 'غير متوفر'}\n`
  message += `*رقم الهاتف:* ${user.phone || 'غير متوفر'}\n`
  message += `*البريد الإلكتروني:* ${user.email || 'غير متوفر'}\n`
  message += `*Telegram ID:* \`${user.telegramId}\`\n`
  message += `*User ID:* ${user.id}\n\n`
  message += `*الرتبة:* ${roleLabel}\n`
  message += `*الحالة:* ${user.isActive ? '🟢 نشط' : '🔴 غير نشط'}\n`
  message += `*محظور:* ${user.isBanned ? '🚫 نعم' : '✅ لا'}\n`
  message += `*تاريخ التسجيل:* ${user.createdAt.toLocaleDateString('ar-EG')}\n\n`

  // عرض الأقسام المُعين عليها
  message += '📋 *الأقسام المسؤول عنها:*\n'
  if (allDeptAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي قسم\n'
  }
  else {
    for (const deptAdmin of allDeptAdmins) {
      message += `  • ${deptAdmin.department.name} (منذ ${deptAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  // عرض الوظائف المُعين عليها
  message += '\n⚙️ *الوظائف المسؤول عنها:*\n'
  if (allSubFeatureAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي وظيفة\n'
  }
  else {
    for (const sfAdmin of allSubFeatureAdmins) {
      message += `  • ${sfAdmin.subFeature.name} (منذ ${sfAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  const keyboard = new InlineKeyboard()
    .text('🗑️ إزالة من القسم', `hr:admins:dept:remove:${userId}`)
    .row()
    .text('⬅️ رجوع', 'hr:admins:dept:list')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// إزالة مسؤول القسم
sectionManagementHandler.callbackQuery(/^hr:admins:dept:remove:(\d+)$/, async (ctx) => {
  const userId = Number.parseInt(ctx.match![1], 10)

  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  // حذف التعيين من القسم
  const deleted = await Database.prisma.departmentAdmin.updateMany({
    where: {
      userId,
      departmentId: dept.id,
    },
    data: { isActive: false },
  })

  if (deleted.count > 0) {
    // ═══════════════════════════════════════════════════════
    // الإزالة التلقائية من جميع الوظائف الفرعية في القسم
    // ═══════════════════════════════════════════════════════
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
        '👥 *مسؤولو القسم*\n\n'
        + '❌ لا يوجد مسؤولون معينون حالياً',
        {
          reply_markup: keyboard.text('⬅️ رجوع', 'hr:section:admins'),
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
          keyboard.text(`${displayName} - ${roleLabel}`, `hr:admins:dept:view:${user.id}`).row()
        }
      }
      keyboard.text('⬅️ رجوع', 'hr:section:admins')

      await ctx.editMessageText(
        '👥 *مسؤولو القسم*\n\n'
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

// إضافة مسؤول قسم - الخطوة 1: عرض قائمة المستخدمين المؤهلين
sectionManagementHandler.callbackQuery('hr:admins:dept:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  // جلب المستخدمين المؤهلين (رتبة >= minRole، نشطين، غير محظورين، غير معينين)
  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const deptMinLevel = roleHierarchy[dept.minRole as keyof typeof roleHierarchy] || 0

  // جلب جميع المعينين حالياً
  const currentAdmins = await Database.prisma.departmentAdmin.findMany({
    where: {
      departmentId: dept.id,
      isActive: true,
    },
    select: { userId: true },
  })
  const currentAdminIds = currentAdmins.map(a => a.userId)

  // جلب المستخدمين المؤهلين
  const eligibleUsers = await Database.prisma.user.findMany({
    where: {
      isActive: true,
      isBanned: false,
      id: { notIn: currentAdminIds }, // استثناء المعينين حالياً
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
    take: 20, // حد أقصى 20 مستخدم
  })

  if (eligibleUsers.length === 0) {
    await ctx.editMessageText(
      '➕ *إضافة مسؤول قسم*\n\n'
      + '❌ لا يوجد مستخدمون مؤهلون للتعيين\n\n'
      + '*الشروط:*\n'
      + `• الرتبة >= ${ROLES[dept.minRole as keyof typeof ROLES]?.label}\n`
      + '• نشط وغير محظور\n'
      + '• غير مُعين بالفعل',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'hr:section:admins'),
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
      .text(`${displayName} - ${roleLabel}`, `hr:admins:dept:confirm:${user.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', 'hr:section:admins')

  await ctx.editMessageText(
    '➕ *إضافة مسؤول قسم*\n\n'
    + `📋 القسم: ${dept.name}\n`
    + `📊 الحد الأدنى: ${ROLES[dept.minRole as keyof typeof ROLES]?.label}\n\n`
    + `� المستخدمون المؤهلون (${eligibleUsers.length}):\n`
    + '👇 اختر المستخدم المراد تعيينه:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إضافة مسؤول قسم - الخطوة 2: تأكيد التعيين
sectionManagementHandler.callbackQuery(/^hr:admins:dept:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = Number.parseInt(ctx.match![1], 10)

  // التحقق من الصلاحية
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

  if (!user) {
    await ctx.answerCallbackQuery({ text: '❌ المستخدم غير موجود', show_alert: true })
    return
  }

  if (!user.isActive || user.isBanned) {
    await ctx.answerCallbackQuery({ text: '❌ المستخدم غير نشط أو محظور', show_alert: true })
    return
  }

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.answerCallbackQuery({ text: '❌ القسم غير موجود', show_alert: true })
    return
  }

  // التحقق من التعيين السابق (نشط أو غير نشط)
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
      // إعادة تفعيل التعيين السابق
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
    // إنشاء تعيين جديد
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
        // إعادة تفعيل التعيين السابق
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
      // إنشاء تعيين جديد
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
    '✅ *تم التعيين بنجاح*\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `🏢 القسم: ${dept.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}\n\n`
    + `📊 تم تعيينه تلقائياً على ${assignedSubFeatures} وظيفة فرعية`,
    {
      reply_markup: new InlineKeyboard()
        .text('👥 عرض المسؤولين', 'hr:admins:dept:list')
        .row()
        .text('⬅️ رجوع', 'hr:section:admins'),
      parse_mode: 'Markdown',
    },
  )
})

// معالج الأمر /add_dept_admin
sectionManagementHandler.command('add_dept_admin', async (ctx) => {
  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.reply('❌ هذا الأمر متاح فقط للسوبر أدمن')
    return
  }

  const args = ctx.message?.text?.split(' ')
  if (!args || args.length < 2) {
    await ctx.reply(
      '❌ استخدام خاطئ للأمر\n\n'
      + '*الاستخدام الصحيح:*\n'
      + '`/add_dept_admin <telegram_id>`\n\n'
      + '*مثال:*\n'
      + '`/add_dept_admin 6272758666`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const telegramIdStr = args[1]
  if (Number.isNaN(Number(telegramIdStr))) {
    await ctx.reply('❌ Telegram ID يجب أن يكون رقماً')
    return
  }

  const telegramId = BigInt(telegramIdStr)

  // البحث عن المستخدم
  const user = await Database.prisma.user.findUnique({
    where: { telegramId },
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
    await ctx.reply('❌ المستخدم غير موجود في النظام')
    return
  }

  if (!user.isActive || user.isBanned) {
    await ctx.reply('❌ المستخدم غير نشط أو محظور')
    return
  }

  // التحقق من minRole
  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!dept) {
    await ctx.reply('❌ القسم غير موجود')
    return
  }

  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  const deptMinLevel = roleHierarchy[dept.minRole as keyof typeof roleHierarchy] || 0

  if (userRoleLevel < deptMinLevel) {
    await ctx.reply(
      '❌ *لا يمكن تعيين هذا المستخدم*\n\n'
      + `رتبة المستخدم: ${ROLES[user.role as keyof typeof ROLES]?.label}\n`
      + `الحد الأدنى المطلوب: ${ROLES[dept.minRole as keyof typeof ROLES]?.label}`,
      { parse_mode: 'Markdown' },
    )
    return
  }

  // التحقق من عدم التعيين المسبق
  const existing = await Database.prisma.departmentAdmin.findFirst({
    where: {
      userId: user.id,
      departmentId: dept.id,
      isActive: true,
    },
  })

  if (existing) {
    await ctx.reply('⚠️ المستخدم مُعين بالفعل كمسؤول لهذا القسم')
    return
  }

  // التعيين كمسؤول قسم
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

  // ═══════════════════════════════════════════════════════
  // التعيين التلقائي على الوظائف الفرعية
  // ═══════════════════════════════════════════════════════
  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: {
      departmentCode: dept.code,
      // استثناء الوظائف التي minRole = SUPER_ADMIN
      NOT: {
        minRole: 'SUPER_ADMIN',
      },
    },
  })

  let assignedSubFeatures = 0
  for (const sf of subFeatures) {
    // التحقق من عدم التعيين المسبق
    const existingSF = await Database.prisma.subFeatureAdmin.findFirst({
      where: {
        userId: user.id,
        subFeatureId: sf.id,
        isActive: true,
      },
    })

    if (!existingSF) {
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
    '✅ *تم التعيين بنجاح*\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `🏢 القسم: ${dept.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}\n\n`
    + `📊 تم تعيينه تلقائياً على ${assignedSubFeatures} وظيفة فرعية`,
    { parse_mode: 'Markdown' },
  )
})

// ════════════════════════════════════════════════════════
// إدارة مسؤولي الوظائف
// ════════════════════════════════════════════════════════
sectionManagementHandler.callbackQuery('hr:admins:sf:list', async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'hr-management' },
    select: { id: true, code: true, name: true },
  })

  const keyboard = new InlineKeyboard()

  // إنشاء زر لكل وظيفة فرعية
  for (const sf of subFeatures) {
    keyboard.text(`⚙️ ${sf.name}`, `hr:admins:sf:view:${sf.id}`).row()
  }

  keyboard.text('⬅️ رجوع', 'hr:section:admins')

  await ctx.editMessageText(
    '⚙️ *مسؤولو الوظائف الفرعية*\n\n'
    + `📊 عدد الوظائف: ${subFeatures.length}\n\n`
    + '👇 اختر وظيفة لعرض المسؤولين:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض مسؤولي وظيفة محددة
sectionManagementHandler.callbackQuery(/^hr:admins:sf:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const sfAdmins = await Database.prisma.subFeatureAdmin.findMany({
    where: { subFeatureId, isActive: true },
  })

  const keyboard = new InlineKeyboard()

  if (sfAdmins.length === 0) {
    await ctx.editMessageText(
      `⚙️ *${subFeature.name}*\n\n`
      + '❌ لا يوجد مسؤولون معينون لهذه الوظيفة',
      {
        reply_markup: keyboard.text('⬅️ رجوع', 'hr:admins:sf:list'),
        parse_mode: 'Markdown',
      },
    )
    return
  }

  // إنشاء زر لكل مسؤول
  for (const admin of sfAdmins) {
    const user = await Database.prisma.user.findUnique({
      where: { id: admin.userId },
      select: { id: true, fullName: true, username: true, role: true },
    })

    if (user) {
      const displayName = user.fullName || user.username || 'غير معروف'
      const roleLabel = ROLES[user.role as keyof typeof ROLES]?.label || user.role
      keyboard
        .text(`${displayName} - ${roleLabel}`, `hr:admins:sf:detail:${subFeatureId}:${user.id}`)
        .row()
    }
  }

  keyboard.text('⬅️ رجوع', 'hr:admins:sf:list')

  await ctx.editMessageText(
    `⚙️ *${subFeature.name}*\n\n`
    + `📊 عدد المسؤولين: ${sfAdmins.length}\n\n`
    + '👇 اختر مسؤولاً لعرض التفاصيل:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// عرض تفاصيل مسؤول وظيفة
sectionManagementHandler.callbackQuery(/^hr:admins:sf:detail:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const userId = Number.parseInt(ctx.match![2], 10)

  const admin = await Database.prisma.subFeatureAdmin.findFirst({
    where: {
      userId,
      subFeatureId,
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

  let message = '👤 *معلومات المسؤول*\n\n'
  message += `*الاسم الكامل:* ${user.fullName || 'غير متوفر'}\n`
  message += `*اسم الشهرة:* ${user.nickname || 'غير متوفر'}\n`
  message += `*اسم المستخدم:* ${user.username ? `@${user.username}` : 'غير متوفر'}\n`
  message += `*رقم الهاتف:* ${user.phone || 'غير متوفر'}\n`
  message += `*البريد الإلكتروني:* ${user.email || 'غير متوفر'}\n`
  message += `*Telegram ID:* \`${user.telegramId}\`\n`
  message += `*User ID:* ${user.id}\n\n`
  message += `*الرتبة:* ${roleLabel}\n`
  message += `*الحالة:* ${user.isActive ? '🟢 نشط' : '🔴 غير نشط'}\n`
  message += `*محظور:* ${user.isBanned ? '🚫 نعم' : '✅ لا'}\n`
  message += `*تاريخ التسجيل:* ${user.createdAt.toLocaleDateString('ar-EG')}\n\n`

  // عرض الأقسام المُعين عليها
  message += '📋 *الأقسام المسؤول عنها:*\n'
  if (allDeptAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي قسم\n'
  }
  else {
    for (const deptAdmin of allDeptAdmins) {
      message += `  • ${deptAdmin.department.name} (منذ ${deptAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  // عرض الوظائف المُعين عليها
  message += '\n⚙️ *الوظائف المسؤول عنها:*\n'
  if (allSubFeatureAdmins.length === 0) {
    message += '  ❌ غير مُعين على أي وظيفة\n'
  }
  else {
    for (const sfAdmin of allSubFeatureAdmins) {
      message += `  • ${sfAdmin.subFeature.name} (منذ ${sfAdmin.assignedAt.toLocaleDateString('ar-EG')})\n`
    }
  }

  const keyboard = new InlineKeyboard()
    .text('🗑️ إزالة من الوظيفة', `hr:admins:sf:remove:${subFeatureId}:${userId}`)
    .row()
    .text('⬅️ رجوع', `hr:admins:sf:view:${subFeatureId}`)

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})

// إزالة مسؤول وظيفة
sectionManagementHandler.callbackQuery(/^hr:admins:sf:remove:(\d+):(\d+)$/, async (ctx) => {
  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const userId = Number.parseInt(ctx.match![2], 10)

  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  // حذف التعيين
  const deleted = await Database.prisma.subFeatureAdmin.updateMany({
    where: {
      userId,
      subFeatureId,
    },
    data: { isActive: false },
  })

  if (deleted.count > 0) {
    await ctx.answerCallbackQuery({
      text: '✅ تم إزالة المسؤول من الوظيفة بنجاح',
      show_alert: true,
    })

    // العودة لقائمة المسؤولين
    const subFeature = await Database.prisma.subFeatureConfig.findUnique({
      where: { id: subFeatureId },
    })

    const updatedAdmins = await Database.prisma.subFeatureAdmin.findMany({
      where: { subFeatureId, isActive: true },
    })

    const keyboard = new InlineKeyboard()

    if (updatedAdmins.length === 0) {
      await ctx.editMessageText(
        `⚙️ *${subFeature?.name}*\n\n`
        + '❌ لا يوجد مسؤولون معينون لهذه الوظيفة',
        {
          reply_markup: keyboard.text('⬅️ رجوع', 'hr:admins:sf:list'),
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
          keyboard.text(`${displayName} - ${roleLabel}`, `hr:admins:sf:detail:${subFeatureId}:${user.id}`).row()
        }
      }
      keyboard.text('⬅️ رجوع', 'hr:admins:sf:list')

      await ctx.editMessageText(
        `⚙️ *${subFeature?.name}*\n\n`
        + `📊 عدد المسؤولين: ${updatedAdmins.length}\n\n`
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

// إضافة مسؤول وظيفة - الخطوة 1: اختيار الوظيفة
sectionManagementHandler.callbackQuery('hr:admins:sf:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({
      text: '❌ هذه العملية متاحة فقط للسوبر أدمن',
      show_alert: true,
    })
    return
  }

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'hr-management' },
    select: { id: true, code: true, name: true, minRole: true },
  })

  const keyboard = new InlineKeyboard()

  for (const sf of subFeatures) {
    keyboard.text(`⚙️ ${sf.name}`, `hr:admins:sf:add:select:${sf.id}`).row()
  }

  keyboard.text('⬅️ رجوع', 'hr:section:admins')

  await ctx.editMessageText(
    '➕ *إضافة مسؤول وظيفة*\n\n'
    + `📊 عدد الوظائف: ${subFeatures.length}\n\n`
    + '� اختر الوظيفة أولاً:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إضافة مسؤول وظيفة - الخطوة 2: عرض المستخدمين المؤهلين
sectionManagementHandler.callbackQuery(/^hr:admins:sf:add:select:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  // جلب المعينين حالياً
  const currentAdmins = await Database.prisma.subFeatureAdmin.findMany({
    where: {
      subFeatureId,
      isActive: true,
    },
    select: { userId: true },
  })
  const currentAdminIds = currentAdmins.map(a => a.userId)

  // جلب المستخدمين المؤهلين
  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const sfMinLevel = roleHierarchy[subFeature.minRole as keyof typeof roleHierarchy] || 0

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
      '➕ *إضافة مسؤول وظيفة*\n\n'
      + `⚙️ الوظيفة: ${subFeature.name}\n\n`
      + '❌ لا يوجد مستخدمون مؤهلون للتعيين',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'hr:admins:sf:add'),
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
      .text(`${displayName} - ${roleLabel}`, `hr:admins:sf:add:confirm:${subFeatureId}:${user.id}`)
      .row()
  }

  keyboard.text('⬅️ رجوع', 'hr:admins:sf:add')

  await ctx.editMessageText(
    '➕ *إضافة مسؤول وظيفة*\n\n'
    + `⚙️ الوظيفة: ${subFeature.name}\n`
    + `📊 الحد الأدنى: ${ROLES[subFeature.minRole as keyof typeof ROLES]?.label}\n\n`
    + `👥 المستخدمون المؤهلون (${eligibleUsers.length}):\n`
    + '👇 اختر المستخدم المراد تعيينه:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// إضافة مسؤول وظيفة - الخطوة 3: تأكيد التعيين
sectionManagementHandler.callbackQuery(/^hr:admins:sf:add:confirm:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const userId = Number.parseInt(ctx.match![2], 10)

  // التحقق من الصلاحية
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

  // التحقق من عدم التعيين المسبق
  const existing = await Database.prisma.subFeatureAdmin.findFirst({
    where: {
      userId: user.id,
      subFeatureId,
      isActive: true,
    },
  })

  if (existing) {
    await ctx.answerCallbackQuery({ text: '⚠️ المستخدم مُعين بالفعل', show_alert: true })
    return
  }

  // التعيين
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

  const displayName = user.fullName || user.username || 'غير معروف'

  await ctx.editMessageText(
    '✅ *تم التعيين بنجاح*\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `⚙️ الوظيفة: ${subFeature.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}`,
    {
      reply_markup: new InlineKeyboard()
        .text('⚙️ عرض المسؤولين', `hr:admins:sf:view:${subFeatureId}`)
        .row()
        .text('⬅️ رجوع', 'hr:section:admins'),
      parse_mode: 'Markdown',
    },
  )
})

// معالج الأمر /add_sf_admin
sectionManagementHandler.command('add_sf_admin', async (ctx) => {
  // التحقق من الصلاحية
  if (!ctx.dbUser || ctx.dbUser.role !== 'SUPER_ADMIN') {
    await ctx.reply('❌ هذا الأمر متاح فقط للسوبر أدمن')
    return
  }

  const args = ctx.message?.text?.split(' ')
  if (!args || args.length < 3) {
    await ctx.reply(
      '❌ استخدام خاطئ للأمر\n\n'
      + '*الاستخدام الصحيح:*\n'
      + '`/add_sf_admin <telegram_id> <subfeature_code>`\n\n'
      + '*مثال:*\n'
      + '`/add_sf_admin 6272758666 hr:employees-list`',
      { parse_mode: 'Markdown' },
    )
    return
  }

  const telegramIdStr = args[1]
  const subFeatureCode = args[2]

  if (Number.isNaN(Number(telegramIdStr))) {
    await ctx.reply('❌ Telegram ID يجب أن يكون رقماً')
    return
  }

  const telegramId = BigInt(telegramIdStr)

  // البحث عن المستخدم
  const user = await Database.prisma.user.findUnique({
    where: { telegramId },
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
    await ctx.reply('❌ المستخدم غير موجود في النظام')
    return
  }

  if (!user.isActive || user.isBanned) {
    await ctx.reply('❌ المستخدم غير نشط أو محظور')
    return
  }

  // البحث عن الوظيفة الفرعية
  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { code: subFeatureCode },
  })

  if (!subFeature) {
    await ctx.reply('❌ رمز الوظيفة الفرعية غير صحيح')
    return
  }

  // التحقق من minRole
  const roleHierarchy = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, USER: 2, GUEST: 1 }
  const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  const sfMinLevel = roleHierarchy[subFeature.minRole as keyof typeof roleHierarchy] || 0

  if (userRoleLevel < sfMinLevel) {
    await ctx.reply(
      '❌ *لا يمكن تعيين هذا المستخدم*\n\n'
      + `رتبة المستخدم: ${ROLES[user.role as keyof typeof ROLES]?.label}\n`
      + `الحد الأدنى المطلوب: ${ROLES[subFeature.minRole as keyof typeof ROLES]?.label}`,
      { parse_mode: 'Markdown' },
    )
    return
  }

  // التحقق من التعيين المسبق (نشط أو غير نشط)
  const existing = await Database.prisma.subFeatureAdmin.findFirst({
    where: {
      userId: user.id,
      subFeatureId: subFeature.id,
    },
  })

  if (existing) {
    if (existing.isActive) {
      await ctx.reply('⚠️ المستخدم مُعين بالفعل كمسؤول لهذه الوظيفة')
      return
    }
    else {
      // إعادة تفعيل التعيين الموجود
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
    // إنشاء تعيين جديد
    await Database.prisma.subFeatureAdmin.create({
      data: {
        userId: user.id,
        telegramId: user.telegramId,
        subFeatureId: subFeature.id,
        assignedBy: BigInt(ctx.from!.id),
        isActive: true,
        assignedAt: new Date(),
      },
    })
  }

  const displayName = user.fullName || user.username || 'غير معروف'
  await ctx.reply(
    '✅ *تم التعيين بنجاح*\n\n'
    + `👤 المستخدم: ${displayName}\n`
    + `⚙️ الوظيفة: ${subFeature.name}\n`
    + `⭐ الرتبة: ${ROLES[user.role as keyof typeof ROLES]?.label}`,
    { parse_mode: 'Markdown' },
  )
})

// ════════════════════════════════════════════════════════
// إعدادات الإشعارات
// ════════════════════════════════════════════════════════

sectionManagementHandler.callbackQuery('hr:control:notifications', async (ctx) => {
  await ctx.answerCallbackQuery()

  // جلب الإعدادات الحالية
  let settings = await Database.prisma.hR_Settings.findFirst()

  // إنشاء إعدادات افتراضية إذا لم توجد
  if (!settings) {
    settings = await Database.prisma.hR_Settings.create({
      data: {
        notificationsEnabled: true,
        notificationTime: '09:00',
        leaveStartReminderDays: 1,
        leaveEndReminderDays: 1,
        sectionEnabled: true,
      },
    })
  }

  const keyboard = new InlineKeyboard()
    .text(
      settings.notificationsEnabled ? '🔕 تعطيل الإشعارات' : '🔔 تفعيل الإشعارات',
      'hr:notif:toggle',
    )
    .row()
    .text('⏰ تغيير وقت الإرسال', 'hr:notif:change-time')
    .row()
    .text('📧 إرسال إشعارات الآن (اختبار)', 'hr:notif:send-now')
    .row()
    .text('⬅️ رجوع', 'hr:section:control')

  await ctx.editMessageText(
    '🔔 **إعدادات إشعارات الإجازات**\n\n'
    + `📊 **الحالة:** ${settings.notificationsEnabled ? '🟢 مفعّل' : '🔴 معطّل'}\n`
    + `⏰ **وقت الإرسال اليومي:** ${settings.notificationTime}\n`
    + `📅 **إشعار بداية الإجازة:** قبل ${settings.leaveStartReminderDays} يوم\n`
    + `📅 **إشعار نهاية الإجازة:** قبل ${settings.leaveEndReminderDays} يوم\n\n`
    + '💡 **ملاحظة:**\n'
    + 'يتم إرسال الإشعارات تلقائياً للأدمن كل يوم في الوقت المحدد',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// تفعيل/تعطيل الإشعارات
sectionManagementHandler.callbackQuery('hr:notif:toggle', async (ctx) => {
  await ctx.answerCallbackQuery()

  const settings = await Database.prisma.hR_Settings.findFirst()

  if (!settings) {
    await ctx.reply('❌ خطأ: الإعدادات غير موجودة')
    return
  }

  const newStatus = !settings.notificationsEnabled

  await Database.prisma.hR_Settings.update({
    where: { id: settings.id },
    data: {
      notificationsEnabled: newStatus,
      updatedBy: BigInt(ctx.from!.id),
    },
  })

  await ctx.answerCallbackQuery(
    newStatus ? '✅ تم تفعيل الإشعارات' : '🔕 تم تعطيل الإشعارات',
  )

  // إعادة عرض القائمة
  ctx.callbackQuery.data = 'hr:control:notifications'
  await sectionManagementHandler.middleware()(ctx, () => Promise.resolve())
})

// تغيير وقت الإرسال
sectionManagementHandler.callbackQuery('hr:notif:change-time', async (ctx) => {
  await ctx.answerCallbackQuery()

  await ctx.reply(
    '⏰ **تغيير وقت إرسال الإشعارات**\n\n'
    + 'أرسل الوقت الجديد بصيغة **HH:MM** (24 ساعة)\n\n'
    + '🔹 مثال: `09:00` للساعة التاسعة صباحاً\n'
    + '🔹 مثال: `14:30` للساعة الثانية والنصف مساءً\n\n'
    + '⚠️ **ملاحظة:** سيتم تطبيق التوقيت الجديد من اليوم التالي',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ إلغاء', 'hr:control:notifications'),
    },
  )

  // حفظ حالة انتظار الإدخال
  ctx.session.awaitingInput = {
    type: 'notification_time',
  }
})

// معالجة إدخال الوقت
sectionManagementHandler.on('message:text', async (ctx, next) => {
  if (ctx.session.awaitingInput?.type === 'notification_time') {
    const timeInput = ctx.message.text.trim()

    // التحقق من الصيغة (HH:MM)
    const timeRegex = /^(?:[01]?\d|2[0-3]):[0-5]\d$/
    if (!timeRegex.test(timeInput)) {
      await ctx.reply(
        '❌ صيغة غير صحيحة!\n\n'
        + 'يرجى إدخال الوقت بصيغة **HH:MM**\n'
        + 'مثال: 09:00 أو 14:30',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('❌ إلغاء', 'hr:control:notifications'),
        },
      )
      return
    }

    // تحديث الإعدادات
    const settings = await Database.prisma.hR_Settings.findFirst()

    if (!settings) {
      await ctx.reply('❌ خطأ: الإعدادات غير موجودة')
      delete ctx.session.awaitingInput
      return
    }

    await Database.prisma.hR_Settings.update({
      where: { id: settings.id },
      data: {
        notificationTime: timeInput,
        updatedBy: BigInt(ctx.from!.id),
      },
    })

    delete ctx.session.awaitingInput

    await ctx.reply(
      `✅ تم تحديث وقت الإرسال إلى **${timeInput}**\n\n`
      + 'سيتم إرسال الإشعارات يومياً في هذا الوقت',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 العودة للإعدادات', 'hr:control:notifications'),
      },
    )

    return
  }

  // تمرير للـ handler التالي
  await next()
})

// إرسال إشعارات فورية للاختبار
sectionManagementHandler.callbackQuery('hr:notif:send-now', async (ctx) => {
  await ctx.answerCallbackQuery()

  await ctx.reply('⏳ جاري إرسال الإشعارات...')

  try {
    const { LeaveNotificationsService } = await import('../../../../modules/services/leave-notifications.js')

    // إنشاء instance من الخدمة مع Bot API
    const notificationService = new LeaveNotificationsService(ctx.api)

    // إرسال إشعارات بداية الإجازات
    await notificationService.sendLeaveStartReminders()

    // إرسال إشعارات نهاية الإجازات
    await notificationService.sendLeaveReturnReminders()

    // التحقق من الإجازات المتأخرة
    await notificationService.checkOverdueLeaves()

    await ctx.reply(
      '✅ **تم إرسال الإشعارات بنجاح!**\n\n'
      + '📧 تم فحص وإرسال:\n'
      + '• إشعارات بداية الإجازات القادمة\n'
      + '• إشعارات نهاية الإجازات\n'
      + '• تنبيهات الإجازات المتأخرة\n\n'
      + '💡 تحقق من الرسائل الواردة للأدمن',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 العودة', 'hr:control:notifications'),
      },
    )
  }
  catch (error: any) {
    await ctx.reply(
      `❌ حدث خطأ أثناء الإرسال:\n\n${error.message}`,
      {
        reply_markup: new InlineKeyboard().text('🔙 العودة', 'hr:control:notifications'),
      },
    )
  }
})
