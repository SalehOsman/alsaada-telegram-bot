import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  const records = await prisma.subFeatureConfig.findMany({
    where: { departmentCode: 'inventory-management' },
    select: { code: true, name: true, isEnabled: true },
    orderBy: { code: 'asc' },
  })

  console.log('📊 SubFeatureConfig records for inventory-management:')
  console.log('Total:', records.length)
  console.log('\nRecords:')
  records.forEach((record, index) => {
    console.log(`${index + 1}. Code: ${record.code} | Name: ${record.name} | Enabled: ${record.isEnabled}`)
  })
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
