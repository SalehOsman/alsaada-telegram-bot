import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { ContractType, EmploymentStatus, EmploymentType, Gender, MaritalStatus, PaymentMethod, Role, TransferType } from '../../../../../generated/prisma/index.js'
import { Database } from '../../../../modules/database/index.js'
import { Calendar } from '../../../../modules/ui/calendar.js'

// دالة إنشاء تقويم بسيط لاختيار التاريخ
function createDatePickerKeyboard(employeeId: number): InlineKeyboard {
  return Calendar.create({
    callbackPrefix: `hr:employee:status:date:${employeeId}`,
  })
}

export const employeeEditHandler = new Composer<Context>()

// معالج تعديل معلومات العامل
employeeEditHandler.callbackQuery(/^hr:employee:edit:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const userRole = ctx.dbUser?.role ?? 'GUEST'

  // التحقق من الصلاحيات
  if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
    await ctx.editMessageText(
      '❌ غير مصرح لك بتعديل معلومات العاملين\n\nتحتاج صلاحيات ADMIN أو SUPER_ADMIN.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:sub:hr-management:employees-list'),
      },
    )
    return
  }

  try {
    const prisma = Database.prisma

    // جلب معلومات العامل
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: {
          select: {
            titleAr: true,
            title: true,
          },
        },
      },
    })

    if (!employee) {
      await ctx.editMessageText(
        '❌ العامل غير موجود في النظام.',
        { reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:sub:hr-management:employees-list') },
      )
      return
    }

    // إنشاء رسالة التعديل
    let message = '✏️ تعديل معلومات العامل\n\n'
    message += `👤 العامل: ${employee.fullName}\n`
    message += `🆔 الكود: ${employee.employeeCode}\n\n`
    message += '━━━━━━━━━━━━━━━━━━━━\n\n'
    message += 'اختر الحقل الذي تريد تعديله:\n\n'

    // إنشاء لوحة المفاتيح
    const keyboard = new InlineKeyboard()

    // البيانات الأساسية
    keyboard.text('👤 البيانات الأساسية', `hr:employee:edit:basic:${employeeId}`).row()
    keyboard.text('💼 معلومات العمل', `hr:employee:edit:work:${employeeId}`).row()
    keyboard.text('📍 معلومات الإقامة', `hr:employee:edit:address:${employeeId}`).row()
    keyboard.text('🎓 معلومات التعليم', `hr:employee:edit:education:${employeeId}`).row()
    keyboard.text('🚨 معلومات الاتصال الطارئ', `hr:employee:edit:emergency:${employeeId}`).row()
    keyboard.text('📁 الملفات والمرفقات', `hr:employee:edit:files:${employeeId}`).row()
    keyboard.text('🏖️ نظام الإجازات', `hr:employee:edit:leave-system:${employeeId}`).row()
    keyboard.text('📱 معلومات إضافية', `hr:employee:edit:additional:${employeeId}`).row()
    keyboard.text('📝 الملاحظات', `hr:employee:edit:notes:${employeeId}`).row()

    // حقول الرواتب والبدلات (SUPER_ADMIN فقط)
    if (userRole === 'SUPER_ADMIN') {
      keyboard.text('💰 الرواتب والبدلات', `hr:employee:edit:salary:${employeeId}`).row()
    }

    // زر تغيير الحالة
    keyboard.text('📊 تغيير الحالة', `hr:employee:status:simple:${employeeId}`).row()

    // زر الرجوع
    keyboard.text('⬅️ رجوع للتفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
    })
  }
  catch (error) {
    console.error('Error loading employee edit form:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل نموذج التعديل.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:sub:hr-management:employees-list') },
    )
  }
})

// معالج تعديل البيانات الأساسية
employeeEditHandler.callbackQuery(/^hr:employee:edit:basic:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('👤 الاسم الكامل', `hr:employee:edit:field:${employeeId}:fullName`)
    .text('📛 الشهرة', `hr:employee:edit:field:${employeeId}:nickname`)
    .row()
    .text('🆔 الرقم القومي', `hr:employee:edit:field:${employeeId}:nationalId`)
    .text('📅 تاريخ الميلاد', `hr:employee:edit:field:${employeeId}:dateOfBirth`)
    .row()
    .text('⚧️ الجنس', `hr:employee:edit:field:${employeeId}:gender`)
    .text('📱 الهاتف', `hr:employee:edit:field:${employeeId}:personalPhone`)
    .row()
    .text('📧 البريد الإلكتروني', `hr:employee:edit:field:${employeeId}:personalEmail`)
    .text('🆔 رقم الجواز', `hr:employee:edit:field:${employeeId}:passportNumber`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل البيانات الأساسية\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل معلومات العمل
employeeEditHandler.callbackQuery(/^hr:employee:edit:work:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('💼 الوظيفة', `hr:employee:edit:field:${employeeId}:positionId`)
    .text('📋 القسم', `hr:employee:edit:field:${employeeId}:departmentId`)
    .row()
    .text('📅 تاريخ التعيين', `hr:employee:edit:field:${employeeId}:hireDate`)
    .text('📅 تاريخ التأكيد', `hr:employee:edit:field:${employeeId}:confirmationDate`)
    .row()
    .text('📅 تاريخ الاستقالة', `hr:employee:edit:field:${employeeId}:resignationDate`)
    .text('📅 تاريخ الفصل', `hr:employee:edit:field:${employeeId}:terminationDate`)
    .row()
    .text('📝 سبب الفصل', `hr:employee:edit:field:${employeeId}:terminationReason`)
    .text('📊 حالة التوظيف', `hr:employee:edit:field:${employeeId}:employmentStatus`)
    .row()
    .text('📋 نوع التوظيف', `hr:employee:edit:field:${employeeId}:employmentType`)
    .text('📄 نوع العقد', `hr:employee:edit:field:${employeeId}:contractType`)
    .row()
    .text('⏰ جدول العمل', `hr:employee:edit:field:${employeeId}:workSchedule`)
    .text('📍 موقع العمل', `hr:employee:edit:field:${employeeId}:workLocation`)
    .row()
    .text('👨‍💼 المدير المباشر', `hr:employee:edit:field:${employeeId}:directManagerId`)
    .text('✅ الحالة', `hr:employee:edit:field:${employeeId}:isActive`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل معلومات العمل\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل معلومات الإقامة
employeeEditHandler.callbackQuery(/^hr:employee:edit:address:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('📍 المحافظة', `hr:employee:edit:field:${employeeId}:governorateId`)
    .text('🏠 العنوان الحالي', `hr:employee:edit:field:${employeeId}:currentAddress`)
    .row()
    .text('🏠 العنوان الدائم', `hr:employee:edit:field:${employeeId}:permanentAddress`)
    .text('🏙️ المدينة', `hr:employee:edit:field:${employeeId}:city`)
    .row()
    .text('🗺️ المنطقة', `hr:employee:edit:field:${employeeId}:region`)
    .text('🌍 الدولة', `hr:employee:edit:field:${employeeId}:country`)
    .row()
    .text('📮 الرمز البريدي', `hr:employee:edit:field:${employeeId}:postalCode`)
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل معلومات الإقامة\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل معلومات التعليم
employeeEditHandler.callbackQuery(/^hr:employee:edit:education:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('📚 مستوى التعليم', `hr:employee:edit:field:${employeeId}:educationLevel`)
    .text('🎯 التخصص', `hr:employee:edit:field:${employeeId}:major`)
    .row()
    .text('🏫 الجامعة', `hr:employee:edit:field:${employeeId}:university`)
    .text('📅 سنة التخرج', `hr:employee:edit:field:${employeeId}:graduationYear`)
    .row()
    .text('🏆 الشهادات', `hr:employee:edit:field:${employeeId}:certifications`)
    .text('🛠️ المهارات', `hr:employee:edit:field:${employeeId}:skills`)
    .row()
    .text('💼 الخبرة السابقة', `hr:employee:edit:field:${employeeId}:previousExperience`)
    .text('📊 سنوات الخبرة', `hr:employee:edit:field:${employeeId}:yearsOfExperience`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل معلومات التعليم\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل معلومات الاتصال الطارئ
employeeEditHandler.callbackQuery(/^hr:employee:edit:emergency:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('👤 اسم جهة الاتصال', `hr:employee:edit:field:${employeeId}:emergencyContactName`)
    .text('📱 هاتف جهة الاتصال', `hr:employee:edit:field:${employeeId}:emergencyContactPhone`)
    .row()
    .text('👥 صلة القرابة', `hr:employee:edit:field:${employeeId}:emergencyContactRelation`)
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل معلومات الاتصال الطارئ\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل الملفات والمرفقات
employeeEditHandler.callbackQuery(/^hr:employee:edit:files:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('🖼️ الصورة الشخصية', `hr:employee:edit:field:${employeeId}:profilePhoto`)
    .text('📄 السيرة الذاتية', `hr:employee:edit:field:${employeeId}:cv`)
    .row()
    .text('📋 المستندات', `hr:employee:edit:field:${employeeId}:documents`)
    .text('🆔 بطاقة الرقم القومي', `hr:employee:edit:field:${employeeId}:nationalIdCardUrl`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل الملفات والمرفقات\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل نظام الإجازات
employeeEditHandler.callbackQuery(/^hr:employee:edit:leave-system:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('📅 أيام العمل في الدورة', `hr:employee:edit:field:${employeeId}:workDaysPerCycle`)
    .text('🏖️ أيام الإجازة في الدورة', `hr:employee:edit:field:${employeeId}:leaveDaysPerCycle`)
    .row()
    .text('⏰ أيام العمل الحالية', `hr:employee:edit:field:${employeeId}:currentWorkDays`)
    .text('🎯 أيام الإجازة الحالية', `hr:employee:edit:field:${employeeId}:currentLeaveDays`)
    .row()
    .text('📅 تاريخ بداية آخر إجازة', `hr:employee:edit:field:${employeeId}:lastLeaveStartDate`)
    .text('📅 تاريخ نهاية آخر إجازة', `hr:employee:edit:field:${employeeId}:lastLeaveEndDate`)
    .row()
    .text('📅 تاريخ بداية الإجازة القادمة', `hr:employee:edit:field:${employeeId}:nextLeaveStartDate`)
    .text('📅 تاريخ نهاية الإجازة القادمة', `hr:employee:edit:field:${employeeId}:nextLeaveEndDate`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '🏖️ تعديل نظام الإجازات\n\n'
    + 'هذا النظام يعتمد على دورات عمل متتالية:\n'
    + '• عدد أيام العمل متبوعة بعدد أيام الإجازة\n'
    + '• يمكن تخصيص هذه الأرقام لكل عامل\n'
    + '• النظام يحسب تلقائياً مواعيد الإجازات\n\n'
    + 'اختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل المعلومات الإضافية
employeeEditHandler.callbackQuery(/^hr:employee:edit:additional:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('📱 معرف التليجرام', `hr:employee:edit:field:${employeeId}:telegramId`)
    .text('📱 رقم التحويل الأول', `hr:employee:edit:field:${employeeId}:transferNumber1`)
    .row()
    .text('💳 نوع التحويل الأول', `hr:employee:edit:field:${employeeId}:transferType1`)
    .text('📱 رقم التحويل الثاني', `hr:employee:edit:field:${employeeId}:transferNumber2`)
    .row()
    .text('💳 نوع التحويل الثاني', `hr:employee:edit:field:${employeeId}:transferType2`)
    .text('🏥 رقم التأمين الاجتماعي', `hr:employee:edit:field:${employeeId}:socialInsuranceNumber`)
    .row()
    .text('📊 الرقم الضريبي', `hr:employee:edit:field:${employeeId}:taxNumber`)
    .text('📅 تاريخ بداية التأمين', `hr:employee:edit:field:${employeeId}:insuranceStartDate`)
    .row()
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '📱 تعديل المعلومات الإضافية\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل الملاحظات
employeeEditHandler.callbackQuery(/^hr:employee:edit:notes:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])

  const keyboard = new InlineKeyboard()
    .text('📝 الملاحظات', `hr:employee:edit:field:${employeeId}:notes`)
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل الملاحظات\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل الرواتب والبدلات (SUPER_ADMIN فقط)
employeeEditHandler.callbackQuery(/^hr:employee:edit:salary:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const userRole = ctx.dbUser?.role ?? 'GUEST'

  // التحقق من الصلاحيات
  if (userRole !== Role.SUPER_ADMIN) {
    await ctx.editMessageText(
      '❌ غير مصرح لك بتعديل الرواتب والبدلات\n\nتحتاج صلاحيات SUPER_ADMIN.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`),
      },
    )
    return
  }

  const keyboard = new InlineKeyboard()
    .text('💰 الراتب الأساسي', `hr:employee:edit:field:${employeeId}:basicSalary`)
    .text('💵 البدلات', `hr:employee:edit:field:${employeeId}:allowances`)
    .row()
    .text('💸 الراتب الإجمالي', `hr:employee:edit:field:${employeeId}:totalSalary`)
    .text('💱 العملة', `hr:employee:edit:field:${employeeId}:currency`)
    .row()
    .text('🏦 طريقة الدفع', `hr:employee:edit:field:${employeeId}:paymentMethod`)
    .text('🏢 اسم البنك', `hr:employee:edit:field:${employeeId}:bankName`)
    .row()
    .text('💳 رقم الحساب', `hr:employee:edit:field:${employeeId}:bankAccountNumber`)
    .text('🏦 رقم الآيبان', `hr:employee:edit:field:${employeeId}:iban`)
    .row()
    .text('📱 رقم التحويل الأول', `hr:employee:edit:field:${employeeId}:transferNumber1`)
    .text('💳 نوع التحويل الأول', `hr:employee:edit:field:${employeeId}:transferType1`)
    .row()
    .text('📱 رقم التحويل الثاني', `hr:employee:edit:field:${employeeId}:transferNumber2`)
    .text('💳 نوع التحويل الثاني', `hr:employee:edit:field:${employeeId}:transferType2`)
    .row()
    .text('🏥 رقم التأمين الاجتماعي', `hr:employee:edit:field:${employeeId}:socialInsuranceNumber`)
    .text('📊 الرقم الضريبي', `hr:employee:edit:field:${employeeId}:taxNumber`)
    .row()
    .text('📅 تاريخ بداية التأمين', `hr:employee:edit:field:${employeeId}:insuranceStartDate`)
    .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

  await ctx.editMessageText(
    '✏️ تعديل الرواتب والبدلات\n\n⚠️ تحذير: هذه المعلومات حساسة ومتاحة لـ SUPER_ADMIN فقط.\n\nاختر الحقل الذي تريد تعديله:',
    { reply_markup: keyboard },
  )
})

// معالج تعديل الحقول الفردية
employeeEditHandler.callbackQuery(/^hr:employee:edit:field:(\d+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const fieldName = ctx.match[2]
  const userRole = ctx.dbUser?.role ?? 'GUEST'

  // التحقق من الصلاحيات للحقول الحساسة
  const sensitiveFields = ['basicSalary', 'allowances', 'totalSalary', 'currency', 'paymentMethod', 'bankName', 'bankAccountNumber', 'iban', 'transferNumber1', 'transferType1', 'transferNumber2', 'transferType2', 'socialInsuranceNumber', 'taxNumber', 'insuranceStartDate']

  if (sensitiveFields.includes(fieldName) && userRole !== Role.SUPER_ADMIN) {
    await ctx.editMessageText(
      '❌ غير مصرح لك بتعديل هذا الحقل\n\nتحتاج صلاحيات SUPER_ADMIN.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`),
      },
    )
    return
  }

  try {
    const prisma = Database.prisma

    // جلب معلومات العامل
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: {
          select: {
            titleAr: true,
            title: true,
          },
        },
      },
    })

    if (!employee) {
      await ctx.editMessageText(
        '❌ العامل غير موجود في النظام.',
        { reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'menu:sub:hr-management:employees-list') },
      )
      return
    }

    // تحديد نوع الحقل والرسالة المناسبة
    let fieldLabel = ''
    let currentValue = ''
    let inputType = 'text'
    let hasChoices = false
    let choices: { label: string, value: string }[] = []

    switch (fieldName) {
      case 'fullName':
        fieldLabel = 'الاسم الكامل'
        currentValue = employee.fullName
        break
      case 'nickname':
        fieldLabel = 'الشهرة'
        currentValue = employee.nickname || ''
        break
      case 'nationalId':
        fieldLabel = 'الرقم القومي'
        currentValue = employee.nationalId
        break
      case 'personalPhone':
        fieldLabel = 'الهاتف'
        currentValue = employee.personalPhone
        break
      case 'personalEmail':
        fieldLabel = 'البريد الإلكتروني'
        currentValue = employee.personalEmail || ''
        break
      case 'gender':
        fieldLabel = 'الجنس'
        currentValue = employee.gender === Gender.MALE ? 'ذكر' : 'أنثى'
        hasChoices = true
        choices = [
          { label: 'ذكر', value: Gender.MALE },
          { label: 'أنثى', value: Gender.FEMALE },
        ]
        break
      case 'maritalStatus':
        fieldLabel = 'الحالة الاجتماعية'
        const maritalStatusMap: { [key in MaritalStatus]: string } = {
          [MaritalStatus.SINGLE]: 'أعزب/عزباء',
          [MaritalStatus.MARRIED]: 'متزوج/متزوجة',
          [MaritalStatus.DIVORCED]: 'مطلق/مطلقة',
          [MaritalStatus.WIDOWED]: 'أرمل/أرملة',
        }
        currentValue = maritalStatusMap[employee.maritalStatus]
        hasChoices = true
        choices = [
          { label: 'أعزب/عزباء', value: MaritalStatus.SINGLE },
          { label: 'متزوج/متزوجة', value: MaritalStatus.MARRIED },
          { label: 'مطلق/مطلقة', value: MaritalStatus.DIVORCED },
          { label: 'أرمل/أرملة', value: MaritalStatus.WIDOWED },
        ]
        break
      case 'employmentType':
        fieldLabel = 'نوع التوظيف'
        const employmentTypeMap: { [key in EmploymentType]: string } = {
          [EmploymentType.FULL_TIME]: 'دوام كامل',
          [EmploymentType.PART_TIME]: 'دوام جزئي',
          [EmploymentType.CONTRACT]: 'عقد',
          [EmploymentType.TEMPORARY]: 'مؤقت',
          [EmploymentType.INTERN]: 'متدرب',
          [EmploymentType.FREELANCE]: 'مستقل',
        }
        currentValue = employmentTypeMap[employee.employmentType]
        hasChoices = true
        choices = [
          { label: 'دوام كامل', value: EmploymentType.FULL_TIME },
          { label: 'دوام جزئي', value: EmploymentType.PART_TIME },
          { label: 'عقد', value: EmploymentType.CONTRACT },
          { label: 'مؤقت', value: EmploymentType.TEMPORARY },
          { label: 'متدرب', value: EmploymentType.INTERN },
          { label: 'مستقل', value: EmploymentType.FREELANCE },
        ]
        break
      case 'contractType':
        fieldLabel = 'نوع العقد'
        const contractTypeMap: { [key in ContractType]: string } = {
          [ContractType.PERMANENT]: 'دائم',
          [ContractType.FIXED_TERM]: 'محدد المدة',
          [ContractType.PROBATION]: 'فترة تجريبية',
          [ContractType.SEASONAL]: 'موسمي',
        }
        currentValue = contractTypeMap[employee.contractType]
        hasChoices = true
        choices = [
          { label: 'دائم', value: ContractType.PERMANENT },
          { label: 'محدد المدة', value: ContractType.FIXED_TERM },
          { label: 'فترة تجريبية', value: ContractType.PROBATION },
          { label: 'موسمي', value: ContractType.SEASONAL },
        ]
        break
      case 'employmentStatus':
        fieldLabel = 'حالة التوظيف'
        const employmentStatusMap: { [key in EmploymentStatus]: string } = {
          [EmploymentStatus.ACTIVE]: 'نشط',
          [EmploymentStatus.ON_LEAVE]: 'في إجازة',
          [EmploymentStatus.SUSPENDED]: 'معلق',
          [EmploymentStatus.RESIGNED]: 'استقال',
          [EmploymentStatus.TERMINATED]: 'فصل',
          [EmploymentStatus.RETIRED]: 'تقاعد',
          [EmploymentStatus.ON_MISSION]: 'في مهمة',
          [EmploymentStatus.SETTLED]: 'مستقر',
        }
        currentValue = employmentStatusMap[employee.employmentStatus]
        hasChoices = true
        choices = [
          { label: 'نشط', value: EmploymentStatus.ACTIVE },
          { label: 'في إجازة', value: EmploymentStatus.ON_LEAVE },
          { label: 'معلق', value: EmploymentStatus.SUSPENDED },
          { label: 'استقال', value: EmploymentStatus.RESIGNED },
          { label: 'فصل', value: EmploymentStatus.TERMINATED },
          { label: 'تقاعد', value: EmploymentStatus.RETIRED },
          { label: 'في مهمة', value: EmploymentStatus.ON_MISSION },
          { label: 'مستقر', value: EmploymentStatus.SETTLED },
        ]
        break
      case 'paymentMethod':
        fieldLabel = 'طريقة الدفع'
        const paymentMethodMap: { [key in PaymentMethod]: string } = {
          [PaymentMethod.CASH]: 'نقدي',
          [PaymentMethod.BANK_TRANSFER]: 'تحويل بنكي',
          [PaymentMethod.CHEQUE]: 'شيك',
          [PaymentMethod.MOBILE_WALLET]: 'محفظة إلكترونية',
        }
        currentValue = paymentMethodMap[employee.paymentMethod]
        hasChoices = true
        choices = [
          { label: 'نقدي', value: PaymentMethod.CASH },
          { label: 'تحويل بنكي', value: PaymentMethod.BANK_TRANSFER },
          { label: 'شيك', value: PaymentMethod.CHEQUE },
          { label: 'محفظة إلكترونية', value: PaymentMethod.MOBILE_WALLET },
        ]
        break
      case 'transferType1':
        fieldLabel = 'نوع التحويل الأول'
        const transferTypeMap: { [key in TransferType]: string } = {
          [TransferType.INSTAPAY]: 'إنستاباي',
          [TransferType.CASH]: 'كاش',
        }
        currentValue = employee.transferType1 ? transferTypeMap[employee.transferType1] : ''
        hasChoices = true
        choices = [
          { label: 'إنستاباي', value: TransferType.INSTAPAY },
          { label: 'كاش', value: TransferType.CASH },
        ]
        break
      case 'transferType2':
        fieldLabel = 'نوع التحويل الثاني'
        const transferTypeMap2: { [key in TransferType]: string } = {
          [TransferType.INSTAPAY]: 'إنستاباي',
          [TransferType.CASH]: 'كاش',
        }
        currentValue = employee.transferType2 ? transferTypeMap2[employee.transferType2] : ''
        hasChoices = true
        choices = [
          { label: 'إنستاباي', value: TransferType.INSTAPAY },
          { label: 'كاش', value: TransferType.CASH },
        ]
        break
      case 'basicSalary':
        fieldLabel = 'الراتب الأساسي'
        currentValue = employee.basicSalary.toString()
        inputType = 'number'
        break
      case 'allowances':
        fieldLabel = 'البدلات'
        currentValue = employee.allowances?.toString() || '0'
        inputType = 'number'
        break
      case 'notes':
        fieldLabel = 'الملاحظات'
        currentValue = employee.notes || ''
        break
      case 'workDaysPerCycle':
        fieldLabel = 'عدد أيام العمل في الدورة'
        currentValue = employee.workDaysPerCycle?.toString() || ''
        inputType = 'number'
        break
      case 'leaveDaysPerCycle':
        fieldLabel = 'عدد أيام الإجازة في الدورة'
        currentValue = employee.leaveDaysPerCycle?.toString() || ''
        inputType = 'number'
        break
      case 'currentWorkDays':
        fieldLabel = 'عدد أيام العمل الحالية'
        currentValue = employee.currentWorkDays?.toString() || '0'
        inputType = 'number'
        break
      case 'currentLeaveDays':
        fieldLabel = 'عدد أيام الإجازة الحالية'
        currentValue = employee.currentLeaveDays?.toString() || '0'
        inputType = 'number'
        break
      case 'lastLeaveStartDate':
        fieldLabel = 'تاريخ بداية آخر إجازة'
        currentValue = employee.lastLeaveStartDate ? employee.lastLeaveStartDate.toLocaleDateString('ar-EG') : ''
        inputType = 'date'
        break
      case 'lastLeaveEndDate':
        fieldLabel = 'تاريخ نهاية آخر إجازة'
        currentValue = employee.lastLeaveEndDate ? employee.lastLeaveEndDate.toLocaleDateString('ar-EG') : ''
        inputType = 'date'
        break
      case 'nextLeaveStartDate':
        fieldLabel = 'تاريخ بداية الإجازة القادمة'
        currentValue = employee.nextLeaveStartDate ? employee.nextLeaveStartDate.toLocaleDateString('ar-EG') : ''
        inputType = 'date'
        break
      case 'nextLeaveEndDate':
        fieldLabel = 'تاريخ نهاية الإجازة القادمة'
        currentValue = employee.nextLeaveEndDate ? employee.nextLeaveEndDate.toLocaleDateString('ar-EG') : ''
        inputType = 'date'
        break
      case 'telegramId':
        fieldLabel = 'معرف التليجرام'
        currentValue = employee.telegramId || ''
        break
      case 'transferNumber1':
        fieldLabel = 'رقم التحويل الأول'
        currentValue = employee.transferNumber1 || ''

        // بدء التعديل المتسلسل
        ctx.session = ctx.session || {}
        ctx.session.sequentialEdit = {
          employeeId,
          step: 'number',
          transferField: 'transferNumber1',
          transferTypeField: 'transferType1',
        }

        const keyboard1 = new InlineKeyboard()
          .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

        await ctx.editMessageText(
          `✏️ تعديل ${fieldLabel}\n\n`
          + `👤 العامل: ${employee.fullName}\n`
          + `🆔 الكود: ${employee.employeeCode}\n\n`
          + `📝 القيمة الحالية: ${currentValue || 'غير محدد'}\n\n`
          + `💡 أرسل الرقم الجديد (11 رقم):`,
          { reply_markup: keyboard1 },
        )
        return

      case 'transferNumber2':
        fieldLabel = 'رقم التحويل الثاني'
        currentValue = employee.transferNumber2 || ''

        // بدء التعديل المتسلسل
        ctx.session = ctx.session || {}
        ctx.session.sequentialEdit = {
          employeeId,
          step: 'number',
          transferField: 'transferNumber2',
          transferTypeField: 'transferType2',
        }

        const keyboard2 = new InlineKeyboard()
          .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

        await ctx.editMessageText(
          `✏️ تعديل ${fieldLabel}\n\n`
          + `👤 العامل: ${employee.fullName}\n`
          + `🆔 الكود: ${employee.employeeCode}\n\n`
          + `📝 القيمة الحالية: ${currentValue || 'غير محدد'}\n\n`
          + `💡 أرسل الرقم الجديد (11 رقم):`,
          { reply_markup: keyboard2 },
        )
        return
      case 'socialInsuranceNumber':
        fieldLabel = 'رقم التأمين الاجتماعي'
        currentValue = employee.socialInsuranceNumber || ''
        break
      case 'taxNumber':
        fieldLabel = 'الرقم الضريبي'
        currentValue = employee.taxNumber || ''
        break
      case 'insuranceStartDate':
        fieldLabel = 'تاريخ بداية التأمين'
        currentValue = employee.insuranceStartDate ? employee.insuranceStartDate.toLocaleDateString('ar-EG') : ''
        inputType = 'date'
        break
      case 'isActive':
        fieldLabel = 'حالة العامل'
        currentValue = employee.isActive ? 'نشط' : 'غير نشط'
        hasChoices = true
        choices = [
          { label: 'نشط', value: 'true' },
          { label: 'غير نشط', value: 'false' },
        ]
        break
      case 'attendanceRequired':
        fieldLabel = 'مطلوب الحضور'
        currentValue = employee.attendanceRequired ? 'مطلوب' : 'غير مطلوب'
        hasChoices = true
        choices = [
          { label: 'مطلوب', value: 'true' },
          { label: 'غير مطلوب', value: 'false' },
        ]
        break
      default:
        fieldLabel = fieldName
        currentValue = (employee as any)[fieldName]?.toString() || ''
    }

    const keyboard = new InlineKeyboard()

    if (hasChoices) {
      // عرض أزرار الاختيار للحقول ذات الحالات المحددة
      for (const choice of choices) {
        keyboard.text(choice.label, `hr:employee:edit:choice:${employeeId}:${fieldName}:${choice.value}`).row()
      }
    }
    else {
      // للحقول العادية، عرض رسالة طلب الإدخال
      keyboard.text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

      await ctx.editMessageText(
        `✏️ تعديل ${fieldLabel}\n\n`
        + `👤 العامل: ${employee.fullName}\n`
        + `🆔 الكود: ${employee.employeeCode}\n\n`
        + `📝 القيمة الحالية: ${currentValue || 'غير محدد'}\n\n`
        + `💡 أرسل القيمة الجديدة أو اضغط رجوع للإلغاء:`,
        { reply_markup: keyboard },
      )

      // حفظ حالة التعديل في السياق
      ctx.session = ctx.session || {}
      ctx.session.editingField = {
        employeeId,
        fieldName,
        fieldLabel,
        inputType,
      }
      return
    }

    keyboard.text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

    await ctx.editMessageText(
      `✏️ تعديل ${fieldLabel}\n\n`
      + `👤 العامل: ${employee.fullName}\n`
      + `🆔 الكود: ${employee.employeeCode}\n\n`
      + `📝 القيمة الحالية: ${currentValue || 'غير محدد'}\n\n`
      + `💡 اختر القيمة الجديدة:`,
      { reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error loading field edit form:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل نموذج التعديل.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )
  }
})

// معالج استقبال النصوص لتحديث الحقول
employeeEditHandler.on('message:text', async (ctx, next) => {
  console.log('🔍 معالج النصوص تم استدعاؤه')
  const userId = ctx.from?.id
  if (!userId)
    return next()

  console.log('🔍 userId:', userId)
  console.log('🔍 editingField:', ctx.session?.editingField)
  console.log('🔍 sequentialEdit:', ctx.session?.sequentialEdit)
  console.log('🔍 statusChangeEdit:', ctx.session?.statusChangeEdit)

  // معالجة إدخال التاريخ المخصص لتغيير الحالة
  if (ctx.session?.statusChangeEdit?.step === 'date') {
    console.log('🔍 معالجة التاريخ المخصص')
    const { employeeId, newStatus, dateField } = ctx.session.statusChangeEdit
    const dateText = ctx.message.text.trim()

    try {
      // تحليل التاريخ من الصيغ المختلفة
      let parsedDate: Date | null = null

      // صيغة DD/MM/YYYY أو DD-MM-YYYY
      const dateRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/
      const match = dateText.match(dateRegex)

      if (match) {
        const day = Number.parseInt(match[1])
        const month = Number.parseInt(match[2]) - 1 // الشهر يبدأ من 0 في JavaScript
        const year = Number.parseInt(match[3])

        parsedDate = new Date(year, month, day)

        // التحقق من صحة التاريخ
        if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month || parsedDate.getFullYear() !== year) {
          throw new Error('تاريخ غير صحيح')
        }
      }
      else {
        // محاولة تحليل التاريخ مباشرة
        parsedDate = new Date(dateText)
        if (isNaN(parsedDate.getTime())) {
          throw new TypeError('صيغة تاريخ غير صحيحة')
        }
      }

      // التحقق من أن التاريخ ليس في المستقبل البعيد
      const today = new Date()
      const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())

      if (parsedDate > maxDate) {
        await ctx.reply('❌ التاريخ لا يمكن أن يكون في المستقبل البعيد.')
        return
      }

      const prisma = Database.prisma

      // تحديث الحالة والتاريخ
      const updateData: any = {
        employmentStatus: newStatus,
        [dateField]: parsedDate,
      }

      // إضافة isActive = false للحالات غير النشطة
      const inactiveStatuses: EmploymentStatus[] = [EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED, EmploymentStatus.RETIRED]
      if (inactiveStatuses.includes(newStatus as EmploymentStatus)) {
        updateData.isActive = false
      }

      await prisma.employee.update({
        where: { id: employeeId },
        data: updateData,
      })

      // مسح حالة التعديل
      delete ctx.session.statusChangeEdit

      const statusLabels: { [key in EmploymentStatus]?: string } = {
        [EmploymentStatus.RESIGNED]: 'استقال',
        [EmploymentStatus.TERMINATED]: 'فصل',
        [EmploymentStatus.RETIRED]: 'تقاعد',
      }

      const keyboard = new InlineKeyboard()
        .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
        .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

      await ctx.reply(
        `✅ تم تغيير الحالة الوظيفية بنجاح!\n\n`
        + `📊 الحالة الجديدة: ${statusLabels[newStatus as EmploymentStatus]}\n`
        + `📅 التاريخ: ${parsedDate.toLocaleDateString('ar-EG')}`,
        { reply_markup: keyboard },
      )
    }
    catch (error) {
      console.error('Error parsing date:', error)

      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

      await ctx.reply(
        '❌ صيغة التاريخ غير صحيحة.\n\n'
        + '💡 يرجى إدخال التاريخ بصيغة:\n'
        + '• DD/MM/YYYY (مثال: 15/12/2024)\n'
        + '• DD-MM-YYYY (مثال: 15-12-2024)',
        { reply_markup: keyboard },
      )
    }
    return
  }

  // معالجة التعديل المتسلسل لأرقام التحويل
  if (ctx.session?.sequentialEdit) {
    console.log('🔍 معالجة التعديل المتسلسل')
    const { employeeId, step, transferField, transferTypeField, newValue: savedValue } = ctx.session.sequentialEdit
    const newValue = ctx.message.text.trim()

    console.log('🔍 step:', step)
    console.log('🔍 newValue:', newValue)
    console.log('🔍 transferField:', transferField)

    try {
      const prisma = Database.prisma

      if (step === 'number') {
        console.log('🔍 معالجة خطوة الرقم')
        // التحقق من صحة الرقم (11 رقم)
        if (!/^\d{11}$/.test(newValue)) {
          console.log('🔍 رقم غير صحيح')
          await ctx.reply('❌ يرجى إدخال رقم صحيح مكون من 11 رقم.')
          return
        }

        console.log('🔍 رقم صحيح، الانتقال لخطوة النوع')
        // حفظ الرقم والانتقال لخطوة نوع التحويل
        ctx.session.sequentialEdit.step = 'type'
        ctx.session.sequentialEdit.newValue = newValue

        const keyboard = new InlineKeyboard()
          .text('إنستاباي', `hr:employee:edit:sequential:${employeeId}:INSTAPAY`)
          .text('كاش', `hr:employee:edit:sequential:${employeeId}:CASH`)
          .row()
          .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

        await ctx.reply(
          `✅ تم حفظ الرقم: ${newValue}\n\n`
          + `💡 الآن اختر نوع التحويل:`,
          { reply_markup: keyboard },
        )
        return
      }
    }
    catch (error) {
      console.error('Error in sequential edit:', error)
      await ctx.reply('❌ حدث خطأ أثناء التعديل.')
      delete ctx.session.sequentialEdit
    }
    return
  }

  // التحقق من وجود حالة تعديل نشطة
  if (!ctx.session?.editingField) {
    console.log('🔍 لا توجد حالة تعديل نشطة')
    return next() // تمرير الرسالة للـhandler التالي
  }

  const { employeeId, fieldName, fieldLabel, inputType } = ctx.session.editingField
  const newValue = ctx.message.text.trim()

  console.log('🔍 employeeId:', employeeId)
  console.log('🔍 fieldName:', fieldName)
  console.log('🔍 newValue:', newValue)

  try {
    const prisma = Database.prisma

    // التحقق من الصلاحيات مرة أخرى
    const userRole = ctx.dbUser?.role ?? 'GUEST'
    const sensitiveFields = ['basicSalary', 'allowances', 'totalSalary', 'currency', 'paymentMethod', 'bankName', 'bankAccountNumber', 'iban', 'transferNumber1', 'transferType1', 'transferNumber2', 'transferType2', 'socialInsuranceNumber', 'taxNumber', 'insuranceStartDate']

    if (sensitiveFields.includes(fieldName) && userRole !== Role.SUPER_ADMIN) {
      await ctx.reply('❌ غير مصرح لك بتعديل هذا الحقل.')
      return
    }

    // التحقق من صحة البيانات
    let validatedValue: any = newValue

    if (inputType === 'number') {
      const numValue = Number.parseFloat(newValue)
      if (isNaN(numValue)) {
        await ctx.reply('❌ يرجى إدخال رقم صحيح.')
        return
      }
      validatedValue = numValue
    }
    else if (inputType === 'date') {
      // معالجة التواريخ بصيغة DD/MM/YYYY أو DD-MM-YYYY
      const dateRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/
      const match = newValue.match(dateRegex)

      if (!match) {
        await ctx.reply('❌ يرجى إدخال التاريخ بصيغة صحيحة (DD/MM/YYYY أو DD-MM-YYYY)')
        return
      }

      const day = Number.parseInt(match[1])
      const month = Number.parseInt(match[2])
      const year = Number.parseInt(match[3])

      // التحقق من صحة التاريخ
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        await ctx.reply('❌ التاريخ غير صحيح. يرجى التحقق من اليوم والشهر والسنة.')
        return
      }

      validatedValue = new Date(year, month - 1, day)
    }

    // تحديث الحقل في قاعدة البيانات
    const updateData: any = {}
    updateData[fieldName] = validatedValue

    console.log(`🔄 تحديث الحقل ${fieldName} للعامل ${employeeId}:`, validatedValue)

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    console.log(`✅ تم تحديث الحقل ${fieldName} بنجاح`)

    // مسح حالة التعديل
    delete ctx.session.editingField

    // إرسال رسالة نجاح
    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.reply(
      `✅ تم تحديث ${fieldLabel} بنجاح!\n\n`
      + `📝 القيمة الجديدة: ${newValue}`,
      { reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating field:', error)

    // إرسال رسالة خطأ مفصلة
    let errorMessage = '❌ حدث خطأ أثناء تحديث الحقل.'

    if (error instanceof Error) {
      console.error('Error details:', error.message)

      if (error.message.includes('Unique constraint failed')) {
        if (error.message.includes('nationalId')) {
          errorMessage = '❌ الرقم القومي مسجل بالفعل لموظف آخر.'
        }
        else if (error.message.includes('telegramId')) {
          errorMessage = '❌ معرف التليجرام مسجل بالفعل لموظف آخر.'
        }
        else {
          errorMessage = '❌ البيانات المدخلة مكررة.'
        }
      }
      else if (error.message.includes('Record to update not found')) {
        errorMessage = '❌ العامل غير موجود في النظام.'
      }
    }

    await ctx.reply(errorMessage)

    // مسح حالة التعديل في حالة الخطأ
    delete ctx.session.editingField
  }
})

// معالج اختيار القيم المحددة مسبقاً
employeeEditHandler.callbackQuery(/^hr:employee:edit:choice:(\d+):(\w+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const fieldName = ctx.match[2]
  const selectedValue = ctx.match[3]

  try {
    const prisma = Database.prisma

    // التحقق من الصلاحيات للحقول الحساسة
    const userRole = ctx.dbUser?.role ?? 'GUEST'
    const sensitiveFields = ['basicSalary', 'allowances', 'totalSalary', 'currency', 'paymentMethod', 'bankName', 'bankAccountNumber', 'iban', 'transferNumber1', 'transferType1', 'transferNumber2', 'transferType2', 'socialInsuranceNumber', 'taxNumber', 'insuranceStartDate']

    if (sensitiveFields.includes(fieldName) && userRole !== Role.SUPER_ADMIN) {
      await ctx.editMessageText(
        '❌ غير مصرح لك بتعديل هذا الحقل\n\nتحتاج صلاحيات SUPER_ADMIN.',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`),
        },
      )
      return
    }

    // تحويل القيم المنطقية
    let validatedValue: any = selectedValue
    if (fieldName === 'isActive') {
      validatedValue = selectedValue === 'true'
    }

    // معالجة خاصة لتغيير حالة التوظيف
    if (fieldName === 'employmentStatus') {
      const statusDateMap: { [key: string]: string } = {
        RESIGNED: 'resignationDate',
        TERMINATED: 'terminationDate',
        RETIRED: 'terminationDate', // استخدام terminationDate للتقاعد
      }

      const dateField = statusDateMap[selectedValue]
      if (dateField) {
        // بدء عملية إدارة التاريخ
        ctx.session = ctx.session || {}
        ctx.session.statusChangeEdit = {
          employeeId,
          newStatus: selectedValue,
          step: 'confirm',
          dateField: dateField as any,
          dateType: 'today',
        }

        const statusLabels: { [key in EmploymentStatus]?: string } = {
          [EmploymentStatus.RESIGNED]: 'استقال',
          [EmploymentStatus.TERMINATED]: 'فصل',
          [EmploymentStatus.RETIRED]: 'تقاعد',
        }

        const keyboard = new InlineKeyboard()
          .text('📅 اليوم', `hr:employee:status:date:${employeeId}:today`)
          .text('📆 تاريخ آخر', `hr:employee:status:date:${employeeId}:custom`)
          .row()
          .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

        await ctx.editMessageText(
          `📊 تغيير الحالة الوظيفية إلى: ${statusLabels[selectedValue as EmploymentStatus]}\n\n`
          + `💡 اختر تاريخ ${statusLabels[selectedValue as EmploymentStatus]}:`,
          { reply_markup: keyboard },
        )
        return
      }
    }

    // تحديث الحقل في قاعدة البيانات
    const updateData: any = {}
    updateData[fieldName] = validatedValue

    console.log(`🔄 تحديث الحقل ${fieldName} للعامل ${employeeId}:`, validatedValue)

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    console.log(`✅ تم تحديث الحقل ${fieldName} بنجاح`)

    // إرسال رسالة نجاح
    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    const fieldLabels: { [key: string]: string } = {
      isActive: 'حالة العامل',
      gender: 'الجنس',
      maritalStatus: 'الحالة الاجتماعية',
      employmentType: 'نوع التوظيف',
      contractType: 'نوع العقد',
      employmentStatus: 'حالة التوظيف',
      paymentMethod: 'طريقة الدفع',
      transferType1: 'نوع التحويل الأول',
      transferType2: 'نوع التحويل الثاني',
    }

    const fieldLabel = fieldLabels[fieldName] || fieldName
    const displayValue = fieldName === 'isActive' ? (validatedValue ? 'نشط' : 'غير نشط') : selectedValue

    await ctx.editMessageText(
      `✅ تم تحديث ${fieldLabel} بنجاح!\n\n`
      + `📝 القيمة الجديدة: ${displayValue}`,
      { reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating field:', error)

    let errorMessage = '❌ حدث خطأ أثناء تحديث الحقل.'

    if (error instanceof Error) {
      console.error('Error details:', error.message)

      if (error.message.includes('Unique constraint failed')) {
        errorMessage = '❌ البيانات المدخلة مكررة.'
      }
      else if (error.message.includes('Record to update not found')) {
        errorMessage = '❌ العامل غير موجود في النظام.'
      }
    }

    await ctx.editMessageText(
      errorMessage,
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )
  }
})

// معالج الاختيار المتسلسل لأرقام التحويل
employeeEditHandler.callbackQuery(/^hr:employee:edit:sequential:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const transferType = ctx.match[2]

  if (!ctx.session?.sequentialEdit) {
    await ctx.editMessageText(
      '❌ انتهت صلاحية التعديل المتسلسل.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )
    return
  }

  const { transferField, transferTypeField, newValue } = ctx.session.sequentialEdit

  try {
    const prisma = Database.prisma

    // تحديث الرقم ونوع التحويل في قاعدة البيانات
    const updateData: any = {}
    updateData[transferField] = newValue
    updateData[transferTypeField] = transferType

    console.log(`🔄 تحديث ${transferField} و ${transferTypeField} للعامل ${employeeId}:`, updateData)

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    console.log(`✅ تم تحديث ${transferField} و ${transferTypeField} بنجاح`)

    // مسح حالة التعديل المتسلسل
    delete ctx.session.sequentialEdit

    // إرسال رسالة نجاح
    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    const transferTypeLabel = transferType === 'INSTAPAY' ? 'إنستاباي' : 'كاش'
    const fieldLabel = transferField === 'transferNumber1' ? 'رقم التحويل الأول' : 'رقم التحويل الثاني'

    await ctx.editMessageText(
      `✅ تم تحديث ${fieldLabel} ونوعه بنجاح!\n\n`
      + `📱 الرقم الجديد: ${newValue}\n`
      + `💳 نوع التحويل: ${transferTypeLabel}`,
      { reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating sequential field:', error)

    let errorMessage = '❌ حدث خطأ أثناء تحديث البيانات.'

    if (error instanceof Error) {
      console.error('Error details:', error.message)

      if (error.message.includes('Unique constraint failed')) {
        errorMessage = '❌ البيانات المدخلة مكررة.'
      }
      else if (error.message.includes('Record to update not found')) {
        errorMessage = '❌ العامل غير موجود في النظام.'
      }
    }

    await ctx.editMessageText(
      errorMessage,
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )

    // مسح حالة التعديل المتسلسل في حالة الخطأ
    delete ctx.session.sequentialEdit
  }
})

// معالج اختيار التاريخ لتغيير حالة التوظيف
employeeEditHandler.callbackQuery(/^hr:employee:status:date:(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const dateType = ctx.match[2]

  if (!ctx.session?.statusChangeEdit) {
    await ctx.editMessageText(
      '❌ انتهت صلاحية تغيير الحالة.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )
    return
  }

  const { newStatus, dateField } = ctx.session.statusChangeEdit

  try {
    const prisma = Database.prisma

    if (dateType === 'today') {
      // استخدام تاريخ اليوم
      const today = new Date()

      // تحديث الحالة والتاريخ
      const updateData: any = {
        employmentStatus: newStatus,
        [dateField]: today,
      }

      // إضافة isActive = false للحالات غير النشطة
      const inactiveStatuses: EmploymentStatus[] = [EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED, EmploymentStatus.RETIRED]
      if (inactiveStatuses.includes(newStatus as EmploymentStatus)) {
        updateData.isActive = false
      }

      await prisma.employee.update({
        where: { id: employeeId },
        data: updateData,
      })

      // مسح حالة التعديل
      delete ctx.session.statusChangeEdit

      const statusLabels: { [key in EmploymentStatus]?: string } = {
        [EmploymentStatus.RESIGNED]: 'استقال',
        [EmploymentStatus.TERMINATED]: 'فصل',
        [EmploymentStatus.RETIRED]: 'تقاعد',
      }

      const keyboard = new InlineKeyboard()
        .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
        .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

      await ctx.editMessageText(
        `✅ تم تغيير الحالة الوظيفية بنجاح!\n\n`
        + `📊 الحالة الجديدة: ${statusLabels[newStatus as EmploymentStatus]}\n`
        + `📅 التاريخ: ${today.toLocaleDateString('ar-EG')}`,
        { reply_markup: keyboard },
      )
    }
    else if (dateType === 'custom') {
      // طلب إدخال تاريخ مخصص
      ctx.session.statusChangeEdit.step = 'date'
      ctx.session.statusChangeEdit.dateType = 'custom'

      const keyboard = new InlineKeyboard()
        .text('⬅️ رجوع', `hr:employee:edit:${employeeId}`)

      const statusLabels: { [key: string]: string } = {
        RESIGNED: 'استقال',
        TERMINATED: 'فصل',
        RETIRED: 'تقاعد',
      }

      await ctx.editMessageText(
        `📅 إدخال تاريخ ${statusLabels[newStatus]}\n\n`
        + `💡 أرسل التاريخ بصيغة DD/MM/YYYY أو DD-MM-YYYY\n`
        + `مثال: 15/12/2024 أو 15-12-2024\n\n`
        + `📅 أو اختر من التقويم:`,
        { reply_markup: createDatePickerKeyboard(employeeId) },
      )
    }
  }
  catch (error) {
    console.error('Error updating employment status:', error)

    await ctx.editMessageText(
      '❌ حدث خطأ أثناء تحديث الحالة.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )

    delete ctx.session.statusChangeEdit
  }
})

// معالج اختيار التاريخ من التقويم
employeeEditHandler.callbackQuery(/^hr:employee:status:date:(\d+):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const dateStr = ctx.match[2]

  if (!ctx.session?.statusChangeEdit) {
    await ctx.editMessageText(
      '❌ انتهت صلاحية تغيير الحالة.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )
    return
  }

  const { newStatus, dateField } = ctx.session.statusChangeEdit

  try {
    // تحليل التاريخ من الصيغة YYYY-MM-DD باستخدام التقويم الجديد
    const parsedDate = Calendar.parseDate(dateStr)

    if (!parsedDate) {
      throw new Error('تاريخ غير صحيح')
    }

    const prisma = Database.prisma

    // تحديث الحالة والتاريخ
    const updateData: any = {
      employmentStatus: newStatus,
      [dateField]: parsedDate,
    }

    // إضافة isActive = false للحالات غير النشطة
    if (['RESIGNED', 'TERMINATED', 'RETIRED'].includes(newStatus)) {
      updateData.isActive = false
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    // مسح حالة التعديل
    delete ctx.session.statusChangeEdit

    const statusLabels: { [key: string]: string } = {
      RESIGNED: 'استقال',
      TERMINATED: 'فصل',
      RETIRED: 'تقاعد',
    }

    const keyboard = new InlineKeyboard()
      .text('✏️ تعديل حقل آخر', `hr:employee:edit:${employeeId}`)
      .text('📄 عرض التفاصيل', `hr:employee:details:${employeeId}`)

    await ctx.editMessageText(
      `✅ تم تغيير الحالة الوظيفية بنجاح!\n\n`
      + `📊 الحالة الجديدة: ${statusLabels[newStatus]}\n`
      + `📅 التاريخ: ${parsedDate.toLocaleDateString('ar-EG')}`,
      { reply_markup: keyboard },
    )
  }
  catch (error) {
    console.error('Error updating employment status:', error)

    await ctx.editMessageText(
      '❌ حدث خطأ أثناء تحديث الحالة.',
      { reply_markup: new InlineKeyboard().text('⬅️ رجوع', `hr:employee:edit:${employeeId}`) },
    )

    delete ctx.session.statusChangeEdit
  }
})
