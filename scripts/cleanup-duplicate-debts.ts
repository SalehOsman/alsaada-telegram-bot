/**
 * سكريبت تنظيف الديون المكررة
 * 
 * هذا السكريبت يقوم بـ:
 * 1. البحث عن ديون مكررة (نفس الموظف، نفس المبلغ، نفس الشهر)
 * 2. الاحتفاظ بأحدث دين فقط
 * 3. تسوية الديون الأقدم تلقائياً
 * 
 * الاستخدام:
 * npx tsx scripts/cleanup-duplicate-debts.ts
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

interface DebtRecord {
  id: number
  employeeId: number
  amount: number
  createdAt: Date
  notes: string | null
}

interface DuplicateGroup {
  employeeId: number
  amount: number
  debts: DebtRecord[]
}

async function findDuplicateDebts(): Promise<DuplicateGroup[]> {
  console.log('🔍 البحث عن الديون المكررة...\n')

  // Get all unsettled EMPLOYEE_DEBT transactions
  const unsettledDebts = await prisma.hR_Transaction.findMany({
    where: {
      transactionType: 'EMPLOYEE_DEBT',
      isSettled: false,
      status: 'PENDING',
    },
    select: {
      id: true,
      employeeId: true,
      amount: true,
      createdAt: true,
      notes: true,
    },
    orderBy: [
      { employeeId: 'asc' },
      { amount: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  console.log(`📊 إجمالي الديون غير المسواة: ${unsettledDebts.length}`)

  // Group by employeeId and amount
  const grouped = new Map<string, DebtRecord[]>()

  for (const debt of unsettledDebts) {
    const key = `${debt.employeeId}-${debt.amount}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(debt)
  }

  // Find duplicates (groups with more than 1 debt)
  const duplicates: DuplicateGroup[] = []

  for (const [key, debts] of grouped.entries()) {
    if (debts.length > 1) {
      const [employeeId, amount] = key.split('-').map(Number)
      duplicates.push({ employeeId, amount, debts })
    }
  }

  console.log(`⚠️  عدد مجموعات الديون المكررة: ${duplicates.length}\n`)

  return duplicates
}

async function cleanupDuplicates(duplicates: DuplicateGroup[], dryRun: boolean = true): Promise<void> {
  if (duplicates.length === 0) {
    console.log('✅ لا توجد ديون مكررة للتنظيف!\n')
    return
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  console.log(`📋 تفاصيل الديون المكررة:\n`)

  let totalToSettle = 0

  for (const group of duplicates) {
    // Get employee name
    const employee = await prisma.employee.findUnique({
      where: { id: group.employeeId },
      select: { nickname: true, fullName: true, employeeCode: true },
    })

    const employeeName = employee ? `${employee.nickname || employee.fullName} (${employee.employeeCode})` : `الموظف #${group.employeeId}`

    console.log(`👤 ${employeeName}`)
    console.log(`   المبلغ: ${group.amount.toFixed(2)} جنيه`)
    console.log(`   عدد التكرارات: ${group.debts.length}`)
    console.log(`   التواريخ:`)

    // Sort by date (oldest first)
    const sortedDebts = group.debts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    for (let i = 0; i < sortedDebts.length; i++) {
      const debt = sortedDebts[i]
      const dateStr = debt.createdAt.toLocaleDateString('ar-EG')
      const isOldest = i < sortedDebts.length - 1

      if (isOldest) {
        console.log(`   ├─ 🗑️  ${dateStr} (ID: ${debt.id}) - سيتم تسويته`)
        totalToSettle++
      }
      else {
        console.log(`   └─ ✅ ${dateStr} (ID: ${debt.id}) - سيتم الاحتفاظ به`)
      }
    }

    console.log()

    // Settle old debts (keep only the newest one)
    if (!dryRun && sortedDebts.length > 1) {
      const debtsToSettle = sortedDebts.slice(0, -1) // All except the last (newest)
      const debtIds = debtsToSettle.map(d => d.id)

      await prisma.hR_Transaction.updateMany({
        where: {
          id: { in: debtIds },
        },
        data: {
          isSettled: true,
          settledAt: new Date(),
          notes: (sortedDebts[0].notes || '') + ' [تم التسوية تلقائياً - دين مكرر]',
        },
      })

      console.log(`   ✅ تم تسوية ${debtsToSettle.length} دين مكرر`)
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  console.log(`📊 الملخص:`)
  console.log(`   - عدد الموظفين المتأثرين: ${duplicates.length}`)
  console.log(`   - إجمالي الديون للتسوية: ${totalToSettle}`)
  console.log(`   - الوضع: ${dryRun ? '🔍 معاينة فقط (لم يتم التعديل)' : '✅ تم التنظيف'}\n`)

  if (dryRun) {
    console.log(`⚠️  هذه معاينة فقط. لم يتم تعديل قاعدة البيانات.`)
    console.log(`   لتنفيذ التنظيف الفعلي، قم بتشغيل السكريبت مع المعامل --execute:\n`)
    console.log(`   npx tsx scripts/cleanup-duplicate-debts.ts --execute\n`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')

  console.log(`\n╔═══════════════════════════════════════════╗`)
  console.log(`║  🧹 سكريبت تنظيف الديون المكررة        ║`)
  console.log(`╚═══════════════════════════════════════════╝\n`)

  if (dryRun) {
    console.log(`⚠️  وضع المعاينة (Dry Run)`)
    console.log(`   سيتم عرض الديون المكررة فقط دون تعديل قاعدة البيانات\n`)
  }
  else {
    console.log(`⚡ وضع التنفيذ (Execute Mode)`)
    console.log(`   سيتم تسوية الديون المكررة القديمة\n`)
  }

  try {
    const duplicates = await findDuplicateDebts()
    await cleanupDuplicates(duplicates, dryRun)

    if (!dryRun && duplicates.length > 0) {
      console.log(`✅ تم تنظيف الديون المكررة بنجاح!\n`)
    }
  }
  catch (error) {
    console.error('❌ حدث خطأ أثناء تنظيف الديون:', error)
    process.exit(1)
  }
  finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
