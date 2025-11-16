import type { Context } from '../../../context.js';
import { Composer, InlineKeyboard } from 'grammy';

export const inventoryManagementHandler = new Composer<Context>();

const managementMenuKeyboard = new InlineKeyboard()
  .text('🔐 إدارة الصلاحيات', 'inv:mgmt:permissions')
  .row()
  .text('👥 إدارة المسؤولين', 'inv:mgmt:admins')
  .row()
  .text('⚙️ التحكم والإعدادات', 'inv:mgmt:control')
  .row()
  .text('⬅️ رجوع', 'menu:feature:inventory-management');

const managementMenuText =
  '📈 **إدارة قسم المخازن**\n\n' +
  'تحكم في صلاحيات الوصول، وعيّن المسؤولين، وقم بتعديل إعدادات قسم المخازن.';

// Main entry point for management
inventoryManagementHandler.callbackQuery(/^menu:sub:inventory-management:management$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.editMessageText('🚫 هذه الوظيفة متاحة فقط للسوبر أدمن', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:feature:inventory-management'),
    });
    return;
  }

  await ctx.editMessageText(managementMenuText, {
    reply_markup: managementMenuKeyboard,
    parse_mode: 'Markdown',
  });
});

const ROLES = {
  SUPER_ADMIN: { value: 'SUPER_ADMIN', label: '🔴 سوبر أدمن' },
  ADMIN: { value: 'ADMIN', label: '🟢 أدمن' },
  MODERATOR: { value: 'MODERATOR', label: '🟡 مشرف' },
  USER: { value: 'USER', label: '🔵 مستخدم' },
  GUEST: { value: 'GUEST', label: '⚪ ضيف' },
};

// Main Permissions Menu
inventoryManagementHandler.callbackQuery('inv:mgmt:permissions', async (ctx) => {
  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard()
    .text('🔐 تحديد صلاحية القسم', 'inv:perm:set-dept-role')
    .row()
    .text('⚙️ تحديد صلاحيات الوظائف', 'inv:perm:set-subfeatures')
    .row()
    .text('📊 عرض الصلاحيات الحالية', 'inv:perm:view-all')
    .row()
    .text('⬅️ رجوع', 'menu:sub:inventory-management:management');

  await ctx.editMessageText(
    '🔐 **إدارة صلاحيات قسم المخازن**\n\n' +
    '📌 **الحد الأدنى للرتبة (minRole)**:\n' +
    'تحديد أقل رتبة يمكنها الوصول للقسم أو الوظيفة.',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  );
});

// View Current Permissions Handler
inventoryManagementHandler.callbackQuery('inv:perm:view-all', async (ctx) => {
  await ctx.answerCallbackQuery();

  const { Database } = await import('../../../../modules/database/index.js');

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  });

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { name: true, minRole: true },
  });

  let message = '📊 **الصلاحيات الحالية لقسم المخازن**\n\n';
  const deptRole = dept?.minRole || 'ADMIN';
  message += `🏢 **القسم الرئيسي**: ${ROLES[deptRole as keyof typeof ROLES]?.label}\n\n`;
  message += '**الوظائف الفرعية:**\n';

  if (subFeatures.length === 0) {
    message += '  ❌ لا توجد وظائف فرعية معرفة.';
  } else {
    for (const sf of subFeatures) {
      const sfRole = sf.minRole || 'ADMIN';
      message += `  • ${sf.name}: **${ROLES[sfRole as keyof typeof ROLES]?.label}**\n`;
    }
  }

  await ctx.editMessageText(message, {
    reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:permissions'),
    parse_mode: 'Markdown',
  });
});


// Set Department Permission - Step 1: Show role selection
inventoryManagementHandler.callbackQuery('inv:perm:set-dept-role', async (ctx) => {
  await ctx.answerCallbackQuery();
  const { Database } = await import('../../../../modules/database/index.js');

  const dept = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'inventory-management' },
  });

  const currentRole = dept?.minRole || 'ADMIN';

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, 'inv:perm:dept:SUPER_ADMIN')
    .row()
    .text(ROLES.ADMIN.label, 'inv:perm:dept:ADMIN')
    .text(ROLES.MODERATOR.label, 'inv:perm:dept:MODERATOR')
    .row()
    .text(ROLES.USER.label, 'inv:perm:dept:USER')
    .row()
    .text('⬅️ رجوع', 'inv:mgmt:permissions');

  await ctx.editMessageText(
    '🔐 **تحديد صلاحية قسم المخازن**\n\n' +
    `الصلاحية الحالية: **${ROLES[currentRole as keyof typeof ROLES]?.label}**\n\n` +
    '📌 اختر الحد الأدنى للرتبة المطلوبة للوصول للقسم:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  );
});

// Set Department Permission - Step 2: Apply the new role
inventoryManagementHandler.callbackQuery(/^inv:perm:dept:(.+)$/, async (ctx) => {
  const role = ctx.match![1] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  await ctx.answerCallbackQuery();
  const { Database } = await import('../../../../modules/database/index.js');

  await Database.prisma.departmentConfig.update({
    where: { code: 'inventory-management' },
    data: { minRole: role },
  });

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية القسم إلى: ${ROLES[role].label}`,
    show_alert: true,
  });

  // Go back to the permissions menu
  ctx.callbackQuery.data = 'inv:mgmt:permissions';
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve());
});

// Set Functions Permissions - Step 1: List all sub-features
inventoryManagementHandler.callbackQuery('inv:perm:set-subfeatures', async (ctx) => {
  await ctx.answerCallbackQuery();
  const { Database } = await import('../../../../modules/database/index.js');

  const subFeatures = await Database.prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { id: true, name: true },
  });

  if (subFeatures.length === 0) {
    await ctx.editMessageText('❌ لا توجد وظائف فرعية في هذا القسم', {
      reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'inv:mgmt:permissions'),
    });
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const sf of subFeatures) {
    keyboard.text(`⚙️ ${sf.name}`, `inv:perm:sf:${sf.id}`).row();
  }
  keyboard.text('⬅️ رجوع', 'inv:mgmt:permissions');

  await ctx.editMessageText(
    '⚙️ **تحديد صلاحيات الوظائف**\n\n' +
    '📌 اختر الوظيفة لتعديل صلاحيتها:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  );
});

// Set Functions Permissions - Step 2: Show role selection for a specific sub-feature
inventoryManagementHandler.callbackQuery(/^inv:perm:sf:(\d+)$/, async (ctx) => {
  const subFeatureId = Number.parseInt(ctx.match![1], 10);
  await ctx.answerCallbackQuery();
  const { Database } = await import('../../../../modules/database/index.js');

  const subFeature = await Database.prisma.subFeatureConfig.findUnique({
    where: { id: subFeatureId },
  });

  if (!subFeature) {
    await ctx.answerCallbackQuery({ text: '❌ الوظيفة غير موجودة', show_alert: true });
    return;
  }

  const currentRole = subFeature.minRole || 'ADMIN';

  const keyboard = new InlineKeyboard()
    .text(ROLES.SUPER_ADMIN.label, `inv:perm:sf-set:${subFeatureId}:SUPER_ADMIN`)
    .row()
    .text(ROLES.ADMIN.label, `inv:perm:sf-set:${subFeatureId}:ADMIN`)
    .text(ROLES.MODERATOR.label, `inv:perm:sf-set:${subFeatureId}:MODERATOR`)
    .row()
    .text(ROLES.USER.label, `inv:perm:sf-set:${subFeatureId}:USER`)
    .row()
    .text('⬅️ رجوع', 'inv:perm:set-subfeatures');

  await ctx.editMessageText(
    `⚙️ **${subFeature.name}**\n\n` +
    `الصلاحية الحالية: **${ROLES[currentRole as keyof typeof ROLES]?.label}**\n\n` +
    '📌 اختر الحد الأدنى للرتبة المطلوبة:',
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  );
});

// Set Functions Permissions - Step 3: Apply the new role to the sub-feature
inventoryManagementHandler.callbackQuery(/^inv:perm:sf-set:(\d+):(.+)$/, async (ctx) => {
  const subFeatureId = Number.parseInt(ctx.match![1], 10);
  const role = ctx.match![2] as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

  await ctx.answerCallbackQuery();
  const { Database } = await import('../../../../modules/database/index.js');

  await Database.prisma.subFeatureConfig.update({
    where: { id: subFeatureId },
    data: {
      minRole: role,
      superAdminOnly: role === 'SUPER_ADMIN',
    },
  });

  await ctx.answerCallbackQuery({
    text: `✅ تم تحديث صلاحية الوظيفة إلى: ${ROLES[role].label}`,
    show_alert: true,
  });

  // Go back to the sub-feature list
  ctx.callbackQuery.data = 'inv:perm:set-subfeatures';
  await inventoryManagementHandler.middleware()(ctx, () => Promise.resolve());
});

// Placeholder for Admins Management
inventoryManagementHandler.callbackQuery('inv:mgmt:admins', async (ctx) => {
  await ctx.answerCallbackQuery({
    text: '🚧 هذا القسم قيد الإنشاء.',
    show_alert: true,
  });
});

// Placeholder for Control and Settings
inventoryManagementHandler.callbackQuery('inv:mgmt:control', async (ctx) => {
  await ctx.answerCallbackQuery({
    text: '🚧 هذا القسم قيد الإنشاء.',
    show_alert: true,
  });
});