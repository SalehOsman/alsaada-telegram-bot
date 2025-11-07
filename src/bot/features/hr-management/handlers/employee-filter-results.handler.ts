/**
 * Employee Filter Results Handler
 * معالج عرض نتائج الفلاتر
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer, InlineKeyboard } from 'grammy'

const employeeFilterResultsHandler = new Composer<Context>()

// ============================================
// دالة لإضافة أيقونة حالة الموظف بجواره
// ============================================
function _getEmployeeStatusIcon(status: string): string {
  const statusIcons: Record<string, string> = {
    ACTIVE: '✅',
    ON_LEAVE: '🏖️',
    ON_MISSION: '✈️',
    SUSPENDED: '⏸️',
  }
  return statusIcons[status] || '❓'
}

// ============================================
// دالة لعرض الإحصائيات مع دليل الأيقونات
// ============================================
function _getStatsWithLegend(totalCount: number, activeCount: number, onLeaveCount: number, onMissionCount?: number): string {
  let stats = '📊 **الإحصائيات:**\n'
  stats += `• إجمالي الموظفين: ${totalCount}\n`
  stats += `• ✅ نشطين: ${activeCount}\n`
  stats += `• 🏖️ في إجازة: ${onLeaveCount}\n`
  if (onMissionCount !== undefined) {
    stats += `• ✈️ في مأمورية: ${onMissionCount}\n`
  }
  stats += '\n'
  return stats
}

/**
 * عرض الموظفين حسب القسم
 */
employeeFilterResultsHandler.callbackQuery(/^filter:dept:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const departmentId = Number.parseInt(ctx.match[1])

    const department = await Database.prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      await ctx.answerCallbackQuery('لم يُعثر على القسم')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        departmentId,
        isActive: true,
      },
      include: {
        position: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    // Statistics
    const totalCount = employees.length
    const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
    const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
    const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

    let message = `🏢 **القسم: ${department.name}**\n\n`

    // إضافة الإحصائيات مع الدليل
    message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

    if (employees.length === 0) {
      message += 'لا يوجد موظفون في هذا القسم'

      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'filter:by-department')

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
      return
    }

    // Build clickable employee list (max 20 per page)
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
      const displayName = emp.nickname || emp.fullName
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${statusIcon} ${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:dept:${departmentId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:dept:${departmentId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📊 تصدير Excel', `export:dept:${departmentId}`)
      .row()
      .text('🔍 بحث بالاسم', `filter:dept:${departmentId}:search`)
      .row()
      .text('🔙 رجوع', 'filter:by-department')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Save filter for export
    ctx.session.lastFilter = {
      type: 'department',
      value: departmentId,
      name: department.name,
    }
  }
  catch (error) {
    logger.error({ error }, 'Error showing department employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض الموظفين حسب المحافظة
 */
employeeFilterResultsHandler.callbackQuery(/^filter:gov:(\d+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const governorateId = Number.parseInt(ctx.match[1])

    const governorate = await Database.prisma.governorate.findUnique({
      where: { id: governorateId },
    })

    if (!governorate) {
      await ctx.answerCallbackQuery('لم تُعثر على المحافظة')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        governorateId,
        isActive: true,
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    })

    // Statistics
    const totalCount = employees.length
    const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
    const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
    const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length
    const departmentCounts = employees.reduce((acc, emp) => {
      const deptName = emp.department?.name || 'غير محدد'
      acc[deptName] = (acc[deptName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let message = `📍 **المحافظة: ${governorate.nameAr}**\n\n`

    // إضافة الإحصائيات مع الدليل
    message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

    message += `🏢 **توزيع الأقسام:**\n`
    // عرض جميع الأقسام بدون اختصار
    const sortedDepartments = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])
    sortedDepartments.forEach(([dept, count]) => {
      message += `• ${dept}: ${count}\n`
    })
    message += '\n'

    if (employees.length === 0) {
      message += 'لا يوجد موظفون في هذه المحافظة'

      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'filter:by-governorate')

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

    message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
      const displayName = emp.nickname || emp.fullName
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${statusIcon} ${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:gov:${governorateId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:gov:${governorateId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📊 تصدير Excel', `export:gov:${governorateId}`)
      .row()
      .text('🔍 بحث بالاسم', `filter:gov:${governorateId}:search`)
      .row()
      .text('🔙 رجوع', 'filter:by-governorate')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Save filter for export
    ctx.session.lastFilter = {
      type: 'governorate',
      value: governorateId,
      name: governorate.nameAr,
    }
  }
  catch (error) {
    logger.error({ error }, 'Error showing governorate employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض الموظفين حسب المنصب
 */
employeeFilterResultsHandler.callbackQuery(/^filter:pos:(\d+)$/, async (ctx) => {
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
      await ctx.answerCallbackQuery('لم يُعثر على المنصب')
      return
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        positionId,
        isActive: true,
      },
      include: {
        governorate: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length
    const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
    const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
    const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

    let message = `💼 **المنصب: ${position.titleAr}**\n`
    message += `🏢 **القسم: ${position.department.name}**\n\n`

    // إضافة الإحصائيات مع الدليل
    message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

    if (employees.length === 0) {
      message += 'لا يوجد موظفون في هذا المنصب'

      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'filter:by-position')

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

    message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
      const displayName = emp.nickname || emp.fullName
      const positionTitle = position.titleAr

      keyboard.text(
        `${statusIcon} ${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:pos:${positionId}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:pos:${positionId}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📊 تصدير Excel', `export:pos:${positionId}`)
      .row()
      .text('🔍 بحث بالاسم', `filter:pos:${positionId}:search`)
      .row()
      .text('🔙 رجوع', 'filter:by-position')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Save filter for export
    ctx.session.lastFilter = {
      type: 'position',
      value: positionId,
      name: position.titleAr,
    }
  }
  catch (error) {
    logger.error({ error }, 'Error showing position employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض الموظفين حسب الحالة
 */
employeeFilterResultsHandler.callbackQuery(/^filter:status:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const status = ctx.match[1]

    const statusNames: Record<string, string> = {
      ACTIVE: 'نشط',
      ON_LEAVE: 'في إجازة',
      SUSPENDED: 'موقوف',
      RESIGNED: 'مستقيل',
      TERMINATED: 'مفصول',
      RETIRED: 'متقاعد',
      ON_MISSION: 'في مأمورية',
      SETTLED: 'مصفى',
    }

    const employees = await Database.prisma.employee.findMany({
      where: {
        employmentStatus: status as any,
        isActive: true,
      },
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    const totalCount = employees.length

    // Department distribution
    const departmentCounts = employees.reduce((acc, emp) => {
      const deptName = emp.department?.name || 'غير محدد'
      acc[deptName] = (acc[deptName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let message = `📋 **الحالة: ${statusNames[status] || status}**\n\n`

    // إحصائيات بسيطة (بدون دليل أيقونات لأننا في حالة واحدة)
    message += `📊 **الإحصائيات:**\n`
    message += `• إجمالي الموظفين: ${totalCount}\n\n`

    if (totalCount > 0) {
      message += `🏢 **توزيع الأقسام:**\n`
      // عرض جميع الأقسام بدون اختصار
      const sortedDepartments = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])
      sortedDepartments.forEach(([dept, count]) => {
        message += `• ${dept}: ${count}\n`
      })
      message += '\n'
    }

    if (employees.length === 0) {
      message += 'لا يوجد موظفون بهذه الحالة'

      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'filter:by-status')

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

    message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
      const displayName = emp.nickname || emp.fullName
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${statusIcon} ${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:status:${status}:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:status:${status}:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📊 تصدير Excel', `export:status:${status}`)
      .row()
      .text('🔍 بحث بالاسم', `filter:status:${status}:search`)
      .row()
      .text('🔙 رجوع', 'filter:by-status')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Save filter for export
    ctx.session.lastFilter = {
      type: 'status',
      value: status,
      name: statusNames[status],
    }
  }
  catch (error) {
    logger.error({ error }, 'Error showing status employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * عرض جميع الموظفين (بدون فلتر)
 */
employeeFilterResultsHandler.callbackQuery('filter:all', async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const employees = await Database.prisma.employee.findMany({
      where: {
        isActive: true,
      },
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: { fullName: 'asc' },
    })

    // حساب الموظفين في إجازة من جدول الإجازات
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const currentLeaves = await Database.prisma.hR_EmployeeLeave.findMany({
      where: {
        isActive: true,
        status: 'PENDING',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        employeeId: true,
      },
    })

    const employeesOnLeaveIds = new Set(currentLeaves.map(l => l.employeeId))

    const totalCount = employees.length
    const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
    const onLeaveCount = employeesOnLeaveIds.size
    const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length
    const suspendedCount = employees.filter(e => e.employmentStatus === 'SUSPENDED').length

    // Department distribution
    const departmentCounts = employees.reduce((acc, emp) => {
      const deptName = emp.department?.name || 'غير محدد'
      acc[deptName] = (acc[deptName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let message = `👥 **جميع الموظفين**\n\n`

    // إضافة الإحصائيات مع الدليل (الأقسام فقط، والموقوفين)
    message += `📊 **الإحصائيات العامة:**\n`
    message += `• إجمالي الموظفين: ${totalCount}\n`
    message += `• ✅ نشطين: ${activeCount}\n`
    message += `• 🏖️ في إجازة: ${onLeaveCount}\n`
    message += `• ✈️ في مأمورية: ${onMissionCount}\n`
    message += `• ⏸️ موقوفين: ${suspendedCount}\n\n`

    message += `🏢 **توزيع الأقسام:**\n`
    // عرض جميع الأقسام بدون اختصار
    const sortedDepartments = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])
    sortedDepartments.forEach(([dept, count]) => {
      message += `• ${dept}: ${count}\n`
    })
    message += '\n'

    if (employees.length === 0) {
      message += 'لا يوجد موظفون في النظام'

      const keyboard = new InlineKeyboard()
        .text('🔙 رجوع', 'employeesListHandler')

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

    message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      // تحديد أيقونة الحالة - إذا كان في إجازة فعلية، استخدم أيقونة الإجازة
      let statusIcon: string
      if (employeesOnLeaveIds.has(emp.id)) {
        statusIcon = '🏖️'
      }
      else {
        statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
      }

      const displayName = emp.nickname || emp.fullName
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${statusIcon} ${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination if needed
    if (totalPages > 1) {
      const paginationRow: any[] = []
      if (page > 1) {
        paginationRow.push({ text: '◀️ السابق', callback_data: `filter:all:page:${page - 1}` })
      }
      paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
      if (page < totalPages) {
        paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:all:page:${page + 1}` })
      }
      keyboard.row(...paginationRow)
    }

    keyboard
      .text('📊 تصدير كملف Excel', 'export:all-employees')
      .row()
      .text('🔍 بحث بالاسم', 'filter:all:search')
      .row()
      .text('🔙 رجوع', 'employeesListHandler')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Save filter for export
    ctx.session.lastFilter = {
      type: 'all',
      value: null,
      name: 'جميع الموظفين',
    }
  }
  catch (error) {
    logger.error({ error }, 'Error showing all employees')
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

/**
 * معالجات البحث عن الموظفين
 */

// البحث في قائمة القسم
employeeFilterResultsHandler.callbackQuery(/^filter:dept:(\d+):search$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const departmentId = Number.parseInt(ctx.match[1])

  const department = await Database.prisma.department.findUnique({
    where: { id: departmentId },
  })

  if (!department) {
    await ctx.answerCallbackQuery('لم يُعثر على القسم')
    return
  }

  await ctx.editMessageText(
    `🔍 **البحث في القسم: ${department.name}**\n\n`
    + `فضلا أدخل الاسم أو جزء من اسم العامل:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', `filter:dept:${departmentId}`),
    },
  )

  ctx.session.employeeSearch = {
    filterType: 'department',
    filterId: departmentId,
  }
})

// البحث في قائمة المحافظة
employeeFilterResultsHandler.callbackQuery(/^filter:gov:(\d+):search$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const governorateId = Number.parseInt(ctx.match[1])

  const governorate = await Database.prisma.governorate.findUnique({
    where: { id: governorateId },
  })

  if (!governorate) {
    await ctx.answerCallbackQuery('لم يُعثر على المحافظة')
    return
  }

  await ctx.editMessageText(
    `🔍 **البحث في المحافظة: ${governorate.nameAr}**\n\n`
    + `فضلا أدخل الاسم أو جزء من اسم العامل:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', `filter:gov:${governorateId}`),
    },
  )

  ctx.session.employeeSearch = {
    filterType: 'governorate',
    filterId: governorateId,
  }
})

// البحث في قائمة الوظيفة
employeeFilterResultsHandler.callbackQuery(/^filter:pos:(\d+):search$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match[1])

  const position = await Database.prisma.position.findUnique({
    where: { id: positionId },
  })

  if (!position) {
    await ctx.answerCallbackQuery('لم يُعثر على الوظيفة')
    return
  }

  await ctx.editMessageText(
    `🔍 **البحث في الوظيفة: ${position.titleAr}**\n\n`
    + `فضلا أدخل الاسم أو جزء من اسم العامل:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', `filter:pos:${positionId}`),
    },
  )

  ctx.session.employeeSearch = {
    filterType: 'position',
    filterId: positionId,
  }
})

// البحث في قائمة الحالة
employeeFilterResultsHandler.callbackQuery(/^filter:status:(.+):search$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const status = ctx.match[1]

  const statusNames: Record<string, string> = {
    ACTIVE: 'نشط',
    ON_LEAVE: 'في إجازة',
    SUSPENDED: 'موقوف',
    ON_MISSION: 'في مأمورية',
  }

  await ctx.editMessageText(
    `🔍 **البحث في الحالة: ${statusNames[status] || status}**\n\n`
    + `فضلا أدخل الاسم أو جزء من اسم العامل:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', `filter:status:${status}`),
    },
  )

  ctx.session.employeeSearch = {
    filterType: 'status',
    filterValue: status,
  }
})

// البحث في قائمة العاملين
employeeFilterResultsHandler.callbackQuery('filter:all:search', async (ctx) => {
  await ctx.answerCallbackQuery()

  await ctx.editMessageText(
    `🔍 **البحث في قائمة العاملين**\n\n`
    + `فضلا أدخل الاسم أو جزء من اسم العامل:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'filter:all'),
    },
  )

  ctx.session.employeeSearch = {
    filterType: 'all',
  }
})

// ============================================
// Pagination Handlers
// ============================================

// Department pagination
employeeFilterResultsHandler.callbackQuery(/^filter:dept:(\d+):page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const departmentId = Number.parseInt(ctx.match[1])
  const page = Number.parseInt(ctx.match[2])

  const department = await Database.prisma.department.findUnique({
    where: { id: departmentId },
  })

  if (!department) {
    await ctx.answerCallbackQuery('لم يُعثر على القسم')
    return
  }

  const employees = await Database.prisma.employee.findMany({
    where: {
      departmentId,
      isActive: true,
    },
    include: {
      position: true,
      governorate: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const totalCount = employees.length
  const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
  const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
  const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

  let message = `🏢 **القسم: ${department.name}**\n\n`

  // إضافة الإحصائيات مع الدليل
  message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

  const itemsPerPage = 20
  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

  const keyboard = new InlineKeyboard()

  currentPageEmployees.forEach((emp) => {
    const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
    const displayName = emp.nickname || emp.fullName
    const positionTitle = emp.position?.titleAr || 'غير محدد'

    keyboard.text(
      `${statusIcon} ${displayName} (${positionTitle})`,
      `hr:employee:details:${emp.id}`,
    ).row()
  })

  if (totalPages > 1) {
    const paginationRow: any[] = []
    if (page > 1) {
      paginationRow.push({ text: '◀️ السابق', callback_data: `filter:dept:${departmentId}:page:${page - 1}` })
    }
    paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:dept:${departmentId}:page:${page + 1}` })
    }
    keyboard.row(...paginationRow)
  }

  keyboard
    .text('🔍 بحث بالاسم', `filter:dept:${departmentId}:search`)
    .row()
    .text('📊 تصدير Excel', `export:dept:${departmentId}`)
    .text('🔙 رجوع', 'filter:by-department')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// Governorate pagination
employeeFilterResultsHandler.callbackQuery(/^filter:gov:(\d+):page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const governorateId = Number.parseInt(ctx.match[1])
  const page = Number.parseInt(ctx.match[2])

  const governorate = await Database.prisma.governorate.findUnique({
    where: { id: governorateId },
  })

  if (!governorate) {
    await ctx.answerCallbackQuery('لم تُعثر على المحافظة')
    return
  }

  const employees = await Database.prisma.employee.findMany({
    where: {
      governorateId,
      isActive: true,
    },
    include: {
      position: true,
      department: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const totalCount = employees.length
  const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
  const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
  const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

  let message = `📍 **المحافظة: ${governorate.nameAr}**\n\n`

  // إضافة الإحصائيات مع الدليل
  message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

  const itemsPerPage = 20
  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

  const keyboard = new InlineKeyboard()

  currentPageEmployees.forEach((emp) => {
    const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
    const displayName = emp.nickname || emp.fullName
    const positionTitle = emp.position?.titleAr || 'غير محدد'

    keyboard.text(
      `${statusIcon} ${displayName} (${positionTitle})`,
      `hr:employee:details:${emp.id}`,
    ).row()
  })

  if (totalPages > 1) {
    const paginationRow: any[] = []
    if (page > 1) {
      paginationRow.push({ text: '◀️ السابق', callback_data: `filter:gov:${governorateId}:page:${page - 1}` })
    }
    paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:gov:${governorateId}:page:${page + 1}` })
    }
    keyboard.row(...paginationRow)
  }

  keyboard
    .text('🔍 بحث بالاسم', `filter:gov:${governorateId}:search`)
    .row()
    .text('📊 تصدير Excel', `export:gov:${governorateId}`)
    .text('🔙 رجوع', 'filter:by-governorate')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// Position pagination
employeeFilterResultsHandler.callbackQuery(/^filter:pos:(\d+):page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match[1])
  const page = Number.parseInt(ctx.match[2])

  const position = await Database.prisma.position.findUnique({
    where: { id: positionId },
    include: {
      department: true,
    },
  })

  if (!position) {
    await ctx.answerCallbackQuery('لم يُعثر على المنصب')
    return
  }

  const employees = await Database.prisma.employee.findMany({
    where: {
      positionId,
      isActive: true,
    },
    include: {
      position: true,
      governorate: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const totalCount = employees.length
  const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
  const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
  const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

  let message = `💼 **المنصب: ${position.titleAr}**\n`
  message += `🏢 **القسم: ${position.department.name}**\n\n`

  // إضافة الإحصائيات مع الدليل
  message += _getStatsWithLegend(totalCount, activeCount, onLeaveCount, onMissionCount)

  const itemsPerPage = 20
  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

  const keyboard = new InlineKeyboard()

  currentPageEmployees.forEach((emp) => {
    const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
    const displayName = emp.nickname || emp.fullName
    const positionTitle = emp.position?.titleAr || 'غير محدد'

    keyboard.text(
      `${statusIcon} ${displayName} (${positionTitle})`,
      `hr:employee:details:${emp.id}`,
    ).row()
  })

  if (totalPages > 1) {
    const paginationRow: any[] = []
    if (page > 1) {
      paginationRow.push({ text: '◀️ السابق', callback_data: `filter:pos:${positionId}:page:${page - 1}` })
    }
    paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:pos:${positionId}:page:${page + 1}` })
    }
    keyboard.row(...paginationRow)
  }

  keyboard
    .text('🔍 بحث بالاسم', `filter:pos:${positionId}:search`)
    .row()
    .text('📊 تصدير Excel', `export:pos:${positionId}`)
    .text('🔙 رجوع', 'filter:by-position')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// Status pagination
employeeFilterResultsHandler.callbackQuery(/^filter:status:(.+):page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const status = ctx.match[1]
  const page = Number.parseInt(ctx.match[2])

  const statusNames: Record<string, string> = {
    ACTIVE: 'نشط',
    ON_LEAVE: 'في إجازة',
    SUSPENDED: 'موقوف',
    RESIGNED: 'مستقيل',
    TERMINATED: 'مفصول',
    RETIRED: 'متقاعد',
    ON_MISSION: 'في مأمورية',
    SETTLED: 'مصفى',
  }

  const employees = await Database.prisma.employee.findMany({
    where: {
      employmentStatus: status as any,
      isActive: true,
    },
    include: {
      position: true,
      department: true,
      governorate: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const totalCount = employees.length

  let message = `📋 **الحالة: ${statusNames[status] || status}**\n\n`
  message += `📊 **الإحصائيات:**\n`
  message += `• إجمالي الموظفين: ${totalCount}\n\n`

  const itemsPerPage = 20
  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

  const keyboard = new InlineKeyboard()

  currentPageEmployees.forEach((emp) => {
    const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
    const displayName = emp.nickname || emp.fullName
    const positionTitle = emp.position?.titleAr || 'غير محدد'

    keyboard.text(
      `${statusIcon} ${displayName} (${positionTitle})`,
      `hr:employee:details:${emp.id}`,
    ).row()
  })

  if (totalPages > 1) {
    const paginationRow: any[] = []
    if (page > 1) {
      paginationRow.push({ text: '◀️ السابق', callback_data: `filter:status:${status}:page:${page - 1}` })
    }
    paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:status:${status}:page:${page + 1}` })
    }
    keyboard.row(...paginationRow)
  }

  keyboard
    .text('🔍 بحث بالاسم', `filter:status:${status}:search`)
    .row()
    .text('📊 تصدير Excel', `export:status:${status}`)
    .text('🔙 رجوع', 'filter:by-status')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

// All employees pagination
employeeFilterResultsHandler.callbackQuery(/^filter:all:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1])

  const employees = await Database.prisma.employee.findMany({
    where: {
      isActive: true,
    },
    include: {
      position: true,
      department: true,
      governorate: true,
    },
    orderBy: { fullName: 'asc' },
  })

  const totalCount = employees.length
  const activeCount = employees.filter(e => e.employmentStatus === 'ACTIVE').length
  const onLeaveCount = employees.filter(e => e.employmentStatus === 'ON_LEAVE').length
  const onMissionCount = employees.filter(e => e.employmentStatus === 'ON_MISSION').length

  let message = `👥 **جميع الموظفين**\n\n`

  // إضافة الإحصائيات مع الدليل
  message += `📊 **الإحصائيات:**\n`
  message += `• إجمالي الموظفين: ${totalCount}\n`
  message += `• ✅ نشطين: ${activeCount}\n`
  message += `• 🏖️ في إجازة: ${onLeaveCount}\n`
  message += `• ✈️ في مأمورية: ${onMissionCount}\n\n`

  const itemsPerPage = 20
  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  message += `👥 **قائمة الموظفين** (صفحة ${page}/${totalPages}):\n\n`

  const keyboard = new InlineKeyboard()

  currentPageEmployees.forEach((emp) => {
    const statusIcon = _getEmployeeStatusIcon(emp.employmentStatus)
    const displayName = emp.nickname || emp.fullName
    const positionTitle = emp.position?.titleAr || 'غير محدد'

    keyboard.text(
      `${statusIcon} ${displayName} (${positionTitle})`,
      `hr:employee:details:${emp.id}`,
    ).row()
  })

  if (totalPages > 1) {
    const paginationRow: any[] = []
    if (page > 1) {
      paginationRow.push({ text: '◀️ السابق', callback_data: `filter:all:page:${page - 1}` })
    }
    paginationRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      paginationRow.push({ text: 'التالي ▶️', callback_data: `filter:all:page:${page + 1}` })
    }
    keyboard.row(...paginationRow)
  }

  keyboard
    .text('🔍 بحث بالاسم', 'filter:all:search')
    .row()
    .text('📊 تصدير Excel', 'export:all-employees')
    .text('🔙 رجوع', 'hr:employees:view-current')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

export { employeeFilterResultsHandler }
