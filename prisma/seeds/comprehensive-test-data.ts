/**
 * Comprehensive Test Data Generator
 * بيانات تجريبية شاملة لاختبار نظام الرواتب والإجازات
 * 
 * تغطي:
 * - 10 موظفين بحالات مختلفة
 * - 6 شهور من السجلات (مايو - أكتوبر 2025)
 * - إجازات (عادية، مرضية، طارئة، بدون مرتب)
 * - تأخيرات في العودة من الإجازة
 * - بدلات إجازات (لم يحصل عليها)
 * - سلف نقدية ومسحوبات عينية
 * - مكافآت فردية وجماعية
 * - عقوبات تأخير (معتمدة وقيد المراجعة)
 * - ديون سابقة
 * - كشوف رواتب شهرية كاملة
 */

import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

// تواريخ الـ 6 شهور الماضية
const months = [
  { month: 5, year: 2025, name: 'مايو' },     // May
  { month: 6, year: 2025, name: 'يونيو' },    // June
  { month: 7, year: 2025, name: 'يوليو' },   // July
  { month: 8, year: 2025, name: 'أغسطس' },   // August
  { month: 9, year: 2025, name: 'سبتمبر' },  // September
  { month: 10, year: 2025, name: 'أكتوبر' }, // October
]

// الموظفون الـ 10 مع بياناتهم
const testEmployees = [
  {
    fullName: 'محمد أحمد السيد',
    nickname: 'محمد أحمد',
    employeeCode: 'EMP-TEST-001',
    nationalId: '29501011234567',
    basicSalary: 15000,
    scenario: 'موظف مثالي - لا مشاكل، راتب منتظم',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: false,
    hasBonuses: true,
  },
  {
    fullName: 'أحمد محمد علي',
    nickname: 'أحمد محمد',
    employeeCode: 'EMP-TEST-002',
    nationalId: '29502021234568',
    basicSalary: 12000,
    scenario: 'موظف بتأخيرات متعددة - عقوبات معتمدة',
    hasLeaves: true,
    hasDelays: true,
    hasAllowance: false,
    hasAdvances: true,
    hasBonuses: false,
  },
  {
    fullName: 'علي حسن محمود',
    nickname: 'علي حسن',
    employeeCode: 'EMP-TEST-003',
    nationalId: '29503031234569',
    basicSalary: 10000,
    scenario: 'موظف بإجازات بدون مرتب',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: false,
    hasBonuses: false,
    unpaidLeaves: true,
  },
  {
    fullName: 'حسن علي إبراهيم',
    nickname: 'حسن علي',
    employeeCode: 'EMP-TEST-004',
    nationalId: '29504041234570',
    basicSalary: 18000,
    scenario: 'موظف صرف بدل إجازات (3 مرات)',
    hasLeaves: false,
    hasDelays: false,
    hasAllowance: true,
    hasAdvances: false,
    hasBonuses: true,
  },
  {
    fullName: 'إبراهيم محمد حسن',
    nickname: 'إبراهيم محمد',
    employeeCode: 'EMP-TEST-005',
    nationalId: '29505051234571',
    basicSalary: 14000,
    scenario: 'موظف بسلف متعددة ومسحوبات عينية',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: true,
    hasBonuses: false,
    heavyWithdrawals: true,
  },
  {
    fullName: 'محمود أحمد فتحي',
    nickname: 'محمود أحمد',
    employeeCode: 'EMP-TEST-006',
    nationalId: '29506061234572',
    basicSalary: 16000,
    scenario: 'موظف بتأخيرات قيد المراجعة (لم تعتمد)',
    hasLeaves: true,
    hasDelays: true,
    hasAllowance: false,
    hasAdvances: false,
    hasBonuses: true,
    pendingPenalties: true,
  },
  {
    fullName: 'خالد محمد سعيد',
    nickname: 'خالد محمد',
    employeeCode: 'EMP-TEST-007',
    nationalId: '29507071234573',
    basicSalary: 11000,
    scenario: 'موظف بديون سابقة (من شهر سابق)',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: false,
    hasBonuses: false,
    hasDebt: true,
  },
  {
    fullName: 'سعيد علي حسن',
    nickname: 'سعيد علي',
    employeeCode: 'EMP-TEST-008',
    nationalId: '29508081234574',
    basicSalary: 13000,
    scenario: 'موظف بإجازات مرضية وطارئة',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: true,
    hasBonuses: false,
    sickLeaves: true,
  },
  {
    fullName: 'فتحي محمود أحمد',
    nickname: 'فتحي محمود',
    employeeCode: 'EMP-TEST-009',
    nationalId: '29509091234575',
    basicSalary: 20000,
    scenario: 'موظف كبير - راتب عالي، مكافآت، بدلات',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: true,
    hasAdvances: false,
    hasBonuses: true,
    seniorEmployee: true,
  },
  {
    fullName: 'عمر حسن محمد',
    nickname: 'عمر حسن',
    employeeCode: 'EMP-TEST-010',
    nationalId: '29510101234576',
    basicSalary: 9000,
    scenario: 'موظف جديد - بدأ في يوليو 2025',
    hasLeaves: true,
    hasDelays: false,
    hasAllowance: false,
    hasAdvances: true,
    hasBonuses: false,
    newEmployee: true,
    hireDate: new Date(2025, 6, 15), // 15 يوليو 2025
  },
]

async function main() {
  console.log('🚀 بدء إنشاء البيانات التجريبية الشاملة...\n')

  // 1️⃣ جلب الأقسام والوظائف الموجودة
  console.log('📋 جلب الأقسام والوظائف...')
  const departments = await prisma.department.findMany({ take: 3 })
  const positions = await prisma.position.findMany({ take: 5 })

  if (departments.length === 0 || positions.length === 0) {
    console.error('❌ يجب إنشاء الأقسام والوظائف أولاً')
    return
  }

  // 2️⃣ جلب أنواع البدلات
  const allowanceTypes = await prisma.hR_AllowanceType.findMany({ take: 3 })

  // 3️⃣ جلب الأصناف للمسحوبات
  const items = await prisma.hR_AdvanceItem.findMany({ take: 5 })

  // 4️⃣ جلب مستخدم المسؤول لربط العمليات
  const adminUser = await prisma.user.findFirst({})

  if (!adminUser) {
    console.error('❌ لا يوجد مستخدم في النظام')
    return
  }

  console.log('✅ تم جلب البيانات الأساسية\n')

  // 5️⃣ إنشاء الموظفين
  console.log('👥 إنشاء 10 موظفين...')
  const createdEmployees = []

  for (let i = 0; i < testEmployees.length; i++) {
    const empData = testEmployees[i]
    const dept = departments[i % departments.length]
    const pos = positions[i % positions.length]

    const employee = await prisma.employee.create({
      data: {
        fullName: empData.fullName,
        nickname: empData.nickname,
        employeeCode: empData.employeeCode,
        nationalId: empData.nationalId,
        basicSalary: empData.basicSalary,
        totalSalary: empData.basicSalary,
        hireDate: empData.hireDate || new Date(2025, 0, 1), // 1 يناير 2025
        departmentId: dept.id,
        positionId: pos.id,
        companyId: 1,
        isActive: true,
        // Required fields
        gender: 'MALE',
        dateOfBirth: new Date(1990, i, 15),
        nationality: 'مصري',
        maritalStatus: 'SINGLE',
        personalPhone: `010${(10000000 + i).toString()}`,
        emergencyContactName: 'جهة اتصال طوارئ',
        emergencyContactPhone: `011${(10000000 + i).toString()}`,
        currentAddress: `العنوان التجريبي ${i + 1}`,
        city: 'القاهرة',
        employmentType: 'FULL_TIME',
        contractType: 'PERMANENT',
      },
    })

    createdEmployees.push({ ...employee, scenario: empData })
    console.log(`   ✓ ${empData.fullName} - ${empData.scenario}`)
  }

  console.log(`✅ تم إنشاء ${createdEmployees.length} موظف\n`)

  // 6️⃣ إنشاء بيانات لكل موظف على مدار 6 شهور
  console.log('📅 إنشاء البيانات التاريخية (6 شهور)...\n')

  for (const emp of createdEmployees) {
    console.log(`\n👤 ${emp.fullName}:`)

    // تخطي الشهور قبل تاريخ التعيين للموظف الجديد
    const employeeMonths = months.filter(m => {
      const monthDate = new Date(m.year, m.month - 1, 1)
      return monthDate >= new Date(emp.hireDate)
    })

    for (const monthData of employeeMonths) {
      const monthStart = new Date(monthData.year, monthData.month - 1, 1)
      const monthEnd = new Date(monthData.year, monthData.month, 0, 23, 59, 59)

      console.log(`   📅 ${monthData.name} ${monthData.year}:`)

      // إجازات
      if (emp.scenario.hasLeaves && Math.random() > 0.3) {
        await createLeaveForMonth(emp, monthData, monthStart, monthEnd, adminUser.telegramId)
        console.log(`      🏖️ إجازة`)
      }

      // بدل إجازة
      if (emp.scenario.hasAllowance && Math.random() > 0.5) {
        await createLeaveAllowance(emp, monthData, monthStart, adminUser.telegramId)
        console.log(`      💰 بدل إجازة`)
      }

      // سلف نقدية
      if (emp.scenario.hasAdvances && Math.random() > 0.6) {
        await createCashAdvance(emp, monthData, monthStart, adminUser.telegramId)
        console.log(`      💵 سلفة`)
      }

      // مسحوبات عينية
      if ((emp.scenario.hasAdvances || emp.scenario.heavyWithdrawals) && Math.random() > 0.5 && items.length > 0) {
        await createItemWithdrawal(emp, monthData, monthStart, items, adminUser.telegramId)
        console.log(`      📦 مسحوبات`)
      }

      // دين (مرة واحدة فقط في شهر معين)
      if (emp.scenario.hasDebt && monthData.month === 6) {
        await createDebt(emp, monthData, monthStart, adminUser.telegramId)
        console.log(`      💳 دين سابق`)
      }

      // كشف راتب
      await createPayrollRecord(emp, monthData, monthStart, monthEnd, adminUser.telegramId)
      console.log(`      ✅ كشف راتب`)
    }
  }

  // 7️⃣ إنشاء مكافآت جماعية
  console.log('\n\n🎁 إنشاء مكافآت...')
  await createBonuses(createdEmployees, positions, adminUser.telegramId)

  console.log('\n\n✅ تم الانتهاء من إنشاء جميع البيانات التجريبية!')
  console.log('\n📊 ملخص البيانات المُنشأة:')
  console.log(`   👥 ${createdEmployees.length} موظف`)
  console.log(`   📅 ${months.length} شهور`)
  console.log(`   📋 بيانات شاملة: إجازات، سلف، مسحوبات، بدلات، عقوبات، مكافآت، ديون`)
}

// ==================== دوال مساعدة ====================

async function createLeaveForMonth(
  emp: any,
  monthData: any,
  monthStart: Date,
  monthEnd: Date,
  createdBy: bigint,
) {
  const scenario = emp.scenario

  // تحديد نوع الإجازة
  let leaveType = 'REGULAR'
  if (scenario.unpaidLeaves && Math.random() > 0.7) {
    leaveType = 'UNPAID'
  }
  else if (scenario.sickLeaves && Math.random() > 0.6) {
    leaveType = Math.random() > 0.5 ? 'SICK' : 'EMERGENCY'
  }

  // تاريخ الإجازة (عشوائي في الشهر)
  const leaveDay = 5 + Math.floor(Math.random() * 20) // يوم 5-25 من الشهر
  const startDate = new Date(monthData.year, monthData.month - 1, leaveDay)
  const totalDays = 3 + Math.floor(Math.random() * 5) // 3-7 أيام
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + totalDays - 1)

  // تاريخ العودة الفعلي
  let actualReturnDate = new Date(endDate)
  actualReturnDate.setDate(actualReturnDate.getDate() + 1) // اليوم التالي

  let delayDays = 0
  if (scenario.hasDelays && Math.random() > 0.5) {
    // تأخير 1-5 أيام
    delayDays = 1 + Math.floor(Math.random() * 5)
    actualReturnDate.setDate(actualReturnDate.getDate() + delayDays)
  }

  const leaveNumber = `LV-${monthData.year}-TEST-${emp.employeeCode}-${monthData.month}-${Math.floor(Math.random() * 1000)}`

  const leave = await prisma.hR_EmployeeLeave.create({
    data: {
      employeeId: emp.id,
      leaveNumber,
      leaveType: leaveType as any,
      startDate,
      endDate,
      totalDays,
      status: 'APPROVED',
      isActive: true,
      actualReturnDate,
      delayDays,
      reason: `إجازة ${leaveType === 'SICK' ? 'مرضية' : leaveType === 'EMERGENCY' ? 'طارئة' : leaveType === 'UNPAID' ? 'بدون مرتب' : 'عادية'}`,
    },
  })

  // إنشاء عقوبة إذا كان هناك تأخير
  if (delayDays > 0) {
    // جلب سياسة العقوبة المناسبة
    const policy = await prisma.hR_DelayPenaltyPolicy.findFirst({
      where: {
        OR: [
          { delayDays: delayDays },
          { delayDays: { gte: 5 } }, // للتأخيرات الكبيرة
        ],
      },
      orderBy: { delayDays: 'asc' },
    })

    if (policy) {
      const penaltyStatus = scenario.pendingPenalties ? 'PENDING' : 'APPROVED'

      await prisma.hR_AppliedPenalty.create({
        data: {
          employeeId: emp.id,
          leaveId: leave.id,
          policyId: policy.id,
          delayDays,
          penaltyType: policy.penaltyType,
          deductionDays: policy.deductionDays || 0,
          suspensionDays: policy.suspensionDays || 0,
          status: penaltyStatus,
          createdBy,
        },
      })
    }
  }
}

async function createLeaveAllowance(
  emp: any,
  monthData: any,
  monthStart: Date,
  createdBy: bigint,
) {
  const amount = emp.basicSalary * 0.15 // 15% من الراتب كبدل

  const leaveDay = 10 + Math.floor(Math.random() * 15)
  const startDate = new Date(monthData.year, monthData.month - 1, leaveDay)
  const totalDays = 7
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + totalDays - 1)

  const leaveNumber = `LV-ALLOW-${monthData.year}-${emp.employeeCode}-${monthData.month}`

  await prisma.hR_EmployeeLeave.create({
    data: {
      employeeId: emp.id,
      leaveNumber,
      leaveType: 'REGULAR',
      startDate,
      endDate,
      totalDays,
      status: 'APPROVED',
      allowanceAmount: amount,
      allowanceSettled: false, // سيتم تسويته في الراتب
      reason: 'بدل إجازة - لم يحصل على الإجازة',
    },
  })
}

async function createCashAdvance(
  emp: any,
  monthData: any,
  monthStart: Date,
  createdBy: bigint,
) {
  const amount = 500 + Math.floor(Math.random() * 2000) // 500-2500 جنيه

  const transactionNumber = `ADV-${monthData.year}${monthData.month.toString().padStart(2, '0')}-${emp.employeeCode}`

  await prisma.hR_Transaction.create({
    data: {
      transactionNumber,
      employeeId: emp.id,
      transactionType: 'CASH_ADVANCE',
      amount,
      status: 'APPROVED',
      isSettled: false,
      notes: `سلفة ${monthData.name}`,
      createdBy,
      createdAt: new Date(monthStart.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000),
    },
  })
}

async function createItemWithdrawal(
  emp: any,
  monthData: any,
  monthStart: Date,
  items: any[],
  createdBy: bigint,
) {
  const item = items[Math.floor(Math.random() * items.length)]
  const quantity = 1 + Math.floor(Math.random() * 5) // 1-5 قطع
  const amount = (item.price || 50) * quantity

  const transactionNumber = `WDR-${monthData.year}${monthData.month.toString().padStart(2, '0')}-${emp.employeeCode}-${item.id}`

  await prisma.hR_Transaction.create({
    data: {
      transactionNumber,
      employeeId: emp.id,
      itemId: item.id,
      transactionType: 'ITEM_WITHDRAWAL',
      quantity,
      amount,
      status: 'APPROVED',
      isSettled: false,
      notes: `مسحوبات ${item.nameAr || item.name}`,
      createdBy,
      createdAt: new Date(monthStart.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000),
    },
  })
}

async function createDebt(
  emp: any,
  monthData: any,
  monthStart: Date,
  createdBy: bigint,
) {
  const amount = 1000 + Math.floor(Math.random() * 3000) // 1000-4000 جنيه

  const transactionNumber = `DEBT-${monthData.year}${monthData.month.toString().padStart(2, '0')}-${emp.employeeCode}`

  await prisma.hR_Transaction.create({
    data: {
      transactionNumber,
      employeeId: emp.id,
      transactionType: 'EMPLOYEE_DEBT',
      amount,
      status: 'PENDING',
      isSettled: false,
      notes: `دين من راتب ${monthData.name} (الراتب كان سالب)`,
      createdBy,
      createdAt: monthStart,
    },
  })
}

async function createPayrollRecord(
  emp: any,
  monthData: any,
  monthStart: Date,
  monthEnd: Date,
  createdBy: bigint,
) {
  // حساب بسيط للراتب (تقريبي)
  const basicSalary = emp.basicSalary
  const daysInMonth = new Date(monthData.year, monthData.month, 0).getDate()

  // جلب السلف والمسحوبات
  const transactions = await prisma.hR_Transaction.findMany({
    where: {
      employeeId: emp.id,
      isSettled: false,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
      transactionType: { in: ['CASH_ADVANCE', 'ITEM_WITHDRAWAL', 'EMPLOYEE_DEBT'] },
    },
  })

  const totalDeductions = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

  // جلب بدل الإجازات غير المسواة
  const leaveAllowances = await prisma.hR_EmployeeLeave.findMany({
    where: {
      employeeId: emp.id,
      allowanceAmount: { gt: 0 },
      allowanceSettled: false,
      createdAt: { lte: monthEnd },
    },
  })

  const totalLeaveAllowances = leaveAllowances.reduce((sum: number, l: any) => sum + (l.allowanceAmount || 0), 0)

  const netSalary = basicSalary + totalLeaveAllowances - totalDeductions

  // إنشاء سجل الراتب
  await prisma.hR_PayrollRecord.create({
    data: {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      positionTitle: null,
      month: monthData.month,
      year: monthData.year,
      periodStartDate: monthStart,
      periodEndDate: monthEnd,
      settlementType: 'تسوية الشهر كاملاً',
      totalDays: daysInMonth,
      workDays: daysInMonth,
      leaveDays: 0,
      basicSalary,
      totalAllowances: totalLeaveAllowances,
      totalBonuses: 0,
      materialAllowance: 0,
      grossSalary: basicSalary + totalLeaveAllowances,
      cashAdvances: transactions.filter((t: any) => t.transactionType === 'CASH_ADVANCE').reduce((s: number, t: any) => s + (t.amount || 0), 0),
      itemWithdrawals: transactions.filter((t: any) => t.transactionType === 'ITEM_WITHDRAWAL').reduce((s: number, t: any) => s + (t.amount || 0), 0),
      absenceDeductions: 0,
      otherDeductions: transactions.filter((t: any) => t.transactionType === 'EMPLOYEE_DEBT').reduce((s: number, t: any) => s + (t.amount || 0), 0),
      totalDeductions,
      netSalary,
      paymentStatus: 'PAID',
      amountPaid: netSalary > 0 ? netSalary : 0,
      paymentDate: new Date(monthData.year, monthData.month, 5), // يوم 5 من الشهر التالي
      createdBy,
    },
  })

  // تسوية المعاملات
  if (transactions.length > 0) {
    await prisma.hR_Transaction.updateMany({
      where: {
        id: { in: transactions.map((t: any) => t.id) },
      },
      data: {
        isSettled: true,
        settledAt: new Date(),
      },
    })
  }

  // تسوية بدل الإجازات
  if (leaveAllowances.length > 0) {
    await prisma.hR_EmployeeLeave.updateMany({
      where: {
        id: { in: leaveAllowances.map((l: any) => l.id) },
      },
      data: {
        allowanceSettled: true,
      },
    })
  }
}

async function createBonuses(employees: any[], positions: any[], createdBy: bigint) {
  // مكافأة جماعية
  await prisma.hR_Bonus.create({
    data: {
      bonusName: 'مكافأة الأداء الشهري',
      bonusType: 'ALL',
      amount: 500,
      isActive: true,
      startDate: new Date(2025, 4, 1), // 1 مايو
      notes: 'مكافأة شهرية لجميع الموظفين',
      createdBy,
    },
  })

  // مكافآت فردية للموظفين المميزين
  const topEmployees = employees.filter(e => e.scenario.hasBonuses).slice(0, 4)
  for (const emp of topEmployees) {
    await prisma.hR_Bonus.create({
      data: {
        bonusName: 'مكافأة التميز',
        bonusType: 'INDIVIDUAL',
        targetId: emp.id,
        amount: 1000 + Math.floor(Math.random() * 1000),
        isActive: true,
        startDate: new Date(2025, 5, 1), // 1 يونيو
        notes: 'مكافأة أداء متميز',
        createdBy,
      },
    })
  }

  console.log('   ✓ مكافأة جماعية للجميع')
  console.log(`   ✓ ${topEmployees.length} مكافآت فردية`)
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e)
    process.exit(1)
  })
  .finally(() => {
    console.log('\n👋 تم الانتهاء')
  })
