import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

// إدارة المسؤولين لقسم المخازن (مطابقة لتدفقات شئون العاملين)
import { Database } from '../../../../modules/database/index.js'

export const inventoryManagementHandler = new Composer<Context>()

const managementMenuKeyboard = new InlineKeyboard()
  .text('🔐 إدارة الصلاحيات', 'inv:mgmt:permissions')
  .row()
  .text('👥 إدارة المسؤولين', 'inv:mgmt:admins')
  .row()
  .text('⚙️ التحكم والإعدادات', 'inv:mgmt:control')
  .row()
  .text('⬅️ رجوع', 'menu:feature:inventory-management')

const managementMenuText
  = '📈 **إدارة قسم المخازن**\n\n'
    + 'تحكم في صلاحيات الوصول، وعيّن المسؤولين، وقم بتعديل إعدادات قسم المخازن.'

// Main entry point for management
inventoryManagementHandler.callbackQuery(/^menu:sub:inventory-management:management$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.editMessageText('🚫 هذه الوظيفة متاحة فقط للسوبر أدمن', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:feature:inventory-management'),
    })
    return
  }

  await ctx.editMessageText(managementMenuText, {
    reply_markup: managementMenuKeyboard,
    parse_mode: 'Markdown',
  })
})

const ROLES = {
  SUPER_ADMIN: { value: 'SUPER_ADMIN', label: '🔴 سوبر أدمن' },
  ADMIN: { value: 'ADMIN', label: '🟢 أدمن' },
  MODERATOR: { value: 'MODERATOR', label: '🟡 مشرف' },
  USER: { value: 'USER', label: '🔵 مستخدم' },
  GUEST: { value: 'GUEST', label: '⚪ ضيف' },
}

// Main Permissions Menu
inventoryManagementHandler.callbackQuery('inv:mgmt:permissions', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'inv:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'inv:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'inv:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:management')

  await ctx.editMessageText(
    '🔐 **إدارة صلاحيات قسم المخازن**\n\n'
    + '📌 **الحد الأدنى للرتبة (minRole)**:\n'
    + 'تحديد أقل رتبة يمكنها الوصول للقسم أو الوظيفة.',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// View Current Permissions Handler
inventoryManagementHandler.callbackQuery('inv:perm:view-all', async (ctx) => {
  await ctx.answerCallbackQuery()

  const { Database } = await import('../../../../modules/database/index.js')

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  })

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { name: true, minRole: true },
  })

  let message = '📊 **الصلاحيات الحالية لقسم المخازن**\n\n'
  const deptRole = dept?.minRole || 'ADMIN'
  message += `🏢 **القسم الرئيسي**: ${ROLES[deptRole as keyof typeof ROLES]?.label}\n\n`
  message += '**الوظائف الفرعية:**\n'

  if (subFeatures.length === 0) {
    message += '  ❌ لا توجد وظائف فرعية معرفة.'
  }
  else {
    for (const sf of subFeatures) {
      const sfRole = sf.minRole || 'ADMIN'
      message += `  • ${sf.name}: **${ROLES[sfRole as keyof typeof ROLES]?.label}**\n`
    }
  }

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:permissions'),
    parse_mode: 'Markdown',
  })
})

// Set Department Permission - Step 1: Show role selection
inventoryManagementHandler.callbackQuery('inv:perm:set-dept-role', async (ctx) => {
  await ctx.answerCallbackQuery()
  const { Database } = await import('../../../../modules/database/index.js')

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
    .text('⬅️ رجوع', 'inv:mgmt:permissions')

  await ctx.editMessageText(
    '🔐 **تحديد صلاحية قسم المخازن**\n\n'
    + `الصلاحية الحالية: **${ROLES[currentRole as keyof typeof ROLES]?.label}**\n\n`
    + '📌 اختر الحد الأدنى للرتبة المطلوبة للوصول للقسم:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Set Department Permission - Step 2: Apply the new role
inventoryManagementHandler.callbackQuery(/^inv:perm:dept:(.+)$/, async (ctx) => {
  const role = ctx.match![1] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'
  await ctx.answerCallbackQuery()
  const { Database } = await import('../../../../modules/database/index.js')

  await Database.prisma.departmentConfig.update({
    where: { code: 'inventory-management' },
    data: { minRole: role },
  })

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية القسم إلى: ${ROLES[role].label}`,
    show_alert: true,
  })

  // Go back to the permissions menu
  ctx.callbackQuery.data = 'inv:mgmt:permissions'
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve())
})

// Set Functions Permissions - Step 1: List all sub-features
inventoryManagementHandler.callbackQuery('inv:perm:set-subfeatures', async (ctx) => {
  await ctx.answerCallbackQuery()
  const { Database } = await import('../../../../modules/database/index.js')

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { id: true, name: true },
  })

  if (subFeatures.length === 0) {
    await ctx.editMessageText('❌ لا توجد وظائف فرعية في هذا القسم', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:permissions'),
    })
    return
  }

  const keyboard = new InlineKeyboard()
  for (const sf of subFeatures) {
    keyboard.text(`⚙️ ${sf.name}`, `inv:perm:sf:${sf.id}`).row()
  }
  keyboard.text('⬅️ رجوع', 'inv:mgmt:permissions')

  await ctx.editMessageText(
    '⚙️ **تحديد صلاحيات الوظائف**\n\n'
    + '📌 اختر الوظيفة لتعديل صلاحيتها:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// Set Functions Permissions - Step 2: Show role selection for a specific sub-feature
inventoryManagementHandler.callbackQuery(/^inv:perm:sf:(\d+)$/, async (ctx) => {
  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  await ctx.answerCallbackQuery()
  const { Database } = await import('../../../../modules/database/index.js')

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  })

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true })
    return
  }

  const currentRole = subFeature.minRole || 'ADMIN'

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, `inv:perm:sf-set:${subFeatureId}:SUPER_ADMIN`)
    .row()
    .text(ROLES.ADMIN.label, `inv:perm:sf-set:${subFeatureId}:ADMIN`)
    .text(ROLES.MODERATOR.label, `inv:perm:sf-set:${subFeatureId}:MODERATOR`)
    .row()
    .text(ROLES.USER.label, `inv:perm:sf-set:${subFeatureId}:USER`)
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

// Set Functions Permissions - Step 3: Apply the new role to the sub-feature
inventoryManagementHandler.callbackQuery(/^inv:perm:sf-set:(\d+):(.+)$/, async (ctx) => {
  const subFeatureId = Number.parseInt(ctx.match![1], 10)
  const role = ctx.match![2] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER'

  await ctx.answerCallbackQuery()
  const { Database } = await import('../../../../modules/database/index.js')

  await Database.prisma.subFeatureConfig.update({
    where: { id: subFeatureId },
    data: {
      minRole: role,
      superAdminOnly: role === 'SUPER_ADMIN',
    },
  })

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية الوظيفة إلى: ${ROLES[role].label}`,
    show_alert: true,
  })

  // Go back to the sub-feature list
  ctx.callbackQuery.data = 'inv:perm:set-subfeatures'
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve())
})

// Main Admins Management Menu
inventoryManagementHandler.callbackQuery('inv:mgmt:admins', async (ctx) => {
  await ctx.answerCallbackQuery()

  // Only SUPER_ADMIN and ADMIN can manage admins
  if (!ctx.dbUser || (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN')) {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }

  // Get department config for inventory-management
  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
    include: { admins: { where: { isActive: true }, include: { user: true } } },
  })

  let message = '👥 **إدارة المسؤولين لقسم المخازن**\n\n'
  if (!dept || dept.admins.length === 0) {
    message += 'لا يوجد مسؤولون معينون حاليا.\n'
  }
  else {
    message += 'المسؤولون الحاليون:\n'
    dept.admins.forEach((admin, idx) => {
      message += `${idx + 1}. ${admin.user.fullName || ''} [${admin.user.username ? `@${admin.user.username}` : admin.user.telegramId}]\n`
    })
  }

  const keyboard = new InlineKeyboard()
  keyboard.text('➕ إضافة مسؤول', 'inv:mgmt:admins:add').row()
  if (dept && dept.admins.length > 0)
    keyboard.text('➖ إزالة مسؤول', 'inv:mgmt:admins:remove').row()
  keyboard.text('⬅️ رجوع', 'menu:sub:inventory-management:management')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// إضافة مسؤول: اختيار من قائمة المستخدمين غير المعينين
inventoryManagementHandler.callbackQuery('inv:mgmt:admins:add', async (ctx) => {
  await ctx.answerCallbackQuery()
  // Only SUPER_ADMIN and ADMIN
  if (!ctx.dbUser || (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN')) {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }
  // Get all users who are not already admins for inventory-management
  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
    include: { admins: { where: { isActive: true } } },
  })
  const adminUserIds = dept?.admins.map(a => a.userId) || []
  const users = await Database.prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: adminUserIds },
    },
    orderBy: { fullName: 'asc' },
    take: 30,
  })
  if (users.length === 0) {
    await ctx.editMessageText('لا يوجد مستخدمون متاحون للإضافة كمسؤولين.', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:admins'),
    })
    return
  }
  const keyboard = new InlineKeyboard()
  users.forEach((u) => {
    keyboard.text(`${u.fullName || ''} ${u.username ? `@${u.username}` : ''}`, `inv:mgmt:admins:add:${u.id}`).row()
  })
  keyboard.text('⬅️ رجوع', 'inv:mgmt:admins')
  await ctx.editMessageText('اختر المستخدم لإضافته كمسؤول:', {
    reply_markup: keyboard,
  })
})

// تنفيذ إضافة المسؤول
inventoryManagementHandler.callbackQuery(/^inv:mgmt:admins:add:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN')) {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }
  const userId = Number(ctx.match![1])
  // Get user
  const user = await Database.prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    await ctx.answerCallbackQuery('❌ المستخدم غير موجود')
    return
  }
  // Get department
  const dept = await Database.prisma.departmentConfig.findUnique({ where: { code: 'inventory-management' } })
  if (!dept) {
    await ctx.answerCallbackQuery('❌ قسم المخازن غير موجود')
    return
  }
  // Add admin
  await Database.prisma.departmentAdmin.create({
    data: {
      departmentId: dept.id,
      userId: user.id,
      telegramId: user.telegramId,
      assignedBy: ctx.dbUser.telegramId,
      isActive: true,
    },
  })
  await ctx.answerCallbackQuery('✅ تم تعيين المستخدم كمسؤول بنجاح')
  ctx.callbackQuery.data = 'inv:mgmt:admins'
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve())
})

// إزالة مسؤول: اختيار من قائمة المسؤولين الحاليين
inventoryManagementHandler.callbackQuery('inv:mgmt:admins:remove', async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN')) {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }
  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
    include: { admins: { where: { isActive: true }, include: { user: true } } },
  })
  if (!dept || dept.admins.length === 0) {
    await ctx.editMessageText('لا يوجد مسؤولون لإزالتهم.', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:admins'),
    })
    return
  }
  const keyboard = new InlineKeyboard()
  dept.admins.forEach((a) => {
    keyboard.text(`${a.user.fullName || ''} ${a.user.username ? `@${a.user.username}` : ''}`, `inv:mgmt:admins:remove:${a.userId}`).row()
  })
  keyboard.text('⬅️ رجوع', 'inv:mgmt:admins')
  await ctx.editMessageText('اختر المسؤول لإزالته:', {
    reply_markup: keyboard,
  })
})

// تنفيذ إزالة المسؤول
inventoryManagementHandler.callbackQuery(/^inv:mgmt:admins:remove:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || (ctx.dbUser.role !== 'SUPER_ADMIN' && ctx.dbUser.role !== 'ADMIN')) {
    await ctx.answerCallbackQuery('⛔ هذه الصلاحية متاحة للمدراء فقط')
    return
  }
  const userId = Number(ctx.match![1])
  const dept = await Database.prisma.departmentConfig.findUnique({ where: { code: 'inventory-management' } })
  if (!dept) {
    await ctx.answerCallbackQuery('❌ قسم المخازن غير موجود')
    return
  }
  // Deactivate admin assignment
  await Database.prisma.departmentAdmin.updateMany({
    where: { departmentId: dept.id, userId, isActive: true },
    data: { isActive: false },
  })
  await ctx.answerCallbackQuery('✅ تم إزالة المسؤول بنجاح')
  ctx.callbackQuery.data = 'inv:mgmt:admins'
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve())
})

// ════════════════════════════════════════════════════════
// التحكم والإعدادات
// ════════════════════════════════════════════════════════
inventoryManagementHandler.callbackQuery('inv:mgmt:control', async (ctx) => {
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
    .text('⬅️ رجوع', 'menu:sub:inventory-management:management')

  await ctx.editMessageText(
    '⚙️ **التحكم والإعدادات**\n\n'
    + `الحالة الحالية: ${isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}\n\n`
    + '💡 يمكنك تشغيل أو إيقاف عرض قسم المخازن في القائمة الرئيسية.',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// إيقاف/تشغيل القسم
// ════════════════════════════════════════════════════════
inventoryManagementHandler.callbackQuery('inv:control:toggle', async (ctx) => {
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
    .text('⬅️ رجوع', 'menu:sub:inventory-management:management')

  await ctx.editMessageText(
    '⚙️ **التحكم والإعدادات**\n\n'
    + `الحالة الحالية: ${newStatus ? '🟢 مفعّل' : '🔴 معطّل'}\n\n`
    + '💡 يمكنك تشغيل أو إيقاف عرض قسم المخازن في القائمة الرئيسية.',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
})

// ════════════════════════════════════════════════════════
// عرض الإحصائيات
// ════════════════════════════════════════════════════════
inventoryManagementHandler.callbackQuery('inv:control:stats', async (ctx) => {
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
      .text('⬅️ رجوع', 'inv:mgmt:control'),
    parse_mode: 'Markdown',
  })
})
