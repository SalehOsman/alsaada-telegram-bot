import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function seedPositions() {
  console.log('🌱 Seeding positions...')

  // الحصول على جميع الأقسام للربط
  const departments = await prisma.department.findMany()
  const deptMap = new Map(departments.map(d => [d.code, d.id]))

  const positions = [
    // إدارة التغذية (CAT) - 2 وظيفة
    {
      title: 'Cook',
      titleAr: 'طباخ',
      code: 'CAT-01',
      departmentId: deptMap.get('CAT'),
      orderIndex: 1,
      defaultWorkDaysPerCycle: 30,
      defaultLeaveDaysPerCycle: 10,
    },
    {
      title: 'Catering Chef',
      titleAr: 'رئيس طهاة',
      code: 'CAT-02',
      departmentId: deptMap.get('CAT'),
      orderIndex: 2,
      defaultWorkDaysPerCycle: 30,
      defaultLeaveDaysPerCycle: 10,
    },

    // إدارة الصيانة (MNT) - 4 وظائف
    {
      title: 'General Maintenance Assistant',
      titleAr: 'مساعد صيانة عامة',
      code: 'MNT-01',
      departmentId: deptMap.get('MNT'),
      orderIndex: 1,
    },
    {
      title: 'Equipment Maintenance Technician',
      titleAr: 'فني صيانة معدات',
      code: 'MNT-02',
      departmentId: deptMap.get('MNT'),
      orderIndex: 2,
    },
    {
      title: 'Loader Maintenance Technician',
      titleAr: 'فني صيانة لودر',
      code: 'MNT-03',
      departmentId: deptMap.get('MNT'),
      orderIndex: 3,
    },
    {
      title: 'Car Maintenance Technician',
      titleAr: 'فني صيانة سيارات',
      code: 'MNT-04',
      departmentId: deptMap.get('MNT'),
      orderIndex: 4,
    },

    // إدارة المعدات (EQP) - 3 وظائف
    {
      title: 'Excavator Driver',
      titleAr: 'سائق حفار',
      code: 'EQP-01',
      departmentId: deptMap.get('EQP'),
      orderIndex: 1,
      defaultWorkDaysPerCycle: 21,
      defaultLeaveDaysPerCycle: 7,
    },
    {
      title: 'Bulldozer Driver',
      titleAr: 'سائق بلدوزر',
      code: 'EQP-02',
      departmentId: deptMap.get('EQP'),
      orderIndex: 2,
    },
    {
      title: 'Loader Driver',
      titleAr: 'سائق لودر',
      code: 'EQP-03',
      departmentId: deptMap.get('EQP'),
      orderIndex: 3,
    },

    // إدارة المركبات (VEH) - 2 وظيفة
    {
      title: 'Site Service Car Driver',
      titleAr: 'سائق سيارة خدمة',
      code: 'VEH-01',
      departmentId: deptMap.get('VEH'),
      orderIndex: 1,
    },
    {
      title: 'Dump Truck Driver',
      titleAr: 'سائق قلاب',
      code: 'VEH-02',
      departmentId: deptMap.get('VEH'),
      orderIndex: 2,
    },

    // إدارة المشاريع والإشراف (PRJ) - 2 وظيفة
    {
      title: 'Site Clerk',
      titleAr: 'كاتب موقع',
      code: 'PRJ-01',
      departmentId: deptMap.get('PRJ'),
      orderIndex: 1,
    },
    {
      title: 'Site Supervisor',
      titleAr: 'مشرف موقع',
      code: 'PRJ-02',
      departmentId: deptMap.get('PRJ'),
      orderIndex: 2,
    },

    // الإدارة الهندسية (ENG) - 3 وظائف
    {
      title: 'Assistant Surveyor',
      titleAr: 'مساعد مساح',
      code: 'ENG-01',
      departmentId: deptMap.get('ENG'),
      orderIndex: 1,
    },
    {
      title: 'Surveyor',
      titleAr: 'مساح',
      code: 'ENG-02',
      departmentId: deptMap.get('ENG'),
      orderIndex: 2,
    },
    {
      title: 'Survey Engineer',
      titleAr: 'مهندس مساحة',
      code: 'ENG-03',
      departmentId: deptMap.get('ENG'),
      orderIndex: 3,
    },

    // الإدارة العامة (ADM) - 4 وظائف
    {
      title: 'Office Officer',
      titleAr: 'إداري',
      code: 'ADM-01',
      departmentId: deptMap.get('ADM'),
      orderIndex: 1,
      defaultWorkDaysPerCycle: 30,
      defaultLeaveDaysPerCycle: 10,
    },
    {
      title: 'Executive Administrator',
      titleAr: 'مدير تنفيذي إداري',
      code: 'ADM-02',
      departmentId: deptMap.get('ADM'),
      orderIndex: 2,
    },
    {
      title: 'Admin & HR Manager',
      titleAr: 'مدير الإدارة والموارد البشرية',
      code: 'ADM-03',
      departmentId: deptMap.get('ADM'),
      orderIndex: 3,
    },
    {
      title: 'Project & Operations Manager',
      titleAr: 'مدير المشاريع والعمليات',
      code: 'ADM-04',
      departmentId: deptMap.get('ADM'),
      orderIndex: 4,
    },

    // الإدارة العليا (TMG) - 2 وظيفة
    {
      title: 'Chairman & CEO',
      titleAr: 'رئيس مجلس الإدارة والرئيس التنفيذي',
      code: 'TMG-01',
      departmentId: deptMap.get('TMG'),
      orderIndex: 1,
    },
    {
      title: 'General Manager (GM)',
      titleAr: 'المدير العام',
      code: 'TMG-02',
      departmentId: deptMap.get('TMG'),
      orderIndex: 2,
    },

    // إدارة المالية والمحاسبة (FIN) - 1 وظيفة
    {
      title: 'Accountant',
      titleAr: 'محاسب',
      code: 'FIN-01',
      departmentId: deptMap.get('FIN'),
      orderIndex: 1,
    },
  ]

  for (const pos of positions) {
    if (!pos.departmentId) {
      console.log(`⚠️  تحذير: القسم غير موجود للوظيفة ${pos.code}`)
      continue
    }

    await prisma.position.upsert({
      where: { code: pos.code },
      update: {},
      create: pos,
    })
    console.log(`✅ Created/Updated: ${pos.titleAr} (${pos.code})`)
  }

  console.log('✅ Positions seeding completed!')
}

async function main() {
  try {
    await seedPositions()
  } catch (error) {
    console.error('❌ Error seeding positions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
