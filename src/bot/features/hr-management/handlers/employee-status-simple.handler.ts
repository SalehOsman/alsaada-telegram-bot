import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { EmploymentStatus } from '../../../../../generated/prisma/index.js'
import { Calendar } from '../../../../modules/ui/calendar.js'

export const employeeStatusSimpleHandler = new Composer<Context>()

// دالة إنشاء تقويم مبسط
function createSimpleCalendar(employeeId: number): InlineKeyboard {
  return Calendar.create({
    callbackPrefix: `hr:employee:status:simple:date:${employeeId}`
  })
}

// معالج تغيير حالة العامل المبسط
employeeStatusSimpleHandler.callbackQuery(/^hr:employee:status:simple:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = parseInt(ctx.match[1])
  
  try {
    const prisma = Database.prisma
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true, department: true }
    })
    
    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    // تحديد نوع العامل
    const isCurrentEmployee = employee.isActive && 
                             employee.employmentStatus === EmploymentStatus.ACTIVE && 
                             !employee.resignationDate && 
                             !employee.terminationDate

    let message = `📊 تغيير حالة العامل\n\n`
    message += `👤 العامل: ${employee.fullName}\n`
    message += `🆔 الكود: ${employee.employeeCode}\n`
    message += `📋 الوظيفة: ${employee.position?.titleAr || 'غير محدد'}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    if (isCurrentEmployee) {
      message += `👷 العامل حالياً: عامل حالى\n\n`
      message += `اختر الحالة الجديدة:`
      
      const keyboard = new InlineKeyboard()
        .text('🏢 في العمل', `hr:employee:status:change:${employeeId}:WORKING`)
        .text('🏖️ في إجازة', `hr:employee:status:change:${employeeId}:ON_LEAVE`).row()
        .text('✈️ في مأمورية', `hr:employee:status:change:${employeeId}:ON_MISSION`).row()
        .text('📂 تحويل لعامل سابق', `hr:employee:status:change:${employeeId}:FORMER`).row()
        .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)
      
      await ctx.editMessageText(message, { reply_markup: keyboard })
    } else {
      message += `📂 العامل حالياً: عامل سابق\n\n`
      message += `اختر الحالة الجديدة:`
      
      const keyboard = new InlineKeyboard()
        .text('👷 إعادة تفعيل', `hr:employee:status:change:${employeeId}:REACTIVATE`)
        .text('📋 تصفية الحساب', `hr:employee:status:change:${employeeId}:SETTLED`).row()
        .text('⏸️ تعليق الحساب', `hr:employee:status:change:${employeeId}:SUSPENDED`).row()
        .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)
      
      await ctx.editMessageText(message, { reply_markup: keyboard })
    }

  } catch (error) {
    console.error('Error loading employee status:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل بيانات العامل.')
  }
})

// معالج تغيير الحالة الفعلي
employeeStatusSimpleHandler.callbackQuery(/^hr:employee:status:change:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = parseInt(ctx.match[1])
  const newStatus = ctx.match[2]
  
  try {
    const prisma = Database.prisma
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })
    
    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    // تحديد الحالة الحالية
    const currentStatus = employee.isActive && 
                        employee.employmentStatus === EmploymentStatus.ACTIVE && 
                        !employee.resignationDate && 
                        !employee.terminationDate ? 'CURRENT' : 'FORMER'

    // تحديد الحالة الجديدة والبيانات المطلوبة
    let updateData: any = {}
    let statusLabel = ''
    let requiresDate = false
    let dateField = ''

    switch (newStatus) {
      case 'WORKING':
        updateData = {
          isActive: true,
          employmentStatus: EmploymentStatus.ACTIVE,
          resignationDate: null,
          terminationDate: null
        }
        statusLabel = 'في العمل'
        break
        
      case 'ON_LEAVE':
        updateData = {
          isActive: true,
          employmentStatus: EmploymentStatus.ON_LEAVE
        }
        statusLabel = 'في إجازة'
        break
        
      case 'ON_MISSION':
        updateData = {
          isActive: true,
          employmentStatus: EmploymentStatus.ON_MISSION
        }
        statusLabel = 'في مأمورية'
        break
        
      case 'FORMER':
        // سيطلب التاريخ والحالة النهائية
        const keyboard = new InlineKeyboard()
          .text('📝 استقال', `hr:employee:status:former:${employeeId}:RESIGNED`)
          .text('🚫 فصل', `hr:employee:status:former:${employeeId}:TERMINATED`).row()
          .text('👴 تقاعد', `hr:employee:status:former:${employeeId}:RETIRED`).row()
          .text('⬅️ رجوع', `hr:employee:status:simple:${employeeId}`)
        
        await ctx.editMessageText(
          `📂 تحويل العامل إلى عامل سابق\n\n` +
          `👤 العامل: ${employee.fullName}\n\n` +
          `اختر سبب إنهاء العمل:`,
          { reply_markup: keyboard }
        )
        return
        
      case 'REACTIVATE':
        updateData = {
          isActive: true,
          employmentStatus: EmploymentStatus.ACTIVE,
          resignationDate: null,
          terminationDate: null
        }
        statusLabel = 'إعادة تفعيل'
        break
        
      case 'SETTLED':
        updateData = {
          employmentStatus: EmploymentStatus.SETTLED
        }
        statusLabel = 'تم تصفية الحساب'
        break
        
      case 'SUSPENDED':
        updateData = {
          employmentStatus: EmploymentStatus.SUSPENDED
        }
        statusLabel = 'حساب معلق'
        break
    }

    // تحديث قاعدة البيانات
    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData
    })

    // البحث عن المستخدم الذي قام بالتغيير
    const adminUser = ctx.from ? await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } }) : null

    // حفظ في السجل
    await prisma.auditLog.create({
      data: {
        model: 'Employee',
        recordId: employeeId.toString(),
        action: 'UPDATE',
        category: 'HR',
        fieldName: 'employmentStatus',
        oldValue: currentStatus,
        newValue: statusLabel,
        changedByUserId: adminUser?.id,
        description: `تغيير الحالة إلى: ${statusLabel}`,
        metadata: {
          statusDate: new Date()
        }
      }
    })

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.editMessageText(
      `✅ تم تغيير الحالة بنجاح!\n\n` +
      `📊 الحالة الجديدة: ${statusLabel}\n` +
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      { reply_markup: keyboard }
    )

  } catch (error) {
    console.error('Error updating employee status:', error)
    await ctx.editMessageText('❌ حدث خطأ أثناء تحديث الحالة.')
  }
})

// معالج اختيار سبب إنهاء العمل للعامل السابق
employeeStatusSimpleHandler.callbackQuery(/^hr:employee:status:former:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = parseInt(ctx.match[1])
  const terminationType = ctx.match[2] as EmploymentStatus
  
  const statusLabels: { [key in EmploymentStatus]?: string } = {
    [EmploymentStatus.RESIGNED]: 'استقال',
    [EmploymentStatus.TERMINATED]: 'فصل',
    [EmploymentStatus.RETIRED]: 'تقاعد'
  }
  
  const dateFields: { [key in EmploymentStatus]?: string } = {
    [EmploymentStatus.RESIGNED]: 'resignationDate',
    [EmploymentStatus.TERMINATED]: 'terminationDate',
    [EmploymentStatus.RETIRED]: 'terminationDate' // استخدام terminationDate للتقاعد أيضاً
  }

  // حفظ نوع الإنهاء في الجلسة
  ctx.session = ctx.session || {}
  ctx.session.statusChangeEdit = {
    employeeId,
    newStatus: terminationType,
    step: 'awaiting_date_selection',
    dateField: dateFields[terminationType] as any,
    dateType: 'custom'
  }

  const keyboard = new InlineKeyboard()
    .text('📅 اليوم', `hr:employee:status:simple:date:${employeeId}:today`)
    .text('📆 تاريخ آخر', `hr:employee:status:simple:date:${employeeId}:custom`).row()
    .text('⬅️ رجوع', `hr:employee:status:simple:${employeeId}`)

  await ctx.editMessageText(
    `📅 تحديد تاريخ ${statusLabels[terminationType]}\n\n` +
    `اختر التاريخ:`,
    { reply_markup: keyboard }
  )
})

// معالج اختيار التاريخ
employeeStatusSimpleHandler.callbackQuery(/^hr:employee:status:simple:date:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  
  const employeeId = parseInt(ctx.match[1])
  const dateType = ctx.match[2]
  
  if (!ctx.session?.statusChangeEdit) {
    await ctx.editMessageText(
      '❌ انتهت صلاحية العملية.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:status:simple:${employeeId}`) }
    )
    return
  }

  const { newStatus, dateField } = ctx.session.statusChangeEdit

  try {
    let selectedDate: Date | null = null
    
    if (dateType === 'today') {
      selectedDate = new Date()
    } else if (dateType === 'custom') {
      // تعيين الخطوة لانتظار إدخال التاريخ
      ctx.session.statusChangeEdit.step = 'awaiting_date_input'
      
      const statusLabels: { [key: string]: string } = {
        'RESIGNED': 'استقال',
        'TERMINATED': 'فصل',
        'RETIRED': 'تقاعد'
      }
      
      // عرض رسالة لإدخال التاريخ يدوياً أو اختياره من التقويم
      await ctx.editMessageText(
        `📅 أدخل تاريخ ${statusLabels[newStatus]}\n\n` +
        `💡 يمكنك:\n` +
        `• إدخال التاريخ يدوياً بصيغة DD/MM/YYYY (مثال: 15/12/2024)\n` +
        `• أو اختيار من التقويم أدناه:`,
        { reply_markup: createSimpleCalendar(employeeId) }
      )
      return
    } else {
      // تاريخ من التقويم الجديد
      selectedDate = Calendar.parseDate(dateType)
      
      if (!selectedDate) {
        throw new Error('تاريخ غير صحيح')
      }
    }

    const prisma = Database.prisma
    const adminUser = ctx.from ? await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } }) : null
    
    // تحديث الحالة والتاريخ
    const updateData: any = {
      isActive: false,
      employmentStatus: newStatus,
      [dateField]: selectedDate
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData
    })

    // حفظ في السجل
    await prisma.auditLog.create({
      data: {
        model: 'Employee',
        recordId: employeeId.toString(),
        action: 'UPDATE',
        category: 'HR',
        fieldName: 'employmentStatus',
        oldValue: 'CURRENT',
        newValue: newStatus,
        changedByUserId: adminUser?.id,
        description: `إنهاء العمل: ${newStatus}`,
        metadata: {
          statusDate: selectedDate
        }
      }
    })

    // مسح حالة التعديل
    delete ctx.session.statusChangeEdit

    const statusLabels: { [key: string]: string } = {
      'RESIGNED': 'استقال',
      'TERMINATED': 'فصل',
      'RETIRED': 'تقاعد'
    }

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.editMessageText(
      `✅ تم تغيير الحالة بنجاح!\n\n` +
      `📊 الحالة الجديدة: ${statusLabels[newStatus]}\n` +
      `📅 التاريخ: ${selectedDate.toLocaleDateString('ar-EG')}`,
      { reply_markup: keyboard }
    )

  } catch (error) {
    console.error('Error updating employee status:', error)
    
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', `hr:employee:status:simple:${employeeId}`)
    
    await ctx.editMessageText(
      '❌ حدث خطأ أثناء تحديث الحالة.\n\n' +
      `تفاصيل الخطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
      { reply_markup: keyboard }
    )
    
    // عدم مسح الحالة للسماح بإعادة المحاولة
  }
})

// معالج استقبال النصوص لإدخال التاريخ المخصص
employeeStatusSimpleHandler.on('message:text', async (ctx) => {
  // التحقق من وجود حالة تعديل حالة نشطة تنتظر إدخال التاريخ
  if (!ctx.session?.statusChangeEdit || ctx.session.statusChangeEdit.step !== 'awaiting_date_input') {
    return // تجاهل الرسالة إذا لم يكن هناك حالة انتظار إدخال تاريخ
  }

  const { employeeId, newStatus, dateField } = ctx.session.statusChangeEdit
  const dateText = ctx.message.text.trim()

  try {
    // تحليل التاريخ من الصيغ المختلفة
    let parsedDate: Date | null = null
    
    // صيغة DD/MM/YYYY أو DD-MM-YYYY
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    const match = dateText.match(dateRegex)
    
    if (match) {
      const day = parseInt(match[1])
      const month = parseInt(match[2]) - 1 // الشهر يبدأ من 0 في JavaScript
      const year = parseInt(match[3])
      
      parsedDate = new Date(year, month, day)
      
      // التحقق من صحة التاريخ
      if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month || parsedDate.getFullYear() !== year) {
        throw new Error('تاريخ غير صحيح')
      }
    } else {
      throw new Error('صيغة تاريخ غير صحيحة')
    }

    if (!parsedDate) {
      throw new Error('لم يتم تحليل التاريخ بنجاح')
    }

    // التحقق من أن التاريخ ليس في المستقبل البعيد
    const today = new Date()
    const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    
    if (parsedDate > maxDate) {
      await ctx.reply('❌ التاريخ لا يمكن أن يكون في المستقبل البعيد.')
      return
    }

    const prisma = Database.prisma
    const adminUser = ctx.from ? await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } }) : null
    
    // تحديث الحالة والتاريخ
    const updateData: any = {
      isActive: false,
      employmentStatus: newStatus,
      [dateField]: parsedDate
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData
    })

    // حفظ في السجل
    await prisma.auditLog.create({
      data: {
        model: 'Employee',
        recordId: employeeId.toString(),
        action: 'UPDATE',
        category: 'HR',
        fieldName: 'employmentStatus',
        oldValue: 'CURRENT',
        newValue: newStatus,
        changedByUserId: adminUser?.id,
        description: `إنهاء العمل: ${newStatus}`,
        metadata: {
          statusDate: parsedDate
        }
      }
    })

    // مسح حالة التعديل
    delete ctx.session.statusChangeEdit

    const statusLabels: { [key: string]: string } = {
      'RESIGNED': 'استقال',
      'TERMINATED': 'فصل',
      'RETIRED': 'تقاعد'
    }

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.reply(
      `✅ تم تغيير الحالة بنجاح!\n\n` +
      `📊 الحالة الجديدة: ${statusLabels[newStatus]}\n` +
      `📅 التاريخ: ${parsedDate.toLocaleDateString('ar-EG')}`,
      { reply_markup: keyboard }
    )

  } catch (error) {
    console.error('Error parsing date:', error)
    
    const keyboard = new InlineKeyboard()
      .text('⬅️ رجوع', `hr:employee:status:simple:${employeeId}`)
    
    await ctx.reply(
      '❌ صيغة التاريخ غير صحيحة.\n\n' +
      '💡 يرجى إدخال التاريخ بصيغة:\n' +
      '• DD/MM/YYYY (مثال: 15/12/2024)\n' +
      '• DD-MM-YYYY (مثال: 15-12-2024)\n\n' +
      'أو اضغط "رجوع" واختر من التقويم.',
      { reply_markup: keyboard }
    )
  }
})
