import type { Context } from '#root/bot/context.js'
import { Database } from '#root/modules/database/index.js'
import { Composer, InlineKeyboard } from 'grammy'

export const settlementsHandler = new Composer<Context>()

// ==========================================
// 📋 القائمة الرئيسية للتسويات
// ==========================================

settlementsHandler.callbackQuery('hr:transactions:settlements', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('🌍 تسوية جماعية شاملة', 'hr:settlements:all')
    .row()
    .text('👤 تسوية فردية', 'hr:settlements:individual')
    .row()
    .text('💼 تسوية حسب الوظيفة', 'hr:settlements:by-position')
    .row()
    .text('📅 تسوية حسب الفترة', 'hr:settlements:by-period')
    .row()
    .text('📊 سجل التسويات', 'hr:settlements:history')
    .row()
    .text('⬅️ رجوع', 'menu:sub:hr-management:advances')

  await ctx.editMessageText(
    '✅ **نظام التسويات**\n\n'
    + '📋 اختر نوع التسوية المطلوبة:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
})

// ==========================================
// 🌍 تسوية جماعية شاملة
// ==========================================

settlementsHandler.callbackQuery('hr:settlements:all', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma

    // جلب جميع العمليات غير المسوّاة
    const unsettledTransactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        status: 'APPROVED',
      },
    })

    if (unsettledTransactions.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:transactions:settlements')

      await ctx.editMessageText(
        '✅ **لا توجد عمليات تحتاج تسوية**\n\n'
        + 'جميع العمليات المعتمدة تم تسويتها.',
        { reply_markup: keyboard },
      )
      return
    }

    // حساب الإجمالي
    const totalAmount = unsettledTransactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('💰 تسوية من الراتب القادم', 'hr:settlements:all:type:payroll')
      .row()
      .text('💵 تم الدفع خارج النظام', 'hr:settlements:all:type:external')
      .row()
      .text('❌ إلغاء', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '🌍 **تسوية جماعية شاملة**\n\n'
      + `📋 عدد العمليات: ${unsettledTransactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '⚠️ **اختر نوع التسوية:**\n\n'
      + '💰 **من الراتب القادم:**\n'
      + '   ← سيتم خصمها تلقائياً عند إصدار كشف الراتب\n\n'
      + '💵 **تم الدفع خارجياً:**\n'
      + '   ← تعليم كمدفوعة نقداً/تحويل خارج النظام\n'
      + '   ← **لن تُخصم** من الراتب',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:all:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==========================================
// 💰 تسوية شاملة من الراتب
// ==========================================
settlementsHandler.callbackQuery('hr:settlements:all:type:payroll', async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية من الراتب...')

  const userId = ctx.from?.id
  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    // لا نفعل شيء! فقط نُعلم المستخدم
    // التسوية الفعلية ستتم تلقائياً عند إصدار كشف الراتب

    const keyboard = new InlineKeyboard()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تم تحديد نوع التسوية: من الراتب القادم**\n\n'
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '📌 **ملاحظة مهمة:**\n'
      + 'سيتم خصم هذه المبالغ **تلقائياً** عند إصدار كشوف الرواتب القادمة.\n\n'
      + '💡 لا حاجة لأي إجراء إضافي.',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:all:type:payroll:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// ==========================================
// 💵 تسوية شاملة - تم الدفع خارجياً
// ==========================================
settlementsHandler.callbackQuery('hr:settlements:all:type:external', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد التسوية', 'hr:settlements:all:external:confirm')
      .row()
      .text('❌ إلغاء', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '💵 **تسوية شاملة - تم الدفع خارج النظام**\n\n'
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '⚠️ **تنبيه هام:**\n'
      + '• هذه المعاملات **لن تُخصم** من الرواتب\n'
      + '• يُفترض أنها دُفعت نقداً أو بتحويل خارجي\n'
      + '• تأكد من صحة البيانات قبل التأكيد\n\n'
      + '❓ هل تريد المتابعة؟',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:all:type:external:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// تأكيد التسوية الخارجية الشاملة
settlementsHandler.callbackQuery('hr:settlements:all:external:confirm', async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية...')

  const userId = ctx.from?.id
  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma
    const now = new Date()

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const transactionIds = transactions.map(t => t.id)
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    // تحديث جميع العمليات كمُسوّاة يدوياً
    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isManuallySettled: true,
        manualSettlementType: 'EXTERNAL_PAYMENT',
        manualSettlementNote: `تسوية شاملة خارجية - ${transactions.length} عملية`,
        manuallySettledAt: now,
        manuallySettledBy: BigInt(userId),
      },
    })

    // تسجيل في Audit Log لكل عملية
    for (const transactionId of transactionIds) {
      await prisma.hR_TransactionChangeLog.create({
        data: {
          transactionId,
          changeType: 'EDIT',
          reason: 'تسوية خارجية شاملة',
          changedBy: userId,
          fieldName: 'isManuallySettled',
          oldValue: 'false',
          newValue: 'true',
          metadata: {
            settlementType: 'EXTERNAL_PAYMENT',
            bulkSettlement: true,
            totalTransactions: transactions.length,
            totalAmount,
          },
        },
      })
    }

    // إنشاء سجل تسوية
    await prisma.hR_TransactionSettlement.create({
      data: {
        transactionIds,
        settlementType: 'BULK',
        totalAmount,
        description: `تسوية شاملة خارجية - ${transactions.length} عملية`,
        settledBy: BigInt(userId),
        settledAt: now,
      },
    })

    const keyboard = new InlineKeyboard()
      .text('📊 سجل التسويات', 'hr:settlements:history')
      .row()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تمت التسوية الخارجية بنجاح**\n\n'
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`
      + `📅 ${now.toLocaleDateString('ar-EG')} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '✅ تم تعليم جميع المعاملات كـ **مدفوعة خارجياً**\n'
      + '⚠️ لن يتم خصمها من الرواتب',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:all:external:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء التسوية.')
  }
})

// ==========================================
// 👤 تسوية فردية (حسب العامل)
// ==========================================

settlementsHandler.callbackQuery('hr:settlements:individual', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma

    // جلب العاملين الذين لديهم عمليات غير مسوّاة
    const employeesWithUnsettled = await prisma.hR_Transaction.groupBy({
      by: ['employeeId'],
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
      _count: { id: true },
    })

    if (employeesWithUnsettled.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:transactions:settlements')

      await ctx.editMessageText(
        '✅ **لا توجد عمليات غير مسوّاة**',
        { reply_markup: keyboard },
      )
      return
    }

    // جلب بيانات العاملين
    const employeeIds = employeesWithUnsettled.map(e => e.employeeId)
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        nickname: true,
        fullName: true,
        position: {
          select: { titleAr: true },
        },
      },
    })

    // حساب إجمالي كل عامل
    const employeeData = await Promise.all(
      employees.map(async (emp) => {
        const transactions = await prisma.hR_Transaction.findMany({
          where: {
            employeeId: emp.id,
            isSettled: false,
            isManuallySettled: false,
            status: 'APPROVED',
          },
        })

        const total = transactions.reduce((sum, t) => {
          if (t.transactionType === 'CASH_ADVANCE') {
            return sum + Number(t.amount || 0)
          }
          const price = Number(t.unitPrice || 0)
          const qty = Number(t.quantity || 0)
          return sum + (price * qty)
        }, 0)

        return {
          id: emp.id,
          name: `${emp.nickname || emp.fullName} (${emp.position?.titleAr || 'غير محدد'})`,
          count: transactions.length,
          total,
        }
      }),
    )

    // ترتيب حسب الإجمالي
    employeeData.sort((a, b) => b.total - a.total)

    let message = '👤 **تسوية فردية - اختر العامل**\n\n'
    message += `👥 عدد العاملين: ${employeeData.length}\n\n`

    const keyboard = new InlineKeyboard()

    for (const emp of employeeData.slice(0, 20)) {
      const label = `${emp.name} - ${emp.total.toLocaleString('ar-EG')} ج.م (${emp.count})`
      keyboard.text(label, `hr:settlements:employee:${emp.id}`).row()
    }

    if (employeeData.length > 20) {
      message += `\n⚠️ يوجد ${employeeData.length - 20} عامل آخر\n`
    }

    keyboard.text('⬅️ رجوع', 'hr:transactions:settlements')

    await ctx.editMessageText(message, { reply_markup: keyboard })
  }
  catch (error) {
    console.error('Error in settlements:individual:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// تأكيد تسوية عامل محدد
settlementsHandler.callbackQuery(/^hr:settlements:employee:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1], 10)

  try {
    const prisma = Database.prisma

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        nickname: true,
        fullName: true,
        employeeCode: true,
        position: {
          select: { titleAr: true },
        },
      },
    })

    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId,
        isSettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات غير مسوّاة لهذا العامل.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('💰 تسوية من الراتب القادم', `hr:settlements:employee:type:payroll:${employeeId}`)
      .row()
      .text('💵 تم الدفع خارج النظام', `hr:settlements:employee:type:external:${employeeId}`)
      .row()
      .text('❌ إلغاء', 'hr:settlements:individual')

    const employeeName = `${employee.nickname || employee.fullName} (${employee.position?.titleAr || 'غير محدد'})`

    await ctx.editMessageText(
      '🔍 **اختيار نوع التسوية الفردية**\n\n'
      + `👤 العامل: ${employeeName}\n`
      + `🔢 الكود: ${employee.employeeCode}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '❓ **كيف سيتم التسوية؟**',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:employee:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==========================================
// 💰 تسوية فردية - من الراتب
// ==========================================
settlementsHandler.callbackQuery(/^hr:settlements:employee:type:payroll:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية من الراتب...')

  const employeeId = Number.parseInt(ctx.match[1], 10)
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        nickname: true,
        fullName: true,
        position: { select: { titleAr: true } },
      },
    })

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId,
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    const employeeName = `${employee?.nickname || employee?.fullName || 'غير معروف'}`

    await ctx.editMessageText(
      '✅ **تم تحديد نوع التسوية: من الراتب القادم**\n\n'
      + `👤 العامل: ${employeeName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '📌 **ملاحظة مهمة:**\n'
      + 'سيتم خصم هذه المبالغ **تلقائياً** عند إصدار كشف راتب العامل.\n\n'
      + '💡 لا حاجة لأي إجراء إضافي.',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:employee:type:payroll:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// ==========================================
// 💵 تسوية فردية - دفع خارجي
// ==========================================
settlementsHandler.callbackQuery(/^hr:settlements:employee:type:external:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1], 10)

  try {
    const prisma = Database.prisma

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        nickname: true,
        fullName: true,
        employeeCode: true,
        position: { select: { titleAr: true } },
      },
    })

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId,
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد التسوية', `hr:settlements:employee:external:confirm:${employeeId}`)
      .row()
      .text('❌ إلغاء', 'hr:settlements:individual')

    const employeeName = `${employee?.nickname || employee?.fullName}`

    await ctx.editMessageText(
      '💵 **تسوية فردية - تم الدفع خارج النظام**\n\n'
      + `👤 العامل: ${employeeName}\n`
      + `🔢 الكود: ${employee?.employeeCode}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '⚠️ **تنبيه هام:**\n'
      + '• هذه المعاملات **لن تُخصم** من الراتب\n'
      + '• يُفترض أنها دُفعت نقداً أو بتحويل خارجي\n'
      + '• تأكد من صحة البيانات قبل التأكيد\n\n'
      + '❓ هل تريد المتابعة؟',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:employee:type:external:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// تأكيد التسوية الفردية الخارجية
settlementsHandler.callbackQuery(/^hr:settlements:employee:external:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية...')

  const employeeId = Number.parseInt(ctx.match[1], 10)
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma
    const now = new Date()

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        nickname: true,
        fullName: true,
        position: { select: { titleAr: true } },
      },
    })

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId,
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const transactionIds = transactions.map(t => t.id)
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    // تحديث جميع العمليات كمُسوّاة يدوياً
    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isManuallySettled: true,
        manualSettlementType: 'EXTERNAL_PAYMENT',
        manualSettlementNote: `تسوية فردية خارجية - ${employee?.nickname || employee?.fullName}`,
        manuallySettledAt: now,
        manuallySettledBy: BigInt(userId),
      },
    })

    // تسجيل في Audit Log لكل عملية
    for (const transactionId of transactionIds) {
      await prisma.hR_TransactionChangeLog.create({
        data: {
          transactionId,
          changeType: 'EDIT',
          reason: `تسوية خارجية فردية - ${employee?.nickname || employee?.fullName}`,
          changedBy: userId,
          fieldName: 'isManuallySettled',
          oldValue: 'false',
          newValue: 'true',
          metadata: {
            settlementType: 'EXTERNAL_PAYMENT',
            individualSettlement: true,
            employeeId,
            employeeName: employee?.nickname || employee?.fullName,
            totalTransactions: transactions.length,
            totalAmount,
          },
        },
      })
    }

    // إنشاء سجل تسوية
    await prisma.hR_TransactionSettlement.create({
      data: {
        transactionIds,
        settlementType: 'INDIVIDUAL',
        totalAmount,
        description: `تسوية فردية - ${employee?.nickname || employee?.fullName}`,
        settledBy: BigInt(userId),
        settledAt: now,
      },
    })

    const keyboard = new InlineKeyboard()
      .text('👤 تسوية عامل آخر', 'hr:settlements:individual')
      .row()
      .text('📊 سجل التسويات', 'hr:settlements:history')
      .row()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    const employeeName = `${employee?.nickname || employee?.fullName} (${employee?.position?.titleAr || 'غير محدد'})`

    await ctx.editMessageText(
      '✅ **تمت التسوية الخارجية بنجاح**\n\n'
      + `👤 العامل: ${employeeName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`
      + `📅 ${now.toLocaleDateString('ar-EG')} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '✅ تم تعليم جميع المعاملات كـ **مدفوعة خارجياً**\n'
      + '⚠️ لن يتم خصمها من الراتب',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:employee:external:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء التسوية.')
  }
})

// ==========================================
// 💼 تسوية حسب الوظيفة
// ==========================================

settlementsHandler.callbackQuery('hr:settlements:by-position', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma

    // جلب الوظائف التي لديها عمليات غير مسوّاة
    const unsettledTransactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
      select: {
        employee: {
          select: {
            positionId: true,
          },
        },
      },
    })

    const positionIds = [...new Set(unsettledTransactions.map(t => t.employee.positionId))]

    const positions = await prisma.position.findMany({
      where: { id: { in: positionIds } },
      select: {
        id: true,
        titleAr: true,
      },
      orderBy: { titleAr: 'asc' },
    })

    if (positions.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:transactions:settlements')

      await ctx.editMessageText(
        '✅ **لا توجد عمليات غير مسوّاة**',
        { reply_markup: keyboard },
      )
      return
    }

    let message = '💼 **تسوية حسب الوظيفة**\n\n'
    message += '📋 اختر الوظيفة:\n\n'

    const keyboard = new InlineKeyboard()

    for (const position of positions) {
      keyboard.text(position.titleAr, `hr:settlements:position:${position.id}`).row()
    }

    keyboard.text('⬅️ رجوع', 'hr:transactions:settlements')

    await ctx.editMessageText(message, { reply_markup: keyboard })
  }
  catch (error) {
    console.error('Error in settlements:by-position:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// تأكيد تسوية حسب الوظيفة
settlementsHandler.callbackQuery(/^hr:settlements:position:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match[1], 10)

  try {
    const prisma = Database.prisma

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { titleAr: true },
    })

    if (!position) {
      await ctx.editMessageText('❌ الوظيفة غير موجودة.')
      return
    }

    // جلب جميع العاملين في هذه الوظيفة
    const employees = await prisma.employee.findMany({
      where: { positionId },
      select: { id: true },
    })

    const employeeIds = employees.map(e => e.id)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId: { in: employeeIds },
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:settlements:by-position')

      await ctx.editMessageText(
        '✅ **لا توجد عمليات غير مسوّاة لهذه الوظيفة**',
        { reply_markup: keyboard },
      )
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('💰 تسوية من الراتب القادم', `hr:settlements:position:type:payroll:${positionId}`)
      .row()
      .text('💵 تم الدفع خارج النظام', `hr:settlements:position:type:external:${positionId}`)
      .row()
      .text('❌ إلغاء', 'hr:settlements:by-position')

    await ctx.editMessageText(
      '🔍 **اختيار نوع التسوية حسب الوظيفة**\n\n'
      + `💼 الوظيفة: ${position.titleAr}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '❓ **كيف سيتم التسوية؟**',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:position:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==========================================
// 💰 تسوية حسب الوظيفة - من الراتب
// ==========================================
settlementsHandler.callbackQuery(/^hr:settlements:position:type:payroll:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية من الراتب...')

  const positionId = Number.parseInt(ctx.match[1], 10)

  try {
    const prisma = Database.prisma

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { titleAr: true },
    })

    const employees = await prisma.employee.findMany({
      where: { positionId },
      select: { id: true },
    })

    const employeeIds = employees.map(e => e.id)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId: { in: employeeIds },
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تم تحديد نوع التسوية: من الراتب القادم**\n\n'
      + `💼 الوظيفة: ${position?.titleAr}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '📌 **ملاحظة مهمة:**\n'
      + 'سيتم خصم هذه المبالغ **تلقائياً** عند إصدار كشوف الرواتب.\n\n'
      + '💡 لا حاجة لأي إجراء إضافي.',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:position:type:payroll:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// ==========================================
// 💵 تسوية حسب الوظيفة - دفع خارجي
// ==========================================
settlementsHandler.callbackQuery(/^hr:settlements:position:type:external:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const positionId = Number.parseInt(ctx.match[1], 10)

  try {
    const prisma = Database.prisma

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { titleAr: true },
    })

    const employees = await prisma.employee.findMany({
      where: { positionId },
      select: { id: true },
    })

    const employeeIds = employees.map(e => e.id)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId: { in: employeeIds },
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد التسوية', `hr:settlements:position:external:confirm:${positionId}`)
      .row()
      .text('❌ إلغاء', 'hr:settlements:by-position')

    await ctx.editMessageText(
      '💵 **تسوية حسب الوظيفة - تم الدفع خارج النظام**\n\n'
      + `💼 الوظيفة: ${position?.titleAr}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '⚠️ **تنبيه هام:**\n'
      + '• هذه المعاملات **لن تُخصم** من الرواتب\n'
      + '• يُفترض أنها دُفعت نقداً أو بتحويل خارجي\n'
      + '• تأكد من صحة البيانات قبل التأكيد\n\n'
      + '❓ هل تريد المتابعة؟',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:position:type:external:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// تأكيد تسوية الوظيفة الخارجية
settlementsHandler.callbackQuery(/^hr:settlements:position:external:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية...')

  const positionId = Number.parseInt(ctx.match[1], 10)
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma
    const now = new Date()

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: { titleAr: true },
    })

    const employees = await prisma.employee.findMany({
      where: { positionId },
      select: { id: true },
    })

    const employeeIds = employees.map(e => e.id)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        employeeId: { in: employeeIds },
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const transactionIds = transactions.map(t => t.id)
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    // تحديث جميع العمليات كمُسوّاة يدوياً
    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isManuallySettled: true,
        manualSettlementType: 'EXTERNAL_PAYMENT',
        manualSettlementNote: `تسوية حسب الوظيفة - ${position?.titleAr}`,
        manuallySettledAt: now,
        manuallySettledBy: BigInt(userId),
      },
    })

    // تسجيل في Audit Log لكل عملية
    for (const transactionId of transactionIds) {
      await prisma.hR_TransactionChangeLog.create({
        data: {
          transactionId,
          changeType: 'EDIT',
          reason: `تسوية خارجية حسب الوظيفة - ${position?.titleAr}`,
          changedBy: userId,
          fieldName: 'isManuallySettled',
          oldValue: 'false',
          newValue: 'true',
          metadata: {
            settlementType: 'EXTERNAL_PAYMENT',
            positionSettlement: true,
            positionId,
            positionTitle: position?.titleAr,
            totalTransactions: transactions.length,
            totalAmount,
          },
        },
      })
    }

    await prisma.hR_TransactionSettlement.create({
      data: {
        transactionIds,
        settlementType: 'BULK',
        totalAmount,
        description: `تسوية خارجية - ${position?.titleAr}`,
        settledBy: BigInt(userId),
        settledAt: now,
      },
    })

    const keyboard = new InlineKeyboard()
      .text('💼 تسوية وظيفة أخرى', 'hr:settlements:by-position')
      .row()
      .text('📊 سجل التسويات', 'hr:settlements:history')
      .row()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تمت التسوية الخارجية بنجاح**\n\n'
      + `💼 الوظيفة: ${position?.titleAr}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`
      + `📅 ${now.toLocaleDateString('ar-EG')} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '✅ تم تعليم جميع المعاملات كـ **مدفوعة خارجياً**\n'
      + '⚠️ لن يتم خصمها من الرواتب',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:position:external:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء التسوية.')
  }
})

// ==========================================
// 📅 تسوية حسب الفترة
// ==========================================

settlementsHandler.callbackQuery('hr:settlements:by-period', async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()
    .text('📅 الشهر الحالي', 'hr:settlements:period:current-month')
    .row()
    .text('📅 فترة مخصصة', 'hr:settlements:period:custom')
    .row()
    .text('⬅️ رجوع', 'hr:transactions:settlements')

  await ctx.editMessageText(
    '📅 **تسوية حسب الفترة**\n\n'
    + 'اختر نوع الفترة:',
    { reply_markup: keyboard },
  )
})

// تسوية الشهر الحالي
settlementsHandler.callbackQuery('hr:settlements:period:current-month', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    if (transactions.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:settlements:by-period')

      await ctx.editMessageText(
        '✅ **لا توجد عمليات غير مسوّاة في الشهر الحالي**',
        { reply_markup: keyboard },
      )
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('💰 تسوية من الراتب القادم', 'hr:settlements:period:current-month:type:payroll')
      .row()
      .text('💵 تم الدفع خارج النظام', 'hr:settlements:period:current-month:type:external')
      .row()
      .text('❌ إلغاء', 'hr:settlements:by-period')

    const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

    await ctx.editMessageText(
      '🔍 **اختيار نوع التسوية - الشهر الحالي**\n\n'
      + `📅 الفترة: ${monthName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '❓ **كيف سيتم التسوية؟**',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:period:current-month:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب البيانات.')
  }
})

// ==========================================
// 💰 تسوية الشهر الحالي - من الراتب
// ==========================================
settlementsHandler.callbackQuery('hr:settlements:period:current-month:type:payroll', async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية من الراتب...')

  try {
    const prisma = Database.prisma
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

    await ctx.editMessageText(
      '✅ **تم تحديد نوع التسوية: من الراتب القادم**\n\n'
      + `📅 الفترة: ${monthName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '📌 **ملاحظة مهمة:**\n'
      + 'سيتم خصم هذه المبالغ **تلقائياً** عند إصدار كشوف الرواتب.\n\n'
      + '💡 لا حاجة لأي إجراء إضافي.',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:period:current-month:type:payroll:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// ==========================================
// 💵 تسوية الشهر الحالي - دفع خارجي
// ==========================================
settlementsHandler.callbackQuery('hr:settlements:period:current-month:type:external', async (ctx) => {
  await ctx.answerCallbackQuery()

  try {
    const prisma = Database.prisma
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const keyboard = new InlineKeyboard()
      .text('✅ تأكيد التسوية', 'hr:settlements:period:current-month:external:confirm')
      .row()
      .text('❌ إلغاء', 'hr:settlements:by-period')

    const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

    await ctx.editMessageText(
      '💵 **تسوية الشهر الحالي - تم الدفع خارج النظام**\n\n'
      + `📅 الفترة: ${monthName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '⚠️ **تنبيه هام:**\n'
      + '• هذه المعاملات **لن تُخصم** من الرواتب\n'
      + '• يُفترض أنها دُفعت نقداً أو بتحويل خارجي\n'
      + '• تأكد من صحة البيانات قبل التأكيد\n\n'
      + '❓ هل تريد المتابعة؟',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:period:current-month:type:external:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء المعالجة.')
  }
})

// تأكيد تسوية الشهر الحالي الخارجية
settlementsHandler.callbackQuery('hr:settlements:period:current-month:external:confirm', async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية...')

  const userId = ctx.from?.id
  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  try {
    const prisma = Database.prisma
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        isManuallySettled: false,
        status: 'APPROVED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      return
    }

    const transactionIds = transactions.map(t => t.id)
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    const monthName = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

    // تحديث جميع العمليات كمُسوّاة يدوياً
    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isManuallySettled: true,
        manualSettlementType: 'EXTERNAL_PAYMENT',
        manualSettlementNote: `تسوية خارجية - شهر ${monthName}`,
        manuallySettledAt: now,
        manuallySettledBy: BigInt(userId),
      },
    })

    // تسجيل في Audit Log لكل عملية
    for (const transactionId of transactionIds) {
      await prisma.hR_TransactionChangeLog.create({
        data: {
          transactionId,
          changeType: 'EDIT',
          reason: `تسوية خارجية - شهر ${monthName}`,
          changedBy: userId,
          fieldName: 'isManuallySettled',
          oldValue: 'false',
          newValue: 'true',
          metadata: {
            settlementType: 'EXTERNAL_PAYMENT',
            periodSettlement: true,
            period: monthName,
            totalTransactions: transactions.length,
            totalAmount,
          },
        },
      })
    }

    await prisma.hR_TransactionSettlement.create({
      data: {
        transactionIds,
        settlementType: 'BULK',
        totalAmount,
        description: `تسوية خارجية - شهر ${monthName}`,
        settledBy: BigInt(userId),
        settledAt: now,
      },
    })

    const keyboard = new InlineKeyboard()
      .text('📅 تسوية فترة أخرى', 'hr:settlements:by-period')
      .row()
      .text('📊 سجل التسويات', 'hr:settlements:history')
      .row()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تمت التسوية الخارجية بنجاح**\n\n'
      + `📅 الفترة: ${monthName}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`
      + `📅 ${now.toLocaleDateString('ar-EG')} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n`
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '✅ تم تعليم جميع المعاملات كـ **مدفوعة خارجياً**\n'
      + '⚠️ لن يتم خصمها من الرواتب',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error in settlements:period:current-month:external:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء التسوية.')
  }
})

// فترة مخصصة
settlementsHandler.callbackQuery('hr:settlements:period:custom', async (ctx) => {
  await ctx.answerCallbackQuery()

  ctx.session.settlementState = {
    mode: 'custom-period',
    step: 'start-date',
  }

  const keyboard = new InlineKeyboard()
    .text('❌ إلغاء', 'hr:settlements:by-period')

  await ctx.editMessageText(
    '📅 **فترة مخصصة**\n\n'
    + '📝 أرسل تاريخ البداية بالصيغة:\n'
    + 'مثال: 2025-01-01',
    { reply_markup: keyboard },
  )
})

// معالج إدخال التواريخ
settlementsHandler.on('message:text', async (ctx) => {
  if (!ctx.session.settlementState || ctx.session.settlementState.mode !== 'custom-period') {
    return
  }

  const text = ctx.message.text.trim()

  if (ctx.session.settlementState.step === 'start-date') {
    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(text)) {
      await ctx.reply('❌ صيغة التاريخ غير صحيحة. الرجاء الإدخال بالصيغة: 2025-01-01')
      return
    }

    const startDate = new Date(text)
    if (Number.isNaN(startDate.getTime())) {
      await ctx.reply('❌ تاريخ غير صحيح.')
      return
    }

    ctx.session.settlementState.startDate = text
    ctx.session.settlementState.step = 'end-date'

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'hr:settlements:by-period')

    await ctx.reply(
      '📅 **فترة مخصصة**\n\n'
      + `✅ تاريخ البداية: ${text}\n\n`
      + '📝 أرسل تاريخ النهاية بالصيغة:\n'
      + 'مثال: 2025-01-31',
      { reply_markup: keyboard },
    )
  }
  else if (ctx.session.settlementState.step === 'end-date') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(text)) {
      await ctx.reply('❌ صيغة التاريخ غير صحيحة. الرجاء الإدخال بالصيغة: 2025-01-31')
      return
    }

    const endDate = new Date(text)
    if (Number.isNaN(endDate.getTime())) {
      await ctx.reply('❌ تاريخ غير صحيح.')
      return
    }

    const startDate = new Date(ctx.session.settlementState.startDate!)
    if (endDate < startDate) {
      await ctx.reply('❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية.')
      return
    }

    try {
      const prisma = Database.prisma

      const transactions = await prisma.hR_Transaction.findMany({
        where: {
          isSettled: false,
          status: 'APPROVED',
          createdAt: {
            gte: startDate,
            lte: new Date(`${text}T23:59:59`),
          },
        },
      })

      if (transactions.length === 0) {
        const keyboard = new InlineKeyboard()
          .text('⬅️ رجوع', 'hr:settlements:by-period')

        await ctx.reply(
          '✅ **لا توجد عمليات غير مسوّاة في هذه الفترة**',
          { reply_markup: keyboard },
        )

        delete ctx.session.settlementState
        return
      }

      const totalAmount = transactions.reduce((sum, t) => {
        if (t.transactionType === 'CASH_ADVANCE') {
          return sum + Number(t.amount || 0)
        }
        const price = Number(t.unitPrice || 0)
        const qty = Number(t.quantity || 0)
        return sum + (price * qty)
      }, 0)

      ctx.session.settlementState.endDate = text

      const keyboard = new InlineKeyboard()
        .text('✅ تأكيد التسوية', 'hr:settlements:period:custom:confirm')
        .row()
        .text('❌ إلغاء', 'hr:settlements:by-period')

      await ctx.reply(
        '✅ **تأكيد التسوية - فترة مخصصة**\n\n'
        + `📅 من: ${ctx.session.settlementState.startDate}\n`
        + `📅 إلى: ${text}\n`
        + `📋 عدد العمليات: ${transactions.length}\n`
        + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n\n`
        + '❓ هل تريد تسوية جميع عمليات هذه الفترة؟',
        { reply_markup: keyboard },
      )
    }
    catch (error) {
      console.error('Error in custom period:', error)
      await ctx.reply('❌ حدث خطأ أثناء جلب البيانات.')
    }
  }
})

// تأكيد التسوية للفترة المخصصة
settlementsHandler.callbackQuery('hr:settlements:period:custom:confirm', async (ctx) => {
  await ctx.answerCallbackQuery('جاري التسوية...')

  const userId = ctx.from?.id
  if (!userId) {
    await ctx.editMessageText('❌ خطأ: لا يمكن تحديد المستخدم.')
    return
  }

  if (!ctx.session.settlementState?.startDate || !ctx.session.settlementState?.endDate) {
    await ctx.editMessageText('❌ خطأ: بيانات الفترة غير موجودة.')
    return
  }

  try {
    const prisma = Database.prisma
    const now = new Date()
    const startDate = new Date(ctx.session.settlementState.startDate)
    const endDate = new Date(`${ctx.session.settlementState.endDate}T23:59:59`)

    const transactions = await prisma.hR_Transaction.findMany({
      where: {
        isSettled: false,
        status: 'APPROVED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    if (transactions.length === 0) {
      await ctx.editMessageText('✅ لا توجد عمليات للتسوية.')
      delete ctx.session.settlementState
      return
    }

    const transactionIds = transactions.map(t => t.id)
    const totalAmount = transactions.reduce((sum, t) => {
      if (t.transactionType === 'CASH_ADVANCE') {
        return sum + Number(t.amount || 0)
      }
      const price = Number(t.unitPrice || 0)
      const qty = Number(t.quantity || 0)
      return sum + (price * qty)
    }, 0)

    await prisma.hR_Transaction.updateMany({
      where: { id: { in: transactionIds } },
      data: {
        isSettled: true,
        settledAt: now,
        settledBy: BigInt(userId),
      },
    })

    // تسجيل في Audit Log لكل عملية
    for (const transactionId of transactionIds) {
      await prisma.hR_TransactionChangeLog.create({
        data: {
          transactionId,
          changeType: 'EDIT',
          reason: `تسوية من الراتب - فترة مخصصة (${ctx.session.settlementState.startDate} إلى ${ctx.session.settlementState.endDate})`,
          changedBy: userId,
          fieldName: 'isSettled',
          oldValue: 'false',
          newValue: 'true',
          metadata: {
            settlementType: 'PAYROLL',
            customPeriod: true,
            startDate: ctx.session.settlementState.startDate,
            endDate: ctx.session.settlementState.endDate,
            totalTransactions: transactions.length,
            totalAmount,
          },
        },
      })
    }

    await prisma.hR_TransactionSettlement.create({
      data: {
        transactionIds,
        settlementType: 'CUSTOM',
        totalAmount,
        description: `تسوية فترة من ${ctx.session.settlementState.startDate} إلى ${ctx.session.settlementState.endDate}`,
        settledBy: BigInt(userId),
        settledAt: now,
      },
    })

    const keyboard = new InlineKeyboard()
      .text('📅 تسوية فترة أخرى', 'hr:settlements:by-period')
      .row()
      .text('📊 سجل التسويات', 'hr:settlements:history')
      .row()
      .text('⬅️ القائمة الرئيسية', 'hr:transactions:settlements')

    await ctx.editMessageText(
      '✅ **تمت التسوية بنجاح**\n\n'
      + `📅 من: ${ctx.session.settlementState.startDate}\n`
      + `📅 إلى: ${ctx.session.settlementState.endDate}\n`
      + `📋 عدد العمليات: ${transactions.length}\n`
      + `💰 الإجمالي: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`
      + `📅 ${now.toLocaleDateString('ar-EG')} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
      { reply_markup: keyboard },
    )

    delete ctx.session.settlementState
  }
  catch (error) {
    console.error('Error in settlements:period:custom:confirm:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء التسوية.')
  }
})

// ==========================================
// 📊 سجل التسويات
// ==========================================

settlementsHandler.callbackQuery(/^hr:settlements:history(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const page = Number.parseInt(ctx.match[1] || '0', 10)
  const pageSize = 10

  try {
    const prisma = Database.prisma

    const total = await prisma.hR_TransactionSettlement.count()
    const totalPages = Math.ceil(total / pageSize)

    const settlements = await prisma.hR_TransactionSettlement.findMany({
      orderBy: { settledAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    })

    if (settlements.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', 'hr:transactions:settlements')

      await ctx.editMessageText(
        '📊 **سجل التسويات**\n\n'
        + '✅ لا توجد تسويات مسجلة بعد.',
        { reply_markup: keyboard },
      )
      return
    }

    let message = '📊 **سجل التسويات**\n\n'
    message += `📈 إجمالي التسويات: ${total}\n`
    message += `📄 الصفحة: ${page + 1} / ${totalPages}\n\n`

    for (const settlement of settlements) {
      const typeLabels = {
        INDIVIDUAL: '👤 فردية',
        BULK: '🌍 جماعية',
        CUSTOM: '📅 مخصصة',
      }

      const typeLabel = typeLabels[settlement.settlementType] || settlement.settlementType
      const transactionCount = Array.isArray(settlement.transactionIds)
        ? settlement.transactionIds.length
        : 0

      message += `${typeLabel}\n`
      message += `💰 ${Number(settlement.totalAmount).toLocaleString('ar-EG')} ج.م\n`
      message += `📋 ${transactionCount} عملية\n`
      message += `📅 ${settlement.settledAt.toLocaleDateString('ar-EG')} ${settlement.settledAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`

      if (settlement.description) {
        message += `📝 ${settlement.description}\n`
      }

      message += '\n'
    }

    const keyboard = new InlineKeyboard()

    if (page > 0) {
      keyboard.text('⬅️ السابق', `hr:settlements:history:${page - 1}`)
    }
    if (page < totalPages - 1) {
      keyboard.text('➡️ التالي', `hr:settlements:history:${page + 1}`)
    }

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'hr:transactions:settlements')

    await ctx.editMessageText(message, { reply_markup: keyboard })
  }
  catch (error) {
    console.error('Error in settlements:history:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء جلب سجل التسويات.')
  }
})
