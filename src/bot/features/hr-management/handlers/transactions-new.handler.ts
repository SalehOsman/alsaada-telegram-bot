import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { isPositiveNumber } from '../../../../modules/input/validators/index.js'

export const transactionsNewHandler = new Composer<Context>()

// تخزين بيانات النموذج
interface TransactionFormData {
  step: string
  employeeId?: number
  employeeCode?: string
  employeeName?: string
  employeeNickname?: string
  employeePosition?: string
  transactionType?: 'CASH_ADVANCE' | 'ITEM_WITHDRAWAL'
  itemId?: number
  itemName?: string
  itemPrice?: number
  quantity?: number
  amount?: number
  description?: string
  notes?: string
  messageIds?: number[] // لحذف الرسائل بعد الانتهاء
}

const transactionFormData = new Map<number, TransactionFormData>()

// ============================================
// 🎯 بدء تدفق تسجيل عملية جديدة
// ============================================
transactionsNewHandler.callbackQuery('hr:transactions:new', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  // حاول حذف رسالة القائمة الأصلية (إن وجدت) لعدم بقاءها بعد بدء التدفق
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل إذا لم نتمكن من الحذف
  }

  transactionFormData.set(userId, { step: 'selectEmployee', messageIds: [] })

  await showEmployeeSelector(ctx, 1)
})

async function showEmployeeSelector(ctx: Context, page = 1) {
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const employees = await Database.prisma.employee.findMany({
    where: {
      isActive: true,
      employmentStatus: 'ACTIVE',
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      nickname: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
    orderBy: { fullName: 'asc' },
    skip: offset,
    take: pageSize + 1,
  })

  const hasMore = employees.length > pageSize
  const displayEmployees = hasMore ? employees.slice(0, pageSize) : employees

  if (displayEmployees.length === 0) {
    const msg = await ctx.reply('❌ لا يوجد موظفون نشطون حالياً.')
    // تتأكد من تسجيل رسالة الخطأ ليتم حذفها لاحقاً
    const userId = ctx.from?.id
    if (userId) {
      const data = transactionFormData.get(userId)
      if (data)
        data.messageIds!.push(msg.message_id)
    }
    return
  }

  const keyboard = new InlineKeyboard()
  displayEmployees.forEach((emp) => {
    const displayName = emp.nickname || emp.fullName
    keyboard
      .text(`${displayName} (${emp.position.titleAr})`, `hr:transactions:employee:${emp.id}`)
      .row()
  })

  // أزرار التنقل
  const navRow: any[] = []
  if (page > 1) {
    navRow.push(InlineKeyboard.text('⬅️ السابق', `hr:transactions:newpage:${page - 1}`))
  }
  if (hasMore) {
    navRow.push(InlineKeyboard.text('➡️ التالي', `hr:transactions:newpage:${page + 1}`))
  }
  if (navRow.length > 0) {
    keyboard.row(...navRow)
  }

  keyboard.text('❌ إلغاء والعودة للقائمة الرئيسية', 'advancesHandler')

  // نستخدم reply حتى نحصل على message_id ونستطيع حذفه لاحقاً
  const msg = await ctx.reply(`👤 **اختر العامل**\n\n`
    + `الصفحة ${page} - عدد الموظفين: ${displayEmployees.length}`, { parse_mode: 'Markdown', reply_markup: keyboard })

  const userId = ctx.from?.id
  if (userId) {
    const data = transactionFormData.get(userId)
    if (data)
      data.messageIds!.push(msg.message_id)
  }
}

// ============================================
// معالجة اختيار الموظف
// ============================================
transactionsNewHandler.callbackQuery(/^hr:transactions:employee:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'selectEmployee')
    return

  const employeeId = Number.parseInt(ctx.match![1])
  const employee = await Database.prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      nickname: true,
      position: {
        select: {
          titleAr: true,
        },
      },
    },
  })

  if (!employee) {
    await ctx.answerCallbackQuery({
      text: '❌ الموظف غير موجود',
      show_alert: true,
    })
    return
  }

  data.employeeId = employee.id
  data.employeeCode = employee.employeeCode
  data.employeeName = employee.fullName
  data.employeeNickname = employee.nickname ?? undefined
  data.employeePosition = employee.position.titleAr
  data.step = 'selectType'

  // حذف الرسالة السابقة
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل الخطأ إذا فشل الحذف
  }

  const keyboard = new InlineKeyboard()
    .text('💵 سلفة نقدية', 'hr:transactions:type:CASH_ADVANCE')
    .row()
    .text('📦 مسحوب عيني', 'hr:transactions:type:ITEM_WITHDRAWAL')
    .row()
    .text('❌ إلغاء', 'advancesHandler')

  const displayName = data.employeeNickname || data.employeeName
  const msg = await ctx.reply(
    `👤 **العامل:** ${displayName} (${data.employeePosition})\n\n`
    + '📝 **اختر نوع العملية:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
  data.messageIds!.push(msg.message_id)
})

// ============================================
// معالجة اختيار نوع العملية
// ============================================
transactionsNewHandler.callbackQuery(/^hr:transactions:type:(CASH_ADVANCE|ITEM_WITHDRAWAL)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'selectType')
    return

  const type = ctx.match![1] as 'CASH_ADVANCE' | 'ITEM_WITHDRAWAL'
  data.transactionType = type

  // حذف الرسالة السابقة
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل الخطأ
  }

  if (type === 'CASH_ADVANCE') {
    data.step = 'enterAmount'

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'advancesHandler')

    const displayName = data.employeeNickname || data.employeeName
    const msg = await ctx.reply(
      `👤 **العامل:** ${displayName} (${data.employeePosition})\n`
      + `💵 **النوع:** سلفة نقدية\n\n`
      + '💰 أدخل مبلغ السلفة بالجنيه:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
    data.messageIds!.push(msg.message_id)
  }
  else {
    await showItemsSelector(ctx, data)
  }
})

async function showItemsSelector(ctx: Context, data: TransactionFormData) {
  const items = await Database.prisma.hR_AdvanceItem.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: 'asc' }, { nameAr: 'asc' }],
  })

  if (items.length === 0) {
    const msg = await ctx.reply('❌ لا توجد أصناف عينية متاحة حالياً.\n\n'
      + 'يرجى التواصل مع الإدارة لإضافة أصناف.')
    const userId = ctx.from?.id
    if (userId) {
      const data = transactionFormData.get(userId)
      if (data)
        data.messageIds!.push(msg.message_id)
    }
    transactionFormData.delete(ctx.from!.id!)
    return
  }

  data.step = 'selectItem'

  const keyboard = new InlineKeyboard()
  items.forEach((item: any) => {
    keyboard
      .text(`${item.nameAr} (${item.price} ج/${item.unit})`, `hr:transactions:item:${item.id}`)
      .row()
  })
  keyboard.text('❌ إلغاء', 'advancesHandler')

  const displayName = data.employeeNickname || data.employeeName
  const msg = await ctx.reply(
    `👤 **العامل:** ${displayName} (${data.employeePosition})\n`
    + `📦 **النوع:** مسحوب عيني\n\n`
    + '📋 **اختر الصنف:**',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
  data.messageIds!.push(msg.message_id)
}

// ============================================
// معالجة اختيار الصنف
// ============================================
transactionsNewHandler.callbackQuery(/^hr:transactions:item:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'selectItem')
    return

  const itemId = Number.parseInt(ctx.match![1])
  const item = await Database.prisma.hR_AdvanceItem.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    await ctx.answerCallbackQuery({
      text: '❌ الصنف غير موجود',
      show_alert: true,
    })
    return
  }

  data.itemId = item.id
  data.itemName = item.nameAr
  data.itemPrice = item.price
  data.step = 'enterQuantity'

  // حذف الرسالة السابقة
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل الخطأ
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'advancesHandler')

  const displayName = data.employeeNickname || data.employeeName
  const msg = await ctx.reply(
    `👤 **العامل:** ${displayName} (${data.employeePosition})\n`
    + `📦 **الصنف:** ${item.nameAr}\n`
    + `💵 **السعر:** ${item.price} ج/${item.unit}\n\n`
    + `📊 أدخل الكمية (بالـ${item.unit}):`,
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
  data.messageIds!.push(msg.message_id)
})

// ============================================
// معالجة إدخال المبلغ أو الكمية
// ============================================
transactionsNewHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = transactionFormData.get(userId)
  if (!data)
    return next()

  const text = ctx.message.text.trim()

  try {
    // حذف رسالة المستخدم
    try {
      await ctx.deleteMessage()
    }
    catch {
      // تجاهل الخطأ
    }

    if (data.step === 'enterAmount') {
      const amount = Number.parseFloat(text)
      if (!isPositiveNumber(text) || amount <= 0) {
        const errorMsg = await ctx.reply('❌ المبلغ يجب أن يكون رقماً موجباً.')
        data.messageIds!.push(errorMsg.message_id)
        return
      }

      data.amount = amount
      data.step = 'enterNotes'

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي', 'hr:transactions:skip_notes')
        .row()
        .text('❌ إلغاء', 'advancesHandler')

      const msg = await ctx.reply(
        '📝 **أدخل ملاحظات على العملية** (اختياري):\n\n'
        + 'أو اضغط "تخطي" للمتابعة بدون ملاحظات.',
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      data.messageIds!.push(msg.message_id)
    }
    else if (data.step === 'enterQuantity') {
      const quantity = Number.parseFloat(text)
      if (!isPositiveNumber(text) || quantity <= 0) {
        const errorMsg = await ctx.reply('❌ الكمية يجب أن تكون رقماً موجباً.')
        data.messageIds!.push(errorMsg.message_id)
        return
      }

      data.quantity = quantity
      data.amount = quantity * data.itemPrice!
      data.step = 'enterNotes'

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي', 'hr:transactions:skip_notes')
        .row()
        .text('❌ إلغاء', 'advancesHandler')

      const msg = await ctx.reply(
        '📝 **أدخل ملاحظات على العملية** (اختياري):\n\n'
        + 'أو اضغط "تخطي" للمتابعة بدون ملاحظات.',
        { parse_mode: 'Markdown', reply_markup: keyboard },
      )
      data.messageIds!.push(msg.message_id)
    }
    else if (data.step === 'enterNotes') {
      data.notes = text
      await showConfirmation(ctx, data)
    }
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error in transaction form')
    await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.')
    transactionFormData.delete(userId)
  }
})

// ============================================
// تخطي الملاحظات
// ============================================
transactionsNewHandler.callbackQuery('hr:transactions:skip_notes', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'enterNotes')
    return

  // حذف الرسالة السابقة
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل الخطأ
  }

  await showConfirmation(ctx, data)
})

// ============================================
// عرض ملخص للتأكيد
// ============================================
async function showConfirmation(ctx: Context, data: TransactionFormData) {
  data.step = 'confirm'

  const displayName = data.employeeNickname || data.employeeName
  let message = '📋 **مراجعة العملية**\n\n'
  message += `👤 **العامل:** ${displayName} (${data.employeePosition})\n`

  if (data.transactionType === 'CASH_ADVANCE') {
    message += `💵 **النوع:** سلفة نقدية\n`
    message += `💰 **المبلغ:** ${data.amount} جنيه\n`
  }
  else {
    message += `📦 **النوع:** مسحوب عيني\n`
    message += `📋 **الصنف:** ${data.itemName}\n`
    message += `📊 **الكمية:** ${data.quantity}\n`
    message += `💵 **سعر الوحدة:** ${data.itemPrice} جنيه\n`
    message += `💰 **الإجمالي:** ${data.amount} جنيه\n`
  }

  if (data.notes) {
    message += `📝 **ملاحظات:** ${data.notes}\n`
  }

  const keyboard = new InlineKeyboard()
    .text('✅ تأكيد وحفظ', 'hr:transactions:confirm')
    .row()
    .text('❌ إلغاء', 'advancesHandler')

  const msg = await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
  data.messageIds!.push(msg.message_id)
}

// ============================================
// حفظ العملية
// ============================================
transactionsNewHandler.callbackQuery('hr:transactions:confirm', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'confirm')
    return

  try {
    // حذف جميع رسائل التدفق
    for (const msgId of data.messageIds || []) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, msgId)
      }
      catch {
        // تجاهل الأخطاء
      }
    }

    // توليد رقم عملية مبسط: كود العامل + يوم/شهر + رقم مسلسل
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0')

    // رقم العملية: كود العامل + يوم + شهر + سنة + وقت بالميلي ثانية
    const transactionNumber = `${data.employeeCode}${day}${month}${year}${hours}${minutes}${seconds}${milliseconds}`

    let description = ''
    if (data.transactionType === 'CASH_ADVANCE') {
      description = `سلفة نقدية بمبلغ ${data.amount} جنيه`
    }
    else {
      description = `${data.quantity} × ${data.itemName}`
    }

    if (data.notes) {
      description += `\nملاحظات: ${data.notes}`
    }

    const transaction = await Database.prisma.hR_Transaction.create({
      data: {
        transactionNumber,
        employeeId: data.employeeId!,
        transactionType: data.transactionType!,
        itemId: data.itemId,
        quantity: data.quantity,
        unitPrice: data.itemPrice,
        amount: data.amount!,
        description,
        status: 'APPROVED', // تلقائي
        approvedBy: userId,
        approvedAt: now,
        createdBy: userId,
      },
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            position: {
              select: {
                titleAr: true,
              },
            },
          },
        },
        item: true,
      },
    })

    // تسجيل في Audit Log - إنشاء عملية جديدة
    const typeLabel
      = data.transactionType === 'CASH_ADVANCE'
        ? 'سلفة نقدية'
        : data.transactionType === 'ITEM_WITHDRAWAL'
          ? 'سحب صنف'
          : 'دين موظف'

    await Database.prisma.hR_TransactionChangeLog.create({
      data: {
        transactionId: transaction.id,
        changeType: 'EDIT',
        reason: `إنشاء عملية جديدة: ${typeLabel}`,
        changedBy: userId,
        metadata: {
          action: 'create',
          transactionNumber: transaction.transactionNumber,
          amount: transaction.amount,
          source: 'new_transaction_form',
        },
      },
    })

    transactionFormData.delete(userId)

    // التقرير النهائي للمسئولين
    const displayName = transaction.employee.nickname || transaction.employee.fullName
    const finalReport = [
      '✅ **تم تسجيل عملية جديدة بنجاح!**\n',
      `📋 **رقم العملية:** ${transaction.transactionNumber}`,
      `👤 **العامل:** ${displayName} (${transaction.employee.position.titleAr})`,
      `📅 **التاريخ:** ${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      `⏰ **الوقت:** ${now.toLocaleTimeString('ar-EG')}\n`,
      transaction.transactionType === 'CASH_ADVANCE'
        ? `💵 **النوع:** سلفة نقدية\n💰 **المبلغ:** ${transaction.amount} جنيه`
        : `📦 **النوع:** مسحوب عيني\n📋 **الصنف:** ${transaction.item?.nameAr}\n📊 **الكمية:** ${transaction.quantity}\n💵 **سعر الوحدة:** ${transaction.unitPrice} جنيه\n💰 **الإجمالي:** ${transaction.amount} جنيه`,
      data.notes ? `📝 **ملاحظات:** ${data.notes}` : '',
      '\n✅ **الحالة:** معتمدة',
    ].filter(Boolean).join('\n')

    // إرسال التقرير للمستخدم الحالي
    const keyboard = new InlineKeyboard()
      .text('➕ تسجيل عملية أخرى', 'hr:transactions:new')
      .row()
      .text('⬅️ العودة للقائمة الرئيسية', 'advancesHandler')

    await ctx.reply(finalReport, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // إرسال التقرير لجميع المسئولين عن HR
    const hrAdmins = await Database.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        telegramId: { not: userId }, // عدم إرسال للمستخدم الحالي مرة أخرى
      },
      select: { telegramId: true },
    })

    for (const admin of hrAdmins) {
      try {
        await ctx.api.sendMessage(Number(admin.telegramId), finalReport, { parse_mode: 'Markdown' })
      }
      catch (error) {
        ctx.logger.error({ error, adminId: admin.telegramId }, 'Failed to send report to admin')
      }
    }
  }
  catch (error) {
    ctx.logger.error({ error }, 'Error saving transaction')
    await ctx.reply('❌ حدث خطأ أثناء حفظ العملية.')
    transactionFormData.delete(userId)
  }
})

// ============================================
// التنقل بين صفحات الموظفين
// ============================================
transactionsNewHandler.callbackQuery(/^hr:transactions:newpage:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = transactionFormData.get(userId)
  if (!data || data.step !== 'selectEmployee')
    return

  const page = Number.parseInt(ctx.match![1])

  // حذف الرسالة السابقة
  try {
    await ctx.deleteMessage()
  }
  catch {
    // تجاهل الخطأ إذا فشل الحذف
  }

  await showEmployeeSelector(ctx, page)
})
