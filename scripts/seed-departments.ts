import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function seedDepartments() {
  console.log('🌱 Seeding departments...')

  const departments = [
    {
      name: 'الإدارة العليا',
      nameEn: 'Top Management',
      code: 'TMG',
      description: 'الإدارة العليا للشركة',
      orderIndex: 1,
    },
    {
      name: 'الإدارة العامة',
      nameEn: 'General Administration',
      code: 'ADM',
      description: 'إدارة الشؤون الإدارية العامة',
      orderIndex: 2,
    },
    {
      name: 'الإدارة الهندسية',
      nameEn: 'Engineering Department',
      code: 'ENG',
      description: 'إدارة الأعمال الهندسية والتصميمات',
      orderIndex: 3,
    },
    {
      name: 'إدارة المشاريع والإشراف',
      nameEn: 'Projects & Supervision',
      code: 'PRJ',
      description: 'إدارة المشاريع والإشراف الميداني',
      orderIndex: 4,
    },
    {
      name: 'إدارة المركبات',
      nameEn: 'Vehicle Management',
      code: 'VEH',
      description: 'إدارة أسطول المركبات',
      orderIndex: 5,
    },
    {
      name: 'إدارة المعدات',
      nameEn: 'Equipment Management',
      code: 'EQP',
      description: 'إدارة المعدات والآليات',
      orderIndex: 6,
    },
    {
      name: 'إدارة الصيانة',
      nameEn: 'Maintenance Department',
      code: 'MNT',
      description: 'إدارة أعمال الصيانة',
      orderIndex: 7,
    },
    {
      name: 'إدارة الخدمات العامة',
      nameEn: 'General Services',
      code: 'SER',
      description: 'إدارة الخدمات العامة',
      orderIndex: 8,
    },
    {
      name: 'إدارة الأمن والسلامة',
      nameEn: 'Security & Safety',
      code: 'SEC',
      description: 'إدارة الأمن والسلامة المهنية',
      orderIndex: 9,
    },
    {
      name: 'إدارة التغذية',
      nameEn: 'Catering Department',
      code: 'CAT',
      description: 'إدارة خدمات التغذية',
      orderIndex: 10,
    },
    {
      name: 'إدارة المالية والمحاسبة',
      nameEn: 'Finance & Accounting',
      code: 'FIN',
      description: 'إدارة الشؤون المالية والمحاسبية',
      orderIndex: 11,
    },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    })
    console.log(`✅ Created/Updated: ${dept.name}`)
  }

  console.log('✅ Departments seeding completed!')
}

async function main() {
  try {
    await seedDepartments()
  } catch (error) {
    console.error('❌ Error seeding departments:', error)
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
