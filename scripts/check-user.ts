import { PrismaClient } from './generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkUser() {
  try {
    // 1. Check User
    const user = await prisma.user.findFirst({
      where: { telegramId: BigInt('6272758666') },
    })
    console.log('\n=== USER DATA ===')
    console.log('ID:', user?.id)
    console.log('Telegram ID:', user?.telegramId.toString())
    console.log('Username:', user?.username)
    console.log('Role:', user?.role)
    console.log('Is Active:', user?.isActive)

    if (!user) {
      console.log('❌ User not found!')
      return
    }

    // 2. Check SubFeatureAdmin assignments
    const subFeatureAssignments = await prisma.subFeatureAdmin.findMany({
      where: {
        telegramId: BigInt('6272758666'),
      },
      include: {
        subFeature: true,
      },
    })

    console.log('\n=== SUB FEATURE ASSIGNMENTS ===')
    console.log('Total:', subFeatureAssignments.length)
    subFeatureAssignments.forEach((assignment, index) => {
      console.log(`\nAssignment ${index + 1}:`)
      console.log('  ID:', assignment.id)
      console.log('  SubFeature Code:', assignment.subFeature.code)
      console.log('  SubFeature Name:', assignment.subFeature.name)
      console.log('  SubFeature minRole:', assignment.subFeature.minRole)
      console.log('  SubFeature isEnabled:', assignment.subFeature.isEnabled)
      console.log('  Is Active:', assignment.isActive)
      console.log('  Assigned At:', assignment.assignedAt)
    })

    // 3. Check DepartmentAdmin assignments
    const deptAssignments = await prisma.departmentAdmin.findMany({
      where: {
        telegramId: BigInt('6272758666'),
      },
      include: {
        department: true,
      },
    })

    console.log('\n=== DEPARTMENT ASSIGNMENTS ===')
    console.log('Total:', deptAssignments.length)
    deptAssignments.forEach((assignment, index) => {
      console.log(`\nAssignment ${index + 1}:`)
      console.log('  Department Code:', assignment.department.code)
      console.log('  Department Name:', assignment.department.name)
      console.log('  Department minRole:', assignment.department.minRole)
      console.log('  Is Active:', assignment.isActive)
    })

    // 4. Check all SubFeatureConfig for hr-management
    const hrSubFeatures = await prisma.subFeatureConfig.findMany({
      where: {
        departmentCode: 'hr-management',
      },
    })

    console.log('\n=== HR MANAGEMENT SUB-FEATURES ===')
    hrSubFeatures.forEach((sf) => {
      console.log(`\n${sf.name}:`)
      console.log('  Code:', sf.code)
      console.log('  minRole:', sf.minRole)
      console.log('  isEnabled:', sf.isEnabled)
    })
  }
  catch (error) {
    console.error('Error:', error)
  }
  finally {
    await prisma.$disconnect()
  }
}

checkUser()
