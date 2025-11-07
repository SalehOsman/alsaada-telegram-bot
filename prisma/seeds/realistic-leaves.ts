import { PrismaClient, LeaveType, GeneralStatus } from '../../generated/prisma'

const prisma = new PrismaClient()

export async function seedRealisticLeaves() {
  console.log('🌱 Seeding realistic leaves...')

  // حذف الإجازات القديمة
  await prisma.hR_EmployeeLeave.deleteMany({})
  console.log('✅ Deleted old leaves')

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { position: true },
  })

  const lastLeave = await prisma.hR_EmployeeLeave.findFirst({
    orderBy: { leaveNumber: 'desc' },
  })
  
  let leaveCounter = lastLeave 
    ? parseInt(lastLeave.leaveNumber.split('-').pop() || '0') + 1 
    : 1

  for (const employee of employees) {
    const workDays = employee.workDaysPerCycle || 30
    const leaveDays = employee.leaveDaysPerCycle || 7
    const cycleDays = workDays + leaveDays
    const hireDate = employee.hireDate || new Date('2022-01-01')
    
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2025-10-26')
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const cycles = Math.floor(totalDays / cycleDays)
    const leavesToCreate = Math.min(cycles, 8)

    let currentDate = new Date(startDate)
    let leaveCount = 0

    for (let i = 0; i < leavesToCreate && leaveCount < 8; i++) {
      currentDate.setDate(currentDate.getDate() + workDays)
      
      const leaveStartDate = new Date(currentDate)
      const leaveEndDate = new Date(currentDate)
      leaveEndDate.setDate(leaveEndDate.getDate() + leaveDays - 1)

      const scenario = Math.random()
      
      if (scenario < 0.15) {
        // 15% بدل نقدي
        await prisma.hR_EmployeeLeave.create({
          data: {
            leaveNumber: `LV-${leaveStartDate.getFullYear()}-${String(leaveCounter++).padStart(4, '0')}`,
            employeeId: employee.id,
            leaveType: LeaveType.REGULAR,
            startDate: leaveStartDate,
            endDate: leaveEndDate,
            totalDays: leaveDays,
            status: GeneralStatus.APPROVED,
            allowanceAmount: employee.basicSalary ? employee.basicSalary * 0.1 * leaveDays : leaveDays * 100,
            allowanceSettled: true,
            isActive: true,
          },
        })
      } else if (scenario < 0.25) {
        // 10% إجازة مرضية
        const sickDays = Math.floor(Math.random() * 3) + 2
        const sickEndDate = new Date(leaveStartDate)
        sickEndDate.setDate(sickEndDate.getDate() + sickDays - 1)
        
        await prisma.hR_EmployeeLeave.create({
          data: {
            leaveNumber: `LV-${leaveStartDate.getFullYear()}-${String(leaveCounter++).padStart(4, '0')}`,
            employeeId: employee.id,
            leaveType: LeaveType.SICK,
            startDate: leaveStartDate,
            endDate: sickEndDate,
            totalDays: sickDays,
            status: GeneralStatus.APPROVED,
            actualReturnDate: new Date(sickEndDate.getTime() + 24 * 60 * 60 * 1000),
            isActive: true,
          },
        })
      } else if (scenario < 0.30) {
        // 5% إجازة طارئة
        const emergencyDays = Math.floor(Math.random() * 2) + 1
        const emergencyEndDate = new Date(leaveStartDate)
        emergencyEndDate.setDate(emergencyEndDate.getDate() + emergencyDays - 1)
        
        await prisma.hR_EmployeeLeave.create({
          data: {
            leaveNumber: `LV-${leaveStartDate.getFullYear()}-${String(leaveCounter++).padStart(4, '0')}`,
            employeeId: employee.id,
            leaveType: LeaveType.EMERGENCY,
            startDate: leaveStartDate,
            endDate: emergencyEndDate,
            totalDays: emergencyDays,
            status: GeneralStatus.APPROVED,
            actualReturnDate: new Date(emergencyEndDate.getTime() + 24 * 60 * 60 * 1000),
            isActive: true,
          },
        })
      } else {
        // 70% إجازة عادية
        const delayScenario = Math.random()
        let actualReturn: Date | null = null
        
        if (delayScenario < 0.10) {
          // 10% تأخير 1-3 أيام
          const delayDays = Math.floor(Math.random() * 3) + 1
          actualReturn = new Date(leaveEndDate)
          actualReturn.setDate(actualReturn.getDate() + 1 + delayDays)
        } else if (delayScenario < 0.15) {
          // 5% عودة مبكرة
          const earlyDays = Math.floor(Math.random() * 2) + 1
          actualReturn = new Date(leaveEndDate)
          actualReturn.setDate(actualReturn.getDate() + 1 - earlyDays)
        } else {
          // 85% عودة في الموعد
          actualReturn = new Date(leaveEndDate)
          actualReturn.setDate(actualReturn.getDate() + 1)
        }

        await prisma.hR_EmployeeLeave.create({
          data: {
            leaveNumber: `LV-${leaveStartDate.getFullYear()}-${String(leaveCounter++).padStart(4, '0')}`,
            employeeId: employee.id,
            leaveType: LeaveType.REGULAR,
            startDate: leaveStartDate,
            endDate: leaveEndDate,
            totalDays: leaveDays,
            status: GeneralStatus.APPROVED,
            actualReturnDate: actualReturn,
            isActive: true,
          },
        })
      }

      currentDate = new Date(leaveEndDate)
      currentDate.setDate(currentDate.getDate() + 1)
      leaveCount++
    }

    // تحديث بيانات العامل
    const lastLeave = await prisma.hR_EmployeeLeave.findFirst({
      where: { employeeId: employee.id, isActive: true },
      orderBy: { endDate: 'desc' },
    })

    if (lastLeave) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let nextLeaveStart = new Date(lastLeave.endDate)
      nextLeaveStart.setDate(nextLeaveStart.getDate() + workDays + 1)
      
      // إذا كان التاريخ في الماضي، احسب من اليوم
      if (nextLeaveStart < today) {
        const daysSinceLastLeave = Math.floor((today.getTime() - new Date(lastLeave.endDate).getTime()) / (1000 * 60 * 60 * 24))
        const cyclesPassed = Math.floor(daysSinceLastLeave / (workDays + leaveDays))
        nextLeaveStart = new Date(lastLeave.endDate)
        nextLeaveStart.setDate(nextLeaveStart.getDate() + (cyclesPassed + 1) * (workDays + leaveDays) + 1)
      }
      
      const nextLeaveEnd = new Date(nextLeaveStart)
      nextLeaveEnd.setDate(nextLeaveEnd.getDate() + leaveDays - 1)

      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          lastLeaveStartDate: lastLeave.startDate,
          lastLeaveEndDate: lastLeave.endDate,
          nextLeaveStartDate: nextLeaveStart,
          nextLeaveEndDate: nextLeaveEnd,
          isOnLeave: false,
        },
      })
    }

    console.log(`✅ Created ${leaveCount} leaves for ${employee.fullName}`)
  }

  console.log('✅ Realistic leaves seeded successfully!')
}
