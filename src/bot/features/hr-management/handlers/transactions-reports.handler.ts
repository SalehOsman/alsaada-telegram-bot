import type { Context } from '../../../context.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import ExcelJS from 'exceljs'
import { Composer, InlineKeyboard, InputFile } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const transactionsReportsHandler = new Composer<Context>()

// تخزين بيانات الفلترة
interface ReportFilter {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom' | 'all'
  customStartDate?: Date
  customEndDate?: Date
  transactionType?: 'CASH_ADVANCE' | 'ITEM_WITHDRAWAL' | 'all'
  settlementStatus?: 'settled' | 'unsettled' | 'all'
  employeeId?: number
}

const reportCache = new Map<number, ReportFilter>()

// ============================================
// 📊 نقطة البداية - عرض التقرير الشامل
// ============================================
transactionsReportsHandler.callbackQuery('hr:transactions:reports', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  // مسح الفلترة السابقة
  reportCache.delete(userId)

  // عرض التقرير الشامل
  await showComprehensiveReport(ctx)
})

// ============================================
// 📊 عرض التقرير التحليلي الشامل
// ============================================
async function showComprehensiveReport(ctx: any) {
  try {
    // جلب جميع العمليات
    const allTransactions = await Database.prisma.hR_Transaction.findMany({
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        item: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // جلب جميع الأدمن النشطين المعينين على قسم شئون العاملين
    const hrDepartment = await Database.prisma.departmentConfig.findUnique({
      where: { code: 'hr-management' },
    })

    let adminUsers: Array<{
      telegramId: bigint
      username: string | null
      fullName: string | null
      nickname: string | null
      role: string
    }> = []

    if (hrDepartment) {
      // جلب الأدمن المعينين على القسم
      const assignedAdmins = await Database.prisma.departmentAdmin.findMany({
        where: {
          departmentId: hrDepartment.id,
          isActive: true,
        },
        include: {
          user: {
            select: {
              telegramId: true,
              username: true,
              fullName: true,
              nickname: true,
              role: true,
            },
          },
        },
      })

      adminUsers = assignedAdmins.map(a => a.user)
    }

    // إضافة جميع السوبر أدمن (يمتلكون الوصول دائماً)
    const superAdmins = await Database.prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      select: {
        telegramId: true,
        username: true,
        fullName: true,
        nickname: true,
        role: true,
      },
    })

    // دمج القوائم وإزالة التكرار
    const allAdmins = [...adminUsers, ...superAdmins]
    const uniqueAdmins = Array.from(
      new Map(allAdmins.map(admin => [Number(admin.telegramId), admin])).values(),
    )

    adminUsers = uniqueAdmins

    // تحديد الفترات الزمنية
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // آخر 3 شهور
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const monthlyTransactions = allTransactions.filter((t: any) =>
      t.createdAt >= startOfMonth && t.createdAt <= endOfMonth,
    )

    const last3MonthsTransactions = allTransactions.filter((t: any) =>
      t.createdAt >= threeMonthsAgo && t.createdAt <= endOfMonth,
    )

    // ═══════════════════════════════
    // 1️⃣ إحصائيات الشهر الحالي
    // ═══════════════════════════════
    const monthlyCash = monthlyTransactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE')
    const monthlyItems = monthlyTransactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL')

    const monthlyUnsettledCash = monthlyCash.filter((t: any) => !t.isSettled && !t.isManuallySettled)
    const monthlyUnsettledItems = monthlyItems.filter((t: any) => !t.isSettled && !t.isManuallySettled)

    const monthlyCashAmount = monthlyCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const monthlyItemsAmount = monthlyItems.reduce((sum: number, t: any) => {
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const monthlyUnsettledCashAmount = monthlyUnsettledCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const monthlyUnsettledItemsAmount = monthlyUnsettledItems.reduce((sum: number, t: any) => {
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    // ═══════════════════════════════
    // 2️⃣ أكثر العاملين سحباً - الشهر الحالي
    // ═══════════════════════════════
    const monthlyEmployeeStats = new Map<number, {
      nickname: string
      position: string
      totalAmount: number
      totalCount: number
    }>()

    for (const transaction of monthlyTransactions) {
      // استثناء ديون الموظف من إحصائيات "أكثر العاملين سحباً"
      // الديون هي التزامات وليست سحوبات فعلية
      if (transaction.transactionType === 'EMPLOYEE_DEBT') {
        continue
      }

      const empId = transaction.employeeId
      if (!monthlyEmployeeStats.has(empId)) {
        monthlyEmployeeStats.set(empId, {
          nickname: transaction.employee.nickname || transaction.employee.fullName,
          position: transaction.employee.position?.titleAr || 'غير محدد',
          totalAmount: 0,
          totalCount: 0,
        })
      }

      const stats = monthlyEmployeeStats.get(empId)!

      let transactionAmount = 0
      if (transaction.transactionType === 'CASH_ADVANCE') {
        transactionAmount = Number(transaction.amount || 0)
      }
      else if (transaction.transactionType === 'ITEM_WITHDRAWAL') {
        const price = Number(transaction.unitPrice || 0)
        const qty = Number(transaction.quantity || 0)
        transactionAmount = price * qty
      }

      // احسب العمليات ذات المبلغ > 0
      if (transactionAmount > 0) {
        stats.totalCount++
        stats.totalAmount += transactionAmount
      }
    }

    const topMonthlyEmployees = Array.from(monthlyEmployeeStats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    // ═══════════════════════════════
    // 3️⃣ أكثر العاملين سحباً - آخر 3 شهور
    // ═══════════════════════════════
    const last3MonthsEmployeeStats = new Map<number, {
      nickname: string
      position: string
      totalAmount: number
      totalCount: number
    }>()

    for (const transaction of last3MonthsTransactions) {
      // استثناء ديون الموظف من إحصائيات "أكثر العاملين سحباً"
      // الديون هي التزامات وليست سحوبات فعلية
      if (transaction.transactionType === 'EMPLOYEE_DEBT') {
        continue
      }

      const empId = transaction.employeeId
      if (!last3MonthsEmployeeStats.has(empId)) {
        last3MonthsEmployeeStats.set(empId, {
          nickname: transaction.employee.nickname || transaction.employee.fullName,
          position: transaction.employee.position?.titleAr || 'غير محدد',
          totalAmount: 0,
          totalCount: 0,
        })
      }

      const stats = last3MonthsEmployeeStats.get(empId)!

      let transactionAmount = 0
      if (transaction.transactionType === 'CASH_ADVANCE') {
        transactionAmount = Number(transaction.amount || 0)
      }
      else if (transaction.transactionType === 'ITEM_WITHDRAWAL') {
        const price = Number(transaction.unitPrice || 0)
        const qty = Number(transaction.quantity || 0)
        transactionAmount = price * qty
      }

      // احسب العمليات ذات المبلغ > 0
      if (transactionAmount > 0) {
        stats.totalCount++
        stats.totalAmount += transactionAmount
      }
    }

    const topLast3MonthsEmployees = Array.from(last3MonthsEmployeeStats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    // ═══════════════════════════════
    // 4️⃣ نشاط المسجلين (الأدمن)
    // ═══════════════════════════════
    // إنشاء Map لجميع الأدمن مع تهيئة العداد بـ 0
    const adminStats = new Map<number, { nickname: string, count: number, role: string }>()

    // إضافة جميع الأدمن إلى الـ Map
    for (const admin of adminUsers) {
      const telegramId = Number(admin.telegramId)
      const displayName = admin.nickname || admin.fullName || admin.username || `مستخدم ${telegramId}`
      adminStats.set(telegramId, {
        nickname: displayName,
        count: 0,
        role: admin.role,
      })
    }

    // حساب عدد العمليات لكل أدمن
    for (const transaction of allTransactions) {
      const createdBy = Number(transaction.createdBy || 0)
      if (createdBy === 0)
        continue

      // إذا كان المسجل موجود في قائمة الأدمن، نزيد العداد
      if (adminStats.has(createdBy)) {
        adminStats.get(createdBy)!.count++
      }
    }

    // ترتيب الأدمن حسب عدد العمليات (من الأكثر للأقل)
    const topAdmins = Array.from(adminStats.values())
      .sort((a, b) => {
        // أولاً: حسب عدد العمليات
        if (b.count !== a.count) {
          return b.count - a.count
        }
        // ثانياً: SUPER_ADMIN قبل ADMIN
        if (a.role !== b.role) {
          return a.role === 'SUPER_ADMIN' ? -1 : 1
        }
        // ثالثاً: حسب الاسم أبجدياً
        return a.nickname.localeCompare(b.nickname, 'ar')
      })

    // ═══════════════════════════════
    // 📝 بناء الرسالة
    // ═══════════════════════════════
    let message = '📊 **تقرير تحليلي - العمليات المالية**\n\n'

    // ═══════════════════════════════
    // القسم 1: الشهر الحالي
    // ═══════════════════════════════
    message += `📅 **الشهر الحالي (${now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })})**\n\n`

    // فصل نوع ثالث: ديون الموظف
    const monthlyDebts = monthlyTransactions.filter((t: any) => t.transactionType === 'EMPLOYEE_DEBT')
    const monthlyDebtsAmount = monthlyDebts.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

    const totalMonthlyAmount = Math.round(monthlyCashAmount + monthlyItemsAmount + monthlyDebtsAmount)
    const totalMonthlyUnsettled = Math.round(monthlyUnsettledCashAmount + monthlyUnsettledItemsAmount)

    // حساب عدد العمليات الفعلية فقط (استثناء الديون صفرية المبلغ)
    const actualMonthlyOperations = monthlyCash.length + monthlyItems.length + monthlyDebts.filter((d: any) => Number(d.amount || 0) > 0).length

    message += `📊 إجمالي العمليات: ${actualMonthlyOperations} عملية\n`
    message += `💰 إجمالي المبالغ: ${totalMonthlyAmount.toLocaleString('ar-EG')} ج\n`
    message += `⏳ غير مسوّى: ${totalMonthlyUnsettled.toLocaleString('ar-EG')} ج\n\n`

    message += `💵 السلف النقدية: ${monthlyCash.length} عملية (${Math.round(monthlyCashAmount).toLocaleString('ar-EG')} ج)\n`
    message += `   └ غير مسوّى: ${monthlyUnsettledCash.length} عملية (${Math.round(monthlyUnsettledCashAmount).toLocaleString('ar-EG')} ج)\n`
    message += `📦 سحب الأصناف: ${monthlyItems.length} عملية (${Math.round(monthlyItemsAmount).toLocaleString('ar-EG')} ج)\n`
    message += `   └ غير مسوّى: ${monthlyUnsettledItems.length} عملية (${Math.round(monthlyUnsettledItemsAmount).toLocaleString('ar-EG')} ج)\n`
    if (monthlyDebts.length > 0) {
      const monthlyUnsettledDebts = monthlyDebts.filter((t: any) => !t.isSettled && !t.isManuallySettled)
      const monthlyUnsettledDebtsAmount = monthlyUnsettledDebts.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
      message += `📝 ديون الموظف: ${monthlyDebts.length} عملية (${Math.round(monthlyDebtsAmount).toLocaleString('ar-EG')} ج) - مسوّاة ✅\n`
      if (monthlyUnsettledDebts.length > 0) {
        message += `   └ غير مسوّى: ${monthlyUnsettledDebts.length} عملية (${Math.round(monthlyUnsettledDebtsAmount).toLocaleString('ar-EG')} ج)\n`
      }
    }
    message += '\n'

    // أكثر العاملين سحباً هذا الشهر
    if (topMonthlyEmployees.length > 0) {
      message += '👥 **أكثر العاملين سحباً هذا الشهر:**\n'
      topMonthlyEmployees.forEach((emp, idx) => {
        message += `${idx + 1}. ${emp.nickname} (${emp.position})\n`
        message += `   💰 ${Math.round(emp.totalAmount).toLocaleString('ar-EG')} ج • ${emp.totalCount} عملية\n`
      })
      message += '\n'
    }

    // ═══════════════════════════════
    // القسم 2: آخر 3 شهور
    // ═══════════════════════════════
    message += '━━━━━━━━━━━━━━━━━━━━\n\n'
    message += '📈 **آخر 3 شهور**\n\n'

    const last3MonthsCash = last3MonthsTransactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE')
    const last3MonthsItems = last3MonthsTransactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL')
    const last3MonthsDebts = last3MonthsTransactions.filter((t: any) => t.transactionType === 'EMPLOYEE_DEBT')

    const last3MonthsCashAmount = last3MonthsCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const last3MonthsItemsAmount = last3MonthsItems.reduce((sum: number, t: any) => {
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)
    const last3MonthsDebtsAmount = last3MonthsDebts.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const totalLast3MonthsAmount = Math.round(last3MonthsCashAmount + last3MonthsItemsAmount + last3MonthsDebtsAmount)

    // حساب عدد العمليات الفعلية
    const actualLast3MonthsOps = last3MonthsCash.length + last3MonthsItems.length + last3MonthsDebts.filter((d: any) => Number(d.amount || 0) > 0).length

    message += `📊 إجمالي العمليات: ${actualLast3MonthsOps} عملية\n`
    message += `💰 إجمالي المبالغ: ${totalLast3MonthsAmount.toLocaleString('ar-EG')} ج\n\n`

    const last3UnsettledCash = last3MonthsCash.filter((t: any) => !t.isSettled && !t.isManuallySettled)
    const last3UnsettledItems = last3MonthsItems.filter((t: any) => !t.isSettled && !t.isManuallySettled)
    const last3UnsettledCashAmount = last3UnsettledCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    const last3UnsettledItemsAmount = last3UnsettledItems.reduce((sum: number, t: any) => {
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    message += `💵 السلف النقدية: ${last3MonthsCash.length} عملية (${Math.round(last3MonthsCashAmount).toLocaleString('ar-EG')} ج)\n`
    message += `   └ غير مسوّى: ${last3UnsettledCash.length} عملية (${Math.round(last3UnsettledCashAmount).toLocaleString('ar-EG')} ج)\n`
    message += `📦 سحب الأصناف: ${last3MonthsItems.length} عملية (${Math.round(last3MonthsItemsAmount).toLocaleString('ar-EG')} ج)\n`
    message += `   └ غير مسوّى: ${last3UnsettledItems.length} عملية (${Math.round(last3UnsettledItemsAmount).toLocaleString('ar-EG')} ج)\n`
    if (last3MonthsDebts.length > 0) {
      const last3UnsettledDebts = last3MonthsDebts.filter((t: any) => !t.isSettled && !t.isManuallySettled)
      const last3UnsettledDebtsAmount = last3UnsettledDebts.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
      message += `📝 ديون الموظف: ${last3MonthsDebts.length} عملية (${Math.round(last3MonthsDebtsAmount).toLocaleString('ar-EG')} ج)\n`
      if (last3UnsettledDebts.length > 0) {
        message += `   └ غير مسوّى: ${last3UnsettledDebts.length} عملية (${Math.round(last3UnsettledDebtsAmount).toLocaleString('ar-EG')} ج)\n`
      }
    }
    message += '\n'

    // أكثر العاملين سحباً خلال 3 شهور
    if (topLast3MonthsEmployees.length > 0) {
      message += '👥 **أكثر العاملين سحباً خلال 3 شهور:**\n'
      topLast3MonthsEmployees.forEach((emp, idx) => {
        message += `${idx + 1}. ${emp.nickname} (${emp.position})\n`
        message += `   💰 ${Math.round(emp.totalAmount).toLocaleString('ar-EG')} ج • ${emp.totalCount} عملية\n`
      })
      message += '\n'
    }

    // ═══════════════════════════════
    // القسم 3: نشاط المسجلين
    // ═══════════════════════════════
    if (topAdmins.length > 0) {
      message += '━━━━━━━━━━━━━━━━━━━━\n\n'
      message += '👨‍💼 **نشاط المسجلين:**\n'
      topAdmins.forEach((admin) => {
        const roleIcon = admin.role === 'SUPER_ADMIN' ? '⭐' : '👤'
        message += `${roleIcon} ${admin.nickname}: ${admin.count} عملية\n`
      })
      message += '\n'
    }

    // لوحة المفاتيح
    const keyboard = new InlineKeyboard()
      .text('📥 تصدير Excel', 'hr:reports:export:start')
      .row()
      .text('📋 المسحوبات غير المسواة', 'hr:reports:unsettled:1')
      .row()
      .text('⬅️ رجوع', 'advancesHandler')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch {
    ctx.logger.error('Error showing comprehensive report')
    await ctx.reply('❌ حدث خطأ أثناء جلب التقرير. حاول مرة أخرى.')
  }
}

// ============================================
// 📥 بدء عملية التصدير
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:start', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📊 تقرير كامل', 'hr:reports:export:full')
    .row()
    .text('🔍 تقرير مفلتر', 'hr:reports:export:filtered')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:reports')

  await ctx.editMessageText(
    '📥 **تصدير تقرير Excel**\n\nاختر نوع التقرير:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// ============================================
// 📊 تصدير تقرير كامل
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:full', async (ctx) => {
  await ctx.answerCallbackQuery('⏳ جاري إنشاء التقرير...')

  await ctx.reply('⏳ جاري إنشاء ملف Excel... قد يستغرق بعض الوقت...', { parse_mode: 'Markdown' })

  try {
    const userId = ctx.from?.id || 0
    const fileName = await generateExcelReport({
      period: 'all',
      transactionType: 'all',
      settlementStatus: 'all',
    }, userId)

    const file = new InputFile(fileName)
    await ctx.replyWithDocument(file, {
      caption: '✅ **تم إنشاء التقرير الكامل بنجاح!**\n\n📊 يحتوي الملف على:\n▫️ شيت العمليات الكاملة\n▫️ شيت الإحصائيات والمقارنات',
      parse_mode: 'Markdown',
    })

    await fs.promises.unlink(fileName)
  }
  catch {
    ctx.logger.error('Error generating full Excel report')
    await ctx.reply('❌ حدث خطأ أثناء إنشاء التقرير. حاول مرة أخرى.')
  }
})

// ============================================
// 🔍 تصدير تقرير مفلتر
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:filtered', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  reportCache.set(userId, {
    period: 'all',
    transactionType: 'all',
    settlementStatus: 'all',
  })

  await showExportFilterOptions(ctx)
})

async function showExportFilterOptions(ctx: any) {
  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = reportCache.get(userId) || {
    period: 'all',
    transactionType: 'all',
    settlementStatus: 'all',
  }

  const periodText
    = filter.period === 'all'
      ? 'كل الفترات'
      : filter.period === 'today'
        ? 'اليوم'
        : filter.period === 'week'
          ? 'هذا الأسبوع'
          : filter.period === 'month'
            ? 'هذا الشهر'
            : filter.period === 'year'
              ? 'هذا العام'
              : 'كل الفترات'

  const typeText
    = filter.transactionType === 'all'
      ? 'الكل'
      : filter.transactionType === 'CASH_ADVANCE'
        ? 'سلف نقدية'
        : filter.transactionType === 'ITEM_WITHDRAWAL'
          ? 'سحب أصناف'
          : 'الكل'

  const settlementText
    = filter.settlementStatus === 'all'
      ? 'الكل'
      : filter.settlementStatus === 'settled'
        ? 'مسوّى'
        : filter.settlementStatus === 'unsettled'
          ? 'غير مسوّى'
          : 'الكل'

  let message = '🔍 **إعدادات التقرير المفلتر**\n\n'
  message += '📋 الفلاتر الحالية:\n\n'
  message += `📅 الفترة: ${periodText}\n`
  message += `💰 النوع: ${typeText}\n`
  message += `📋 التسوية: ${settlementText}\n\n`
  message += 'اختر فلتر للتعديل أو صدّر التقرير:'

  const keyboard = new InlineKeyboard()
    .text('📅 فلترة الفترة', 'hr:reports:export:filter:period')
    .row()
    .text('💵 فلترة النوع', 'hr:reports:export:filter:type')
    .row()
    .text('✅ فلترة التسوية', 'hr:reports:export:filter:settlement')
    .row()
    .text('✅ تصدير التقرير', 'hr:reports:export:apply')
    .row()
    .text('⬅️ رجوع', 'hr:reports:export:start')

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

// ============================================
// فلترة الفترة
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:filter:period', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📋 كل الفترات', 'hr:reports:export:period:all')
    .row()
    .text('📅 اليوم', 'hr:reports:export:period:today')
    .row()
    .text('📅 هذا الأسبوع', 'hr:reports:export:period:week')
    .row()
    .text('📅 هذا الشهر', 'hr:reports:export:period:month')
    .row()
    .text('📅 هذا العام', 'hr:reports:export:period:year')
    .row()
    .text('⬅️ رجوع', 'hr:reports:export:filtered')

  await ctx.editMessageText('📅 **اختر الفترة الزمنية:**', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

const periodChoices = ['all', 'today', 'week', 'month', 'year']
for (const choice of periodChoices) {
  transactionsReportsHandler.callbackQuery(`hr:reports:export:period:${choice}`, async (ctx) => {
    await ctx.answerCallbackQuery()
    const userId = ctx.from?.id
    if (!userId)
      return
    const filter = reportCache.get(userId) || { period: 'all', transactionType: 'all', settlementStatus: 'all' }
    filter.period = choice as any
    reportCache.set(userId, filter)
    await showExportFilterOptions(ctx)
  })
}

// ============================================
// فلترة النوع
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:filter:type', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📋 الكل', 'hr:reports:export:type:all')
    .row()
    .text('💵 سلف نقدية', 'hr:reports:export:type:cash')
    .row()
    .text('📦 سحب أصناف', 'hr:reports:export:type:items')
    .row()
    .text('⬅️ رجوع', 'hr:reports:export:filtered')

  await ctx.editMessageText('💵 **اختر نوع العملية:**', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

transactionsReportsHandler.callbackQuery('hr:reports:export:type:all', async (ctx) => {
  await ctx.answerCallbackQuery()
  const userId = ctx.from?.id
  if (!userId)
    return
  const filter = reportCache.get(userId) || { period: 'all', transactionType: 'all', settlementStatus: 'all' }
  filter.transactionType = 'all'
  reportCache.set(userId, filter)
  await showExportFilterOptions(ctx)
})

transactionsReportsHandler.callbackQuery('hr:reports:export:type:cash', async (ctx) => {
  await ctx.answerCallbackQuery()
  const userId = ctx.from?.id
  if (!userId)
    return
  const filter = reportCache.get(userId) || { period: 'all', transactionType: 'all', settlementStatus: 'all' }
  filter.transactionType = 'CASH_ADVANCE'
  reportCache.set(userId, filter)
  await showExportFilterOptions(ctx)
})

transactionsReportsHandler.callbackQuery('hr:reports:export:type:items', async (ctx) => {
  await ctx.answerCallbackQuery()
  const userId = ctx.from?.id
  if (!userId)
    return
  const filter = reportCache.get(userId) || { period: 'all', transactionType: 'all', settlementStatus: 'all' }
  filter.transactionType = 'ITEM_WITHDRAWAL'
  reportCache.set(userId, filter)
  await showExportFilterOptions(ctx)
})

// ============================================
// فلترة التسوية
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:filter:settlement', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📋 الكل', 'hr:reports:export:settlement:all')
    .row()
    .text('✅ مسوّى', 'hr:reports:export:settlement:settled')
    .row()
    .text('⏳ غير مسوّى', 'hr:reports:export:settlement:unsettled')
    .row()
    .text('⬅️ رجوع', 'hr:reports:export:filtered')

  await ctx.editMessageText('✅ **اختر حالة التسوية:**', {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
})

const settlementChoices = ['all', 'settled', 'unsettled']
for (const choice of settlementChoices) {
  transactionsReportsHandler.callbackQuery(`hr:reports:export:settlement:${choice}`, async (ctx) => {
    await ctx.answerCallbackQuery()
    const userId = ctx.from?.id
    if (!userId)
      return
    const filter = reportCache.get(userId) || { period: 'all', transactionType: 'all', settlementStatus: 'all' }
    filter.settlementStatus = choice as any
    reportCache.set(userId, filter)
    await showExportFilterOptions(ctx)
  })
}

// ============================================
// تطبيق الفلترة والتصدير
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:export:apply', async (ctx) => {
  await ctx.answerCallbackQuery('⏳ جاري إنشاء التقرير...')

  const userId = ctx.from?.id
  if (!userId)
    return

  const filter = reportCache.get(userId)
  if (!filter)
    return

  await ctx.reply('⏳ جاري إنشاء ملف Excel... قد يستغرق بعض الوقت...', { parse_mode: 'Markdown' })

  try {
    const fileName = await generateExcelReport(filter, userId)

    const file = new InputFile(fileName)
    await ctx.replyWithDocument(file, {
      caption: '✅ **تم إنشاء التقرير المفلتر بنجاح!**\n\n📊 يحتوي الملف على:\n▫️ شيت العمليات المفلترة\n▫️ شيت الإحصائيات والمقارنات',
      parse_mode: 'Markdown',
    })

    await fs.promises.unlink(fileName)
  }
  catch {
    ctx.logger.error('Error generating filtered Excel report')
    await ctx.reply('❌ حدث خطأ أثناء إنشاء التقرير. حاول مرة أخرى.')
  }
})

// ============================================
// 📊 توليد ملف Excel
// ============================================
async function generateExcelReport(filter: ReportFilter, userId: number): Promise<string> {
  const workbook = new ExcelJS.Workbook()

  // بناء شرط الاستعلام
  const whereClause: any = {}

  // فلترة الفترة
  if (filter.period && filter.period !== 'all') {
    const now = new Date()
    let startDate: Date

    if (filter.period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
    else if (filter.period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    }
    else if (filter.period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    else if (filter.period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }
    else {
      startDate = new Date(0)
    }

    whereClause.createdAt = { gte: startDate }
  }

  // فلترة النوع
  if (filter.transactionType && filter.transactionType !== 'all') {
    whereClause.transactionType = filter.transactionType
  }

  // فلترة التسوية
  if (filter.settlementStatus && filter.settlementStatus !== 'all') {
    whereClause.isSettled = filter.settlementStatus === 'settled'
  }

  // جلب البيانات مع معلومات الأدمن المسجل
  const transactions = await Database.prisma.hR_Transaction.findMany({
    where: whereClause,
    include: {
      employee: {
        include: {
          position: {
            include: {
              department: true,
            },
          },
        },
      },
      item: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // جلب بيانات الأدمن
  const creatorIds = [...new Set(transactions.map(t => Number(t.createdBy || 0)).filter(id => id > 0))]
  const creators = await Database.prisma.user.findMany({
    where: { telegramId: { in: creatorIds.map(id => BigInt(id)) } },
    select: {
      telegramId: true,
      fullName: true,
      nickname: true,
      username: true,
    },
  })
  const creatorsMap = new Map(creators.map(c => [Number(c.telegramId), c]))

  // ══════════════════════════════════════════
  // 📋 شيت 1: العمليات التفصيلية
  // ══════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('العمليات التفصيلية')
  sheet1.views = [{ rightToLeft: true }]

  // العناوين - جميع البيانات الممكنة
  const headers = [
    '#',
    'رقم العملية',
    'كود العامل',
    'اسم العامل',
    'الوظيفة',
    'القسم',
    'النوع',
    'اسم الصنف',
    'كود الصنف',
    'الكمية',
    'سعر الوحدة',
    'القيمة الإجمالية',
    'حالة التسوية',
    'نوع التسوية',
    'ملاحظات التسوية',
    'تاريخ التسوية',
    'تاريخ الإنشاء',
    'المسجل بواسطة',
    'الحالة',
    'ملاحظات العملية',
  ]
  const headerRow = sheet1.addRow(headers)

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 25

  // البيانات
  transactions.forEach((t: any, idx: number) => {
    const typeText = t.transactionType === 'CASH_ADVANCE' ? 'سلفة نقدية' : 'سحب صنف'

    // تحديد حالة التسوية بدقة
    let settlementStatus = 'غير مسوّى'
    let settlementType = '-'
    let settlementNote = '-'

    if (t.isManuallySettled) {
      settlementStatus = 'مسوّى خارجياً'
      settlementType = t.manualSettlementType === 'EXTERNAL_PAYMENT' ? 'دفع خارجي' : t.manualSettlementType || '-'
      settlementNote = t.manualSettlementNote || '-'
    }
    else if (t.isSettled) {
      settlementStatus = 'مسوّى من الراتب'
      settlementType = 'خصم من الراتب'
      settlementNote = t.settledAt ? `تم التسوية في ${new Date(t.settledAt).toLocaleDateString('ar-EG')}` : '-'
    }

    let itemName = '-'
    let itemCode = '-'
    let quantity: string | number = '-'
    let unitPrice: string | number = '-'
    let value = 0

    if (t.transactionType === 'CASH_ADVANCE') {
      itemName = 'سلفة نقدية'
      itemCode = '-'
      quantity = '-'
      unitPrice = '-'
      value = Number(t.amount || 0)
    }
    else {
      itemName = t.item?.nameAr || t.item?.nameEn || 'غير محدد'
      itemCode = t.item?.itemCode || '-'
      quantity = t.quantity || 0
      unitPrice = Number(t.unitPrice || 0)
      value = unitPrice * Number(quantity)
    }

    const creator = creatorsMap.get(Number(t.createdBy || 0))
    const creatorName = creator ? (creator.nickname || creator.fullName || creator.username || `مستخدم ${t.createdBy}`) : 'غير معروف'

    // تاريخ التسوية
    let settlementDate = '-'
    if (t.isManuallySettled && t.manuallySettledAt) {
      settlementDate = `${new Date(t.manuallySettledAt).toLocaleDateString('ar-EG')} ${new Date(t.manuallySettledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
    }
    else if (t.isSettled && t.settledAt) {
      settlementDate = `${new Date(t.settledAt).toLocaleDateString('ar-EG')} ${new Date(t.settledAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
    }

    const row = sheet1.addRow([
      idx + 1,
      t.transactionNumber,
      t.employee.employeeCode || '-',
      t.employee.nickname || t.employee.fullName,
      t.employee.position?.titleAr || 'غير محدد',
      t.employee.position?.department?.nameAr || '-',
      typeText,
      itemName,
      itemCode,
      quantity,
      unitPrice,
      value,
      settlementStatus,
      settlementType,
      settlementNote,
      settlementDate,
      `${t.createdAt.toLocaleDateString('ar-EG')} ${t.createdAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
      creatorName,
      t.status === 'APPROVED' ? 'معتمد' : t.status === 'PENDING' ? 'معلق' : 'مرفوض',
      t.notes || '-',
    ])

    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    row.height = 20

    // تلوين الصف حسب حالة التسوية
    if (t.isManuallySettled) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F3E7' } } // أخضر فاتح
    }
    else if (t.isSettled) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } } // أزرق فاتح
    }
    else if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } // رمادي فاتح
    }
  })

  // ضبط عرض الأعمدة
  sheet1.columns = [
    { width: 6 },
    { width: 28 },
    { width: 12 },
    { width: 20 },
    { width: 18 },
    { width: 15 },
    { width: 14 },
    { width: 20 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 15 },
    { width: 16 },
    { width: 14 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 10 },
    { width: 30 },
  ]

  // ══════════════════════════════════════════
  // 📊 شيت 2: الإحصائيات الشاملة
  // ══════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('الإحصائيات الشاملة')
  sheet2.views = [{ rightToLeft: true }]

  // تصنيف العمليات
  const totalCash = transactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE')
  const totalItems = transactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL')

  const settledTransactions = transactions.filter((t: any) => t.isSettled || t.isManuallySettled)
  const unsettledTransactions = transactions.filter((t: any) => !t.isSettled && !t.isManuallySettled)

  const payrollSettled = transactions.filter((t: any) => t.isSettled && !t.isManuallySettled)
  const manuallySettled = transactions.filter((t: any) => t.isManuallySettled)

  const totalCashAmount = totalCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const totalItemsAmount = totalItems.reduce((sum: number, t: any) => {
    const price = Number(t.unitPrice || 0)
    const qty = Number(t.quantity || 0)
    return sum + (price * qty)
  }, 0)

  const settledCashAmount = settledTransactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const settledItemsAmount = settledTransactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL').reduce((sum: number, t: any) => {
    const price = Number(t.unitPrice || 0)
    const qty = Number(t.quantity || 0)
    return sum + (price * qty)
  }, 0)

  const unsettledCashAmount = unsettledTransactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const unsettledItemsAmount = unsettledTransactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL').reduce((sum: number, t: any) => {
    const price = Number(t.unitPrice || 0)
    const qty = Number(t.quantity || 0)
    return sum + (price * qty)
  }, 0)

  // عنوان التقرير
  const titleRow = sheet2.addRow(['📊 إحصائيات تفصيلية للعمليات المالية'])
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF0070C0' } }
  titleRow.alignment = { horizontal: 'center' }
  sheet2.mergeCells('A1:B1')
  sheet2.addRow([])

  // القسم 1: إجمالي العمليات
  const section1Header = sheet2.addRow(['📋 إجمالي العمليات'])
  section1Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  sheet2.addRow(['إجمالي العمليات:', transactions.length])
  sheet2.addRow(['السلف النقدية:', totalCash.length])
  sheet2.addRow(['سحب الأصناف:', totalItems.length])
  sheet2.addRow([])

  // القسم 2: المبالغ الإجمالية
  const section2Header = sheet2.addRow(['💰 المبالغ الإجمالية'])
  section2Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  sheet2.addRow(['السلف النقدية:', `${totalCashAmount.toLocaleString('ar-EG')} ج.م`])
  sheet2.addRow(['سحب الأصناف:', `${totalItemsAmount.toLocaleString('ar-EG')} ج.م`])
  const totalRow = sheet2.addRow(['الإجمالي الكلي:', `${(totalCashAmount + totalItemsAmount).toLocaleString('ar-EG')} ج.م`])
  totalRow.font = { bold: true, color: { argb: 'FFFF0000' } }
  sheet2.addRow([])

  // القسم 3: حالة التسوية
  const section3Header = sheet2.addRow(['✅ حالة التسوية'])
  section3Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  sheet2.addRow(['العمليات المسوّاة:', settledTransactions.length])
  sheet2.addRow(['  - مسوّى من الراتب:', payrollSettled.length])
  sheet2.addRow(['  - مسوّى خارجياً:', manuallySettled.length])
  sheet2.addRow(['العمليات غير المسوّاة:', unsettledTransactions.length])
  sheet2.addRow([])

  // القسم 4: المبالغ حسب التسوية
  const section4Header = sheet2.addRow(['💵 المبالغ حسب التسوية'])
  section4Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  sheet2.addRow(['المبالغ المسوّاة:', `${(settledCashAmount + settledItemsAmount).toLocaleString('ar-EG')} ج.م`])
  sheet2.addRow(['المبالغ غير المسوّاة:', `${(unsettledCashAmount + unsettledItemsAmount).toLocaleString('ar-EG')} ج.م`])
  sheet2.addRow([])

  // القسم 5: نسبة التسوية
  const section5Header = sheet2.addRow(['📈 نسبة التسوية'])
  section5Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  const settlementPercentage = transactions.length > 0 ? ((settledTransactions.length / transactions.length) * 100).toFixed(2) : 0
  sheet2.addRow(['نسبة العمليات المسوّاة:', `${settlementPercentage}%`])
  sheet2.addRow([])

  // القسم 6: نشاط المسجلين
  const section6Header = sheet2.addRow(['👨‍💼 نشاط المسجلين (جميع الأدمن)'])
  section6Header.font = { bold: true, size: 13, color: { argb: 'FF2E75B6' } }
  sheet2.addRow([])

  // جلب جميع الأدمن
  const hrDepartment = await Database.prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  let allAdmins: Array<{
    telegramId: bigint
    username: string | null
    fullName: string | null
    nickname: string | null
    role: string
  }> = []

  if (hrDepartment) {
    const assignedAdmins = await Database.prisma.departmentAdmin.findMany({
      where: {
        departmentId: hrDepartment.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            telegramId: true,
            username: true,
            fullName: true,
            nickname: true,
            role: true,
          },
        },
      },
    })
    allAdmins = assignedAdmins.map(a => a.user)
  }

  const superAdmins = await Database.prisma.user.findMany({
    where: {
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: {
      telegramId: true,
      username: true,
      fullName: true,
      nickname: true,
      role: true,
    },
  })

  const uniqueAdmins = Array.from(
    new Map([...allAdmins, ...superAdmins].map(admin => [Number(admin.telegramId), admin])).values(),
  )

  // حساب عدد العمليات لكل أدمن
  const adminStatsMap = new Map<number, { nickname: string, count: number, role: string }>()

  for (const admin of uniqueAdmins) {
    const telegramId = Number(admin.telegramId)
    const count = transactions.filter(t => Number(t.createdBy) === telegramId).length
    const displayName = admin.nickname || admin.fullName || admin.username || `مستخدم ${telegramId}`
    adminStatsMap.set(telegramId, {
      nickname: displayName,
      count,
      role: admin.role,
    })
  }

  // ترتيب حسب عدد العمليات
  const sortedAdmins = Array.from(adminStatsMap.values())
    .sort((a, b) => {
      if (b.count !== a.count)
        return b.count - a.count
      if (a.role !== b.role)
        return a.role === 'SUPER_ADMIN' ? -1 : 1
      return a.nickname.localeCompare(b.nickname, 'ar')
    })

  // إضافة عناوين الجدول
  const adminHeaderRow = sheet2.addRow(['اسم المسجل', 'عدد العمليات', 'الصلاحية'])
  adminHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  adminHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }
  adminHeaderRow.alignment = { horizontal: 'center' }

  // إضافة بيانات الأدمن
  sortedAdmins.forEach((admin) => {
    const roleText = admin.role === 'SUPER_ADMIN' ? 'مدير نظام' : 'مدير قسم'
    const adminRow = sheet2.addRow([admin.nickname, admin.count, roleText])
    adminRow.alignment = { horizontal: 'center' }

    if (admin.role === 'SUPER_ADMIN') {
      adminRow.font = { bold: true }
    }
  })

  sheet2.columns = [{ width: 30 }, { width: 25 }, { width: 20 }]

  // حفظ الملف
  const fileName = path.join(process.cwd(), 'uploads', `transactions_report_${userId}_${Date.now()}.xlsx`)
  await workbook.xlsx.writeFile(fileName)

  return fileName
}

// ============================================
// 📋 عرض المسحوبات غير المسواة مع Pagination
// ============================================
transactionsReportsHandler.callbackQuery(/^hr:reports:unsettled:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match![1], 10)
  const ITEMS_PER_PAGE = 20

  try {
    const db = Database.prisma

    // جلب جميع العمليات غير المسواة
    const unsettledTransactions = await db.hR_Transaction.findMany({
      where: {
        AND: [
          { isSettled: false },
          { isManuallySettled: false },
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            nickname: true,
            fullName: true,
          },
        },
        item: {
          select: {
            nameAr: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalItems = unsettledTransactions.length
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const pageItems = unsettledTransactions.slice(startIndex, endIndex)

    if (pageItems.length === 0) {
      await ctx.editMessageText('✅ لا توجد مسحوبات غير مسوّاة حالياً!', {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'hr:transactions:reports'),
      })
      return
    }

    // بناء الرسالة
    let message = `📋 **المسحوبات غير المسوّاة**\n\n`
    message += `📊 العدد الإجمالي: ${totalItems} عملية\n`
    message += `📄 الصفحة ${page} من ${totalPages}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    for (const transaction of pageItems) {
      const employeeName = transaction.employee.nickname || transaction.employee.fullName
      const date = new Date(transaction.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      let description = ''
      let amount = 0

      if (transaction.transactionType === 'CASH_ADVANCE') {
        description = 'سلفة نقدية'
        amount = Number(transaction.amount || 0)
      }
      else if (transaction.transactionType === 'ITEM_WITHDRAWAL') {
        const itemName = transaction.item?.nameAr || 'صنف'
        description = `سحب: ${itemName}`
        amount = Number(transaction.unitPrice || 0) * Number(transaction.quantity || 0)
      }
      else if (transaction.transactionType === 'EMPLOYEE_DEBT') {
        description = 'دين موظف'
        amount = Number(transaction.amount || 0)
      }

      message += `📌 ${transaction.transactionNumber}\n`
      message += `👤 ${employeeName}\n`
      message += `📝 ${description}\n`
      message += `💰 ${Math.round(amount).toLocaleString('ar-EG')} ج\n`
      message += `📅 ${date}\n`
      message += `\n`
    }

    // لوحة المفاتيح للتنقل والإجراءات
    const keyboard = new InlineKeyboard()

    // أزرار التنقل
    if (page > 1) {
      keyboard.text('⏮️ الأولى', `hr:reports:unsettled:1`)
      keyboard.text('◀️ السابقة', `hr:reports:unsettled:${page - 1}`)
    }
    if (page < totalPages) {
      keyboard.text('▶️ التالية', `hr:reports:unsettled:${page + 1}`)
      keyboard.text('⏭️ الأخيرة', `hr:reports:unsettled:${totalPages}`)
    }
    keyboard.row()

    // زر لاختيار عملية للإجراء
    keyboard.text('✏️ تعديل/حذف عملية', 'hr:reports:unsettled:select').row()
    keyboard.text('⬅️ رجوع للتقارير', 'hr:transactions:reports')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error: any) {
    ctx.logger.error('Error showing unsettled transactions:', error)
    await ctx.reply('❌ حدث خطأ أثناء جلب المسحوبات غير المسواة.')
  }
})

// ============================================
// ✏️ اختيار عملية لتعديلها أو حذفها
// ============================================
transactionsReportsHandler.callbackQuery('hr:reports:unsettled:select', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const db = Database.prisma

    // جلب آخر 50 عملية غير مسواة فقط للاختيار
    const transactions = await db.hR_Transaction.findMany({
      where: {
        AND: [
          { isSettled: false },
          { isManuallySettled: false },
        ],
      },
      include: {
        employee: {
          select: {
            nickname: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    if (transactions.length === 0) {
      await ctx.answerCallbackQuery({
        text: '✅ لا توجد مسحوبات غير مسوّاة!',
        show_alert: true,
      })
      return
    }

    let message = `✏️ **اختر العملية للتعديل أو الحذف**\n\n`
    message += `📊 عرض آخر ${transactions.length} عملية غير مسوّاة\n\n`

    const keyboard = new InlineKeyboard()

    for (const transaction of transactions) {
      const employeeName = transaction.employee.nickname || transaction.employee.fullName
      const date = new Date(transaction.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })

      let amount = 0
      if (transaction.transactionType === 'CASH_ADVANCE') {
        amount = Number(transaction.amount || 0)
      }
      else if (transaction.transactionType === 'ITEM_WITHDRAWAL') {
        amount = Number(transaction.unitPrice || 0) * Number(transaction.quantity || 0)
      }
      else if (transaction.transactionType === 'EMPLOYEE_DEBT') {
        amount = Number(transaction.amount || 0)
      }

      const label = `${employeeName} - ${Math.round(amount)} ج (${date})`
      keyboard.text(label.substring(0, 30), `hr:reports:trans:${transaction.id}`).row()
    }

    keyboard.text('⬅️ رجوع', 'hr:reports:unsettled:1')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error: any) {
    ctx.logger.error('Error selecting transaction:', error)
    await ctx.reply('❌ حدث خطأ أثناء جلب العمليات.')
  }
})

// ============================================
// 🔍 عرض تفاصيل العملية مع خيارات التعديل/الحذف
// ============================================
transactionsReportsHandler.callbackQuery(/^hr:reports:trans:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const transactionId = Number.parseInt(ctx.match![1], 10)

  try {
    const db = Database.prisma

    const transaction = await db.hR_Transaction.findUnique({
      where: { id: transactionId },
      include: {
        employee: {
          select: {
            nickname: true,
            fullName: true,
            employeeCode: true,
          },
        },
        item: {
          select: {
            nameAr: true,
          },
        },
        changeLogs: {
          orderBy: {
            changedAt: 'desc',
          },
          take: 10, // آخر 10 تعديلات
        },
      },
    })

    if (!transaction) {
      await ctx.answerCallbackQuery({
        text: '❌ العملية غير موجودة!',
        show_alert: true,
      })
      return
    }

    const employeeName = transaction.employee.nickname || transaction.employee.fullName
    const date = new Date(transaction.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let message = `📋 **تفاصيل العملية**\n\n`
    message += `🔢 رقم العملية: ${transaction.transactionNumber}\n`
    message += `👤 الموظف: ${employeeName} (${transaction.employee.employeeCode})\n`
    message += `📅 التاريخ: ${date}\n\n`

    if (transaction.transactionType === 'CASH_ADVANCE') {
      message += `📝 النوع: سلفة نقدية\n`
      message += `💰 المبلغ: ${Math.round(Number(transaction.amount)).toLocaleString('ar-EG')} ج\n`
    }
    else if (transaction.transactionType === 'ITEM_WITHDRAWAL') {
      const itemName = transaction.item?.nameAr || 'غير محدد'
      const qty = Number(transaction.quantity || 0)
      const price = Number(transaction.unitPrice || 0)
      const total = qty * price

      message += `📝 النوع: سحب صنف\n`
      message += `📦 الصنف: ${itemName}\n`
      message += `🔢 الكمية: ${qty}\n`
      message += `💵 سعر الوحدة: ${Math.round(price).toLocaleString('ar-EG')} ج\n`
      message += `💰 الإجمالي: ${Math.round(total).toLocaleString('ar-EG')} ج\n`
    }
    else if (transaction.transactionType === 'EMPLOYEE_DEBT') {
      message += `📝 النوع: دين موظف\n`
      message += `💰 المبلغ: ${Math.round(Number(transaction.amount)).toLocaleString('ar-EG')} ج\n`
    }

    if (transaction.description) {
      message += `\n📄 الوصف: ${transaction.description}\n`
    }

    if (transaction.notes) {
      message += `📝 ملاحظات: ${transaction.notes}\n`
    }

    message += `\n⚠️ الحالة: ${transaction.isSettled ? 'مسوّاة ✅' : 'غير مسوّاة ⏳'}\n`

    // عرض سجل التعديلات
    if (transaction.changeLogs && transaction.changeLogs.length > 0) {
      message += `\n━━━━━━━━━━━━━━━━━━━━\n`
      message += `📜 **سجل التعديلات:**\n\n`

      for (const log of transaction.changeLogs) {
        const changeDate = new Date(log.changedAt).toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        // جلب بيانات المستخدم الذي قام بالتعديل
        const user = await db.user.findUnique({
          where: { telegramId: log.changedBy },
          select: {
            nickname: true,
            fullName: true,
            username: true,
          },
        })

        const userName = user?.nickname || user?.fullName || user?.username || `مستخدم ${log.changedBy}`

        let changeIcon = '✏️'
        if (log.changeType === 'DELETE')
          changeIcon = '🗑️'
        else if (log.changeType === 'RESTORE')
          changeIcon = '♻️'

        message += `${changeIcon} **${log.reason}**\n`
        message += `   👤 بواسطة: ${userName}\n`
        message += `   📅 ${changeDate}\n`

        if (log.fieldName) {
          message += `   📝 الحقل: ${log.fieldName}\n`
          if (log.oldValue)
            message += `   ⬅️ من: ${log.oldValue}\n`
          if (log.newValue)
            message += `   ➡️ إلى: ${log.newValue}\n`
        }

        message += `\n`
      }
    }

    const keyboard = new InlineKeyboard()
      .text('🗑️ حذف ناعم', `hr:reports:trans:delete:${transactionId}`)
      .row()
      .text('⬅️ رجوع', 'hr:reports:unsettled:select')

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
  catch (error: any) {
    ctx.logger.error('Error showing transaction details:', error)
    await ctx.reply('❌ حدث خطأ أثناء جلب تفاصيل العملية.')
  }
})

// ============================================
// 🗑️ حذف ناعم للعملية
// ============================================
transactionsReportsHandler.callbackQuery(/^hr:reports:trans:delete:(\d+)$/, async (ctx) => {
  const transactionId = Number.parseInt(ctx.match![1], 10)

  try {
    const db = Database.prisma

    // جلب بيانات العملية قبل الحذف
    const transaction = await db.hR_Transaction.findUnique({
      where: { id: transactionId },
      select: {
        transactionNumber: true,
        status: true,
      },
    })

    // الحذف الناعم: تغيير الحالة إلى CANCELLED
    await db.hR_Transaction.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        updatedBy: BigInt(ctx.from!.id),
      },
    })

    // تسجيل في Audit Log
    await logTransactionChange(
      transactionId,
      'DELETE',
      'حذف ناعم للعملية من تقرير المسحوبات غير المسواة',
      BigInt(ctx.from!.id),
      {
        fieldName: 'status',
        oldValue: transaction?.status || 'PENDING',
        newValue: 'CANCELLED',
        metadata: {
          transactionNumber: transaction?.transactionNumber,
          action: 'soft_delete',
          source: 'unsettled_transactions_report',
        },
      },
    )

    await ctx.answerCallbackQuery({
      text: '✅ تم الحذف الناعم للعملية بنجاح!',
      show_alert: true,
    })

    // العودة لقائمة العمليات
    await ctx.editMessageText('✅ تم حذف العملية (حذف ناعم) بنجاح!', {
      reply_markup: new InlineKeyboard()
        .text('📋 عرض المسحوبات غير المسواة', 'hr:reports:unsettled:1')
        .row()
        .text('⬅️ رجوع للتقارير', 'hr:transactions:reports'),
    })
  }
  catch (error: any) {
    ctx.logger.error('Error soft deleting transaction:', error)
    await ctx.answerCallbackQuery({
      text: '❌ حدث خطأ أثناء حذف العملية!',
      show_alert: true,
    })
  }
})

// ============================================
// 📜 Helper: تسجيل التغيير في Audit Log
// ============================================
async function logTransactionChange(
  transactionId: number,
  changeType: 'EDIT' | 'DELETE' | 'RESTORE',
  reason: string,
  changedBy: bigint,
  details?: {
    fieldName?: string
    oldValue?: string
    newValue?: string
    metadata?: any
  },
) {
  try {
    await Database.prisma.hR_TransactionChangeLog.create({
      data: {
        transactionId,
        changeType,
        reason,
        changedBy,
        fieldName: details?.fieldName,
        oldValue: details?.oldValue,
        newValue: details?.newValue,
        metadata: details?.metadata,
      },
    })
  }
  catch (error: any) {
    console.error('Error logging transaction change:', error)
  }
}
