/**
 * Payroll Employee Allowances Handler - بدلات الموظفين
 *
 * تعديل البدلات الخاصة بموظف معين (تجاوز بدلات الوظيفة)
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const payrollEmployeeAllowancesHandler = new Composer<Context>()

// ════════════════════════════════════════════════════════
// القائمة الرئيسية - عرض قائمة الموظفين
// ════════════════════════════════════════════════════════

payrollEmployeeAllowancesHandler.callbackQuery('payroll:settings:employee-allowances', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    // جلب الموظفين الذين لديهم بدلات مخصصة
    const employeesWithAllowances = await Database.prisma.employee.findMany({
      where: {
        employmentStatus: 'ACTIVE',
        employeeAllowances: {
          some: { isActive: true },
        },
      },
      include: {
        position: true,
        employeeAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    })

    const keyboard = new InlineKeyboard()

    if (employeesWithAllowances.length > 0) {
      keyboard.text('📋 عرض الموظفين ذوي البدلات المخصصة', 'payroll:emp-allowance:list:custom').row()
    }

    keyboard
      .text('➕ إضافة بدل مخصص لموظف', 'payroll:emp-allowance:select-employee')
      .row()
      .text('⬅️ رجوع', 'payroll:settings')

    let message = '👤 **بدلات الموظفين**\n\n'
    message += '💡 **البدلات المخصصة:**\n'
    message += 'يمكنك تخصيص بدلات معينة لموظفين محددين تختلف عن البدلات الافتراضية لوظيفتهم.\n\n'

    if (employeesWithAllowances.length > 0) {
      message += `📊 عدد الموظفين ذوي بدلات مخصصة: **${employeesWithAllowances.length}**\n\n`
    }
    else {
      message += '❌ لا يوجد موظفين بدلات مخصصة حالياً\n\n'
    }

    message += '🔹 يمكنك:\n'
    message += '• عرض البدلات المخصصة الحالية\n'
    message += '• إضافة بدل مخصص جديد لموظف\n'
    message += '• تعديل أو حذف البدلات المخصصة'

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employee allowances:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء تحميل البيانات')
  }
})

// ════════════════════════════════════════════════════════
// عرض قائمة الموظفين ذوي البدلات المخصصة
// ════════════════════════════════════════════════════════

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:list:custom', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const employees = await Database.prisma.employee.findMany({
      where: {
        employmentStatus: 'ACTIVE',
        employeeAllowances: {
          some: { isActive: true },
        },
      },
      include: {
        position: true,
        employeeAllowances: {
          where: { isActive: true },
        },
      },
      orderBy: { fullName: 'asc' },
    })

    const keyboard = new InlineKeyboard()

    employees.forEach((emp) => {
      const allowanceCount = emp.employeeAllowances!.length
      keyboard
        .text(`${emp.fullName} (${allowanceCount} بدل)`, `payroll:emp-allowance:view:${emp.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', 'payroll:settings:employee-allowances')

    await ctx.editMessageText(
      '👥 **الموظفون ذوو البدلات المخصصة**\n\n'
      + `📊 العدد: ${employees.length}\n\n`
      + '📌 اختر موظف لعرض بدلاته:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// عرض بدلات موظف محدد
// ════════════════════════════════════════════════════════

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:view:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1], 10)

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        employeeAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
          orderBy: {
            allowanceType: { orderIndex: 'asc' },
          },
        },
      },
    })

    if (!employee) {
      await ctx.answerCallbackQuery('❌ الموظف غير موجود')
      return
    }

    const keyboard = new InlineKeyboard()
      .text('➕ إضافة بدل', `payroll:emp-allowance:add:${employeeId}`)
      .row()

    let message = `👤 **${employee.fullName}**\n`
    message += `🏢 الوظيفة: ${employee.position.titleAr}\n\n`

    if (employee.employeeAllowances.length === 0) {
      message += '❌ لا توجد بدلات مخصصة لهذا الموظف'
    }
    else {
      message += `📊 البدلات المخصصة (${employee.employeeAllowances.length}):\n\n`

      employee.employeeAllowances.forEach((ea) => {
        message += `• **${ea.allowanceType.nameAr}**\n`
        message += `  💰 القيمة: ${ea.amount} جنيه\n`

        if (ea.overridePosition) {
          message += `  🔄 يحل محل بدل الوظيفة\n`
        }

        if (ea.startDate) {
          message += `  📅 من: ${ea.startDate.toISOString().split('T')[0]}\n`
        }
        if (ea.endDate) {
          message += `  📅 إلى: ${ea.endDate.toISOString().split('T')[0]}\n`
        }

        message += '\n'

        keyboard
          .text(`✏️ ${ea.allowanceType.nameAr}`, `payroll:emp-allowance:edit:${ea.id}`)
          .text(`🗑️`, `payroll:emp-allowance:delete:${ea.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', 'payroll:emp-allowance:list:custom')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// اختيار موظف لإضافة بدل - قائمة كاملة مثل قسم شؤون العاملين
// ════════════════════════════════════════════════════════

interface EmployeeListState {
  page: number
  searchTerm?: string
  searchType?: 'name' | 'code'
}

const employeeListStates = new Map<number, EmployeeListState>()

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:select-employee', async (ctx) => {
  await ctx.answerCallbackQuery()

  // إعادة تعيين الحالة
  employeeListStates.set(ctx.from!.id, { page: 1 })

  await showEmployeeList(ctx, 1)
})

// عرض قائمة الموظفين مع الترقيم
async function showEmployeeList(ctx: any, page: number, searchTerm?: string, searchType?: 'name' | 'code') {
  try {
    const pageSize = 10
    const skip = (page - 1) * pageSize

    // بناء شرط البحث
    const whereCondition: any = {
      employmentStatus: 'ACTIVE',
    }

    if (searchTerm) {
      if (searchType === 'code') {
        whereCondition.employeeCode = { contains: searchTerm }
      }
      else {
        whereCondition.fullName = { contains: searchTerm }
      }
    }

    // جلب الموظفين مع العد الإجمالي
    const [employees, totalCount] = await Promise.all([
      Database.prisma.employee.findMany({
        where: whereCondition,
        include: {
          position: true,
          department: true,
        },
        skip,
        take: pageSize,
        orderBy: { fullName: 'asc' },
      }),
      Database.prisma.employee.count({ where: whereCondition }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    if (employees.length === 0) {
      const noResultsMessage = searchTerm
        ? 'لم يتم العثور على نتائج للبحث'
        : 'لا يوجد موظفين نشطين'

      await ctx.editMessageText(
        `❌ **لا يوجد موظفين**\n\n${noResultsMessage}`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔍 بحث', 'payroll:emp-allowance:search-menu')
            .row()
            .text('⬅️ رجوع', 'payroll:settings:employee-allowances'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    // عرض الموظفين
    employees.forEach((emp) => {
      const label = `${emp.fullName} | ${emp.employeeCode} | ${emp.position!.titleAr}`
      keyboard
        .text(label, `payroll:emp-allowance:add:${emp.id}`)
        .row()
    })

    // أزرار التنقل
    const navButtons: any[] = []

    if (page > 1) {
      navButtons.push(InlineKeyboard.text('⏮️ الأولى', `payroll:emp-allowance:list:1`))
      navButtons.push(InlineKeyboard.text('◀️ السابقة', `payroll:emp-allowance:list:${page - 1}`))
    }

    if (page < totalPages) {
      navButtons.push(InlineKeyboard.text('▶️ التالية', `payroll:emp-allowance:list:${page + 1}`))
      navButtons.push(InlineKeyboard.text('⏭️ الأخيرة', `payroll:emp-allowance:list:${totalPages}`))
    }

    if (navButtons.length > 0) {
      keyboard.row(...navButtons)
    }

    // أزرار البحث والرجوع
    keyboard
      .text('🔍 بحث', 'payroll:emp-allowance:search-menu')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:employee-allowances')

    let message = '👥 **اختر موظف لإضافة بدل له**\n\n'

    if (searchTerm) {
      message += `🔍 البحث: "${searchTerm}" (${searchType === 'code' ? 'كود' : 'اسم'})\n\n`
    }

    message += `📊 الصفحة ${page} من ${totalPages}\n`
    message += `📈 إجمالي الموظفين: ${totalCount}\n`
    message += `📋 عرض ${employees.length} موظف\n\n`
    message += '💡 اضغط على اسم الموظف لإضافة بدل له'

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // حفظ الحالة
    employeeListStates.set(ctx.from!.id, { page, searchTerm, searchType })
  }
  catch (error) {
    console.error('Error loading employees:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ أثناء تحميل البيانات')
  }
}

// معالج التنقل بين الصفحات
payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:list:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match![1], 10)
  const state = employeeListStates.get(ctx.from!.id)

  await showEmployeeList(ctx, page, state?.searchTerm, state?.searchType)
})

// قائمة البحث
payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:search-menu', async (ctx) => {
  await ctx.answerCallbackQuery()

  await ctx.editMessageText(
    '🔍 **البحث عن موظف**\n\n'
    + '📋 اختر نوع البحث:',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('👤 بحث بالاسم', 'payroll:emp-allowance:search:name')
        .row()
        .text('🔢 بحث بالكود', 'payroll:emp-allowance:search:code')
        .row()
        .text('❌ إلغاء البحث', 'payroll:emp-allowance:search:clear')
        .row()
        .text('⬅️ رجوع', 'payroll:emp-allowance:select-employee'),
    },
  )
})

// بدء البحث بالاسم
interface SearchState {
  step: 'waiting_search_term'
  searchType: 'name' | 'code'
}

const searchStates = new Map<number, SearchState>()

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:search:name', async (ctx) => {
  await ctx.answerCallbackQuery()

  searchStates.set(ctx.from!.id, {
    step: 'waiting_search_term',
    searchType: 'name',
  })

  await ctx.editMessageText(
    '🔍 **البحث بالاسم**\n\n'
    + '📝 أرسل اسم الموظف أو جزء منه:\n'
    + 'مثال: أحمد، محمد، علي',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', 'payroll:emp-allowance:search-cancel'),
    },
  )
})

// بدء البحث بالكود
payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:search:code', async (ctx) => {
  await ctx.answerCallbackQuery()

  searchStates.set(ctx.from!.id, {
    step: 'waiting_search_term',
    searchType: 'code',
  })

  await ctx.editMessageText(
    '� **البحث بالكود**\n\n'
    + '🔢 أرسل كود الموظف أو جزء منه:\n'
    + 'مثال: EMP001، 001',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ إلغاء', 'payroll:emp-allowance:search-cancel'),
    },
  )
})

// إلغاء البحث والعودة للقائمة
payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:search:clear', async (ctx) => {
  await ctx.answerCallbackQuery()

  employeeListStates.delete(ctx.from!.id)
  await showEmployeeList(ctx, 1)
})

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:search-cancel', async (ctx) => {
  await ctx.answerCallbackQuery()

  searchStates.delete(ctx.from!.id)
  await showEmployeeList(ctx, 1)
})

// عرض القائمة في رسالة جديدة (بعد البحث)
async function showEmployeeListInNewMessage(ctx: any, page: number, searchTerm?: string, searchType?: 'name' | 'code') {
  try {
    const pageSize = 10
    const skip = (page - 1) * pageSize

    const whereCondition: any = {
      employmentStatus: 'ACTIVE',
    }

    if (searchTerm) {
      if (searchType === 'code') {
        whereCondition.employeeCode = { contains: searchTerm }
      }
      else {
        whereCondition.fullName = { contains: searchTerm }
      }
    }

    const [employees, totalCount] = await Promise.all([
      Database.prisma.employee.findMany({
        where: whereCondition,
        include: {
          position: true,
        },
        skip,
        take: pageSize,
        orderBy: { fullName: 'asc' },
      }),
      Database.prisma.employee.count({ where: whereCondition }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    if (employees.length === 0) {
      await ctx.reply(
        '❌ **لم يتم العثور على نتائج**\n\n'
        + 'حاول البحث بكلمات أخرى',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('🔍 بحث جديد', 'payroll:emp-allowance:search-menu')
            .row()
            .text('⬅️ رجوع للقائمة', 'payroll:emp-allowance:select-employee'),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    employees.forEach((emp) => {
      const label = `${emp.fullName} | ${emp.employeeCode} | ${emp.position!.titleAr}`
      keyboard
        .text(label, `payroll:emp-allowance:add:${emp.id}`)
        .row()
    })

    const navButtons: any[] = []
    if (page > 1) {
      navButtons.push(InlineKeyboard.text('⏮️ الأولى', `payroll:emp-allowance:list:1`))
      navButtons.push(InlineKeyboard.text('◀️ السابقة', `payroll:emp-allowance:list:${page - 1}`))
    }
    if (page < totalPages) {
      navButtons.push(InlineKeyboard.text('▶️ التالية', `payroll:emp-allowance:list:${page + 1}`))
      navButtons.push(InlineKeyboard.text('⏭️ الأخيرة', `payroll:emp-allowance:list:${totalPages}`))
    }
    if (navButtons.length > 0) {
      keyboard.row(...navButtons)
    }

    keyboard
      .text('🔍 بحث جديد', 'payroll:emp-allowance:search-menu')
      .row()
      .text('⬅️ رجوع', 'payroll:settings:employee-allowances')

    let message = '✅ **نتائج البحث**\n\n'
    message += `🔍 البحث: "${searchTerm}" (${searchType === 'code' ? 'كود' : 'اسم'})\n\n`
    message += `📊 الصفحة ${page} من ${totalPages}\n`
    message += `📈 النتائج: ${totalCount} موظف\n\n`
    message += '💡 اضغط على اسم الموظف لإضافة بدل له'

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.reply('❌ حدث خطأ أثناء البحث')
  }
}

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:show-search-results', async (ctx) => {
  await ctx.answerCallbackQuery()
  // لا حاجة لفعل شيء - النتائج ستظهر من معالج الرسائل
})

// ════════════════════════════════════════════════════════
// إضافة بدل لموظف - اختيار نوع البدل
// ════════════════════════════════════════════════════════

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:add:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1], 10)

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        employeeAllowances: {
          where: { isActive: true },
          select: { allowanceTypeId: true },
        },
      },
    })

    if (!employee) {
      await ctx.answerCallbackQuery('❌ الموظف غير موجود')
      return
    }

    // جلب أنواع البدلات المُفعّلة
    const allowanceTypes = await Database.prisma.hR_AllowanceType.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    })

    if (allowanceTypes.length === 0) {
      await ctx.editMessageText(
        '❌ **لا توجد أنواع بدلات مُفعّلة**',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', 'payroll:settings:employee-allowances'),
        },
      )
      return
    }

    // استبعاد الأنواع المُضافة بالفعل
    const existingTypeIds = employee.employeeAllowances.map(ea => ea.allowanceTypeId)
    const availableTypes = allowanceTypes.filter(at => !existingTypeIds.includes(at.id))

    if (availableTypes.length === 0) {
      await ctx.editMessageText(
        '✅ **تم إضافة جميع أنواع البدلات**',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('⬅️ رجوع', `payroll:emp-allowance:view:${employeeId}`),
        },
      )
      return
    }

    const keyboard = new InlineKeyboard()

    availableTypes.forEach((type) => {
      keyboard
        .text(type.nameAr, `payroll:emp-allowance:add:select:${employeeId}:${type.id}`)
        .row()
    })

    keyboard.text('⬅️ رجوع', 'payroll:settings:employee-allowances')

    await ctx.editMessageText(
      `➕ **إضافة بدل لـ: ${employee.fullName}**\n\n`
      + `📋 اختر نوع البدل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

// ════════════════════════════════════════════════════════
// نموذج إضافة البدل - طلب البيانات
// ════════════════════════════════════════════════════════

interface AddEmployeeAllowanceState {
  step: 'waiting_amount' | 'waiting_override' | 'waiting_dates'
  employeeId: number
  allowanceTypeId: number
  employeeName: string
  allowanceTypeName: string
  amount?: number
  overridePosition?: boolean
  startDate?: string
  endDate?: string
}

const addStates = new Map<number, AddEmployeeAllowanceState>()

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:add:select:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match![1], 10)
  const allowanceTypeId = Number.parseInt(ctx.match![2], 10)

  try {
    const employee = await Database.prisma.employee.findUnique({
      where: { id: employeeId },
    })

    const allowanceType = await Database.prisma.hR_AllowanceType.findUnique({
      where: { id: allowanceTypeId },
    })

    if (!employee || !allowanceType) {
      await ctx.answerCallbackQuery('❌ بيانات غير صحيحة')
      return
    }

    addStates.set(ctx.from!.id, {
      step: 'waiting_amount',
      employeeId,
      allowanceTypeId,
      employeeName: employee.fullName,
      allowanceTypeName: allowanceType.nameAr,
    })

    await ctx.editMessageText(
      `➕ **إضافة بدل: ${allowanceType.nameAr}**\n\n`
      + `👤 الموظف: ${employee.fullName}\n\n`
      + `💰 **الخطوة 1/3:** أرسل قيمة البدل بالجنيه:\n`
      + `مثال: 500`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('❌ إلغاء', 'payroll:emp-allowance:add:cancel'),
      },
    )
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:add:cancel', async (ctx) => {
  await ctx.answerCallbackQuery()
  addStates.delete(ctx.from!.id)

  await ctx.editMessageText(
    '❌ تم إلغاء الإضافة',
    {
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', 'payroll:settings:employee-allowances'),
    },
  )
})

// ════════════════════════════════════════════════════════
// معالجات الرسائل النصية
// ════════════════════════════════════════════════════════

// معالج إدخال المبلغ
payrollEmployeeAllowancesHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from!.id

  // معالج البحث له الأولوية
  const searchState = searchStates.get(userId)
  if (searchState && searchState.step === 'waiting_search_term') {
    const searchTerm = ctx.message.text.trim()

    if (searchTerm.length < 2) {
      await ctx.reply('❌ يجب إدخال حرفين على الأقل')
      return
    }

    searchStates.delete(userId)

    await ctx.reply(
      `🔍 جاري البحث عن "${searchTerm}"...`,
      {
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض النتائج', 'payroll:emp-allowance:show-search-results'),
      },
    )

    employeeListStates.set(userId, {
      page: 1,
      searchTerm,
      searchType: searchState.searchType,
    })

    await showEmployeeListInNewMessage(ctx, 1, searchTerm, searchState.searchType)
    return
  }

  // معالج إدخال المبلغ
  const state = addStates.get(userId)
  if (state && state.step === 'waiting_amount') {
    const text = ctx.message.text.trim()
    const amount = Number.parseFloat(text)

    if (Number.isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ القيمة يجب أن تكون رقماً موجباً')
      return
    }

    state.amount = amount
    state.step = 'waiting_override'
    addStates.set(userId, state)

    await ctx.reply(
      `💰 القيمة: ${amount} جنيه\n\n`
      + `🔄 **الخطوة 2/3:** هل يحل هذا البدل محل بدل الوظيفة الافتراضي؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('✅ نعم (يحل محله)', 'payroll:emp-allowance:override:yes')
          .text('➕ لا (يُضاف إليه)', 'payroll:emp-allowance:override:no')
          .row()
          .text('❌ إلغاء', 'payroll:emp-allowance:add:cancel'),
      },
    )
    return // Stop execution after processing
  }

  // لا توجد حالة نشطة - تمرير للمعالج التالي
  await next()
})

// معالج خيار التجاوز
payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:override:(yes|no)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)

  if (!state || state.step !== 'waiting_override') {
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    return
  }

  state.overridePosition = ctx.match![1] === 'yes'
  state.step = 'waiting_dates'
  addStates.set(userId, state)

  await ctx.editMessageText(
    `📅 **الخطوة 3/3:** هل تريد تحديد فترة زمنية للبدل؟\n\n`
    + `💡 إذا كان البدل دائماً، اختر "دائم"\n`
    + `إذا كان مؤقتاً، اختر "فترة محددة"`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('♾️ دائم (بدون تاريخ انتهاء)', 'payroll:emp-allowance:dates:permanent')
        .row()
        .text('📅 فترة محددة', 'payroll:emp-allowance:dates:temporary')
        .row()
        .text('❌ إلغاء', 'payroll:emp-allowance:add:cancel'),
    },
  )
})

// بدل دائم
payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:dates:permanent', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)

  if (!state) {
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    return
  }

  try {
    // إضافة البدل بدون تواريخ
    await Database.prisma.hR_EmployeeAllowance.create({
      data: {
        employeeId: state.employeeId,
        allowanceTypeId: state.allowanceTypeId,
        amount: state.amount!,
        overridePosition: state.overridePosition!,
        isActive: true,
      },
    })

    addStates.delete(userId)

    await ctx.editMessageText(
      `✅ **تم إضافة البدل بنجاح**\n\n`
      + `👤 الموظف: ${state.employeeName}\n`
      + `💰 البدل: ${state.allowanceTypeName}\n`
      + `💵 القيمة: ${state.amount} جنيه\n`
      + `🔄 ${state.overridePosition ? 'يحل محل بدل الوظيفة' : 'يُضاف لبدل الوظيفة'}\n`
      + `📅 النوع: دائم`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض بدلات الموظف', `payroll:emp-allowance:view:${state.employeeId}`)
          .row()
          .text('⬅️ رجوع', 'payroll:settings:employee-allowances'),
      },
    )
  }
  catch (error) {
    console.error('Error adding allowance:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    addStates.delete(userId)
  }
})

// بدل مؤقت - طلب التواريخ
payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:dates:temporary', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)

  if (!state) {
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    return
  }

  await ctx.editMessageText(
    `📅 **تحديد فترة البدل**\n\n`
    + `💡 سيتم تطبيق البدل من اليوم وحتى نهاية الشهر الحالي\n`
    + `يمكنك تعديل التواريخ لاحقاً من خلال "تعديل البدل"`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('✅ موافق - من اليوم لنهاية الشهر', 'payroll:emp-allowance:dates:thismonth')
        .row()
        .text('❌ إلغاء', 'payroll:emp-allowance:add:cancel'),
    },
  )
})

payrollEmployeeAllowancesHandler.callbackQuery('payroll:emp-allowance:dates:thismonth', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from!.id
  const state = addStates.get(userId)

  if (!state) {
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    return
  }

  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // آخر يوم في الشهر

    await Database.prisma.hR_EmployeeAllowance.create({
      data: {
        employeeId: state.employeeId,
        allowanceTypeId: state.allowanceTypeId,
        amount: state.amount!,
        overridePosition: state.overridePosition!,
        startDate,
        endDate,
        isActive: true,
      },
    })

    addStates.delete(userId)

    await ctx.editMessageText(
      `✅ **تم إضافة البدل بنجاح**\n\n`
      + `👤 الموظف: ${state.employeeName}\n`
      + `💰 البدل: ${state.allowanceTypeName}\n`
      + `💵 القيمة: ${state.amount} جنيه\n`
      + `🔄 ${state.overridePosition ? 'يحل محل بدل الوظيفة' : 'يُضاف لبدل الوظيفة'}\n`
      + `📅 من: ${startDate.toISOString().split('T')[0]}\n`
      + `📅 إلى: ${endDate.toISOString().split('T')[0]}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('👁️ عرض بدلات الموظف', `payroll:emp-allowance:view:${state.employeeId}`)
          .row()
          .text('⬅️ رجوع', 'payroll:settings:employee-allowances'),
      },
    )
  }
  catch (error) {
    console.error('Error adding allowance:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
    addStates.delete(userId)
  }
})

// ════════════════════════════════════════════════════════
// تعديل وحذف البدلات (مبسط)
// ════════════════════════════════════════════════════════

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('⚠️ التعديل قيد التطوير - يمكنك حالياً الحذف والإضافة من جديد')
})

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowance = await Database.prisma.hR_EmployeeAllowance.findUnique({
      where: { id: allowanceId },
      include: {
        employee: true,
        allowanceType: true,
      },
    })

    if (!allowance) {
      await ctx.answerCallbackQuery('❌ البدل غير موجود')
      return
    }

    await ctx.editMessageText(
      `⚠️ **تأكيد الحذف**\n\n`
      + `👤 الموظف: ${allowance.employee.fullName}\n`
      + `💰 البدل: ${allowance.allowanceType.nameAr}\n`
      + `💵 القيمة: ${allowance.amount} جنيه\n\n`
      + `هل أنت متأكد من الحذف؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('✅ نعم، احذف', `payroll:emp-allowance:delete:confirm:${allowanceId}`)
          .row()
          .text('❌ إلغاء', `payroll:emp-allowance:view:${allowance.employeeId}`),
      },
    )
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})

payrollEmployeeAllowancesHandler.callbackQuery(/^payroll:emp-allowance:delete:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const allowanceId = Number.parseInt(ctx.match![1], 10)

  try {
    const allowance = await Database.prisma.hR_EmployeeAllowance.findUnique({
      where: { id: allowanceId },
      select: { employeeId: true },
    })

    if (!allowance) {
      await ctx.answerCallbackQuery('❌ البدل غير موجود')
      return
    }

    await Database.prisma.hR_EmployeeAllowance.update({
      where: { id: allowanceId },
      data: { isActive: false },
    })

    await ctx.answerCallbackQuery('✅ تم الحذف بنجاح')

    // العودة لعرض الموظف
    const employee = await Database.prisma.employee.findUnique({
      where: { id: allowance.employeeId },
      include: {
        position: true,
        employeeAllowances: {
          where: { isActive: true },
          include: {
            allowanceType: true,
          },
          orderBy: {
            allowanceType: { orderIndex: 'asc' },
          },
        },
      },
    })

    if (!employee) {
      return
    }

    const keyboard = new InlineKeyboard()
      .text('➕ إضافة بدل', `payroll:emp-allowance:add:${allowance.employeeId}`)
      .row()

    let message = `👤 **${employee.fullName}**\n`
    message += `🏢 الوظيفة: ${employee.position.titleAr}\n\n`

    if (employee.employeeAllowances.length === 0) {
      message += '❌ لا توجد بدلات مخصصة لهذا الموظف'
    }
    else {
      message += `📊 البدلات المخصصة (${employee.employeeAllowances.length}):\n\n`

      employee.employeeAllowances.forEach((ea) => {
        message += `• **${ea.allowanceType.nameAr}**: ${ea.amount} جنيه\n`
        keyboard
          .text(`✏️ ${ea.allowanceType.nameAr}`, `payroll:emp-allowance:edit:${ea.id}`)
          .text(`🗑️`, `payroll:emp-allowance:delete:${ea.id}`)
          .row()
      })
    }

    keyboard.text('⬅️ رجوع', 'payroll:emp-allowance:list:custom')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ')
  }
})
