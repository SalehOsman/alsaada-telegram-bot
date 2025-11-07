/**
 * Script للتحقق من التسويات النقدية
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkCashSettlements() {
  console.log('🔍 فحص التسويات النقدية...\n');

  try {
    // جلب جميع التسويات النقدية
    const cashSettlements = await prisma.hR_EmployeeLeave.findMany({
      where: {
        settlementType: 'CASH_SETTLEMENT',
      },
      include: {
        employee: {
          select: {
            fullName: true,
            nickname: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 إجمالي التسويات النقدية: ${cashSettlements.length}\n`);

    if (cashSettlements.length === 0) {
      console.log('❌ لا توجد تسويات نقدية مسجلة');
      return;
    }

    // عرض التفاصيل
    cashSettlements.forEach((settlement, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${index + 1}. 💰 ${settlement.employee.nickname || settlement.employee.fullName}`);
      console.log(`   📋 رقم السجل: ${settlement.leaveNumber}`);
      console.log(`   💰 المبلغ: ${settlement.allowanceAmount || 0} جنيه`);
      console.log(`   📅 من ${settlement.startDate.toLocaleDateString('ar-EG')} إلى ${settlement.endDate.toLocaleDateString('ar-EG')}`);
      console.log(`   ⏱️ المدة: ${settlement.totalDays} يوم`);
      console.log(`   ${settlement.allowanceSettled ? '✅' : '⏳'} ${settlement.allowanceSettled ? 'مسوّى' : 'قيد الانتظار'}`);
      console.log(`   📅 تاريخ التسجيل: ${settlement.createdAt.toLocaleDateString('ar-EG')}`);
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━\n`);

    // إحصائيات
    const totalAmount = cashSettlements.reduce((sum, s) => sum + (s.allowanceAmount || 0), 0);
    const settledCount = cashSettlements.filter(s => s.allowanceSettled).length;
    const pendingCount = cashSettlements.length - settledCount;

    console.log('📊 الإحصائيات:');
    console.log(`   💰 إجمالي المبالغ: ${totalAmount} جنيه`);
    console.log(`   ✅ المسوّى: ${settledCount}`);
    console.log(`   ⏳ قيد الانتظار: ${pendingCount}`);

    // التسويات حسب العامل
    const byEmployee = cashSettlements.reduce((acc: any, s) => {
      const name = s.employee.nickname || s.employee.fullName;
      if (!acc[name]) {
        acc[name] = {
          count: 0,
          total: 0,
        };
      }
      acc[name].count++;
      acc[name].total += s.allowanceAmount || 0;
      return acc;
    }, {});

    console.log(`\n📊 التسويات حسب العامل:`);
    Object.entries(byEmployee)
      .sort(([, a]: any, [, b]: any) => b.total - a.total)
      .forEach(([name, data]: any) => {
        console.log(`   ${name}: ${data.count} تسوية - ${data.total} جنيه`);
      });

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCashSettlements()
  .then(() => {
    console.log('\n✅ اكتمل الفحص');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل:', error);
    process.exit(1);
  });
