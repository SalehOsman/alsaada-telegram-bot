/**
 * سكريبت اختبار حساب الرواتب مع الإجازات بدون مرتب
 */

import { Database } from '../src/modules/database/index.js'

async function testUnpaidLeaveDeduction() {
  try {
    console.log('🧪 اختبار خصم الإجازات بدون مرتب من الرواتب...\n')

    await Database.connect()

    const prisma = Database.prisma

    // البحث عن موظفين لديهم إجازات بدون مرتب
    const unpaidLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        leaveType: 'UNPAID',
        status: 'APPROVED',
        isActive: true,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            nickname: true,
            basicSalary: true,
            salaryCalculationType: true,
          },
        },
      },
      take: 5,
    })

    if (unpaidLeaves.length === 0) {
      console.log('⚠️ لا توجد إجازات بدون مرتب معتمدة في النظام')
      console.log('\n📝 ملاحظة: لاختبار الميزة، قم بتسجيل إجازة بدون مرتب لموظف\n')
      return
    }

    console.log(`📊 تم العثور على ${unpaidLeaves.length} إجازة بدون مرتب\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    for (const leave of unpaidLeaves) {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      const leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const dailyRate = leave.employee.basicSalary / 30
      const deduction = dailyRate * leaveDays

      console.log(`👤 **الموظف:** ${leave.employee.fullName} (${leave.employee.employeeCode})`)
      console.log(`📋 **رقم الإجازة:** ${leave.leaveNumber}`)
      console.log(`📅 **من:** ${startDate.toLocaleDateString('ar-EG')} **إلى:** ${endDate.toLocaleDateString('ar-EG')}`)
      console.log(`⏱️  **عدد الأيام:** ${leaveDays} ${leaveDays === 1 ? 'يوم' : 'أيام'}`)
      console.log(`💰 **الراتب الأساسي:** ${leave.employee.basicSalary.toFixed(2)} جنيه`)
      console.log(`📊 **نوع الحساب:** ${leave.employee.salaryCalculationType === 'MONTHLY' ? 'شهري' : 'يومي'}`)
      console.log(`💵 **الأجر اليومي:** ${dailyRate.toFixed(2)} جنيه/يوم`)
      console.log(`➖ **الخصم المتوقع:** ${deduction.toFixed(2)} جنيه`)
      console.log(`✅ **الراتب بعد الخصم:** ${(leave.employee.basicSalary - deduction).toFixed(2)} جنيه`)
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }

    console.log('💡 **كيفية التحقق:**')
    console.log('1. افتح البوت')
    console.log('2. اذهب إلى: إدارة الموارد البشرية > الرواتب > حساب راتب موظف')
    console.log('3. اختر أحد الموظفين أعلاه')
    console.log('4. اختر الشهر الذي يحتوي على الإجازة')
    console.log('5. تحقق من أن الخصم ظهر في التقرير\n')

    console.log('✅ **التحديث الجديد:**')
    console.log('- في النظام الشهري: الراتب كامل - خصم أيام الإجازات بدون مرتب')
    console.log('- في النظام اليومي: الراتب يُحسب حسب أيام العمل الفعلية (كما كان)\n')
  } catch (error) {
    console.error('❌ خطأ:', error)
  } finally {
    await Database.disconnect()
  }
}

testUnpaidLeaveDeduction()
