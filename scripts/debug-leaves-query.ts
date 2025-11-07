/**
 * Debug leave query لمعرفة لماذا لا تظهر الإجازات
 */

import { Database } from '../src/modules/database/index.js'

async function debugQuery() {
  await Database.connect()
  const prisma = Database.prisma

  console.log('🔍 Debug Leave Query\n')

  // نفس الاستعلام المستخدم في leaves-list.handler.ts
  const where: any = {
    isActive: true,
    status: { in: ['PENDING', 'APPROVED'] },
    OR: [
      { allowanceAmount: null },
      { allowanceAmount: 0 },
    ],
    actualReturnDate: null,
  }

  console.log('📋 الشرط المستخدم:')
  console.log(JSON.stringify(where, null, 2))
  console.log('')

  const leaves = await prisma.hR_EmployeeLeave.findMany({
    where,
    include: {
      employee: {
        select: {
          fullName: true,
        },
      },
    },
  })

  console.log(`✅ النتائج: ${leaves.length} إجازات\n`)

  if (leaves.length > 0) {
    console.log('📝 تفاصيل الإجازات:\n')
    for (const leave of leaves) {
      console.log(`  - ${leave.employee.fullName}`)
      console.log(`    ID: ${leave.id}`)
      console.log(`    allowanceAmount: ${leave.allowanceAmount}`)
      console.log(`    status: ${leave.status}`)
      console.log(`    isActive: ${leave.isActive}`)
      console.log(`    actualReturnDate: ${leave.actualReturnDate}`)
      console.log('')
    }
  }

  // الآن جرب بدون شرط allowanceAmount
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('🔍 نفس الاستعلام بدون شرط allowanceAmount:\n')

  const where2: any = {
    isActive: true,
    status: { in: ['PENDING', 'APPROVED'] },
    actualReturnDate: null,
  }

  const leaves2 = await prisma.hR_EmployeeLeave.findMany({
    where: where2,
    include: {
      employee: {
        select: {
          fullName: true,
        },
      },
    },
  })

  console.log(`✅ النتائج: ${leaves2.length} إجازات\n`)

  if (leaves2.length > 0) {
    console.log('📝 تفاصيل الإجازات:\n')
    for (const leave of leaves2) {
      console.log(`  - ${leave.employee.fullName}`)
      console.log(`    allowanceAmount: ${leave.allowanceAmount}`)
      console.log(`    من: ${leave.startDate.toISOString().split('T')[0]} → ${leave.endDate.toISOString().split('T')[0]}`)
      console.log('')
    }
  }

  await prisma.$disconnect()
}

debugQuery().catch(console.error)
