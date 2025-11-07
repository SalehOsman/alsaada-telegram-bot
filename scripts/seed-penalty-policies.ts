/**
 * إضافة السياسات الافتراضية لعقوبات التأخير
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function seedPenaltyPolicies() {
  console.log('🌱 إضافة السياسات الافتراضية لعقوبات التأخير...')

  const policies = [
    {
      name: 'تأخير يوم واحد',
      description: 'خصم يومين عن كل يوم تأخير واحد',
      delayDays: 1,
      penaltyType: 'DEDUCTION',
      deductionDays: 2.0,
      suspensionDays: null,
    },
    {
      name: 'تأخير يومين',
      description: 'خصم 5 أيام عن تأخير يومين',
      delayDays: 2,
      penaltyType: 'DEDUCTION',
      deductionDays: 5.0,
      suspensionDays: null,
    },
    {
      name: 'تأخير 3 أيام',
      description: 'خصم 7 أيام عن تأخير 3 أيام',
      delayDays: 3,
      penaltyType: 'DEDUCTION',
      deductionDays: 7.0,
      suspensionDays: null,
    },
    {
      name: 'تأخير 4 أيام',
      description: 'خصم 10 أيام عن تأخير 4 أيام',
      delayDays: 4,
      penaltyType: 'DEDUCTION',
      deductionDays: 10.0,
      suspensionDays: null,
    },
    {
      name: 'تأخير 5 أيام فأكثر',
      description: 'إيقاف عن العمل لحين تحديد موقف العامل',
      delayDays: 5,
      penaltyType: 'SUSPENSION',
      deductionDays: null,
      suspensionDays: null, // غير محدد
    },
  ]

  for (const policy of policies) {
    const existing = await prisma.hR_DelayPenaltyPolicy.findUnique({
      where: { delayDays: policy.delayDays },
    })

    if (existing) {
      console.log(`✅ السياسة موجودة بالفعل: ${policy.name}`)
    }
    else {
      await prisma.hR_DelayPenaltyPolicy.create({
        data: policy as any,
      })
      console.log(`✅ تم إضافة السياسة: ${policy.name}`)
    }
  }

  console.log('✅ تم الانتهاء من إضافة السياسات')
}

seedPenaltyPolicies()
  .catch((e) => {
    console.error('❌ خطأ في إضافة السياسات:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
