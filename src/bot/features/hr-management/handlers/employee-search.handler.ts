/**
 * Employee Search Handler
 * معالج البحث عن العاملين
 */

import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { EmployeeSelector } from '#root/modules/ui/employee-selector.js'
import { Composer, InlineKeyboard } from 'grammy'

const employeeSearchHandler = new Composer<Context>()

// معالج pagination لنتائج البحث
employeeSearchHandler.callbackQuery(/^search:page:(.+):(\d+)$/, async (ctx) => {
  const _context = ctx.match[1] // context للفلتر
  const page = Number.parseInt(ctx.match[2], 10)

  const searchData = ctx.session.employeeSearch

  if (!searchData || !searchData.employeeIds || !searchData.searchTerm) {
    await ctx.answerCallbackQuery('❌ انتهت صلاحية البحث')
    return
  }

  try {
    const prisma = Database.prisma

    // جلب العاملين من الـ IDs المحفوظة
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: searchData.employeeIds },
      },
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    const itemsPerPage = 20
    const totalPages = Math.ceil(employees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

    let filterLabel = ''
    let backCallback = 'filter:all'
    let searchContext = 'all'

    if (searchData.filterType === 'department') {
      const dept = await prisma.department.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `القسم: ${dept?.name || ''}`
      backCallback = `filter:dept:${searchData.filterId}`
      searchContext = `dept:${searchData.filterId}`
    }
    else if (searchData.filterType === 'governorate') {
      const gov = await prisma.governorate.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `المحافظة: ${gov?.nameAr || ''}`
      backCallback = `filter:gov:${searchData.filterId}`
      searchContext = `gov:${searchData.filterId}`
    }
    else if (searchData.filterType === 'position') {
      const pos = await prisma.position.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `الوظيفة: ${pos?.titleAr || ''}`
      backCallback = `filter:pos:${searchData.filterId}`
      searchContext = `pos:${searchData.filterId}`
    }
    else if (searchData.filterType === 'status') {
      const statusNames: Record<string, string> = {
        ACTIVE: 'نشط',
        ON_LEAVE: 'في إجازة',
        SUSPENDED: 'موقوف',
        ON_MISSION: 'في مأمورية',
      }
      filterLabel = `الحالة: ${statusNames[searchData.filterValue!] || searchData.filterValue}`
      backCallback = `filter:status:${searchData.filterValue}`
      searchContext = `status:${searchData.filterValue}`
    }
    else {
      filterLabel = 'جميع العاملين'
      searchContext = 'all'
    }

    let message = `🔍 **نتائج البحث عن:** "${searchData.searchTerm}"\n`
    message += `📂 **في:** ${filterLabel}\n\n`
    message += `📊 **عدد النتائج:** ${employees.length}\n\n`
    message += `👥 **قائمة العاملين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'ACTIVE' ? '✅' : '⏸️'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow = []

      if (page > 1) {
        paginationRow.push(
          InlineKeyboard.text('⏮️ الأولى', `search:page:${searchContext}:1`),
          InlineKeyboard.text('◀️ السابقة', `search:page:${searchContext}:${page - 1}`),
        )
      }

      paginationRow.push(
        InlineKeyboard.text(`${page}/${totalPages}`, 'noop'),
      )

      if (page < totalPages) {
        paginationRow.push(
          InlineKeyboard.text('▶️ التالية', `search:page:${searchContext}:${page + 1}`),
          InlineKeyboard.text('⏭️ الأخيرة', `search:page:${searchContext}:${totalPages}`),
        )
      }

      keyboard.row(...paginationRow)
    }

    keyboard
      .text('🔍 بحث مرة أخرى', `${backCallback}:search`)
      .row()
      .text('⬅️ رجوع', backCallback)

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    await ctx.answerCallbackQuery()
  }
  catch (error) {
    console.error('Error paginating search results:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ في عرض الصفحة')
  }
})

// معالج استقبال نص البحث
employeeSearchHandler.on('message:text', async (ctx, next) => {
  const searchData = ctx.session.employeeSearch

  if (!searchData) {
    return next()
  }

  const searchTerm = ctx.message.text.trim()

  try {
    const prisma = Database.prisma

    // تحديد شروط البحث بناءً على نوع الفلتر
    const whereCondition: any = {
      isActive: true,
    }

    if (searchData.filterType === 'department') {
      whereCondition.departmentId = searchData.filterId
    }
    else if (searchData.filterType === 'governorate') {
      whereCondition.governorateId = searchData.filterId
    }
    else if (searchData.filterType === 'position') {
      whereCondition.positionId = searchData.filterId
    }
    else if (searchData.filterType === 'status') {
      whereCondition.employmentStatus = searchData.filterValue
    }
    // filterType === 'all' لا يحتاج شروط إضافية

    // جلب العاملين حسب الفلتر
    const allEmployees = await prisma.employee.findMany({
      where: whereCondition,
      include: {
        position: true,
        department: true,
        governorate: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    // تصفية النتائج حسب نص البحث
    const filteredEmployees = EmployeeSelector.filterByName(allEmployees, searchTerm)

    if (filteredEmployees.length === 0) {
      let backCallback = 'filter:all'

      if (searchData.filterType === 'department') {
        backCallback = `filter:dept:${searchData.filterId}`
      }
      else if (searchData.filterType === 'governorate') {
        backCallback = `filter:gov:${searchData.filterId}`
      }
      else if (searchData.filterType === 'position') {
        backCallback = `filter:pos:${searchData.filterId}`
      }
      else if (searchData.filterType === 'status') {
        backCallback = `filter:status:${searchData.filterValue}`
      }

      await ctx.reply(
        `❌ **لم يتم العثور على عاملين**\n\n`
        + `لا يوجد عاملين يطابقون البحث: "${searchTerm}"\n\n`
        + `جرب البحث بكلمات أخرى.`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔍 بحث مرة أخرى', `${backCallback}:search`)
            .row()
            .text('⬅️ رجوع', backCallback),
        },
      )

      return
    }

    // عرض النتائج
    const page = 1
    const itemsPerPage = 20
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const startIndex = (page - 1) * itemsPerPage
    const currentPageEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

    let filterLabel = ''
    let backCallback = 'filter:all'
    let searchContext = 'all'

    if (searchData.filterType === 'department') {
      const dept = await prisma.department.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `القسم: ${dept?.name || ''}`
      backCallback = `filter:dept:${searchData.filterId}`
      searchContext = `dept:${searchData.filterId}`
    }
    else if (searchData.filterType === 'governorate') {
      const gov = await prisma.governorate.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `المحافظة: ${gov?.nameAr || ''}`
      backCallback = `filter:gov:${searchData.filterId}`
      searchContext = `gov:${searchData.filterId}`
    }
    else if (searchData.filterType === 'position') {
      const pos = await prisma.position.findUnique({ where: { id: searchData.filterId } })
      filterLabel = `الوظيفة: ${pos?.titleAr || ''}`
      backCallback = `filter:pos:${searchData.filterId}`
      searchContext = `pos:${searchData.filterId}`
    }
    else if (searchData.filterType === 'status') {
      const statusNames: Record<string, string> = {
        ACTIVE: 'نشط',
        ON_LEAVE: 'في إجازة',
        SUSPENDED: 'موقوف',
        ON_MISSION: 'في مأمورية',
      }
      filterLabel = `الحالة: ${statusNames[searchData.filterValue!] || searchData.filterValue}`
      backCallback = `filter:status:${searchData.filterValue}`
      searchContext = `status:${searchData.filterValue}`
    }
    else {
      filterLabel = 'جميع العاملين'
      searchContext = 'all'
    }

    // حفظ نتائج البحث في session للـ pagination
    ctx.session.employeeSearch = {
      filterType: searchData.filterType,
      filterId: searchData.filterId,
      filterValue: searchData.filterValue,
      searchTerm,
      employeeIds: filteredEmployees.map(emp => emp.id),
    }

    let message = `🔍 **نتائج البحث عن:** "${searchTerm}"\n`
    message += `📂 **في:** ${filterLabel}\n\n`
    message += `📊 **عدد النتائج:** ${filteredEmployees.length}\n\n`
    message += `👥 **قائمة العاملين** (الصفحة ${page}/${totalPages}):\n\n`

    const keyboard = new InlineKeyboard()

    currentPageEmployees.forEach((emp) => {
      const statusEmoji = emp.employmentStatus === 'ACTIVE' ? '✅' : '⏸️'
      const displayName = `${statusEmoji} ${emp.nickname || emp.fullName}`
      const positionTitle = emp.position?.titleAr || 'غير محدد'

      keyboard.text(
        `${displayName} (${positionTitle})`,
        `hr:employee:details:${emp.id}`,
      ).row()
    })

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow = []

      if (page > 1) {
        paginationRow.push(
          InlineKeyboard.text('⏮️ الأولى', `search:page:${searchContext}:1`),
          InlineKeyboard.text('◀️ السابقة', `search:page:${searchContext}:${page - 1}`),
        )
      }

      paginationRow.push(
        InlineKeyboard.text(`${page}/${totalPages}`, 'noop'),
      )

      if (page < totalPages) {
        paginationRow.push(
          InlineKeyboard.text('▶️ التالية', `search:page:${searchContext}:${page + 1}`),
          InlineKeyboard.text('⏭️ الأخيرة', `search:page:${searchContext}:${totalPages}`),
        )
      }

      keyboard.row(...paginationRow)
    }

    keyboard
      .text('🔍 بحث مرة أخرى', `${backCallback}:search`)
      .row()
      .text('⬅️ رجوع', backCallback)

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // لا نحذف employeeSearch لأننا نحتاجها للـ pagination
  }
  catch (error) {
    console.error('Error searching employees:', error)
    await ctx.reply('❌ حدث خطأ في البحث.')
    delete ctx.session.employeeSearch
  }
})

export { employeeSearchHandler }
