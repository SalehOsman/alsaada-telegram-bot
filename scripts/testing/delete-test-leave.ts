/**
 * حذف إجازة اختبار
 */

import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

async function deleteLeave() {
  try {
    const leave = await prisma.hR_EmployeeLeave.findUnique({
      where: { id: 51 },
      select: { leaveNumber: true },
    })

    if (!leave) {
      console.log('❌ الإجازة غير موجودة!')
      return
    }

    await prisma.hR_EmployeeLeave.delete({
      where: { id: 51 },
    })

    console.log('✅ تم حذف الإجازة:', leave.leaveNumber)
    console.log('الآن يمكنك إنشاء إجازة جديدة بتوقيت UTC صحيح')
  }
  catch (error) {
    console.error('❌ خطأ:', error)
  }
  finally {
    await prisma.$disconnect()
  }
}

deleteLeave()
