import { Database } from '../src/modules/database/index.js'

async function checkEmployees() {
  await Database.connect()
  
  const employees = await Database.prisma.employee.findMany({
    where: { 
      employmentStatus: 'ACTIVE'
    },
    select: {
      id: true,
      nickname: true,
      workDaysPerCycle: true,
      leaveDaysPerCycle: true,
      isOnLeave: true,
      hireDate: true,
      lastLeaveEndDate: true,
    },
    orderBy: { id: 'asc' },
  })

  console.log('\n📊 جميع الموظفين النشطين:\n')
  console.table(employees)
  
  const withCycles = employees.filter(e => e.workDaysPerCycle && e.leaveDaysPerCycle)
  const withoutCycles = employees.filter(e => !e.workDaysPerCycle || !e.leaveDaysPerCycle)
  
  console.log(`\n✅ موظفين لديهم دورة: ${withCycles.length}`)
  console.log(`❌ موظفين بدون دورة: ${withoutCycles.length}`)
  
  if (withoutCycles.length > 0) {
    console.log('\n⚠️ الموظفين بدون دورة عمل/إجازة:')
    withoutCycles.forEach(e => {
      console.log(`  - ${e.nickname} (ID: ${e.id})`)
    })
  }
  
  process.exit(0)
}

checkEmployees().catch(console.error)
