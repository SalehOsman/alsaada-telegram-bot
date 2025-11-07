import { Database } from '../src/modules/database/index.js'

async function checkEmployeesData() {
  await Database.connect()

  console.log('🔍 Checking employees data...\n')

  const employees = await Database.prisma.employee.findMany({
    where: {
      isActive: true,
    },
    include: {
      position: true,
      department: true,
    },
    orderBy: {
      id: 'asc',
    },
  })

  console.log(`📊 Found ${employees.length} active employees\n`)

  for (const emp of employees) {
    console.log(`---`)
    console.log(`ID: ${emp.id}`)
    console.log(`Code: ${emp.employeeCode || 'N/A'}`)
    console.log(`Name: ${emp.fullName}`)
    console.log(`Position ID: ${emp.positionId}`)
    console.log(`Position Object:`, emp.position ? `✅ ${emp.position.titleAr || emp.position.title}` : '❌ NULL')
    console.log(`Department ID: ${emp.departmentId}`)
    console.log(`Department Object:`, emp.department ? `✅ ${emp.department.name}` : '❌ NULL')
    console.log(``)
  }

  // Check leaves with employee data
  console.log(`\n🔍 Checking overdue leaves...\n`)

  const overdueLeaves = await Database.prisma.hR_EmployeeLeave.findMany({
    where: {
      status: 'APPROVED',
      endDate: {
        lt: new Date(),
      },
    },
    include: {
      employee: {
        include: {
          position: true,
          department: true,
        },
      },
    },
    take: 5,
  })

  console.log(`📊 Found ${overdueLeaves.length} overdue leaves (showing first 5)\n`)

  for (const leave of overdueLeaves) {
    console.log(`---`)
    console.log(`Leave ID: ${leave.id}`)
    console.log(`Employee: ${leave.employee.fullName}`)
    console.log(`Employee Code: ${leave.employee.employeeCode || 'N/A'}`)
    console.log(`Position:`, leave.employee.position ? (leave.employee.position.titleAr || leave.employee.position.title) : 'NULL')
    console.log(`Department:`, leave.employee.department ? leave.employee.department.name : 'NULL')
    console.log(`Start: ${leave.startDate.toISOString().split('T')[0]}`)
    console.log(`End: ${leave.endDate.toISOString().split('T')[0]}`)
    console.log(``)
  }

  await Database.disconnect()
}

checkEmployeesData().catch(console.error)
