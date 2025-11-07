import { PrismaClient } from './generated/prisma/index.js'

const prisma = new PrismaClient()

async function checkSubFeatures() {
  try {
    console.log('\n=== Sub-Features في قاعدة البيانات ===\n')

    const subFeatures = await prisma.subFeatureConfig.findMany({
      where: {
        departmentCode: 'hr-management',
      },
      orderBy: {
        code: 'asc',
      },
    })

    console.log(`Found ${subFeatures.length} sub-features:\n`)

    for (const sf of subFeatures) {
      console.log(`Code: ${sf.code}`)
      console.log(`  - isEnabled: ${sf.isEnabled}`)
      console.log(`  - minRole: ${sf.minRole || 'null (inherits from department)'}`)
      console.log(`  - superAdminOnly: ${sf.superAdminOnly}`)
      console.log('')
    }

    console.log('\n=== Assignments لـ Abu_zain19 ===\n')

    const assignments = await prisma.subFeatureAdmin.findMany({
      where: {
        telegramId: BigInt(6272758666),
        isActive: true,
      },
      include: {
        subFeature: true,
      },
    })

    console.log(`Found ${assignments.length} assignments:\n`)

    for (const assignment of assignments) {
      console.log(`SubFeature Code: ${assignment.subFeature.code}`)
      console.log(`  - Enabled: ${assignment.subFeature.isEnabled}`)
      console.log(`  - Assignment Active: ${assignment.isActive}`)
      console.log('')
    }

    await prisma.$disconnect()
    process.exit(0)
  }
  catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkSubFeatures()
