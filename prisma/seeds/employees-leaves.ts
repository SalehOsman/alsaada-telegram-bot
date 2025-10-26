/**
 * Seed للبيانات التجريبية - نظام الإجازات
 * يحتوي على 23 عامل مع إجازات لمدة 12 شهر
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedEmployeesWithLeaves() {
  console.log('\n👥 بدء إضافة العاملين والإجازات التجريبية...\n')

  // تاريخ البداية (قبل 12 شهر)
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 12)

  // البيانات التجريبية للعاملين
  const employees = [
    // المجموعة 1: الإدارة العليا
    {
      fullName: 'أحمد محمد السيد',
      nickname: 'أحمد السيد',
      nationalId: '29001011234567',
      personalPhone: '01012345601',
      departmentId: 1, // الإدارة العليا
      positionId: 21, // رئيس مجلس الإدارة
      governorateId: 1, // القاهرة
      workDaysPerCycle: 60,
      leaveDaysPerCycle: 15,
      scenario: 'regular', // إجازات منتظمة
    },
    {
      fullName: 'محمد علي حسن',
      nickname: 'محمد علي',
      nationalId: '29002021234568',
      personalPhone: '01012345602',
      departmentId: 1,
      positionId: 22, // المدير العام
      governorateId: 2, // الجيزة
      workDaysPerCycle: 45,
      leaveDaysPerCycle: 10,
      scenario: 'regular',
    },

    // المجموعة 2: الإدارة العامة
    {
      fullName: 'خالد حسن محمود',
      nickname: 'خالد حسن',
      nationalId: '29003031234569',
      personalPhone: '01012345603',
      departmentId: 2, // الإدارة العامة
      positionId: 19, // مدير الإدارة والموارد البشرية
      governorateId: 1,
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'regular',
    },
    {
      fullName: 'عمر سعيد أحمد',
      nickname: 'عمر سعيد',
      nationalId: '29004041234570',
      personalPhone: '01012345604',
      departmentId: 2,
      positionId: 20, // مدير المشاريع والعمليات
      governorateId: 5, // الإسكندرية
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'regular',
    },
    {
      fullName: 'ياسر محمود علي',
      nickname: 'ياسر محمود',
      nationalId: '29005051234571',
      personalPhone: '01012345605',
      departmentId: 2,
      positionId: 18, // مدير تنفيذي إداري
      governorateId: 4, // الشرقية
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'regular',
    },
    {
      fullName: 'طارق فتحي حسن',
      nickname: 'طارق فتحي',
      nationalId: '29006061234572',
      personalPhone: '01012345606',
      departmentId: 2,
      positionId: 17, // إداري
      governorateId: 10, // الدقهلية
      workDaysPerCycle: 20,
      leaveDaysPerCycle: 7,
      scenario: 'delayed', // إجازات مع تأخير
    },

    // المجموعة 3: الإدارة الهندسية
    {
      fullName: 'مصطفى أحمد علي',
      nickname: 'مصطفى أحمد',
      nationalId: '29007071234573',
      personalPhone: '01012345607',
      departmentId: 3, // الإدارة الهندسية
      positionId: 16, // مهندس مساحة
      governorateId: 2,
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'delayed',
    },
    {
      fullName: 'حسام محمد سعيد',
      nickname: 'حسام محمد',
      nationalId: '29008081234574',
      personalPhone: '01012345608',
      departmentId: 3,
      positionId: 15, // مساح
      governorateId: 13, // الفيوم
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'delayed',
    },
    {
      fullName: 'وليد حسن محمود',
      nickname: 'وليد حسن',
      nationalId: '29009091234575',
      personalPhone: '01012345609',
      departmentId: 3,
      positionId: 14, // مساعد مساح
      governorateId: 20, // بني سويف
      workDaysPerCycle: 20,
      leaveDaysPerCycle: 7,
      scenario: 'delayed',
    },

    // المجموعة 4: إدارة المشاريع
    {
      fullName: 'سامي علي أحمد',
      nickname: 'سامي علي',
      nationalId: '29010101234576',
      personalPhone: '01012345610',
      departmentId: 4, // إدارة المشاريع
      positionId: 13, // مشرف موقع
      governorateId: 19, // أسيوط
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'delayed',
    },
    {
      fullName: 'رامي محمد حسن',
      nickname: 'رامي محمد',
      nationalId: '29011111234577',
      personalPhone: '01012345611',
      departmentId: 4,
      positionId: 12, // كاتب موقع
      governorateId: 24, // سوهاج
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'postponed', // إجازات مع تأجيل
    },

    // المجموعة 5: إدارة المعدات
    {
      fullName: 'عبد الله محمد علي',
      nickname: 'عبد الله محمد',
      nationalId: '29012121234578',
      personalPhone: '01012345612',
      departmentId: 6, // إدارة المعدات
      positionId: 7, // سائق حفار
      governorateId: 25, // قنا
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'postponed',
    },
    {
      fullName: 'إبراهيم حسن سعيد',
      nickname: 'إبراهيم حسن',
      nationalId: '29013131234579',
      personalPhone: '01012345613',
      departmentId: 6,
      positionId: 8, // سائق بلدوزر
      governorateId: 7, // الأقصر
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'postponed',
    },
    {
      fullName: 'محمود أحمد حسن',
      nickname: 'محمود أحمد',
      nationalId: '29014141234580',
      personalPhone: '01012345614',
      departmentId: 6,
      positionId: 9, // سائق لودر
      governorateId: 18, // أسوان
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'postponed',
    },

    // المجموعة 6: إدارة المركبات
    {
      fullName: 'حسين علي محمد',
      nickname: 'حسين علي',
      nationalId: '29015151234581',
      personalPhone: '01012345615',
      departmentId: 5, // إدارة المركبات
      positionId: 11, // سائق قلاب
      governorateId: 8, // البحر الأحمر
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'allowance', // بدل إجازة
    },
    {
      fullName: 'علي حسن أحمد',
      nickname: 'علي حسن',
      nationalId: '29016161234582',
      personalPhone: '01012345616',
      departmentId: 5,
      positionId: 10, // سائق سيارة خدمة
      governorateId: 22, // جنوب سيناء
      workDaysPerCycle: 20,
      leaveDaysPerCycle: 7,
      scenario: 'allowance',
    },

    // المجموعة 7: إدارة الصيانة
    {
      fullName: 'جمال محمد حسين',
      nickname: 'جمال محمد',
      nationalId: '29017171234583',
      personalPhone: '01012345617',
      departmentId: 7, // إدارة الصيانة
      positionId: 6, // فني صيانة سيارات
      governorateId: 3, // شمال سيناء
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'allowance',
    },
    {
      fullName: 'كمال أحمد علي',
      nickname: 'كمال أحمد',
      nationalId: '29018181234584',
      personalPhone: '01012345618',
      departmentId: 7,
      positionId: 5, // فني صيانة لودر
      governorateId: 6, // الإسماعيلية
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'sick', // إجازات مرضية
    },
    {
      fullName: 'فتحي حسن محمد',
      nickname: 'فتحي حسن',
      nationalId: '29019191234585',
      personalPhone: '01012345619',
      departmentId: 7,
      positionId: 4, // فني صيانة معدات
      governorateId: 11, // السويس
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'sick',
    },
    {
      fullName: 'سعيد محمود أحمد',
      nickname: 'سعيد محمود',
      nationalId: '29020201234586',
      personalPhone: '01012345620',
      departmentId: 7,
      positionId: 3, // مساعد صيانة عامة
      governorateId: 21, // بورسعيد
      workDaysPerCycle: 20,
      leaveDaysPerCycle: 7,
      scenario: 'sick',
    },

    // المجموعة 8: إدارة التغذية
    {
      fullName: 'نبيل علي حسن',
      nickname: 'نبيل علي',
      nationalId: '29021211234587',
      personalPhone: '01012345621',
      departmentId: 10, // إدارة التغذية
      positionId: 2, // رئيس طهاة
      governorateId: 23, // دمياط
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'emergency', // إجازات عارضة
    },
    {
      fullName: 'ماجد محمد أحمد',
      nickname: 'ماجد محمد',
      nationalId: '29022221234588',
      personalPhone: '01012345622',
      departmentId: 10,
      positionId: 1, // طباخ
      governorateId: 26, // كفر الشيخ
      workDaysPerCycle: 25,
      leaveDaysPerCycle: 8,
      scenario: 'emergency',
    },

    // المجموعة 9: إدارة المالية
    {
      fullName: 'هشام أحمد علي',
      nickname: 'هشام أحمد',
      nationalId: '29023231234589',
      personalPhone: '01012345623',
      departmentId: 11, // إدارة المالية
      positionId: 23, // محاسب
      governorateId: 12, // الغربية
      workDaysPerCycle: 30,
      leaveDaysPerCycle: 10,
      scenario: 'unpaid', // بدون مرتب
    },
  ]

  let employeeCount = 0
  let leaveCount = 0

  for (const empData of employees) {
    try {
      // إنشاء العامل
      const employee = await prisma.employee.create({
        data: {
          fullName: empData.fullName,
          nickname: empData.nickname,
          nationalId: empData.nationalId,
          personalPhone: empData.personalPhone,
          departmentId: empData.departmentId,
          positionId: empData.positionId,
          governorateId: empData.governorateId,
          city: 'مدينة تجريبية',
          country: 'مصر',
          postalCode: '12345',
          currency: 'EGP',
          workDaysPerCycle: empData.workDaysPerCycle,
          leaveDaysPerCycle: empData.leaveDaysPerCycle,
          status: 'ACTIVE',
        },
      })

      employeeCount++
      console.log(`✅ تم إضافة: ${employee.fullName}`)

      // إنشاء الإجازات حسب السيناريو
      const leaves = await generateLeaves(employee.id, empData.scenario, empData.workDaysPerCycle, empData.leaveDaysPerCycle, startDate)
      leaveCount += leaves

    } catch (error) {
      console.error(`❌ خطأ في إضافة ${empData.fullName}:`, error)
    }
  }

  console.log(`\n✨ تم إضافة ${employeeCount} عامل و ${leaveCount} إجازة بنجاح!\n`)
}

/**
 * توليد الإجازات حسب السيناريو
 */
async function generateLeaves(
  employeeId: number,
  scenario: string,
  workDays: number,
  leaveDays: number,
  startDate: Date
): Promise<number> {
  let count = 0
  let currentDate = new Date(startDate)
  const today = new Date()

  // حساب عدد الدورات في 12 شهر
  const cycleDays = workDays + leaveDays
  const totalDays = 365
  const cycles = Math.floor(totalDays / cycleDays)

  for (let i = 0; i < cycles; i++) {
    // تاريخ بداية الإجازة
    const leaveStart = new Date(currentDate)
    leaveStart.setDate(leaveStart.getDate() + workDays)

    // تاريخ نهاية الإجازة
    const leaveEnd = new Date(leaveStart)
    leaveEnd.setDate(leaveEnd.getDate() + leaveDays - 1)

    // إذا تجاوز اليوم، توقف
    if (leaveStart > today) break

    // توليد الإجازة حسب السيناريو
    const leave = await createLeaveByScenario(
      employeeId,
      scenario,
      leaveStart,
      leaveEnd,
      leaveDays,
      i
    )

    if (leave) {
      count++
      // تحديث التاريخ الحالي
      currentDate = new Date(leave.actualReturnDate || leaveEnd)
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return count
}

/**
 * إنشاء إجازة حسب السيناريو
 */
async function createLeaveByScenario(
  employeeId: number,
  scenario: string,
  startDate: Date,
  endDate: Date,
  leaveDays: number,
  index: number
) {
  const year = startDate.getFullYear()
  const leaveNumber = `LV-${year}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

  switch (scenario) {
    case 'regular':
      // إجازات منتظمة
      return await prisma.hR_EmployeeLeave.create({
        data: {
          employeeId,
          leaveNumber,
          leaveType: 'REGULAR',
          startDate,
          endDate,
          actualReturnDate: endDate,
          status: 'COMPLETED',
          isActive: false,
          delayDays: 0,
        },
      })

    case 'delayed':
      // إجازات مع تأخير
      const delayDays = index % 3 === 0 ? Math.floor(Math.random() * 5) + 1 : 0
      const actualReturn = new Date(endDate)
      actualReturn.setDate(actualReturn.getDate() + delayDays)

      return await prisma.hR_EmployeeLeave.create({
        data: {
          employeeId,
          leaveNumber,
          leaveType: 'REGULAR',
          startDate,
          endDate,
          actualReturnDate: actualReturn,
          status: 'COMPLETED',
          isActive: false,
          delayDays,
        },
      })

    case 'postponed':
      // إجازات مع تأجيل
      if (index % 3 === 0) {
        // تأجيل بدون إجازة
        return null
      } else {
        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'REGULAR',
            startDate,
            endDate,
            actualReturnDate: endDate,
            status: 'COMPLETED',
            isActive: false,
            isPostponed: index % 2 === 0,
            postponedTimes: index % 2 === 0 ? 1 : 0,
          },
        })
      }

    case 'allowance':
      // بدل إجازة
      if (index % 3 === 0) {
        // بدل بدلاً من إجازة
        await prisma.hR_LeaveAllowance.create({
          data: {
            employeeId,
            amount: 2500,
            reason: 'بدل إجازة - ظروف عمل',
            isSettled: Math.random() > 0.4,
          },
        })
        return { actualReturnDate: endDate } as any
      } else {
        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'REGULAR',
            startDate,
            endDate,
            actualReturnDate: endDate,
            status: 'COMPLETED',
            isActive: false,
          },
        })
      }

    case 'sick':
      // إجازات مرضية
      if (index % 4 === 0) {
        const sickDays = Math.floor(Math.random() * 5) + 3
        const sickEnd = new Date(startDate)
        sickEnd.setDate(sickEnd.getDate() + sickDays - 1)

        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'SICK',
            startDate,
            endDate: sickEnd,
            actualReturnDate: sickEnd,
            status: 'COMPLETED',
            isActive: false,
            medicalReportPath: '/uploads/medical-reports/report.pdf',
            affectsNextLeave: Math.random() > 0.5,
          },
        })
      } else {
        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'REGULAR',
            startDate,
            endDate,
            actualReturnDate: endDate,
            status: 'COMPLETED',
            isActive: false,
          },
        })
      }

    case 'emergency':
      // إجازات عارضة
      if (index % 4 === 0) {
        const emergencyDays = Math.floor(Math.random() * 3) + 1
        const emergencyEnd = new Date(startDate)
        emergencyEnd.setDate(emergencyEnd.getDate() + emergencyDays - 1)

        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'EMERGENCY',
            startDate,
            endDate: emergencyEnd,
            actualReturnDate: emergencyEnd,
            status: 'COMPLETED',
            isActive: false,
            affectsNextLeave: Math.random() > 0.5,
          },
        })
      } else {
        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'REGULAR',
            startDate,
            endDate,
            actualReturnDate: endDate,
            status: 'COMPLETED',
            isActive: false,
          },
        })
      }

    case 'unpaid':
      // بدون مرتب
      if (index % 5 === 0) {
        const unpaidDays = Math.floor(Math.random() * 5) + 3
        const unpaidEnd = new Date(startDate)
        unpaidEnd.setDate(unpaidEnd.getDate() + unpaidDays - 1)

        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'UNPAID',
            startDate,
            endDate: unpaidEnd,
            actualReturnDate: unpaidEnd,
            status: 'COMPLETED',
            isActive: false,
            notes: 'ظروف عائلية',
          },
        })
      } else {
        return await prisma.hR_EmployeeLeave.create({
          data: {
            employeeId,
            leaveNumber,
            leaveType: 'REGULAR',
            startDate,
            endDate,
            actualReturnDate: endDate,
            status: 'COMPLETED',
            isActive: false,
          },
        })
      }

    default:
      return null
  }
}
