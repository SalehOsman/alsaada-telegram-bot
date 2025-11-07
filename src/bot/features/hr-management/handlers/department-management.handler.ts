/**
 * إدارة قسم شئون العاملين
 * Department Management Handler
 *
 * وظيفة خاصة بالسوبر أدمن فقط لإدارة:
 * - تعيين الأدمن على القسم
 * - إزالة الأدمن من القسم
 * - تشغيل/إيقاف عرض القسم
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const departmentManagementHandler = new Composer<Context>()

const DEPARTMENT_CODE = 'hr-management'
const DEPARTMENT_NAME = 'شئون العاملين'

// ════════════════════════════════════════════════════════════
// 🏠 القائمة الرئيسية - إدارة قسم شئون العاملين
// ════════════════════════════════════════════════════════════
departmentManagementHandler.callbackQuery('hr:department:manage', async (ctx) => {
  await ctx.answerCallbackQuery()

  // التحقق من أن المستخدم سوبر أدمن
  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.reply('⛔️ هذه الميزة متاحة للسوبر أدمن فقط')
    return
  }

  await showDepartmentManagementMenu(ctx)
})

async function showDepartmentManagementMenu(ctx: any) {
  try {
    // جلب أو إنشاء إعدادات القسم
    let department = await Database.prisma.departmentConfig.findUnique({
      where: { code: DEPARTMENT_CODE },
      include: {
        admins: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                nickname: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
    })

    if (!department) {
      // إنشاء القسم إذا لم يكن موجوداً
      department = await Database.prisma.departmentConfig.create({
        data: {
          code: DEPARTMENT_CODE,
          name: DEPARTMENT_NAME,
          nameEn: 'HR Management',
          description: 'إدارة شاملة للموارد البشرية',
          isEnabled: true,
          icon: '👥',
          order: 2,
          createdBy: ctx.from?.id,
        },
        include: {
          admins: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  nickname: true,
                  username: true,
                  fullName: true,
                },
              },
            },
          },
        },
      })
    }

    // بناء الرسالة
    const statusIcon = department.isEnabled ? '✅' : '❌'
    const statusText = department.isEnabled ? 'مُفعّل' : 'مُعطّل'

    let message = `🏢 **إدارة قسم ${DEPARTMENT_NAME}**\n\n`
    message += `📊 **الحالة:** ${statusIcon} ${statusText}\n\n`

    // عرض الأدمن المعينين
    if (department.admins.length > 0) {
      message += `👥 **الأدمن المعينين على القسم:**\n\n`
      department.admins.forEach((admin, idx) => {
        const name = admin.user.nickname || admin.user.username || admin.user.fullName || `مستخدم ${admin.telegramId}`
        const assignedDate = admin.assignedAt.toLocaleDateString('ar-EG')
        message += `${idx + 1}. ${name}\n`
        message += `   📅 تاريخ التعيين: ${assignedDate}\n\n`
      })
    }
    else {
      message += `⚠️ **لا يوجد أدمن معين على القسم حالياً**\n\n`
    }

    // لوحة المفاتيح
    const keyboard = new InlineKeyboard()
      .text('➕ تعيين أدمن', 'hr:dept:assign-admin')
      .row()

    if (department.admins.length > 0) {
      keyboard
        .text('➖ إزالة أدمن', 'hr:dept:remove-admin')
        .row()
    }

    const toggleText = department.isEnabled ? '🔴 إيقاف القسم' : '🟢 تشغيل القسم'
    keyboard
      .text(toggleText, 'hr:dept:toggle-status')
      .row()
      .text('⬅️ رجوع', 'menu:sub:hr-management')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing department management menu:', error)
    await ctx.reply('❌ حدث خطأ في عرض القائمة')
  }
}

// ════════════════════════════════════════════════════════════
// ➕ تعيين أدمن على القسم
// ════════════════════════════════════════════════════════════
departmentManagementHandler.callbackQuery('hr:dept:assign-admin', async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.reply('⛔️ هذه الميزة متاحة للسوبر أدمن فقط')
    return
  }

  try {
    // جلب جميع الأدمن الذين لم يتم تعيينهم بعد
    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: DEPARTMENT_CODE },
      include: {
        admins: {
          where: { isActive: true },
          select: { userId: true },
        },
      },
    })

    if (!department) {
      await ctx.reply('❌ القسم غير موجود')
      return
    }

    const assignedUserIds = department.admins.map(a => a.userId)

    const availableAdmins = await Database.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        id: { notIn: assignedUserIds },
      },
      select: {
        id: true,
        telegramId: true,
        nickname: true,
        username: true,
        fullName: true,
        role: true,
      },
      orderBy: {
        nickname: 'asc',
      },
    })

    if (availableAdmins.length === 0) {
      await ctx.editMessageText(
        '⚠️ **لا يوجد أدمن متاحين للتعيين**\n\nجميع الأدمن معينين على القسم بالفعل.',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'hr:department:manage'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    let message = `👥 **اختر الأدمن للتعيين على قسم ${DEPARTMENT_NAME}**\n\n`
    message += `📋 الأدمن المتاحين: ${availableAdmins.length}\n\n`

    const keyboard = new InlineKeyboard()

    availableAdmins.forEach((admin) => {
      const name = admin.nickname || admin.username || admin.fullName || `مستخدم ${admin.telegramId}`
      const roleIcon = admin.role === 'SUPER_ADMIN' ? '👑' : '👤'
      keyboard
        .text(`${roleIcon} ${name}`, `hr:dept:assign:${admin.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', 'hr:department:manage')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing assign admin menu:', error)
    await ctx.reply('❌ حدث خطأ')
  }
})

// تأكيد التعيين
departmentManagementHandler.callbackQuery(/^hr:dept:assign:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    return
  }

  try {
    const userId = Number.parseInt(ctx.match![1])

    const user = await Database.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        nickname: true,
        username: true,
        fullName: true,
        role: true,
      },
    })

    if (!user) {
      await ctx.reply('❌ المستخدم غير موجود')
      return
    }

    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: DEPARTMENT_CODE },
    })

    if (!department) {
      await ctx.reply('❌ القسم غير موجود')
      return
    }

    // التحقق من أن المستخدم غير معين مسبقاً
    const existingAssignment = await Database.prisma.departmentAdmin.findUnique({
      where: {
        departmentId_userId: {
          departmentId: department.id,
          userId: user.id,
        },
      },
    })

    if (existingAssignment && existingAssignment.isActive) {
      await ctx.reply('⚠️ هذا الأدمن معين بالفعل على القسم')
      return
    }

    // تعيين الأدمن
    if (existingAssignment) {
      // إعادة تفعيل التعيين السابق
      await Database.prisma.departmentAdmin.update({
        where: { id: existingAssignment.id },
        data: {
          isActive: true,
          assignedBy: ctx.from!.id,
          assignedAt: new Date(),
        },
      })
    }
    else {
      // إنشاء تعيين جديد
      await Database.prisma.departmentAdmin.create({
        data: {
          departmentId: department.id,
          userId: user.id,
          telegramId: user.telegramId,
          assignedBy: ctx.from!.id,
          isActive: true,
        },
      })
    }

    const name = user.nickname || user.username || user.fullName || `مستخدم ${user.telegramId}`
    const roleIcon = user.role === 'SUPER_ADMIN' ? '👑' : '👤'

    await ctx.editMessageText(
      `✅ **تم التعيين بنجاح!**\n\n${roleIcon} تم تعيين **${name}** كأدمن على قسم **${DEPARTMENT_NAME}**`,
      {
        reply_markup: new InlineKeyboard().text('✅ العودة للقائمة', 'hr:department:manage'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error assigning admin:', error)
    await ctx.reply('❌ حدث خطأ في التعيين')
  }
})

// ════════════════════════════════════════════════════════════
// ➖ إزالة أدمن من القسم
// ════════════════════════════════════════════════════════════
departmentManagementHandler.callbackQuery('hr:dept:remove-admin', async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.reply('⛔️ هذه الميزة متاحة للسوبر أدمن فقط')
    return
  }

  try {
    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: DEPARTMENT_CODE },
      include: {
        admins: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                nickname: true,
                username: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!department || department.admins.length === 0) {
      await ctx.editMessageText(
        '⚠️ **لا يوجد أدمن معين على القسم**',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'hr:department:manage'),
          parse_mode: 'Markdown',
        },
      )
      return
    }

    let message = `➖ **اختر الأدمن لإزالته من قسم ${DEPARTMENT_NAME}**\n\n`

    const keyboard = new InlineKeyboard()

    department.admins.forEach((admin) => {
      const name = admin.user.nickname || admin.user.username || admin.user.fullName || `مستخدم ${admin.telegramId}`
      const roleIcon = admin.user.role === 'SUPER_ADMIN' ? '👑' : '👤'
      keyboard
        .text(`${roleIcon} ${name}`, `hr:dept:remove:${admin.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', 'hr:department:manage')

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
  catch (error) {
    console.error('Error showing remove admin menu:', error)
    await ctx.reply('❌ حدث خطأ')
  }
})

// تأكيد الإزالة
departmentManagementHandler.callbackQuery(/^hr:dept:remove:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    return
  }

  try {
    const assignmentId = Number.parseInt(ctx.match![1])

    const assignment = await Database.prisma.departmentAdmin.findUnique({
      where: { id: assignmentId },
      include: {
        user: {
          select: {
            nickname: true,
            username: true,
            fullName: true,
            telegramId: true,
            role: true,
          },
        },
      },
    })

    if (!assignment) {
      await ctx.reply('❌ التعيين غير موجود')
      return
    }

    // إلغاء التفعيل بدلاً من الحذف (للاحتفاظ بالسجل)
    await Database.prisma.departmentAdmin.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    const name = assignment.user.nickname || assignment.user.username || assignment.user.fullName || `مستخدم ${assignment.telegramId}`
    const roleIcon = assignment.user.role === 'SUPER_ADMIN' ? '👑' : '👤'

    await ctx.editMessageText(
      `✅ **تمت الإزالة بنجاح!**\n\n${roleIcon} تم إزالة **${name}** من قسم **${DEPARTMENT_NAME}**`,
      {
        reply_markup: new InlineKeyboard().text('✅ العودة للقائمة', 'hr:department:manage'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error removing admin:', error)
    await ctx.reply('❌ حدث خطأ في الإزالة')
  }
})

// ════════════════════════════════════════════════════════════
// 🔄 تشغيل/إيقاف القسم
// ════════════════════════════════════════════════════════════
departmentManagementHandler.callbackQuery('hr:dept:toggle-status', async (ctx) => {
  await ctx.answerCallbackQuery()

  if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
    await ctx.reply('⛔️ هذه الميزة متاحة للسوبر أدمن فقط')
    return
  }

  try {
    const department = await Database.prisma.departmentConfig.findUnique({
      where: { code: DEPARTMENT_CODE },
    })

    if (!department) {
      await ctx.reply('❌ القسم غير موجود')
      return
    }

    const newStatus = !department.isEnabled

    await Database.prisma.departmentConfig.update({
      where: { code: DEPARTMENT_CODE },
      data: {
        isEnabled: newStatus,
        updatedBy: ctx.from?.id,
      },
    })

    const statusIcon = newStatus ? '✅' : '❌'
    const statusText = newStatus ? 'تم التشغيل' : 'تم الإيقاف'
    const actionText = newStatus ? 'تشغيل' : 'إيقاف'

    await ctx.editMessageText(
      `${statusIcon} **${statusText} بنجاح!**\n\nتم ${actionText} قسم **${DEPARTMENT_NAME}**\n\n${newStatus ? '✅ القسم الآن مفعّل ومتاح لجميع الأدمن المعينين' : '❌ القسم الآن معطّل ولن يظهر في القوائم'}`,
      {
        reply_markup: new InlineKeyboard().text('✅ العودة للقائمة', 'hr:department:manage'),
        parse_mode: 'Markdown',
      },
    )
  }
  catch (error) {
    console.error('Error toggling department status:', error)
    await ctx.reply('❌ حدث خطأ في تغيير الحالة')
  }
})
