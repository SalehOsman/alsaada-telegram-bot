import type { Context } from '#root/bot/context.js'

import { logError } from '#root/bot/helpers/error-logger.js'
import { Database } from '#root/modules/database/index.js'

import ExcelJS from 'exceljs'
import { Composer, InputFile } from 'grammy'

export const exportCyclesHandler = new Composer<Context>()

exportCyclesHandler.callbackQuery('hr:cycle:export', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.editMessageText('جاري التصدير...')

  try {
    const employees: any = await Database.prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [{ position: { department: { orderIndex: 'asc' } } }, { fullName: 'asc' }],
      include: {
        position: {
          include: { department: { select: { name: true } } },
        },
      },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('دورة العمل والإجازات')

    sheet.columns = [
      { header: 'الرقم', key: 'num', width: 10 },
      { header: 'الاسم', key: 'name', width: 25 },
      { header: 'الوظيفة', key: 'position', width: 20 },
      { header: 'القسم', key: 'department', width: 20 },
      { header: 'أيام العمل', key: 'workDays', width: 15 },
      { header: 'أيام الإجازة', key: 'leaveDays', width: 15 },
      { header: 'مخصص', key: 'custom', width: 12 },
      { header: 'افتراضي العمل', key: 'defaultWork', width: 15 },
      { header: 'افتراضي الإجازة', key: 'defaultLeave', width: 15 },
    ]

    sheet.getRow(1).font = { bold: true }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      sheet.addRow({
        num: i + 1,
        name: emp.fullName,
        position: emp.position.titleAr,
        department: emp.position.department.name,
        workDays: emp.workDaysPerCycle ?? 'غير محدد',
        leaveDays: emp.leaveDaysPerCycle ?? 'غير محدد',
        custom: emp.hasCustomCycle ? 'نعم' : 'لا',
        defaultWork: emp.position.defaultWorkDaysPerCycle ?? 'غير محدد',
        defaultLeave: emp.position.defaultLeaveDaysPerCycle ?? 'غير محدد',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `work-leave-cycles-${Date.now()}.xlsx`

    await ctx.replyWithDocument(new InputFile(new Uint8Array(buffer), filename), {
      caption: `✅ تم التصدير\nعدد الموظفين: ${employees.length}`,
      reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'hr:work_leave_cycle:main' }]] },
    })
  }
  catch (error) {
    await logError(ctx, error, 'exportCyclesHandler')
    await ctx.reply('❌ فشل التصدير')
  }
})
