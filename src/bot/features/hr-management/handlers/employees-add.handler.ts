import type { Context } from 'grammy'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { isPositiveNumber, isValidName, validateEgyptPhoneWithInfo, validateNationalIDWithInfo } from '../../../../modules/input/validators/index.js'
import { Calendar } from '../../../../modules/ui/calendar.js'
import { AttachmentsManager } from '../../../../modules/utils/attachments-manager.js'
import { EmployeeCodeManager } from '../../../../modules/utils/employee-code-manager.js'
import { generateNickname, isValidNickname } from '../../../../modules/utils/nickname-generator.js'
import { getCurrentDate, getCurrentDateTimeFormatted } from '../../../../modules/utils/timezone-manager.js'

export const addEmployeeHandler = new Composer<Context>()

// ============================================
// 📝 تتبع الرسائل المؤقتة
// ============================================
function addTemporaryMessage(data: EmployeeFormData, messageId: number) {
  if (!data.temporaryMessageIds) {
    data.temporaryMessageIds = []
  }
  data.temporaryMessageIds.push(messageId)
}

// ============================================
// 🗑️ حذف الرسائل المؤقتة من الشات
// ============================================
async function deleteTemporaryMessages(ctx: any, messageIds: number[]) {
  try {
    for (const messageId of messageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, messageId)
      }
      catch (error) {
        // تجاهل الأخطاء في حذف الرسائل
        console.log(`Could not delete message ${messageId}:`, error)
      }
    }
  }
  catch (error) {
    console.error('Error deleting temporary messages:', error)
  }
}

// ============================================
// 📊 تخزين مؤقت لبيانات النموذج
// ============================================
interface EmployeeFormData {
  step: string
  fullName?: string
  nickname?: string
  positionId?: number
  departmentId?: number
  nationalId?: string
  birthDate?: string
  gender?: string
  governorateId?: number
  phone?: string
  phoneOperator?: string
  startDate?: string
  idCardFront?: string
  idCardBack?: string
  temporaryMessageIds?: number[] // تتبع الرسائل المؤقتة
}

const formData = new Map<number, EmployeeFormData>()

// ============================================
// 🎯 بدء تدفق إضافة موظف
// ============================================
addEmployeeHandler.callbackQuery(/^hr:employees:add$/, async (ctx) => {
  try {
    await ctx.answerCallbackQuery()

    const userId = ctx.from?.id
    if (!userId)
      return

    formData.set(userId, { step: 'fullName' })

    const keyboard = new InlineKeyboard()
      .text('❌ إلغاء', 'employeesListHandler')

    await ctx.editMessageText(
      '📝 **إضافة موظف جديد**\n\n'
      + '**الخطوة 1/7:** الاسم الكامل\n\n'
      + 'يرجى إدخال الاسم الكامل للموظف:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error in add employee start:', error)
    await ctx.reply('❌ حدث خطأ. الرجاء المحاولة مرة أخرى.')
  }
})

// ============================================
// 📝 معالج الرسائل النصية
// ============================================
addEmployeeHandler.on('message:text', async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId)
    return next()

  const data = formData.get(userId)
  if (!data)
    return next()

  const text = ctx.message.text.trim()

  try {
    switch (data.step) {
      // ============================================
      // 1️⃣ الاسم الكامل
      // ============================================
      case 'fullName': {
        if (!isValidName(text) || text.length < 2) {
          await ctx.reply('❌ الاسم غير صالح. يرجى إدخال اسم صحيح.')
          return
        }

        data.fullName = text
        data.step = 'nickname'
        formData.set(userId, data)

        // تتبع الرسالة المؤقتة
        addTemporaryMessage(data, ctx.message.message_id)

        const keyboard = new InlineKeyboard()
          .text('⏭️ توليد تلقائي', 'skip:nickname')

        await ctx.reply(
          '📝 **إضافة موظف جديد**\n\n'
          + '**الخطوة 2/7:** اسم الشهرة\n\n'
          + 'يرجى إدخال اسم الشهرة أو اضغط توليد تلقائي:',
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        )
        break
      }

      // ============================================
      // 2️⃣ اسم الشهرة
      // ============================================
      case 'nickname': {
        // التحقق من صحة اسم الشهرة
        if (!isValidNickname(text)) {
          await ctx.reply('❌ اسم الشهرة غير صحيح. يرجى إدخال اسم صحيح (بدون أرقام أو رموز خاصة).')
          return
        }

        data.nickname = text.trim()
        data.step = 'position'
        formData.set(userId, data)

        // تتبع الرسالة المؤقتة
        addTemporaryMessage(data, ctx.message.message_id)

        // جلب الوظائف من قاعدة البيانات
        const prisma = Database.prisma
        const positions = await prisma.position.findMany({
          where: { isActive: true },
          include: { department: true },
          orderBy: { orderIndex: 'asc' },
        })

        if (positions.length === 0) {
          await ctx.reply('❌ لا توجد وظائف متاحة حالياً. يرجى إضافة وظائف أولاً.')
          return
        }

        // إنشاء لوحة مفاتيح للوظائف
        const keyboard = new InlineKeyboard()

        // إضافة الوظائف في مجموعات من 2
        for (let i = 0; i < positions.length; i += 2) {
          const row = []

          // الوظيفة الأولى
          row.push({
            text: `${positions[i].titleAr || positions[i].title}`,
            callback_data: `select:position:${positions[i].id}`,
          })

          // الوظيفة الثانية (إن وجدت)
          if (i + 1 < positions.length) {
            row.push({
              text: `${positions[i + 1].titleAr || positions[i + 1].title}`,
              callback_data: `select:position:${positions[i + 1].id}`,
            })
          }

          keyboard.row(...row)
        }

        // إضافة زر الإلغاء
        keyboard.row({ text: '❌ إلغاء', callback_data: 'employeesListHandler' })

        await ctx.reply(
          '📝 **إضافة موظف جديد**\n\n'
          + '**الخطوة 3/7:** اختيار الوظيفة\n\n'
          + 'يرجى اختيار الوظيفة المناسبة للموظف:',
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        )
        break
      }

      // ============================================
      // 3️⃣ اختيار الوظيفة (سيتم التعامل معها عبر callback query)
      // ============================================
      case 'position': {
        // هذا الحالة لن تحدث أبداً لأن اختيار الوظيفة يتم عبر callback query
        break
      }

      // ============================================
      // 4️⃣ الرقم القومي
      // ============================================
      case 'nationalId': {
        const validation = validateNationalIDWithInfo(text)

        if (!validation.isValid) {
          await ctx.reply('❌ الرقم القومي غير صحيح. يرجى إدخال 14 رقم صحيح.')
          return
        }

        // التحقق من عدم وجود الرقم القومي مسبقاً
        try {
          const prisma = Database.prisma
          const existingEmployee = await prisma.employee.findUnique({
            where: { nationalId: text },
          })

          if (existingEmployee) {
            await ctx.reply(`❌ الرقم القومي \`${text}\` مسجل بالفعل لموظف آخر.\n\nيرجى إدخال رقم قومي آخر:`, { parse_mode: 'Markdown' })
            return
          }
        }
        catch (error) {
          console.error('Error checking national ID:', error)
          // في حالة حدوث خطأ في التحقق، نتابع العملية
        }

        // حفظ البيانات المستخرجة
        data.nationalId = text
        data.birthDate = validation.birthDate
        data.gender = validation.gender
        data.step = 'phone'
        formData.set(userId, data)

        // تتبع الرسالة المؤقتة
        addTemporaryMessage(data, ctx.message.message_id)

        await ctx.reply(
          '📝 **إضافة موظف جديد**\n\n'
          + '**الخطوة 5/7:** رقم الموبايل\n\n'
          + 'يرجى إدخال رقم الموبايل (11 رقم):',
          { parse_mode: 'Markdown' },
        )
        break
      }

      // ============================================
      // 5️⃣ رقم الموبايل
      // ============================================
      case 'phone': {
        const phoneValidation = validateEgyptPhoneWithInfo(text)

        if (!phoneValidation.isValid) {
          await ctx.reply('❌ رقم الموبايل غير صحيح. يرجى إدخال 11 رقم صحيح.')
          return
        }

        data.phone = phoneValidation.formatted
        data.phoneOperator = phoneValidation.operator
        data.step = 'governorate'
        formData.set(userId, data)

        // تتبع الرسالة المؤقتة
        addTemporaryMessage(data, ctx.message.message_id)

        // جلب المحافظات من قاعدة البيانات
        const prisma = Database.prisma
        const governorates = await prisma.governorate.findMany({
          orderBy: { orderIndex: 'asc' },
        })

        if (governorates.length === 0) {
          await ctx.reply('❌ لا توجد محافظات متاحة حالياً.')
          return
        }

        // إنشاء لوحة مفاتيح للمحافظات
        const keyboard = new InlineKeyboard()

        // إضافة المحافظات في مجموعات من 2
        for (let i = 0; i < governorates.length; i += 2) {
          const row = []

          // المحافظة الأولى
          row.push({
            text: governorates[i].nameAr,
            callback_data: `select:governorate:${governorates[i].id}`,
          })

          // المحافظة الثانية (إن وجدت)
          if (i + 1 < governorates.length) {
            row.push({
              text: governorates[i + 1].nameAr,
              callback_data: `select:governorate:${governorates[i + 1].id}`,
            })
          }

          keyboard.row(...row)
        }

        // إضافة زر الإلغاء
        keyboard.row({ text: '❌ إلغاء', callback_data: 'employeesListHandler' })

        await ctx.reply(
          '📝 **إضافة موظف جديد**\n\n'
          + '**الخطوة 6/7:** اختيار محافظة الإقامة\n\n'
          + 'يرجى اختيار محافظة الإقامة:',
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          },
        )
        break
      }

      // ============================================
      // 6️⃣ اختيار محافظة الإقامة (سيتم التعامل معها عبر callback query)
      // ============================================
      case 'governorate': {
        // هذا الحالة لن تحدث أبداً لأن اختيار المحافظة يتم عبر callback query
        break
      }

      // ============================================
      // 7️⃣ تاريخ بدء العمل
      // ============================================
      case 'startDate': {
        // التحقق من صحة التاريخ
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(text)) {
          await ctx.reply('❌ التاريخ غير صالح. يرجى إدخال التاريخ بصيغة YYYY-MM-DD')
          return
        }

        const inputDate = new Date(text)
        const today = new Date()

        if (inputDate > today) {
          await ctx.reply('❌ لا يمكن أن يكون تاريخ بدء العمل في المستقبل.')
          return
        }

        data.startDate = text
        data.step = 'idCardFront'
        formData.set(userId, data)

        // إضافة رسالة التاريخ إلى الرسائل المؤقتة
        addTemporaryMessage(data, ctx.message.message_id)

        const keyboard = new InlineKeyboard()
          .text('⏭️ تخطي', 'skip:idCardFront')

        await ctx.reply(
          '📝 إضافة موظف جديد\n\n'
          + 'الخطوة 7/7: رفع صورة بطاقة الرقم القومي (الوجه الأمامي)\n\n'
          + 'يرجى رفع صورة واضحة لوجه بطاقة الرقم القومي أو اضغط تخطي:',
          {
            reply_markup: keyboard,
          },
        )
        break
      }

      // ============================================
      // 8️⃣ رفع صورة بطاقة الرقم القومي (الوجه الأمامي)
      // ============================================
      case 'idCardFront': {
        // هذا الحالة لن تحدث أبداً لأن رفع الصور يتم عبر معالج منفصل
        break
      }

      // ============================================
      // 8️⃣ رفع صورة بطاقة الرقم القومي (الوجه الخلفي)
      // ============================================
      case 'idCardBack': {
        // هذا الحالة لن تحدث أبداً لأن رفع الصور يتم عبر معالج منفصل
        break
      }
    }
  }
  catch (error) {
    console.error('Error processing employee data:', error)
    await ctx.reply('❌ حدث خطأ في معالجة البيانات. الرجاء المحاولة مرة أخرى.')
  }
})

// ============================================
// 🎯 معالجات Callback Query
// ============================================

// تخطي اسم الشهرة وتوليد تلقائي
addEmployeeHandler.callbackQuery('skip:nickname', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  // توليد اسم شهرة تلقائي من الاسم الكامل
  data.nickname = generateNickname(data.fullName!)
  data.step = 'position'
  formData.set(userId, data)

  // جلب الوظائف من قاعدة البيانات
  const prisma = Database.prisma
  const positions = await prisma.position.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: { orderIndex: 'asc' },
  })

  if (positions.length === 0) {
    await ctx.reply('❌ لا توجد وظائف متاحة حالياً. يرجى إضافة وظائف أولاً.')
    return
  }

  // إنشاء لوحة مفاتيح للوظائف
  const keyboard = new InlineKeyboard()

  // إضافة الوظائف في مجموعات من 2
  for (let i = 0; i < positions.length; i += 2) {
    const row = []

    // الوظيفة الأولى
    row.push({
      text: `${positions[i].titleAr || positions[i].title}`,
      callback_data: `select:position:${positions[i].id}`,
    })

    // الوظيفة الثانية (إن وجدت)
    if (i + 1 < positions.length) {
      row.push({
        text: `${positions[i + 1].titleAr || positions[i + 1].title}`,
        callback_data: `select:position:${positions[i + 1].id}`,
      })
    }

    keyboard.row(...row)
  }

  // إضافة زر الإلغاء
  keyboard.row({ text: '❌ إلغاء', callback_data: 'employeesListHandler' })

  await ctx.reply(
    `✅ **تم توليد اسم الشهرة:** ${data.nickname}\n\n`
    + '📝 **إضافة موظف جديد**\n\n'
    + '**الخطوة 3/7:** اختيار الوظيفة\n\n'
    + 'يرجى اختيار الوظيفة المناسبة للموظف:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// اختيار الوظيفة من قاعدة البيانات
addEmployeeHandler.callbackQuery(/^select:position:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  const positionId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: { department: true },
    })

    if (!position) {
      await ctx.reply('❌ الوظيفة غير موجودة. يرجى المحاولة مرة أخرى.')
      return
    }

    // حفظ بيانات الوظيفة والقسم
    data.positionId = position.id
    data.departmentId = position.departmentId
    data.step = 'nationalId'
    formData.set(userId, data)

    await ctx.reply(
      `✅ **تم اختيار الوظيفة:** ${position.titleAr || position.title}\n`
      + `📋 **القسم:** ${position.department.name}\n\n`
      + '📝 **إضافة موظف جديد**\n\n'
      + '**الخطوة 4/7:** الرقم القومي\n\n'
      + 'يرجى إدخال الرقم القومي المكون من 14 رقم:',
      { parse_mode: 'Markdown' },
    )
  }
  catch (error) {
    console.error('Error selecting position:', error)
    await ctx.reply('❌ حدث خطأ في اختيار الوظيفة. الرجاء المحاولة مرة أخرى.')
  }
})

// اختيار المحافظة من قاعدة البيانات
addEmployeeHandler.callbackQuery(/^select:governorate:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  const governorateId = Number.parseInt(ctx.match[1])

  try {
    const prisma = Database.prisma
    const governorate = await prisma.governorate.findUnique({
      where: { id: governorateId },
    })

    if (!governorate) {
      await ctx.reply('❌ المحافظة غير موجودة. يرجى المحاولة مرة أخرى.')
      return
    }

    // حفظ بيانات المحافظة
    data.governorateId = governorate.id
    data.step = 'startDate'
    formData.set(userId, data)

    // استخدام التقويم الجديد
    const keyboard = Calendar.create({
      callbackPrefix: 'hr:employee:add:startDate',
    })

    await ctx.reply(
      `✅ **تم اختيار المحافظة:** ${governorate.nameAr}\n\n`
      + '📝 **إضافة موظف جديد**\n\n'
      + '**الخطوة 6/7:** تاريخ بدء العمل\n\n'
      + 'يرجى اختيار تاريخ بدء العمل من التقويم:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    )
  }
  catch (error) {
    console.error('Error selecting governorate:', error)
    await ctx.reply('❌ حدث خطأ في اختيار المحافظة. الرجاء المحاولة مرة أخرى.')
  }
})

// معالج اختيار التاريخ من التقويم الجديد
addEmployeeHandler.callbackQuery(/^hr:employee:add:startDate:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  const dateStr = ctx.match[1]
  const selectedDate = Calendar.parseDate(dateStr)

  if (!selectedDate) {
    await ctx.reply('❌ التاريخ غير صحيح. يرجى المحاولة مرة أخرى.')
    return
  }

  // التحقق من أن التاريخ ليس في المستقبل
  const today = new Date()
  if (selectedDate > today) {
    await ctx.reply('❌ لا يمكن أن يكون تاريخ بدء العمل في المستقبل.')
    return
  }

  // حفظ التاريخ
  data.startDate = dateStr
  data.step = 'idCardFront'
  formData.set(userId, data)

  const keyboard = new InlineKeyboard()
    .text('⏭️ تخطي', 'skip:idCardFront')

  const formattedDate = selectedDate.toLocaleDateString('ar-EG')

  await ctx.reply(
    `✅ **تم اختيار التاريخ:** ${formattedDate}\n\n`
    + '📝 **إضافة موظف جديد**\n\n'
    + '**الخطوة 7/7:** رفع صورة بطاقة الرقم القومي (الوجه الأمامي)\n\n'
    + 'يرجى رفع صورة واضحة لوجه بطاقة الرقم القومي أو اضغط تخطي:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

// معالج رفع الصور - تحميل فعلي وحفظ في مجلد المرفقات
addEmployeeHandler.on('message:photo', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data) {
    await ctx.reply('❌ لم يتم العثور على بيانات النموذج.')
    return
  }

  // فحص المرحلة
  if (data.step !== 'idCardFront' && data.step !== 'idCardBack') {
    await ctx.reply('❌ لا يمكن رفع الصورة في هذه المرحلة.')
    return
  }

  try {
    // إرسال رسالة تحميل
    const loadingMessage = await ctx.reply('🔄 جاري معالجة الصورة... ⏳ يرجى الانتظار...')

    // إضافة رسالة التحميل إلى الرسائل المؤقتة
    addTemporaryMessage(data, loadingMessage.message_id)

    // الحصول على الصورة
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const fileId = photo.file_id

    // تحميل الصورة من Telegram
    const bot = ctx.api
    const file = await bot.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`

    // تحميل محتوى الصورة
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error('فشل في تحميل الصورة')
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())

    // حفظ الصورة في مجلد مؤقت
    const tempFolderPath = path.join(process.cwd(), 'attachments', 'temp')
    await fs.mkdir(tempFolderPath, { recursive: true })

    if (data.step === 'idCardFront') {
      const tempFilePath = path.join(tempFolderPath, `temp-front-${userId}-${Date.now()}.jpg`)
      await fs.writeFile(tempFilePath, imageBuffer)

      data.idCardFront = tempFilePath
      data.step = 'idCardBack'
      formData.set(userId, data)

      // حذف رسالة التحميل
      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id)

      const keyboard = new InlineKeyboard()
        .text('⏭️ تخطي', 'skip:idCardBack')

      await ctx.reply(
        '✅ **تم رفع صورة الوجه الأمامي بنجاح!**\n\n'
        + '**الخطوة 7/7:** رفع صورة بطاقة الرقم القومي (الوجه الخلفي)\n\n'
        + 'يرجى رفع صورة واضحة لظهر بطاقة الرقم القومي أو اضغط تخطي:',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      )
    }
    else if (data.step === 'idCardBack') {
      const tempFilePath = path.join(tempFolderPath, `temp-back-${userId}-${Date.now()}.jpg`)
      await fs.writeFile(tempFilePath, imageBuffer)

      data.idCardBack = tempFilePath
      formData.set(userId, data)

      // حذف رسالة التحميل
      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id)

      await showEmployeeSummary(ctx, data)
    }
  }
  catch (error) {
    console.error('Error in photo handler:', error)
    await ctx.reply('❌ حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى أو اضغط "تخطي".')
  }
})

// تخطي رفع صورة الوجه الأمامي
addEmployeeHandler.callbackQuery('skip:idCardFront', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  data.idCardFront = undefined
  data.idCardBack = undefined
  formData.set(userId, data)

  await showEmployeeSummary(ctx, data)
})

// تخطي رفع صورة الوجه الخلفي
addEmployeeHandler.callbackQuery('skip:idCardBack', async (ctx) => {
  await ctx.answerCallbackQuery()

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  data.idCardBack = undefined
  formData.set(userId, data)

  await showEmployeeSummary(ctx, data)
})

// تأكيد الحفظ
addEmployeeHandler.callbackQuery('confirm:save:employee', async (ctx) => {
  await ctx.answerCallbackQuery('جاري الحفظ...')

  const userId = ctx.from?.id
  if (!userId)
    return

  const data = formData.get(userId)
  if (!data)
    return

  // إضافة رسالة التأكيد إلى الرسائل المؤقتة
  if (ctx.callbackQuery.message) {
    addTemporaryMessage(data, ctx.callbackQuery.message.message_id)
  }

  try {
    const prisma = Database.prisma

    // التحقق من صحة البيانات المطلوبة
    if (!data.fullName || !data.nationalId || !data.positionId || !data.governorateId || !data.phone || !data.startDate) {
      await ctx.reply('❌ البيانات غير مكتملة. يرجى إعادة المحاولة.')
      console.error('Missing required data:', {
        fullName: data.fullName,
        nationalId: data.nationalId,
        positionId: data.positionId,
        governorateId: data.governorateId,
        phone: data.phone,
        startDate: data.startDate,
      })
      return
    }

    // التحقق من عدم وجود الرقم القومي مسبقاً
    const existingEmployee = await prisma.employee.findUnique({
      where: { nationalId: data.nationalId },
    })

    if (existingEmployee) {
      await ctx.reply(`❌ الرقم القومي \`${data.nationalId}\` مسجل بالفعل لموظف آخر.\n\nيرجى التحقق من الرقم أو استخدام رقم آخر.`, { parse_mode: 'Markdown' })
      return
    }

    // توليد كود الموظف الجديد
    const codeInfo = await EmployeeCodeManager.generateEmployeeCode(data.positionId!)
    const employeeCode = codeInfo.employeeCode

    // حساب العمر
    const birthDate = new Date(data.birthDate!)
    const today = await getCurrentDate()
    const todayDate = new Date(today)
    let age = todayDate.getFullYear() - birthDate.getFullYear()
    const monthDiff = todayDate.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && todayDate.getDate() < birthDate.getDate())) {
      age--
    }

    // حفظ المرفقات باستخدام AttachmentsManager
    let idCardFrontPath: string | undefined
    let idCardBackPath: string | undefined

    if (data.idCardFront) {
      try {
        // قراءة الصورة من المجلد المؤقت
        const tempImageBuffer = await fs.readFile(data.idCardFront)

        // حفظ الصورة في المجلد النهائي باستخدام AttachmentsManager
        const frontAttachment = await AttachmentsManager.saveIdCard(
          employeeCode,
          data.fullName!,
          tempImageBuffer,
          'id-card-front.jpg',
          'front',
        )

        idCardFrontPath = AttachmentsManager.getRelativeFilePath(frontAttachment.filePath)
        console.log('✅ تم حفظ صورة الوجه الأمامي:', idCardFrontPath)

        // حذف الملف المؤقت
        await fs.unlink(data.idCardFront)
      }
      catch (error) {
        console.error('❌ خطأ في حفظ صورة الوجه الأمامي:', error)
      }
    }

    if (data.idCardBack) {
      try {
        // قراءة الصورة من المجلد المؤقت
        const tempImageBuffer = await fs.readFile(data.idCardBack)

        // حفظ الصورة في المجلد النهائي باستخدام AttachmentsManager
        const backAttachment = await AttachmentsManager.saveIdCard(
          employeeCode,
          data.fullName!,
          tempImageBuffer,
          'id-card-back.jpg',
          'back',
        )

        idCardBackPath = AttachmentsManager.getRelativeFilePath(backAttachment.filePath)
        console.log('✅ تم حفظ صورة الوجه الخلفي:', idCardBackPath)

        // حذف الملف المؤقت
        await fs.unlink(data.idCardBack)
      }
      catch (error) {
        console.error('❌ خطأ في حفظ صورة الوجه الخلفي:', error)
      }
    }

    // حفظ في قاعدة البيانات
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullName: data.fullName!,
        nickname: data.nickname!, // اسم الشهرة
        nationalId: data.nationalId!,
        gender: data.gender === 'male' ? 'MALE' : 'FEMALE',
        dateOfBirth: birthDate,
        nationality: 'Egyptian',
        maritalStatus: 'SINGLE',
        personalPhone: data.phone!,
        personalEmail: null,
        telegramId: null, // سيتم إضافته لاحقاً
        currentAddress: 'غير محدد',
        emergencyContactName: 'غير محدد',
        emergencyContactPhone: '00000000000',
        city: 'غير محدد',
        country: 'Egypt',
        companyId: 1,
        departmentId: data.departmentId!,
        positionId: data.positionId!,
        employmentType: 'FULL_TIME',
        contractType: 'PERMANENT',
        employmentStatus: 'ACTIVE',
        hireDate: new Date(data.startDate!),
        basicSalary: 0,
        allowances: 0,
        totalSalary: 0,
        currency: 'EGP',
        paymentMethod: 'BANK_TRANSFER',
        transferNumber1: null, // سيتم إضافته لاحقاً
        transferType1: null,
        transferNumber2: null,
        transferType2: null,
        governorateId: data.governorateId,
        profilePhoto: null, // سيتم إضافته لاحقاً
        cv: null, // سيتم إضافته لاحقاً
        nationalIdCardUrl: idCardFrontPath || idCardBackPath || null, // رابط بطاقة الرقم القومي
        isActive: true,
        annualLeaveBalance: 21,
        sickLeaveBalance: 180,
        casualLeaveBalance: 7,
        attendanceRequired: true,
        // نظام الإجازات الجديد - سيتم تعيينه من الوظيفة الافتراضية
        workDaysPerCycle: null, // سيتم تعيينه من الوظيفة
        leaveDaysPerCycle: null, // سيتم تعيينه من الوظيفة
        currentWorkDays: 0,
        currentLeaveDays: 0,
        lastLeaveStartDate: null,
        lastLeaveEndDate: null,
        nextLeaveStartDate: null,
        nextLeaveEndDate: null,
      },
    })

    // تعيين القيم الافتراضية للإجازات من الوظيفة
    try {
      const position = await prisma.position.findUnique({
        where: { id: data.positionId! },
        select: {
          defaultWorkDaysPerCycle: true,
          defaultLeaveDaysPerCycle: true,
        },
      })

      if (position?.defaultWorkDaysPerCycle || position?.defaultLeaveDaysPerCycle) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            workDaysPerCycle: position.defaultWorkDaysPerCycle,
            leaveDaysPerCycle: position.defaultLeaveDaysPerCycle,
          },
        })

        console.log('✅ تم تعيين القيم الافتراضية للإجازات من الوظيفة')
      }
    }
    catch (error) {
      console.error('❌ خطأ في تعيين القيم الافتراضية للإجازات:', error)
    }

    // مسح البيانات المؤقتة
    formData.delete(userId)

    // جلب معلومات الوظيفة والقسم والمحافظة
    const position = await prisma.position.findUnique({
      where: { id: data.positionId },
      include: { department: true },
    })

    const governorate = await prisma.governorate.findUnique({
      where: { id: data.governorateId },
    })

    const positionName = position ? (position.titleAr || position.title) : 'غير محدد'
    const departmentName = position ? position.department.name : 'غير محدد'
    const governorateName = governorate ? governorate.nameAr : 'غير محدد'

    // إعداد رسالة التفاصيل الكاملة
    let fullDetailsMessage
      = '✅ تم تسجيل موظف جديد بنجاح!\n\n'
        + '━━━━━━━━━━━━━━━━━━━━\n\n'
        + '📋 البيانات الأساسية:\n'
        + `🆔 الكود: ${employee.employeeCode}\n`
        + `👤 الاسم الكامل: ${employee.fullName}\n`
        + `📛 اسم الشهرة: ${data.nickname}\n`
        + `💼 الوظيفة: ${positionName}\n`
        + `📋 القسم: ${departmentName}\n`
        + `🆔 الرقم القومي: ${employee.nationalId}\n`
        + `📅 تاريخ الميلاد: ${data.birthDate}\n`
        + `🎂 العمر: ${age} سنة\n`
        + `⚧️ الجنس: ${data.gender === 'male' ? 'ذكر' : 'أنثى'}\n`
        + `📍 محافظة الإقامة: ${governorateName}\n\n`
        + '📞 معلومات الاتصال:\n'
        + `📱 الموبايل: ${employee.personalPhone}\n`
        + `📡 الشبكة: ${data.phoneOperator}\n\n`
        + '💼 معلومات العمل:\n'
        + `📅 تاريخ بدء العمل: ${new Date(data.startDate!).toLocaleDateString('ar-EG')}\n`
        + `✅ الحالة: نشط\n\n`
        + '📁 المرفقات:\n'
      + `${idCardFrontPath ? '✅ بطاقة الرقم القومي (الوجه الأمامي)\n' : '❌ لم يتم رفع بطاقة الرقم القومي (الوجه الأمامي)\n'}`
      + `${idCardBackPath ? '✅ بطاقة الرقم القومي (الوجه الخلفي)\n' : '❌ لم يتم رفع بطاقة الرقم القومي (الوجه الخلفي)\n'}\n`
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + '🎉 مرحباً بالعضو الجديد في فريق العمل!'

    // حذف الرسائل المؤقتة من الشات
    if (data.temporaryMessageIds && data.temporaryMessageIds.length > 0) {
      await deleteTemporaryMessages(ctx, data.temporaryMessageIds)
    }

    // إرسال الرسالة النهائية مع أزرار التنقل
    const keyboard = new InlineKeyboard()
      .text('🏠 القائمة الرئيسية', 'menu:back')
      .text('➕ إضافة موظف جديد', 'hr:employees:add')

    await ctx.reply(fullDetailsMessage, {
      reply_markup: keyboard,
    })

    // إرسال رسالة التقرير لجميع أدمن القسم
    await sendReportToAdmins(ctx, employee, positionName, departmentName, governorateName)
  }
  catch (error) {
    console.error('Error saving employee:', error)

    // إرسال رسالة خطأ أكثر تفصيلاً
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)

      // التحقق من نوع الخطأ وإرسال رسالة مناسبة
      if (error.message.includes('Unique constraint failed')) {
        if (error.message.includes('nationalId')) {
          await ctx.reply('❌ الرقم القومي مسجل بالفعل لموظف آخر.\n\nيرجى التحقق من الرقم أو استخدام رقم آخر.')
        }
        else {
          await ctx.reply('❌ البيانات المدخلة مكررة. يرجى التحقق من البيانات المدخلة.')
        }
        return
      }
    }

    await ctx.reply('❌ حدث خطأ في حفظ البيانات. الرجاء المحاولة مرة أخرى.\n\n'
      + 'إذا استمر الخطأ، يرجى التواصل مع المطور.')
  }
})

// إلغاء العملية
addEmployeeHandler.callbackQuery('confirm:cancel:employee', async (ctx) => {
  await ctx.answerCallbackQuery('تم الإلغاء')

  const userId = ctx.from?.id
  if (!userId)
    return

  formData.delete(userId)
  await ctx.reply('❌ تم إلغاء عملية إضافة الموظف.')
})

// ============================================
// 📊 عرض ملخص البيانات للتأكيد
// ============================================
async function showEmployeeSummary(ctx: any, data: EmployeeFormData) {
  // التحقق من صحة البيانات المطلوبة
  if (!data.fullName || !data.nationalId || !data.positionId || !data.governorateId || !data.phone || !data.startDate) {
    await ctx.reply('❌ البيانات غير مكتملة. يرجى إعادة المحاولة.')
    return
  }

  // حساب العمر
  const birthDate = new Date(data.birthDate!)
  const today = await getCurrentDate()
  const todayDate = new Date(today)
  let age = todayDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = todayDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && todayDate.getDate() < birthDate.getDate())) {
    age--
  }

  // جلب معلومات الوظيفة والقسم والمحافظة
  const prisma = Database.prisma
  const position = await prisma.position.findUnique({
    where: { id: data.positionId },
    include: { department: true },
  })

  const governorate = await prisma.governorate.findUnique({
    where: { id: data.governorateId },
  })

  const positionName = position ? (position.titleAr || position.title) : 'غير محدد'
  const departmentName = position ? position.department.name : 'غير محدد'
  const governorateName = governorate ? governorate.nameAr : 'غير محدد'

  let summary = '📋 مراجعة البيانات قبل الحفظ\n\n'

  summary += '📝 البيانات الأساسية:\n'
  summary += `👤 الاسم: ${data.fullName}\n`
  summary += `📛 الشهرة: ${data.nickname}\n`
  summary += `💼 الوظيفة: ${positionName}\n`
  summary += `📋 القسم: ${departmentName}\n`
  summary += `🆔 الرقم القومي: ${data.nationalId}\n`
  summary += `📅 تاريخ الميلاد: ${data.birthDate}\n`
  summary += `🎂 العمر: ${age} سنة\n`
  summary += `⚧️ الجنس: ${data.gender === 'male' ? 'ذكر' : 'أنثى'}\n`
  summary += `📍 محافظة الإقامة: ${governorateName}\n\n`

  summary += '📞 معلومات الاتصال:\n'
  summary += `📱 الموبايل: ${data.phone}\n`
  summary += `📡 الشبكة: ${data.phoneOperator}\n\n`

  summary += '💼 معلومات العمل:\n'
  summary += `📅 تاريخ بدء العمل: ${new Date(data.startDate!).toLocaleDateString('ar-EG')}\n\n`

  summary += '━━━━━━━━━━━━━━━━━━━━\n\n'
  summary += 'هل تريد حفظ هذه البيانات؟'

  const keyboard = new InlineKeyboard()
    .text('✅ حفظ', 'confirm:save:employee')
    .text('❌ إلغاء', 'confirm:cancel:employee')

  await ctx.reply(summary, {
    reply_markup: keyboard,
  })
}

// دالة إرسال التقرير لجميع أدمن القسم
async function sendReportToAdmins(ctx: any, employee: any, positionName: string, departmentName: string, governorateName: string) {
  try {
    const prisma = Database.prisma

    // جلب جميع الأدمن
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'ADMIN'],
        },
        isActive: true,
      },
    })

    const reportMessage
      = '📊 **تقرير إضافة موظف جديد**\n\n'
        + '━━━━━━━━━━━━━━━━━━━━\n\n'
        + '**📋 بيانات الموظف:**\n'
        + `🆔 الكود: \`${employee.employeeCode}\`\n`
        + `👤 الاسم: ${employee.fullName}\n`
        + `💼 الوظيفة: ${positionName}\n`
        + `📋 القسم: ${departmentName}\n`
        + `📍 المحافظة: ${governorateName}\n`
        + `📅 تاريخ التعيين: ${employee.hireDate.toLocaleDateString('ar-EG')}\n\n`
        + '━━━━━━━━━━━━━━━━━━━━\n\n'
        + '📝 تم إضافة موظف جديد إلى النظام'

    // إرسال الرسالة لجميع الأدمن
    for (const admin of admins) {
      try {
        await ctx.api.sendMessage(admin.telegramId, reportMessage, { parse_mode: 'Markdown' })
      }
      catch (error) {
        console.error(`Error sending report to admin ${admin.telegramId}:`, error)
      }
    }
  }
  catch (error) {
    console.error('Error sending reports to admins:', error)
  }
}
