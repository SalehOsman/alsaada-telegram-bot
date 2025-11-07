/**
 * Previous Employee Filter Results Handler
 * معالج نتائج تصفية العاملين السابقين
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const employeePreviousFilterResultsHandler = new Composer<Context>()

/**
 * عرض العاملين السابقين حسب القسم
 */
employeePreviousFilterResultsHandler.callbackQuery(/^filter:prev:dept:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const departmentId = Number.parseInt(ctx.match[1])

    const department = await Database.prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      await ctx.answerCallbackQuery('⚠️ القسم غير موجود')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        departmentId,
        isActive: false,
        employmentStatus: {
          in: ['RESIGNED', 'TERMINATED', 'RETIRED', 'SETTLED'],
        },
      },
      include: {
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length
    const resignedCount = employees.filter(e => e.employmentStatus === 'RESIGNED').length
    const terminatedCount = employees.filter(e => e.employmentStatus === 'TERMINATED').length
    const retiredCount = employees.filter(e => e.employmentStatus === 'RETIRED').length

    let message = `🏢 **القسم: ${department.name}**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي العاملين السابقين: ${totalCount}\n`
    message += `• مستقيلين: ${resignedCount}\n`
    message += `• مفصولين: ${terminatedCount}\n`
    message += `• متقاعدين: ${retiredCount}\n\n`

    if (employees.length === 0) {
      message += '⚠️ لا يوجد عاملين سابقين في هذا القسم'
      
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'filter:prev:by-department')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة العاملين السابقين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤'
        : emp.employmentStatus === 'TERMINATED' ? '🚫'
        : emp.employmentStatus === 'RETIRED' ? '👴'
        : '💼'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'
      
      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:prev:dept:${departmentId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:prev:dept:${departmentId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📥 تصدير Excel', `export:prev:dept:${departmentId}`)
      .row()
      .text('⬅️ رجوع', 'filter:prev:by-department')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing previous department employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض العاملين السابقين حسب المحافظة
 */
employeePreviousFilterResultsHandler.callbackQuery(/^filter:prev:gov:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const governorateId = Number.parseInt(ctx.match[1])

    const governorate = await Database.prisma.governorate.findUnique({
      where: { id: governorateId },
    })

    if (!governorate) {
      await ctx.answerCallbackQuery('⚠️ المحافظة غير موجودة')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        governorateId,
        isActive: false,
        employmentStatus: {
          in: ['RESIGNED', 'TERMINATED', 'RETIRED', 'SETTLED'],
        },
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length
    const resignedCount = employees.filter(e => e.employmentStatus === 'RESIGNED').length

    let message = `📍 **المحافظة: ${governorate.nameAr}**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي العاملين السابقين: ${totalCount}\n`
    message += `• مستقيلين: ${resignedCount}\n\n`

    if (employees.length === 0) {
      message += '⚠️ لا يوجد عاملين سابقين في هذه المحافظة'
      
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'filter:prev:by-governorate')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة العاملين السابقين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤'
        : emp.employmentStatus === 'TERMINATED' ? '🚫'
        : emp.employmentStatus === 'RETIRED' ? '👴'
        : '💼'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'
      
      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:prev:gov:${governorateId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:prev:gov:${governorateId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📥 تصدير Excel', `export:prev:gov:${governorateId}`)
      .row()
      .text('⬅️ رجوع', 'filter:prev:by-governorate')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing previous governorate employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض العاملين السابقين حسب الوظيفة
 */
employeePreviousFilterResultsHandler.callbackQuery(/^filter:prev:pos:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const positionId = Number.parseInt(ctx.match[1])

    const position = await Database.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        department: true,
      },
    })

    if (!position) {
      await ctx.answerCallbackQuery('⚠️ الوظيفة غير موجودة')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        positionId,
        isActive: false,
        employmentStatus: {
          in: ['RESIGNED', 'TERMINATED', 'RETIRED', 'SETTLED'],
        },
      },
      include: {
        governorate: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length

    let message = `💼 **الوظيفة: ${position.titleAr}**\n`
    message += `🏢 **القسم: ${position.department.name}**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي العاملين السابقين: ${totalCount}\n\n`

    if (employees.length === 0) {
      message += '⚠️ لا يوجد عاملين سابقين في هذه الوظيفة'
      
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'filter:prev:by-position')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة العاملين السابقين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤'
        : emp.employmentStatus === 'TERMINATED' ? '🚫'
        : emp.employmentStatus === 'RETIRED' ? '👴'
        : '💼'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = position.titleAr
      
      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:prev:pos:${positionId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:prev:pos:${positionId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📥 تصدير Excel', `export:prev:pos:${positionId}`)
      .row()
      .text('⬅️ رجوع', 'filter:prev:by-position')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing previous position employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض العاملين السابقين حسب الحالة
 */
employeePreviousFilterResultsHandler.callbackQuery(/^filter:prev:status:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const status = ctx.match[1]

    const statusNames: Record<string, string> = {
      RESIGNED: 'مستقيل',
      TERMINATED: 'مفصول',
      RETIRED: 'متقاعد',
      SETTLED: 'مسوى',
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        employmentStatus: status as any,
        isActive: false,
      },
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length

    let message = `📊 **الحالة: ${statusNames[status] || status}**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي العاملين: ${totalCount}\n\n`

    if (employees.length === 0) {
      message += '⚠️ لا يوجد عاملين سابقين بهذه الحالة'
      
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'filter:prev:by-exit-reason')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة العاملين السابقين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤'
        : emp.employmentStatus === 'TERMINATED' ? '🚫'
        : emp.employmentStatus === 'RETIRED' ? '👴'
        : '💼'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'
      
      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:prev:status:${status}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:prev:status:${status}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📥 تصدير Excel', `export:prev:status:${status}`)
      .row()
      .text('⬅️ رجوع', 'filter:prev:by-exit-reason')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing previous status employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض جميع العاملين السابقين
 */
employeePreviousFilterResultsHandler.callbackQuery('filter:prev:all', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const employees = await Database.prisma.employee.findMany({
      where: {
        isActive: false,
        employmentStatus: {
          in: ['RESIGNED', 'TERMINATED', 'RETIRED', 'SETTLED'],
        },
      },
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length
    const resignedCount = employees.filter(e => e.employmentStatus === 'RESIGNED').length
    const terminatedCount = employees.filter(e => e.employmentStatus === 'TERMINATED').length
    const retiredCount = employees.filter(e => e.employmentStatus === 'RETIRED').length

    let message = `👥 **جميع العاملين السابقين**\n\n`
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي العاملين السابقين: ${totalCount}\n`
    message += `• مستقيلين: ${resignedCount}\n`
    message += `• مفصولين: ${terminatedCount}\n`
    message += `• متقاعدين: ${retiredCount}\n\n`

    if (employees.length === 0) {
      message += '⚠️ لا يوجد عاملين سابقين في النظام'
      
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:employees:view-previous')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة العاملين السابقين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'RESIGNED' ? '📤'
        : emp.employmentStatus === 'TERMINATED' ? '🚫'
        : emp.employmentStatus === 'RETIRED' ? '👴'
        : '💼'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'
      
      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:prev:all:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:prev:all:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📥 تصدير الكل Excel', 'export:previous-all')
      .row()
      .text('⬅️ رجوع', 'hr:employees:view-previous')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    logger.error({ error }, 'Error showing all previous employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})
