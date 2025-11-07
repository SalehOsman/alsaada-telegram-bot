/**
 * Handler تسجيل مأمورية جديدة
 */

import type { Context } from '../../../context.js'
import { Database } from '#root/modules/database/index.js'
import { LeaveScheduleService } from '#root/modules/services/leave-schedule.service.js'
import { Calendar } from '#root/modules/ui/calendar.js'
import { EmployeeSelector } from '#root/modules/ui/employee-selector.js'
import { Composer, InlineKeyboard } from 'grammy'

export const missionsAddHandler = new Composer<Context>()

// لا نحتاج Map بعد الآن - نستخدم ctx.session
// const formData = new Map<number, MissionFormData>()

// بدء تسجيل مأمورية جديدة
missionsAddHandler.callbackQuery('missions:add', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  // عرض أنواع المأموريات أولاً
  const keyboard = new InlineKeyboard()
    .text('🎯 مأمورية أداء مهمة', 'missions:add:type:TASK_EXECUTION')
    .row()
    .text('🏠 العمل من الخارج', 'missions:add:type:EXTERNAL_WORK')
    .row()
    .text('⬅️ رجوع', 'missions:main')

  await ctx.editMessageText(
    '📝 **تسجيل مأمورية جديدة**\n\n'
    + 'اختر نوع المأمورية:\n\n'
    + '🎯 **مأمورية أداء مهمة:** مهمة محددة خارج موقع العمل\n'
    + '🏠 **العمل من الخارج:** العمل عن بُعد أو من موقع آخر',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )

  // حفظ الحالة في session
  ctx.session.missionForm = { step: 'selectType' }
})

// اختيار نوع المأمورية
missionsAddHandler.callbackQuery(/^missions:add:type:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const missionType = ctx.match[1]

  try {
    const prisma = Database.prisma

    // جلب العاملين النشطين
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        employmentStatus: 'ACTIVE',
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    if (employees.length === 0) {
      await ctx.editMessageText(
        '❌ لا يوجد عاملين نشطين في النظام.',
        {
          reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
        },
      )
      return
    }

    // إنشاء قائمة العاملين
    const { keyboard, message } = EmployeeSelector.createWithSearch({
      employees,
      page: 0,
      pageSize: 10,
      callbackPrefix: `missions:add:employee:${missionType}`,
      pageCallback: `missions:add:page:${missionType}`,
      searchCallback: `missions:add:search:${missionType}`,
    })

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'missions:add')

    const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

    await ctx.editMessageText(
      `📝 **تسجيل مأمورية جديدة**\n\n`
      + `📋 **النوع:** ${missionTypeLabel}\n\n`
      + `${message}\n\nاختر العامل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )

    // حفظ الحالة في session
    ctx.session.missionForm = {
      step: 'selectEmployee',
      missionType,
    }
  }
  catch (error) {
    console.error('Error loading employees:', error)
    await ctx.editMessageText(
      '❌ حدث خطأ في تحميل قائمة العاملين.',
      {
        reply_markup: new InlineKeyboard().text('⬅️ رجوع', 'missions:main'),
      },
    )
  }
})

// التنقل بين صفحات قائمة العاملين
missionsAddHandler.callbackQuery(/^missions:add:page:(\w+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionType = ctx.match[1]
  const page = Number.parseInt(ctx.match[2])

  try {
    const prisma = Database.prisma

    // جلب العاملين النشطين
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        employmentStatus: 'ACTIVE',
      },
      include: {
        position: true,
        department: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    // إنشاء قائمة العاملين بالصفحة المطلوبة
    const { keyboard, message } = EmployeeSelector.createWithSearch({
      employees,
      page,
      pageSize: 10,
      callbackPrefix: `missions:add:employee:${missionType}`,
      pageCallback: `missions:add:page:${missionType}`,
      searchCallback: `missions:add:search:${missionType}`,
    })

    keyboard.row()
    keyboard.text('⬅️ رجوع', 'missions:add')

    const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

    await ctx.editMessageText(
      `📝 **تسجيل مأمورية جديدة**\n\n`
      + `📋 **النوع:** ${missionTypeLabel}\n\n`
      + `${message}\n\nاختر العامل:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error loading employees page:', error)
    await ctx.answerCallbackQuery('❌ حدث خطأ في تحميل الصفحة')
  }
})

// البحث عن عامل بالاسم
missionsAddHandler.callbackQuery(/^missions:add:search:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionType = ctx.match[1]

  // طلب إدخال اسم العامل للبحث
  const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

  await ctx.editMessageText(
    `📝 **تسجيل مأمورية جديدة**\n\n`
    + `📋 **النوع:** ${missionTypeLabel}\n\n`
    + `🔍 **البحث عن عامل**\n\n`
    + `أدخل اسم العامل أو جزء منه للبحث:`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('⬅️ رجوع', `missions:add:type:${missionType}`),
    },
  )

  // حفظ حالة البحث
  ctx.session.missionForm = {
    step: 'searchEmployee',
    missionType,
  }
})

// اختيار العامل
missionsAddHandler.callbackQuery(/^missions:add:employee:(\w+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const missionType = ctx.match[1]
  const employeeId = Number.parseInt(ctx.match[2])

  try {
    const prisma = Database.prisma

    // جلب معلومات العامل
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
      },
    })

    if (!employee) {
      await ctx.editMessageText('❌ العامل غير موجود.')
      return
    }

    // التحقق من أن العامل ليس في إجازة أو مأمورية
    if (employee.isOnLeave) {
      await ctx.editMessageText(
        '❌ **لا يمكن تسجيل مأمورية**\n\nالعامل في إجازة حالياً.\nيجب تسجيل عودته من الإجازة أولاً.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('↩️ تسجيل عودة', 'leaves:return')
            .row()
            .text('⬅️ رجوع', `missions:add:type:${missionType}`),
        },
      )
      return
    }

    if (employee.employmentStatus === 'ON_MISSION') {
      await ctx.editMessageText(
        '❌ **لا يمكن تسجيل مأمورية**\n\nالعامل في مأمورية حالياً.\nيجب تسجيل عودته من المأمورية أولاً.',
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('↩️ تسجيل عودة', 'missions:return')
            .row()
            .text('⬅️ رجوع', `missions:add:type:${missionType}`),
        },
      )
      return
    }

    // عرض معلومات العامل
    const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

    let message = `📝 **تسجيل مأمورية جديدة**\n\n`
    message += `📋 **النوع:** ${missionTypeLabel}\n\n`
    message += `👤 **العامل:** ${employee.fullName}\n`
    message += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    message += `📋 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    // طلب تاريخ البداية
    const keyboard = Calendar.create({
      callbackPrefix: `missions:add:startDate:${missionType}:${employeeId}`,
    })
    keyboard.row()
    keyboard.text('⬅️ رجوع', `missions:add:type:${missionType}`)

    message += `اختر تاريخ بداية المأمورية:`

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // حفظ الحالة في session
    ctx.session.missionForm = {
      step: 'selectStartDate',
      employeeId,
      missionType,
    }
  }
  catch (error) {
    console.error('Error loading employee:', error)
    await ctx.editMessageText('❌ حدث خطأ في تحميل بيانات العامل.')
  }
})

// اختيار تاريخ البداية
missionsAddHandler.callbackQuery(/^missions:add:startDate:(\w+):(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionType = ctx.match[1]
  const employeeId = Number.parseInt(ctx.match[2])
  const dateStr = ctx.match[3]

  const data = ctx.session.missionForm
  if (!data)
    return

  const startDate = Calendar.parseDate(dateStr)
  if (!startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  data.startDate = dateStr
  data.step = 'selectEndDate'
  ctx.session.missionForm = data

  const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

  // لو العمل من الخارج، نعطي خيار مفتوح
  if (missionType === 'EXTERNAL_WORK') {
    const keyboard = new InlineKeyboard()
      .text('⏳ مأمورية مفتوحة (بدون تاريخ نهاية)', `missions:add:openEnded:${employeeId}`)
      .row()
      .text('📅 تحديد تاريخ نهاية', `missions:add:customEndDate:${missionType}:${employeeId}`)
      .row()
      .text('⬅️ رجوع', `missions:add:employee:${missionType}:${employeeId}`)

    await ctx.editMessageText(
      `📝 **تسجيل مأمورية جديدة**\n\n`
      + `📋 **النوع:** ${missionTypeLabel}\n`
      + `📅 **تاريخ البداية:** ${Calendar.formatArabic(startDate)}\n\n`
      + `هل تريد تحديد تاريخ نهاية أم مأمورية مفتوحة؟`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  else {
    // مأمورية أداء مهمة تحتاج تاريخ نهاية
    const keyboard = Calendar.create({
      callbackPrefix: `missions:add:endDate:${missionType}:${employeeId}`,
    })
    keyboard.row()
    keyboard.text('⬅️ رجوع', `missions:add:employee:${missionType}:${employeeId}`)

    await ctx.editMessageText(
      `📝 **تسجيل مأمورية جديدة**\n\n`
      + `📋 **النوع:** ${missionTypeLabel}\n`
      + `📅 **تاريخ البداية:** ${Calendar.formatArabic(startDate)}\n\n`
      + `اختر تاريخ نهاية المأمورية:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
})

// مأمورية مفتوحة (بدون تاريخ نهاية)
missionsAddHandler.callbackQuery(/^missions:add:openEnded:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const data = ctx.session.missionForm
  if (!data || !data.startDate)
    return

  // نستخدم تاريخ بعيد جداً كـ "مفتوح"
  const farFutureDate = new Date('2099-12-31')
  data.endDate = formatDateForCallback(farFutureDate)
  data.step = 'enterLocation'

  // Initialize message tracking if not exists
  if (!data.messageIdsToDelete) {
    data.messageIdsToDelete = []
  }

  ctx.session.missionForm = data

  const startDate = Calendar.parseDate(data.startDate)
  if (!startDate)
    return

  const missionTypeLabel = data.missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

  const keyboard = new InlineKeyboard()
    .text('⬅️ رجوع', `missions:add:startDate:${data.missionType}:${employeeId}`)

  const editedMsg = await ctx.editMessageText(
    '📝 **تسجيل مأمورية جديدة**\n\n'
    + `📋 **النوع:** ${missionTypeLabel}\n`
    + `📅 **تاريخ البداية:** ${Calendar.formatArabic(startDate)}\n`
    + `⏳ **المدة:** مفتوحة\n\n`
    + '━━━━━━━━━━━━━━━━━━━━\n\n'
    + '📍 **أدخل موقع العمل:**\n'
    + '(مثال: المنزل، مكتب فرع القاهرة، إلخ)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )

  // Store this message ID for later deletion
  if (typeof editedMsg === 'object' && 'message_id' in editedMsg) {
    data.messageIdsToDelete.push(editedMsg.message_id)
    ctx.session.missionForm = data
  }
})

// اختيار تاريخ نهاية مخصص
missionsAddHandler.callbackQuery(/^missions:add:customEndDate:(\w+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const missionType = ctx.match[1]
  const employeeId = Number.parseInt(ctx.match[2])

  const keyboard = Calendar.create({
    callbackPrefix: `missions:add:endDate:${missionType}:${employeeId}`,
  })
  keyboard.row()
  keyboard.text('⬅️ رجوع', `missions:add:startDate:${missionType}:${employeeId}`)

  await ctx.editMessageText(
    `📝 **تسجيل مأمورية جديدة**\n\n`
    + `اختر تاريخ نهاية المأمورية:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تأكيد تاريخ النهاية
missionsAddHandler.callbackQuery(/^missions:add:endDate:(\w+):(\d+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const missionType = ctx.match[1]
  const employeeId = Number.parseInt(ctx.match[2])
  const dateStr = ctx.match[3]

  const data = ctx.session.missionForm
  if (!data || !data.startDate)
    return

  const endDate = Calendar.parseDate(dateStr)
  const startDate = Calendar.parseDate(data.startDate)

  if (!endDate || !startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ غير صحيح')
    return
  }

  // التحقق من أن تاريخ النهاية بعد البداية
  if (endDate < startDate) {
    await ctx.answerCallbackQuery('❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
    return
  }

  data.endDate = dateStr
  data.step = 'enterLocation'

  // Initialize message tracking if not exists
  if (!data.messageIdsToDelete) {
    data.messageIdsToDelete = []
  }

  ctx.session.missionForm = data

  const totalDays = LeaveScheduleService.calculateTotalDays(startDate, endDate)
  const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

  const keyboard = new InlineKeyboard()
    .text('⬅️ رجوع', `missions:add:startDate:${missionType}:${employeeId}`)

  const editedMsg = await ctx.editMessageText(
    `📝 **تسجيل مأمورية جديدة**\n\n`
    + `📋 **النوع:** ${missionTypeLabel}\n`
    + `📅 **من:** ${Calendar.formatArabic(startDate)}\n`
    + `📅 **إلى:** ${Calendar.formatArabic(endDate)}\n`
    + `⏱️ **المدة:** ${totalDays} أيام\n\n`
    + '━━━━━━━━━━━━━━━━━━━━\n\n'
    + '📍 **أدخل موقع العمل/المأمورية:**\n'
    + '(مثال: مكتب القاهرة، موقع البناء، إلخ)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )

  // Store this message ID for later deletion
  if (typeof editedMsg === 'object' && 'message_id' in editedMsg) {
    data.messageIdsToDelete.push(editedMsg.message_id)
    ctx.session.missionForm = data
  }
})

// استقبال موقع العمل والغرض والعهدة والملاحظات - handler واحد مجمّع
missionsAddHandler.on('message:text', async (ctx, next) => {
  const data = ctx.session.missionForm

  console.log('📍 Mission form handler triggered')
  console.log('Session data:', JSON.stringify(data, null, 2))
  console.log('Message text:', ctx.message.text)

  if (!data) {
    console.log('❌ No form data found, passing to next handler')
    return next()
  }

  // استقبال نص البحث عن عامل
  if (data.step === 'searchEmployee') {
    const searchTerm = ctx.message.text.trim()
    const missionType = data.missionType

    try {
      const prisma = Database.prisma

      // جلب العاملين النشطين
      const allEmployees = await prisma.employee.findMany({
        where: {
          isActive: true,
          employmentStatus: 'ACTIVE',
        },
        include: {
          position: true,
          department: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      })

      // تصفية العاملين حسب نص البحث
      const filteredEmployees = EmployeeSelector.filterByName(allEmployees, searchTerm)

      if (filteredEmployees.length === 0) {
        await ctx.reply(
          `❌ **لم يتم العثور على عاملين**\n\n`
          + `لا يوجد عاملين يطابقون البحث: "${searchTerm}"\n\n`
          + `جرب البحث بكلمات أخرى.`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard()
              .text('🔍 بحث مرة أخرى', `missions:add:search:${missionType}`)
              .row()
              .text('⬅️ رجوع', `missions:add:type:${missionType}`),
          },
        )
        return
      }

      // عرض النتائج
      const { keyboard, message } = EmployeeSelector.createWithSearch({
        employees: filteredEmployees,
        page: 0,
        pageSize: 10,
        callbackPrefix: `missions:add:employee:${missionType}`,
        pageCallback: `missions:add:page:${missionType}`,
        searchCallback: `missions:add:search:${missionType}`,
      })

      keyboard.row()
      keyboard.text('⬅️ رجوع', `missions:add:type:${missionType}`)

      const missionTypeLabel = missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

      await ctx.reply(
        `📝 **تسجيل مأمورية جديدة**\n\n`
        + `📋 **النوع:** ${missionTypeLabel}\n\n`
        + `🔍 **نتائج البحث عن:** "${searchTerm}"\n\n`
        + `${message}\n\nاختر العامل:`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )

      // تحديث الحالة
      ctx.session.missionForm = {
        step: 'selectEmployee',
        missionType,
      }
    }
    catch (error) {
      console.error('Error searching employees:', error)
      await ctx.reply('❌ حدث خطأ في البحث.')
    }
    return
  }

  // استقبال الموقع
  if (data.step === 'enterLocation') {
    console.log('✅ Processing location input')
    data.location = ctx.message.text.trim()
    data.step = 'enterPurpose'

    // Initialize message tracking if not exists
    if (!data.messageIdsToDelete) {
      data.messageIdsToDelete = []
    }
    // Store user's message ID for deletion
    data.messageIdsToDelete.push(ctx.message.message_id)

    ctx.session.missionForm = data

    console.log('📤 Sending purpose request')

    const sentMsg = await ctx.reply(
      '✅ **تم حفظ الموقع بنجاح**\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + '🎯 **أدخل الغرض من المأمورية:**\n'
      + '(مثال: متابعة مشروع، اجتماع عمل، إلخ)',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⏭️ تخطي', `missions:add:skipPurpose:${data.employeeId}`),
      },
    )

    // Store bot's message ID for deletion
    data.messageIdsToDelete.push(sentMsg.message_id)
    ctx.session.missionForm = data
    return
  }

  // استقبال الغرض
  if (data.step === 'enterPurpose') {
    data.purpose = ctx.message.text.trim()
    data.step = 'enterAllowance'

    // Store user's message ID
    if (!data.messageIdsToDelete) {
      data.messageIdsToDelete = []
    }
    data.messageIdsToDelete.push(ctx.message.message_id)

    ctx.session.missionForm = data

    const sentMsg = await ctx.reply(
      '✅ **تم حفظ الغرض بنجاح**\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + '💰 **أدخل مبلغ العهدة المالية:**\n'
      + '(أدخل رقم المبلغ أو اختر من الأزرار)',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('0️⃣ بدون عهدة', `missions:add:allowance:${data.employeeId}:0`)
          .row()
          .text('⏭️ تخطي', `missions:add:skipAllowance:${data.employeeId}`),
      },
    )

    // Store bot's message ID
    data.messageIdsToDelete.push(sentMsg.message_id)
    ctx.session.missionForm = data
    return
  }

  // استقبال مبلغ العهدة
  if (data.step === 'enterAllowance') {
    const amount = Number.parseFloat(ctx.message.text.trim())

    if (Number.isNaN(amount) || amount < 0) {
      await ctx.reply('❌ الرجاء إدخال مبلغ صحيح (رقم موجب).')
      return
    }

    data.allowanceAmount = amount
    data.step = 'addNotes'

    // Store user's message ID
    if (!data.messageIdsToDelete) {
      data.messageIdsToDelete = []
    }
    data.messageIdsToDelete.push(ctx.message.message_id)

    ctx.session.missionForm = data

    const sentMsg = await ctx.reply(
      '✅ **تم حفظ مبلغ العهدة بنجاح**\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + '💬 **أدخل ملاحظات إضافية:**\n'
      + '(اختياري - أو اضغط تخطي)',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('⏭️ تخطي', `missions:add:confirm:${data.employeeId}`),
      },
    )

    // Store bot's message ID
    data.messageIdsToDelete.push(sentMsg.message_id)
    ctx.session.missionForm = data
    return
  }

  // استقبال الملاحظات
  if (data.step === 'addNotes') {
    data.notes = ctx.message.text.trim()

    // Store user's message ID
    if (!data.messageIdsToDelete) {
      data.messageIdsToDelete = []
    }
    data.messageIdsToDelete.push(ctx.message.message_id)

    ctx.session.missionForm = data

    // Show confirmation and auto-proceed to save
    const confirmMsg = await ctx.reply('✅ **تم حفظ الملاحظات بنجاح**\n\n⏳ جارِ حفظ المأمورية...', {
      parse_mode: 'Markdown',
    })

    // Store bot's message ID for later deletion
    data.messageIdsToDelete.push(confirmMsg.message_id)
    ctx.session.missionForm = data

    // Auto-save immediately
    await saveMission(ctx, data.employeeId!)
    return
  }

  return next()
})

// تخطي الغرض
missionsAddHandler.callbackQuery(/^missions:add:skipPurpose:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const data = ctx.session.missionForm
  if (!data)
    return

  data.purpose = 'غير محدد'
  data.step = 'enterAllowance'
  ctx.session.missionForm = data

  const keyboard = new InlineKeyboard()
    .text('0️⃣ بدون عهدة', `missions:add:allowance:${employeeId}:0`)
    .row()
    .text('⏭️ تخطي', `missions:add:skipAllowance:${employeeId}`)

  await ctx.editMessageText(
    '📝 **تسجيل مأمورية جديدة**\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n\n'
    + '💰 **أدخل مبلغ العهدة المالية:**\n'
    + '(أدخل رقم المبلغ أو اختر من الأزرار)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// تخطي العهدة
missionsAddHandler.callbackQuery(/^missions:add:skipAllowance:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const data = ctx.session.missionForm
  if (!data)
    return

  data.allowanceAmount = 0
  data.step = 'addNotes'
  ctx.session.missionForm = data

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `missions:add:confirm:${employeeId}`)

  await ctx.editMessageText(
    '📝 **تسجيل مأمورية جديدة**\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n\n'
    + '💬 **أدخل ملاحظات إضافية:**\n'
    + '(اختياري - أو اضغط تخطي)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// اختيار عهدة بقيمة محددة
missionsAddHandler.callbackQuery(/^missions:add:allowance:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const employeeId = Number.parseInt(ctx.match[1])
  const amount = Number.parseInt(ctx.match[2])

  const data = ctx.session.missionForm
  if (!data)
    return

  data.allowanceAmount = amount
  data.step = 'addNotes'
  ctx.session.missionForm = data

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', `missions:add:skipNotes:${employeeId}`)

  await ctx.editMessageText(
    '📝 **تسجيل مأمورية جديدة**\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n\n'
    + '💬 **أدخل ملاحظات إضافية:**\n'
    + '(اختياري - أو اضغط تخطي)',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// Skip notes and auto-save
missionsAddHandler.callbackQuery(/^missions:add:skipNotes:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('جارِ حفظ المأمورية...')

  const employeeId = Number.parseInt(ctx.match[1])
  const data = ctx.session.missionForm
  if (!data)
    return

  data.notes = undefined
  ctx.session.missionForm = data

  // Auto-save immediately
  await saveMission(ctx, employeeId)
})

// دالة مساعدة لتوليد رقم المأمورية
async function generateMissionNumber(): Promise<string> {
  const prisma = Database.prisma

  const currentYear = new Date().getFullYear()
  const prefix = `M${currentYear}`

  const lastMission = await prisma.hR_EmployeeMission.findFirst({
    where: {
      missionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      missionNumber: 'desc',
    },
  })

  if (lastMission) {
    const lastNumber = Number.parseInt(lastMission.missionNumber.slice(prefix.length))
    const nextNumber = lastNumber + 1
    return `${prefix}${String(nextNumber).padStart(4, '0')}`
  }

  return `${prefix}0001`
}

// Save mission function (reusable)
async function saveMission(ctx: Context, employeeId: number) {
  const userId = ctx.from?.id
  if (!userId)
    return

  const data = ctx.session.missionForm

  if (!data || !data.startDate || !data.endDate || !data.missionType || !data.location || !data.purpose) {
    await ctx.reply('❌ بيانات غير مكتملة.')
    return
  }

  try {
    const prisma = Database.prisma

    const startDate = Calendar.parseDate(data.startDate)
    const endDate = Calendar.parseDate(data.endDate)
    if (!startDate || !endDate)
      return

    const totalDays = LeaveScheduleService.calculateTotalDays(startDate, endDate)
    const missionNumber = await generateMissionNumber()

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: true,
        department: true,
      },
    })

    if (!employee)
      return

    // Save mission
    await prisma.hR_EmployeeMission.create({
      data: {
        employeeId,
        missionNumber,
        missionType: data.missionType as any,
        startDate,
        endDate,
        totalDays,
        location: data.location,
        purpose: data.purpose,
        allowanceAmount: data.allowanceAmount || 0,
        notes: data.notes || null,
        status: 'PENDING',
        isActive: true,
      },
    })

    // Update employee status
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: 'ON_MISSION',
      },
    })

    const admin = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
    })

    // Clear session data
    delete ctx.session.missionForm

    // Format dates
    const isOpenEnded = endDate.getFullYear() === 2099
    const startDateFormatted = formatDateWithDay(startDate)
    const endDateFormatted = isOpenEnded ? 'Open-ended' : formatDateWithDay(endDate)
    const registrationDate = formatDateWithDay(new Date())

    const missionTypeLabel = data.missionType === 'TASK_EXECUTION' ? '🎯 مأمورية أداء مهمة' : '🏠 العمل من الخارج'

    // Create full report
    let report = `✅ **تم تسجيل المأمورية بنجاح!**\n\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **تقرير المأمورية**\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`

    report += `👤 **العامل:** ${employee.fullName}`
    if (employee.nickname) {
      report += ` (${employee.nickname})`
    }
    report += `\n`
    report += `🔢 **كود العامل:** ${employee.employeeCode}\n`
    report += `💼 **الوظيفة:** ${employee.position?.titleAr || 'غير محدد'}\n`
    report += `🏢 **القسم:** ${employee.department?.name || 'غير محدد'}\n\n`

    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `📋 **رقم المأمورية:** ${missionNumber}\n`
    report += `📂 **نوع المأمورية:** ${missionTypeLabel}\n`
    report += `📅 **من:** ${startDateFormatted}\n`

    if (isOpenEnded) {
      report += `⏳ **المدة:** مفتوحة (بدون تاريخ نهاية محدد)\n`
    }
    else {
      report += `📅 **إلى:** ${endDateFormatted}\n`
      report += `⏱️ **المدة:** ${totalDays} أيام\n`
    }

    report += `📍 **الموقع:** ${data.location}\n`
    report += `🎯 **الغرض:** ${data.purpose}\n`

    if (data.allowanceAmount && data.allowanceAmount > 0) {
      report += `💰 **العهدة:** ${data.allowanceAmount} جنيه\n`
    }

    if (data.notes) {
      report += `\n💬 **ملاحظات:**\n${data.notes}\n`
    }

    report += `\n━━━━━━━━━━━━━━━━━━━━\n`
    report += `👨‍💼 **مسجل بواسطة:** ${admin?.fullName || 'غير معروف'}\n`
    report += `📅 **تاريخ التسجيل:** ${registrationDate}\n`
    report += `━━━━━━━━━━━━━━━━━━━━`

    const keyboard = new InlineKeyboard()
      .text('📝 تسجيل مأمورية أخرى', 'missions:add')
      .row()
      .text('📋 قائمة المأموريات', 'missions:list')
      .row()
      .text('🏠 القائمة الرئيسية', 'missions:main')

    // Delete all previous messages in the flow
    if (data.messageIdsToDelete && data.messageIdsToDelete.length > 0) {
      for (const msgId of data.messageIdsToDelete) {
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, msgId)
        }
        catch (error) {
          console.error('Error deleting message:', error)
        }
      }
    }

    // Send to current user
    await ctx.reply(report, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    // Send to HR group
    try {
      const hrGroupSetting = await prisma.setting.findFirst({
        where: {
          key: 'hr_group_chat_id',
          scope: 'GLOBAL',
        },
      })

      if (hrGroupSetting && hrGroupSetting.value) {
        await ctx.api.sendMessage(hrGroupSetting.value, report, {
          parse_mode: 'Markdown',
        })
      }
    }
    catch (error) {
      console.error('Error sending report to HR group:', error)
    }
  }
  catch (error) {
    console.error('Error saving mission:', error)
    await ctx.reply('❌ حدث خطأ في حفظ المأمورية.')
  }
}

// دالة مساعدة لتنسيق التاريخ للـ callback
function formatDateForCallback(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// دالة لتنسيق التاريخ مع اليوم
function formatDateWithDay(date: Date): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayName = days[date.getDay()]
  const formatted = Calendar.formatArabic(date)
  return `${dayName} ${formatted}`
}
