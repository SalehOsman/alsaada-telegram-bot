/**
 * Script للتحقق من حالة العمال في الإجازة
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkOnLeaveEmployees() {
  console.log('🔍 التحقق من حالة العمال في الإجازة...\n')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1. العمال المحدد أنهم في إجازة في جدول Employee
  const employeesMarkedOnLeave = await prisma.employee.findMany({
    where: {
      isOnLeave: true,
    },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      nickname: true,
      isOnLeave: true,
      currentLeaveId: true,
    },
  })

  console.log('👥 العمال المحدد أنهم في إجازة (isOnLeave = true):')
  console.log(`   العدد: ${employeesMarkedOnLeave.length}\n`)
  
  employeesMarkedOnLeave.forEach((emp) => {
    console.log(`   - ${emp.fullName} (${emp.nickname || emp.employeeCode})`)
    console.log(`     currentLeaveId: ${emp.currentLeaveId || 'null'}`)
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 2. الإجازات الفعلية الحالية (حسب التواريخ)
  const activeLeaves = await prisma.hR_EmployeeLeave.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED'] },
      allowanceAmount: 0, // استبعاد إجازات البدل
      startDate: { lte: today },
      endDate: { gte: today },
      actualReturnDate: null,
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          nickname: true,
          isOnLeave: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('📋 الإجازات الفعلية الحالية (حسب التواريخ):')
  console.log(`   العدد: ${activeLeaves.length}\n`)

  // تجميع حسب العمال
  const leavesByEmployee = new Map<number, any[]>()
  activeLeaves.forEach((leave) => {
    if (!leavesByEmployee.has(leave.employeeId)) {
      leavesByEmployee.set(leave.employeeId, [])
    }
    leavesByEmployee.get(leave.employeeId)!.push(leave)
  })

  leavesByEmployee.forEach((leaves, employeeId) => {
    const emp = leaves[0].employee
    console.log(`   👤 ${emp.fullName} (${emp.nickname || emp.employeeCode})`)
    console.log(`      isOnLeave في جدول Employee: ${emp.isOnLeave ? '✅ true' : '❌ false'}`)
    console.log(`      عدد الإجازات الحالية: ${leaves.length}`)
    
    leaves.forEach((leave, index) => {
      const startDate = new Date(leave.startDate).toLocaleDateString('ar-EG')
      const endDate = new Date(leave.endDate).toLocaleDateString('ar-EG')
      console.log(`      ${index + 1}. ${leave.leaveNumber}: ${startDate} → ${endDate}`)
    })
    
    console.log('')
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 3. التحقق من التناقضات
  console.log('🔎 التحقق من التناقضات:\n')

  // العمال المحدد أنهم في إجازة لكن لا توجد لهم إجازات حالية
  const employeesWithoutActiveLeaves = employeesMarkedOnLeave.filter(
    emp => !leavesByEmployee.has(emp.id),
  )

  if (employeesWithoutActiveLeaves.length > 0) {
    console.log('⚠️  عمال محدد أنهم في إجازة لكن لا توجد لهم إجازات حالية:')
    employeesWithoutActiveLeaves.forEach((emp) => {
      console.log(`   - ${emp.fullName} (${emp.nickname || emp.employeeCode})`)
    })
    console.log('')
  }

  // العمال لديهم إجازات حالية لكن غير محدد أنهم في إجازة
  const employeesNotMarkedOnLeave = Array.from(leavesByEmployee.keys()).filter(
    employeeId => !employeesMarkedOnLeave.some(emp => emp.id === employeeId),
  )

  if (employeesNotMarkedOnLeave.length > 0) {
    console.log('⚠️  عمال لديهم إجازات حالية لكن isOnLeave = false:')
    employeesNotMarkedOnLeave.forEach((employeeId) => {
      const leaves = leavesByEmployee.get(employeeId)!
      const emp = leaves[0].employee
      console.log(`   - ${emp.fullName} (${emp.nickname || emp.employeeCode})`)
      console.log(`     عدد الإجازات: ${leaves.length}`)
    })
    console.log('')
  }

  // 4. إحصائيات
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📊 الإحصائيات:')
  console.log(`   - عمال محدد في إجازة (isOnLeave): ${employeesMarkedOnLeave.length}`)
  console.log(`   - إجازات فعلية حالية: ${activeLeaves.length}`)
  console.log(`   - عمال لديهم إجازات حالية: ${leavesByEmployee.size}`)
  console.log(`   - عمال لديهم أكثر من إجازة واحدة: ${Array.from(leavesByEmployee.values()).filter(l => l.length > 1).length}`)
  console.log('')

  if (employeesWithoutActiveLeaves.length === 0 && employeesNotMarkedOnLeave.length === 0) {
    console.log('✅ لا توجد تناقضات - النظام متسق!')
  }
  else {
    console.log('⚠️  توجد تناقضات - يُنصح بمراجعة البيانات')
  }
}

checkOnLeaveEmployees()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
