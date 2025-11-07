/**
 * Script لتحديث الإجازات الموجودة بنوع التسوية الصحيح
 * يقوم بتحويل الإجازات التي لها بدل نقدي إلى نوع CASH_SETTLEMENT
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function migrateAllowanceLeaves() {
  console.log('🔄 بدء تحديث نوع التسوية للإجازات...\n');

  try {
    // الخطوة 1: البحث عن الإجازات التي لها بدل نقدي
    const allowanceLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        allowanceAmount: { gt: 0 },
        // نحدث فقط التي لم يتم تحديثها بعد
        settlementType: 'ACTUAL_LEAVE'
      },
      include: {
        employee: {
          select: {
            fullName: true
          }
        }
      }
    });

    console.log(`📊 تم إيجاد ${allowanceLeaves.length} إجازة بدل نقدي للتحديث\n`);

    if (allowanceLeaves.length === 0) {
      console.log('✅ لا توجد إجازات تحتاج للتحديث');
      return;
    }

    // الخطوة 2: تحديث كل إجازة
    let updated = 0;
    for (const leave of allowanceLeaves) {
      console.log(`📝 تحديث الإجازة رقم ${leave.leaveNumber}`);
      console.log(`   العامل: ${leave.employee.fullName}`);
      console.log(`   المبلغ: ${leave.allowanceAmount} جنيه`);
      console.log(`   من ${leave.startDate.toLocaleDateString('ar-EG')} إلى ${leave.endDate.toLocaleDateString('ar-EG')}`);

      await prisma.hR_EmployeeLeave.update({
        where: { id: leave.id },
        data: {
          settlementType: 'CASH_SETTLEMENT',
          // إذا كانت مغلقة ولم يتم تسجيل تاريخ صرف البدل، نضع تاريخ الإغلاق
          allowancePaidDate: leave.allowanceSettled && !leave.allowancePaidDate 
            ? leave.actualReturnDate || leave.endDate 
            : leave.allowancePaidDate
        }
      });

      updated++;
      console.log(`   ✅ تم التحديث\n`);
    }

    console.log(`\n✅ اكتمل التحديث بنجاح!`);
    console.log(`   تم تحديث ${updated} إجازة`);
    console.log(`   جميع الإجازات ذات البدل النقدي الآن نوعها: CASH_SETTLEMENT\n`);

    // الخطوة 3: عرض إحصائيات بعد التحديث
    const stats = await prisma.hR_EmployeeLeave.groupBy({
      by: ['settlementType'],
      _count: true
    });

    console.log('📊 إحصائيات الإجازات حسب نوع التسوية:');
    for (const stat of stats) {
      const type = stat.settlementType === 'ACTUAL_LEAVE' ? '🏖️ إجازات فعلية' 
                 : stat.settlementType === 'CASH_SETTLEMENT' ? '💰 تسويات نقدية'
                 : '⏸️ مؤجلة';
      console.log(`   ${type}: ${stat._count} إجازة`);
    }

  } catch (error) {
    console.error('❌ خطأ في تحديث البيانات:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الـ script
migrateAllowanceLeaves()
  .then(() => {
    console.log('\n✅ انتهى الـ script بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل الـ script:', error);
    process.exit(1);
  });
