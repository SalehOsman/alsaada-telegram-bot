import type { Context } from '#root/bot/context.js'
import { logHandle } from '#root/bot/helpers/logging.js'
import { CompanyService } from '#root/modules/company/index.js'
import { GREETING_CONVERSATION } from '#root/modules/interaction/wizards/greeting.js'
import { JOIN_REQUEST_CONVERSATION } from '#root/modules/interaction/wizards/join-request.js'
import { Composer, InlineKeyboard, Keyboard } from 'grammy'

// Create TWO composers: one for specific handlers, one for generic text
const specificHandlers = new Composer<Context>()
const genericTextHandler = new Composer<Context>()

const feature = specificHandlers.chatType('private')

// Helper function to get role display name
function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: 'سوبر أدمن 👑',
    ADMIN: 'أدمن 🛡️',
    USER: 'مستخدم 👤',
    GUEST: 'زائر 👥',
    MODERATOR: 'مشرف 🔧',
  }
  return roleNames[role] || role
}

feature.command('start', logHandle('command-start'), async (ctx) => {
  // تأكد من تحميل بيانات المستخدم
  const userRole = ctx.dbUser?.role

  // إذا لم يكن هناك dbUser على الإطلاق، فهو زائر
  if (!ctx.dbUser || userRole === 'GUEST') {
    // رسالة للزوار - بدون keyboard
    const company = await CompanyService.get()
    const companyName = company?.name || 'الشركة'

    const inlineKeyboard = new InlineKeyboard()
      .text('📝 تقديم طلب انضمام', 'start:join-request')

    await ctx.reply(
      `👋 **مرحباً بك!**\n\n`
      + `هذا البوت الخاص بـ **${companyName}**\n\n`
      + `إذا كنت من موظفي الشركة، يمكنك تقديم طلب انضمام للحصول على صلاحيات الوصول.`,
      {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      },
    )
  }
  else {
    // رسالة للمستخدمين المسجلين
    const keyboard = new Keyboard()
      .text('📋 القائمة الرئيسية')
      .row()
    // فقط للسوبر ادمين زر الإعدادات
    if (userRole === 'SUPER_ADMIN') {
      keyboard.text('⚙️ الإعدادات')
    }

    keyboard.resized().persistent()

    await ctx.reply(ctx.t('welcome'), {
      reply_markup: keyboard,
    })

    // ✅ إشعار السوبر أدمن بالعقوبات المعلقة
    if (userRole === 'SUPER_ADMIN') {
      const { PenaltiesNotificationsService } = await import('#root/modules/services/penalties-notifications.service.js')
      // تمرير ctx فقط - الخدمة ستستخدم ctx.api للإرسال
      await PenaltiesNotificationsService.notifySuperAdminOnLogin(ctx)
    }
  }
})

// معالج زر طلب الانضمام
feature.callbackQuery('start:join-request', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter(JOIN_REQUEST_CONVERSATION)
})

// معالج زر الإعدادات (SUPER_ADMIN فقط)
feature.hears('⚙️ الإعدادات', async (ctx) => {
  const userRole = ctx.dbUser?.role

  if (userRole !== 'SUPER_ADMIN') {
    await ctx.reply('⛔ هذه الميزة متاحة فقط للمدير الأعلى')
    return
  }

  // عرض قائمة الإعدادات
  const settingsKeyboard = new InlineKeyboard()
    .text('🏢 بيانات الشركة', 'settings:company')
    .row()
    .text('🔧 إعدادات البوت', 'settings:bot')
    .row()
    .text('👥 إعدادات المستخدمين', 'settings:users')
    .row()
    .text('🎯 تفعيل/إيقاف الأقسام', 'settings:features')
    .row()
    .text('📊 التقارير والإحصائيات', 'menu:feature:reports-analytics')
    .row()
    .text('📁 إدارة الملفات', 'menu:feature:file-management')
    .row()
    .text('🛡️ الأمان والحماية', 'menu:feature:security-management')
    .row()
    .text('🔒 إعدادات الأمان', 'settings:security')
    .row()
    .text('📊 إعدادات قاعدة البيانات', 'settings:database')
    .row()
    .text('📝 إعدادات السجلات', 'settings:logging')
    .row()
    .text('🔔 إعدادات الإشعارات', 'settings:notifications')
    .row()
    .text('⚡ إعدادات الأداء', 'settings:performance')
    .row()
    .text('🌐 إعدادات اللغة', 'settings:language')
    .row()
    .text('🔙 رجوع', 'settings:close')

  await ctx.reply(
    '⚙️ **لوحة الإعدادات**\n\n' + 'اختر القسم الذي تريد تعديله:',
    {
      parse_mode: 'Markdown',
      reply_markup: settingsKeyboard,
    },
  )
})

// قسم إعدادات المستخدمين (SUPER_ADMIN فقط)
feature.callbackQuery('settings:users', async (ctx) => {
  const userRole = ctx.dbUser?.role

  if (userRole !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({ text: '⛔ هذه الميزة متاحة فقط للمدير الأعلى', show_alert: true })
    return
  }

  await ctx.answerCallbackQuery()

  const kb = new InlineKeyboard()
    .text('📋 قائمة المستخدمين', 'menu:sub:admin-panel:users-list')
    .row()
    .text('📝 طلبات الانضمام', 'menu:sub:admin-panel:join-requests')
    .row()
    .text('🚫 الحظر وإلغاء الحظر', 'menu:sub:admin-panel:ban-user')
    .row()
    .text('🔄 تغيير الأدوار', 'menu:sub:admin-panel:change-role')
    .row()
    .text('📜 سجل تغييرات الأعضاء', 'settings:users:audit')
    .row()
    .text('🔙 رجوع', 'settings:bot-back')

  await ctx.editMessageText(
    '👥 **إعدادات المستخدمين**\n\n'
    + 'تحكم كامل بجميع إعدادات المستخدمين:\n'
    + '• عرض وإدارة المستخدمين\n'
    + '• قبول/رفض طلبات الانضمام\n'
    + '• حظر وإلغاء الحظر\n'
    + '• تغيير الأدوار\n'
    + '• عرض سجل التغييرات',
    { parse_mode: 'Markdown', reply_markup: kb },
  )
})

// رجوع من إعدادات المستخدمين إلى لوحة الإعدادات
feature.callbackQuery('settings:bot-back', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userRole = ctx.dbUser?.role
  if (userRole !== 'SUPER_ADMIN') {
    await ctx.answerCallbackQuery({ text: '⛔ هذه الميزة متاحة فقط للمدير الأعلى', show_alert: true })
    return
  }

  const settingsKeyboard = new InlineKeyboard()
    .text('🏢 بيانات الشركة', 'settings:company')
    .row()
    .text('🔧 إعدادات البوت', 'settings:bot')
    .row()
    .text('👥 إعدادات المستخدمين', 'settings:users')
    .row()
    .text('🎯 تفعيل/إيقاف الأقسام', 'settings:features')
    .row()
    .text('📊 التقارير والإحصائيات', 'menu:feature:reports-analytics')
    .row()
    .text('📁 إدارة الملفات', 'menu:feature:file-management')
    .row()
    .text('🛡️ الأمان والحماية', 'menu:feature:security-management')
    .row()
    .text('🔒 إعدادات الأمان', 'settings:security')
    .row()
    .text('📊 إعدادات قاعدة البيانات', 'settings:database')
    .row()
    .text('📝 إعدادات السجلات', 'settings:logging')
    .row()
    .text('🔔 إعدادات الإشعارات', 'settings:notifications')
    .row()
    .text('⚡ إعدادات الأداء', 'settings:performance')
    .row()
    .text('🌐 إعدادات اللغة', 'settings:language')
    .row()
    .text('🔙 رجوع', 'settings:close')

  await ctx.editMessageText(
    '⚙️ **لوحة الإعدادات**\n\n'
    + 'اختر القسم الذي تريد تعديله:',
    { parse_mode: 'Markdown', reply_markup: settingsKeyboard },
  )
})

// عرض سجل تغييرات المستخدمين (آخر 10 عمليات)
feature.callbackQuery('settings:users:audit', async (ctx) => {
  await ctx.answerCallbackQuery()

  const { Database } = await import('#root/modules/database/index.js')
  const logs = await Database.prisma.auditLog.findMany({
    where: { model: 'User' },
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: { changedByUser: { select: { fullName: true, nickname: true, username: true } } },
  })

  if (!logs.length) {
    await ctx.editMessageText(
      '📜 **سجل تغييرات الأعضاء**\n\nلا توجد تغييرات مسجلة مؤخراً.',
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'settings:users') },
    )
    return
  }

  const lines = logs.map((l) => {
    const by = l.changedByUser?.fullName || l.changedByUser?.nickname || l.changedByUser?.username || 'غير معروف'
    const when = new Date(l.timestamp).toLocaleString('ar-EG')
    const field = l.fieldName ? `— ${l.fieldName}` : ''
    const change = l.oldValue || l.newValue ? `\nمن: ${l.oldValue ?? '-'}\nإلى: ${l.newValue ?? '-'}` : ''
    return `• ${when} — ${by}\n${l.action} ${field}${change}`
  })

  await ctx.editMessageText(
    `📜 **سجل تغييرات الأعضاء (آخر 10)**\n\n${lines.join('\n\n')}`,
    { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'settings:users') },
  )
})

// معالج زر لوحة التحكم (SUPER_ADMIN & ADMIN)
feature.hears('🛡️ لوحة التحكم', async (ctx) => {
  const userRole = ctx.dbUser?.role

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    await ctx.reply('⛔ هذه الميزة متاحة للمدراء فقط')
    return
  }

  // عرض قائمة لوحة التحكم
  const adminKeyboard = new InlineKeyboard()
    .text('👥 إدارة المستخدمين', 'menu:sub:admin-panel:users-list')
    .row()
    .text('📝 طلبات الانضمام', 'menu:sub:admin-panel:join-requests')
    .row()
    .text('📊 الإحصائيات', 'menu:sub:admin-panel:statistics')
    .row()

  // زر تغيير الأدوار للسوبر ادمن فقط
  if (userRole === 'SUPER_ADMIN') {
    adminKeyboard.text('🔄 تغيير الأدوار', 'menu:sub:admin-panel:change-role').row()
  }

  adminKeyboard
    .text('🚫 حظر/إلغاء حظر', 'menu:sub:admin-panel:ban-user')
    .row()
    .text('🔙 رجوع', 'admin:close')

  await ctx.reply(
    '🛡️ **لوحة التحكم**\n\n'
    + 'اختر الوظيفة المطلوبة:',
    {
      parse_mode: 'Markdown',
      reply_markup: adminKeyboard,
    },
  )
})

// معالج زر الملف الشخصي - فقط للكيبورد
feature.hears('👤 الملف الشخصي', async (ctx) => {
  // التحقق من أن الرسالة تأتي من زر الكيبورد وليس من النص
  if (ctx.message.text !== '👤 الملف الشخصي') {
    return
  }

  const userRole = ctx.dbUser?.role

  if (!ctx.dbUser || userRole === 'GUEST') {
    await ctx.reply('⛔ يجب عليك تقديم طلب انضمام أولاً.\n\nاستخدم /start للبدء.')
    return
  }

  try {
    // بناء رسالة الملف الشخصي
    let message = '👤 <b>الملف الشخصي</b>\n\n'

    // المعلومات الأساسية
    message += '<b>المعلومات الأساسية:</b>\n'
    message += `🆔 <b>المعرف:</b> ${ctx.dbUser.userId}\n`
    message += `📱 <b>Telegram ID:</b> <code>${ctx.from?.id}</code>\n`

    if (ctx.from?.username) {
      message += `👤 <b>اسم المستخدم:</b> @${ctx.from.username}\n`
    }

    if (ctx.from?.first_name || ctx.from?.last_name) {
      message += `📝 <b>الاسم:</b> ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}\n`
    }

    // معلومات العمل
    message += '\n<b>معلومات العمل:</b>\n'
    message += `🎭 <b>الدور:</b> ${getRoleDisplayName(userRole || 'GUEST')}\n`

    // حالة الحساب
    message += '\n<b>حالة الحساب:</b>\n'
    message += `✅ <b>الحالة:</b> نشط\n`

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل الملف الشخصي', 'profile:edit')
      .row()
      .text('🔐 تغيير كلمة المرور', 'profile:change-password')
      .row()
      .text('🔙 رجوع', 'menu:back')

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error showing profile:', error)
    await ctx.reply('❌ حدث خطأ أثناء عرض الملف الشخصي')
  }
})

// معالج زر القائمة الرئيسية
feature.hears('📋 القائمة الرئيسية', async (ctx) => {
  const userRole = ctx.dbUser?.role

  if (!ctx.dbUser || userRole === 'GUEST') {
    await ctx.reply('⛔ يجب عليك تقديم طلب انضمام أولاً.\n\nاستخدم /start للبدء.')
    return
  }

  try {
    // استيراد MenuBuilder و featureRegistry
    const { MenuBuilder } = await import('./registry/menu-builder.js')

    const keyboard = await MenuBuilder.buildMainMenu(ctx.dbUser, {
      maxButtonsPerRow: 1,
    })

    await ctx.reply('📋 **القائمة الرئيسية**\n\nاختر القسم المطلوب:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error showing main menu:', error)
    await ctx.reply('حدث خطأ أثناء عرض القائمة.')
  }
})

// معالج زر الرجوع للإعدادات
feature.callbackQuery('admin:close', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.deleteMessage()
})

// معالجات القائمة الرئيسية
feature.callbackQuery(/^menu:feature:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const match = ctx.match
    if (!match || !match[1])
      return

    const featureId = match[1]

    if (!ctx.dbUser) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
      return
    }

    // استيراد featureRegistry
    const { featureRegistry } = await import('./registry/feature-registry.js')
    const { MenuBuilder } = await import('./registry/menu-builder.js')
    const { PermissionService } = await import('#root/modules/permissions/permission-service.js')

    // Check if user can access this department using database
    const canAccess = await PermissionService.canAccessDepartment(ctx.dbUser, featureId)
    if (!canAccess) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول لهذا القسم')
      return
    }

    const feature = featureRegistry.get(featureId)
    if (!feature) {
      await ctx.answerCallbackQuery('⚠️ القسم غير موجود')
      return
    }

    // Build sub-menu (عرض الأقسام بعمود واحد)
    const singleColumnFeatures = ['hr-management', 'inventory-management']
    const keyboard = singleColumnFeatures.includes(featureId)
      ? await MenuBuilder.buildSubMenu(featureId, ctx.dbUser, {
        maxButtonsPerRow: 1,
        showBackButton: true,
        backButtonText: '⬅️ رجوع للقائمة الرئيسية',
      })
      : await MenuBuilder.buildSubMenu(featureId, ctx.dbUser)
    if (!keyboard) {
      await ctx.answerCallbackQuery('⚠️ لا توجد أقسام فرعية متاحة')
      return
    }

    // Custom descriptions for specific features
    let description: string | null = null
    if (featureId === 'hr-management') {
      description = '👥 **شئون العاملين**\n\nإدارة شاملة للموارد البشرية\n\n📌 الرجاء اختيار القسم المطلوب:'
    }
    else if (featureId === 'inventory-management') {
      description = '📦 **المخازن**\n\nإدارة شاملة للمخازن والأصول\n\n📌 الرجاء اختيار القسم المطلوب:'
    }
    else {
      description = MenuBuilder.getFeatureDescription(featureId)
    }

    await ctx.editMessageText(description || feature.config.name, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error handling feature selection:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

feature.callbackQuery(/^menu:sub:([^:]+):([^:]+)$/, async (ctx, next) => {
  try {
    const match = ctx.match
    if (!match || !match[1] || !match[2])
      return

    const featureId = match[1]
    const subFeatureId = match[2]

    if (!ctx.dbUser) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
      return
    }

    // استيراد featureRegistry
    const { featureRegistry } = await import('./registry/feature-registry.js')
    const { MenuBuilder } = await import('./registry/menu-builder.js')
    const { PermissionService } = await import('#root/modules/permissions/permission-service.js')

    // Build the correct sub-feature code for permission check
    // Format: "departmentPrefix:subFeatureId" (e.g., "hr:employees-list")
    const departmentPrefix = featureId.replace('-management', '') // "hr-management" → "hr"
    const subFeatureCode = `${departmentPrefix}:${subFeatureId}` // "hr:employees-list"

    // Check permissions using database with correct code format
    const canAccess = await PermissionService.canAccessSubFeature(ctx.dbUser, subFeatureCode)
    if (!canAccess) {
      await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول لهذا القسم')
      return
    }

    const subFeature = featureRegistry.getSubFeature(featureId, subFeatureId)
    if (!subFeature) {
      await ctx.answerCallbackQuery('⚠️ القسم الفرعي غير موجود')
      return
    }

    // If this sub-feature has its own handler, let downstream handlers process it
    if (subFeature.handler) {
      return next()
    }

    // Otherwise, show minimal fallback UI
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(
      `✅ تم اختيار: ${subFeature.name}`,
      {
        parse_mode: 'Markdown',
        reply_markup:
          (featureId === 'hr-management'
            ? await MenuBuilder.buildSubMenu(featureId, ctx.dbUser, {
              maxButtonsPerRow: 1,
              showBackButton: true,
              backButtonText: '⬅️ رجوع للقائمة الرئيسية',
            })
            : await MenuBuilder.buildSubMenu(featureId, ctx.dbUser)) || undefined,
      },
    )
  }
  catch (error) {
    console.error('Error handling sub-feature selection:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

feature.callbackQuery('menu:back', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    if (!ctx.dbUser) {
      await ctx.editMessageText('⛔ يجب عليك تقديم طلب انضمام أولاً.')
      return
    }

    const { MenuBuilder } = await import('./registry/menu-builder.js')
    const keyboard = await MenuBuilder.buildMainMenu(ctx.dbUser, {
      maxButtonsPerRow: 1,
    })

    await ctx.editMessageText('📋 **القائمة الرئيسية**\n\nاختر القسم المطلوب:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error handling back button:', error)
    await ctx.answerCallbackQuery('حدث خطأ')
  }
})

feature.command('greeting', logHandle('command-greeting'), (ctx) => {
  return ctx.conversation.enter(GREETING_CONVERSATION)
})

// معالج النص لتعديل الملف الشخصي - في generic handler منفصل
genericTextHandler.on('message:text', async (ctx, next) => {
  // ⚠️ CRITICAL: دع النماذج النشطة (مثل إضافة موظف) تعالج الرسائل أولاً
  // إذا لم يكن هناك حقل للتعديل، دع الـ handlers الأخرى تعالج الرسالة
  if (!ctx.session.profileEditField) {
    return next()
  }

  // التحقق من وجود المستخدم
  if (!ctx.dbUser) {
    return next()
  }

  const field = ctx.session.profileEditField
  const newValue = ctx.message.text

  // التحقق من إلغاء العملية
  if (newValue === '/cancel') {
    ctx.session.profileEditField = undefined
    await ctx.reply('❌ تم إلغاء العملية')
    return
  }

  // التحقق من صحة البيانات
  if (field === 'email' && newValue && !isValidEmail(newValue)) {
    await ctx.reply('❌ البريد الإلكتروني غير صحيح')
    return
  }

  if (field === 'phone' && newValue && !isValidPhone(newValue)) {
    await ctx.reply('❌ رقم الهاتف غير صحيح')
    return
  }

  try {
    // تحديث البيانات في قاعدة البيانات
    const { Database } = await import('#root/modules/database/index.js')
    await Database.prisma.user.update({
      where: { id: ctx.dbUser.userId },
      data: {
        [field]: newValue || null,
        updatedAt: new Date(),
      },
    })

    // مسح الحقل من الجلسة
    ctx.session.profileEditField = undefined

    const keyboard = new InlineKeyboard()
      .text('👁️ عرض الملف الشخصي', 'profile:view')
      .row()
      .text('✏️ تعديل حقل آخر', 'profile:edit')

    await ctx.reply(
      `✅ **تم تحديث ${getFieldDisplayName(field)} بنجاح!**\n\nالقيمة الجديدة: **${newValue}**`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Failed to update profile field:', error)
    await ctx.reply('❌ حدث خطأ أثناء حفظ البيانات')
  }
})

// Helper functions
function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    fullName: 'الاسم الكامل',
    nickname: 'اسم الشهرة',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    department: 'القسم',
    position: 'المنصب',
  }
  return fieldNames[field] || field
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[0-9\s\-()]{10,}$/
  return phoneRegex.test(phone)
}

export { specificHandlers as welcomeFeature, genericTextHandler as welcomeGenericHandler }
